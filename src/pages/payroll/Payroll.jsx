import { useState, useMemo, useEffect, useCallback } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { FormField } from '../../components/ui/FormField';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { DataTable } from '../../components/ui/DataTable';
import { KPICard } from '../../components/ui/KPICard';
import { formatCurrency } from '../../utils/formatters';
import { PAYROLL_STATUS, PAYMENT_STATUS, labelOf } from '../../constants/options';
import { payrollApi, employeesApi } from '../../api/services';
import { asList } from '../../hooks/useApi';
import { toast, confirmDialog } from '../../utils/notify';
import { apiMessage } from '../../api/axios';
import { v, validateForm, cleanPayload, mapApiErrors } from '../../utils/validation';
import {
  Plus,
  Coins,
  Wallet,
  TrendingDown,
  ClipboardCheck,
  Pencil,
  CheckCircle2,
  XCircle,
  BadgeDollarSign,
  Download,
  Loader2
} from 'lucide-react';
import dayjs from 'dayjs';
import { ModalPortal } from '../../components/ui/ModalPortal';

const MONTHS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
const YEARS = ['2024', '2025', '2026', '2027'];

const emptyForm = () => ({
  employee_id: '',
  month: '',
  year: '',
  gross_salary: '',
  attendance_days: '',
  hours_compliance: false,
  salik_deduction: '',
  penalty_deduction: '',
  other_deduction: '',
  notes: ''
});

