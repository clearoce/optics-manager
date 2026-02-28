export const API_BASE_URL = 'http://localhost:8080/api';
const PRODUCT_LOW_STOCK_THRESHOLD_COMPAT_VALUE = 10;

type ApiSuccess<T> = {
  success: true;
  data: T;
};

type ApiFailure = {
  success: false;
  error: string;
};

type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export interface CustomerDTO {
  id: number;
  name: string;
  phone: string;
  notes?: string | null;
  created_at?: string;
  vision_records?: CustomerVisionRecordDTO[];
}

export interface CustomerVisionRecordDTO {
  id?: number;
  customer_id?: number;
  recorded_at?: string;
  left_sphere: number;
  left_cylinder: number;
  left_axis: number;
  left_pd: number;
  left_visual_acuity: number;
  right_sphere: number;
  right_cylinder: number;
  right_axis: number;
  right_pd: number;
  right_visual_acuity: number;
  created_at?: string;
}

export interface CustomerVisionRecordPayload {
  recorded_at?: string | null;
  left_sphere: number;
  left_cylinder: number;
  left_axis: number;
  left_pd: number;
  left_visual_acuity: number;
  right_sphere: number;
  right_cylinder: number;
  right_axis: number;
  right_pd: number;
  right_visual_acuity: number;
}

export interface CreateCustomerPayload {
  name: string;
  phone: string;
  notes?: string | null;
  vision_records?: CustomerVisionRecordPayload[];
}

export interface UpdateCustomerPayload {
  name: string;
  phone: string;
  notes?: string | null;
  vision_records?: CustomerVisionRecordPayload[];
}

export interface AppendCustomerVisionRecordsPayload {
  vision_records: CustomerVisionRecordPayload[];
}

export interface OrderDTO {
  id: number;
  customer_id: number;
  customer_name_snapshot?: string;
  customer_phone_snapshot?: string;
  total_amount: number;
  order_date?: string;
  notes?: string | null;
  extra_info?: string | null;
}

export interface OrderItemDTO {
  id: number;
  order_id: number;
  product_id: number;
  product_name_snapshot: string;
  quantity: number;
  unit_price: number;
  paid_price: number;
  subtotal: number;
}

export interface OrderDetailDTO {
  order: OrderDTO;
  items: OrderItemDTO[];
}

export interface CreateOrderItemPayload {
  product_id: number;
  quantity: number;
  unit_price: number;
  paid_price: number;
}

export interface CreateOrderPayload {
  customer_id: number;
  total_amount: number;
  items: CreateOrderItemPayload[];
  notes?: string | null;
  extra_info?: string | null;
}

export interface UpdateOrderPayload {
  customer_id: number;
  total_amount: number;
  items: CreateOrderItemPayload[];
  notes?: string | null;
  extra_info?: string | null;
}

export interface ProductDTO {
  id: number;
  name: string;
  price: number;
  extra_info?: string | null;
  created_at?: string;
}

export interface CreateProductPayload {
  name: string;
  price: number;
  extra_info?: string | null;
}

export interface UpdateProductPayload {
  name: string;
  price: number;
  extra_info?: string | null;
}

type RawCustomer = {
  id?: number;
  ID?: number;
  name?: string;
  Name?: string;
  phone?: string;
  Phone?: string;
  notes?: string | null;
  Notes?: string | null;
  created_at?: string;
  CreatedAt?: string;
  vision_records?: RawCustomerVisionRecord[];
  visionRecords?: RawCustomerVisionRecord[];
  VisionRecords?: RawCustomerVisionRecord[];
};

type RawCustomerVisionRecord = {
  id?: number;
  ID?: number;
  customer_id?: number;
  customerId?: number;
  CustomerID?: number;
  recorded_at?: string;
  recordedAt?: string;
  RecordedAt?: string;
  left_sphere?: number;
  leftSphere?: number;
  LeftSphere?: number;
  left_cylinder?: number;
  leftCylinder?: number;
  LeftCylinder?: number;
  left_axis?: number;
  leftAxis?: number;
  LeftAxis?: number;
  left_pd?: number;
  leftPD?: number;
  LeftPD?: number;
  left_visual_acuity?: number;
  leftVisualAcuity?: number;
  LeftVisualAcuity?: number;
  right_sphere?: number;
  rightSphere?: number;
  RightSphere?: number;
  right_cylinder?: number;
  rightCylinder?: number;
  RightCylinder?: number;
  right_axis?: number;
  rightAxis?: number;
  RightAxis?: number;
  right_pd?: number;
  rightPD?: number;
  RightPD?: number;
  right_visual_acuity?: number;
  rightVisualAcuity?: number;
  RightVisualAcuity?: number;
  created_at?: string;
  createdAt?: string;
  CreatedAt?: string;
};

