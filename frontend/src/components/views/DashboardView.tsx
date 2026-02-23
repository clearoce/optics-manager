import { Clock, DollarSign, Package, Users } from 'lucide-react';
import type { Customer, Order, Product } from '../../types';
import { StatCard } from '../common/StatCard';

type DashboardViewProps = {
  products: Product[];
  orders: Order[];
  customers: Customer[];
};

export function DashboardView({ products, orders, customers }: DashboardViewProps) {
  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
  const lowStockCount = products.filter((p) => p.stock <= p.lowStockThreshold).length;

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
          title="库存预警"
          value={lowStockCount.toString()}
          icon={<Clock className="h-6 w-6 text-amber-600" />}
          tip={`${lowStockCount} 个商品库存低于阈值`}
        />
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">库存紧张商品</h3>
        {lowStockCount > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {products
              .filter((p) => p.stock <= p.lowStockThreshold)
              .slice(0, 6)
              .map((p) => (
                <div key={p.id} className="rounded-lg border border-slate-200 p-4 bg-slate-50">
                  <p className="text-sm text-slate-500">{p.category}</p>
                  <p className="font-semibold text-slate-900 mt-1">{p.name}</p>
                  <div className="flex justify-between items-center mt-2">
                    <p className="text-sm text-slate-600">库存：{p.stock}</p>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">低于 {p.lowStockThreshold}</span>
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500 italic">目前所有商品库存充足。</p>
        )}
      </div>
    </div>
  );
}
