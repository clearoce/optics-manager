import { useCallback } from 'react';
import { mapCustomerFromApi } from '../app/mappers';
import { api } from '../services/api';
import type { Customer } from '../types';
import { useResourceList } from './useResourceList';

export function useCustomersData() {
  const loadCustomersFromApi = useCallback(async (): Promise<Customer[]> => {
    const rows = await api.customers.list();
    return rows.map(mapCustomerFromApi);
  }, []);

  const {
    data: customers,
    loading: customersLoading,
    error: customersError,
    reload: loadCustomers,
  } = useResourceList<Customer, []>(loadCustomersFromApi, {
    defaultErrorMessage: '加载客户失败',
  });

  return {
    customers,
    customersLoading,
    customersError,
    loadCustomers,
  };
}