import { useMemo } from 'react';
import { LayoutDashboard, Moon, Package, ShoppingCart, Sun, Users } from 'lucide-react';
import { useTheme } from 'next-themes';
import { api } from './services/api';
import type { Customer, Product, View } from './types';
import { getErrorMessage, notifyError } from './app/notify';
import { createOrderSearchMatcher } from './app/orderSearch';
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
import { useOrderInteractions } from './hooks/useOrderInteractions';
import { createFieldSearchMatcher, useSearchFilter } from './hooks/useSearchFilter';

function App() {
  const { resolvedTheme, setTheme } = useTheme();
  const { activeView, searchTerm, updateUrlAndState, handleViewChange, handleSearchChange } = useUrlViewState();
  const isDarkMode = resolvedTheme === 'dark';

  const toggleThemeMode = () => {
    setTheme(isDarkMode ? 'light' : 'dark');
  };

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
    orderVisionRecords,
    setOrderVisionRecords,
    setOrderVisionRecordsTouched,
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
    createEmptyVisionRecordForm,
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
    handleDeleteCustomer,
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
  } = useProductEditor({
    loadProducts,
  });

  const {
    detailOrder,
    detailLoading,
    detailError,
    setDetailOrder,
    openOrderDetail,
    historyCustomer,
    historyOrders,
    historyLoading,
    historyError,
    setHistoryCustomer,
    openCustomerHistory,
    exactOrderId,
    exactCustomerId,
    jumpToOrder,
    jumpToCustomerFromOrder,
    handleBulkDeleteOrders,
    handleOrderSearchChange,
    handleCustomerSearchChange,
  } = useOrderInteractions({
    activeView,
    handleSearchChange,
    updateUrlAndState,
    loadOrders,
  });

  const handleBulkDeleteProducts = async (productIds: string[]) => {
    const ids = Array.from(new Set(productIds.map((id) => Number(id)).filter((id) => Number.isFinite(id))));
    if (ids.length === 0) {
      notifyError('未选择有效商品，无法批量删除');
      return;
    }

    const firstConfirm = window.confirm(`确认删除已选中的 ${ids.length} 个商品吗？`);
    if (!firstConfirm) {
      return;
    }

    const secondConfirm = window.confirm('这是不可恢复操作，请再次确认要批量删除这些商品。');
    if (!secondConfirm) {
      return;
    }

    try {
      let failedCount = 0;

      for (const id of ids) {
        try {
          await api.products.remove(id);
        } catch {
          failedCount += 1;
        }
      }

      await loadProducts();
      if (failedCount > 0) {
        notifyError(`批量删除商品部分失败：成功 ${ids.length - failedCount} 条，失败 ${failedCount} 条`);
      }
    } catch (error) {
      notifyError(getErrorMessage(error, '批量删除商品失败'));
    }
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
    customers: '客户列表',
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
      (product) => product.id,
    ]),
    [],
  );

  const orderSearchMatcher = useMemo(
    () => createOrderSearchMatcher(),
    [],
  );

  const searchedCustomers = useSearchFilter({
    items: customerListWithStats,
    searchTerm,
    matcher: customerSearchMatcher,
  });

  const filteredCustomers = useMemo(() => {
    if (!exactCustomerId) return searchedCustomers;
    return searchedCustomers.filter((customer) => customer.id === exactCustomerId);
  }, [searchedCustomers, exactCustomerId]);

  const filteredProducts = useSearchFilter({
    items: products,
    searchTerm,
    matcher: productSearchMatcher,
  });

  const searchedOrders = useSearchFilter({
    items: orders,
    searchTerm,
    matcher: orderSearchMatcher,
  });

  const filteredOrders = useMemo(() => {
    if (!exactOrderId) return searchedOrders;
    return searchedOrders.filter((order) => order.id === exactOrderId);
  }, [searchedOrders, exactOrderId]);

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
            onBulkDeleteProducts={handleBulkDeleteProducts}
          />
        );
      case 'orders':
        return (
          <OrdersView
            orders={orders}
            filteredOrders={filteredOrders}
            searchTerm={searchTerm}
            onSearchChange={handleOrderSearchChange}
            ordersLoading={ordersLoading}
            ordersError={ordersError}
            onOpenOrderDetail={openOrderDetail}
            onJumpToCustomer={jumpToCustomerFromOrder}
            onOpenEditOrder={openEditOrder}
            onBulkDeleteOrders={handleBulkDeleteOrders}
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
            onSearchChange={handleCustomerSearchChange}
            onOpenCreateCustomer={openCreateCustomerModal}
            onOpenEditCustomer={openEditCustomerModal}
            onDeleteCustomer={handleDeleteCustomer}
            onOpenCustomerHistory={openCustomerHistory}
          />
        );
      default:
        return <DashboardView products={products} orders={orders} customers={customers} />;
    }
  };

  const themeBridgeClassName = [
    "dark:[&_[class*='bg-white']]:bg-slate-900",
    "dark:[&_[class*='bg-slate-50']]:bg-slate-800",
    "dark:[&_[class*='text-slate-900']]:text-slate-100",
    "dark:[&_[class*='text-slate-800']]:text-slate-200",
    "dark:[&_[class*='text-slate-700']]:text-slate-300",
    "dark:[&_[class*='text-slate-600']]:text-slate-300",
    "dark:[&_[class*='text-slate-500']]:text-slate-400",
    "dark:[&_[class*='text-slate-400']]:text-slate-500",
    "dark:[&_[class*='border-slate-100']]:border-slate-700",
    "dark:[&_[class*='border-slate-200']]:border-slate-700",
    "dark:[&_[class*='border-slate-300']]:border-slate-600",
    'dark:[&_input]:bg-slate-900 dark:[&_input]:text-slate-100 dark:[&_input]:border-slate-600',
    'dark:[&_select]:bg-slate-900 dark:[&_select]:text-slate-100 dark:[&_select]:border-slate-600',
    'dark:[&_textarea]:bg-slate-900 dark:[&_textarea]:text-slate-100 dark:[&_textarea]:border-slate-600',
  ].join(' ');

  return (
    <div className={themeBridgeClassName}>
      <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex">
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
          <header className="h-16 bg-white border-b border-slate-200 dark:bg-slate-900 dark:border-slate-700 flex items-center justify-between px-4 sm:px-6 lg:px-8">
            <h2 className="text-lg sm:text-xl font-semibold text-slate-900">{titleMap[activeView]}</h2>
            <button
              type="button"
              onClick={toggleThemeMode}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-600 border border-slate-300 rounded-lg bg-white hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
              title={isDarkMode ? '切换到日间模式' : '切换到夜间模式'}
              aria-label={isDarkMode ? '切换到日间模式' : '切换到夜间模式'}
            >
              {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              {isDarkMode ? '日间模式' : '夜间模式'}
            </button>
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
        orderVisionRecords={orderVisionRecords}
        setOrderVisionRecords={setOrderVisionRecords}
        setOrderVisionRecordsTouched={setOrderVisionRecordsTouched}
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
        createEmptyVisionRecordForm={createEmptyVisionRecordForm}
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
    </div>
  );
}

export default App;