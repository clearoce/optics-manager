import { useMemo, useState } from 'react';
import { Bell, LayoutDashboard, Package, ShoppingCart, Users } from 'lucide-react';
import { api } from './services/api';
import type { Customer, Product, View } from './types';
import { getErrorMessage, notifyError } from './app/notify';
import { buildHistoryJumpOrderSearchTerm, createOrderSearchMatcher } from './app/orderSearch';
import { DashboardView } from './components/views/DashboardView';
import { CustomersView } from './components/views/CustomersView';
import { InventoryView } from './components/views/InventoryView';
import { OrdersView } from './components/views/OrdersView';
import { CreateOrEditOrderModal } from './components/modals/CreateOrEditOrderModal';
import { CustomerModal } from './components/modals/CustomerModal';
import { ProductModal } from './components/modals/ProductModal';
import { OrderHistoryModal } from './components/modals/OrderHistoryModal';
import { OrderDetailModal } from './components/modals/OrderDetailModal';
import { useUrlViewState } from './hooks/useUrlViewState';
import { useCustomersData } from './hooks/useCustomersData';
import { useProductsData } from './hooks/useProductsData';
import { useOrdersData } from './hooks/useOrdersData';
import { useOrderEditor } from './hooks/useOrderEditor';
import { useCustomerEditor } from './hooks/useCustomerEditor';
import { useProductEditor } from './hooks/useProductEditor';
import { createFieldSearchMatcher, useSearchFilter } from './hooks/useSearchFilter';

