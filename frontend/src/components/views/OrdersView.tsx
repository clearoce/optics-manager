import {
  CalendarRange,
  Edit,
  HandCoins,
  Loader2,
  Plus,
  ShoppingBag,
  TriangleAlert,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { Order } from '../../types';
import { PaginationControls } from '../common/PaginationControls';
import { SearchBar } from '../common/SearchBar';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

type OrdersViewProps = {
  orders: Order[];
  filteredOrders: Order[];
  searchTerm: string;
  onSearchChange: (value: string) => void;
  ordersLoading: boolean;
  ordersError: string;
  onOpenOrderDetail: (orderId: string) => void;
  onJumpToCustomer: (order: Order) => void;
  onOpenEditOrder: (orderId: string) => void;
  onBulkDeleteOrders: (orderIds: string[]) => Promise<void>;
  onOpenCreateOrder: () => void;
};

export function OrdersView({
  filteredOrders,
  searchTerm,
  onSearchChange,
  ordersLoading,
  ordersError,
  onOpenOrderDetail,
  onJumpToCustomer,
  onOpenEditOrder,
  onBulkDeleteOrders,
  onOpenCreateOrder,
}: OrdersViewProps) {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [amountMin, setAmountMin] = useState('');
  const [amountMax, setAmountMax] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(10);
  const [jumpPage, setJumpPage] = useState('1');
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // 在 filteredOrders（已按搜索词过滤）基础上再叠加本地筛选
  const displayOrders = useMemo(() => {
    const minAmount = amountMin.trim() === '' ? null : Number(amountMin);
    const maxAmount = amountMax.trim() === '' ? null : Number(amountMax);

    return filteredOrders.filter((o) => {
      if (dateFrom && o.date < dateFrom) return false;
      if (dateTo && o.date > dateTo) return false;
      if (minAmount !== null && Number.isFinite(minAmount) && o.total < minAmount) return false;
      if (maxAmount !== null && Number.isFinite(maxAmount) && o.total > maxAmount) return false;
      return true;
    });
  }, [filteredOrders, dateFrom, dateTo, amountMin, amountMax]);



  const totalOrders = displayOrders.length;
  const totalPages = Math.max(1, Math.ceil(totalOrders / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const pagedOrders = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return displayOrders.slice(start, start + pageSize);
  }, [displayOrders, safeCurrentPage, pageSize]);

  const pageStart = totalOrders === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const pageEnd = Math.min(safeCurrentPage * pageSize, totalOrders);

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

  const handleDateFromChange = (value: string) => {
    setCurrentPage(1);
    setDateFrom(value);
  };

  const handleDateToChange = (value: string) => {
    setCurrentPage(1);
    setDateTo(value);
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
    setSelectedOrderIds((prev) => {
      if (prev.length === 0) return prev;
      const validIds = new Set(displayOrders.map((order) => order.id));
      return prev.filter((id) => validIds.has(id));
    });
  }, [displayOrders]);

  const pagedOrderIds = useMemo(() => pagedOrders.map((order) => order.id), [pagedOrders]);
  const selectedOnPageCount = useMemo(
    () => pagedOrderIds.filter((id) => selectedOrderIds.includes(id)).length,
    [pagedOrderIds, selectedOrderIds],
  );
  const allPageSelected = pagedOrderIds.length > 0 && selectedOnPageCount === pagedOrderIds.length;

  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrderIds((prev) => {
      if (prev.includes(orderId)) {
        return prev.filter((id) => id !== orderId);
      }
      return [...prev, orderId];
    });
  };

  const toggleCurrentPageSelection = () => {
    if (allPageSelected) {
      setSelectedOrderIds((prev) => prev.filter((id) => !pagedOrderIds.includes(id)));
      return;
    }

    setSelectedOrderIds((prev) => {
      const merged = new Set([...prev, ...pagedOrderIds]);
      return Array.from(merged);
    });
  };

  const handleBulkDelete = async () => {
    if (selectedOrderIds.length === 0 || bulkDeleting) return;

    setBulkDeleting(true);
    try {
      await onBulkDeleteOrders(selectedOrderIds);
      setSelectedOrderIds([]);
    } finally {
      setBulkDeleting(false);
    }
  };

  const hasActiveFilter = dateFrom || dateTo || amountMin || amountMax;
  const clearFilters = () => {
    setCurrentPage(1);
    setDateFrom('');
    setDateTo('');
    setAmountMin('');
    setAmountMax('');
  };

  return (
    <div className="space-y-6">
      {/* 筛选条 */}
      <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 uppercase tracking-wider">
          <CalendarRange className="h-3.5 w-3.5" />
          筛选
        </span>

        {/* 按日期起 */}
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-slate-500">从</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => handleDateFromChange(e.target.value)}
            aria-label="开始日期"
            className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        {/* 按日期止 */}
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-slate-500">至</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => handleDateToChange(e.target.value)}
            aria-label="结束日期"
            className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <label className="inline-flex items-center gap-1 text-xs text-slate-500">
            <HandCoins className="h-3.5 w-3.5" />
            金额
          </label>
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

        <div className="ml-auto flex w-full sm:w-auto flex-wrap items-center justify-end gap-2">
          <SearchBar value={searchTerm} onChange={handleSearchInput} placeholder="搜索客户名或电话" />

          {/* 清除 */}
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
            onClick={onOpenCreateOrder}
            className="h-10 px-4 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap inline-flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            新建订单
          </button>
        </div>
      </div>

      {/* 表格 */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {ordersLoading && (
          <div className="px-6 py-4 text-sm text-slate-500 inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            正在加载订单数据...
          </div>
        )}
        {ordersError && (
          <div className="mx-6 mt-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 inline-flex items-center gap-2">
            <TriangleAlert className="h-4 w-4" />
            接口加载失败：{ordersError}
          </div>
        )}
        {!ordersLoading && displayOrders.length === 0 && (
          <div className="px-6 py-12 flex flex-col items-center text-slate-400 gap-2">
            <ShoppingBag className="h-10 w-10 text-slate-200" />
            <p className="text-sm">{hasActiveFilter ? '当前筛选条件下没有订单' : '暂无订单数据'}</p>
            {!hasActiveFilter && (
              <button
                onClick={onOpenCreateOrder}
                className="mt-2 text-sm text-blue-600 hover:text-blue-700 underline"
              >
                创建第一个订单
              </button>
            )}
          </div>
        )}
        {displayOrders.length > 0 && (
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    onChange={toggleCurrentPageSelection}
                    aria-label="全选本页订单"
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                {['订单号', '客户', '电话', '实收金额', '日期', '备注', '操作'].map((h) => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {pagedOrders.map((o) => (
                <tr
                  key={o.id}
                  onClick={() => onOpenOrderDetail(o.id)}
                  className="hover:bg-blue-50 cursor-pointer transition-colors"
                  title="点击查看订单详情"
                >
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={selectedOrderIds.includes(o.id)}
                      onChange={() => toggleOrderSelection(o.id)}
                      onClick={(event) => event.stopPropagation()}
                      aria-label={`选择订单 ${o.id}`}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4 text-xs font-mono text-slate-600">#{o.id}</td>
                  <td className="px-6 py-4 text-sm text-slate-900">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onJumpToCustomer(o);
                      }}
                      className="text-left text-blue-700 hover:text-blue-800 hover:underline"
                      title="跳转到对应客户卡片"
                    >
                      {o.customerName}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onJumpToCustomer(o);
                      }}
                      className="text-left text-blue-600 hover:text-blue-700 hover:underline"
                      title="跳转到对应客户卡片"
                    >
                      {o.customerPhone || '-'}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-emerald-700">¥{o.total.toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{o.date}</td>
                  <td className="px-6 py-4 text-sm text-slate-400 max-w-xs truncate">{o.notes || '-'}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onOpenEditOrder(o.id);
                        }}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                        title="编辑订单"
                      >
                        <Edit className="h-3.5 w-3.5" />
                        编辑
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {totalOrders > 0 && (
          <PaginationControls
            idPrefix="orders"
            pageStart={pageStart}
            pageEnd={pageEnd}
            totalItems={totalOrders}
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
              selectedOrderIds.length > 0 ? (
                <div className="inline-flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-600">已选 {selectedOrderIds.length} 项</span>
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
