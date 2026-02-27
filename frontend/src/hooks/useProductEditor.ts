import { useState } from 'react';
import type { FormEvent } from 'react';
import type { ProductFormState } from '../app/formTypes';
import { getErrorMessage, notifyError } from '../app/notify';
import { api } from '../services/api';
import type { Product } from '../types';

const EMPTY_PRODUCT_FORM: ProductFormState = {
  name: '',
  sku: '',
  category: '',
  price: '',
  notes: '',
};

type UseProductEditorParams = {
  products: Product[];
  loadProducts: () => Promise<void>;
};

export function useProductEditor({ products, loadProducts }: UseProductEditorParams) {
  const [productSubmitting, setProductSubmitting] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState<ProductFormState>(EMPTY_PRODUCT_FORM);

  const openCreateProductModal = () => {
    setEditingProduct(null);
    setProductForm(EMPTY_PRODUCT_FORM);
    setIsProductModalOpen(true);
  };

  const openEditProductModal = (product: Product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      sku: product.sku,
      category: product.category,
      price: String(product.price),
      notes: product.notes === '-' ? '' : product.notes,
    });
    setIsProductModalOpen(true);
  };

  const closeProductModal = () => {
    setIsProductModalOpen(false);
  };

  const handleSubmitProduct = async (event: FormEvent) => {
    event.preventDefault();
    if (!productForm.name.trim() || !productForm.category.trim() || !productForm.price.trim()) return;

    const price = Number(productForm.price);
    if (!Number.isFinite(price) || price <= 0) {
      notifyError('价格必须是大于 0 的数字');
      return;
    }

    const sku = productForm.sku.trim();
    if (sku) {
      const isSkuDuplicate = products.some((candidate) =>
        candidate.sku === sku && (!editingProduct || candidate.id !== editingProduct.id),
      );
      if (isSkuDuplicate) {
        notifyError(`SKU「${sku}」已存在，请使用唯一的 SKU`);
        return;
      }
    }

    setProductSubmitting(true);
    try {
      if (editingProduct) {
        const id = Number(editingProduct.id);
        if (!Number.isFinite(id)) {
          throw new Error('当前商品不是后端数据，无法编辑');
        }
        await api.products.update(id, {
          name: productForm.name.trim(),
          sku: sku || null,
          category: productForm.category.trim(),
          price,
          extra_info: productForm.notes.trim() || null,
        });
      } else {
        await api.products.create({
          name: productForm.name.trim(),
          sku: sku || null,
          category: productForm.category.trim(),
          price,
          extra_info: productForm.notes.trim() || null,
        });
      }

      setIsProductModalOpen(false);
      await loadProducts();
    } catch (error) {
      notifyError(getErrorMessage(error, '提交商品信息失败'));
    } finally {
      setProductSubmitting(false);
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    const id = Number(product.id);
    if (!Number.isFinite(id)) {
      notifyError('当前商品不是后端数据，无法删除');
      return;
    }

    const ok = window.confirm(`确认删除商品「${product.name}」吗？`);
    if (!ok) return;

    try {
      await api.products.remove(id);
      await loadProducts();
    } catch (error) {
      notifyError(getErrorMessage(error, '删除商品失败'));
    }
  };

  return {
    isProductModalOpen,
    editingProduct,
    productForm,
    setProductForm,
    productSubmitting,
    openCreateProductModal,
    openEditProductModal,
    closeProductModal,
    handleSubmitProduct,
    handleDeleteProduct,
  };
}