import { Edit, Plus } from 'lucide-react';
import type { Product } from '../../types';
import { SearchBar } from '../common/SearchBar';

type InventoryViewProps = {
  filteredProducts: Product[];
  productsLoading: boolean;
  productsError: string;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onOpenCreateProduct: () => void;
  onOpenEditProduct: (product: Product) => void;
  onOpenStockModal: (product: Product) => void;
  onOpenInventoryLogs: (product: Product) => void;
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
  onOpenStockModal,
  onOpenInventoryLogs,
  onDeleteProduct,
}: InventoryViewProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-900">库存管理</h2>
        <div className="flex w-full sm:w-auto gap-2">
          <SearchBar value={searchTerm} onChange={onSearchChange} placeholder="搜索产品名称..." />
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
        {productsLoading && <div className="px-6 py-4 text-sm text-slate-500">正在加载库存数据...</div>}
        {productsError && (
          <div className="mx-6 mt-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            接口加载失败，当前展示本地 mock 数据：{productsError}
          </div>
        )}
        {!productsLoading && filteredProducts.length === 0 && (
          <div className="px-6 py-6 text-sm text-slate-500">暂无库存数据</div>
        )}
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              {['产品 / SKU', '价格', '库存', '状态', '备注', '操作'].map((h) => (
                <th key={h} className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {filteredProducts.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-6 py-4">
                  <div className="font-medium text-slate-900">{p.name}</div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-400 bg-slate-100 px-1 rounded">{p.sku || '-'}</span>
                    <span className="text-sm text-slate-500">· {p.category}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-900 font-medium">¥{p.price.toFixed(2)}</td>
                <td className="px-6 py-4 text-sm font-semibold">{p.stock}</td>
                <td className="px-6 py-4 text-sm">
                  <span className="px-2 py-1 rounded-full bg-slate-100">{p.status}</span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-500">{p.notes}</td>
                <td className="px-6 py-4 text-sm">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onOpenEditProduct(p)}
                      className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 inline-flex items-center"
                      title="编辑商品"
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      编辑
                    </button>
                    <button
                      onClick={() => onOpenStockModal(p)}
                      className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100"
                      title="调整库存"
                    >
                      调库存
                    </button>
                    <button
                      onClick={() => onOpenInventoryLogs(p)}
                      className="text-xs px-2 py-1 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                      title="查看库存日志"
                    >
                      日志
                    </button>
                    <button
                      onClick={() => onDeleteProduct(p)}
                      className="text-xs px-2 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100"
                      title="删除商品"
                    >
                      删除
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
