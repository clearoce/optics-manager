import type { Order } from '../types';

export function createOrderSearchMatcher(customerPhoneById: Map<string, string>) {
  return (order: Order, normalizedSearch: string) => (
    order.id.toLowerCase().includes(normalizedSearch) ||
    order.customerName.toLowerCase().includes(normalizedSearch) ||
    (order.customerId ? customerPhoneById.get(order.customerId)?.toLowerCase().includes(normalizedSearch) : false) ||
    order.notes.toLowerCase().includes(normalizedSearch)
  );
}

export function buildHistoryJumpOrderSearchTerm(orderId: number) {
  return String(orderId);
}