function App() {
  const { activeView, searchTerm, updateUrlAndState, handleViewChange, handleSearchChange } = useUrlViewState();

  const { customers, customersLoading, customersError, loadCustomers } = useCustomersData();
  const { products, productsLoading, productsError, loadProducts } = useProductsData();
  const { orders, ordersLoading, ordersError, loadOrders } = useOrdersData();

  const {
    isCreateOrderOpen,
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
    orderSubmitting,
    editingOrderId,
    openCreateOrder,
    closeOrderModal,
    openEditOrder,
    handleSubmitOrder,
    createEmptyOrderItemDraft,
    formatCurrencyText,
    sanitizeMoneyTextInput,
    normalizeMoneyTextToFixed2,
  } = useOrderEditor({
    customers,
    products,
    loadCustomers,
    loadOrders,
    loadProducts,
  });

  const {
    isCustomerModalOpen,
    editingCustomer,
    customerForm,
    setCustomerForm,
    customerSubmitting,
    openCreateCustomerModal,
    openEditCustomerModal,
    closeCustomerModal,
    handleSubmitCustomer,
  } = useCustomerEditor({
    loadCustomers,
  });

  const {
    isProductModalOpen,
    editingProduct,
    productForm,
    setProductForm,
    productSubmitting,
    openCreateProductModal,
    openEditProductModal,
    closeProductModal,
    handleSubmitProduct,
    handleDeleteProduct,
  } = useProductEditor({
    products,
    loadProducts,
  });

  const [detailOrder, setDetailOrder] = useState<Awaited<ReturnType<typeof api.orders.detail>> | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);
  const [historyOrders, setHistoryOrders] = useState<Awaited<ReturnType<typeof api.orders.list>>>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');


  const openCustomerHistory = async (customer: Customer) => {
    const customerId = Number(customer.id);
    if (!Number.isFinite(customerId)) {
      notifyError('当前客户不是后端数据，暂不支持查询订单历史。');
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
      setHistoryError(getErrorMessage(error, '加载订单历史失败'));
    } finally {
      setHistoryLoading(false);
    }
  };

  const openOrderDetail = async (orderId: string) => {
    const id = Number(orderId);
    if (!Number.isFinite(id)) {
      notifyError('当前订单不是后端数据，无法查看详情');
      return;
    }

    setDetailOrder(null);
    setDetailError('');
    setDetailLoading(true);
    try {
      const detail = await api.orders.detail(id);
      setDetailOrder(detail);
    } catch (error) {
      setDetailError(getErrorMessage(error, '加载订单详情失败'));
      setDetailOrder({
        order: { id, customer_id: 0, total_amount: 0, order_date: undefined, notes: null, extra_info: null },
        items: [],
      });
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    const id = Number(orderId);
    if (!Number.isFinite(id)) {
      notifyError('当前订单不是后端数据，无法删除');
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
      notifyError(getErrorMessage(error, '删除订单失败'));
    }
  };

  const jumpToOrder = (orderId: number) => {
    setHistoryCustomer(null);
    updateUrlAndState('orders', buildHistoryJumpOrderSearchTerm(orderId), true);
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

  const customerListWithStats = useMemo(() => {
    return customers.map((customer) => {
      const customerOrders = orders.filter((order) => order.customerId === customer.id);
      const totalSpent = customerOrders.reduce((sum, order) => sum + order.total, 0);
      const lastOrder = customerOrders.length > 0
        ? customerOrders.reduce((latest, current) => (current.date > latest.date ? current : latest))
        : null;

      return {
        ...customer,
        totalSpent,
        lastOrderDate: lastOrder ? lastOrder.date : '-',
      };
    });
  }, [customers, orders]);

  const customerSearchMatcher = useMemo(
    () => createFieldSearchMatcher<Customer>([
      (customer) => customer.name,
      (customer) => customer.phone,
      (customer) => customer.id,
    ]),
    [],
  );

  const productSearchMatcher = useMemo(
    () => createFieldSearchMatcher<Product>([
      (product) => product.name,
      (product) => product.sku,
      (product) => product.category,
      (product) => product.id,
    ]),
    [],
  );

  const customerPhoneById = useMemo(
    () => new Map(customers.map((customer) => [customer.id, customer.phone])),
    [customers],
  );

  const orderSearchMatcher = useMemo(
    () => createOrderSearchMatcher(customerPhoneById),
    [customerPhoneById],
  );

  const filteredCustomers = useSearchFilter({
    items: customerListWithStats,
    searchTerm,
    matcher: customerSearchMatcher,
  });

  const filteredProducts = useSearchFilter({
    items: products,
    searchTerm,
    matcher: productSearchMatcher,
  });

  const filteredOrders = useSearchFilter({
    items: orders,
    searchTerm,
    matcher: orderSearchMatcher,
  });

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

      <CreateOrEditOrderModal
        isOpen={isCreateOrderOpen}
        editingOrderId={editingOrderId}
        orderSubmitting={orderSubmitting}
        onClose={closeOrderModal}
        onSubmit={handleSubmitOrder}
        customers={customers}
        products={products}
        orderCustomerId={orderCustomerId}
        setOrderCustomerId={setOrderCustomerId}
        orderCustomerName={orderCustomerName}
        setOrderCustomerName={setOrderCustomerName}
        orderCustomerPhone={orderCustomerPhone}
        setOrderCustomerPhone={setOrderCustomerPhone}
        orderCustomerNotes={orderCustomerNotes}
        setOrderCustomerNotes={setOrderCustomerNotes}
        isCustomerPickerOpen={isCustomerPickerOpen}
        setIsCustomerPickerOpen={setIsCustomerPickerOpen}
        activeProductPickerIndex={activeProductPickerIndex}
        setActiveProductPickerIndex={setActiveProductPickerIndex}
        orderItems={orderItems}
        setOrderItems={setOrderItems}
        orderReceivedAmount={orderReceivedAmount}
        setOrderReceivedAmount={setOrderReceivedAmount}
        orderNotes={orderNotes}
        setOrderNotes={setOrderNotes}
        createEmptyOrderItemDraft={createEmptyOrderItemDraft}
        formatCurrencyText={formatCurrencyText}
        sanitizeMoneyTextInput={sanitizeMoneyTextInput}
        normalizeMoneyTextToFixed2={normalizeMoneyTextToFixed2}
      />

      <CustomerModal
        isOpen={isCustomerModalOpen}
        editingCustomer={editingCustomer}
        customerForm={customerForm}
        customerSubmitting={customerSubmitting}
        onClose={closeCustomerModal}
        onCustomerFormChange={setCustomerForm}
        onSubmit={handleSubmitCustomer}
      />

      <OrderHistoryModal
        historyCustomer={historyCustomer}
        historyOrders={historyOrders}
        historyLoading={historyLoading}
        historyError={historyError}
        onClose={() => setHistoryCustomer(null)}
        onJumpToOrder={jumpToOrder}
      />

      <ProductModal
        isOpen={isProductModalOpen}
        editingProduct={editingProduct}
        productForm={productForm}
        productSubmitting={productSubmitting}
        onClose={closeProductModal}
        onProductFormChange={setProductForm}
        onSubmit={handleSubmitProduct}
      />

      <OrderDetailModal
        detailOrder={detailOrder}
        detailLoading={detailLoading}
        detailError={detailError}
        onClose={() => setDetailOrder(null)}
      />
    </>
  );
}

export default App;