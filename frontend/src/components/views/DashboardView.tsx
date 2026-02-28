import { useMemo, useState } from 'react';
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
  type ChartOptions,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Package, Users } from 'lucide-react';
import type { Customer, Order, Product } from '../../types';
import { StatCard } from '../common/StatCard';

type DashboardViewProps = {
  products: Product[];
  orders: Order[];
  customers: Customer[];
};

const RECENT_DAYS = 15;
const MAX_AXIS_LABELS = 30;

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

const formatDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const addDays = (date: Date, offset: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() + offset);
  return result;
};

const getDefaultRange = () => {
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  const start = addDays(end, -(RECENT_DAYS - 1));

  return {
    start: formatDateKey(start),
    end: formatDateKey(end),
  };
};

const buildDateKeys = (startDate: string, endDate: string) => {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return [];

  const keys: string[] = [];
  for (let cursor = new Date(start); cursor <= end; cursor = addDays(cursor, 1)) {
    keys.push(formatDateKey(cursor));
  }
  return keys;
};

const formatAxisDate = (value: string) => value.slice(5).replace('-', '/');

const normalizeOrderDate = (value: string) => {
  if (!value || value === '-') return null;

  const directMatch = value.match(/^(\d{4}-\d{2}-\d{2})/);
  if (directMatch) return directMatch[1];

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function DashboardView({ products, orders, customers }: DashboardViewProps) {
  const defaultRange = useMemo(() => getDefaultRange(), []);
  const [startDate, setStartDate] = useState(defaultRange.start);
  const [endDate, setEndDate] = useState(defaultRange.end);

  const hasInvalidRange = startDate > endDate;

  const dateKeys = useMemo(() => {
    if (hasInvalidRange) return [];
    return buildDateKeys(startDate, endDate);
  }, [startDate, endDate, hasInvalidRange]);

  const dailyRevenue = useMemo(() => {
    const bucket = new Map<string, number>();

    orders.forEach((order) => {
      const day = normalizeOrderDate(order.date);
      if (!day) return;
      bucket.set(day, (bucket.get(day) ?? 0) + order.total);
    });

    return dateKeys.map((date) => ({
      date,
      total: bucket.get(date) ?? 0,
    }));
  }, [orders, dateKeys]);

  const axisLabelStep = useMemo(() => {
    if (dailyRevenue.length <= MAX_AXIS_LABELS) return 1;
    return Math.ceil(dailyRevenue.length / MAX_AXIS_LABELS);
  }, [dailyRevenue.length]);

  const hasExceededAxisLimit = axisLabelStep > 1;

  const maxDailyRevenue = useMemo(() => {
    if (dailyRevenue.length === 0) return 0;
    return Math.max(...dailyRevenue.map((item) => item.total));
  }, [dailyRevenue]);

  const rangeTotalRevenue = useMemo(() => {
    return dailyRevenue.reduce((sum, item) => sum + item.total, 0);
  }, [dailyRevenue]);

  const chartData = useMemo(
    () => ({
      labels: dailyRevenue.map((item) => item.date),
      datasets: [
        {
          label: '日收入',
          data: dailyRevenue.map((item) => item.total),
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37, 99, 235, 0.15)',
          borderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 5,
          tension: 0.25,
          fill: true,
        },
      ],
    }),
    [dailyRevenue],
  );

  const chartOptions = useMemo<ChartOptions<'line'>>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (contexts) => {
              const label = contexts[0]?.label;
              return typeof label === 'string' ? label : '';
            },
            label: (context) => [
              `收入：¥${Number(context.parsed.y).toLocaleString()}`,
            ],
          },
        },
      },
      scales: {
        x: {
          ticks: {
            autoSkip: false,
            maxRotation: 45,
            minRotation: 45,
            callback: (_, index) => {
              const item = dailyRevenue[index];
              if (!item) return '';

              const isBoundary = index === 0 || index === dailyRevenue.length - 1;
              if (axisLabelStep > 1 && !isBoundary && index % axisLabelStep !== 0) return '';

              return formatAxisDate(item.date);
            },
          },
          grid: { display: false },
        },
        y: {
          beginAtZero: true,
          ticks: {
            callback: (value) => `¥${Number(value).toLocaleString()}`,
          },
        },
      },
    }),
    [axisLabelStep, dailyRevenue],
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="商品总数"
          value={products.length.toString()}
          icon={<Package className="h-6 w-6 text-amber-600" />}
          tip="已录入系统的商品数量"
        />
        <StatCard
          title="订单总数"
          value={orders.length.toString()}
          icon={<Package className="h-6 w-6 text-blue-600" />}
          tip="系统记录的所有订单"
        />
        <StatCard
          title="客户总数"
          value={customers.length.toString()}
          icon={<Users className="h-6 w-6 text-indigo-600" />}
          tip="已注册客户数"
        />
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">收入趋势（日）</h3>
            <p className="text-sm text-slate-500">最小统计单位：日</p>
          </div>
          <div className="flex flex-wrap items-end gap-2 text-sm">
            <label className="flex flex-col gap-1 text-slate-600">
              <span>起始日期</span>
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="px-2.5 py-1.5 border border-slate-300 rounded-md outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>
            <label className="flex flex-col gap-1 text-slate-600">
              <span>结束日期</span>
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="px-2.5 py-1.5 border border-slate-300 rounded-md outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>
          </div>
        </div>

        {hasInvalidRange ? (
          <p className="text-sm text-rose-500">结束日期不能早于起始日期。</p>
        ) : dailyRevenue.length > 0 ? (
          <div className="space-y-3">
            {hasExceededAxisLimit ? (
              <p className="text-xs text-amber-600">
                当前选择区间较长，为保证可读性，横轴最多展示约 {MAX_AXIS_LABELS} 个日期标签（数据点仍完整保留）。
              </p>
            ) : null}
            <div className="h-72 w-full rounded-lg border border-slate-200 bg-slate-50 p-4">
              <Line data={chartData} options={chartOptions} />
            </div>

            <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
              <span>{dailyRevenue[0].date}</span>
              <span>最高日收入：¥{maxDailyRevenue.toFixed(2)}</span>
              <span>区间总收入：¥{rangeTotalRevenue.toLocaleString()}</span>
              <span>{dailyRevenue[dailyRevenue.length - 1].date}</span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500 italic">暂无订单收入数据。</p>
        )}
      </div>
    </div>
  );
}