export const Payroll = () => {
  // Period selectors (default current month/year)
  const [selectedMonth, setSelectedMonth] = useState(String(dayjs().month() + 1).padStart(2, '0'));
  const [selectedYear, setSelectedYear] = useState(String(dayjs().year()));

  // Filters
  const [payrollStatusFilter, setPayrollStatusFilter] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');

  // Data
  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Create modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Per-row busy flag
  const [busyId, setBusyId] = useState(null);

  const setField = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

  const monthNum = Number(selectedMonth);
  const yearNum = Number(selectedYear);

  // ----- Data loading ------------------------------------------------------
  const loadPayroll = useCallback(async () => {
    setLoading(true);
    try {
      const params = { month: monthNum, year: yearNum };
      if (payrollStatusFilter) params.payroll_status = payrollStatusFilter;
      if (paymentStatusFilter) params.payment_status = paymentStatusFilter;
      const [listPayload, statsPayload] = await Promise.all([
        payrollApi.list(params),
        payrollApi.stats({ month: monthNum, year: yearNum })
      ]);
      setRecords(asList(listPayload).rows);
      setStats(statsPayload);
    } catch (err) {
      toast.error(apiMessage(err));
    } finally {
      setLoading(false);
    }
  }, [monthNum, yearNum, payrollStatusFilter, paymentStatusFilter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPayroll();
  }, [loadPayroll]);

  useEffect(() => {
    employeesApi
      .list({ status: 'active', per_page: 100 })
      .then((payload) => setEmployees(asList(payload).rows))
      .catch((err) => toast.error(apiMessage(err)));
  }, []);

  const monthLabel = useMemo(
    () => `${dayjs().month(monthNum - 1).format('MMMM')} ${selectedYear}`,
    [monthNum, selectedYear]
  );

  // ----- KPI cards ---------------------------------------------------------
  const kpis = useMemo(
    () => [
      {
        title: 'Total Payrolls',
        icon: ClipboardCheck,
        value: stats?.total_payrolls ?? 0,
        badge: `${stats?.draft ?? 0} draft`
      },
      { title: 'Gross Payroll', icon: Coins, value: formatCurrency(stats?.total_gross ?? 0) },
      { title: 'Total Deductions', icon: TrendingDown, value: formatCurrency(stats?.total_deductions ?? 0) },
      { title: 'Net Payout', icon: Wallet, value: formatCurrency(stats?.total_net ?? 0) }
    ],
    [stats]
  );

  // ----- Create ------------------------------------------------------------
  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setErrors({});
    setIsModalOpen(true);
  };

  const openEdit = (row) => {
    setEditingId(row.id);
    setForm({
      employee_id: row.employee_id ?? '',
      month: row.month != null ? String(row.month).padStart(2, '0') : '',
      year: row.year != null ? String(row.year) : '',
      gross_salary: row.gross_salary ?? '',
      attendance_days: row.attendance_days ?? '',
      hours_compliance: row.hours_compliance ?? true,
      salik_deduction: row.salik_deduction ?? '',
      penalty_deduction: row.penalty_deduction ?? '',
      other_deduction: row.other_deduction ?? '',
      notes: row.notes ?? ''
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const validate = (validationForm) => {
    const errs = validateForm(validationForm, {
      employee_id: [v.required('Employee')],
      month: [v.required('Month')],
      year: [v.required('Year')],
      gross_salary: [v.required('Gross salary'), v.positive('Gross salary')],
      attendance_days: [v.number('Attendance days'), v.min(0, 'Attendance days'), v.max(31, 'Attendance days')],
      salik_deduction: [v.number('Salik deduction'), v.min(0, 'Salik deduction')],
      penalty_deduction: [v.number('Penalty deduction'), v.min(0, 'Penalty deduction')],
      other_deduction: [v.number('Other deduction'), v.min(0, 'Other deduction')]
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;

    if (!validate(form)) return;

    setSaving(true);
    const payload = cleanPayload(
      // hours_compliance must be an integer (0/1), not a boolean.
      { ...form, hours_compliance: form.hours_compliance ? 1 : 0 },
      {
        numbers: [
          'month',
          'year',
          'gross_salary',
          'attendance_days',
          'salik_deduction',
          'penalty_deduction',
          'other_deduction'
        ]
      }
    );
    try {
      if (editingId) {
        await payrollApi.update(editingId, payload);
        toast.success('Payroll record updated.');
      } else {
        await payrollApi.create(payload);
        toast.success('Payroll record created.');
      }
      setIsModalOpen(false);
      await loadPayroll();
    } catch (err) {
      const mapped = mapApiErrors(err);
      if (mapped) setErrors(mapped);
      toast.error(apiMessage(err));
    } finally {
      setSaving(false);
    }
  };

  // ----- Row actions -------------------------------------------------------
  const handleApprove = (row) => {
    confirmDialog({
      title: 'Approve this payroll record?',
      content:
        'On approval, pending fines are deducted and loan payments are recorded automatically. This cannot be undone.',
      okText: 'Approve',
      onOk: async () => {
        setBusyId(row.id);
        try {
          await payrollApi.approve(row.id, { notes: row.notes || 'Approved' });
          toast.success('Payroll approved.');
          await loadPayroll();
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
      title: 'Reject this payroll record?',
      content: 'The record will be marked as rejected.',
      okText: 'Reject',
      okType: 'danger',
      onOk: async () => {
        setBusyId(row.id);
        try {
          await payrollApi.reject(row.id, { notes: row.notes || 'Needs correction' });
          toast.success('Payroll rejected.');
          await loadPayroll();
        } catch (err) {
          toast.error(apiMessage(err));
        } finally {
          setBusyId(null);
        }
      }
    });
  };

  const handleMarkPaid = (row) => {
    confirmDialog({
      title: 'Mark this payroll as paid?',
      content: 'This confirms the net salary has been disbursed to the employee.',
      okText: 'Mark Paid',
      onOk: async () => {
        setBusyId(row.id);
        try {
          await payrollApi.markPaid(row.id);
          toast.success('Payroll marked as paid.');
          await loadPayroll();
        } catch (err) {
          toast.error(apiMessage(err));
        } finally {
          setBusyId(null);
        }
      }
    });
  };

  const handleDownloadSlip = async (row) => {
    setBusyId(row.id);
    try {
      await payrollApi.downloadSlip(row.id);
      toast.success('Salary slip downloaded.');
    } catch (err) {
      toast.error(apiMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  // Resolve an employee's name/ref from the payroll row, falling back to the
  // fetched employee list (the row often only carries employee_id).
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
      ref: row.employee_ref || emp.employee_id || (row.employee_id ? `#${row.employee_id}` : '')
    };
  };

  // ----- Table columns -----------------------------------------------------
  const columns = [
    {
      header: 'Employee',
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
              <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-semibold">
                {[ref, row.attendance_days != null ? `${row.attendance_days} days` : null]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </div>
          </div>
        );
      }
    },
    {
      header: 'Gross Salary',
      accessor: 'gross_salary',
      sortable: true,
      render: (val) => <span className="font-bold text-slate-800 dark:text-slate-100">{formatCurrency(val)}</span>
    },
    {
      header: 'Deductions',
      accessor: 'total_deductions',
      sortable: true,
      render: (val) => (
        <span className="font-semibold text-rose-500">
          {Number(val) > 0 ? `-${formatCurrency(val)}` : formatCurrency(0)}
        </span>
      )
    },
    {
      header: 'Net Salary',
      accessor: 'net_salary',
      sortable: true,
      render: (val) => <span className="font-bold text-emerald-600">{formatCurrency(val)}</span>
    },
    {
      header: 'Payroll Status',
      accessor: 'payroll_status',
      sortable: true,
      render: (val) => <StatusBadge status={labelOf(PAYROLL_STATUS, val)} />
    },
    {
      header: 'Payment',
      accessor: 'payment_status',
      sortable: true,
      render: (val) => <StatusBadge status={labelOf(PAYMENT_STATUS, val)} />
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (val, row) => {
        const isDraft = row.payroll_status === 'draft';
        const isApproved = row.payroll_status === 'approved';
        const isPaid = row.payment_status === 'paid';
        const busy = busyId === row.id;
        const actionBtn =
          'flex items-center justify-center h-7 w-7 rounded-lg border transition-colors disabled:opacity-30 disabled:cursor-not-allowed';
        return (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => openEdit(row)}
              disabled={!isDraft || busy}
              title={isDraft ? 'Edit payroll' : 'Only draft records can be edited'}
              className={`${actionBtn} border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-brand-light/10 hover:text-brand-light hover:border-brand-light/30`}
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={() => handleApprove(row)}
              disabled={!isDraft || busy}
              title={isDraft ? 'Approve payroll' : 'Only draft records can be approved'}
              className={`${actionBtn} border-emerald-200 dark:border-emerald-900/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30`}
            >
              <CheckCircle2 size={14} />
            </button>
            <button
              onClick={() => handleReject(row)}
              disabled={!isDraft || busy}
              title={isDraft ? 'Reject payroll' : 'Only draft records can be rejected'}
              className={`${actionBtn} border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30`}
            >
              <XCircle size={14} />
            </button>
            <button
              onClick={() => handleMarkPaid(row)}
              disabled={!isApproved || isPaid || busy}
              title={
                isPaid
                  ? 'Already paid'
                  : isApproved
                    ? 'Mark as paid'
                    : 'Only approved records can be marked paid'
              }
              className={`${actionBtn} border-blue-200 dark:border-blue-900/40 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30`}
            >
              <BadgeDollarSign size={14} />
            </button>
            <button
              onClick={() => handleDownloadSlip(row)}
              disabled={busy}
              title="Download salary slip (PDF)"
              className={`${actionBtn} border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100`}
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            </button>
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Monthly Payroll Ledger"
        subtitle="Generate per-employee payroll records, review deductions, approve sheets, and disburse net salaries with WPS-compliant payslips."
        actions={
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <select
              className="text-xs px-2 sm:px-2.5 py-1.5 border border-slate-205 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg focus:outline-none"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              {MONTHS.map((m) => (
                <option key={m} value={m}>
                  {dayjs().month(parseInt(m, 10) - 1).format('MMMM')}
                </option>
              ))}
            </select>
            <select
              className="text-xs px-2 sm:px-2.5 py-1.5 border border-slate-205 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg focus:outline-none"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <button
              onClick={openCreate}
              className="flex items-center gap-1.5 px-3 py-2 bg-brand-light dark:bg-brand-dark hover:opacity-95 text-white font-semibold rounded-lg shadow-sm text-xs transition-all whitespace-nowrap"
            >
              <Plus size={14} />
              <span>Add Payroll</span>
            </button>
          </div>
        }
      />

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {kpis.map((kpi) => (
          <KPICard key={kpi.title} title={kpi.title} icon={kpi.icon} value={kpi.value} badge={kpi.badge} />
        ))}
      </div>

      {/* Filters + table */}
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
            Payroll records — {monthLabel}
          </h3>
          <div className="flex items-center flex-wrap gap-2">
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300">
              <span className="font-medium hidden sm:inline">Status:</span>
              <select
                className="bg-transparent font-semibold focus:outline-none cursor-pointer pr-1 text-xs"
                value={payrollStatusFilter}
                onChange={(e) => setPayrollStatusFilter(e.target.value)}
              >
                <option value="" className="bg-white dark:bg-slate-800">All</option>
                {PAYROLL_STATUS.map((s) => (
                  <option key={s.value} value={s.value} className="bg-white dark:bg-slate-800">
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300">
              <span className="font-medium hidden sm:inline">Payment:</span>
              <select
                className="bg-transparent font-semibold focus:outline-none cursor-pointer pr-1 text-xs"
                value={paymentStatusFilter}
                onChange={(e) => setPaymentStatusFilter(e.target.value)}
              >
                <option value="" className="bg-white dark:bg-slate-800">All</option>
                {PAYMENT_STATUS.map((s) => (
                  <option key={s.value} value={s.value} className="bg-white dark:bg-slate-800">
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400 dark:text-slate-500">
            <Loader2 size={20} className="animate-spin mr-2" />
            <span className="text-sm font-semibold">Loading payroll...</span>
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-800 border border-slate-205 dark:border-slate-700 rounded-xl flex flex-col items-center gap-3">
            <Coins size={36} className="text-slate-300" />
            <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">
              No payroll records for {monthLabel}
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Add a payroll record to compute salary and deductions for an employee.
            </p>
            <button
              onClick={openCreate}
              className="px-4 py-2 bg-brand-light dark:bg-brand-dark hover:opacity-95 text-white font-semibold rounded-lg shadow-sm text-xs mt-2"
            >
              Add Payroll Record
            </button>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={records}
            searchPlaceholder="Search payroll by employee name..."
            searchKey="employee_name"
            emptyMessage="No payroll records found."
          />
        )}
      </div>

      {/* Create / Edit Payroll Modal */}
      {isModalOpen && (
        <ModalPortal>
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 border border-slate-205 dark:border-slate-700 rounded-xl max-w-lg w-full shadow-2xl overflow-hidden animate-fade-in text-left my-8">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-150 dark:border-slate-700">
              <h3 className="text-base font-bold text-slate-850 dark:text-slate-100 flex items-center gap-2">
                <Coins size={18} className="text-brand-light dark:text-brand-dark" />
                {editingId ? 'Edit Payroll Record' : 'Add Payroll Record'}
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">— {monthLabel}</span>
              </h3>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-lg text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                  Gross salary, loan & fine deductions, total deductions and net salary are
                  computed automatically by the server.
                </div>

                <FormField label="Employee" error={errors.employee_id} required>
                  <select
                    className="w-full text-xs px-3 py-2 border border-slate-205 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-light text-slate-850 dark:text-slate-105 disabled:opacity-60"
                    value={form.employee_id}
                    disabled={!!editingId}
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label="Month" error={errors.month} required>
                    <select
                      className="w-full text-xs px-3 py-2 border border-slate-205 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-light text-slate-850 dark:text-slate-105 disabled:opacity-60"
                      value={form.month}
                      disabled={!!editingId}
                      onChange={(e) => setField('month')(e.target.value)}
                    >
                      <option value="">Select…</option>
                      {MONTHS.map((m) => (
                        <option key={m} value={m}>
                          {dayjs().month(parseInt(m, 10) - 1).format('MMMM')}
                        </option>
                      ))}
                    </select>
                  </FormField>

                  <FormField label="Year" error={errors.year} required>
                    <select
                      className="w-full text-xs px-3 py-2 border border-slate-205 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-light text-slate-850 dark:text-slate-105 disabled:opacity-60"
                      value={form.year}
                      disabled={!!editingId}
                      onChange={(e) => setField('year')(e.target.value)}
                    >
                      <option value="">Select…</option>
                      {YEARS.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </FormField>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label="Gross Salary (AED)" error={errors.gross_salary} required>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-full text-xs px-3 py-2 border border-slate-205 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-light text-slate-850 dark:text-slate-105"
                      placeholder="e.g. 2500.00"
                      value={form.gross_salary}
                      onChange={(e) => setField('gross_salary')(e.target.value)}
                    />
                  </FormField>

                  <FormField label="Attendance Days" error={errors.attendance_days}>
                    <input
                      type="number"
                      min="0"
                      max="31"
                      step="1"
                      className="w-full text-xs px-3 py-2 border border-slate-205 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-light text-slate-850 dark:text-slate-105"
                      placeholder="e.g. 26"
                      value={form.attendance_days}
                      onChange={(e) => setField('attendance_days')(e.target.value)}
                    />
                  </FormField>

                  <FormField label="Hours Compliance">
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 h-full px-1">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-brand-light focus:ring-brand-light"
                        checked={!!form.hours_compliance}
                        onChange={(e) => setField('hours_compliance')(e.target.checked)}
                      />
                      Met required working hours
                    </label>
                  </FormField>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField label="Salik Deduction" error={errors.salik_deduction}>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-full text-xs px-3 py-2 border border-slate-205 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-light text-slate-850 dark:text-slate-105"
                      placeholder="0.00"
                      value={form.salik_deduction}
                      onChange={(e) => setField('salik_deduction')(e.target.value)}
                    />
                  </FormField>

                  <FormField label="Penalty Deduction" error={errors.penalty_deduction}>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-full text-xs px-3 py-2 border border-slate-205 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-light text-slate-850 dark:text-slate-105"
                      placeholder="0.00"
                      value={form.penalty_deduction}
                      onChange={(e) => setField('penalty_deduction')(e.target.value)}
                    />
                  </FormField>

                  <FormField label="Other Deduction" error={errors.other_deduction}>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-full text-xs px-3 py-2 border border-slate-205 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-light text-slate-850 dark:text-slate-105"
                      placeholder="0.00"
                      value={form.other_deduction}
                      onChange={(e) => setField('other_deduction')(e.target.value)}
                    />
                  </FormField>
                </div>

                <FormField label="Notes">
                  <textarea
                    className="w-full text-xs px-3 py-2 border border-slate-205 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-light text-slate-850 dark:text-slate-100 h-16"
                    placeholder="Optional notes for this payroll record..."
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
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-brand-light dark:bg-brand-dark hover:opacity-95 text-white shadow-sm disabled:opacity-60 flex items-center gap-1.5"
                >
                  {saving && <Loader2 size={13} className="animate-spin" />}
                  {editingId ? 'Save Changes' : 'Create Payroll'}
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
