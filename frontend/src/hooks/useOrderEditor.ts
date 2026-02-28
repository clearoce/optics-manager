import { useState } from 'react';
import type { FormEvent } from 'react';
import type { CustomerVisionRecordFormState, OrderItemDraft } from '../app/formTypes';
import type {
  CreateOrderPayload,
  CustomerVisionRecordPayload,
  UpdateOrderPayload,
} from '../services/api';
import { api } from '../services/api';
import type { Customer, Product } from '../types';
import { getErrorMessage, notifyError } from '../app/notify';

const getOrderProductLabel = (product: Product) => product.name;

const getSnapshotProductLabel = (item: {
  product_name_snapshot: string;
  product_id: number;
}) => {
  return item.product_name_snapshot?.trim() || `商品 #${item.product_id}`;
};

const createEmptyOrderItemDraft = (): OrderItemDraft => ({
  productId: '',
  quantity: '1',
  productQuery: '',
  unitPrice: '',
  paidPrice: '',
});

const createEmptyVisionRecordForm = (): CustomerVisionRecordFormState => ({
  recordedAt: '',
  leftSphere: '',
  leftCylinder: '',
  leftAxis: '',
  leftPD: '',
  leftVisualAcuity: '',
  rightSphere: '',
  rightCylinder: '',
  rightAxis: '',
  rightPD: '',
  rightVisualAcuity: '',
});

const parseFloatOrZero = (value: string) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const parseIntOrZero = (value: string) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
};

const parseNumberLike = (value: unknown) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value.trim());
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
};

const parseIntegerLike = (value: unknown) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? Math.trunc(value) : 0;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseInt(value.trim(), 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
};

const normalizeDateTimeForInput = (value: string | null | undefined) => {
  if (!value) return '';
  return value.replace(' ', 'T').slice(0, 16);
};

const parseVisionRecordsFromOrderExtraInfo = (
  extraInfo: string | null | undefined,
): CustomerVisionRecordPayload[] => {
  if (!extraInfo) return [];

  try {
    const parsed = JSON.parse(extraInfo) as unknown;

    const records = Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === 'object' && Array.isArray((parsed as { vision_records?: unknown[] }).vision_records)
        ? (parsed as { vision_records: unknown[] }).vision_records
        : [];

    const mappedRecords = records.map((record): CustomerVisionRecordPayload | null => {
        if (!record || typeof record !== 'object') return null;
        const row = record as Record<string, unknown>;

        return {
          recorded_at:
            typeof row.recorded_at === 'string'
              ? row.recorded_at
              : typeof row.recordedAt === 'string'
                ? row.recordedAt
                : null,
          left_sphere: parseNumberLike(row.left_sphere ?? row.leftSphere),
          left_cylinder: parseNumberLike(row.left_cylinder ?? row.leftCylinder),
          left_axis: parseIntegerLike(row.left_axis ?? row.leftAxis),
          left_pd: parseNumberLike(row.left_pd ?? row.leftPD),
          left_visual_acuity: parseNumberLike(row.left_visual_acuity ?? row.leftVisualAcuity),
          right_sphere: parseNumberLike(row.right_sphere ?? row.rightSphere),
          right_cylinder: parseNumberLike(row.right_cylinder ?? row.rightCylinder),
          right_axis: parseIntegerLike(row.right_axis ?? row.rightAxis),
          right_pd: parseNumberLike(row.right_pd ?? row.rightPD),
          right_visual_acuity: parseNumberLike(row.right_visual_acuity ?? row.rightVisualAcuity),
        };
      });

    return mappedRecords.filter((record): record is CustomerVisionRecordPayload => record !== null);
  } catch {
    return [];
  }
};

const mapVisionRecordsFormToPayload = (
  records: CustomerVisionRecordFormState[],
): CustomerVisionRecordPayload[] => {
  return records
    .map((record) => {
      const hasAnyInput = [
        record.recordedAt,
        record.leftSphere,
        record.leftCylinder,
        record.leftAxis,
        record.leftPD,
        record.leftVisualAcuity,
        record.rightSphere,
        record.rightCylinder,
        record.rightAxis,
        record.rightPD,
        record.rightVisualAcuity,
      ].some((value) => value.trim() !== '');

      return {
        hasAnyInput,
        payload: {
          recorded_at: record.recordedAt.trim() || null,
          left_sphere: parseFloatOrZero(record.leftSphere),
          left_cylinder: parseFloatOrZero(record.leftCylinder),
          left_axis: parseIntOrZero(record.leftAxis),
          left_pd: parseFloatOrZero(record.leftPD),
          left_visual_acuity: parseFloatOrZero(record.leftVisualAcuity),
          right_sphere: parseFloatOrZero(record.rightSphere),
          right_cylinder: parseFloatOrZero(record.rightCylinder),
          right_axis: parseIntOrZero(record.rightAxis),
          right_pd: parseFloatOrZero(record.rightPD),
          right_visual_acuity: parseFloatOrZero(record.rightVisualAcuity),
        } satisfies CustomerVisionRecordPayload,
      };
    })
    .filter((item) => item.hasAnyInput)
    .map((item) => item.payload);
};

