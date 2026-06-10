import React, { useMemo } from 'react';
import { profitLossApi } from '../../api/services';
import { apiMessage } from '../../api/axios';
import { useFetch } from '../../hooks/useApi';
import { toast } from '../../utils/notify';
import { PageHeader } from '../../components/ui/PageHeader';
import { SectionCard } from '../../components/ui/SectionCard';
import { formatCurrency } from '../../utils/formatters';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { Printer, TrendingUp, TrendingDown, DollarSign, Loader2 } from 'lucide-react';
import dayjs from 'dayjs';

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' }
];

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Build the last 6 years (descending) for the year selector.
const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => dayjs().year() - i);

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// Pull a numeric value from a record by trying several candidate keys.
const pick = (obj, keys) => {
  for (const k of keys) {
    if (obj?.[k] !== undefined && obj?.[k] !== null) return num(obj[k]);
  }
  return 0;
};

// Normalize the (loosely-documented) monthly-trend payload into recharts rows.
const normalizeTrend = (payload) => {
  const list = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];
  return list.map((row, i) => {
    const income = pick(row, ['income', 'total_income', 'revenue', 'Revenue']);
    const expenses = pick(row, ['expenses', 'total_expenses', 'Expenses']);
    const profit = row?.profit ?? row?.net_profit ?? row?.Profit;
    const monthNum = num(row?.month) || i + 1;
    const label = row?.month_name || row?.label || MONTH_LABELS[(monthNum - 1) % 12] || String(monthNum);
    return {
      month: label,
      Revenue: income,
      Expenses: expenses,
      Profit: profit !== undefined && profit !== null ? num(profit) : income - expenses
    };
  });
};

