import { ExternalLink, FileText, Loader2 } from 'lucide-react';
import type { OrderDTO } from '../../services/api';
import type { Customer } from '../../types';
import { ModalHeader, ModalShell } from '../common/ModalShell';

type OrderHistoryModalProps = {
  historyCustomer: Customer | null;
  historyOrders: OrderDTO[];
  historyLoading: boolean;
  historyError: string;
  onClose: () => void;
  onJumpToOrder: (orderId: number) => void;
};

export function OrderHistoryModal({
  historyCustomer,
  historyOrders,
  historyLoading,
  historyError,
  onClose,
  onJumpToOrder,
}: OrderHistoryModalProps) {
  if (!historyCustomer) return null;

  return (
    <ModalShell containerClassName="max-w-5xl flex flex-col max-h-[92vh]">
      <ModalHeader
        title={`${historyCustomer.name} 的订单历史`}
        icon={<FileText className="h-5 w-5 mr-2 text-indigo-600" />}
        subtitle={<p className="text-xs text-slate-500 ml-7">客户ID：{historyCustomer.id}</p>}
        onClose={onClose}
        closeAriaLabel="关闭订单历史弹窗"
        closeTitle="关闭订单历史弹窗"
        className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/80"
      />

      <div className="flex-1 overflow-y-auto">
        {historyLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          </div>
        ) : historyError ? (
          <div className="px-6 py-8 text-sm text-red-600">加载失败：{historyError}</div>
        ) : historyOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-500">
            <FileText className="h-10 w-10 mb-2 text-slate-300" />
            <p>暂无订单记录</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50 sticky top-0">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">订单号</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">日期</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">实收金额</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">备注</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {historyOrders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => onJumpToOrder(order.id)}
                      className="text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center"
                      title="跳转到订单详情"
                    >
                      #{order.id} <ExternalLink className="h-3 w-3 ml-1" />
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {order.order_date ? order.order_date.slice(0, 19).replace('T', ' ') : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">¥{order.total_amount.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{order.notes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
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