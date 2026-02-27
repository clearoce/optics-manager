import { ChevronRight, Edit, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { Customer } from '../../types';
import { SearchBar } from '../common/SearchBar';

const PAGE_SIZE_OPTIONS = [9, 12] as const;

type CustomersViewProps = {
  filteredCustomers: Customer[];
  customersLoading: boolean;
  customersError: string;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onOpenCreateCustomer: () => void;
  onOpenEditCustomer: (customer: Customer) => void;
  onOpenCustomerHistory: (customer: Customer) => void;
};

export function CustomersView({
  filteredCustomers,
  customersLoading,
  customersError,
  searchTerm,
  onSearchChange,
  onOpenCreateCustomer,
  onOpenEditCustomer,
  onOpenCustomerHistory,
}: CustomersViewProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(12);

  const totalCustomers = filteredCustomers.length;
  const totalPages = Math.max(1, Math.ceil(totalCustomers / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const pagedCustomers = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredCustomers.slice(start, start + pageSize);
  }, [filteredCustomers, safeCurrentPage, pageSize]);

  const pageStart = totalCustomers === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const pageEnd = Math.min(safeCurrentPage * pageSize, totalCustomers);

  const handleSearchInput = (value: string) => {
    setCurrentPage(1);
    onSearchChange(value);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-900">客户列表</h2>
        <div className="flex w-full sm:w-auto gap-2">
          <SearchBar value={searchTerm} onChange={handleSearchInput} placeholder="搜索姓名、手机号或ID..." />
          <button
            onClick={onOpenCreateCustomer}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 whitespace-nowrap inline-flex items-center"
          >
            <Plus className="h-4 w-4 mr-1" />
            新客户
          </button>
        </div>
      </div>
      {customersLoading && <div className="text-sm text-slate-500">正在加载客户数据...</div>}
      {customersError && (
        <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          接口加载失败，当前展示本地 mock 数据：{customersError}
        </div>
      )}
      {!customersLoading && filteredCustomers.length === 0 && (
        <div className="text-sm text-slate-500 bg-white border border-slate-200 rounded-lg px-3 py-2">暂无客户数据</div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {pagedCustomers.map((customer) => (
          <div
            key={customer.id}
            onClick={() => onOpenCustomerHistory(customer)}
            className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all group"
            title="点击查看该客户订单历史"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-bold">
                  {customer.name.charAt(0)}
                </div>
                <div>
                  <div className="font-semibold text-slate-900">{customer.name}</div>
                  <div className="text-sm text-slate-500">{customer.phone}</div>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenEditCustomer(customer);
                }}
                className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 inline-flex items-center"
                title="编辑"
              >
                <Edit className="h-3 w-3 mr-1" />
                编辑
              </button>
            </div>
            <div className="text-xs text-slate-500 grid grid-cols-3 gap-2 mb-3">
              <span className="bg-slate-50 rounded p-1 text-center">{customer.customField1 || '-'}</span>
              <span className="bg-slate-50 rounded p-1 text-center">{customer.customField2 || '-'}</span>
              <span className="bg-slate-50 rounded p-1 text-center">{customer.customField3 || '-'}</span>
            </div>
            <div className="text-sm text-slate-600">累计消费</div>
            <div className="text-lg font-bold text-slate-900">¥{customer.totalSpent.toFixed(2)}</div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-center text-xs text-blue-600 font-medium items-center opacity-0 group-hover:opacity-100 transition-opacity">
              查看订单历史 <ChevronRight className="h-3 w-3 ml-1" />
            </div>
          </div>
        ))}
      </div>
      {totalCustomers > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-xs text-slate-500">
            显示 {pageStart}-{pageEnd} 条，共 {totalCustomers} 条
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <label htmlFor="customers-page-size" className="text-slate-500 text-xs">
              每页
            </label>
            <select
              id="customers-page-size"
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value) as (typeof PAGE_SIZE_OPTIONS)[number]);
                setCurrentPage(1);
              }}
              className="border border-slate-300 rounded-md px-2 py-1 text-sm"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={safeCurrentPage === 1}
              className="px-2.5 py-1.5 rounded-md border border-slate-300 text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
            >
              上一页
            </button>
            <span className="text-xs text-slate-600 min-w-[72px] text-center">
              第 {safeCurrentPage} / {totalPages} 页
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              disabled={safeCurrentPage >= totalPages}
              className="px-2.5 py-1.5 rounded-md border border-slate-300 text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
            >
              下一页
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
