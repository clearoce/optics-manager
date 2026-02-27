import { Edit, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { Product } from '../../types';
import { SearchBar } from '../common/SearchBar';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

type InventoryViewProps = {
  filteredProducts: Product[];
  productsLoading: boolean;
  productsError: string;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onOpenCreateProduct: () => void;
  onOpenEditProduct: (product: Product) => void;
  onDeleteProduct: (product: Product) => void;
};

export function InventoryView({
  filteredProducts,
  productsLoading,
  productsError,
  searchTerm,
  onSearchChange,
  onOpenCreateProduct,
  onOpenEditProduct,
  onDeleteProduct,
}: InventoryViewProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(10);

  const totalProducts = filteredProducts.length;
  const totalPages = Math.max(1, Math.ceil(totalProducts / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const pagedProducts = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, safeCurrentPage, pageSize]);

  const pageStart = totalProducts === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const pageEnd = Math.min(safeCurrentPage * pageSize, totalProducts);

  const handleSearchInput = (value: string) => {
    setCurrentPage(1);
    onSearchChange(value);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-900">商品管理</h2>
        <div className="flex w-full sm:w-auto gap-2">
          <SearchBar value={searchTerm} onChange={handleSearchInput} placeholder="搜索产品名称..." />
          <button
            onClick={onOpenCreateProduct}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 whitespace-nowrap inline-flex items-center"
          >
            <Plus className="h-4 w-4 mr-1" />
            添加产品
          </button>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {productsLoading && <div className="px-6 py-4 text-sm text-slate-500">正在加载产品数据...</div>}
        {productsError && (
          <div className="mx-6 mt-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            接口加载失败，当前展示本地 mock 数据：{productsError}
          </div>
        )}
        {!productsLoading && filteredProducts.length === 0 && (
          <div className="px-6 py-6 text-sm text-slate-500">暂无产品数据</div>
        )}
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              {['产品 / SKU', '价格', '备注', '操作'].map((h) => (
                <th key={h} className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {pagedProducts.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-6 py-4">
                  <div className="font-medium text-slate-900">{p.name}</div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-400 bg-slate-100 px-1 rounded">{p.sku || '-'}</span>
                    <span className="text-sm text-slate-500">· {p.category}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-900 font-medium">¥{p.price.toFixed(2)}</td>
                <td className="px-6 py-4 text-sm text-slate-500">{p.notes}</td>
                <td className="px-6 py-4 text-sm">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onOpenEditProduct(p)}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                      title="编辑商品"
                    >
                      <Edit className="h-3.5 w-3.5" />
                      编辑
                    </button>
                    <button
                      onClick={() => onDeleteProduct(p)}
                      className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2.5 py-1.5 text-xs text-red-600 hover:bg-red-50"
                      title="删除商品"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      删除
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {totalProducts > 0 && (
          <div className="border-t border-slate-200 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white">
            <div className="text-xs text-slate-500">
              显示 {pageStart}-{pageEnd} 条，共 {totalProducts} 条
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <label htmlFor="inventory-page-size" className="text-slate-500 text-xs">
                每页
              </label>
              <select
                id="inventory-page-size"
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value) as (typeof PAGE_SIZE_OPTIONS)[number]);
                  setCurrentPage(1);
                }}
                className="border border-slate-300 rounded-md px-2 py-1 text-sm"
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={safeCurrentPage === 1}
                className="px-2.5 py-1.5 rounded-md border border-slate-300 text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                上一页
              </button>
              <span className="text-xs text-slate-600 min-w-[72px] text-center">
                第 {safeCurrentPage} / {totalPages} 页
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={safeCurrentPage >= totalPages}
                className="px-2.5 py-1.5 rounded-md border border-slate-300 text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
