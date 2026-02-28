import { Loader2, Printer, ShoppingCart } from 'lucide-react';
import type { OrderDetailDTO } from '../../services/api';
import { ModalHeader, ModalShell } from '../common/ModalShell';
import {
  buildOrderDetailPrintDocument,
  type OrderDetailPrintVisionRecord,
} from './orderDetailPrintDocument';

type OrderDetailModalProps = {
  detailOrder: OrderDetailDTO | null;
  detailLoading: boolean;
  detailError: string;
  onClose: () => void;
};

type VisionRecordSnapshot = {
  recordedAt: string | null;
  leftSphere: string;
  leftCylinder: string;
  leftAxis: string;
  leftPD: string;
  leftVisualAcuity: string;
  rightSphere: string;
  rightCylinder: string;
  rightAxis: string;
  rightPD: string;
  rightVisualAcuity: string;
};

const formatDateTimeText = (value: string | null) => {
  if (!value) return '未填写';
  return value.replace('T', ' ').slice(0, 16);
};

const parseNumberText = (value: unknown, digits: number) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value.toFixed(digits) : '-';
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value.trim());
    return Number.isFinite(parsed) ? parsed.toFixed(digits) : '-';
  }

  return '-';
};

const parseIntegerText = (value: unknown) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(Math.trunc(value)) : '-';
  }

  if (typeof value === 'string') {
    const parsed = Number.parseInt(value.trim(), 10);
    return Number.isFinite(parsed) ? String(parsed) : '-';
  }

  return '-';
};

const parseVisionRecordsFromOrderExtraInfo = (
  extraInfo: string | null | undefined,
): VisionRecordSnapshot[] => {
  if (!extraInfo) return [];

  try {
    const parsed = JSON.parse(extraInfo) as unknown;
    const records = Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === 'object' && Array.isArray((parsed as { vision_records?: unknown[] }).vision_records)
        ? (parsed as { vision_records: unknown[] }).vision_records
        : [];

    return records
      .map((record) => {
        if (!record || typeof record !== 'object') return null;
        const row = record as Record<string, unknown>;

        return {
          recordedAt:
            typeof row.recorded_at === 'string'
              ? row.recorded_at
              : typeof row.recordedAt === 'string'
                ? row.recordedAt
                : null,
          leftSphere: parseNumberText(row.left_sphere ?? row.leftSphere, 2),
          leftCylinder: parseNumberText(row.left_cylinder ?? row.leftCylinder, 2),
          leftAxis: parseIntegerText(row.left_axis ?? row.leftAxis),
          leftPD: parseNumberText(row.left_pd ?? row.leftPD, 1),
          leftVisualAcuity: parseNumberText(row.left_visual_acuity ?? row.leftVisualAcuity, 1),
          rightSphere: parseNumberText(row.right_sphere ?? row.rightSphere, 2),
          rightCylinder: parseNumberText(row.right_cylinder ?? row.rightCylinder, 2),
          rightAxis: parseIntegerText(row.right_axis ?? row.rightAxis),
          rightPD: parseNumberText(row.right_pd ?? row.rightPD, 1),
          rightVisualAcuity: parseNumberText(row.right_visual_acuity ?? row.rightVisualAcuity, 1),
        } satisfies VisionRecordSnapshot;
      })
      .filter((record): record is VisionRecordSnapshot => record !== null);
  } catch {
    return [];
  }
};

