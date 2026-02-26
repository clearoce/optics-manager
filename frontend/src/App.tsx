import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell,
  Edit,
  ExternalLink,
  FileText,
  LayoutDashboard,
  Loader2,
  Package,
  Plus,
  Save,
  ShoppingCart,
  Users,
  X,
} from 'lucide-react';
import { api } from './services/api';
import type { Customer, Order, Product, View } from './types';
import type { CustomerFormState, ProductFormState } from './app/formTypes';
import { mapCustomerFromApi, mapOrderFromApi, mapProductFromApi } from './app/mappers';
import type { CreateOrderPayload, UpdateOrderPayload } from './services/api';
import { DashboardView } from './components/views/DashboardView';
import { CustomersView } from './components/views/CustomersView';
import { InventoryView } from './components/views/InventoryView';
import { OrdersView } from './components/views/OrdersView';

const getStateFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  const view = (params.get('view') as View) || 'dashboard';
  const search = params.get('search') || '';
  return { view, search };
};

const getOrderCustomerLabel = (customer: Customer) => `${customer.name}（${customer.phone}）`;

const getOrderProductLabel = (product: Product) =>
  `${product.name}【${product.category}】${product.sku ? `（${product.sku}）` : ''}`;

type OrderItemDraft = {
  productId: string;
  quantity: string;
  productQuery: string;
  unitPrice: string;
  paidPrice: string;
};

const createEmptyOrderItemDraft = (): OrderItemDraft => ({
  productId: '',
  quantity: '1',
  productQuery: '',
  unitPrice: '',
  paidPrice: '',
});

const formatCurrencyText = (value: number) => value.toFixed(2);

const sanitizeMoneyTextInput = (raw: string) => {
  const cleaned = raw.replace(/[^\d.]/g, '');
  const [integerPart = '', ...decimalParts] = cleaned.split('.');
  const decimalPart = decimalParts.join('').slice(0, 2);
  return decimalParts.length > 0 ? `${integerPart}.${decimalPart}` : integerPart;
};

const normalizeMoneyTextToFixed2 = (raw: string) => {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return '';
  return formatCurrencyText(parsed);
};

