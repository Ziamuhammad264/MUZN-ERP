import React, { useState, useMemo, useCallback } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { FormField } from '../../components/ui/FormField';
import { DatePicker } from '../../components/ui/date-picker';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { DataTable } from '../../components/ui/DataTable';
import { TabFilter } from '../../components/ui/TabFilter';
import { formatCurrency, formatDate, getDaysRemaining } from '../../utils/formatters';
import { Plus, Wrench, AlertTriangle, Loader2, Pencil, Trash2, Upload } from 'lucide-react';
import dayjs from 'dayjs';
import { maintenanceApi, motorbikesApi } from '../../api/services';
import { useFetch, asList } from '../../hooks/useApi';
import { MAINTENANCE_TYPE, MAINTENANCE_STATUS, labelOf } from '../../constants/options';
import { toast, confirmDialog } from '../../utils/notify';
import { apiMessage } from '../../api/axios';
import { v, validateForm, cleanPayload, mapApiErrors } from '../../utils/validation';
import { ModalPortal } from '../../components/ui/ModalPortal';

const emptyForm = {
  motorbike_id: '',
  maintenance_date: '',
  maintenance_type: '',
  cost: '',
  description: '',
  vendor_name: '',
  next_maintenance_date: '',
  status: ''
};

// Map a tab id to the server `status` query param ('All' => undefined).
const TABS = [{ id: 'All', label: 'All' }, ...MAINTENANCE_STATUS.map((s) => ({ id: s.value, label: s.label }))];

