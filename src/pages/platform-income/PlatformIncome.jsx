import React, { useState, useMemo, useCallback } from 'react';
import { usePermissions } from '../../hooks/usePermissions';
import { PageHeader } from '../../components/ui/PageHeader';
import { SectionCard } from '../../components/ui/SectionCard';
import { FormField } from '../../components/ui/FormField';
import { DatePicker } from '../../components/ui/date-picker';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { DataTable } from '../../components/ui/DataTable';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  Plus,
  TrendingUp,
  Loader2,
  Lock,
  Pencil,
  Trash2,
  Upload
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import dayjs from 'dayjs';
import { platformIncomeApi, employeesApi } from '../../api/services';
import { useFetch, asList } from '../../hooks/useApi';
import { INCOME_SOURCE_TYPE, PLATFORMS, labelOf } from '../../constants/options';
import { toast, confirmDialog } from '../../utils/notify';
import { apiMessage } from '../../api/axios';
import { v, validateForm, cleanPayload, mapApiErrors } from '../../utils/validation';
import { ModalPortal } from '../../components/ui/ModalPortal';

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

const currentYear = dayjs().year();
const YEARS = Array.from({ length: 6 }, (_, i) => currentYear - i);

const buildEmptyForm = () => ({
  income_date: '',
  source_type: '',
  platform_name: '',
  employee_id: '',
  amount: '',
  description: ''
});

