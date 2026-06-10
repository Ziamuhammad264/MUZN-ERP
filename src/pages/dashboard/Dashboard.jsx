import React, { useEffect, useMemo, useState } from 'react';
import { usePermissions } from '../../hooks/usePermissions';
import {
  dashboardApi,
  employeesApi,
  motorbikesApi,
  assignmentsApi,
  profitLossApi,
  platformIncomeApi,
  expensesApi
} from '../../api/services';
import { toast } from '../../utils/notify.jsx';
import { apiMessage } from '../../api/axios';
import { KPICard } from '../../components/ui/KPICard';
import { DocumentExpiryBadge } from '../../components/ui/DocumentExpiryBadge';
import { formatCurrency } from '../../utils/formatters';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend
} from 'recharts';
import dayjs from 'dayjs';
import {
  Users,
  Bike,
  Wrench,
  AlertTriangle,
  TrendingUp,
  Coins,
  CreditCard,
  BadgeDollarSign,
  TrendingDown,
  Loader2,
  BookOpen
} from 'lucide-react';

const PIE_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#14B8A6'];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Normalize the monthly-trend payload (array or {data:[...]}) into chart rows.
const normalizeTrend = (payload) => {
  const rows = Array.isArray(payload) ? payload : payload?.data || [];
  return rows.map((r, i) => {
    const income = Number(r.income ?? r.total_income ?? r.revenue ?? 0);
    const expenses = Number(r.expenses ?? r.total_expenses ?? 0);
    const profit = Number(r.profit ?? r.net_profit ?? income - expenses);
    const m = r.month_name || r.month || MONTH_LABELS[i] || i + 1;
    const label = typeof m === 'number' ? MONTH_LABELS[m - 1] || m : m;
    return { month: label, Revenue: income, Expenses: expenses, Profit: profit };
  });
};

// Turn a { key: amount } map into [{ name, value }] sorted desc, dropping zeros.
const mapToSeries = (obj, valueKey = 'value') =>
  Object.entries(obj || {})
    .map(([name, v]) => ({ name, [valueKey]: Number(v) || 0 }))
    .filter((d) => d[valueKey] > 0)
    .sort((a, b) => b[valueKey] - a[valueKey]);

// Pick the first defined value from a list of candidate keys on an object.
const pick = (obj, ...keys) => {
  for (const k of keys) {
    if (obj && obj[k] !== undefined && obj[k] !== null && obj[k] !== '') return obj[k];
  }
  return undefined;
};

