import { useCallback } from 'react';
import { mapProductFromApi } from '../app/mappers';
import { api } from '../services/api';
import type { Product } from '../types';
import { useResourceList } from './useResourceList';

export function useProductsData() {
  const loadProductsFromApi = useCallback(async (): Promise<Product[]> => {
    const rows = await api.products.list();
    return rows.map(mapProductFromApi);
  }, []);

  const {
    data: products,
    loading: productsLoading,
    error: productsError,
    reload: loadProducts,
  } = useResourceList<Product, []>(loadProductsFromApi, {
    defaultErrorMessage: '加载商品数据失败',
  });

  return {
    products,
    productsLoading,
    productsError,
    loadProducts,
  };
}