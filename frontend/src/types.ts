export const Status = {
  Pending: '待处理',
  Completed: '已完成',
  Cancelled: '已取消',
  Shipped: '已发货',
} as const;

export type Status = (typeof Status)[keyof typeof Status];

export interface Product {
  id: string;
  name: string;
  price: number;
  notes: string;
  lastUpdated: string;
}

export interface Order {
  id: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
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
  createdAt: string;
  totalSpent: number;
  lastOrderDate: string;
  notes: string;
  visionRecords: CustomerVisionRecord[];
}

export interface CustomerVisionRecord {
  id?: string;
  recordedAt: string;
  leftSphere: number;
  leftCylinder: number;
  leftAxis: number;
  leftPD: number;
  leftVisualAcuity: number;
  rightSphere: number;
  rightCylinder: number;
  rightAxis: number;
  rightPD: number;
  rightVisualAcuity: number;
}


export type View = 'dashboard' | 'inventory' | 'orders' | 'customers';
