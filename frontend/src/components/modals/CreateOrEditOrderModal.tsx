import { useMemo, useRef } from 'react';
import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { Loader2, Plus, Save, ShoppingCart, X } from 'lucide-react';
import type { OrderItemDraft } from '../../app/formTypes';
import type { Customer, Product } from '../../types';
import { ModalHeader, ModalShell } from '../common/ModalShell';

const getOrderCustomerLabel = (customer: Customer) => `${customer.name}（${customer.phone}）`;

const getOrderProductLabel = (product: Product) =>
  `${product.name}【${product.category}】${product.sku ? `（${product.sku}）` : ''}`;

type CreateOrEditOrderModalProps = {
  isOpen: boolean;
  editingOrderId: number | null;
  orderSubmitting: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
  customers: Customer[];
  products: Product[];
  orderCustomerId: string;
  setOrderCustomerId: Dispatch<SetStateAction<string>>;
  orderCustomerName: string;
  setOrderCustomerName: Dispatch<SetStateAction<string>>;
  orderCustomerPhone: string;
  setOrderCustomerPhone: Dispatch<SetStateAction<string>>;
  orderCustomerNotes: string;
  setOrderCustomerNotes: Dispatch<SetStateAction<string>>;
  isCustomerPickerOpen: boolean;
  setIsCustomerPickerOpen: Dispatch<SetStateAction<boolean>>;
  activeProductPickerIndex: number | null;
  setActiveProductPickerIndex: Dispatch<SetStateAction<number | null>>;
  orderItems: OrderItemDraft[];
  setOrderItems: Dispatch<SetStateAction<OrderItemDraft[]>>;
  orderReceivedAmount: string;
  setOrderReceivedAmount: Dispatch<SetStateAction<string>>;
  orderNotes: string;
  setOrderNotes: Dispatch<SetStateAction<string>>;
  createEmptyOrderItemDraft: () => OrderItemDraft;
  formatCurrencyText: (value: number) => string;
  sanitizeMoneyTextInput: (raw: string) => string;
  normalizeMoneyTextToFixed2: (raw: string) => string;
};