const mapCustomerVisionRecordsToPayload = (
  records: Customer['visionRecords'],
): CustomerVisionRecordPayload[] => {
  return records.map((record) => ({
    recorded_at: record.recordedAt || null,
    left_sphere: record.leftSphere,
    left_cylinder: record.leftCylinder,
    left_axis: record.leftAxis,
    left_pd: record.leftPD,
    left_visual_acuity: record.leftVisualAcuity,
    right_sphere: record.rightSphere,
    right_cylinder: record.rightCylinder,
    right_axis: record.rightAxis,
    right_pd: record.rightPD,
    right_visual_acuity: record.rightVisualAcuity,
  }));
};

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
  const [orderVisionRecords, setOrderVisionRecords] = useState<CustomerVisionRecordFormState[]>([createEmptyVisionRecordForm()]);
  const [orderVisionRecordsTouched, setOrderVisionRecordsTouched] = useState(false);
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
    setOrderVisionRecords([createEmptyVisionRecordForm()]);
    setOrderVisionRecordsTouched(false);
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
      const orderVisionSnapshot = parseVisionRecordsFromOrderExtraInfo(detail.order.extra_info);

      setEditingOrderId(id);
      setOrderCustomerId(String(detail.order.customer_id));
      setOrderCustomerName(matchedCustomer?.name ?? '');
      setOrderCustomerPhone(matchedCustomer?.phone ?? '');
      setOrderCustomerNotes(matchedCustomer?.notes ?? '');
      setOrderVisionRecords(
        orderVisionSnapshot.length > 0
          ? orderVisionSnapshot.map((record) => ({
              recordedAt: normalizeDateTimeForInput(record.recorded_at),
              leftSphere: String(record.left_sphere),
              leftCylinder: String(record.left_cylinder),
              leftAxis: String(record.left_axis),
              leftPD: String(record.left_pd),
              leftVisualAcuity: String(record.left_visual_acuity),
              rightSphere: String(record.right_sphere),
              rightCylinder: String(record.right_cylinder),
              rightAxis: String(record.right_axis),
              rightPD: String(record.right_pd),
              rightVisualAcuity: String(record.right_visual_acuity),
            }))
          : [createEmptyVisionRecordForm()],
      );
      setOrderVisionRecordsTouched(false);
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
    const visionPayloadFromForm = mapVisionRecordsFormToPayload(orderVisionRecords);

    if (!normalizedName || !normalizedPhone) {
      notifyError('请填写客户姓名和电话');
      return;
    }

    const parsedItemDrafts = orderItems
      .map((item) => ({
        product_query: item.productQuery.trim(),
        product_id_text: item.productId.trim(),
        quantity: Number(item.quantity),
        unit_price: Number(item.unitPrice),
        paid_price: Number(item.paidPrice),
      }))
      .filter((item) => item.product_query);

    if (parsedItemDrafts.length === 0) {
      notifyError('请至少添加一个商品');
      return;
    }

    for (const item of parsedItemDrafts) {
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        notifyError('商品数量必须为正整数');
        return;
      }

      if (!Number.isFinite(item.unit_price) || item.unit_price <= 0) {
        notifyError('商品标价必须是大于 0 的数字');
        return;
      }

      if (!Number.isFinite(item.paid_price) || item.paid_price <= 0) {
        notifyError('实付单价必须是大于 0 的数字');
        return;
      }
    }

    const estimatedAmount = parsedItemDrafts.reduce(
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

    const matchedCustomerByPhone = customers.find(
      (customer) => customer.phone.trim() === normalizedPhone,
    );
    const existingMatchedCustomerNotes = (matchedCustomerByPhone?.notes ?? '').trim();
    const shouldUpdateMatchedCustomer =
      !!matchedCustomerByPhone &&
      (matchedCustomerByPhone.name !== normalizedName ||
        existingMatchedCustomerNotes !== normalizedCustomerNotes);
    const shouldAppendMatchedCustomerVisionRecords =
      !!matchedCustomerByPhone &&
      orderVisionRecordsTouched &&
      visionPayloadFromForm.length > 0;

    const updateTargets: string[] = [];
    if (editingOrderId !== null) {
      updateTargets.push('订单信息');
    }
    if (shouldUpdateMatchedCustomer || shouldAppendMatchedCustomerVisionRecords) {
      updateTargets.push('关联客户信息');
    }

    if (updateTargets.length > 0) {
      const confirmed = window.confirm(
        `本次提交将更新${updateTargets.join('与')}，确认继续吗？`,
      );
      if (!confirmed) return;
    }

    setOrderSubmitting(true);
    try {
      let customerIdForOrder: number;
      if (matchedCustomerByPhone) {
        const matchedCustomerId = Number(matchedCustomerByPhone.id);
        if (!Number.isFinite(matchedCustomerId)) {
          throw new Error('匹配到的客户ID无效，无法提交订单');
        }

        if (shouldUpdateMatchedCustomer) {
          const visionPayload = mapCustomerVisionRecordsToPayload(matchedCustomerByPhone.visionRecords);

          await api.customers.update(matchedCustomerId, {
            name: normalizedName,
            phone: normalizedPhone,
            notes: normalizedCustomerNotes || null,
            vision_records: visionPayload,
          });
        }

        if (shouldAppendMatchedCustomerVisionRecords) {
          await api.customers.appendVisionRecords(matchedCustomerId, {
            vision_records: visionPayloadFromForm,
          });
        }

        customerIdForOrder = matchedCustomerId;
        setOrderCustomerId(String(matchedCustomerId));
      } else {
        const created = await api.customers.create({
          name: normalizedName,
          phone: normalizedPhone,
          notes: normalizedCustomerNotes || null,
          vision_records: visionPayloadFromForm,
        });
        customerIdForOrder = created.id;
        setOrderCustomerId(String(created.id));
      }

      const createdProductIdByName = new Map<string, number>();
      const parsedItems: CreateOrderPayload['items'] = [];

      for (const item of parsedItemDrafts) {
        const normalizedProductQuery = item.product_query.toLowerCase();
        const matchedByExistingProductId = products.find(
          (product) => product.id === item.product_id_text,
        );

        let resolvedProductId: number | null = null;

        if (matchedByExistingProductId) {
          const matchedId = Number(matchedByExistingProductId.id);
          if (Number.isFinite(matchedId) && matchedId > 0) {
            resolvedProductId = matchedId;
          }
        }

        if (resolvedProductId === null) {
          const matchedByQuery = products.find((product) =>
            product.id.toLowerCase() === normalizedProductQuery ||
            product.name.trim().toLowerCase() === normalizedProductQuery,
          );

          if (matchedByQuery) {
            const matchedId = Number(matchedByQuery.id);
            if (Number.isFinite(matchedId) && matchedId > 0) {
              resolvedProductId = matchedId;
            }
          }
        }

        if (resolvedProductId === null) {
          const cachedCreatedId = createdProductIdByName.get(normalizedProductQuery);
          if (cachedCreatedId) {
            resolvedProductId = cachedCreatedId;
          }
        }

        if (resolvedProductId === null) {
          const createdProduct = await api.products.create({
            name: item.product_query,
            price: item.unit_price,
            extra_info: null,
          });

          resolvedProductId = createdProduct.id;
          createdProductIdByName.set(normalizedProductQuery, createdProduct.id);
        }

        if (!Number.isFinite(resolvedProductId) || resolvedProductId <= 0) {
          throw new Error(`商品“${item.product_query}”创建失败，无法提交订单`);
        }

        parsedItems.push({
          product_id: resolvedProductId,
          quantity: item.quantity,
          unit_price: item.unit_price,
          paid_price: item.paid_price,
        });
      }

      const payload: CreateOrderPayload | UpdateOrderPayload = {
        customer_id: customerIdForOrder,
        total_amount: parsedReceivedAmount,
        items: parsedItems,
        notes: orderNotes.trim() || null,
        extra_info:
          visionPayloadFromForm.length > 0
            ? JSON.stringify({ vision_records: visionPayloadFromForm })
            : null,
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
    orderVisionRecords,
    setOrderVisionRecords,
    setOrderVisionRecordsTouched,
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
    createEmptyVisionRecordForm,
    formatCurrencyText,
    sanitizeMoneyTextInput,
    normalizeMoneyTextToFixed2,
  };
}