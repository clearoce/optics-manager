import { Status, type Customer, type Order, type Product } from '../types';
import type { CustomerDTO, OrderDTO, ProductDTO } from '../services/api';

export function mapCustomerFromApi(row: CustomerDTO): Customer {
  return {
    id: String(row.id),
    name: row.name,
    phone: row.phone,
    totalSpent: 0,
    lastOrderDate: row.created_at ? row.created_at.slice(0, 10) : '-',
    notes: row.notes || '', // Added notes field
    customField1: row.notes || '',
    customField2: row.created_at ? row.created_at.slice(0, 10) : '-',
    customField3: `ID: ${row.id}`,
  };
}

export function mapProductFromApi(row: ProductDTO): Product {
  return {
    id: String(row.id),
    name: row.name,
    sku: row.sku || '',
    category: row.category,
    price: row.price,
    notes: row.extra_info || '',
    lastUpdated: row.created_at ? row.created_at.slice(0, 10) : '-',
  };
}

export function mapOrderFromApi(row: OrderDTO, customerName?: string): Order {
  return {
    id: String(row.id),
    customerId: String(row.customer_id),
    customerName: customerName || `客户 ID: ${row.customer_id}`,
    productName: '订单商品', // Placeholder
    notes: row.notes || '',
    date: row.order_date ? row.order_date.slice(0, 10) : '-',
    total: row.total_amount,
    status: Status.Completed,
    items: 0,
  };
}
