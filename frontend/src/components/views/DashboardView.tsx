import { DollarSign, Package, Users } from 'lucide-react';
import type { Customer, Order, Product } from '../../types';
import { StatCard } from '../common/StatCard';

type DashboardViewProps = {
  products: Product[];
  orders: Order[];
  customers: Customer[];
};

export function DashboardView({ products, orders, customers }: DashboardViewProps) {
  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
  const categoryStats = products.reduce<Record<string, number>>((acc, product) => {
    const category = product.category.trim() || '未分类';
    acc[category] = (acc[category] ?? 0) + 1;
    return acc;
  }, {});
  const topCategories = Object.entries(categoryStats)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="总收入"
          value={`¥${totalRevenue.toLocaleString()}`}
          icon={<DollarSign className="h-6 w-6 text-green-600" />}
          tip="所有已完成订单合计"
        />
        <StatCard
          title="订单总数"
          value={orders.length.toString()}
          icon={<Package className="h-6 w-6 text-blue-600" />}
          tip="系统记录的所有订单"
        />
        <StatCard
          title="客户总数"
          value={customers.length.toString()}
          icon={<Users className="h-6 w-6 text-indigo-600" />}
          tip="已注册客户数"
        />
        <StatCard
          title="商品总数"
          value={products.length.toString()}
          icon={<Package className="h-6 w-6 text-amber-600" />}
          tip="已录入系统的商品数量"
        />
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">商品分类概览</h3>
        {topCategories.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {topCategories.map(([category, count]) => (
              <div key={category} className="rounded-lg border border-slate-200 p-4 bg-slate-50">
                <p className="text-sm text-slate-500">{category}</p>
                <p className="font-semibold text-slate-900 mt-1">{count} 个商品</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500 italic">暂无商品分类数据。</p>
        )}
      </div>
    </div>
  );
}
