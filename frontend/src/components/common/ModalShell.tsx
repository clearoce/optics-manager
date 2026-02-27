import type { ReactNode } from 'react';
import { X } from 'lucide-react';

type ModalShellProps = {
  children: ReactNode;
  containerClassName?: string;
};

export function ModalShell({ children, containerClassName = '' }: ModalShellProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className={`bg-white rounded-xl shadow-2xl w-full overflow-hidden ${containerClassName}`.trim()}>
        {children}
      </div>
    </div>
  );
}

type ModalHeaderProps = {
  title: string;
  icon?: ReactNode;
  subtitle?: ReactNode;
  onClose: () => void;
  closeAriaLabel?: string;
  closeTitle?: string;
  className?: string;
};

export function ModalHeader({
  title,
  icon,
  subtitle,
  onClose,
  closeAriaLabel = '关闭弹窗',
  closeTitle = '关闭',
  className = 'px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50',
}: ModalHeaderProps) {
  return (
    <div className={className}>
      <div>
        <h3 className="text-lg font-bold text-slate-900 flex items-center">
          {icon}
          {title}
        </h3>
        {subtitle}
      </div>
      <button
        onClick={onClose}
        className="text-slate-400 hover:text-slate-600"
        aria-label={closeAriaLabel}
        title={closeTitle}
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}