function App() {
  const initial = getStateFromUrl();
  const [activeView, setActiveView] = useState<View>(initial.view);
  const [searchTerm, setSearchTerm] = useState(initial.search);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customersError, setCustomersError] = useState('');
  const [customerSubmitting, setCustomerSubmitting] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState('');
  const [productSubmitting, setProductSubmitting] = useState(false);

  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState('');

  const [detailOrder, setDetailOrder] = useState<Awaited<ReturnType<typeof api.orders.detail>> | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  // Create order modal
  const [isCreateOrderOpen, setIsCreateOrderOpen] = useState(false);
  const [orderCustomerId, setOrderCustomerId] = useState('');
  const [orderCustomerName, setOrderCustomerName] = useState('');
  const [orderCustomerPhone, setOrderCustomerPhone] = useState('');
  const [orderCustomerNotes, setOrderCustomerNotes] = useState('');
  const [isCustomerPickerOpen, setIsCustomerPickerOpen] = useState(false);
  const [activeProductPickerIndex, setActiveProductPickerIndex] = useState<number | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItemDraft[]>([createEmptyOrderItemDraft()]);
  const [orderNotes, setOrderNotes] = useState('');
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);

  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState<ProductFormState>({
    name: '',
    sku: '',
    category: '',
    price: '',
    notes: '',
  });

  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerForm, setCustomerForm] = useState<CustomerFormState>({ name: '', phone: '', notes: '' });

  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);
  const [historyOrders, setHistoryOrders] = useState<Awaited<ReturnType<typeof api.orders.list>>>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const customerPickerRef = useRef<HTMLDivElement | null>(null);

  const loadCustomers = async () => {
    setCustomersLoading(true);
    setCustomersError('');
    try {
      const rows = await api.customers.list();
      setCustomers(rows.map(mapCustomerFromApi));
    } catch (error) {
      setCustomersError(error instanceof Error ? error.message : '加载客户失败');
      setCustomers([]);
    } finally {
      setCustomersLoading(false);
    }
  };

  const loadProducts = async () => {
    setProductsLoading(true);
    setProductsError('');
    try {
      const rows = await api.products.list();
      setProducts(rows.map(mapProductFromApi));
    } catch (error) {
      setProductsError(error instanceof Error ? error.message : '加载商品数据失败');
      setProducts([]);
    } finally {
      setProductsLoading(false);
    }
  };

  // 并发拉取订单和客户，用于客户名关联
  const loadOrders = async (existingCustomers?: Customer[]) => {
    setOrdersLoading(true);
    setOrdersError('');
    try {
      // 同时请求客户列表和订单列表，这样即使初始化时 customers 状态为空也能正确关联
      const [orderRows, customerRows] = await Promise.all([
        api.orders.list(),
        existingCustomers ? Promise.resolve(null) : api.customers.list(),
      ]);
      const customerList = existingCustomers ?? (customerRows ?? []).map(mapCustomerFromApi);
      setOrders(
        orderRows.map((row) => {
          const customer = customerList.find((c) => c.id === String(row.customer_id));
          return mapOrderFromApi(row, customer?.name);
        }),
      );
    } catch (error) {
      setOrdersError(error instanceof Error ? error.message : '加载订单失败');
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  };

  useEffect(() => {
    void loadCustomers();
    void loadProducts();
    void loadOrders();
  }, []);


  useEffect(() => {
    const onPopState = () => {
      const state = getStateFromUrl();
      setActiveView(state.view);
      setSearchTerm(state.search);
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const updateUrlAndState = (view: View, search: string, push = true) => {
    const params = new URLSearchParams();
    params.set('view', view);
    if (search.trim()) {
      params.set('search', search.trim());
    }
    const url = `${window.location.pathname}?${params.toString()}`;
    if (push) {
      window.history.pushState({}, '', url);
    } else {
      window.history.replaceState({}, '', url);
    }
    setActiveView(view);
    setSearchTerm(search);
  };

  const handleViewChange = (view: View) => {
    updateUrlAndState(view, '', true);
  };

  const handleSearchChange = (value: string) => {
    updateUrlAndState(activeView, value, true);
  };

  const openCreateCustomerModal = () => {
    setEditingCustomer(null);
    setCustomerForm({ name: '', phone: '', notes: '' });
    setIsCustomerModalOpen(true);
  };

  const openEditCustomerModal = (customer: Customer) => {
    setEditingCustomer(customer);
    setCustomerForm({
      name: customer.name,
      phone: customer.phone,
      notes: customer.notes,
    });
    setIsCustomerModalOpen(true);
  };

  const openCreateProductModal = () => {
    setEditingProduct(null);
    setProductForm({ name: '', sku: '', category: '', price: '', notes: '' });
    setIsProductModalOpen(true);
  };

  const openEditProductModal = (product: Product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      sku: product.sku,
      category: product.category,
      price: String(product.price),
      notes: product.notes === '-' ? '' : product.notes,
    });
    setIsProductModalOpen(true);
  };

  const handleSubmitCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerForm.name.trim() || !customerForm.phone.trim()) return;

    setCustomerSubmitting(true);
    try {
      if (editingCustomer) {
        const id = Number(editingCustomer.id);
        if (!Number.isFinite(id)) {
          throw new Error('当前客户不是后端数据，无法编辑');
        }
        await api.customers.update(id, {
          name: customerForm.name.trim(),
          phone: customerForm.phone.trim(),
          notes: customerForm.notes.trim() || null,
        });
      } else {
        await api.customers.create({
          name: customerForm.name.trim(),
          phone: customerForm.phone.trim(),
          notes: customerForm.notes.trim() || null,
        });
      }
      setIsCustomerModalOpen(false);
      await loadCustomers();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '提交客户信息失败');
    } finally {
      setCustomerSubmitting(false);
    }
  };

  const handleSubmitProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.name.trim() || !productForm.category.trim() || !productForm.price.trim()) return;

    const price = Number(productForm.price);
    if (!Number.isFinite(price) || price <= 0) {
      window.alert('价格必须是大于 0 的数字');
      return;
    }

    const sku = productForm.sku.trim();
    if (sku) {
      const isSkuDuplicate = products.some(
        (p) => p.sku === sku && (!editingProduct || p.id !== editingProduct.id),
      );
      if (isSkuDuplicate) {
        window.alert(`SKU「${sku}」已存在，请使用唯一的 SKU`);
        return;
      }
    }

    setProductSubmitting(true);
    try {
      if (editingProduct) {
        const id = Number(editingProduct.id);
        if (!Number.isFinite(id)) {
          throw new Error('当前商品不是后端数据，无法编辑');
        }
        await api.products.update(id, {
          name: productForm.name.trim(),
          sku: sku || null,
          category: productForm.category.trim(),
          price,
          extra_info: productForm.notes.trim() || null,
        });
      } else {
        await api.products.create({
          name: productForm.name.trim(),
          sku: sku || null,
          category: productForm.category.trim(),
          price,
          extra_info: productForm.notes.trim() || null,
        });
      }

      setIsProductModalOpen(false);
      await loadProducts();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '提交商品信息失败');
    } finally {
      setProductSubmitting(false);
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    const id = Number(product.id);
    if (!Number.isFinite(id)) {
      window.alert('当前商品不是后端数据，无法删除');
      return;
    }

    const ok = window.confirm(`确认删除商品「${product.name}」吗？`);
    if (!ok) return;

    try {
      await api.products.remove(id);
      await loadProducts();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '删除商品失败');
    }
  };

  const openCustomerHistory = async (customer: Customer) => {
    const customerId = Number(customer.id);
    if (!Number.isFinite(customerId)) {
      window.alert('当前客户不是后端数据，暂不支持查询订单历史。');
      return;
    }

    setHistoryCustomer(customer);
    setHistoryOrders([]);
    setHistoryError('');
    setHistoryLoading(true);
    try {
      const rows = await api.orders.list(customerId);
      setHistoryOrders(rows);
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : '加载订单历史失败');
    } finally {
      setHistoryLoading(false);
    }
  };

  const openOrderDetail = async (orderId: string) => {
    const id = Number(orderId);
    if (!Number.isFinite(id)) {
      window.alert('当前订单不是后端数据，无法查看详情');
      return;
    }
    setDetailOrder(null);
    setDetailError('');
    setDetailLoading(true);
    try {
      const detail = await api.orders.detail(id);
      setDetailOrder(detail);
    } catch (error) {
      setDetailError(error instanceof Error ? error.message : '加载订单详情失败');
      setDetailOrder({ order: { id, customer_id: 0, total_amount: 0, order_date: undefined, notes: null, extra_info: null }, items: [] });
    } finally {
      setDetailLoading(false);
    }
  };

  const openCreateOrder = () => {
    // 按需求：创建订单时客户信息默认留空
    setEditingOrderId(null);
    setOrderCustomerId('');
    setOrderCustomerName('');
    setOrderCustomerPhone('');
    setOrderCustomerNotes('');
    setOrderItems([createEmptyOrderItemDraft()]);
    setIsCustomerPickerOpen(false);
    setActiveProductPickerIndex(null);
    setOrderNotes('');
    setIsCreateOrderOpen(true);
  };

  const closeOrderModal = () => {
    setIsCreateOrderOpen(false);
    setEditingOrderId(null);
  };

  const openEditOrder = async (orderId: string) => {
    const id = Number(orderId);
    if (!Number.isFinite(id)) {
      window.alert('当前订单不是后端数据，无法编辑');
      return;
    }

    try {
      const detail = await api.orders.detail(id);
      const matchedCustomer = customers.find((customer) => Number(customer.id) === detail.order.customer_id);

      setEditingOrderId(id);
      setOrderCustomerId(String(detail.order.customer_id));
      setOrderCustomerName(matchedCustomer?.name ?? '');
      setOrderCustomerPhone(matchedCustomer?.phone ?? '');
      setOrderCustomerNotes(matchedCustomer?.notes ?? '');
      setOrderItems(
        detail.items.length > 0
          ? detail.items.map((item) => {
              const product = products.find((p) => Number(p.id) === item.product_id);
              return {
                productId: String(item.product_id),
                quantity: String(item.quantity),
                productQuery: product ? getOrderProductLabel(product) : `商品 #${item.product_id}`,
                unitPrice: formatCurrencyText(item.unit_price),
                paidPrice: formatCurrencyText(item.paid_price),
              };
            })
          : [createEmptyOrderItemDraft()],
      );
      setOrderNotes(detail.order.notes ?? '');
      setIsCustomerPickerOpen(false);
      setActiveProductPickerIndex(null);
      setIsCreateOrderOpen(true);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '加载订单失败，无法编辑');
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    const id = Number(orderId);
    if (!Number.isFinite(id)) {
      window.alert('当前订单不是后端数据，无法删除');
      return;
    }

    const ok = window.confirm(`确认删除订单 #${id} 吗？`);
    if (!ok) return;

    try {
      await api.orders.remove(id);
      if (detailOrder?.order.id === id) {
        setDetailOrder(null);
      }
      await loadOrders(customers);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '删除订单失败');
    }
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedName = orderCustomerName.trim();
    const normalizedPhone = orderCustomerPhone.trim();
    const normalizedCustomerNotes = orderCustomerNotes.trim();

    if (!normalizedName || !normalizedPhone) {
      window.alert('请填写客户姓名和电话');
      return;
    }

    const parsedItems = orderItems
      .filter((item) => item.productId)
      .map((item) => ({
        product_id: Number(item.productId),
        quantity: Number(item.quantity),
        paid_price: Number(item.paidPrice),
      }));
    if (parsedItems.length === 0) {
      window.alert('请至少添加一个商品');
      return;
    }
    for (const item of parsedItems) {
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        window.alert('商品数量必须为正整数');
        return;
      }

      if (!Number.isFinite(item.paid_price) || item.paid_price <= 0) {
        window.alert('实付单价必须是大于 0 的数字');
        return;
      }
    }

    setOrderSubmitting(true);
    try {
      const matchedCustomerByPhone = customers.find(
        (customer) => customer.phone.trim() === normalizedPhone,
      );

      let customerIdForOrder: number;
      if (matchedCustomerByPhone) {
        const matchedCustomerId = Number(matchedCustomerByPhone.id);
        if (!Number.isFinite(matchedCustomerId)) {
          throw new Error('匹配到的客户ID无效，无法提交订单');
        }

        const existingNotes = (matchedCustomerByPhone.notes ?? '').trim();
        const shouldUpdateCustomer =
          matchedCustomerByPhone.name !== normalizedName || existingNotes !== normalizedCustomerNotes;

        if (shouldUpdateCustomer) {
          await api.customers.update(matchedCustomerId, {
            name: normalizedName,
            phone: normalizedPhone,
            notes: normalizedCustomerNotes || null,
          });
        }

        customerIdForOrder = matchedCustomerId;
        setOrderCustomerId(String(matchedCustomerId));
      } else {
        const created = await api.customers.create({
          name: normalizedName,
          phone: normalizedPhone,
          notes: normalizedCustomerNotes || null,
        });
        customerIdForOrder = created.id;
        setOrderCustomerId(String(created.id));
      }

      const payload: CreateOrderPayload | UpdateOrderPayload = {
        customer_id: customerIdForOrder,
        items: parsedItems,
        notes: orderNotes.trim() || null,
      };

      if (editingOrderId !== null) {
        await api.orders.update(editingOrderId, payload);
      } else {
        await api.orders.create(payload);
      }

      closeOrderModal();
      // 重新加载客户/订单/商品（可能自动创建或更新了客户）
      await Promise.all([loadCustomers(), loadOrders(), loadProducts()]);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '提交订单失败');
    } finally {
      setOrderSubmitting(false);
    }
  };

  const jumpToOrder = (orderId: number) => {
    setHistoryCustomer(null);
    updateUrlAndState('orders', String(orderId), true);
  };

  const menuItems = [
    { id: 'dashboard' as View, label: '仪表盘', icon: LayoutDashboard },
    { id: 'inventory' as View, label: '商品管理', icon: Package },
    { id: 'orders' as View, label: '订单管理', icon: ShoppingCart },
    { id: 'customers' as View, label: '客户列表', icon: Users },
  ];

  const titleMap: Record<View, string> = {
    dashboard: '仪表盘',
    inventory: '商品管理',
    orders: '订单管理',
    customers: '客户管理',
  };

  const filteredCustomers = useMemo(() => {
    // 根据订单实时计算每个客户的统计数据
    const customerList = customers.map((c) => {
      const customerOrders = orders.filter((o) => o.customerId === c.id);
      const totalSpent = customerOrders.reduce((sum, o) => sum + o.total, 0);
      const lastOrder = customerOrders.length > 0
        ? customerOrders.reduce((latest, current) => current.date > latest.date ? current : latest)
        : null;

      return {
        ...c,
        totalSpent,
        lastOrderDate: lastOrder ? lastOrder.date : '-',
      };
    });

    const normalizedSearch = searchTerm.toLowerCase();
    return customerList.filter(
      (c) =>
        c.name.toLowerCase().includes(normalizedSearch) ||
        c.phone.toLowerCase().includes(normalizedSearch) ||
        c.id.toLowerCase().includes(normalizedSearch),
    );
  }, [customers, orders, searchTerm]);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = searchTerm.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(normalizedSearch) ||
        p.sku.toLowerCase().includes(normalizedSearch) ||
        p.category.toLowerCase().includes(normalizedSearch) ||
        p.id.toLowerCase().includes(normalizedSearch),
    );
  }, [products, searchTerm]);

  const filteredOrders = useMemo(() => {
    const normalizedSearch = searchTerm.toLowerCase();
    return orders.filter(
      (o) =>
        o.id.toLowerCase().includes(normalizedSearch) ||
        o.customerName.toLowerCase().includes(normalizedSearch) ||
        o.notes.toLowerCase().includes(normalizedSearch),
    );
  }, [orders, searchTerm]);

  const filteredOrderCustomers = useMemo(() => {
    const normalizedName = orderCustomerName.trim().toLowerCase();
    const normalizedPhone = orderCustomerPhone.trim().toLowerCase();
    if (!normalizedName && !normalizedPhone) return customers;

    return customers.filter((c) => {
      const matchName = !normalizedName || c.name.toLowerCase().includes(normalizedName);
      const matchPhone = !normalizedPhone || c.phone.toLowerCase().includes(normalizedPhone);
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

    return products.filter((p) =>
      [p.name, p.category, p.sku, p.id].some((field) => field.toLowerCase().includes(normalizedSearch)),
    );
  };

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardView products={products} orders={orders} customers={customers} />;
      case 'inventory':
        return (
          <InventoryView
            filteredProducts={filteredProducts}
            productsLoading={productsLoading}
            productsError={productsError}
            searchTerm={searchTerm}
            onSearchChange={handleSearchChange}
            onOpenCreateProduct={openCreateProductModal}
            onOpenEditProduct={openEditProductModal}
            onDeleteProduct={handleDeleteProduct}
          />
        );
      case 'orders':
        return (
          <OrdersView
            orders={orders}
            filteredOrders={filteredOrders}
            customers={customers}
            searchTerm={searchTerm}
            onSearchChange={handleSearchChange}
            ordersLoading={ordersLoading}
            ordersError={ordersError}
            onOpenOrderDetail={openOrderDetail}
            onOpenEditOrder={openEditOrder}
            onDeleteOrder={handleDeleteOrder}
            onOpenCreateOrder={openCreateOrder}
          />
        );
      case 'customers':
        return (
          <CustomersView
            filteredCustomers={filteredCustomers}
            customersLoading={customersLoading}
            customersError={customersError}
            searchTerm={searchTerm}
            onSearchChange={handleSearchChange}
            onOpenCreateCustomer={openCreateCustomerModal}
            onOpenEditCustomer={openEditCustomerModal}
            onOpenCustomerHistory={openCustomerHistory}
          />
        );
      default:
        return <DashboardView products={products} orders={orders} customers={customers} />;
    }
  };

  return (
    <>
      <div className="min-h-screen bg-slate-50 flex">
        <aside className="hidden lg:flex lg:w-64 bg-slate-900 text-slate-100 flex-col">
          <div className="h-16 border-b border-slate-800 flex items-center justify-center">
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">NexusAdmin</h1>
          </div>
          <nav className="p-3 space-y-1 flex-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = item.id === activeView;
              return (
                <button
                  key={item.id}
                  onClick={() => handleViewChange(item.id)}
                  className={`w-full flex items-center px-3 py-2 rounded-md text-sm ${active ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="flex-1 min-w-0 flex flex-col">
          <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 sticky top-0 z-10">
            <h2 className="text-xl font-semibold text-slate-800">{titleMap[activeView]}</h2>
            <div className="flex items-center gap-3">
              <button
                className="p-2 rounded-full text-slate-400 hover:bg-slate-100"
                aria-label="查看通知"
                title="查看通知"
              >
                <Bell className="h-5 w-5" />
              </button>
              <div className="h-8 w-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-semibold">管</div>
            </div>
          </header>
          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">{renderContent()}</main>
        </div>
      </div>

      {isCreateOrderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-900 flex items-center">
                <ShoppingCart className="h-5 w-5 mr-2 text-blue-600" />
                {editingOrderId !== null ? '编辑订单' : '创建新订单'}
              </h3>
              <button
                onClick={closeOrderModal}
                className="text-slate-400 hover:text-slate-600"
                aria-label="关闭创建订单弹窗"
                title="关闭"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitOrder} className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* 选择客户 */}
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
                      onChange={(e) => {
                        const value = e.target.value;
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
                      onChange={(e) => {
                        const value = e.target.value;
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
                      filteredOrderCustomers.map((c) => {
                        const selected = c.id === orderCustomerId;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onMouseDown={(event) => {
                              event.preventDefault();
                              setOrderCustomerId(c.id);
                              setOrderCustomerName(c.name);
                              setOrderCustomerPhone(c.phone);
                              setOrderCustomerNotes(c.notes ?? '');
                              setIsCustomerPickerOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 ${selected ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700'}`}
                          >
                            <div>{getOrderCustomerLabel(c)}</div>
                            {c.notes && <div className="text-xs text-slate-500 mt-0.5">备注：{c.notes}</div>}
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
                    onChange={(e) => setOrderCustomerNotes(e.target.value)}
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

              {/* 商品明细 */}
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
                        {/* 商品选择 — 用商品名+分类消除重名歧义 */}
                        <div className="relative flex-1">
                          <input
                            type="text"
                            value={item.productQuery}
                            onFocus={() => setActiveProductPickerIndex(idx)}
                            onBlur={() => setActiveProductPickerIndex((current) => (current === idx ? null : current))}
                            onChange={(e) => {
                              const value = e.target.value;
                              const normalized = value.trim().toLowerCase();
                              const exactMatchedProduct = products.find(
                                (p) =>
                                  (p.id.toLowerCase() === normalized ||
                                    p.name.toLowerCase() === normalized ||
                                    p.sku.toLowerCase() === normalized),
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
                                matchedProducts.map((p) => {
                                  const selected = p.id === item.productId;
                                  return (
                                    <button
                                      key={p.id}
                                      type="button"
                                      onMouseDown={(event) => {
                                        event.preventDefault();
                                        setOrderItems((prev) =>
                                          prev.map((it, i) =>
                                            i === idx
                                              ? {
                                                  ...it,
                                                  productId: p.id,
                                                  productQuery: getOrderProductLabel(p),
                                                  unitPrice: formatCurrencyText(p.price),
                                                  paidPrice: formatCurrencyText(p.price),
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
                                      {getOrderProductLabel(p)}
                                    </button>
                                  );
                                })
                              ) : (
                                <div className="px-3 py-2 text-sm text-slate-500">未找到匹配商品</div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* 标价（只读） */}
                        <input
                          type="number"
                          readOnly
                          value={item.unitPrice}
                          className="w-28 px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-sm text-slate-600"
                          placeholder="标价"
                        />

                        {/* 实付单价 */}
                        <div className="relative w-28">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={item.paidPrice}
                            onChange={(e) => {
                              const normalized = normalizeMoneyTextToFixed2(sanitizeMoneyTextInput(e.target.value));
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
                                        paidPrice: normalizeMoneyTextToFixed2(it.paidPrice),
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

                        {/* 数量 */}
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={item.quantity}
                          onChange={(e) =>
                            setOrderItems((prev) =>
                              prev.map((it, i) => (i === idx ? { ...it, quantity: e.target.value } : it)),
                            )
                          }
                          className="w-24 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                          placeholder="数量"
                        />

                        {/* 删除行 */}
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

              {/* 预计金额 */}
              {orderItems.some((it) => it.productId) && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm">
                  <span className="text-slate-500">预计金额：</span>
                  <span className="font-bold text-slate-900">
                    ¥{orderItems
                      .filter((it) => it.productId)
                      .reduce((acc, it) => {
                        const paidPrice = Number(it.paidPrice);
                        return acc + (Number.isFinite(paidPrice) ? paidPrice : 0) * (Number(it.quantity) || 0);
                      }, 0)
                      .toFixed(2)}
                  </span>
                </div>
              )}

              {/* 备注 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">备注</label>
                <div className="relative">
                  <textarea
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
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
                  onClick={closeOrderModal}
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
          </div>
        </div>
      )}

      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-900 flex items-center">
                {editingCustomer ? <Edit className="h-5 w-5 mr-2 text-blue-600" /> : <Users className="h-5 w-5 mr-2 text-blue-600" />}
                {editingCustomer ? '编辑客户资料' : '添加新客户'}
              </h3>
              <button
                onClick={() => setIsCustomerModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
                aria-label="关闭弹窗"
                title="关闭弹窗"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitCustomer} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">姓名</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={customerForm.name}
                    onChange={(e) => setCustomerForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-2 pr-9 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="例如：张三"
                  />
                  {customerForm.name && (
                    <button
                      type="button"
                      onClick={() => setCustomerForm((prev) => ({ ...prev, name: '' }))}
                      className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                      aria-label="清空客户姓名输入"
                      title="清空"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">电话</label>
                <div className="relative">
                  <input
                    type="tel"
                    required
                    value={customerForm.phone}
                    onChange={(e) => setCustomerForm((prev) => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-4 py-2 pr-9 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="例如：13800000000"
                  />
                  {customerForm.phone && (
                    <button
                      type="button"
                      onClick={() => setCustomerForm((prev) => ({ ...prev, phone: '' }))}
                      className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                      aria-label="清空客户电话输入"
                      title="清空"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">备注</label>
                <div className="relative">
                  <textarea
                    value={customerForm.notes}
                    onChange={(e) => setCustomerForm((prev) => ({ ...prev, notes: e.target.value }))}
                    className="w-full px-4 py-2 pr-9 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    rows={3}
                    placeholder="可填写偏好、回访信息等"
                  />
                  {customerForm.notes && (
                    <button
                      type="button"
                      onClick={() => setCustomerForm((prev) => ({ ...prev, notes: '' }))}
                      className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                      aria-label="清空客户备注输入"
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
                  onClick={() => setIsCustomerModalOpen(false)}
                  className="px-5 py-2.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 text-sm"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={customerSubmitting}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center disabled:opacity-70"
                >
                  {customerSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  {editingCustomer ? '保存更改' : '创建客户'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {historyCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-indigo-600" />
                  {historyCustomer.name} 的订单历史
                </h3>
                <p className="text-xs text-slate-500 ml-7">客户ID：{historyCustomer.id}</p>
              </div>
              <button
                onClick={() => setHistoryCustomer(null)}
                className="text-slate-400 hover:text-slate-600"
                aria-label="关闭订单历史弹窗"
                title="关闭订单历史弹窗"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {historyLoading ? (
                <div className="flex items-center justify-center h-48">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                </div>
              ) : historyError ? (
                <div className="px-6 py-8 text-sm text-red-600">加载失败：{historyError}</div>
              ) : historyOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-slate-500">
                  <FileText className="h-10 w-10 mb-2 text-slate-300" />
                  <p>暂无订单记录</p>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">订单号</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">日期</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">金额</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">备注</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {historyOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => jumpToOrder(order.id)}
                            className="text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center"
                            title="跳转到订单详情"
                          >
                            #{order.id} <ExternalLink className="h-3 w-3 ml-1" />
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                          {order.order_date ? order.order_date.slice(0, 19).replace('T', ' ') : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">¥{order.total_amount.toFixed(2)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{order.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setHistoryCustomer(null)}
                className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-900 flex items-center">
                <Package className="h-5 w-5 mr-2 text-blue-600" />
                {editingProduct ? '编辑商品信息' : '添加新商品'}
              </h3>
              <button
                onClick={() => setIsProductModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
                aria-label="关闭商品弹窗"
                title="关闭商品弹窗"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitProduct} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">商品名称</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={productForm.name}
                    onChange={(e) => setProductForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-2 pr-9 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="例如：依视路防蓝光镜片"
                  />
                  {productForm.name && (
                    <button
                      type="button"
                      onClick={() => setProductForm((prev) => ({ ...prev, name: '' }))}
                      className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                      aria-label="清空商品名称输入"
                      title="清空"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">SKU (唯一标识)</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={productForm.sku}
                    onChange={(e) => setProductForm((prev) => ({ ...prev, sku: e.target.value }))}
                    className="w-full px-4 py-2 pr-9 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                    placeholder="例如：ESL-BL-01"
                  />
                  {productForm.sku && (
                    <button
                      type="button"
                      onClick={() => setProductForm((prev) => ({ ...prev, sku: '' }))}
                      className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                      aria-label="清空SKU输入"
                      title="清空"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">分类</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={productForm.category}
                    onChange={(e) => setProductForm((prev) => ({ ...prev, category: e.target.value }))}
                    className="w-full px-4 py-2 pr-9 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="例如：镜片 / 镜框 / 隐形眼镜"
                  />
                  {productForm.category && (
                    <button
                      type="button"
                      onClick={() => setProductForm((prev) => ({ ...prev, category: '' }))}
                      className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                      aria-label="清空分类输入"
                      title="清空"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">价格</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={productForm.price}
                  onChange={(e) => setProductForm((prev) => ({ ...prev, price: e.target.value }))}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="例如：699"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">备注</label>
                <div className="relative">
                  <textarea
                    value={productForm.notes}
                    onChange={(e) => setProductForm((prev) => ({ ...prev, notes: e.target.value }))}
                    className="w-full px-4 py-2 pr-9 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    rows={3}
                    placeholder="可填写规格、材质等"
                  />
                  {productForm.notes && (
                    <button
                      type="button"
                      onClick={() => setProductForm((prev) => ({ ...prev, notes: '' }))}
                      className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                      aria-label="清空商品备注输入"
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
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-5 py-2.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 text-sm"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={productSubmitting}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center disabled:opacity-70"
                >
                  {productSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  {editingProduct ? '保存更改' : '创建商品'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {detailOrder !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center">
                  <ShoppingCart className="h-5 w-5 mr-2 text-blue-600" />
                  订单详情 · <span className="font-mono ml-2"># {detailOrder.order.id}</span>
                </h3>
                <p className="text-xs text-slate-500 ml-7">
                  总金额：<span className="font-semibold text-slate-700">¥{detailOrder.order.total_amount.toFixed(2)}</span>
                  {detailOrder.order.order_date && <> &nbsp;·&nbsp; {detailOrder.order.order_date.slice(0, 10)}</>}
                </p>
              </div>
              <button
                onClick={() => setDetailOrder(null)}
                className="text-slate-400 hover:text-slate-600"
                aria-label="关闭订单详情弹窗"
                title="关闭"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {detailLoading ? (
                <div className="flex items-center justify-center h-48">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                </div>
              ) : detailError ? (
                <div className="px-6 py-8 text-sm text-red-600">加载失败：{detailError}</div>
              ) : detailOrder.items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-slate-500">
                  <ShoppingCart className="h-10 w-10 mb-2 text-slate-300" />
                  <p>暂无订单明细</p>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      {['商品 ID', '商品名称', '标价', '实付单价', '数量', '小计'].map((h) => (
                        <th key={h} className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {detailOrder.items.map((item) => {
                      const product = products.find((p) => p.id === String(item.product_id));
                      return (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-slate-400">P{item.product_id}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                            {product?.name ?? `商品 #${item.product_id}`}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">¥{item.unit_price.toFixed(2)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">¥{item.paid_price.toFixed(2)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{item.quantity}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">¥{item.subtotal.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                    <tr>
                      <td colSpan={5} className="px-6 py-3 text-sm font-semibold text-slate-700 text-right">合计</td>
                      <td className="px-6 py-3 text-sm font-bold text-slate-900">¥{detailOrder.order.total_amount.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>

            {detailOrder.order.notes && (
              <div className="px-6 py-3 border-t border-slate-100 bg-amber-50/50 text-sm text-slate-600">
                <span className="font-medium text-slate-700">备注：</span>{detailOrder.order.notes}
              </div>
            )}

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setDetailOrder(null)}
                className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


export default App;
