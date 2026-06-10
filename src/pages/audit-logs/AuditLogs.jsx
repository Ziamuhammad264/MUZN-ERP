import React, { useState, useEffect } from 'react';
import { auditLogsApi } from '../../api/services';
import { apiMessage } from '../../api/axios';
import { useFetch, asList } from '../../hooks/useApi';
import { PageHeader } from '../../components/ui/PageHeader';
import { DataTable } from '../../components/ui/DataTable';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { ExportButton } from '../../components/ui/ExportButton';
import { DatePicker } from '../../components/ui/date-picker';
import { formatDate } from '../../utils/formatters';
import { exportToCsv, exportToPdf } from '../../utils/exporters';
import { toast } from '../../utils/notify';
import { AUDIT_MODEL_TYPES } from '../../constants/options';
import { Loader2 } from 'lucide-react';

// Action filter options (the API records created / updated / deleted).
const ACTION_OPTIONS = [
  { value: 'created', label: 'Created' },
  { value: 'updated', label: 'Updated' },
  { value: 'deleted', label: 'Deleted' }
];

// Render a compact key/value diff for old_values / new_values objects.
const renderDiff = (values) => {
  if (!values || typeof values !== 'object') return null;
  const entries = Object.entries(values);
  if (!entries.length) return null;
  return (
    <div className="space-y-0.5">
      {entries.map(([key, val]) => (
        <div key={key} className="text-[10px] leading-tight">
          <span className="font-semibold text-slate-500 dark:text-slate-400">{key}:</span>{' '}
          <span className="text-slate-600 dark:text-slate-300 break-words">
            {val === null || val === undefined || val === '' ? '—' : String(val)}
          </span>
        </div>
      ))}
    </div>
  );
};

