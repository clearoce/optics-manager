import { ChevronRight, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { Customer } from '../../types';
import { SearchBar } from '../common/SearchBar';

const PAGE_SIZE_OPTIONS = [9, 12] as const;

function formatRecordedAt(value: string) {
  if (!value) return '未填写时间';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString('zh-CN', { hour12: false });
}

function formatCreatedDate(value: string) {
  if (!value || value === '-') return '未知';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString('zh-CN');
}

function getLatestVisionRecord(customer: Customer) {
  if (customer.visionRecords.length === 0) {
    return null;
  }

  return customer.visionRecords.reduce((latest, current) => {
    const latestTime = latest.recordedAt ? new Date(latest.recordedAt).getTime() : Number.NEGATIVE_INFINITY;
    const currentTime = current.recordedAt ? new Date(current.recordedAt).getTime() : Number.NEGATIVE_INFINITY;

    if (!Number.isFinite(currentTime)) {
      return latest;
    }
    if (!Number.isFinite(latestTime) || currentTime > latestTime) {
      return current;
    }
    return latest;
  });
}

type CustomersViewProps = {
  filteredCustomers: Customer[];
  customersLoading: boolean;
  customersError: string;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onOpenCreateCustomer: () => void;
  onOpenEditCustomer: (customer: Customer) => void;
  onDeleteCustomer: (customer: Customer) => void;
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
  onDeleteCustomer,
  onOpenCustomerHistory,
}: CustomersViewProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(9);
  const [jumpPage, setJumpPage] = useState('1');

  const totalCustomers = filteredCustomers.length;
  const totalPages = Math.max(1, Math.ceil(totalCustomers / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const pagedCustomers = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredCustomers.slice(start, start + pageSize);
  }, [filteredCustomers, safeCurrentPage, pageSize]);

  const pageStart = totalCustomers === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const pageEnd = Math.min(safeCurrentPage * pageSize, totalCustomers);

  useEffect(() => {
    setJumpPage(String(safeCurrentPage));
  }, [safeCurrentPage]);

  const goToPage = (page: number) => {
    const targetPage = Math.min(totalPages, Math.max(1, page));
    setCurrentPage(targetPage);
  };

  const handleJumpToPage = () => {
    const parsed = Number.parseInt(jumpPage, 10);
    if (!Number.isFinite(parsed)) {
      setJumpPage(String(safeCurrentPage));
      return;
    }
    goToPage(parsed);
  };

  const handleSearchInput = (value: string) => {
    setCurrentPage(1);
    onSearchChange(value);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <div className="flex w-full sm:w-auto items-center justify-end gap-2">
          <SearchBar value={searchTerm} onChange={handleSearchInput} placeholder="搜索姓名、手机号或ID..." />
          <button
            onClick={onOpenCreateCustomer}
            className="h-10 px-4 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap inline-flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
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
        {pagedCustomers.map((customer) => {
          const latestRecord = getLatestVisionRecord(customer);

          return (
            <div
              key={customer.id}
              onClick={() => onOpenEditCustomer(customer)}
              className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all"
              title="点击编辑客户信息"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-bold">
                    {customer.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">{customer.name}</div>
                    <div className="text-sm text-slate-500">{customer.phone}</div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="text-right">
                    <div className="text-[11px] text-slate-500">累计消费</div>
                    <div className="text-base font-bold text-slate-900 leading-none">¥{customer.totalSpent.toFixed(2)}</div>
                  </div>
                </div>
              </div>

              <div className="mb-3">
                {!latestRecord ? (
                  <div className="bg-slate-50 rounded p-2 text-center text-xs text-slate-400">暂无验光记录</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[340px] text-xs text-slate-600 border border-slate-200 rounded-lg overflow-hidden">
                      <thead className="bg-slate-50 text-slate-500">
                        <tr>
                          <th className="px-2 py-1.5 font-medium border-b border-slate-200 text-center">眼别</th>
                          <th className="px-2 py-1.5 font-medium border-b border-slate-200 text-center">球镜(S)</th>
                          <th className="px-2 py-1.5 font-medium border-b border-slate-200 text-center">柱镜(C)</th>
                          <th className="px-2 py-1.5 font-medium border-b border-slate-200 text-center">轴位(A)</th>
                          <th className="px-2 py-1.5 font-medium border-b border-slate-200 text-center">瞳距(PD)</th>
                          <th className="px-2 py-1.5 font-medium border-b border-slate-200 text-center">视力(VA)</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="bg-white">
                          <td className="px-2 py-1.5 border-b border-slate-100 text-center">左眼</td>
                          <td className="px-2 py-1.5 border-b border-slate-100 text-center">{latestRecord.leftSphere.toFixed(2)}</td>
                          <td className="px-2 py-1.5 border-b border-slate-100 text-center">{latestRecord.leftCylinder.toFixed(2)}</td>
                          <td className="px-2 py-1.5 border-b border-slate-100 text-center">{latestRecord.leftAxis}</td>
                          <td className="px-2 py-1.5 border-b border-slate-100 text-center">{latestRecord.leftPD.toFixed(1)}</td>
                          <td className="px-2 py-1.5 border-b border-slate-100 text-center">{latestRecord.leftVisualAcuity.toFixed(1)}</td>
                        </tr>
                        <tr className="bg-white">
                          <td className="px-2 py-1.5 text-center">右眼</td>
                          <td className="px-2 py-1.5 text-center">{latestRecord.rightSphere.toFixed(2)}</td>
                          <td className="px-2 py-1.5 text-center">{latestRecord.rightCylinder.toFixed(2)}</td>
                          <td className="px-2 py-1.5 text-center">{latestRecord.rightAxis}</td>
                          <td className="px-2 py-1.5 text-center">{latestRecord.rightPD.toFixed(1)}</td>
                          <td className="px-2 py-1.5 text-center">{latestRecord.rightVisualAcuity.toFixed(1)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-6 gap-y-1">
                  <span>创建日期：{formatCreatedDate(customer.createdAt)}</span>
                  <span>最后验光日期：{latestRecord ? formatRecordedAt(latestRecord.recordedAt) : '暂无'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenCustomerHistory(customer);
                    }}
                    className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 inline-flex items-center"
                    title="查看历史订单"
                  >
                    <ChevronRight className="h-3 w-3 mr-1" />
                    查看历史订单
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteCustomer(customer);
                    }}
                    className="text-xs px-2 py-1 rounded bg-rose-100 text-rose-700 hover:bg-rose-200 inline-flex items-center"
                    title="删除"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    删除
                  </button>
                </div>
              </div>
            </div>
          );
        })}
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
              onClick={() => goToPage(1)}
              disabled={safeCurrentPage === 1}
              className="px-2.5 py-1.5 rounded-md border border-slate-300 text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
            >
              首页
            </button>
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
            <button
              type="button"
              onClick={() => goToPage(totalPages)}
              disabled={safeCurrentPage >= totalPages}
              className="px-2.5 py-1.5 rounded-md border border-slate-300 text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
            >
              尾页
            </button>
            <div className="flex items-center gap-1">
              <label htmlFor="customers-jump-page" className="text-slate-500 text-xs">
                跳至
              </label>
              <input
                id="customers-jump-page"
                type="number"
                min={1}
                max={totalPages}
                value={jumpPage}
                onChange={(event) => setJumpPage(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    handleJumpToPage();
                  }
                }}
                className="w-16 border border-slate-300 rounded-md px-2 py-1 text-xs"
              />
              <button
                type="button"
                onClick={handleJumpToPage}
                className="px-2.5 py-1.5 rounded-md border border-slate-300 text-xs hover:bg-slate-50"
              >
                跳转
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
