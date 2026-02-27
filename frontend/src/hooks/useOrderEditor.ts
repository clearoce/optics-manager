import { useState } from 'react';
import type { FormEvent } from 'react';
import type { OrderItemDraft } from '../app/formTypes';
import type { CreateOrderPayload, UpdateOrderPayload } from '../services/api';
import { api } from '../services/api';
import type { Customer, Product } from '../types';
import { getErrorMessage, notifyError } from '../app/notify';

const getOrderProductLabel = (product: Product) =>
  `${product.name}【${product.category}】${product.sku ? `（${product.sku}）` : ''}`;

const getSnapshotProductLabel = (item: {
  product_name_snapshot: string;
  product_category_snapshot: string;
  product_sku_snapshot?: string | null;
  product_id: number;
}) => {
  const name = item.product_name_snapshot?.trim() || `商品 #${item.product_id}`;
  const category = item.product_category_snapshot?.trim();
  const sku = item.product_sku_snapshot?.trim();

  if (category) {
    return `${name}【${category}】${sku ? `（${sku}）` : ''}`;
  }

  return sku ? `${name}（${sku}）` : name;
};

const createEmptyOrderItemDraft = (): OrderItemDraft => ({
  productId: '',
  quantity: '1',
  productQuery: '',
  unitPrice: '',
  paidPrice: '',
});

const formatCurrencyText = (value: number) => value.toFixed(2);

const sanitizeMoneyTextInput = (raw: string) => {
  const cleaned = raw.replace(/[^\d.]/g, '');
  const [integerPart = '', ...decimalParts] = cleaned.split('.');
  const decimalPart = decimalParts.join('').slice(0, 2);
  return decimalParts.length > 0 ? `${integerPart}.${decimalPart}` : integerPart;
};

const normalizeMoneyTextToFixed2 = (raw: string) => {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return '';
  return formatCurrencyText(parsed);
};

type UseOrderEditorParams = {
  customers: Customer[];
  products: Product[];
  loadCustomers: () => Promise<void>;
  loadOrders: (existingCustomers?: Customer[]) => Promise<void>;
  loadProducts: () => Promise<void>;
};

