import { Loader2, Printer, ShoppingCart } from 'lucide-react';
import type { OrderDetailDTO } from '../../services/api';
import { ModalHeader, ModalShell } from '../common/ModalShell';

type OrderDetailModalProps = {
  detailOrder: OrderDetailDTO | null;
  detailLoading: boolean;
  detailError: string;
  onClose: () => void;
};

export function OrderDetailModal({ detailOrder, detailLoading, detailError, onClose }: OrderDetailModalProps) {
  if (detailOrder === null) return null;

  const escapeHtml = (value: string) => value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

  const handlePrint = () => {
    const orderDate = detailOrder.order.order_date?.slice(0, 10) ?? '-';
    const notes = detailOrder.order.notes?.trim();

    const rowsHtml = detailOrder.items.map((item) => {
      const fallbackName = `商品 #${item.product_id}`;
      const displayName = item.product_name_snapshot?.trim() || fallbackName;
      const displayCategory = item.product_category_snapshot?.trim() || '-';
      const displaySKU = item.product_sku_snapshot?.trim() || '-';
      return `
        <tr>
          <td>P${item.product_id}</td>
          <td>${escapeHtml(displayName)}</td>
          <td>${escapeHtml(displayCategory)}</td>
          <td>${escapeHtml(displaySKU)}</td>
          <td>¥${item.unit_price.toFixed(2)}</td>
          <td>¥${item.paid_price.toFixed(2)}</td>
          <td>${item.quantity}</td>
          <td>¥${item.subtotal.toFixed(2)}</td>
        </tr>
      `;
    }).join('');

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
    doc.write(`
      <!doctype html>
      <html lang="zh-CN">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>订单详情 #${detailOrder.order.id}</title>
        <style>
          @page { size: A4 landscape; margin: 10mm; }
          body { margin: 0; color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', 'Microsoft YaHei', sans-serif; }
          .sheet { width: 100%; }
          h1 { margin: 0 0 6px; font-size: 20px; }
          .meta { margin: 0 0 12px; font-size: 12px; color: #475569; }
          table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 12px; }
          th, td { border: 1px solid #cbd5e1; padding: 6px 8px; vertical-align: top; word-break: break-word; overflow-wrap: anywhere; }
          th { background: #f8fafc; text-align: left; }
          th:nth-child(1), td:nth-child(1) { width: 10%; }
          th:nth-child(2), td:nth-child(2) { width: 22%; }
          th:nth-child(3), td:nth-child(3) { width: 12%; }
          th:nth-child(4), td:nth-child(4) { width: 12%; }
          th:nth-child(5), td:nth-child(5) { width: 12%; }
          th:nth-child(6), td:nth-child(6) { width: 12%; }
          th:nth-child(7), td:nth-child(7) { width: 7%; }
          th:nth-child(8), td:nth-child(8) { width: 13%; }
          tfoot td { font-weight: 700; background: #f8fafc; }
          .notes { margin-top: 10px; font-size: 12px; color: #334155; }
        </style>
      </head>
      <body>
        <div class="sheet">
          <h1>订单详情 #${detailOrder.order.id}</h1>
          <p class="meta">实收金额：¥${detailOrder.order.total_amount.toFixed(2)} &nbsp;·&nbsp; 日期：${orderDate}</p>

          <table>
            <thead>
              <tr>
                <th>商品 ID</th>
                <th>商品名称</th>
                <th>分类</th>
                <th>SKU</th>
                <th>标价</th>
                <th>实付单价</th>
                <th>数量</th>
                <th>小计</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || '<tr><td colspan="8">暂无订单明细</td></tr>'}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="7" style="text-align:right;">实收合计</td>
                <td>¥${detailOrder.order.total_amount.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>

          ${notes ? `<p class="notes"><strong>备注：</strong>${escapeHtml(notes)}</p>` : ''}
        </div>
      </body>
      </html>
    `);
    doc.close();

    const doCleanup = () => {
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
      frameWindow.print();
    }, 150);
  };

  return (
    <ModalShell containerClassName="max-w-6xl flex flex-col max-h-[92vh]">
      <ModalHeader
        title={`订单详情 · # ${detailOrder.order.id}`}
        icon={<ShoppingCart className="h-5 w-5 mr-2 text-blue-600" />}
        subtitle={(
          <p className="text-xs text-slate-500 ml-7">
            实收金额：<span className="font-semibold text-slate-700">¥{detailOrder.order.total_amount.toFixed(2)}</span>
            {detailOrder.order.order_date && <> &nbsp;·&nbsp; {detailOrder.order.order_date.slice(0, 10)}</>}
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
        ) : detailOrder.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-500">
            <ShoppingCart className="h-10 w-10 mb-2 text-slate-300" />
            <p>暂无订单明细</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50 sticky top-0">
              <tr>
                {['商品 ID', '商品名称', '分类', 'SKU', '标价', '实付单价', '数量', '小计'].map((header) => (
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
                const displayCategory = item.product_category_snapshot?.trim() || '-';
                const displaySKU = item.product_sku_snapshot?.trim() || '-';
                return (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-slate-400">P{item.product_id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                      {displayName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{displayCategory}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-mono">{displaySKU}</td>
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
                <td colSpan={7} className="px-6 py-3 text-sm font-semibold text-slate-700 text-right">实收合计</td>
                <td className="px-6 py-3 text-sm font-bold text-slate-900">¥{detailOrder.order.total_amount.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
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