export const Dashboard = () => {
  const { isElevated } = usePermissions();

  const [overview, setOverview] = useState(null);
  const [alerts, setAlerts] = useState(null);
  const [empStats, setEmpStats] = useState(null);
  const [bikeStats, setBikeStats] = useState(null);
  const [assignStats, setAssignStats] = useState(null);
  const [summary, setSummary] = useState(null);
  const [trend, setTrend] = useState(null);
  const [platformStats, setPlatformStats] = useState(null);
  const [expenseStats, setExpenseStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const elevated = isElevated();

  useEffect(() => {
    let active = true;
    const month = dayjs().month() + 1;
    const year = dayjs().year();

    (async () => {
      setLoading(true);

      // Operational data is composed from the per-module stats endpoints (these
      // are the same ones the list pages use, so they're reliable) plus the
      // dashboard overview/alerts as supplementary sources.
      const [overviewData, alertsData, eStats, bStats, aStats] = await Promise.all([
        dashboardApi.overview().catch(() => null),
        dashboardApi.alerts().catch(() => null),
        employeesApi.stats().catch(() => null),
        motorbikesApi.stats().catch(() => null),
        assignmentsApi.stats().catch(() => null)
      ]);
      if (!active) return;
      setOverview(overviewData || {});
      setAlerts(alertsData || {});
      setEmpStats(eStats);
      setBikeStats(bStats);
      setAssignStats(aStats);
      setLoading(false);

      // Financial figures + analytics (owner/superadmin only — admins get 403).
      if (elevated) {
        profitLossApi.summary({ month, year }).then((d) => active && setSummary(d)).catch(() => {});
        profitLossApi.monthlyTrend({ year }).then((d) => active && setTrend(d)).catch(() => {});
        platformIncomeApi.stats({ month, year }).then((d) => active && setPlatformStats(d)).catch(() => {});
        expensesApi.stats({ month, year }).then((d) => active && setExpenseStats(d)).catch(() => {});
      }
    })();
    return () => {
      active = false;
    };
  }, [elevated]);

  // Operational KPIs — prefer the reliable per-module stats, fall back to the
  // dashboard overview, then 0.
  const ovOp = overview?.operational || {};
  const operational = {
    total_employees: empStats?.total ?? pick(ovOp, 'total_employees') ?? 0,
    active_employees: empStats?.active ?? pick(ovOp, 'active_employees') ?? 0,
    total_bikes: bikeStats?.total ?? pick(ovOp, 'total_bikes') ?? 0,
    available_bikes: bikeStats?.available ?? pick(ovOp, 'available_bikes') ?? 0,
    active_assignments:
      pick(assignStats || {}, 'active', 'total_active', 'active_assignments') ??
      pick(ovOp, 'active_assignments') ??
      0
  };

  // Financial KPIs — overview.financial, else the P&L summary for this month.
  const financial = overview?.financial
    ? overview.financial
    : summary
    ? {
        current_month_income: summary.income?.total_income ?? 0,
        current_month_expenses: summary.expenses?.total_expenses ?? 0,
        current_month_payroll: summary.expenses?.payroll ?? 0,
        net_profit: summary.net_profit ?? 0
      }
    : null;
  const showFinancial = !!financial && elevated;

  const trendData = useMemo(() => normalizeTrend(trend), [trend]);
  const emirateData = useMemo(() => mapToSeries(empStats?.by_emirate, 'count'), [empStats]);
  const platformData = useMemo(() => mapToSeries(platformStats?.by_platform, 'amount'), [platformStats]);
  const expenseData = useMemo(() => mapToSeries(expenseStats?.by_category, 'value'), [expenseStats]);

  const currentYear = dayjs().year();
  const tooltipStyle = { background: '#1E293B', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '11px' };
  const hasAnalytics =
    trendData.length > 0 || emirateData.length > 0 || platformData.length > 0 || expenseData.length > 0;

  // Flatten employee + bike document-expiry alerts into the action board.
  const expiryAlerts = useMemo(() => {
    if (!alerts) return [];
    const list = [];

    (alerts.employee_document_expiry || []).forEach((item) => {
      list.push({
        name: pick(item, 'employee_name', 'name') || '—',
        documentType: pick(item, 'document_type', 'type') || 'Document',
        expiryDate: pick(item, 'expiry_date', 'date'),
        daysRemaining: pick(item, 'days_remaining')
      });
    });

    (alerts.bike_document_expiry || []).forEach((item) => {
      list.push({
        name:
          pick(item, 'plate_number', 'bike_id', 'name') &&
          (pick(item, 'plate_number')
            ? `Plate ${pick(item, 'plate_number')}`
            : pick(item, 'bike_id', 'name')),
        documentType: pick(item, 'document_type', 'type') || 'Document',
        expiryDate: pick(item, 'expiry_date', 'date'),
        daysRemaining: pick(item, 'days_remaining')
      });
    });

    return list
      .filter((a) => a.name)
      .sort((a, b) => {
        const da = a.daysRemaining ?? Number.MAX_SAFE_INTEGER;
        const db = b.daysRemaining ?? Number.MAX_SAFE_INTEGER;
        return da - db;
      })
      .slice(0, 8);
  }, [alerts]);

  const upcomingMaintenance = useMemo(() => {
    if (!alerts) return [];
    return (alerts.upcoming_maintenance || []).map((item) => ({
      name:
        (pick(item, 'plate_number') ? `Plate ${pick(item, 'plate_number')}` : null) ||
        pick(item, 'bike_id', 'name') ||
        '—',
      type: pick(item, 'maintenance_type', 'type') || 'Service',
      date: pick(item, 'next_maintenance_date', 'maintenance_date', 'date'),
      daysRemaining: pick(item, 'days_remaining')
    }));
  }, [alerts]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-slate-400 dark:text-slate-500">
        <Loader2 className="animate-spin" size={28} />
        <span className="text-xs font-medium">Loading dashboard…</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5 md:space-y-6">
      {/* Welcome Title */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4 pb-3 sm:pb-4 border-b border-slate-200/50 dark:border-slate-800">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 font-heading">
            {showFinancial ? 'Financial & Operations Dashboard' : 'Fleet & Operations Dashboard'}
          </h1>
          <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
            Welcome back
          </p>
        </div>
        <div className="text-[10px] sm:text-xs font-semibold px-2.5 sm:px-3 py-1 rounded-full bg-brand-light/10 text-brand-light dark:bg-brand-dark/10 dark:text-brand-dark border border-brand-light/20 whitespace-nowrap self-start sm:self-auto">
          Mode: {showFinancial ? 'Owner' : 'Admin'}
        </div>
      </div>

      {/* Row 1: Workforce Metrics */}
      <h2 className="text-[10px] sm:text-xs font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider mb-2 select-none">
        Workforce Overview
      </h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
        <KPICard title="Total Employees" icon={Users} value={operational.total_employees ?? 0} />
        <KPICard title="Active Employees" icon={Users} value={operational.active_employees ?? 0} badge="Active" />
        <KPICard title="Active Assignments" icon={Bike} value={operational.active_assignments ?? 0} trend="In service" />
        <KPICard title="Available Bikes" icon={Bike} value={operational.available_bikes ?? 0} trend="Ready to assign" />
      </div>

      {/* Row 2: Fleet Metrics */}
      <h2 className="text-[10px] sm:text-xs font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider mt-4 sm:mt-5 md:mt-6 mb-2 select-none">
        Fleet Overview
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-2 sm:gap-3 md:gap-4">
        <KPICard title="Total Motorbikes" icon={Bike} value={operational.total_bikes ?? 0} />
        <KPICard title="Available Bikes" icon={Bike} value={operational.available_bikes ?? 0} trend="Ready to assign" />
        <KPICard title="Active Assignments" icon={Wrench} value={operational.active_assignments ?? 0} trend="In service" />
      </div>

      {/* Row 3: Financial Metrics (Owner / Superadmin only — absent for Admin) */}
      {showFinancial && (
        <>
          <h2 className="text-[10px] sm:text-xs font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider mt-4 sm:mt-5 md:mt-6 mb-2 select-none">
            Financial Ledger (This Month)
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
            <KPICard title="Current Month Income" icon={TrendingUp} value={formatCurrency(financial.current_month_income)} trend="This Month" />
            <KPICard title="Current Month Expenses" icon={TrendingDown} value={formatCurrency(financial.current_month_expenses)} trend="This Month" trendType="down" />
            <KPICard title="Current Month Payroll" icon={Coins} value={formatCurrency(financial.current_month_payroll)} />
            <KPICard
              title="Net Profit"
              icon={financial.net_profit >= 0 ? BadgeDollarSign : CreditCard}
              value={formatCurrency(financial.net_profit)}
              trend="This Month"
              trendType={financial.net_profit >= 0 ? 'up' : 'down'}
            />
          </div>
        </>
      )}

      {/* Analytics charts (real data from stats endpoints) */}
      {hasAnalytics && (
        <>
          <h2 className="text-[10px] sm:text-xs font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider mt-4 sm:mt-5 md:mt-6 mb-2 select-none">
            Analytics
          </h2>

          {showFinancial && trendData.length > 0 && (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 sm:p-4 md:p-5 shadow-sm">
              <h3 className="text-[10px] sm:text-xs font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider mb-3 md:mb-4">
                Revenue &amp; Profit Trend ({currentYear})
              </h3>
              <ResponsiveContainer width="100%" height={256}>
                <LineChart data={trendData}>
                  <XAxis dataKey="month" stroke="#888888" fontSize={9} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={9} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={tooltipStyle} />
                  <Legend verticalAlign="bottom" height={30} iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                  <Line type="monotone" dataKey="Revenue" stroke="#3B82F6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Expenses" stroke="#EF4444" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Profit" stroke="#10B981" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6 mt-3 sm:mt-4 md:mt-6">
            {emirateData.length > 0 && (
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 sm:p-4 md:p-5 shadow-sm">
                <h3 className="text-[10px] sm:text-xs font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider mb-3 md:mb-4">
                  Workforce by Emirate
                </h3>
                <ResponsiveContainer width="100%" height={256}>
                  <BarChart data={emirateData}>
                    <XAxis dataKey="name" stroke="#888888" fontSize={9} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={9} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {showFinancial && platformData.length > 0 && (
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 sm:p-4 md:p-5 shadow-sm">
                <h3 className="text-[10px] sm:text-xs font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider mb-3 md:mb-4">
                  Revenue by Platform (This Month)
                </h3>
                <ResponsiveContainer width="100%" height={256}>
                  <BarChart data={platformData}>
                    <XAxis dataKey="name" stroke="#888888" fontSize={9} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={9} tickLine={false} axisLine={false} />
                    <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={tooltipStyle} />
                    <Bar dataKey="amount" fill="#10B981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {showFinancial && expenseData.length > 0 && (
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 sm:p-4 md:p-5 shadow-sm">
                <h3 className="text-[10px] sm:text-xs font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider mb-3 md:mb-4">
                  Expenses by Category (This Month)
                </h3>
                <ResponsiveContainer width="100%" height={256}>
                  <PieChart>
                    <Pie data={expenseData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                      {expenseData.map((entry, index) => (
                        <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={tooltipStyle} />
                    <Legend verticalAlign="bottom" height={30} iconType="circle" wrapperStyle={{ fontSize: '9px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </>
      )}

      {/* Alerts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6 mt-4 sm:mt-5 md:mt-6">
        {/* Document Expiry Action Board */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 sm:p-4 md:p-5 shadow-sm">
          <h3 className="text-[10px] sm:text-xs font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider mb-3 md:mb-4">
            Document Expiry Action Board
          </h3>
          <div className="overflow-x-auto h-48 sm:h-56 md:h-64 custom-scrollbar">
            {expiryAlerts.length > 0 ? (
              <table className="w-full text-left text-[10px] sm:text-xs min-w-max sm:min-w-full">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700 text-slate-400 dark:text-slate-500 pb-2 sticky top-0 bg-white dark:bg-slate-800">
                    <th className="py-1.5 sm:py-2">Subject</th>
                    <th className="py-1.5 sm:py-2">Document</th>
                    <th className="py-1.5 sm:py-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {expiryAlerts.map((alert, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10">
                      <td className="py-1.5 sm:py-2.5 font-semibold text-slate-700 dark:text-slate-200 truncate">{alert.name}</td>
                      <td className="py-1.5 sm:py-2.5 text-slate-500 dark:text-slate-400 truncate">{alert.documentType}</td>
                      <td className="py-1.5 sm:py-2.5 text-right">
                        <DocumentExpiryBadge expiryDate={alert.expiryDate} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="h-full flex flex-col items-center justify-center gap-1.5 text-slate-400 dark:text-slate-500">
                <BookOpen size={18} />
                <span className="text-xs font-medium">No document expiry alerts</span>
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Maintenance */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 sm:p-4 md:p-5 shadow-sm">
          <h3 className="text-[10px] sm:text-xs font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider mb-3 md:mb-4">
            Upcoming Maintenance
          </h3>
          <div className="overflow-x-auto h-48 sm:h-56 md:h-64 custom-scrollbar">
            {upcomingMaintenance.length > 0 ? (
              <table className="w-full text-left text-[10px] sm:text-xs min-w-max sm:min-w-full">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700 text-slate-400 dark:text-slate-500 pb-2 sticky top-0 bg-white dark:bg-slate-800">
                    <th className="py-1.5 sm:py-2">Motorbike</th>
                    <th className="py-1.5 sm:py-2">Type</th>
                    <th className="py-1.5 sm:py-2 text-right">Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {upcomingMaintenance.map((m, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10">
                      <td className="py-1.5 sm:py-2.5 font-semibold text-slate-700 dark:text-slate-200 truncate">{m.name}</td>
                      <td className="py-1.5 sm:py-2.5 text-slate-500 dark:text-slate-400 truncate capitalize">
                        {String(m.type).replace(/_/g, ' ')}
                      </td>
                      <td className="py-1.5 sm:py-2.5 text-right">
                        <DocumentExpiryBadge expiryDate={m.date} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="h-full flex flex-col items-center justify-center gap-1.5 text-slate-400 dark:text-slate-500">
                <Wrench size={18} />
                <span className="text-xs font-medium">No upcoming maintenance</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* General alerts from the overview payload, when present */}
      {Array.isArray(overview?.alerts) && overview.alerts.length > 0 && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 sm:p-4 md:p-5 shadow-sm">
          <h3 className="text-[10px] sm:text-xs font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider mb-3 md:mb-4 flex items-center gap-1.5">
            <AlertTriangle size={13} className="text-amber-500" />
            Alerts
          </h3>
          <ul className="space-y-1.5">
            {overview.alerts.map((a, idx) => (
              <li key={idx} className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300">
                {typeof a === 'string' ? a : pick(a, 'message', 'title', 'description') || JSON.stringify(a)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
