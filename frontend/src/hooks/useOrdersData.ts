import { useCallback } from 'react';
import { mapOrderFromApi } from '../app/mappers';
import { api } from '../services/api';
import type { Order } from '../types';
import { useResourceList } from './useResourceList';

export function useOrdersData() {
  const loadOrdersFromApi = useCallback(async (): Promise<Order[]> => {
    const orderRows = await api.orders.list();
    return orderRows.map((row) => mapOrderFromApi(row));
  }, []);

  const {
    data: orders,
    loading: ordersLoading,
    error: ordersError,
    reload: loadOrders,
  } = useResourceList<Order, []>(loadOrdersFromApi, {
    defaultErrorMessage: '加载订单失败',
  });

  return {
    orders,
    ordersLoading,
    ordersError,
    loadOrders,
  };
}