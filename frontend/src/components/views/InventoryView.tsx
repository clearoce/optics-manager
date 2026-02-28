import {
  HandCoins,
  Loader2,
  PackageSearch,
  Plus,
  TriangleAlert,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { Product } from '../../types';
import { PaginationControls } from '../common/PaginationControls';
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
  onBulkDeleteProducts: (productIds: string[]) => Promise<void>;
};

export function InventoryView({
  filteredProducts,
  productsLoading,
  productsError,
  searchTerm,
  onSearchChange,
  onOpenCreateProduct,
  onOpenEditProduct,
  onBulkDeleteProducts,
}: InventoryViewProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(10);
  const [jumpPage, setJumpPage] = useState('1');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [amountMin, setAmountMin] = useState('');
  const [amountMax, setAmountMax] = useState('');

  const displayProducts = useMemo(() => {
    const minAmount = amountMin.trim() === '' ? null : Number(amountMin);
    const maxAmount = amountMax.trim() === '' ? null : Number(amountMax);

    return filteredProducts.filter((product) => {
      if (minAmount !== null && Number.isFinite(minAmount) && product.price < minAmount) return false;
      if (maxAmount !== null && Number.isFinite(maxAmount) && product.price > maxAmount) return false;
      return true;
    });
  }, [filteredProducts, amountMin, amountMax]);

  const totalProducts = displayProducts.length;
  const totalPages = Math.max(1, Math.ceil(totalProducts / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const pagedProducts = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return displayProducts.slice(start, start + pageSize);
  }, [displayProducts, safeCurrentPage, pageSize]);

  const pageStart = totalProducts === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const pageEnd = Math.min(safeCurrentPage * pageSize, totalProducts);

  useEffect(() => {
    setJumpPage(String(safeCurrentPage));
  }, [safeCurrentPage]);

  const goToPage = (page: number) => {
    const targetPage = Math.min(totalPages, Math.max(1, page));
    setCurrentPage(targetPage);
  };

  const handleJumpToPage = () => {
    const parsed = Number.parseInt(jumpPage, 10);
    if (!Number.isFinite(parsed)) {
      setJumpPage(String(safeCurrentPage));
      return;
    }
    goToPage(parsed);
  };

  const handleSearchInput = (value: string) => {
    setCurrentPage(1);
    onSearchChange(value);
  };

  const handleAmountMinChange = (value: string) => {
    setCurrentPage(1);
    setAmountMin(value);
  };

  const handleAmountMaxChange = (value: string) => {
    setCurrentPage(1);
    setAmountMax(value);
  };

  useEffect(() => {
    setSelectedProductIds((prev) => {
      if (prev.length === 0) return prev;
      const validIds = new Set(displayProducts.map((product) => product.id));
      return prev.filter((id) => validIds.has(id));
    });
  }, [displayProducts]);

  const pagedProductIds = useMemo(() => pagedProducts.map((product) => product.id), [pagedProducts]);
  const selectedOnPageCount = useMemo(
    () => pagedProductIds.filter((id) => selectedProductIds.includes(id)).length,
    [pagedProductIds, selectedProductIds],
  );
  const allPageSelected = pagedProductIds.length > 0 && selectedOnPageCount === pagedProductIds.length;

  const toggleProductSelection = (productId: string) => {
    setSelectedProductIds((prev) => {
      if (prev.includes(productId)) {
        return prev.filter((id) => id !== productId);
      }
      return [...prev, productId];
    });
  };

  const toggleCurrentPageSelection = () => {
    if (allPageSelected) {
      setSelectedProductIds((prev) => prev.filter((id) => !pagedProductIds.includes(id)));
      return;
    }

    setSelectedProductIds((prev) => {
      const merged = new Set([...prev, ...pagedProductIds]);
      return Array.from(merged);
    });
  };

  const handleBulkDelete = async () => {
    if (selectedProductIds.length === 0 || bulkDeleting) return;

    setBulkDeleting(true);
    try {
      await onBulkDeleteProducts(selectedProductIds);
      setSelectedProductIds([]);
    } finally {
      setBulkDeleting(false);
    }
  };

  const hasActiveFilter = amountMin || amountMax;
  const clearFilters = () => {
    setCurrentPage(1);
    setAmountMin('');
    setAmountMax('');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 uppercase tracking-wider">
          <HandCoins className="h-3.5 w-3.5" />
          筛选
        </span>

        <div className="flex items-center gap-1.5">
          <label className="inline-flex items-center gap-1 text-xs text-slate-500">金额</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={amountMin}
            onChange={(event) => handleAmountMinChange(event.target.value)}
            className="w-28 border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="最小"
            aria-label="最小金额"
          />
          <span className="text-slate-400 text-xs">~</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={amountMax}
            onChange={(event) => handleAmountMaxChange(event.target.value)}
            className="w-28 border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="最大"
            aria-label="最大金额"
          />
        </div>

        <div className="ml-auto flex w-full flex-wrap sm:w-auto items-center justify-end gap-2">
          <SearchBar value={searchTerm} onChange={handleSearchInput} placeholder="搜索产品名称..." />

          {hasActiveFilter && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-500 border border-slate-200 rounded-lg px-2 py-1.5"
            >
              <X className="h-3 w-3" />
              清除筛选
            </button>
          )}

          <button
            onClick={onOpenCreateProduct}
            className="h-10 px-4 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap inline-flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            添加产品
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {productsLoading && (
          <div className="px-6 py-4 text-sm text-slate-500 inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            正在加载产品数据...
          </div>
        )}
        {productsError && (
          <div className="mx-6 mt-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 inline-flex items-center gap-2">
            <TriangleAlert className="h-4 w-4" />
            接口加载失败，当前展示本地 mock 数据：{productsError}
          </div>
        )}
        {!productsLoading && displayProducts.length === 0 && (
          <div className="px-6 py-12 flex flex-col items-center text-slate-400 gap-2">
            <PackageSearch className="h-10 w-10 text-slate-200" />
            <p className="text-sm">{hasActiveFilter ? '当前筛选条件下没有商品' : '暂无产品数据'}</p>
            {!hasActiveFilter && (
              <button
                onClick={onOpenCreateProduct}
                className="mt-2 text-sm text-blue-600 hover:text-blue-700 underline"
              >
                添加第一个商品
              </button>
            )}
          </div>
        )}
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                <input
                  type="checkbox"
                  checked={allPageSelected}
                  onChange={toggleCurrentPageSelection}
                  aria-label="全选本页商品"
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
              {['商品名称', '价格', '备注'].map((h) => (
                <th key={h} className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {pagedProducts.map((p) => (
              <tr
                key={p.id}
                onClick={() => onOpenEditProduct(p)}
                className="hover:bg-slate-50 cursor-pointer"
                title="点击编辑商品"
              >
                <td className="px-4 py-4">
                  <input
                    type="checkbox"
                    checked={selectedProductIds.includes(p.id)}
                    onChange={() => toggleProductSelection(p.id)}
                    onClick={(event) => event.stopPropagation()}
                    aria-label={`选择商品 ${p.name}`}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </td>
                <td className="px-6 py-4">
                  <div className="font-medium text-slate-900">{p.name}</div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-900 font-medium">¥{p.price.toFixed(2)}</td>
                <td className="px-6 py-4 text-sm text-slate-500">{p.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {displayProducts.length > 0 && (
          <PaginationControls
            idPrefix="inventory"
            pageStart={pageStart}
            pageEnd={pageEnd}
            totalItems={totalProducts}
            pageSize={pageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageSizeChange={(size) => {
              setPageSize(size as (typeof PAGE_SIZE_OPTIONS)[number]);
              setCurrentPage(1);
            }}
            currentPage={safeCurrentPage}
            totalPages={totalPages}
            onFirstPage={() => goToPage(1)}
            onPrevPage={() => setCurrentPage((page) => Math.max(1, page - 1))}
            onNextPage={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
            onLastPage={() => goToPage(totalPages)}
            jumpPage={jumpPage}
            onJumpPageChange={setJumpPage}
            onJump={handleJumpToPage}
            leftExtra={
              selectedProductIds.length > 0 ? (
                <div className="inline-flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-600">已选 {selectedProductIds.length} 项</span>
                  <button
                    type="button"
                    onClick={handleBulkDelete}
                    disabled={bulkDeleting}
                    className="inline-flex items-center rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {bulkDeleting ? '删除中...' : '批量删除'}
                  </button>
                </div>
              ) : undefined
            }
          />
        )}
      </div>
    </div>
  );
}
