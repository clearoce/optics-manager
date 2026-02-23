import type { ReactNode } from 'react';

type StatCardProps = {
  title: string;
  value: string;
  icon: ReactNode;
  tip: string;
};

export function StatCard({ title, value, icon, tip }: StatCardProps) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
        </div>
        <div className="p-3 bg-slate-100 rounded-full">{icon}</div>
      </div>
      <div className="mt-3 text-sm text-slate-500">{tip}</div>
    </div>
  );
}
