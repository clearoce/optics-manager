import { describe, expect, it } from 'vitest';
import { buildHistoryJumpOrderSearchTerm, createOrderSearchMatcher } from '../src/app/orderSearch';
import type { Order } from '../src/types';

const createOrder = (partial: Partial<Order>): Order => ({
  id: '1001',
  customerId: '1',
  customerName: '张三',
  productName: '镜片',
  notes: '常规订单',
  date: '2026-01-01',
  total: 199,
  status: '待处理',
  items: 1,
  ...partial,
});

describe('orderSearch', () => {
  it('订单过滤应包含 orderId（修复点回归）', () => {
    const orders: Order[] = [
      createOrder({ id: '1001', customerName: '张三' }),
      createOrder({ id: '2002', customerName: '李四' }),
    ];

    const matcher = createOrderSearchMatcher(new Map<string, string>());
    const filtered = orders.filter((order) => matcher(order, '2002'));

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe('2002');
  });

  it('历史订单跳转后生成的检索词应命中订单列表', () => {
    const targetOrder = createOrder({ id: '3456', customerName: '王五' });
    const orders: Order[] = [
      createOrder({ id: '1111' }),
      targetOrder,
    ];

    const matcher = createOrderSearchMatcher(new Map<string, string>([['1', '13800138000']]));
    const searchTerm = buildHistoryJumpOrderSearchTerm(3456).toLowerCase();
    const matched = orders.filter((order) => matcher(order, searchTerm));

    expect(searchTerm).toBe('3456');
    expect(matched.map((order) => order.id)).toContain('3456');
  });
});