export const PlatformIncome = () => {
  const { isOwner } = usePermissions();

  // ---- Filters ----------------------------------------------------------
  const [month, setMonth] = useState(dayjs().month() + 1);
  const [year, setYear] = useState(currentYear);
  const [sourceFilter, setSourceFilter] = useState('');
  const [platformFilter, setPlatformFilter] = useState('');

  // ---- Modal / form state ----------------------------------------------
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(buildEmptyForm);
  const [receiptFile, setReceiptFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // ---- Data fetching ----------------------------------------------------
  const listParams = useMemo(
    () => ({
      month,
      year,
      source_type: sourceFilter || undefined,
      platform_name: platformFilter || undefined
    }),
    [month, year, sourceFilter, platformFilter]
  );

  const {
    data: listData,
    loading: listLoading,
    refetch: refetchList
  } = useFetch(() => platformIncomeApi.list(listParams), [month, year, sourceFilter, platformFilter]);

  const { data: stats, refetch: refetchStats } = useFetch(
    () => platformIncomeApi.stats({ month, year }),
    [month, year]
  );

  const { data: platformsData } = useFetch(() => platformIncomeApi.platforms(), []);
  const { data: employeesData } = useFetch(
    () => employeesApi.list({ status: 'active', per_page: 100 }),
    []
  );

  const rows = useMemo(() => asList(listData).rows, [listData]);
  const employees = useMemo(() => asList(employeesData).rows, [employeesData]);

  // Platform options from the API, falling back to the PLATFORMS constant.
  const platformOptions = useMemo(() => {
    if (Array.isArray(platformsData) && platformsData.length) return platformsData;
    return PLATFORMS;
  }, [platformsData]);

  const refetchAll = useCallback(() => {
    refetchList();
    refetchStats();
  }, [refetchList, refetchStats]);

  // ---- Chart data from stats.by_platform --------------------------------
  const chartData = useMemo(() => {
    const byPlatform = stats?.by_platform || {};
    return Object.keys(byPlatform)
      .map((name) => ({ name, amount: Number(byPlatform[name]) || 0 }))
      .sort((a, b) => b.amount - a.amount);
  }, [stats]);

  // ---- Permission gate (after hooks) ------------------------------------
  if (!isOwner()) {
    return (
      <div className="py-12 text-center flex flex-col items-center justify-center gap-2">
        <Lock size={32} className="text-rose-500 animate-pulse" />
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">Access Denied</h3>
        <p className="text-xs text-slate-400 dark:text-slate-500">Financial Ledger tools are restricted to Owner profiles only.</p>
      </div>
    );
  }

  // ---- Helpers ----------------------------------------------------------
  const setField = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

  const employeeNameOf = (row) =>
    row.employee?.name || row.employee_name || '—';

  const openCreate = () => {
    setEditingId(null);
    setForm(buildEmptyForm());
    setReceiptFile(null);
    setErrors({});
    setIsModalOpen(true);
  };

  const openEdit = (row) => {
    setEditingId(row.id);
    setForm({
      income_date: row.income_date ? dayjs(row.income_date).format('YYYY-MM-DD') : '',
      source_type: row.source_type || 'platform',
      platform_name: row.platform_name || platformOptions[0],
      employee_id: String(row.employee?.id ?? row.employee_id ?? ''),
      amount: row.amount ?? '',
      description: row.description || ''
    });
    setReceiptFile(null);
    setErrors({});
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (submitting) return;
    setIsModalOpen(false);
  };

  // ---- Mutations --------------------------------------------------------
  const validate = () => {
    const rules = {
      income_date: [v.required('Income date'), v.date('Income date')],
      source_type: [v.required('Source type')],
      amount: [v.required('Amount'), v.positive('Amount')]
    };
    if (form.source_type === 'platform') {
      rules.platform_name = [v.required('Platform')];
    } else if (form.source_type === 'rider') {
      rules.employee_id = [v.required('Rider')];
    }
    const errs = validateForm(form, rules);
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (!validate()) return;

    setSubmitting(true);

    const payload =
      form.source_type === 'platform'
        ? cleanPayload(
            {
              income_date: form.income_date,
              source_type: 'platform',
              platform_name: form.platform_name,
              amount: form.amount,
              description: form.description
            },
            { numbers: ['amount'] }
          )
        : cleanPayload(
            {
              income_date: form.income_date,
              source_type: 'rider',
              employee_id: form.employee_id,
              amount: form.amount,
              description: form.description
            },
            { numbers: ['amount', 'employee_id'] }
          );

    try {
      const saved = editingId
        ? await platformIncomeApi.update(editingId, payload)
        : await platformIncomeApi.create(payload);

      // Optional receipt upload after the record exists.
      if (receiptFile) {
        const recordId = editingId || saved?.id;
        if (recordId) {
          try {
            await platformIncomeApi.uploadReceipt(recordId, receiptFile);
          } catch (uploadErr) {
            toast.error(apiMessage(uploadErr));
          }
        }
      }

      toast.success(editingId ? 'Income record updated.' : 'Income record created.');
      setIsModalOpen(false);
      refetchAll();
    } catch (err) {
      const mapped = mapApiErrors(err);
      if (mapped) setErrors(mapped);
      toast.error(apiMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (row) => {
    confirmDialog({
      title: 'Delete income record?',
      content: `This will permanently remove the ${formatCurrency(Number(row.amount))} ${labelOf(
        INCOME_SOURCE_TYPE,
        row.source_type
      )} entry.`,
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          await platformIncomeApi.remove(row.id);
          toast.success('Income record deleted.');
          refetchAll();
        } catch (err) {
          toast.error(apiMessage(err));
        }
      }
    });
  };

  // ---- Columns ----------------------------------------------------------
  const columns = [
    {
      header: 'Income ID',
      accessor: 'id',
      sortable: true
    },
    {
      header: 'Source / Type',
      accessor: 'source_type',
      sortable: true,
      render: (val, row) => (
        <div>
          <span className="font-bold text-slate-800 dark:text-slate-200">
            {labelOf(INCOME_SOURCE_TYPE, val)}
          </span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-semibold">
            {val === 'platform' ? row.platform_name || '—' : employeeNameOf(row)}
          </span>
        </div>
      )
    },
    {
      header: 'Date',
      accessor: 'income_date',
      sortable: true,
      render: (val) => formatDate(val)
    },
    {
      header: 'Description',
      accessor: 'description',
      render: (val) => (
        <span className="text-xs text-slate-600 dark:text-slate-300 max-w-xs block truncate">
          {val || '—'}
        </span>
      )
    },
    {
      header: 'Status',
      accessor: 'source_type',
      sortableKey: 'source_type',
      render: (val) => <StatusBadge status={labelOf(INCOME_SOURCE_TYPE, val)} />
    },
    {
      header: 'Amount',
      accessor: 'amount',
      sortable: true,
      render: (val) => (
        <span className="font-bold text-emerald-600">{formatCurrency(Number(val))}</span>
      )
    },
    {
      header: 'Actions',
      accessor: 'id',
      sortableKey: 'actions',
      render: (_val, row) => (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => openEdit(row)}
            title="Edit"
            className="p-1.5 rounded-md text-slate-500 hover:text-brand-light hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            onClick={() => handleDelete(row)}
            title="Delete"
            className="p-1.5 rounded-md text-slate-500 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )
    }
  ];

  // ---- KPI values -------------------------------------------------------
  const totalIncome = stats?.total_income ?? null;
  const platformIncome = stats?.platform_income ?? null;
  const riderIncome = stats?.rider_income ?? null;
  const platformCount = chartData.length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform Settlements & Income Ledger"
        subtitle="Log settlement payouts from delivery aggregators (Talabat, Noon, Careem) and rider cash collections."
        actions={
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 px-3 py-2 bg-brand-light dark:bg-brand-dark hover:opacity-95 text-white font-semibold rounded-lg shadow-sm text-xs transition-all"
          >
            <Plus size={14} />
            <span>Log Income</span>
          </button>
        }
      />

      {/* Month / Year selectors */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300">
          <span className="font-medium hidden sm:inline">Month:</span>
          <select
            className="bg-transparent font-semibold focus:outline-none cursor-pointer pr-1 text-xs"
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
          >
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300">
          <span className="font-medium hidden sm:inline">Year:</span>
          <select
            className="bg-transparent font-semibold focus:outline-none cursor-pointer pr-1 text-xs"
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

        <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300">
          <span className="font-medium hidden sm:inline">Source:</span>
          <select
            className="bg-transparent font-semibold focus:outline-none cursor-pointer pr-1 text-xs"
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
          >
            <option value="">All Sources</option>
            {INCOME_SOURCE_TYPE.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300">
          <span className="font-medium hidden sm:inline">Platform:</span>
          <select
            className="bg-transparent font-semibold focus:outline-none cursor-pointer pr-1 text-xs"
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
          >
            <option value="">All Platforms</option>
            {platformOptions.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Widgets */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white dark:bg-slate-800 border border-slate-205 dark:border-slate-700 p-4 rounded-xl text-left">
          <span className="text-[10px] text-slate-450 uppercase font-bold tracking-wider">Total Income</span>
          <p className="text-lg font-bold text-emerald-600 mt-1">
            {totalIncome !== null ? formatCurrency(Number(totalIncome)) : '—'}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-205 dark:border-slate-700 p-4 rounded-xl text-left">
          <span className="text-[10px] text-slate-450 uppercase font-bold tracking-wider">From Delivery Platforms</span>
          <p className="text-lg font-bold text-slate-750 dark:text-slate-350 mt-1">
            {platformIncome !== null ? formatCurrency(Number(platformIncome)) : '—'}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-205 dark:border-slate-700 p-4 rounded-xl text-left">
          <span className="text-[10px] text-slate-450 uppercase font-bold tracking-wider">From Rider Cash</span>
          <p className="text-lg font-bold text-slate-750 dark:text-slate-350 mt-1">
            {riderIncome !== null ? formatCurrency(Number(riderIncome)) : '—'}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-205 dark:border-slate-700 p-4 rounded-xl text-left">
          <span className="text-[10px] text-slate-450 uppercase font-bold tracking-wider">Active Platforms</span>
          <p className="text-lg font-bold text-brand-light dark:text-brand-dark mt-1">
            {platformCount}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">

        {/* Left pane: charts */}
        <div className="lg:col-span-1 space-y-6 text-left">
          <SectionCard title="Revenue Distribution by Platform">
            <div className="h-64 flex justify-center items-center">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={256}>
                  <BarChart data={chartData}>
                    <XAxis dataKey="name" stroke="#888888" fontSize={9} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={9} tickLine={false} axisLine={false} />
                    <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ background: '#1E293B', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '11px' }} />
                    <Bar dataKey="amount" fill="#10B981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <span className="text-slate-400 dark:text-slate-500 text-xs">No revenue data.</span>
              )}
            </div>
          </SectionCard>
        </div>

        {/* Right pane: table */}
        <div className="lg:col-span-2">
          {listLoading ? (
            <div className="flex items-center justify-center py-16 text-slate-400 dark:text-slate-500">
              <Loader2 size={20} className="animate-spin mr-2" />
              <span className="text-xs font-semibold">Loading income ledger...</span>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={rows}
              searchPlaceholder="Search income by platform, rider or description..."
              filterOptions={{
                key: 'source_type',
                label: 'Type',
                options: INCOME_SOURCE_TYPE.map((s) => s.label)
              }}
              emptyMessage="No income records found for this period."
            />
          )}
        </div>

      </div>

      {/* Log Income Modal */}
      {isModalOpen && (
        <ModalPortal>
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 border border-slate-205 dark:border-slate-700 rounded-xl max-w-xl w-full shadow-2xl overflow-hidden animate-fade-in text-left my-8">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-150 dark:border-slate-700">
              <h3 className="text-base font-bold text-slate-850 dark:text-slate-100 flex items-center gap-2">
                <TrendingUp size={18} className="text-emerald-500" />
                {editingId ? 'Edit Income Record' : 'Log Platform / Rider Income'}
              </h3>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label="Income Source Type" error={errors.source_type} required>
                    <select
                      className="w-full text-xs px-3 py-2 border border-slate-205 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:outline-none text-slate-850 dark:text-slate-105"
                      value={form.source_type}
                      onChange={(e) => setField('source_type')(e.target.value)}
                    >
                      <option value="">Select…</option>
                      {INCOME_SOURCE_TYPE.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </FormField>

                  {form.source_type === 'platform' && (
                    <FormField label="Aggregator Platform" error={errors.platform_name} required>
                      <select
                        className="w-full text-xs px-3 py-2 border border-slate-205 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:outline-none text-slate-850 dark:text-slate-105"
                        value={form.platform_name}
                        onChange={(e) => setField('platform_name')(e.target.value)}
                      >
                        <option value="">Select…</option>
                        {platformOptions.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </FormField>
                  )}

                  {form.source_type === 'rider' && (
                    <FormField label="Rider (Employee)" error={errors.employee_id} required>
                      <select
                        className="w-full text-xs px-3 py-2 border border-slate-205 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:outline-none text-slate-850 dark:text-slate-105"
                        value={form.employee_id}
                        onChange={(e) => setField('employee_id')(e.target.value)}
                      >
                        <option value="">-- Select Rider --</option>
                        {employees.map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.name}
                            {emp.employee_id ? ` (${emp.employee_id})` : ''}
                          </option>
                        ))}
                      </select>
                    </FormField>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label="Income Date" error={errors.income_date} required>
                    <DatePicker
                      required
                      value={form.income_date}
                      onChange={setField('income_date')}
                    />
                  </FormField>

                  <FormField label="Amount (AED)" error={errors.amount} required>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      className="w-full text-xs px-3 py-2 border border-slate-205 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-light text-slate-850 dark:text-slate-105"
                      placeholder="e.g. 15000"
                      value={form.amount}
                      onChange={(e) => setField('amount')(e.target.value)}
                    />
                  </FormField>
                </div>

                <FormField label="Description / Notes">
                  <textarea
                    className="w-full text-xs px-3 py-2 border border-slate-205 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-light text-slate-850 dark:text-slate-100 h-16"
                    placeholder="e.g. Weekly payout, cash collected from rider..."
                    value={form.description}
                    onChange={(e) => setField('description')(e.target.value)}
                  />
                </FormField>

                <FormField label="Upload Receipt">
                  <div className="flex items-center gap-2">
                    <Upload size={14} className="text-slate-400 flex-shrink-0" />
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                      className="w-full text-xs text-slate-600 dark:text-slate-400 file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:bg-blue-50 file:text-blue-600 dark:file:bg-blue-950 dark:file:text-blue-400"
                    />
                  </div>
                </FormField>
              </div>

              <div className="flex items-center justify-end gap-2 px-6 py-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-150 dark:border-slate-700 flex-shrink-0">
                <button
                  type="button"
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-750 text-slate-700 dark:text-slate-300 hover:bg-slate-50 disabled:opacity-50"
                  onClick={closeModal}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm disabled:opacity-60 flex items-center gap-1.5"
                >
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  {editingId ? 'Update Record' : 'Record Income'}
                </button>
              </div>
            </form>
          </div>
        </div>
        </ModalPortal>
      )}

    </div>
  );
};
