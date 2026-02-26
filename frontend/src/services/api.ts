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
}

export interface CreateCustomerPayload {
  name: string;
  phone: string;
  notes?: string | null;
}

export interface UpdateCustomerPayload {
  name: string;
  phone: string;
  notes?: string | null;
}

export interface OrderDTO {
  id: number;
  customer_id: number;
  total_amount: number;
  order_date?: string;
  notes?: string | null;
  extra_info?: string | null;
}

export interface OrderItemDTO {
  id: number;
  order_id: number;
  product_id: number;
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
  paid_price: number;
}

export interface CreateOrderPayload {
  customer_id: number;
  items: CreateOrderItemPayload[];
  notes?: string | null;
  extra_info?: string | null;
}

export interface UpdateOrderPayload {
  customer_id: number;
  items: CreateOrderItemPayload[];
  notes?: string | null;
  extra_info?: string | null;
}

export interface ProductDTO {
  id: number;
  name: string;
  category: string;
  sku?: string | null;
  price: number;
  extra_info?: string | null;
  created_at?: string;
}

export interface CreateProductPayload {
  name: string;
  category: string;
  sku?: string | null;
  price: number;
  extra_info?: string | null;
}

export interface UpdateProductPayload {
  name: string;
  sku?: string | null;
  category: string;
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
};

type RawOrder = {
  id?: number;
  ID?: number;
  customer_id?: number;
  customerId?: number;
  CustomerID?: number;
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
  category?: string;
  Category?: string;
  sku?: string | null;
  SKU?: string | null;
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

  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status}`);
  }

  const body = (await resp.json()) as ApiResponse<T>;
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
  },

  orders: {
    list: async (customerId?: number) => {
      const query = typeof customerId === 'number' ? `?customer_id=${customerId}` : '';
      const rows = await request<RawOrder[]>(`/orders${query}`);
      return rows.map((row, index) => ({
        id: row.id ?? row.ID ?? index,
        customer_id: row.customer_id ?? row.customerId ?? row.CustomerID ?? 0,
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
          total_amount: order.total_amount ?? order.totalAmount ?? order.TotalAmount ?? 0,
          order_date: order.order_date ?? order.orderDate ?? order.OrderDate,
          notes: order.notes ?? order.Notes ?? null,
          extra_info: order.extra_info ?? order.extraInfo ?? order.ExtraInfo ?? null,
        },
        items: items.map((item, index) => ({
          id: item.id ?? item.ID ?? index,
          order_id: item.order_id ?? item.orderId ?? item.OrderID ?? id,
          product_id: item.product_id ?? item.productId ?? item.ProductID ?? 0,
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
        })),
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
    list: async (category?: string) => {
      const query = category ? `?category=${encodeURIComponent(category)}` : '';
      const rows = await request<RawProduct[]>(`/products${query}`);
      return rows.map((row, index) => ({
        id: row.id ?? row.ID ?? index,
        name: row.name ?? row.Name ?? '',
        category: row.category ?? row.Category ?? '',
        sku: row.sku ?? row.SKU ?? null,
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
