import { Status, type Customer, type Order, type Product } from '../types';
import type { CustomerDTO, OrderDTO, ProductDTO } from '../services/api';

export function mapCustomerFromApi(row: CustomerDTO): Customer {
  return {
    id: String(row.id),
    name: row.name,
    phone: row.phone,
    createdAt: row.created_at ? row.created_at.slice(0, 10) : '-',
    totalSpent: 0,
    lastOrderDate: row.created_at ? row.created_at.slice(0, 10) : '-',
    notes: row.notes || '',
    visionRecords: (row.vision_records ?? []).map((record, index) => ({
      id: String(record.id ?? index),
      recordedAt: record.recorded_at ?? '',
      leftSphere: record.left_sphere,
      leftCylinder: record.left_cylinder,
      leftAxis: record.left_axis,
      leftPD: record.left_pd,
      leftVisualAcuity: record.left_visual_acuity,
      rightSphere: record.right_sphere,
      rightCylinder: record.right_cylinder,
      rightAxis: record.right_axis,
      rightPD: record.right_pd,
      rightVisualAcuity: record.right_visual_acuity,
    })),
  };
}

export function mapProductFromApi(row: ProductDTO): Product {
  return {
    id: String(row.id),
    name: row.name,
    price: row.price,
    notes: row.extra_info || '',
    lastUpdated: row.created_at ? row.created_at.slice(0, 10) : '-',
  };
}

export function mapOrderFromApi(row: OrderDTO): Order {
  return {
    id: String(row.id),
    customerId: String(row.customer_id),
    customerName: row.customer_name_snapshot?.trim() || `客户 ID: ${row.customer_id}`,
    customerPhone: row.customer_phone_snapshot?.trim() || '-',
    productName: '订单商品', // Placeholder
    notes: row.notes || '',
    date: row.order_date ? row.order_date.slice(0, 10) : '-',
    total: row.total_amount,
    status: Status.Completed,
    items: 0,
  };
}