export function useOrderEditor({
  customers,
  products,
  loadCustomers,
  loadOrders,
  loadProducts,
}: UseOrderEditorParams) {
  const [isCreateOrderOpen, setIsCreateOrderOpen] = useState(false);
  const [orderCustomerId, setOrderCustomerId] = useState('');
  const [orderCustomerName, setOrderCustomerName] = useState('');
  const [orderCustomerPhone, setOrderCustomerPhone] = useState('');
  const [orderCustomerNotes, setOrderCustomerNotes] = useState('');
  const [isCustomerPickerOpen, setIsCustomerPickerOpen] = useState(false);
  const [activeProductPickerIndex, setActiveProductPickerIndex] = useState<number | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItemDraft[]>([createEmptyOrderItemDraft()]);
  const [orderReceivedAmount, setOrderReceivedAmount] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);

  const openCreateOrder = () => {
    setEditingOrderId(null);
    setOrderCustomerId('');
    setOrderCustomerName('');
    setOrderCustomerPhone('');
    setOrderCustomerNotes('');
    setOrderItems([createEmptyOrderItemDraft()]);
    setOrderReceivedAmount('');
    setIsCustomerPickerOpen(false);
    setActiveProductPickerIndex(null);
    setOrderNotes('');
    setIsCreateOrderOpen(true);
  };

  const closeOrderModal = () => {
    setIsCreateOrderOpen(false);
    setEditingOrderId(null);
  };

  const openEditOrder = async (orderId: string) => {
    const id = Number(orderId);
    if (!Number.isFinite(id)) {
      notifyError('当前订单不是后端数据，无法编辑');
      return;
    }

    try {
      const detail = await api.orders.detail(id);
      const matchedCustomer = customers.find((customer) => Number(customer.id) === detail.order.customer_id);

      setEditingOrderId(id);
      setOrderCustomerId(String(detail.order.customer_id));
      setOrderCustomerName(matchedCustomer?.name ?? '');
      setOrderCustomerPhone(matchedCustomer?.phone ?? '');
      setOrderCustomerNotes(matchedCustomer?.notes ?? '');
      setOrderItems(
        detail.items.length > 0
          ? detail.items.map((item) => {
              const product = products.find((p) => Number(p.id) === item.product_id);
              return {
                productId: String(item.product_id),
                quantity: String(item.quantity),
                productQuery: product ? getOrderProductLabel(product) : getSnapshotProductLabel(item),
                unitPrice: formatCurrencyText(item.unit_price),
                paidPrice: formatCurrencyText(item.paid_price),
              };
            })
          : [createEmptyOrderItemDraft()],
      );
      setOrderNotes(detail.order.notes ?? '');
      setOrderReceivedAmount(formatCurrencyText(detail.order.total_amount));
      setIsCustomerPickerOpen(false);
      setActiveProductPickerIndex(null);
      setIsCreateOrderOpen(true);
    } catch (error) {
      notifyError(getErrorMessage(error, '加载订单失败，无法编辑'));
    }
  };

  const handleSubmitOrder = async (event: FormEvent) => {
    event.preventDefault();

    const normalizedName = orderCustomerName.trim();
    const normalizedPhone = orderCustomerPhone.trim();
    const normalizedCustomerNotes = orderCustomerNotes.trim();

    if (!normalizedName || !normalizedPhone) {
      notifyError('请填写客户姓名和电话');
      return;
    }

    const parsedItems = orderItems
      .filter((item) => item.productId)
      .map((item) => ({
        product_id: Number(item.productId),
        quantity: Number(item.quantity),
        paid_price: Number(item.paidPrice),
      }));
    if (parsedItems.length === 0) {
      notifyError('请至少添加一个商品');
      return;
    }
    for (const item of parsedItems) {
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        notifyError('商品数量必须为正整数');
        return;
      }

      if (!Number.isFinite(item.paid_price) || item.paid_price <= 0) {
        notifyError('实付单价必须是大于 0 的数字');
        return;
      }
    }

    const estimatedAmount = parsedItems.reduce(
      (sum, item) => sum + item.paid_price * item.quantity,
      0,
    );
    const normalizedReceivedAmountText = normalizeMoneyTextToFixed2(
      sanitizeMoneyTextInput(orderReceivedAmount),
    );
    const parsedReceivedAmount = normalizedReceivedAmountText
      ? Number(normalizedReceivedAmountText)
      : estimatedAmount;
    if (!Number.isFinite(parsedReceivedAmount) || parsedReceivedAmount <= 0) {
      notifyError('实收金额必须是大于 0 的数字');
      return;
    }
    setOrderReceivedAmount(
      normalizedReceivedAmountText || formatCurrencyText(parsedReceivedAmount),
    );

    setOrderSubmitting(true);
    try {
      const matchedCustomerByPhone = customers.find(
        (customer) => customer.phone.trim() === normalizedPhone,
      );

      let customerIdForOrder: number;
      if (matchedCustomerByPhone) {
        const matchedCustomerId = Number(matchedCustomerByPhone.id);
        if (!Number.isFinite(matchedCustomerId)) {
          throw new Error('匹配到的客户ID无效，无法提交订单');
        }

        const existingNotes = (matchedCustomerByPhone.notes ?? '').trim();
        const shouldUpdateCustomer =
          matchedCustomerByPhone.name !== normalizedName || existingNotes !== normalizedCustomerNotes;

        if (shouldUpdateCustomer) {
          await api.customers.update(matchedCustomerId, {
            name: normalizedName,
            phone: normalizedPhone,
            notes: normalizedCustomerNotes || null,
          });
        }

        customerIdForOrder = matchedCustomerId;
        setOrderCustomerId(String(matchedCustomerId));
      } else {
        const created = await api.customers.create({
          name: normalizedName,
          phone: normalizedPhone,
          notes: normalizedCustomerNotes || null,
        });
        customerIdForOrder = created.id;
        setOrderCustomerId(String(created.id));
      }

      const payload: CreateOrderPayload | UpdateOrderPayload = {
        customer_id: customerIdForOrder,
        total_amount: parsedReceivedAmount,
        items: parsedItems,
        notes: orderNotes.trim() || null,
      };

      if (editingOrderId !== null) {
        await api.orders.update(editingOrderId, payload);
      } else {
        await api.orders.create(payload);
      }

      closeOrderModal();
      await Promise.all([loadCustomers(), loadOrders(), loadProducts()]);
    } catch (error) {
      notifyError(getErrorMessage(error, '提交订单失败'));
    } finally {
      setOrderSubmitting(false);
    }
  };

  return {
    isCreateOrderOpen,
    orderCustomerId,
    setOrderCustomerId,
    orderCustomerName,
    setOrderCustomerName,
    orderCustomerPhone,
    setOrderCustomerPhone,
    orderCustomerNotes,
    setOrderCustomerNotes,
    isCustomerPickerOpen,
    setIsCustomerPickerOpen,
    activeProductPickerIndex,
    setActiveProductPickerIndex,
    orderItems,
    setOrderItems,
    orderReceivedAmount,
    setOrderReceivedAmount,
    orderNotes,
    setOrderNotes,
    orderSubmitting,
    editingOrderId,
    openCreateOrder,
    closeOrderModal,
    openEditOrder,
    handleSubmitOrder,
    createEmptyOrderItemDraft,
    formatCurrencyText,
    sanitizeMoneyTextInput,
    normalizeMoneyTextToFixed2,
  };
}