type RawOrder = {
  id?: number;
  ID?: number;
  customer_id?: number;
  customerId?: number;
  CustomerID?: number;
  customer_name_snapshot?: string;
  customerNameSnapshot?: string;
  CustomerNameSnapshot?: string;
  customer_phone_snapshot?: string;
  customerPhoneSnapshot?: string;
  CustomerPhoneSnapshot?: string;
  total_amount?: number;
  totalAmount?: number;
  TotalAmount?: number;
  order_date?: string;
  orderDate?: string;
  OrderDate?: string;
  notes?: string | null;
  Notes?: string | null;
  extra_info?: string | null;
  extraInfo?: string | null;
  ExtraInfo?: string | null;
};

type RawOrderItem = {
  id?: number;
  ID?: number;
  order_id?: number;
  orderId?: number;
  OrderID?: number;
  product_id?: number;
  productId?: number;
  ProductID?: number;
  product_name_snapshot?: string;
  productNameSnapshot?: string;
  ProductNameSnapshot?: string;
  quantity?: number;
  Quantity?: number;
  unit_price?: number;
  unitPrice?: number;
  UnitPrice?: number;
  paid_price?: number;
  paidPrice?: number;
  PaidPrice?: number;
  subtotal?: number;
  Subtotal?: number;
};

type RawOrderDetail = {
  order?: RawOrder;
  Order?: RawOrder;
  items?: RawOrderItem[];
  Items?: RawOrderItem[];
};

type RawProduct = {
  id?: number;
  ID?: number;
  name?: string;
  Name?: string;
  price?: number;
  Price?: number;
  extra_info?: string | null;
  extraInfo?: string | null;
  ExtraInfo?: string | null;
  created_at?: string;
  createdAt?: string;
  CreatedAt?: string;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const resp = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  let body: ApiResponse<T> | null = null;
  try {
    body = (await resp.json()) as ApiResponse<T>;
  } catch {
    body = null;
  }

  if (!resp.ok) {
    if (body && !body.success && body.error) {
      throw new Error(body.error);
    }
    throw new Error(`HTTP ${resp.status}`);
  }

  if (!body) {
    throw new Error('响应数据格式错误');
  }

  if (!body.success) {
    throw new Error(body.error || '请求失败');
  }

  return body.data;
}

