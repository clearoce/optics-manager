import { useCallback } from 'react';
import { mapCustomerFromApi, mapOrderFromApi } from '../app/mappers';
import { api } from '../services/api';
import type { Customer, Order } from '../types';
import { useResourceList } from './useResourceList';

export function useOrdersData() {
  const loadOrdersFromApi = useCallback(async (existingCustomers?: Customer[]): Promise<Order[]> => {
    const [orderRows, customerRows] = await Promise.all([
      api.orders.list(),
      existingCustomers ? Promise.resolve(null) : api.customers.list(),
    ]);
    const customerList = existingCustomers ?? (customerRows ?? []).map(mapCustomerFromApi);
    return orderRows.map((row) => {
      const customer = customerList.find((c) => c.id === String(row.customer_id));
      return mapOrderFromApi(row, customer?.name);
    });
  }, []);

  const {
    data: orders,
    loading: ordersLoading,
    error: ordersError,
    reload: loadOrders,
  } = useResourceList<Order, [Customer[]?]>(loadOrdersFromApi, {
    defaultErrorMessage: '加载订单失败',
  });

  return {
    orders,
    ordersLoading,
    ordersError,
    loadOrders,
  };
}