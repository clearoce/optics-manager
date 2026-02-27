import { Clock, Edit, Filter, Plus, ShoppingBag, Trash2, TrendingUp, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Status, type Customer, type Order } from '../../types';
import { SearchBar } from '../common/SearchBar';
import { StatCard } from '../common/StatCard';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

type OrdersViewProps = {
  orders: Order[];
  filteredOrders: Order[];
  customers: Customer[];
  searchTerm: string;
  onSearchChange: (value: string) => void;
  ordersLoading: boolean;
  ordersError: string;
  onOpenOrderDetail: (orderId: string) => void;
  onOpenEditOrder: (orderId: string) => void;
  onDeleteOrder: (orderId: string) => void;
  onOpenCreateOrder: () => void;
};

export function OrdersView({
  orders,
  filteredOrders,
  customers,
  searchTerm,
  onSearchChange,
  ordersLoading,
  ordersError,
  onOpenOrderDetail,
  onOpenEditOrder,
  onDeleteOrder,
  onOpenCreateOrder,
}: OrdersViewProps) {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [amountMin, setAmountMin] = useState('');
  const [amountMax, setAmountMax] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(10);

  const customerPhoneById = useMemo(() => {
    return new Map(customers.map((customer) => [customer.id, customer.phone]));
  }, [customers]);

  const totalRevenue = orders.reduce((acc, curr) => acc + curr.total, 0);

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

  const filteredRevenue = useMemo(
    () => displayOrders.reduce((acc, curr) => acc + curr.total, 0),
    [displayOrders],
  );

  const totalOrders = displayOrders.length;
  const totalPages = Math.max(1, Math.ceil(totalOrders / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const pagedOrders = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return displayOrders.slice(start, start + pageSize);
  }, [displayOrders, safeCurrentPage, pageSize]);

  const pageStart = totalOrders === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const pageEnd = Math.min(safeCurrentPage * pageSize, totalOrders);

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

  const hasActiveFilter = dateFrom || dateTo || amountMin || amountMax;
  const clearFilters = () => {
    setCurrentPage(1);
    setDateFrom('');
    setDateTo('');
    setAmountMin('');
    setAmountMax('');
  };

  const getStatusClassName = (status: Status) => {
    switch (status) {
      case Status.Pending:
        return 'bg-amber-50 text-amber-700 border border-amber-200';
      case Status.Completed:
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case Status.Cancelled:
        return 'bg-rose-50 text-rose-700 border border-rose-200';
      case Status.Shipped:
        return 'bg-indigo-50 text-indigo-700 border border-indigo-200';
      default:
        return 'bg-slate-100 text-slate-700 border border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* 标题行 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-900">订单管理</h2>
        <button
          onClick={onOpenCreateOrder}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
        >
          <Plus className="h-4 w-4" />
          新建订单
        </button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="总实收" value={`¥${totalRevenue.toFixed(0)}`} icon={<TrendingUp className="h-6 w-6 text-green-600" />} tip="实收金额口径" />
        <StatCard title="订单总数" value={`${orders.length}`} icon={<ShoppingBag className="h-6 w-6 text-blue-600" />} tip="全部订单" />
        <StatCard
          title="待处理"
          value={`${orders.filter((o) => o.status === Status.Pending).length}`}
          icon={<Clock className="h-6 w-6 text-amber-600" />}
          tip="需跟进"
        />
        <StatCard
          title="平均客单价"
          value={`¥${orders.length > 0 ? (totalRevenue / orders.length).toFixed(0) : '0'}`}
          icon={<Filter className="h-6 w-6 text-indigo-600" />}
          tip="实收金额口径"
        />
      </div>

      {/* 筛选条 */}
      <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex flex-wrap items-center gap-3">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">筛选</span>

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
          <label className="text-xs text-slate-500">金额</label>
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

        <div className="w-full sm:w-auto sm:min-w-[280px] md:min-w-[320px]">
          <SearchBar value={searchTerm} onChange={handleSearchInput} placeholder="搜索客户名、电话或备注..." />
        </div>

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

        <div className="ml-auto text-right text-xs">
          <div className="text-slate-600">筛选实收：¥{filteredRevenue.toFixed(2)}</div>
          <div className="text-slate-400">
            共 {displayOrders.length} 条
            {hasActiveFilter && ` / 共 ${orders.length} 条`}
          </div>
        </div>
      </div>

      {/* 表格 */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {ordersLoading && (
          <div className="px-6 py-4 text-sm text-slate-500">正在加载订单数据...</div>
        )}
        {ordersError && (
          <div className="mx-6 mt-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
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
                {['订单号', '客户', '电话', '状态', '实收金额', '日期', '备注', '操作'].map((h) => (
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
                  <td className="px-6 py-4 text-xs font-mono text-slate-600">#{o.id}</td>
                  <td className="px-6 py-4 text-sm text-slate-900">{o.customerName}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{(o.customerId && customerPhoneById.get(o.customerId)) || '-'}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClassName(o.status)}`}>
                      {o.status}
                    </span>
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
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onDeleteOrder(o.id);
                        }}
                        className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2.5 py-1.5 text-xs text-red-600 hover:bg-red-50"
                        title="删除订单"
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
        )}
        {totalOrders > 0 && (
          <div className="border-t border-slate-200 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white">
            <div className="text-xs text-slate-500">
              显示 {pageStart}-{pageEnd} 条，共 {totalOrders} 条
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <label htmlFor="orders-page-size" className="text-slate-500 text-xs">
                每页
              </label>
              <select
                id="orders-page-size"
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