export const api = {
  customers: {
    list: async () => {
      const rows = await request<RawCustomer[]>('/customers');
      return rows.map((row, index) => ({
        id: row.id ?? row.ID ?? index,
        name: row.name ?? row.Name ?? '',
        phone: row.phone ?? row.Phone ?? '',
        notes: row.notes ?? row.Notes ?? null,
        created_at: row.created_at ?? row.CreatedAt,
        vision_records: (row.vision_records ?? row.visionRecords ?? row.VisionRecords ?? []).map((record) => ({
          id: record.id ?? record.ID,
          customer_id: record.customer_id ?? record.customerId ?? record.CustomerID,
          recorded_at: record.recorded_at ?? record.recordedAt ?? record.RecordedAt,
          left_sphere: record.left_sphere ?? record.leftSphere ?? record.LeftSphere ?? 0,
          left_cylinder: record.left_cylinder ?? record.leftCylinder ?? record.LeftCylinder ?? 0,
          left_axis: record.left_axis ?? record.leftAxis ?? record.LeftAxis ?? 0,
          left_pd: record.left_pd ?? record.leftPD ?? record.LeftPD ?? 0,
          left_visual_acuity:
            record.left_visual_acuity ?? record.leftVisualAcuity ?? record.LeftVisualAcuity ?? 0,
          right_sphere: record.right_sphere ?? record.rightSphere ?? record.RightSphere ?? 0,
          right_cylinder: record.right_cylinder ?? record.rightCylinder ?? record.RightCylinder ?? 0,
          right_axis: record.right_axis ?? record.rightAxis ?? record.RightAxis ?? 0,
          right_pd: record.right_pd ?? record.rightPD ?? record.RightPD ?? 0,
          right_visual_acuity:
            record.right_visual_acuity ?? record.rightVisualAcuity ?? record.RightVisualAcuity ?? 0,
          created_at: record.created_at ?? record.createdAt ?? record.CreatedAt,
        })),
      } satisfies CustomerDTO));
    },

    create: async (payload: CreateCustomerPayload) => {
      return request<{ id: number; message: string }>('/customers', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    update: async (id: number, payload: UpdateCustomerPayload) => {
      return request<{ message: string }>(`/customers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    },

    appendVisionRecords: async (id: number, payload: AppendCustomerVisionRecordsPayload) => {
      return request<{ message: string }>(`/customers/${id}/vision-records`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    remove: async (id: number) => {
      return request<{ message: string }>(`/customers/${id}`, {
        method: 'DELETE',
      });
    },
  },

  orders: {
    list: async (customerId?: number) => {
      const query = typeof customerId === 'number' ? `?customer_id=${customerId}` : '';
      const rows = await request<RawOrder[]>(`/orders${query}`);
      return rows.map((row, index) => ({
        id: row.id ?? row.ID ?? index,
        customer_id: row.customer_id ?? row.customerId ?? row.CustomerID ?? 0,
        customer_name_snapshot:
          row.customer_name_snapshot ?? row.customerNameSnapshot ?? row.CustomerNameSnapshot ?? '',
        customer_phone_snapshot:
          row.customer_phone_snapshot ?? row.customerPhoneSnapshot ?? row.CustomerPhoneSnapshot ?? '',
        total_amount: row.total_amount ?? row.totalAmount ?? row.TotalAmount ?? 0,
        order_date: row.order_date ?? row.orderDate ?? row.OrderDate,
        notes: row.notes ?? row.Notes ?? null,
        extra_info: row.extra_info ?? row.extraInfo ?? row.ExtraInfo ?? null,
      } satisfies OrderDTO));
    },

    detail: async (id: number) => {
      const raw = await request<RawOrderDetail>(`/orders/${id}`);
      const order = raw.order ?? raw.Order;
      const items = raw.items ?? raw.Items ?? [];

      if (!order) {
        throw new Error('订单详情数据不完整');
      }

      return {
        order: {
          id: order.id ?? order.ID ?? id,
          customer_id: order.customer_id ?? order.customerId ?? order.CustomerID ?? 0,
          customer_name_snapshot:
            order.customer_name_snapshot ?? order.customerNameSnapshot ?? order.CustomerNameSnapshot ?? '',
          customer_phone_snapshot:
            order.customer_phone_snapshot ?? order.customerPhoneSnapshot ?? order.CustomerPhoneSnapshot ?? '',
          total_amount: order.total_amount ?? order.totalAmount ?? order.TotalAmount ?? 0,
          order_date: order.order_date ?? order.orderDate ?? order.OrderDate,
          notes: order.notes ?? order.Notes ?? null,
          extra_info: order.extra_info ?? order.extraInfo ?? order.ExtraInfo ?? null,
        },
        items: items.map((item, index) => {
          const productId = item.product_id ?? item.productId ?? item.ProductID ?? 0;
          return {
            id: item.id ?? item.ID ?? index,
            order_id: item.order_id ?? item.orderId ?? item.OrderID ?? id,
            product_id: productId,
            product_name_snapshot:
              item.product_name_snapshot ??
              item.productNameSnapshot ??
              item.ProductNameSnapshot ??
              `商品 #${productId}`,
            quantity: item.quantity ?? item.Quantity ?? 0,
            unit_price: item.unit_price ?? item.unitPrice ?? item.UnitPrice ?? 0,
            paid_price:
              item.paid_price ??
              item.paidPrice ??
              item.PaidPrice ??
              item.unit_price ??
              item.unitPrice ??
              item.UnitPrice ??
              0,
            subtotal: item.subtotal ?? item.Subtotal ?? 0,
          };
        }),
      } satisfies OrderDetailDTO;
    },

    create: async (payload: CreateOrderPayload) => {
      return request<{ order_id: number; total_amount: number; message: string }>('/orders', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    update: async (id: number, payload: UpdateOrderPayload) => {
      return request<{ message: string; total_amount: number }>(`/orders/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    },

    remove: async (id: number) => {
      return request<{ message: string }>(`/orders/${id}`, {
        method: 'DELETE',
      });
    },
  },

  products: {
    list: async () => {
      const rows = await request<RawProduct[]>('/products');
      return rows.map((row, index) => ({
        id: row.id ?? row.ID ?? index,
        name: row.name ?? row.Name ?? '',
        price: row.price ?? row.Price ?? 0,
        extra_info: row.extra_info ?? row.extraInfo ?? row.ExtraInfo ?? null,
        created_at: row.created_at ?? row.createdAt ?? row.CreatedAt,
      } satisfies ProductDTO));
    },

    create: async (payload: CreateProductPayload) => {
      return request<{ id: number; message: string }>('/products', {
        method: 'POST',
        body: JSON.stringify({
          ...payload,
          low_stock_threshold: PRODUCT_LOW_STOCK_THRESHOLD_COMPAT_VALUE,
        }),
      });
    },

    update: async (id: number, payload: UpdateProductPayload) => {
      return request<{ message: string }>(`/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...payload,
          low_stock_threshold: PRODUCT_LOW_STOCK_THRESHOLD_COMPAT_VALUE,
        }),
      });
    },

    remove: async (id: number) => {
      return request<{ message: string }>(`/products/${id}`, {
        method: 'DELETE',
      });
    },
  },
};
