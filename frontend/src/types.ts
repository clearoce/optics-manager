export const Status = {
  Pending: '待处理',
  Completed: '已完成',
  Cancelled: '已取消',
  Shipped: '已发货',
  LowStock: '库存不足',
  InStock: '库存充足',
  OutOfStock: '缺货',
} as const;

export type Status = (typeof Status)[keyof typeof Status];

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  stock: number;
  lowStockThreshold: number;
  status: Status;
  notes: string;
  lastUpdated: string;
}

export interface Order {
  id: string;
  customerId?: string;
  customerName: string;
  productName: string;
  notes: string;
  date: string;
  total: number;
  status: Status;
  items: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  totalSpent: number;
  lastOrderDate: string;
  notes: string;
  customField1?: string;
  customField2?: string;
  customField3?: string;
}


export type View = 'dashboard' | 'inventory' | 'orders' | 'customers';
