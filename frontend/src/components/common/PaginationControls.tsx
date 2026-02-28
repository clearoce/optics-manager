import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ListChecks } from 'lucide-react';
import type { ReactNode } from 'react';

type PaginationControlsProps = {
  idPrefix: string;
  pageStart: number;
  pageEnd: number;
  totalItems: number;
  pageSize: number;
  pageSizeOptions: readonly number[];
  onPageSizeChange: (pageSize: number) => void;
  currentPage: number;
  totalPages: number;
  onFirstPage: () => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  onLastPage: () => void;
  jumpPage: string;
  onJumpPageChange: (value: string) => void;
  onJump: () => void;
  leftExtra?: ReactNode;
};

export function PaginationControls({
  idPrefix,
  pageStart,
  pageEnd,
  totalItems,
  pageSize,
  pageSizeOptions,
  onPageSizeChange,
  currentPage,
  totalPages,
  onFirstPage,
  onPrevPage,
  onNextPage,
  onLastPage,
  jumpPage,
  onJumpPageChange,
  onJump,
  leftExtra,
}: PaginationControlsProps) {
  const pageSizeId = `${idPrefix}-page-size`;
  const jumpPageId = `${idPrefix}-jump-page`;

  return (
    <div className="border-t border-slate-200 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex items-center gap-1 text-xs text-slate-500">
          <ListChecks className="h-3.5 w-3.5" />
          显示 {pageStart}-{pageEnd} 条，共 {totalItems} 条
        </div>
        {leftExtra}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <label htmlFor={pageSizeId} className="text-slate-500 text-xs">
          每页
        </label>
        <select
          id={pageSizeId}
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          className="border border-slate-300 rounded-md px-2 py-1 text-sm"
        >
          {pageSizeOptions.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={onFirstPage}
          disabled={currentPage === 1}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-slate-300 text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
        >
          <ChevronsLeft className="h-3.5 w-3.5" />
          首页
        </button>
        <button
          type="button"
          onClick={onPrevPage}
          disabled={currentPage === 1}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-slate-300 text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          上一页
        </button>
        <span className="text-xs text-slate-600 min-w-[72px] text-center">第 {currentPage} / {totalPages} 页</span>
        <button
          type="button"
          onClick={onNextPage}
          disabled={currentPage >= totalPages}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-slate-300 text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
        >
          下一页
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onLastPage}
          disabled={currentPage >= totalPages}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-slate-300 text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
        >
          尾页
          <ChevronsRight className="h-3.5 w-3.5" />
        </button>
        <div className="flex items-center gap-1">
          <label htmlFor={jumpPageId} className="text-slate-500 text-xs">
            跳至
          </label>
          <input
            id={jumpPageId}
            type="number"
            min={1}
            max={totalPages}
            value={jumpPage}
            onChange={(event) => onJumpPageChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                onJump();
              }
            }}
            className="w-16 border border-slate-300 rounded-md px-2 py-1 text-xs"
          />
          <button
            type="button"
            onClick={onJump}
            className="px-2.5 py-1.5 rounded-md border border-slate-300 text-xs hover:bg-slate-50"
          >
            跳转
          </button>
        </div>
      </div>
    </div>
  );
}