export const Maintenance = () => {
  const [activeTab, setActiveTab] = useState('All');
  const [typeFilter, setTypeFilter] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [receiptFile, setReceiptFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // ---- Data fetching ---------------------------------------------------
  const listParams = useMemo(
    () => ({
      status: activeTab === 'All' ? undefined : activeTab,
      maintenance_type: typeFilter || undefined
    }),
    [activeTab, typeFilter]
  );

  const {
    data: listData,
    loading: listLoading,
    refetch: refetchList
  } = useFetch(() => maintenanceApi.list(listParams), [activeTab, typeFilter]);

  const { data: stats, refetch: refetchStats } = useFetch(() => maintenanceApi.stats(), []);
  const { data: upcomingData, refetch: refetchUpcoming } = useFetch(() => maintenanceApi.upcoming(), []);

  // Bike picker — fetched once.
  const { data: bikesData } = useFetch(() => motorbikesApi.list({ per_page: 100 }), []);
  const bikes = useMemo(() => asList(bikesData).rows, [bikesData]);

  const rows = useMemo(() => asList(listData).rows, [listData]);
  const upcoming = useMemo(() => asList(upcomingData).rows, [upcomingData]);

  const refetchAll = useCallback(() => {
    refetchList();
    refetchStats();
    refetchUpcoming();
  }, [refetchList, refetchStats, refetchUpcoming]);

  // ---- Helpers ---------------------------------------------------------
  const bikePlate = (row) => row.motorbike?.plate_number || row.plate_number || '—';
  const bikeRef = (row) => row.motorbike?.bike_id || row.motorbike_id || '—';

  const setField = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setReceiptFile(null);
    setErrors({});
    setIsModalOpen(true);
  };

  const openEdit = (row) => {
    setEditingId(row.id);
    setForm({
      motorbike_id: String(row.motorbike?.id ?? row.motorbike_id ?? ''),
      maintenance_date: row.maintenance_date ? dayjs(row.maintenance_date).format('YYYY-MM-DD') : '',
      maintenance_type: row.maintenance_type || '',
      cost: row.cost ?? '',
      description: row.description || '',
      vendor_name: row.vendor_name || '',
      next_maintenance_date: row.next_maintenance_date
        ? dayjs(row.next_maintenance_date).format('YYYY-MM-DD')
        : '',
      status: row.status || ''
    });
    setReceiptFile(null);
    setErrors({});
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (submitting) return;
    setIsModalOpen(false);
  };

  // ---- Mutations -------------------------------------------------------
  const validate = () => {
    const errs = validateForm(form, {
      motorbike_id: [v.required('Motorbike')],
      maintenance_date: [v.required('Maintenance date'), v.date('Maintenance date')],
      maintenance_type: [v.required('Maintenance type')],
      cost: [v.number('Cost'), v.min(0, 'Cost')],
      next_maintenance_date: [v.date('Next maintenance date')]
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate() || submitting) return;
    setSubmitting(true);

    const payload = cleanPayload(form, { numbers: ['motorbike_id', 'cost'] });

    try {
      const saved = editingId
        ? await maintenanceApi.update(editingId, payload)
        : await maintenanceApi.create(payload);

      // Optional receipt upload after the record exists.
      if (receiptFile) {
        const recordId = editingId || saved?.id;
        if (recordId) {
          try {
            await maintenanceApi.uploadReceipt(recordId, receiptFile);
          } catch (uploadErr) {
            toast.error(apiMessage(uploadErr));
          }
        }
      }

      toast.success(editingId ? 'Maintenance record updated.' : 'Maintenance record created.');
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
      title: 'Delete maintenance record?',
      content: `This will permanently remove the ${labelOf(MAINTENANCE_TYPE, row.maintenance_type)} log for ${bikePlate(row)}.`,
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          await maintenanceApi.remove(row.id);
          toast.success('Maintenance record deleted.');
          refetchAll();
        } catch (err) {
          toast.error(apiMessage(err));
        }
      }
    });
  };

  // ---- Columns ---------------------------------------------------------
  const columns = [
    {
      header: 'Motorbike Plate',
      accessor: 'motorbike',
      sortable: false,
      render: (_val, row) => (
        <div>
          <span className="font-bold text-slate-800 dark:text-slate-100">{bikePlate(row)}</span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-semibold">
            Bike: {bikeRef(row)}
          </span>
        </div>
      )
    },
    {
      header: 'Log details',
      accessor: 'maintenance_type',
      sortable: true,
      render: (val, row) => (
        <div>
          <span className="font-semibold">
            {labelOf(MAINTENANCE_TYPE, val)} — {row.vendor_name || '—'}
          </span>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal max-w-xs">
            {row.description}
          </p>
        </div>
      )
    },
    {
      header: 'Service Date',
      accessor: 'maintenance_date',
      sortable: true,
      render: (val) => formatDate(val)
    },
    {
      header: 'Total Cost',
      accessor: 'cost',
      sortable: true,
      render: (val) => <span className="font-bold">{formatCurrency(Number(val))}</span>
    },
    {
      header: 'Next Service',
      accessor: 'next_maintenance_date',
      render: (val) => {
        if (!val) return <span className="text-slate-400 dark:text-slate-500">—</span>;
        const days = getDaysRemaining(val);
        const color =
          days >= 0 && days <= 14 ? 'text-amber-500 font-bold' : 'text-slate-500 dark:text-slate-400';
        return (
          <span className={color}>
            {formatDate(val)} ({days >= 0 ? `${days}d left` : 'Overdue'})
          </span>
        );
      }
    },
    {
      header: 'Status',
      accessor: 'status',
      sortable: true,
      render: (val) => <StatusBadge status={labelOf(MAINTENANCE_STATUS, val)} />
    },
    {
      header: 'Actions',
      accessor: 'id',
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

  // ---- KPI values ------------------------------------------------------
  const kpiTotalCost = stats?.total_cost ?? stats?.total_spent ?? null;
  const kpiInProgress = stats?.in_progress ?? null;
  const kpiPending = stats?.pending ?? null;
  const kpiAlerts = stats?.upcoming ?? upcoming.length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Garage Maintenance & Repairs"
        subtitle="Manage fleet service schedules, oil changes, engine checks, tire replacements, and garage repair invoices."
        actions={
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 px-3 py-2 bg-brand-light dark:bg-brand-dark hover:opacity-95 text-white font-semibold rounded-lg shadow-sm text-xs transition-all"
          >
            <Plus size={14} />
            <span>Record Service</span>
          </button>
        }
      />

      {/* Upcoming maintenance banner (bikes due within 14 days) */}
      {upcoming.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-xl p-4 text-left flex gap-3 items-start animate-fade-in">
          <AlertTriangle className="text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" size={18} />
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-amber-800 dark:text-amber-300">
              Upcoming Service Schedules Due (within 14 days)
            </h4>
            <div className="text-xs text-amber-700 dark:text-amber-400 flex flex-wrap gap-x-4 gap-y-1.5 mt-1">
              {upcoming.map((item) => {
                const days = getDaysRemaining(item.next_maintenance_date);
                return (
                  <span key={item.id}>
                    • Plate: <strong>{bikePlate(item)}</strong> due in{' '}
                    <strong>{days >= 0 ? `${days} days` : 'overdue'}</strong> (
                    {formatDate(item.next_maintenance_date)})
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Summary Row */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white dark:bg-slate-800 border border-slate-205 dark:border-slate-700 p-4 rounded-xl text-left">
          <span className="text-[10px] font-bold text-slate-450 uppercase">Total Maintenance Cost</span>
          <p className="text-lg font-bold text-slate-850 dark:text-slate-100 mt-1">
            {kpiTotalCost !== null ? formatCurrency(Number(kpiTotalCost)) : '—'}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-205 dark:border-slate-700 p-4 rounded-xl text-left">
          <span className="text-[10px] font-bold text-slate-455 uppercase">In Progress</span>
          <p className="text-lg font-bold text-blue-500 mt-1">{kpiInProgress ?? '—'}</p>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-205 dark:border-slate-700 p-4 rounded-xl text-left">
          <span className="text-[10px] font-bold text-slate-455 uppercase">Pending Review</span>
          <p className="text-lg font-bold text-amber-500 mt-1">{kpiPending ?? '—'}</p>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-205 dark:border-slate-700 p-4 rounded-xl text-left">
          <span className="text-[10px] font-bold text-slate-455 uppercase">Schedules Alert</span>
          <p className="text-lg font-bold text-rose-500 mt-1">{kpiAlerts}</p>
        </div>
      </div>

      {/* Tabs list and Table */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <TabFilter tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 w-fit">
            <span className="font-medium hidden sm:inline">Type:</span>
            <select
              className="bg-transparent font-semibold focus:outline-none cursor-pointer pr-1 text-xs"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">All Types</option>
              {MAINTENANCE_TYPE.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {listLoading ? (
          <div className="flex items-center justify-center py-16 text-slate-400 dark:text-slate-500">
            <Loader2 size={20} className="animate-spin mr-2" />
            <span className="text-xs font-semibold">Loading maintenance logs...</span>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={rows}
            searchPlaceholder="Search service logs by plate, garage or description..."
            emptyMessage="No maintenance records found."
          />
        )}
      </div>

      {/* Record Service Modal Dialog */}
      {isModalOpen && (
        <ModalPortal>
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 border border-slate-205 dark:border-slate-700 rounded-xl max-w-2xl w-full shadow-2xl overflow-hidden animate-fade-in text-left my-8">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-150 dark:border-slate-700">
              <h3 className="text-base font-bold text-slate-850 dark:text-slate-100 flex items-center gap-2">
                <Wrench size={18} className="text-brand-light" />
                {editingId ? 'Edit Garage Maintenance Log' : 'Record Garage Maintenance Log'}
              </h3>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label="Select Motorbike Plate" error={errors.motorbike_id} required>
                    <select
                      className="w-full text-xs px-3 py-2 border border-slate-205 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-light text-slate-850 dark:text-slate-105"
                      value={form.motorbike_id}
                      onChange={(e) => setField('motorbike_id')(e.target.value)}
                    >
                      <option value="">-- Select Bike --</option>
                      {bikes.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.plate_number}
                          {b.plate_code ? `-${b.plate_code}` : ''} ({b.brand} {b.model})
                        </option>
                      ))}
                    </select>
                  </FormField>

                  <FormField label="Work Type" error={errors.maintenance_type} required>
                    <select
                      className="w-full text-xs px-3 py-2 border border-slate-205 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:outline-none text-slate-850 dark:text-slate-105"
                      value={form.maintenance_type}
                      onChange={(e) => setField('maintenance_type')(e.target.value)}
                    >
                      <option value="">Select type…</option>
                      {MAINTENANCE_TYPE.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </FormField>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <FormField label="Log Date" error={errors.maintenance_date} required>
                    <DatePicker
                      required
                      value={form.maintenance_date}
                      onChange={setField('maintenance_date')}
                    />
                  </FormField>

                  <FormField label="Total Cost (AED)" error={errors.cost} required>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      className="w-full text-xs px-3 py-2 border border-slate-205 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-light text-slate-850 dark:text-slate-105"
                      placeholder="e.g. 180"
                      value={form.cost}
                      onChange={(e) => setField('cost')(e.target.value)}
                    />
                  </FormField>

                  <FormField label="Garage Status" required>
                    <select
                      className="w-full text-xs px-3 py-2 border border-slate-205 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:outline-none text-slate-850 dark:text-slate-105"
                      value={form.status}
                      onChange={(e) => setField('status')(e.target.value)}
                    >
                      <option value="">Select status…</option>
                      {MAINTENANCE_STATUS.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </FormField>

                  <FormField label="Next Scheduled Service" error={errors.next_maintenance_date}>
                    <DatePicker
                      value={form.next_maintenance_date}
                      onChange={setField('next_maintenance_date')}
                    />
                  </FormField>
                </div>

                <FormField label="Garage / Vendor Name" required>
                  <input
                    type="text"
                    required
                    className="w-full text-xs px-3 py-2 border border-slate-205 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-light text-slate-850 dark:text-slate-105"
                    placeholder="e.g. Al Shamil Garage"
                    value={form.vendor_name}
                    onChange={(e) => setField('vendor_name')(e.target.value)}
                  />
                </FormField>

                <FormField label="Work description details" required>
                  <textarea
                    required
                    className="w-full text-xs px-3 py-2 border border-slate-205 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-light text-slate-850 dark:text-slate-100 h-16"
                    placeholder="Provide details on replaced components..."
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
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-brand-light hover:opacity-95 text-white shadow-sm disabled:opacity-60 flex items-center gap-1.5"
                >
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  {editingId ? 'Update Record' : 'Save Record'}
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
