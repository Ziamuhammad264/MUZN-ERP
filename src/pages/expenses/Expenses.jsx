import { useState, useMemo, useCallback, useEffect } from 'react';
import { expensesApi } from '../../api/services';
import { apiMessage } from '../../api/axios';
import { useFetch, asList } from '../../hooks/useApi';
import { PageHeader } from '../../components/ui/PageHeader';
import { SectionCard } from '../../components/ui/SectionCard';
import { FormField } from '../../components/ui/FormField';
import { DatePicker } from '../../components/ui/date-picker';
import { DataTable } from '../../components/ui/DataTable';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { toast, confirmDialog } from '../../utils/notify';
import { v, validateForm, cleanPayload, mapApiErrors } from '../../utils/validation';
import { EXPENSE_CATEGORY, EXPENSE_STATUS, labelOf } from '../../constants/options';
import { Plus, FileSpreadsheet, CheckCircle2, XCircle, Trash2, Paperclip, Loader2 } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import dayjs from 'dayjs';

const PIE_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#14B8A6'];

const emptyForm = () => ({
  expense_date: '',
  category: '',
  amount: '',
  vendor_name: '',
  description: '',
  notes: ''
});

export const Expenses = () => {
  // Filters
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');

  // Stats period (current month/year)
  const month = dayjs().month() + 1;
  const year = dayjs().year();

  // Category options — from API, fallback to fixed enum.
  const [categoryOptions, setCategoryOptions] = useState(EXPENSE_CATEGORY);

  // List
  const {
    data: listData,
    loading: listLoading,
    refetch: refetchList
  } = useFetch(
    () => expensesApi.list({ category: category || undefined, status: status || undefined }),
    [category, status]
  );
  const { rows: expenses } = asList(listData);

  // Stats / KPIs
  const { data: stats, refetch: refetchStats } = useFetch(
    () => expensesApi.stats({ month, year }),
    []
  );

  const refetchAll = useCallback(() => {
    refetchList();
    refetchStats();
  }, [refetchList, refetchStats]);

  // Modal + form
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [receiptFile, setReceiptFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);

  // Load category options on mount.
  useEffect(() => {
    expensesApi
      .categories()
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        if (list.length) {
          setCategoryOptions(
            list.map((v) =>
              typeof v === 'string'
                ? { value: v, label: labelOf(EXPENSE_CATEGORY, v) }
                : { value: v.value, label: v.label || labelOf(EXPENSE_CATEGORY, v.value) }
            )
          );
        }
      })
      .catch(() => setCategoryOptions(EXPENSE_CATEGORY));
  }, []);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setReceiptFile(null);
    setErrors({});
    setIsModalOpen(true);
  };

  const openEdit = (row) => {
    setEditingId(row.id);
    setForm({
      expense_date: row.expense_date || '',
      category: row.category || '',
      amount: row.amount ?? '',
      vendor_name: row.vendor_name || '',
      description: row.description || '',
      notes: row.notes || ''
    });
    setReceiptFile(null);
    setErrors({});
    setIsModalOpen(true);
  };

  // KPI figures from stats payload (graceful defaults).
  const kpi = {
    total: stats?.total ?? 0,
    pending: stats?.pending ?? 0,
    approved: stats?.approved ?? 0,
    rejected: stats?.rejected ?? 0,
    total_amount: stats?.total_amount ?? 0,
    approved_amount: stats?.approved_amount ?? 0
  };

  // Donut chart data from stats.by_category.
  const categoryChartData = useMemo(() => {
    const byCat = stats?.by_category || {};
    return Object.keys(byCat)
      .map((name) => ({ name: labelOf(categoryOptions, name), value: Number(byCat[name]) || 0 }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [stats, categoryOptions]);

  const validate = () => {
    const errs = validateForm(form, {
      expense_date: [v.required('Expense date'), v.date('Expense date')],
      category: [v.required('Category')],
      amount: [v.required('Amount'), v.positive('Amount')]
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate() || saving) return;
    setSaving(true);
    try {
      const payload = cleanPayload(form, { numbers: ['amount'] });
      let saved;
      if (editingId) {
        saved = await expensesApi.update(editingId, payload);
        toast.success('Expense updated.');
      } else {
        saved = await expensesApi.create(payload);
        toast.success('Expense logged.');
      }
      // Upload receipt if provided.
      if (receiptFile) {
        const targetId = saved?.id || editingId;
        if (targetId) {
          try {
            await expensesApi.uploadReceipt(targetId, receiptFile);
          } catch (uploadErr) {
            toast.error(apiMessage(uploadErr, 'Expense saved but receipt upload failed.'));
          }
        }
      }
      setIsModalOpen(false);
      refetchAll();
    } catch (err) {
      const mapped = mapApiErrors(err);
      if (mapped) setErrors(mapped);
      toast.error(apiMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = (row) => {
    confirmDialog({
      title: 'Approve expense?',
      content: `${labelOf(categoryOptions, row.category)} — ${formatCurrency(row.amount)}. Approved expenses can no longer be edited or deleted.`,
      okText: 'Approve',
      onOk: async () => {
        setBusyId(row.id);
        try {
          await expensesApi.approve(row.id, { notes: 'Approved' });
          toast.success('Expense approved.');
          refetchAll();
        } catch (err) {
          toast.error(apiMessage(err));
        } finally {
          setBusyId(null);
        }
      }
    });
  };

  const handleReject = (row) => {
    confirmDialog({
      title: 'Reject expense?',
      content: `${labelOf(categoryOptions, row.category)} — ${formatCurrency(row.amount)}.`,
      okText: 'Reject',
      okType: 'danger',
      onOk: async () => {
        setBusyId(row.id);
        try {
          await expensesApi.reject(row.id, { notes: 'Rejected' });
          toast.success('Expense rejected.');
          refetchAll();
        } catch (err) {
          toast.error(apiMessage(err));
        } finally {
          setBusyId(null);
        }
      }
    });
  };

  const handleDelete = (row) => {
    confirmDialog({
      title: 'Delete expense?',
      content: `This will permanently remove the ${labelOf(categoryOptions, row.category)} expense of ${formatCurrency(row.amount)}.`,
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        setBusyId(row.id);
        try {
          await expensesApi.remove(row.id);
          toast.success('Expense deleted.');
          refetchAll();
        } catch (err) {
          toast.error(apiMessage(err));
        } finally {
          setBusyId(null);
        }
      }
    });
  };

  const columns = [
    {
      header: 'Category & Vendor',
      accessor: 'category',
      sortable: true,
      render: (val, row) => (
        <div>
          <span className="font-bold text-slate-800 dark:text-slate-200">{labelOf(categoryOptions, val)}</span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-semibold">
            {row.vendor_name || '—'}
          </span>
        </div>
      )
    },
    {
      header: 'Date',
      accessor: 'expense_date',
      sortable: true,
      render: (val) => formatDate(val)
    },
    {
      header: 'Amount',
      accessor: 'amount',
      sortable: true,
      render: (val) => <span className="font-bold text-rose-500">{formatCurrency(val)}</span>
    },
    {
      header: 'Description',
      accessor: 'description',
      render: (val) => (
        <span className="text-slate-600 dark:text-slate-400">{val || '—'}</span>
      )
    },
    {
      header: 'Status',
      accessor: 'status',
      sortable: true,
      render: (val) => <StatusBadge status={labelOf(EXPENSE_STATUS, val)} />
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (val, row) => {
        const isApproved = row.status === 'approved';
        const isBusy = busyId === row.id;
        return (
          <div className="flex items-center gap-1.5">
            {row.status === 'pending' && (
              <>
                <button
                  onClick={() => handleApprove(row)}
                  disabled={isBusy}
                  title="Approve"
                  className="p-1.5 rounded-md text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 disabled:opacity-40"
                >
                  <CheckCircle2 size={15} />
                </button>
                <button
                  onClick={() => handleReject(row)}
                  disabled={isBusy}
                  title="Reject"
                  className="p-1.5 rounded-md text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 disabled:opacity-40"
                >
                  <XCircle size={15} />
                </button>
              </>
            )}
            {!isApproved && (
              <button
                onClick={() => openEdit(row)}
                disabled={isBusy}
                title="Edit"
                className="p-1.5 rounded-md text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 disabled:opacity-40"
              >
                <FileSpreadsheet size={15} />
              </button>
            )}
            {!isApproved && (
              <button
                onClick={() => handleDelete(row)}
                disabled={isBusy}
                title="Delete"
                className="p-1.5 rounded-md text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 disabled:opacity-40"
              >
                <Trash2 size={15} />
              </button>
            )}
            {isApproved && (
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">Locked</span>
            )}
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Operations Expense Ledger"
        subtitle="Log vehicle fuel receipts, garage repairs, accommodation rents, office costs, and licensing expenses."
        actions={
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 px-3 py-2 bg-brand-light dark:bg-brand-dark hover:opacity-95 text-white font-semibold rounded-lg shadow-sm text-xs transition-all"
          >
            <Plus size={14} />
            <span>Log Expense</span>
          </button>
        }
      />

      {/* KPI Widgets */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
        <div className="bg-white dark:bg-slate-800 border border-slate-205 dark:border-slate-700 p-4 rounded-xl text-left">
          <span className="text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase">Total Expenses</span>
          <p className="text-lg font-bold text-slate-800 dark:text-slate-100 mt-1">{kpi.total}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-205 dark:border-slate-700 p-4 rounded-xl text-left">
          <span className="text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase">Pending</span>
          <p className="text-lg font-bold text-amber-600 mt-1">{kpi.pending}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-205 dark:border-slate-700 p-4 rounded-xl text-left">
          <span className="text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase">Approved</span>
          <p className="text-lg font-bold text-emerald-600 mt-1">{kpi.approved}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-205 dark:border-slate-700 p-4 rounded-xl text-left">
          <span className="text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase">Rejected</span>
          <p className="text-lg font-bold text-rose-500 mt-1">{kpi.rejected}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-205 dark:border-slate-700 p-4 rounded-xl text-left">
          <span className="text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase">Total Amount</span>
          <p className="text-lg font-bold text-rose-500 mt-1">{formatCurrency(kpi.total_amount)}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-205 dark:border-slate-700 p-4 rounded-xl text-left">
          <span className="text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase">Approved Amount</span>
          <p className="text-lg font-bold text-emerald-600 mt-1">{formatCurrency(kpi.approved_amount)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">

        {/* Left pane: metrics & chart */}
        <div className="lg:col-span-1 space-y-6 text-left">
          <SectionCard>
            <div className="space-y-4">
              <div>
                <span className="text-[10px] text-slate-450 dark:text-slate-400 uppercase font-bold tracking-wider">Approved this Month</span>
                <h3 className="text-3xl font-extrabold text-emerald-600 font-heading mt-1">
                  {formatCurrency(kpi.approved_amount)}
                </h3>
              </div>
              <div className="pt-3 border-t border-slate-100 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider">Total Logged this Month</span>
                <p className="text-sm font-semibold text-slate-750 dark:text-slate-300 mt-0.5">
                  {formatCurrency(kpi.total_amount)}
                </p>
              </div>
            </div>
          </SectionCard>

          {/* Donut chart */}
          <SectionCard title="Expenses breakdown">
            <div className="h-64 flex justify-center items-center">
              {categoryChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={256}>
                  <PieChart>
                    <Pie
                      data={categoryChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {categoryChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ background: '#1E293B', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '11px' }} />
                    <Legend verticalAlign="bottom" height={40} iconType="circle" wrapperStyle={{ fontSize: '9px' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <span className="text-slate-400 dark:text-slate-500 text-xs">No expense logs.</span>
              )}
            </div>
          </SectionCard>
        </div>

        {/* Right pane: list */}
        <div className="lg:col-span-2 space-y-4">
          {/* Server-side filters */}
          <div className="flex items-center flex-wrap gap-2">
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300">
              <span className="font-medium hidden sm:inline">Category:</span>
              <select
                className="bg-transparent font-semibold focus:outline-none cursor-pointer pr-1 text-xs"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="" className="bg-white dark:bg-slate-800">All</option>
                {categoryOptions.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-white dark:bg-slate-800">{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300">
              <span className="font-medium hidden sm:inline">Status:</span>
              <select
                className="bg-transparent font-semibold focus:outline-none cursor-pointer pr-1 text-xs"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="" className="bg-white dark:bg-slate-800">All</option>
                {EXPENSE_STATUS.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-white dark:bg-slate-800">{opt.label}</option>
                ))}
              </select>
            </div>
            {listLoading && (
              <span className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                <Loader2 size={13} className="animate-spin" /> Loading…
              </span>
            )}
          </div>

          {listLoading && expenses.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-slate-400 dark:text-slate-500">
              <Loader2 size={18} className="animate-spin mr-2" />
              <span className="text-xs">Loading expenses…</span>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={expenses}
              searchPlaceholder="Search expenses by vendor, description or category..."
              emptyMessage="No expenses logged yet."
            />
          )}
        </div>

      </div>

      {/* Log / Edit Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 border border-slate-205 dark:border-slate-700 rounded-xl max-w-2xl w-full shadow-2xl overflow-hidden animate-fade-in text-left my-8">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-150 dark:border-slate-700">
              <h3 className="text-base font-bold text-slate-850 dark:text-slate-100 flex items-center gap-2">
                <FileSpreadsheet size={18} className="text-brand-light" />
                {editingId ? 'Edit Operations Expense' : 'Log Operations Expense'}
              </h3>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField label="Expense Category" error={errors.category} required>
                    <select
                      className="w-full text-xs px-3 py-2 border border-slate-205 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:outline-none text-slate-850 dark:text-slate-105"
                      value={form.category}
                      onChange={(e) => setField('category', e.target.value)}
                    >
                      <option value="">Select category…</option>
                      {categoryOptions.map((cat) => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </FormField>

                  <FormField label="Expense Date" error={errors.expense_date} required>
                    <DatePicker
                      required
                      value={form.expense_date}
                      onChange={(val) => setField('expense_date', val)}
                    />
                  </FormField>

                  <FormField label="Amount (AED)" error={errors.amount} required>
                    <input
                      type="number"
                      required
                      step="0.01"
                      className="w-full text-xs px-3 py-2 border border-slate-205 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-light text-slate-850 dark:text-slate-105"
                      placeholder="e.g. 150"
                      value={form.amount}
                      onChange={(e) => setField('amount', e.target.value)}
                    />
                  </FormField>
                </div>

                <FormField label="Supplier / Vendor">
                  <input
                    type="text"
                    className="w-full text-xs px-3 py-2 border border-slate-205 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-light text-slate-850 dark:text-slate-105"
                    placeholder="e.g. ADNOC Station"
                    value={form.vendor_name}
                    onChange={(e) => setField('vendor_name', e.target.value)}
                  />
                </FormField>

                <FormField label="Description">
                  <input
                    type="text"
                    className="w-full text-xs px-3 py-2 border border-slate-205 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-light text-slate-850 dark:text-slate-105"
                    placeholder="e.g. Fuel for delivery bikes"
                    value={form.description}
                    onChange={(e) => setField('description', e.target.value)}
                  />
                </FormField>

                <FormField label="Upload Invoice Receipt">
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                    className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:outline-none text-slate-600 dark:text-slate-400 file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:bg-blue-50 file:text-blue-600 dark:file:bg-blue-950 dark:file:text-blue-400"
                  />
                  {receiptFile && (
                    <span className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                      <Paperclip size={11} /> {receiptFile.name}
                    </span>
                  )}
                </FormField>

                <FormField label="Additional Notes">
                  <textarea
                    className="w-full text-xs px-3 py-2 border border-slate-205 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-light text-slate-850 dark:text-slate-100 h-16"
                    placeholder="Provide comments or details here..."
                    value={form.notes}
                    onChange={(e) => setField('notes', e.target.value)}
                  />
                </FormField>
              </div>

              <div className="flex items-center justify-end gap-2 px-6 py-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-150 dark:border-slate-700 flex-shrink-0">
                <button
                  type="button"
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-750 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                  onClick={() => setIsModalOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-brand-light hover:opacity-95 text-white shadow-sm disabled:opacity-60"
                >
                  {saving && <Loader2 size={13} className="animate-spin" />}
                  {editingId ? 'Update Expense' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
