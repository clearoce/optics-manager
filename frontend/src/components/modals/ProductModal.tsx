import type { FormEvent } from 'react';
import { Loader2, Package, Save } from 'lucide-react';
import type { ProductFormState } from '../../app/formTypes';
import type { Product } from '../../types';
import { ClearableInput, ClearableTextarea } from '../common/ClearableInput';
import { ModalHeader, ModalShell } from '../common/ModalShell';

type ProductModalProps = {
  isOpen: boolean;
  editingProduct: Product | null;
  productForm: ProductFormState;
  productSubmitting: boolean;
  onClose: () => void;
  onProductFormChange: (form: ProductFormState) => void;
  onSubmit: (event: FormEvent) => void;
};

export function ProductModal({
  isOpen,
  editingProduct,
  productForm,
  productSubmitting,
  onClose,
  onProductFormChange,
  onSubmit,
}: ProductModalProps) {
  if (!isOpen) return null;

  return (
    <ModalShell containerClassName="max-w-2xl max-h-[92vh] flex flex-col">
      <ModalHeader
        title={editingProduct ? '编辑商品信息' : '添加新商品'}
        icon={<Package className="h-5 w-5 mr-2 text-blue-600" />}
        onClose={onClose}
        closeAriaLabel="关闭商品弹窗"
        closeTitle="关闭商品弹窗"
      />

      <form onSubmit={onSubmit} className="p-6 space-y-4 overflow-y-auto">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">商品名称</label>
          <ClearableInput
            type="text"
            required
            value={productForm.name}
            onChange={(value) => onProductFormChange({ ...productForm, name: value })}
            onClear={() => onProductFormChange({ ...productForm, name: '' })}
            clearAriaLabel="清空商品名称输入"
            className="w-full px-4 py-2 pr-9 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="例如：依视路防蓝光镜片"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">SKU（唯一标识，可选）</label>
          <ClearableInput
            type="text"
            value={productForm.sku}
            onChange={(value) => onProductFormChange({ ...productForm, sku: value })}
            onClear={() => onProductFormChange({ ...productForm, sku: '' })}
            clearAriaLabel="清空SKU输入"
            className="w-full px-4 py-2 pr-9 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="例如：ESL-BL-01（可留空）"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">分类</label>
          <ClearableInput
            type="text"
            required
            value={productForm.category}
            onChange={(value) => onProductFormChange({ ...productForm, category: value })}
            onClear={() => onProductFormChange({ ...productForm, category: '' })}
            clearAriaLabel="清空分类输入"
            className="w-full px-4 py-2 pr-9 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="例如：镜片 / 镜框 / 隐形眼镜"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">价格</label>
          <ClearableInput
            type="number"
            min="0.01"
            step="0.01"
            required
            value={productForm.price}
            onChange={(value) => onProductFormChange({ ...productForm, price: value })}
            onClear={() => onProductFormChange({ ...productForm, price: '' })}
            clearAriaLabel="清空价格输入"
            className="w-full px-4 py-2 pr-9 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="例如：699"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">备注</label>
          <ClearableTextarea
            value={productForm.notes}
            onChange={(value) => onProductFormChange({ ...productForm, notes: value })}
            onClear={() => onProductFormChange({ ...productForm, notes: '' })}
            clearAriaLabel="清空商品备注输入"
            className="w-full px-4 py-2 pr-9 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            rows={3}
            placeholder="可填写规格、材质等"
          />
        </div>

        <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 text-sm"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={productSubmitting}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center disabled:opacity-70"
          >
            {productSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            {editingProduct ? '保存更改' : '创建商品'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}