export const ProfitLoss = () => {
  const [month, setMonth] = React.useState(dayjs().month() + 1);
  const [year, setYear] = React.useState(dayjs().year());

  // Summary for the selected period.
  const { data: summary, loading: summaryLoading } = useFetch(
    () =>
      profitLossApi.summary({ month, year }).catch((err) => {
        toast.error(apiMessage(err));
        throw err;
      }),
    [month, year]
  );

  // 12-month income vs expenses trend for the selected year.
  const { data: trendRaw, loading: trendLoading } = useFetch(
    () =>
      profitLossApi.monthlyTrend({ year }).catch((err) => {
        toast.error(apiMessage(err));
        throw err;
      }),
    [year]
  );

  const income = summary?.income || {};
  const expenses = summary?.expenses || {};
  const totalIncome = num(income.total_income);
  const totalExpenses = num(expenses.total_expenses);
  const netProfit = summary ? num(summary.net_profit) : totalIncome - totalExpenses;
  // profit_margin arrives as a string like "30.5%"; render as-is when present.
  const profitMargin = summary?.profit_margin;

  const trendData = useMemo(() => normalizeTrend(trendRaw), [trendRaw]);

  const handlePrint = () => {
    window.print();
  };

  const selectClass =
    'bg-transparent font-semibold focus:outline-none cursor-pointer pr-1 text-xs';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profit & Loss Statement"
        subtitle="Review corporate revenues, operations costs, driver payroll outflows, and net business margins."
        actions={
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-light dark:bg-brand-dark hover:opacity-95 text-white font-semibold rounded-lg shadow-sm text-xs transition-all"
          >
            <Printer size={13} />
            <span>Print Statement</span>
          </button>
        }
      />

      {/* Period selectors */}
      <div className="flex items-center flex-wrap gap-2">
        <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300">
          <span className="font-medium hidden sm:inline">Month:</span>
          <select
            className={selectClass}
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
          >
            {MONTHS.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-white dark:bg-slate-800">
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300">
          <span className="font-medium hidden sm:inline">Year:</span>
          <select
            className={selectClass}
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {YEAR_OPTIONS.map((y) => (
              <option key={y} value={y} className="bg-white dark:bg-slate-800">
                {y}
              </option>
            ))}
          </select>
        </div>
        {(summaryLoading || trendLoading) && (
          <span className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
            <Loader2 size={13} className="animate-spin" />
            Loading…
          </span>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 rounded-xl text-left flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] text-slate-450 uppercase font-bold tracking-wider">Total Operating Revenue</span>
            <p className="text-xl font-bold text-slate-850 dark:text-slate-100 mt-1">{formatCurrency(totalIncome)}</p>
          </div>
          <TrendingUp size={28} className="text-emerald-500" />
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 rounded-xl text-left flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] text-slate-450 uppercase font-bold tracking-wider">Total Operating Costs</span>
            <p className="text-xl font-bold text-rose-500 mt-1">{formatCurrency(totalExpenses)}</p>
          </div>
          <TrendingDown size={28} className="text-rose-500" />
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 rounded-xl text-left flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] text-slate-450 uppercase font-bold tracking-wider">Net Operating Profit</span>
            <p className={`text-xl font-bold mt-1 ${netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(netProfit)}</p>
          </div>
          <DollarSign size={28} className="text-emerald-500" />
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 rounded-xl text-left flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] text-slate-450 uppercase font-bold tracking-wider">Profit Margin</span>
            <p className="text-xl font-bold text-slate-850 dark:text-slate-100 mt-1">{profitMargin ?? '—'}</p>
          </div>
          <TrendingUp size={28} className="text-blue-500" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left pane: Financial statement tables */}
        <div className="lg:col-span-2 space-y-6">
          <SectionCard title="Corporate Financial Statement (AED)">
            {summaryLoading ? (
              <div className="h-64 flex items-center justify-center text-slate-400 dark:text-slate-500">
                <Loader2 size={20} className="animate-spin mr-2" />
                <span className="text-xs font-semibold">Loading statement…</span>
              </div>
            ) : !summary ? (
              <div className="h-64 flex items-center justify-center text-center text-xs text-slate-400 dark:text-slate-500 font-semibold">
                No profit &amp; loss data available for the selected period.
              </div>
            ) : (
              <div className="space-y-6 text-xs text-left">

                {/* Revenue Section */}
                <div className="space-y-2">
                  <h3 className="font-bold text-slate-800 dark:text-slate-200 border-b pb-1 uppercase tracking-wider text-[10px]">
                    1. Revenue / Operating Income
                  </h3>
                  <div className="space-y-1.5 pl-2 text-slate-600 dark:text-slate-350">
                    <div className="flex justify-between">
                      <span>Aggregator Platform Settlements</span>
                      <span className="font-semibold">{formatCurrency(income.platform_income)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Direct Collections from Riders</span>
                      <span className="font-semibold">{formatCurrency(income.rider_income)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-slate-850 dark:text-slate-100 border-t pt-1.5 text-xs">
                      <span>TOTAL REVENUE</span>
                      <span>{formatCurrency(totalIncome)}</span>
                    </div>
                  </div>
                </div>

                {/* Operating Expenses Section */}
                <div className="space-y-2">
                  <h3 className="font-bold text-slate-800 dark:text-slate-205 border-b pb-1 uppercase tracking-wider text-[10px]">
                    2. Cost of Sales &amp; General Expenses
                  </h3>
                  <div className="space-y-1.5 pl-2 text-slate-600 dark:text-slate-350">
                    <div className="flex justify-between">
                      <span>Rider &amp; Staff Payroll Cost</span>
                      <span className="font-semibold">{formatCurrency(expenses.payroll)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Operational Expenses</span>
                      <span className="font-semibold">{formatCurrency(expenses.operational_expenses)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Loan Disbursements</span>
                      <span className="font-semibold">{formatCurrency(expenses.loan_disbursements)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Fines</span>
                      <span className="font-semibold">{formatCurrency(expenses.fines)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Fleet Maintenance &amp; Repairs</span>
                      <span className="font-semibold">{formatCurrency(expenses.maintenance)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-slate-850 dark:text-slate-100 border-t pt-1.5 text-xs">
                      <span>TOTAL EXPENSES</span>
                      <span>-{formatCurrency(totalExpenses)}</span>
                    </div>
                  </div>
                </div>

                {/* Net Profit Section */}
                <div className="border-t-2 border-slate-300 pt-3 flex justify-between font-bold text-sm bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border">
                  <span className="text-slate-800 dark:text-slate-200">
                    NET DISBURSED PROFIT
                    {profitMargin ? <span className="ml-2 font-semibold text-slate-400">({profitMargin})</span> : null}
                  </span>
                  <span className={netProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}>
                    {formatCurrency(netProfit)}
                  </span>
                </div>

              </div>
            )}
          </SectionCard>
        </div>

        {/* Right pane: trend chart */}
        <div className="lg:col-span-1 space-y-6">
          <SectionCard title={`Revenue & Profit Monthly Trend (${year})`}>
            <div className="h-64 flex justify-center items-center">
              {trendLoading ? (
                <div className="flex items-center text-slate-400 dark:text-slate-500">
                  <Loader2 size={20} className="animate-spin mr-2" />
                  <span className="text-xs font-semibold">Loading trend…</span>
                </div>
              ) : trendData.length === 0 ? (
                <span className="text-center text-xs text-slate-400 dark:text-slate-500 font-semibold">
                  No trend data available for {year}.
                </span>
              ) : (
                <ResponsiveContainer width="100%" height={256}>
                  <LineChart data={trendData}>
                    <XAxis dataKey="month" stroke="#888888" fontSize={9} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={9} tickLine={false} axisLine={false} />
                    <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ background: '#1E293B', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '11px' }} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                    <Line type="monotone" dataKey="Revenue" stroke="#3B82F6" strokeWidth={2} />
                    <Line type="monotone" dataKey="Expenses" stroke="#EF4444" strokeWidth={2} />
                    <Line type="monotone" dataKey="Profit" stroke="#10B981" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </SectionCard>
        </div>

      </div>

    </div>
  );
};
