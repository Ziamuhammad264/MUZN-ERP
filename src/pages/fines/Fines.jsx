import { useState, useMemo, useEffect, useCallback } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { FormField } from '../../components/ui/FormField';
import { DatePicker } from '../../components/ui/date-picker';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { ModalPortal } from '../../components/ui/ModalPortal';
import { DataTable } from '../../components/ui/DataTable';
import { TabFilter } from '../../components/ui/TabFilter';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { FINE_TYPE, FINE_STATUS, labelOf } from '../../constants/options';
import { finesApi, employeesApi } from '../../api/services';
import { asList } from '../../hooks/useApi';
import { toast, confirmDialog } from '../../utils/notify';
import { apiMessage } from '../../api/axios';
import { v, validateForm, cleanPayload, mapApiErrors } from '../../utils/validation';
import { Plus, AlertOctagon, Pencil, Upload, Trash2, ShieldOff, Loader2 } from 'lucide-react';
import dayjs from 'dayjs';

const emptyForm = () => ({
  employee_id: '',
  fine_date: '',
  fine_type: '',
  amount: '',
  description: '',
  notes: ''
});

export const Fines = () => {
  // Filters
  const [activeTypeTab, setActiveTypeTab] = useState('All');
  const [statusFilter, setStatusFilter] = useState('');

  // Data
  const [fines, setFines] = useState([]);
  const [stats, setStats] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal / form
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [formError, setFormError] = useState('');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const setField = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

  // ----- Data loading ------------------------------------------------------
  const loadFines = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (activeTypeTab !== 'All') params.fine_type = activeTypeTab;
      const [listPayload, statsPayload] = await Promise.all([
        finesApi.list(params),
        finesApi.stats()
      ]);
      setFines(asList(listPayload).rows);
      setStats(statsPayload);
    } catch (err) {
      toast.error(apiMessage(err));
    } finally {
      setLoading(false);
    }
  }, [statusFilter, activeTypeTab]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadFines();
  }, [loadFines]);

  useEffect(() => {
    employeesApi
      .list({ status: 'active', per_page: 100 })
      .then((payload) => setEmployees(asList(payload).rows))
      .catch((err) => toast.error(apiMessage(err)));
  }, []);

  // ----- KPI cards ---------------------------------------------------------
  const kpis = useMemo(
    () => [
      { label: 'Total Fines', value: stats?.total ?? 0, money: false, tone: 'text-slate-800 dark:text-slate-100' },
      { label: 'Pending', value: stats?.pending ?? 0, money: false, tone: 'text-amber-600' },
      { label: 'Deducted', value: stats?.deducted ?? 0, money: false, tone: 'text-emerald-600' },
      { label: 'Waived', value: stats?.waived ?? 0, money: false, tone: 'text-blue-600' },
      { label: 'Total Amount', value: stats?.total_amount ?? 0, money: true, tone: 'text-rose-500' },
      { label: 'Pending Amount', value: stats?.pending_amount ?? 0, money: true, tone: 'text-slate-800 dark:text-slate-100' }
    ],
    [stats]
  );

  // ----- Mutations ---------------------------------------------------------
  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setFormError('');
    setErrors({});
    setIsModalOpen(true);
  };

  const openEdit = (row) => {
    setEditingId(row.id);
    setForm({
      employee_id: row.employee_id ?? '',
      fine_date: row.fine_date ? dayjs(row.fine_date).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
      fine_type: row.fine_type ?? 'traffic_fine',
      amount: row.amount ?? '',
      description: row.description ?? '',
      notes: row.notes ?? ''
    });
    setFormError('');
    setErrors({});
    setIsModalOpen(true);
  };

  const validate = () => {
    const errs = validateForm(form, {
      employee_id: [v.required('Employee')],
      fine_date: [v.required('Fine date'), v.date('Fine date')],
      fine_type: [v.required('Fine type')],
      amount: [v.required('Amount'), v.positive('Amount')]
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate() || saving) return;
    setFormError('');
    setSaving(true);
    const payload = cleanPayload(form, { numbers: ['amount'] });
    try {
      if (editingId) {
        await finesApi.update(editingId, payload);
        toast.success('Fine updated.');
      } else {
        await finesApi.create(payload);
        toast.success('Fine logged.');
      }
      setIsModalOpen(false);
      await loadFines();
    } catch (err) {
      const mapped = mapApiErrors(err);
      if (mapped) setErrors(mapped);
      toast.error(apiMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleWaive = (row) => {
    confirmDialog({
      title: 'Waive this fine?',
      content: 'The fine amount will no longer be deducted from the employee.',
      okText: 'Waive',
      onOk: async () => {
        try {
          await finesApi.waive(row.id, { notes: row.notes || 'Waived by management' });
          toast.success('Fine waived.');
          await loadFines();
        } catch (err) {
          toast.error(apiMessage(err));
        }
      }
    });
  };

  const handleDelete = (row) => {
    confirmDialog({
      title: 'Delete this fine?',
      content: 'This action cannot be undone.',
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          await finesApi.remove(row.id);
          toast.success('Fine deleted.');
          await loadFines();
        } catch (err) {
          toast.error(apiMessage(err));
        }
      }
    });
  };

  const handleUploadReceipt = async (row, file) => {
    if (!file) return;
    try {
      await finesApi.uploadReceipt(row.id, file);
      toast.success('Receipt uploaded.');
      await loadFines();
    } catch (err) {
      toast.error(apiMessage(err));
    }
  };

  // Resolve a rider's name from the fine row, falling back to the employee list
  // (the row often only carries employee_id).
  const employeeById = useMemo(() => {
    const map = {};
    employees.forEach((e) => {
      map[e.id] = e;
    });
    return map;
  }, [employees]);

  const employeeOf = (row) => {
    const emp = row.employee || employeeById[row.employee_id] || {};
    return {
      name: row.employee_name || emp.name || '—',
      ref: emp.employee_id || (row.employee_id ? `#${row.employee_id}` : '')
    };
  };

  // ----- Table columns -----------------------------------------------------
  const columns = [
    {
      header: 'Rider Name',
      accessor: 'employee_name',
      sortable: true,
      render: (val, row) => {
        const { name, ref } = employeeOf(row);
        return (
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full flex items-center justify-center bg-brand-light/10 dark:bg-brand-dark/10 text-brand-light dark:text-brand-dark text-xs font-bold flex-shrink-0">
              {name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <span className="font-semibold text-slate-800 dark:text-slate-100 block truncate">{name}</span>
              {ref && (
                <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-semibold">{ref}</span>
              )}
            </div>
          </div>
        );
      }
    },
    {
      header: 'Type',
      accessor: 'fine_type',
      sortable: true,
      render: (val, row) => (
        <div>
          <span className="font-bold text-slate-800 dark:text-slate-100">{labelOf(FINE_TYPE, val)}</span>
          {row.description && (
            <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-semibold">{row.description}</span>
          )}
        </div>
      )
    },
    {
      header: 'Fine Date',
      accessor: 'fine_date',
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
      header: 'Status',
      accessor: 'status',
      sortable: true,
      render: (val) => <StatusBadge status={labelOf(FINE_STATUS, val)} />
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (val, row) => {
        const locked = row.status === 'deducted';
        const actionBtn =
          'flex items-center justify-center h-7 w-7 rounded-lg border transition-colors disabled:opacity-30 disabled:cursor-not-allowed';
        return (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => openEdit(row)}
              disabled={locked}
              title={locked ? 'Cannot edit a deducted fine' : 'Edit fine'}
              className={`${actionBtn} border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-brand-light/10 hover:text-brand-light hover:border-brand-light/30`}
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={() => handleWaive(row)}
              disabled={locked || row.status === 'waived'}
              title={locked ? 'Cannot waive a deducted fine' : 'Waive fine'}
              className={`${actionBtn} border-amber-200 dark:border-amber-900/40 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30`}
            >
              <ShieldOff size={14} />
            </button>
            <label
              title="Upload receipt"
              className={`${actionBtn} border-blue-200 dark:border-blue-900/40 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 cursor-pointer`}
            >
              <Upload size={14} />
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                className="hidden"
                onChange={(e) => {
                  handleUploadReceipt(row, e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
            </label>
            <button
              onClick={() => handleDelete(row)}
              disabled={locked}
              title={locked ? 'Cannot delete a deducted fine' : 'Delete fine'}
              className={`${actionBtn} border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30`}
            >
              <Trash2 size={14} />
            </button>
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fines & Salik Toll Ledger"
        subtitle="Log corporate traffic violations, monitor Salik gate recharges, and configure payroll salary adjustments."
        actions={
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 px-3 py-2 bg-brand-light dark:bg-brand-dark hover:opacity-95 text-white font-semibold rounded-lg shadow-sm text-xs transition-all"
          >
            <Plus size={14} />
            <span>Log Ticket / Fine</span>
          </button>
        }
      />

      {/* Stats Widgets */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="bg-white dark:bg-slate-800 border border-slate-205 dark:border-slate-700 p-4 rounded-xl text-left"
          >
            <span className="text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase">{kpi.label}</span>
            <p className={`text-lg font-bold mt-1 ${kpi.tone}`}>
              {kpi.money ? formatCurrency(kpi.value) : kpi.value}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabFilter
            tabs={[{ id: 'All', label: 'All' }, ...FINE_TYPE.map((t) => ({ id: t.value, label: t.label }))]}
            activeTab={activeTypeTab}
            onChange={setActiveTypeTab}
          />

          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300">
            <span className="font-medium hidden sm:inline">Status:</span>
            <select
              className="bg-transparent font-semibold focus:outline-none cursor-pointer pr-1 text-xs"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="" className="bg-white dark:bg-slate-800">All</option>
              {FINE_STATUS.map((s) => (
                <option key={s.value} value={s.value} className="bg-white dark:bg-slate-800">
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Fines table */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400 dark:text-slate-500">
            <Loader2 size={20} className="animate-spin mr-2" />
            <span className="text-sm font-semibold">Loading fines...</span>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={fines}
            searchPlaceholder="Search fines by rider name, type or description..."
            emptyMessage="No fines logged yet."
          />
        )}
      </div>

      {/* Log / Edit Fine Modal */}
      {isModalOpen && (
        <ModalPortal>
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 border border-slate-205 dark:border-slate-700 rounded-xl max-w-lg w-full shadow-2xl overflow-hidden animate-fade-in text-left my-8">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-150 dark:border-slate-700">
              <h3 className="text-base font-bold text-slate-850 dark:text-slate-100 flex items-center gap-2">
                <AlertOctagon size={18} className="text-rose-500" />
                {editingId ? 'Edit Fine / Ticket' : 'Log Traffic Fine / Salik Ticket'}
              </h3>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                {formError && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 text-rose-700 dark:text-rose-400 rounded-lg text-xs font-semibold">
                    {formError}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label="Responsible Rider" error={errors.employee_id} required>
                    <select
                      className="w-full text-xs px-3 py-2 border border-slate-205 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-light text-slate-850 dark:text-slate-105"
                      value={form.employee_id}
                      onChange={(e) => setField('employee_id')(e.target.value)}
                    >
                      <option value="">-- Select Employee --</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} ({emp.employee_id})
                        </option>
                      ))}
                    </select>
                  </FormField>

                  <FormField label="Fine / Ticket Type" error={errors.fine_type} required>
                    <select
                      className="w-full text-xs px-3 py-2 border border-slate-205 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:outline-none text-slate-850 dark:text-slate-105"
                      value={form.fine_type}
                      onChange={(e) => setField('fine_type')(e.target.value)}
                    >
                      <option value="">-- Select Type --</option>
                      {FINE_TYPE.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </FormField>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label="Fine Date" error={errors.fine_date} required>
                    <DatePicker required value={form.fine_date} onChange={setField('fine_date')} />
                  </FormField>

                  <FormField label="Fine Amount (AED)" error={errors.amount} required>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      className="w-full text-xs px-3 py-2 border border-slate-205 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-light text-slate-850 dark:text-slate-105"
                      placeholder="e.g. 400"
                      value={form.amount}
                      onChange={(e) => setField('amount')(e.target.value)}
                    />
                  </FormField>
                </div>

                <FormField label="Description">
                  <input
                    type="text"
                    className="w-full text-xs px-3 py-2 border border-slate-205 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-light text-slate-850 dark:text-slate-105"
                    placeholder="e.g. Salik charge - Al Maktoum Bridge"
                    value={form.description}
                    onChange={(e) => setField('description')(e.target.value)}
                  />
                </FormField>

                <FormField label="Fine Ticket Notes">
                  <textarea
                    className="w-full text-xs px-3 py-2 border border-slate-205 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-light text-slate-850 dark:text-slate-100 h-16"
                    placeholder="Provide comments or citation notes..."
                    value={form.notes}
                    onChange={(e) => setField('notes')(e.target.value)}
                  />
                </FormField>
              </div>

              <div className="flex items-center justify-end gap-2 px-6 py-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-150 dark:border-slate-700 flex-shrink-0">
                <button
                  type="button"
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-750 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-500 text-white shadow-sm disabled:opacity-60 flex items-center gap-1.5"
                >
                  {saving && <Loader2 size={13} className="animate-spin" />}
                  {editingId ? 'Save Changes' : 'Log Fine'}
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
