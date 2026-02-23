import { Clock, Filter, Plus, ShoppingBag, TrendingUp, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Status, type Customer, type Order } from '../../types';
import { SearchBar } from '../common/SearchBar';
import { StatCard } from '../common/StatCard';

type OrdersViewProps = {
  orders: Order[];
  filteredOrders: Order[];
  customers: Customer[];
  searchTerm: string;
  onSearchChange: (value: string) => void;
  ordersLoading: boolean;
  ordersError: string;
  onOpenOrderDetail: (orderId: string) => void;
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
  onOpenCreateOrder,
}: OrdersViewProps) {
  const [customerFilter, setCustomerFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const totalRevenue = orders.reduce((acc, curr) => acc + curr.total, 0);

  // 在 filteredOrders（已按搜索词过滤）基础上再叠加本地筛选
  const displayOrders = useMemo(() => {
    return filteredOrders.filter((o) => {
      if (customerFilter && o.customerId !== customerFilter) return false;
      if (dateFrom && o.date < dateFrom) return false;
      if (dateTo && o.date > dateTo) return false;
      return true;
    });
  }, [filteredOrders, customerFilter, dateFrom, dateTo]);

  const hasActiveFilter = customerFilter || dateFrom || dateTo;
  const clearFilters = () => {
    setCustomerFilter('');
    setDateFrom('');
    setDateTo('');
    onSearchChange('');
  };

  return (
    <div className="space-y-6">
      {/* 标题行 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-900">订单管理</h2>
        <div className="flex items-center gap-2">
          <SearchBar value={searchTerm} onChange={onSearchChange} placeholder="搜索订单号或客户名..." />
          <button
            onClick={onOpenCreateOrder}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            新建订单
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="总收入" value={`¥${totalRevenue.toFixed(0)}`} icon={<TrendingUp className="h-6 w-6 text-green-600" />} tip="订单口径" />
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
          tip="全部口径"
        />
      </div>

      {/* 筛选条 */}
      <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex flex-wrap items-center gap-3">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">筛选</span>

        {/* 按客户 */}
        <select
          value={customerFilter}
          onChange={(e) => setCustomerFilter(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
        >
          <option value="">全部客户</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}（{c.phone}）
            </option>
          ))}
        </select>

        {/* 按日期起 */}
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-slate-500">从</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        {/* 按日期止 */}
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-slate-500">至</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
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

        <span className="ml-auto text-xs text-slate-400">
          共 {displayOrders.length} 条
          {hasActiveFilter && ` / 共 ${orders.length} 条`}
        </span>
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
                {['订单号', '客户', '金额', '日期', '备注'].map((h) => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {displayOrders.map((o) => (
                <tr
                  key={o.id}
                  onClick={() => onOpenOrderDetail(o.id)}
                  className="hover:bg-blue-50 cursor-pointer transition-colors"
                  title="点击查看订单详情"
                >
                  <td className="px-6 py-4 text-xs font-mono text-slate-600">#{o.id}</td>
                  <td className="px-6 py-4 text-sm text-slate-900">{o.customerName}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-emerald-700">¥{o.total.toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{o.date}</td>
                  <td className="px-6 py-4 text-sm text-slate-400 max-w-xs truncate">{o.notes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