export const AuditLogs = () => {
  // Server-side filters drive the query params.
  const [modelType, setModelType] = useState('');
  const [action, setAction] = useState('');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Model-type options: from API, fallback to the fixed enum.
  const [modelTypeOptions, setModelTypeOptions] = useState(AUDIT_MODEL_TYPES);

  // List — refetches whenever a filter changes.
  const { data, loading, error } = useFetch(
    () =>
      auditLogsApi.list({
        model_type: modelType || undefined,
        action: action || undefined,
        search: search || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined
      }),
    [modelType, action, search, dateFrom, dateTo]
  );
  const { rows: logs } = asList(data);

  // Surface fetch failures as a toast.
  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  // Load audited model names on mount; fall back to the fixed enum.
  useEffect(() => {
    auditLogsApi
      .modelTypes()
      .then((payload) => {
        const list = Array.isArray(payload) ? payload : payload?.data;
        if (Array.isArray(list) && list.length) {
          setModelTypeOptions(list.map((v) => (typeof v === 'string' ? v : v?.value || v?.name)).filter(Boolean));
        }
      })
      .catch(() => setModelTypeOptions(AUDIT_MODEL_TYPES));
  }, []);

  const handleExport = async (format) => {
    if (!logs.length) {
      toast.warning('There are no activity logs to export.');
      return;
    }
    const columns = [
      { label: 'Timestamp', value: (r) => formatDate(r.created_at, 'DD MMM YYYY HH:mm:ss') },
      { label: 'User', key: 'user_name', weight: 1.3 },
      { label: 'Action', key: 'action' },
      { label: 'Record', value: (r) => r.model_ref || [r.model_type, r.model_id].filter(Boolean).join(' #') || '—' },
      { label: 'IP Address', key: 'ip_address' },
      {
        label: 'Changes',
        weight: 1.6,
        value: (r) => {
          const v = r.new_values || r.old_values;
          if (!v || typeof v !== 'object') return '—';
          return Object.entries(v)
            .map(([k, val]) => `${k}: ${val ?? '—'}`)
            .join('; ');
        }
      }
    ];
    try {
      if (format === 'excel') {
        exportToCsv('System_Activity_Logs', columns, logs);
        toast.success('Activity log exported as Excel (CSV).');
      } else {
        const hide = toast.loading('Generating PDF…');
        await exportToPdf('System_Activity_Logs', {
          title: 'System Activity Logs',
          subtitle: 'Full chronological activity, authentication and record-mutation trail.',
          columns,
          rows: logs
        });
        hide();
        toast.success('Activity log exported as PDF.');
      }
    } catch (err) {
      toast.error(apiMessage(err));
    }
  };

  const columns = [
    {
      header: 'Timestamp',
      accessor: 'created_at',
      sortable: true,
      render: (val) => (
        <div>
          <div className="font-semibold">{formatDate(val, 'DD MMM YYYY')}</div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500">{formatDate(val, 'HH:mm:ss')}</div>
        </div>
      )
    },
    {
      header: 'User',
      accessor: 'user_name',
      sortable: true,
      render: (val) => (
        <span className="font-bold text-slate-800 dark:text-slate-100">{val || 'System'}</span>
      )
    },
    {
      header: 'Action',
      accessor: 'action',
      sortable: true,
      render: (val) => (val ? <StatusBadge status={val} /> : '—')
    },
    {
      header: 'Record',
      accessor: 'model_ref',
      sortable: true,
      render: (val, row) => (
        <span className="font-mono text-xs text-slate-600 dark:text-slate-300">
          {val || [row.model_type, row.model_id].filter(Boolean).join(' #') || '—'}
        </span>
      )
    },
    {
      header: 'IP Address',
      accessor: 'ip_address',
      render: (val) => (
        <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{val || '—'}</span>
      )
    },
    {
      header: 'Changes',
      accessor: 'new_values',
      render: (val, row) => {
        const oldDiff = renderDiff(row.old_values);
        const newDiff = renderDiff(row.new_values);
        if (!oldDiff && !newDiff) {
          return <span className="text-slate-400 dark:text-slate-500 text-xs">—</span>;
        }
        return (
          <div className="space-y-1 max-w-xs">
            {oldDiff && (
              <div>
                <span className="text-[9px] font-bold uppercase text-rose-500">Before</span>
                {oldDiff}
              </div>
            )}
            {newDiff && (
              <div>
                <span className="text-[9px] font-bold uppercase text-emerald-600">After</span>
                {newDiff}
              </div>
            )}
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Activity Audit Logs"
        subtitle="Full chronological activity trails, record mutations, authentication events, and IP session logs."
        actions={
          <div className="flex items-center gap-2">
            <ExportButton type="excel" onClick={() => handleExport('excel')} label="Export Excel" />
            <ExportButton type="pdf" onClick={() => handleExport('pdf')} label="Export PDF" />
          </div>
        }
      />

      {/* Server-side filters */}
      <div className="flex items-center flex-wrap gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <input
            type="text"
            className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-light text-slate-800 dark:text-slate-100 placeholder-slate-400"
            placeholder="Search by record ref, user or value..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300">
          <span className="font-medium hidden sm:inline">Module:</span>
          <select
            className="bg-transparent font-semibold focus:outline-none cursor-pointer pr-1 text-xs"
            value={modelType}
            onChange={(e) => setModelType(e.target.value)}
          >
            <option value="" className="bg-white dark:bg-slate-800">All</option>
            {modelTypeOptions.map((opt) => (
              <option key={opt} value={opt} className="bg-white dark:bg-slate-800">{opt}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300">
          <span className="font-medium hidden sm:inline">Action:</span>
          <select
            className="bg-transparent font-semibold focus:outline-none cursor-pointer pr-1 text-xs"
            value={action}
            onChange={(e) => setAction(e.target.value)}
          >
            <option value="" className="bg-white dark:bg-slate-800">All</option>
            {ACTION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-white dark:bg-slate-800">{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300">
          <span className="font-medium hidden sm:inline">From:</span>
          <DatePicker value={dateFrom} onChange={(v) => setDateFrom(v || '')} />
        </div>

        <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300">
          <span className="font-medium hidden sm:inline">To:</span>
          <DatePicker value={dateTo} onChange={(v) => setDateTo(v || '')} />
        </div>

        {loading && (
          <span className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
            <Loader2 size={13} className="animate-spin" /> Loading…
          </span>
        )}
      </div>

      {loading && logs.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-slate-400 dark:text-slate-500">
          <Loader2 size={18} className="animate-spin mr-2" />
          <span className="text-xs">Loading activity logs…</span>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={logs}
          searchPlaceholder="Filter loaded logs by user, action or record..."
          emptyMessage="No activity logs recorded yet."
        />
      )}
    </div>
  );
};
