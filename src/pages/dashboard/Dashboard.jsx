import React, { useEffect, useMemo, useState } from 'react';
import { usePermissions } from '../../hooks/usePermissions';
import { dashboardApi } from '../../api/services';
import { toast } from '../../utils/notify.jsx';
import { apiMessage } from '../../api/axios';
import { KPICard } from '../../components/ui/KPICard';
import { DocumentExpiryBadge } from '../../components/ui/DocumentExpiryBadge';
import { formatCurrency } from '../../utils/formatters';
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const [overviewData, alertsData] = await Promise.all([
          dashboardApi.overview(),
          dashboardApi.alerts()
        ]);
        if (!active) return;
        setOverview(overviewData || {});
        setAlerts(alertsData || {});
      } catch (err) {
        if (active) toast.error(apiMessage(err));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const operational = overview?.operational || {};
  const financial = overview?.financial; // undefined for admin role
  const showFinancial = !!financial && isElevated();

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
