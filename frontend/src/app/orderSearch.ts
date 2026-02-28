import type { Order } from '../types';
import { matchSearchTokenInValue, type SearchToken } from '../hooks/useSearchFilter';

export function createOrderSearchMatcher() {
  return (order: Order, token: SearchToken) => (
    matchSearchTokenInValue(order.customerName, token) ||
    matchSearchTokenInValue(order.customerPhone, token)
  );
}

export function buildHistoryJumpOrderSearchTerm(customerName: string, customerPhone?: string) {
  const normalizedPhone = customerPhone?.trim();
  if (normalizedPhone) return normalizedPhone;
  return customerName.trim();
}