export function OrderDetailModal({ detailOrder, detailLoading, detailError, onClose }: OrderDetailModalProps) {
  if (detailOrder === null) return null;

  const visionRecords = parseVisionRecordsFromOrderExtraInfo(detailOrder.order.extra_info);
  const hasVisionRecords = visionRecords.length > 0;
  const hasOrderItems = detailOrder.items.length > 0;

  const handlePrint = () => {
    const orderDate = detailOrder.order.order_date?.slice(0, 10) ?? '-';
    const notes = detailOrder.order.notes?.trim();
    const customerName = detailOrder.order.customer_name_snapshot?.trim() || '未知客户';
    const customerPhone = detailOrder.order.customer_phone_snapshot?.trim() || '-';
    const printTitle = `订单详情 #${detailOrder.order.id} - ${customerName} - ${customerPhone}`;
    const originalPageTitle = window.document.title;
    let pageTitleRestored = false;

    const restorePageTitle = () => {
      if (pageTitleRestored) return;
      window.document.title = originalPageTitle;
      pageTitleRestored = true;
    };

    const printRows = detailOrder.items.map((item) => {
      const fallbackName = `商品 #${item.product_id}`;
      return {
        productId: item.product_id,
        displayName: item.product_name_snapshot?.trim() || fallbackName,
        unitPrice: item.unit_price,
        paidPrice: item.paid_price,
        quantity: item.quantity,
        subtotal: item.subtotal,
      };
    });

    const printVisionRecords: OrderDetailPrintVisionRecord[] = visionRecords.map((record) => ({
      recordedAt: formatDateTimeText(record.recordedAt),
      leftSphere: record.leftSphere,
      leftCylinder: record.leftCylinder,
      leftAxis: record.leftAxis,
      leftPD: record.leftPD,
      leftVisualAcuity: record.leftVisualAcuity,
      rightSphere: record.rightSphere,
      rightCylinder: record.rightCylinder,
      rightAxis: record.rightAxis,
      rightPD: record.rightPD,
      rightVisualAcuity: record.rightVisualAcuity,
    }));

    const printDocumentHtml = buildOrderDetailPrintDocument({
      orderId: detailOrder.order.id,
      customerName,
      customerPhone,
      printTitle,
      totalAmount: detailOrder.order.total_amount,
      orderDate,
      notes,
      visionRecords: printVisionRecords,
      rows: printRows,
    });

    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    printFrame.style.visibility = 'hidden';
    document.body.appendChild(printFrame);

    const doc = printFrame.contentDocument;
    if (!doc) {
      printFrame.remove();
      return;
    }

    doc.open();
    doc.write(printDocumentHtml);
    doc.close();
    doc.title = printTitle;

    const doCleanup = () => {
      restorePageTitle();
      window.setTimeout(() => {
        printFrame.remove();
      }, 200);
    };

    const frameWindow = printFrame.contentWindow;
    if (!frameWindow) {
      printFrame.remove();
      return;
    }

    frameWindow.addEventListener('afterprint', doCleanup, { once: true });
    window.setTimeout(() => {
      frameWindow.focus();
      window.document.title = printTitle;
      frameWindow.document.title = printTitle;
      frameWindow.print();
    }, 150);
  };

  const renderVisionSection = () => (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-800">验光信息</h3>
        {hasVisionRecords && (
          <span className="text-xs text-slate-500">共 {visionRecords.length} 组</span>
        )}
      </div>

      {hasVisionRecords ? (
        visionRecords.map((record, index) => (
          <div key={`vision-record-${index}`} className="border border-slate-200 rounded-xl p-3 space-y-3 bg-slate-50/60">
            <div className="text-sm font-medium text-slate-700">
              第 {index + 1} 组 · 记录时间：{formatDateTimeText(record.recordedAt)}
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
              <table className="w-full min-w-[640px] table-fixed text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-2 py-1.5 font-medium border-b border-slate-200 text-center">眼别</th>
                    <th className="px-2 py-1.5 font-medium border-b border-slate-200 text-center">球镜(S)</th>
                    <th className="px-2 py-1.5 font-medium border-b border-slate-200 text-center">柱镜(C)</th>
                    <th className="px-2 py-1.5 font-medium border-b border-slate-200 text-center">轴位(A)</th>
                    <th className="px-2 py-1.5 font-medium border-b border-slate-200 text-center">瞳距(PD)</th>
                    <th className="px-2 py-1.5 font-medium border-b border-slate-200 text-center">视力(VA)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-white border-b border-slate-100">
                    <td className="px-2 py-2 text-center font-medium text-slate-700">左眼</td>
                    <td className="px-2 py-1.5 text-center">{record.leftSphere}</td>
                    <td className="px-2 py-1.5 text-center">{record.leftCylinder}</td>
                    <td className="px-2 py-1.5 text-center">{record.leftAxis}</td>
                    <td className="px-2 py-1.5 text-center">{record.leftPD}</td>
                    <td className="px-2 py-1.5 text-center">{record.leftVisualAcuity}</td>
                  </tr>
                  <tr className="bg-white">
                    <td className="px-2 py-2 text-center font-medium text-slate-700">右眼</td>
                    <td className="px-2 py-1.5 text-center">{record.rightSphere}</td>
                    <td className="px-2 py-1.5 text-center">{record.rightCylinder}</td>
                    <td className="px-2 py-1.5 text-center">{record.rightAxis}</td>
                    <td className="px-2 py-1.5 text-center">{record.rightPD}</td>
                    <td className="px-2 py-1.5 text-center">{record.rightVisualAcuity}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ))
      ) : (
        <div className="text-sm text-slate-500 border border-dashed border-slate-200 rounded-xl px-4 py-5 bg-white">
          订单创建时未填写
        </div>
      )}
    </section>
  );

  return (
    <ModalShell containerClassName="max-w-6xl flex flex-col max-h-[92vh]">
      <ModalHeader
        title={`#${detailOrder.order.id}： ${detailOrder.order.customer_name_snapshot} - ${detailOrder.order.customer_phone_snapshot}`}
        icon={<ShoppingCart className="h-5 w-5 mr-2 text-blue-600" />}
        subtitle={(
          <p className="text-xs text-slate-500 ml-7">
            交易日期：{detailOrder.order.order_date && <> {detailOrder.order.order_date.slice(0, 10)}</>}
          </p>
        )}
        onClose={onClose}
        closeAriaLabel="关闭订单详情弹窗"
        className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/80"
      />

      <div className="flex-1 overflow-auto">
        {detailLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : detailError ? (
          <div className="px-6 py-8 text-sm text-red-600">加载失败：{detailError}</div>
        ) : (
          <div className="px-6 py-5 space-y-5">
            {renderVisionSection()}

            {hasOrderItems ? (
              <section className="space-y-3">
                <h3 className="text-sm font-medium text-slate-800">订单商品明细</h3>
                <table className="min-w-full divide-y divide-slate-200 border border-slate-200 rounded-lg overflow-hidden">
                  <thead className="bg-slate-50">
                    <tr>
                      {['商品 ID', '商品名称', '标价', '实付单价', '数量', '小计'].map((header) => (
                        <th key={header} className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {detailOrder.items.map((item) => {
                      const fallbackName = `商品 #${item.product_id}`;
                      const displayName = item.product_name_snapshot?.trim() || fallbackName;
                      return (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-slate-400">P{item.product_id}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                            {displayName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">¥{item.unit_price.toFixed(2)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">¥{item.paid_price.toFixed(2)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{item.quantity}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">¥{item.subtotal.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                    <tr>
                      <td colSpan={5} className="px-6 py-3 text-sm font-semibold text-slate-700 text-right">实收合计</td>
                      <td className="px-6 py-3 text-sm font-bold text-slate-900">¥{detailOrder.order.total_amount.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </section>
            ) : (
              <div className="flex flex-col items-center justify-center h-36 text-slate-500 border border-dashed border-slate-200 rounded-xl bg-white">
                <ShoppingCart className="h-8 w-8 mb-2 text-slate-300" />
                <p className="text-sm">暂无订单明细</p>
              </div>
            )}
          </div>
        )}
      </div>

      {detailOrder.order.notes && (
        <div className="px-6 py-3 border-t border-slate-100 bg-amber-50/50 text-sm text-slate-600">
          <span className="font-medium text-slate-700">备注：</span>
          {detailOrder.order.notes}
        </div>
      )}

      <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          title="打印当前订单详情（可在系统打印窗口选择导出为 PDF）"
        >
          <Printer className="h-4 w-4" />
          打印 / 导出 PDF
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium"
        >
          关闭
        </button>
      </div>
    </ModalShell>
  );
}