export function CreateOrEditOrderModal({
  isOpen,
  editingOrderId,
  orderSubmitting,
  onClose,
  onSubmit,
  customers,
  products,
  orderCustomerId,
  setOrderCustomerId,
  orderCustomerName,
  setOrderCustomerName,
  orderCustomerPhone,
  setOrderCustomerPhone,
  orderCustomerNotes,
  setOrderCustomerNotes,
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
  createEmptyOrderItemDraft,
  formatCurrencyText,
  sanitizeMoneyTextInput,
  normalizeMoneyTextToFixed2,
}: CreateOrEditOrderModalProps) {
  const customerPickerRef = useRef<HTMLDivElement | null>(null);

  const filteredOrderCustomers = useMemo(() => {
    const normalizedName = orderCustomerName.trim().toLowerCase();
    const normalizedPhone = orderCustomerPhone.trim().toLowerCase();
    if (!normalizedName && !normalizedPhone) return customers;

    return customers.filter((customer) => {
      const matchName = !normalizedName || customer.name.toLowerCase().includes(normalizedName);
      const matchPhone = !normalizedPhone || customer.phone.toLowerCase().includes(normalizedPhone);
      return matchName && matchPhone;
    });
  }, [customers, orderCustomerName, orderCustomerPhone]);

  const syncOrderCustomerIdByPhone = (phone: string) => {
    const matchedByPhone = customers.find((customer) => customer.phone.trim() === phone.trim());
    setOrderCustomerId(matchedByPhone?.id ?? '');
  };

  const handleCustomerFieldBlur = () => {
    window.setTimeout(() => {
      const activeElement = document.activeElement;
      if (customerPickerRef.current && activeElement instanceof Node && customerPickerRef.current.contains(activeElement)) {
        return;
      }
      setIsCustomerPickerOpen(false);
    }, 0);
  };

  const filterOrderProducts = (query: string) => {
    const normalizedSearch = query.trim().toLowerCase();
    if (!normalizedSearch) return products;

    return products.filter((product) =>
      [product.name, product.category, product.sku, product.id].some((field) =>
        field.toLowerCase().includes(normalizedSearch),
      ),
    );
  };

  const estimatedAmount = useMemo(
    () => orderItems
      .filter((item) => item.productId)
      .reduce((acc, item) => {
        const paidPrice = Number(item.paidPrice);
        return acc + (Number.isFinite(paidPrice) ? paidPrice : 0) * (Number(item.quantity) || 0);
      }, 0),
    [orderItems],
  );

  const hasSelectedItems = orderItems.some((item) => item.productId);

  if (!isOpen) return null;

  return (
    <ModalShell containerClassName="max-w-6xl flex flex-col max-h-[92vh]">
      <ModalHeader
        title={editingOrderId !== null ? '编辑订单' : '创建新订单'}
        icon={<ShoppingCart className="h-5 w-5 mr-2 text-blue-600" />}
        onClose={onClose}
        closeAriaLabel="关闭创建订单弹窗"
      />

      <form onSubmit={onSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          <div ref={customerPickerRef}>
            <label className="block text-sm font-medium text-slate-700 mb-1">客户 <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="relative">
                <input
                  required
                  type="text"
                  value={orderCustomerName}
                  onFocus={() => setIsCustomerPickerOpen(true)}
                  onBlur={handleCustomerFieldBlur}
                  onChange={(event) => {
                    const value = event.target.value;
                    setOrderCustomerName(value);
                    syncOrderCustomerIdByPhone(orderCustomerPhone);
                  }}
                  className="w-full px-4 py-2 pr-9 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  placeholder="客户姓名"
                />
                {orderCustomerName && (
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => setOrderCustomerName('')}
                    className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                    aria-label="清空客户姓名"
                    title="清空"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="relative">
                <input
                  required
                  type="text"
                  value={orderCustomerPhone}
                  onFocus={() => setIsCustomerPickerOpen(true)}
                  onBlur={handleCustomerFieldBlur}
                  onChange={(event) => {
                    const value = event.target.value;
                    setOrderCustomerPhone(value);
                    syncOrderCustomerIdByPhone(value);
                  }}
                  className="w-full px-4 py-2 pr-9 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  placeholder="客户电话（按电话识别）"
                />
                {orderCustomerPhone && (
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      setOrderCustomerPhone('');
                      syncOrderCustomerIdByPhone('');
                    }}
                    className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                    aria-label="清空客户电话"
                    title="清空"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {isCustomerPickerOpen && customers.length > 0 && (
              <div className="z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                {filteredOrderCustomers.length > 0 ? (
                  filteredOrderCustomers.map((customer) => {
                    const selected = customer.id === orderCustomerId;
                    return (
                      <button
                        key={customer.id}
                        type="button"
                        onMouseDown={(event) => {
                          event.preventDefault();
                          setOrderCustomerId(customer.id);
                          setOrderCustomerName(customer.name);
                          setOrderCustomerPhone(customer.phone);
                          setOrderCustomerNotes(customer.notes ?? '');
                          setIsCustomerPickerOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 ${selected ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700'}`}
                      >
                        <div>{getOrderCustomerLabel(customer)}</div>
                        {customer.notes && <div className="text-xs text-slate-500 mt-0.5">备注：{customer.notes}</div>}
                      </button>
                    );
                  })
                ) : (
                  <div className="px-3 py-2 text-sm text-slate-500">未找到匹配客户（提交时将按电话自动创建）</div>
                )}
              </div>
            )}

            <div className="relative mt-2">
              <textarea
                value={orderCustomerNotes}
                onChange={(event) => setOrderCustomerNotes(event.target.value)}
                className="w-full px-4 py-2 pr-9 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                rows={2}
                placeholder="客户备注（提交订单时会自动写入/更新）"
              />
              {orderCustomerNotes && (
                <button
                  type="button"
                  onClick={() => setOrderCustomerNotes('')}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                  aria-label="清空客户备注"
                  title="清空"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {customers.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">⚠ 暂无客户数据，请先创建客户</p>
            )}
            {orderCustomerPhone.trim() && !orderCustomerId && (
              <p className="text-xs text-blue-600 mt-1">当前电话未匹配到客户，提交订单时将自动创建新客户</p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-700">商品明细 <span className="text-red-500">*</span></label>
              <button
                type="button"
                onClick={() =>
                  setOrderItems((prev) => [...prev, createEmptyOrderItemDraft()])
                }
                className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <Plus className="h-3 w-3" /> 添加商品行
              </button>
            </div>
            <div className="space-y-2">
              {orderItems.map((item, idx) => {
                const matchedProducts = filterOrderProducts(item.productQuery);
                return (
                  <div key={idx} className="flex gap-2 items-start">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={item.productQuery}
                        onFocus={() => setActiveProductPickerIndex(idx)}
                        onBlur={() => setActiveProductPickerIndex((current) => (current === idx ? null : current))}
                        onChange={(event) => {
                          const value = event.target.value;
                          const normalized = value.trim().toLowerCase();
                          const exactMatchedProduct = products.find(
                            (product) =>
                              (product.id.toLowerCase() === normalized ||
                                product.name.toLowerCase() === normalized ||
                                product.sku.toLowerCase() === normalized),
                          );

                          setOrderItems((prev) =>
                            prev.map((it, i) =>
                              i === idx
                                ? {
                                    ...it,
                                    productQuery: value,
                                    productId: exactMatchedProduct?.id ?? '',
                                    unitPrice: exactMatchedProduct ? formatCurrencyText(exactMatchedProduct.price) : '',
                                    paidPrice: exactMatchedProduct ? formatCurrencyText(exactMatchedProduct.price) : '',
                                  }
                                : it,
                            ),
                          );
                        }}
                        className="w-full px-3 py-2 pr-9 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                        placeholder="输入商品名 / SKU / 分类搜索并选择"
                      />

                      {item.productQuery && (
                        <button
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => {
                            setOrderItems((prev) =>
                              prev.map((it, i) =>
                                i === idx
                                  ? {
                                      ...it,
                                      productQuery: '',
                                      productId: '',
                                      unitPrice: '',
                                      paidPrice: '',
                                    }
                                  : it,
                              ),
                            );
                          }}
                          className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                          aria-label="清空商品输入"
                          title="清空"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}

                      {activeProductPickerIndex === idx && (
                        <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                          {matchedProducts.length > 0 ? (
                            matchedProducts.map((product) => {
                              const selected = product.id === item.productId;
                              return (
                                <button
                                  key={product.id}
                                  type="button"
                                  onMouseDown={(event) => {
                                    event.preventDefault();
                                    setOrderItems((prev) =>
                                      prev.map((it, i) =>
                                        i === idx
                                          ? {
                                              ...it,
                                              productId: product.id,
                                              productQuery: getOrderProductLabel(product),
                                              unitPrice: formatCurrencyText(product.price),
                                              paidPrice: formatCurrencyText(product.price),
                                            }
                                          : it,
                                      ),
                                    );
                                    setActiveProductPickerIndex(null);
                                  }}
                                  className={`w-full text-left px-3 py-2 text-sm ${
                                    selected
                                      ? 'bg-blue-50 text-blue-700 font-medium'
                                      : 'text-slate-700 hover:bg-blue-50'
                                  }`}
                                >
                                  {getOrderProductLabel(product)}
                                </button>
                              );
                            })
                          ) : (
                            <div className="px-3 py-2 text-sm text-slate-500">未找到匹配商品</div>
                          )}
                        </div>
                      )}
                    </div>

                    <input
                      type="number"
                      readOnly
                      value={item.unitPrice}
                      className="w-28 px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-sm text-slate-600"
                      placeholder="标价"
                    />

                    <div className="relative w-28">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={item.paidPrice}
                        onChange={(event) => {
                          const normalized = sanitizeMoneyTextInput(event.target.value);
                          setOrderItems((prev) =>
                            prev.map((it, i) => (i === idx ? { ...it, paidPrice: normalized } : it)),
                          );
                        }}
                        onBlur={() => {
                          setOrderItems((prev) =>
                            prev.map((it, i) =>
                              i === idx
                                ? {
                                    ...it,
                                    paidPrice: normalizeMoneyTextToFixed2(sanitizeMoneyTextInput(it.paidPrice)),
                                  }
                                : it,
                            ),
                          );
                        }}
                        className="w-full px-3 py-2 pr-8 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                        placeholder="实付单价"
                      />
                      {item.paidPrice && (
                        <button
                          type="button"
                          onClick={() =>
                            setOrderItems((prev) =>
                              prev.map((it, i) => (i === idx ? { ...it, paidPrice: '' } : it)),
                            )
                          }
                          className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                          aria-label="清空实付单价"
                          title="清空"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={item.quantity}
                      onChange={(event) =>
                        setOrderItems((prev) =>
                          prev.map((it, i) => (i === idx ? { ...it, quantity: event.target.value } : it)),
                        )
                      }
                      className="w-24 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                      placeholder="数量"
                    />

                    {orderItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          setOrderItems((prev) => prev.filter((_, i) => i !== idx));
                          setActiveProductPickerIndex((current) => (current === idx ? null : current));
                        }}
                        className="p-2 text-slate-400 hover:text-red-500"
                        title="删除此行"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}

                    {!item.productId && item.productQuery.trim() && (
                      <span className="pt-2 text-xs whitespace-nowrap text-amber-600">请选择有效商品</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {hasSelectedItems && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm">
              <span className="text-slate-500">预计金额：</span>
              <span className="font-bold text-slate-900">
                ¥{estimatedAmount.toFixed(2)}
              </span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">实收金额</label>
            <div className="relative">
              <input
                type="text"
                inputMode="decimal"
                value={orderReceivedAmount}
                onChange={(event) => setOrderReceivedAmount(sanitizeMoneyTextInput(event.target.value))}
                onBlur={() => {
                  setOrderReceivedAmount((prev) => {
                    const normalized = normalizeMoneyTextToFixed2(sanitizeMoneyTextInput(prev));
                    return normalized || '';
                  });
                }}
                className="w-full px-4 py-2 pr-9 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                placeholder={hasSelectedItems ? `默认使用预计金额 ¥${estimatedAmount.toFixed(2)}` : '请输入实收金额'}
              />
              {orderReceivedAmount && (
                <button
                  type="button"
                  onClick={() => setOrderReceivedAmount('')}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                  aria-label="清空实收金额"
                  title="清空"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-500">可修改，留空时提交将自动使用预计金额。</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">备注</label>
            <div className="relative">
              <textarea
                value={orderNotes}
                onChange={(event) => setOrderNotes(event.target.value)}
                className="w-full px-4 py-2 pr-9 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                rows={2}
                placeholder="可填写配送要求、取货方式等"
              />
              {orderNotes && (
                <button
                  type="button"
                  onClick={() => setOrderNotes('')}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                  aria-label="清空订单备注"
                  title="清空"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

        <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 text-sm"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={orderSubmitting}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center disabled:opacity-70"
          >
            {orderSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            {editingOrderId !== null ? '保存订单' : '提交订单'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}