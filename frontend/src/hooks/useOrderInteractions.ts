import { useEffect, useState } from 'react';
import { buildHistoryJumpOrderSearchTerm } from '../app/orderSearch';
import { getErrorMessage, notifyError } from '../app/notify';
import { api } from '../services/api';
import type { Customer, Order, View } from '../types';

type UseOrderInteractionsParams = {
  activeView: View;
  handleSearchChange: (value: string) => void;
  updateUrlAndState: (view: View, search: string, push?: boolean) => void;
  loadOrders: () => Promise<void>;
};

type OrderDetail = Awaited<ReturnType<typeof api.orders.detail>>;
type OrderHistory = Awaited<ReturnType<typeof api.orders.list>>;

export function useOrderInteractions({
  activeView,
  handleSearchChange,
  updateUrlAndState,
  loadOrders,
}: UseOrderInteractionsParams) {
  const [detailOrder, setDetailOrder] = useState<OrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);
  const [historyOrders, setHistoryOrders] = useState<OrderHistory>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [exactOrderId, setExactOrderId] = useState<string | null>(null);
  const [exactCustomerId, setExactCustomerId] = useState<string | null>(null);

  useEffect(() => {
    if (activeView !== 'orders') setExactOrderId(null);
    if (activeView !== 'customers') setExactCustomerId(null);
  }, [activeView]);

  const openCustomerHistory = async (customer: Customer) => {
    const customerId = Number(customer.id);
    if (!Number.isFinite(customerId)) return notifyError('当前客户不是后端数据，暂不支持查询订单历史。');
    setHistoryCustomer(customer);
    setHistoryOrders([]);
    setHistoryError('');
    setHistoryLoading(true);
    try {
      setHistoryOrders(await api.orders.list(customerId));
    } catch (error) {
      setHistoryError(getErrorMessage(error, '加载订单历史失败'));
    } finally {
      setHistoryLoading(false);
    }
  };

  const openOrderDetail = async (orderId: string) => {
    const id = Number(orderId);
    if (!Number.isFinite(id)) return notifyError('当前订单不是后端数据，无法查看详情');
    setDetailOrder(null);
    setDetailError('');
    setDetailLoading(true);
    try {
      setDetailOrder(await api.orders.detail(id));
    } catch (error) {
      setDetailError(getErrorMessage(error, '加载订单详情失败'));
      setDetailOrder({ order: { id, customer_id: 0, customer_name_snapshot: '', customer_phone_snapshot: '', total_amount: 0, order_date: undefined, notes: null, extra_info: null }, items: [] });
    } finally {
      setDetailLoading(false);
    }
  };

  const handleBulkDeleteOrders = async (orderIds: string[]) => {
    const ids = Array.from(new Set(orderIds.map((id) => Number(id)).filter((id) => Number.isFinite(id))));
    if (ids.length === 0) return notifyError('未选择有效订单，无法批量删除');

    const firstConfirm = window.confirm(`确认批量删除已选中的 ${ids.length} 条订单吗？`);
    if (!firstConfirm) return;

    const secondConfirm = window.confirm('这是不可恢复操作，请再次确认要批量删除这些订单。');
    if (!secondConfirm) return;

    let failedCount = 0;
    const deletedIds: number[] = [];
    for (const id of ids) {
      try { await api.orders.remove(id); deletedIds.push(id); } catch { failedCount += 1; }
    }
    if (detailOrder && deletedIds.includes(detailOrder.order.id)) setDetailOrder(null);
    await loadOrders();
    if (failedCount > 0) notifyError(`批量删除订单部分失败：成功 ${ids.length - failedCount} 条，失败 ${failedCount} 条`);
  };

  const jumpToOrder = (orderId: number, customerName: string, customerPhone?: string) => {
    setHistoryCustomer(null);
    setExactOrderId(String(orderId));
    updateUrlAndState('orders', buildHistoryJumpOrderSearchTerm(customerName, customerPhone), true);
  };

  const jumpToCustomerFromOrder = (order: Order) => {
    setExactOrderId(null);
    setExactCustomerId(order.customerId?.trim() || null);
    updateUrlAndState('customers', buildHistoryJumpOrderSearchTerm(order.customerName, order.customerPhone), true);
  };

  return {
    detailOrder, detailLoading, detailError, setDetailOrder, openOrderDetail,
    historyCustomer, historyOrders, historyLoading, historyError, setHistoryCustomer, openCustomerHistory,
    exactOrderId, exactCustomerId,
    jumpToOrder, jumpToCustomerFromOrder,
    handleBulkDeleteOrders,
    handleOrderSearchChange: (value: string) => { setExactOrderId(null); handleSearchChange(value); },
    handleCustomerSearchChange: (value: string) => { setExactCustomerId(null); handleSearchChange(value); },
  };
}