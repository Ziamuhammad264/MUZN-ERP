import React, { useState } from 'react';
import { usePermissions } from '../../hooks/usePermissions';
import { reportsApi } from '../../api/services';
import { apiMessage } from '../../api/axios';
import { PageHeader } from '../../components/ui/PageHeader';
import { SectionCard } from '../../components/ui/SectionCard';
import { ExportButton } from '../../components/ui/ExportButton';
import { toast } from '../../utils/notify';
import { EMPLOYEE_STATUS, FINE_STATUS, FINE_TYPE } from '../../constants/options';
import {
  Users,
  Coins,
  AlertOctagon,
  FileSpreadsheet,
  FilePieChart
} from 'lucide-react';

const now = new Date();
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const YEARS = Array.from({ length: 6 }, (_, i) => now.getFullYear() - i);

export const Reports = () => {
  const { isElevated } = usePermissions();

  // Period selectors (default to current month/year)
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  // Filter selectors
  const [employeeStatus, setEmployeeStatus] = useState('');
  const [fineStatus, setFineStatus] = useState('');
  const [fineType, setFineType] = useState('');

  // Per-report loading state, keyed by report id
  const [loadingKey, setLoadingKey] = useState(null);

  const runExport = async (key, fn) => {
    setLoadingKey(key);
    try {
      await fn();
      toast.success('Download started');
    } catch (err) {
      toast.error(apiMessage(err));
    } finally {
      setLoadingKey(null);
    }
  };

  const selectClass =
    'w-full text-xs rounded-lg border border-slate-150 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-805 dark:text-slate-100 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-light';

  const periodFilters = (
    <div className="grid grid-cols-2 gap-2">
      <select
        aria-label="Month"
        className={selectClass}
        value={month}
        onChange={(e) => setMonth(Number(e.target.value))}
      >
        {MONTHS.map((m, i) => (
          <option key={m} value={i + 1}>
            {m}
          </option>
        ))}
      </select>
      <select
        aria-label="Year"
        className={selectClass}
        value={year}
        onChange={(e) => setYear(Number(e.target.value))}
      >
        {YEARS.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </div>
  );

  const reportModules = [
    {
      key: 'employees',
      name: 'Employee & Riders Report',
      desc: 'Export the rider registry directory with visa status, platforms, and WPS configurations.',
      icon: Users,
      elevatedOnly: false,
      filters: (
        <select
          aria-label="Employee status"
          className={selectClass}
          value={employeeStatus}
          onChange={(e) => setEmployeeStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          {EMPLOYEE_STATUS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ),
      buttons: [
        {
          type: 'excel',
          label: 'Export Excel',
          run: () => reportsApi.employeesExcel({ status: employeeStatus || undefined })
        }
      ]
    },
    {
      key: 'payroll',
      name: 'Monthly Payroll Statement',
      desc: 'Payroll sheets, WPS statement logs, and rider deductions summaries for the selected period.',
      icon: Coins,
      elevatedOnly: false,
      filters: periodFilters,
      buttons: [
        {
          type: 'excel',
          label: 'Export Excel',
          run: () => reportsApi.payrollExcel({ month, year })
        },
        {
          type: 'pdf',
          label: 'Export PDF',
          run: () => reportsApi.payrollPdf({ month, year })
        }
      ]
    },
    {
      key: 'expenses',
      name: 'General Operating Expenses',
      desc: 'Office rents, fuel costs, supervisor credit card statements, and category breakdowns.',
      icon: FileSpreadsheet,
      elevatedOnly: false,
      filters: periodFilters,
      buttons: [
        {
          type: 'excel',
          label: 'Export Excel',
          run: () => reportsApi.expensesExcel({ month, year })
        }
      ]
    },
    {
      key: 'fines',
      name: 'Traffic Violations & Fines',
      desc: 'Logged traffic tickets, Salik toll fees, and driver deduction statuses.',
      icon: AlertOctagon,
      elevatedOnly: false,
      filters: (
        <div className="grid grid-cols-2 gap-2">
          <select
            aria-label="Fine status"
            className={selectClass}
            value={fineStatus}
            onChange={(e) => setFineStatus(e.target.value)}
          >
            <option value="">All statuses</option>
            {FINE_STATUS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            aria-label="Fine type"
            className={selectClass}
            value={fineType}
            onChange={(e) => setFineType(e.target.value)}
          >
            <option value="">All types</option>
            {FINE_TYPE.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      ),
      buttons: [
        {
          type: 'excel',
          label: 'Export Excel',
          run: () =>
            reportsApi.finesExcel({
              status: fineStatus || undefined,
              fine_type: fineType || undefined
            })
        }
      ]
    },
    {
      key: 'profit-loss',
      name: 'Corporate Profit & Loss Statement',
      desc: 'Operational net margins, total revenues, gross payroll cost, and operating overheads.',
      icon: FilePieChart,
      elevatedOnly: true,
      filters: periodFilters,
      buttons: [
        {
          type: 'pdf',
          label: 'Export PDF',
          run: () => reportsApi.profitLossPdf({ month, year })
        }
      ]
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytical Reports Center"
        subtitle="Download WPS salary files, generate financial statements, and export Excel/PDF logs straight from the server."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
        {reportModules.map((rep) => {
          if (rep.elevatedOnly && !isElevated()) return null;

          const Icon = rep.icon;
          return (
            <SectionCard key={rep.key}>
              <div className="flex gap-4 items-start h-full flex-col justify-between">
                <div className="space-y-2 w-full">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-700 rounded-lg text-brand-light dark:text-brand-dark">
                      <Icon size={16} />
                    </div>
                    <h3 className="font-bold text-sm text-slate-805 dark:text-slate-100 font-heading">
                      {rep.name}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-450 dark:text-slate-400 leading-normal">
                    {rep.desc}
                  </p>
                  {rep.filters && <div className="pt-1">{rep.filters}</div>}
                </div>

                <div className="flex items-center gap-2 mt-2 w-full border-t border-slate-100 dark:border-slate-700 pt-3">
                  {rep.buttons.map((btn) => {
                    const btnKey = `${rep.key}:${btn.type}`;
                    const isLoading = loadingKey === btnKey;
                    const disabled = loadingKey !== null;
                    return (
                      <span
                        key={btnKey}
                        className={disabled ? 'opacity-60 pointer-events-none' : ''}
                        aria-disabled={disabled}
                      >
                        <ExportButton
                          type={btn.type}
                          label={isLoading ? 'Downloading…' : btn.label}
                          onClick={() => {
                            if (disabled) return;
                            runExport(btnKey, btn.run);
                          }}
                        />
                      </span>
                    );
                  })}
                </div>
              </div>
            </SectionCard>
          );
        })}
      </div>
    </div>
  );
};
