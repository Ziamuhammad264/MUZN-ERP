import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { SectionCard } from '../../components/ui/SectionCard';
import { FormField } from '../../components/ui/FormField';
import { DatePicker } from '../../components/ui/date-picker';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { LOAN_STATUS, LOAN_PAYMENT_METHODS, labelOf } from '../../constants/options';
import { loansApi, employeesApi } from '../../api/services';
import { asList } from '../../hooks/useApi';
import { apiMessage } from '../../api/axios';
import { toast } from '../../utils/notify';
import { v, validateForm, cleanPayload, mapApiErrors } from '../../utils/validation';
import {
  Plus,
  CreditCard,
  Coins,
  CalendarDays,
  Loader2,
  Inbox,
  Paperclip,
  Pencil
} from 'lucide-react';

const STATUS_FILTERS = [{ value: '', label: 'All Loans' }, ...LOAN_STATUS];

// Pull a usable employee display name + reference off a loan record (the API may
// embed the related employee, or only return the foreign key).
const employeeLabel = (loan) =>
  loan?.employee?.name || loan?.employee_name || loan?.employeeName || 'Employee';
const employeeRef = (loan) =>
  loan?.employee?.employee_id || loan?.employee_id || loan?.employeeId || '—';

// Outstanding balance may arrive under a few different keys depending on the API.
const outstandingOf = (loan) =>
  Number(loan?.remaining_balance ?? loan?.outstanding ?? loan?.outstanding_balance ?? 0);
const paidOf = (loan) => {
  if (loan?.paid_amount != null) return Number(loan.paid_amount);
  if (loan?.total_paid != null) return Number(loan.total_paid);
  return Number(loan?.loan_amount ?? 0) - outstandingOf(loan);
};

export const Loans = () => {
  const [loans, setLoans] = useState([]);
  const [stats, setStats] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  // Per-loan payment history { [loanId]: [...] }
  const [paymentsByLoan, setPaymentsByLoan] = useState({});

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [activeLoan, setActiveLoan] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // New Loan Form State
  const [employeeId, setEmployeeId] = useState('');
  const [loanDate, setLoanDate] = useState('');
  const [loanAmount, setLoanAmount] = useState('');
  const [installments, setInstallments] = useState('');
  const [monthlyDeduction, setMonthlyDeduction] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');
  const [createErrors, setCreateErrors] = useState({});

  // Payment Form State
  const [pmtDate, setPmtDate] = useState('');
  const [pmtAmount, setPmtAmount] = useState('');
  const [pmtMethod, setPmtMethod] = useState('');
  const [pmtNotes, setPmtNotes] = useState('');
  const [pmtFile, setPmtFile] = useState(null);
  const [pmtError, setPmtError] = useState('');
  const [pmtErrors, setPmtErrors] = useState({});

  // Edit Loan Form State
  const [editDeduction, setEditDeduction] = useState('');
  const [editStatus, setEditStatus] = useState('active');
  const [editNotes, setEditNotes] = useState('');
  const [editError, setEditError] = useState('');
  const [editErrors, setEditErrors] = useState({});

  // ---------------------------------------------------------------- fetching
  const loadLoans = useCallback(async () => {
    setLoading(true);
    try {
      const [listPayload, statsPayload] = await Promise.all([
        loansApi.list({ page: 1, status: statusFilter || undefined }),
        loansApi.stats()
      ]);
      const { rows } = asList(listPayload);
      setLoans(rows);
      setStats(statsPayload);
    } catch (err) {
      toast.error(apiMessage(err));
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadLoans();
  }, [loadLoans]);

  // Active employees for the loan picker (fetched once).
  useEffect(() => {
    (async () => {
      try {
        const payload = await employeesApi.list({ status: 'active', per_page: 100 });
        setEmployees(asList(payload).rows);
      } catch (err) {
        toast.error(apiMessage(err));
      }
    })();
  }, []);

  // Lazily fetch payment history per loan so we can render the deduction log.
  useEffect(() => {
    loans.forEach((loan) => {
      if (loan?.id == null) return;
      if (Array.isArray(loan.payments)) {
        setPaymentsByLoan((prev) => ({ ...prev, [loan.id]: loan.payments }));
        return;
      }
      if (paymentsByLoan[loan.id] !== undefined) return;
      loansApi
        .payments(loan.id)
        .then((payload) =>
          setPaymentsByLoan((prev) => ({ ...prev, [loan.id]: asList(payload).rows }))
        )
        .catch(() => {
          setPaymentsByLoan((prev) => ({ ...prev, [loan.id]: [] }));
        });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loans]);

  // ---------------------------------------------------------------- KPI cards
  const kpis = useMemo(() => {
    const s = stats || {};
    return {
      outstanding: Number(s.total_outstanding ?? 0),
      activeCount: Number(s.active ?? 0),
      totalDisbursed: Number(s.total_disbursed ?? 0),
      totalLoans: Number(s.total_loans ?? 0),
      paid: Number(s.paid ?? 0),
      onHold: Number(s.on_hold ?? 0)
    };
  }, [stats]);

  // Installment calculator for the create form
  const calculatedMonthly = useMemo(() => {
    if (!loanAmount || !installments) return 0;
    return Math.round(Number(loanAmount) / Number(installments));
  }, [loanAmount, installments]);

  // ---------------------------------------------------------------- create
  const resetCreateForm = () => {
    setEmployeeId('');
    setLoanDate('');
    setLoanAmount('');
    setInstallments('');
    setMonthlyDeduction('');
    setNotes('');
    setFormError('');
    setCreateErrors({});
  };

  const validateCreate = () => {
    const errs = validateForm(
      {
        employee_id: employeeId,
        loan_date: loanDate,
        loan_amount: loanAmount,
        monthly_deduction: monthlyDeduction || calculatedMonthly,
        number_of_installments: installments
      },
      {
        employee_id: [v.required('Employee')],
        loan_date: [v.required('Loan date'), v.date('Loan date')],
        loan_amount: [v.required('Loan amount'), v.positive('Loan amount')],
        monthly_deduction: [v.required('Monthly deduction'), v.positive('Monthly deduction')],
        number_of_installments: [v.required('Installments'), v.min(1, 'Installments')]
      }
    );
    setCreateErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCreateLoan = async (e) => {
    e.preventDefault();
    if (!validateCreate() || submitting) return;
    setFormError('');
    setSubmitting(true);
    const payload = cleanPayload(
      {
        employee_id: employeeId,
        loan_date: loanDate,
        loan_amount: loanAmount,
        monthly_deduction: monthlyDeduction || calculatedMonthly,
        number_of_installments: installments,
        notes
      },
      { numbers: ['employee_id', 'loan_amount', 'monthly_deduction', 'number_of_installments'] }
    );
    try {
      await loansApi.create(payload);
      toast.success('Loan issued successfully.');
      resetCreateForm();
      setIsCreateOpen(false);
      await loadLoans();
    } catch (err) {
      const mapped = mapApiErrors(err);
      if (mapped) setCreateErrors(mapped);
      setFormError(apiMessage(err));
      toast.error(apiMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  // ---------------------------------------------------------------- payment
  const handleOpenPayment = (loan) => {
    setActiveLoan(loan);
    setPmtDate('');
    setPmtAmount('');
    setPmtMethod('');
    setPmtNotes('');
    setPmtFile(null);
    setPmtError('');
    setPmtErrors({});
    setIsPaymentOpen(true);
  };

  const validatePayment = () => {
    const errs = validateForm(
      {
        payment_date: pmtDate,
        payment_amount: pmtAmount,
        payment_method: pmtMethod
      },
      {
        payment_date: [v.required('Payment date'), v.date('Payment date')],
        payment_amount: [v.required('Payment amount'), v.positive('Payment amount')],
        payment_method: [v.required('Payment method')]
      }
    );
    setPmtErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleLogPayment = async (e) => {
    e.preventDefault();
    if (!activeLoan) return;
    if (!validatePayment() || submitting) return;
    setPmtError('');
    setSubmitting(true);
    const payload = cleanPayload(
      {
        payment_date: pmtDate,
        payment_amount: pmtAmount,
        payment_method: pmtMethod,
        notes: pmtNotes
      },
      { numbers: ['payment_amount'] }
    );
    try {
      await loansApi.recordPayment(activeLoan.id, payload);
      if (pmtFile) {
        await loansApi.uploadAttachment(activeLoan.id, pmtFile);
      }
      toast.success('Payment recorded.');
      setIsPaymentOpen(false);
      // Force a refresh of this loan's payment history.
      setPaymentsByLoan((prev) => {
        const next = { ...prev };
        delete next[activeLoan.id];
        return next;
      });
      setActiveLoan(null);
      await loadLoans();
    } catch (err) {
      const mapped = mapApiErrors(err);
      if (mapped) setPmtErrors(mapped);
      setPmtError(apiMessage(err));
      toast.error(apiMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  // ---------------------------------------------------------------- edit
  const handleOpenEdit = (loan) => {
    setActiveLoan(loan);
    setEditDeduction(loan?.monthly_deduction != null ? String(loan.monthly_deduction) : '');
    setEditStatus(loan?.status || 'active');
    setEditNotes(loan?.notes || '');
    setEditError('');
    setEditErrors({});
    setIsEditOpen(true);
  };

  const validateEdit = () => {
    const errs = validateForm(
      { monthly_deduction: editDeduction, status: editStatus },
      {
        monthly_deduction: [v.required('Monthly deduction'), v.positive('Monthly deduction')],
        status: [v.required('Status')]
      }
    );
    setEditErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleUpdateLoan = async (e) => {
    e.preventDefault();
    if (!activeLoan) return;
    if (!validateEdit() || submitting) return;
    setEditError('');
    setSubmitting(true);
    const payload = cleanPayload(
      { monthly_deduction: editDeduction, status: editStatus, notes: editNotes },
      { numbers: ['monthly_deduction'] }
    );
    try {
      await loansApi.update(activeLoan.id, payload);
      toast.success('Loan updated.');
      setIsEditOpen(false);
      setActiveLoan(null);
      await loadLoans();
    } catch (err) {
      const mapped = mapApiErrors(err);
      if (mapped) setEditErrors(mapped);
      setEditError(apiMessage(err));
      toast.error(apiMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  // ---------------------------------------------------------------- render
  return (
    <div className="space-y-6">
      <PageHeader
        title="Employee Loans Registry"
        subtitle="Track cash advances, log installment collections, and configure payroll deduction rates."
        actions={
          <button
            onClick={() => {
              resetCreateForm();
              setIsCreateOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-brand-light dark:bg-brand-dark hover:opacity-95 text-white font-semibold rounded-lg shadow-sm text-xs transition-all"
          >
            <Plus size={14} />
            <span>Issue Loan</span>
          </button>
        }
      />

      {/* Loan widgets */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white dark:bg-slate-800 border border-slate-205 dark:border-slate-700 p-4 rounded-xl text-left">
          <span className="text-[10px] font-bold text-slate-450 uppercase">Outstanding Ledger</span>
          <p className="text-lg font-bold text-slate-850 dark:text-slate-100 mt-1">
            {formatCurrency(kpis.outstanding)}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-205 dark:border-slate-700 p-4 rounded-xl text-left">
          <span className="text-[10px] font-bold text-slate-450 uppercase">Active Loan Accounts</span>
          <p className="text-lg font-bold text-brand-light dark:text-brand-dark mt-1">
            {kpis.activeCount}
          </p>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-0.5">
            {kpis.paid} paid · {kpis.onHold} on hold
          </span>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-205 dark:border-slate-700 p-4 rounded-xl text-left">
          <span className="text-[10px] font-bold text-slate-450 uppercase">Total Issued advance</span>
          <p className="text-lg font-bold text-slate-705 dark:text-slate-300 mt-1">
            {formatCurrency(kpis.totalDisbursed)}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-205 dark:border-slate-700 p-4 rounded-xl text-left">
          <span className="text-[10px] font-bold text-slate-450 uppercase">Total Loan Accounts</span>
          <p className="text-lg font-bold text-emerald-600 mt-1">
            {kpis.totalLoans}
          </p>
        </div>
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((opt) => (
          <button
            key={opt.value || 'all'}
            onClick={() => setStatusFilter(opt.value)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
              statusFilter === opt.value
                ? 'bg-brand-light dark:bg-brand-dark text-white border-transparent'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-205 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-500">
          <Loader2 size={28} className="animate-spin mb-3" />
          <span className="text-xs font-semibold">Loading loans…</span>
        </div>
      )}

      {/* Empty state */}
      {!loading && loans.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-500 border border-dashed border-slate-205 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800">
          <Inbox size={28} className="mb-3" />
          <span className="text-sm font-semibold">No loans found</span>
          <span className="text-xs mt-1">Issue a loan to start tracking advances and deductions.</span>
        </div>
      )}

      {/* Loans Grid lists */}
      {!loading && loans.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
          {loans.map((loan) => {
            const payments = paymentsByLoan[loan.id] || [];
            const paid = paidOf(loan);
            return (
              <SectionCard
                key={loan.id}
                title={`${employeeLabel(loan)} (${employeeRef(loan)})`}
                actions={
                  <div className="flex items-center gap-1.5">
                    <StatusBadge status={labelOf(LOAN_STATUS, loan.status)} />
                    <button
                      onClick={() => handleOpenEdit(loan)}
                      title="Edit loan"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-brand-light hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                      <Pencil size={14} />
                    </button>
                  </div>
                }
              >
                <div className="space-y-4">
                  <div className="flex justify-between items-baseline">
                    <div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold">Loan ID</span>
                      <p className="text-xs font-semibold text-slate-750 dark:text-slate-200 mt-0.5">
                        {loan.loan_id || loan.id}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold">Issued Date</span>
                      <p className="text-xs font-semibold text-slate-750 dark:text-slate-200 mt-0.5">
                        {formatDate(loan.loan_date)}
                      </p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <ProgressBar
                    value={paid}
                    max={Number(loan.loan_amount) || 0}
                    label="Recovery Progress"
                    subLabel={`${formatCurrency(paid)} paid of ${formatCurrency(loan.loan_amount)}`}
                  />

                  <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-150 dark:border-slate-800">
                    <div>
                      <span className="text-slate-450 block font-semibold">Remaining Balance</span>
                      <span className="font-bold text-sm text-rose-500">{formatCurrency(outstandingOf(loan))}</span>
                    </div>
                    <div>
                      <span className="text-slate-450 block font-semibold">Installment deduction</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {formatCurrency(loan.monthly_deduction)} / mo
                      </span>
                      {loan.number_of_installments != null && (
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-0.5">
                          ({loan.number_of_installments} installments)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-xs">
                    <span className="text-slate-450 block font-semibold">Purpose / Remarks</span>
                    <span className="text-slate-700 dark:text-slate-300 italic">{loan.notes || 'No notes logged.'}</span>
                  </div>

                  {/* Installments logs list */}
                  {payments.length > 0 && (
                    <div className="border-t border-slate-150 dark:border-slate-700 pt-3">
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-2 block">Deduction Logs</span>
                      <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                        {payments.map((pmt, pIdx) => (
                          <div key={pmt.id ?? pIdx} className="flex justify-between items-center text-xs bg-white dark:bg-slate-800 p-2 rounded border border-slate-150 dark:border-slate-750">
                            <span className="text-slate-550 dark:text-slate-400 flex items-center gap-1">
                              <CalendarDays size={12} className="text-slate-400 dark:text-slate-500" />
                              {formatDate(pmt.payment_date)} — {labelOf(LOAN_PAYMENT_METHODS, pmt.payment_method)}
                              {pmt.notes ? ` · ${pmt.notes}` : ''}
                            </span>
                            <span className="font-bold text-emerald-600">-{formatCurrency(pmt.payment_amount)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Manual payment button */}
                  {loan.status === 'active' && (
                    <button
                      onClick={() => handleOpenPayment(loan)}
                      className="w-full text-center py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      Record Manual Payment
                    </button>
                  )}
                </div>
              </SectionCard>
            );
          })}
        </div>
      )}

      {/* Create Loan Modal Dialog */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 border border-slate-205 dark:border-slate-700 rounded-xl max-w-md w-full shadow-2xl overflow-hidden animate-fade-in text-left">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-150 dark:border-slate-700">
              <h3 className="text-base font-bold text-slate-850 dark:text-slate-100 flex items-center gap-2">
                <CreditCard size={18} className="text-brand-light" />
                Issue Employee Advance Loan
              </h3>
            </div>

            <form onSubmit={handleCreateLoan}>
              <div className="p-6 space-y-4">
                {formError && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 text-rose-700 dark:text-rose-400 rounded-lg text-xs font-semibold">
                    {formError}
                  </div>
                )}

                <FormField label="Borrower Employee" error={createErrors.employee_id} required>
                  <select
                    className="w-full text-xs px-3 py-2 border border-slate-205 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-light text-slate-850 dark:text-slate-100"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                  >
                    <option value="">-- Select Employee --</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.employee_id || emp.id})
                        {emp.work_emirate ? ` — ${emp.work_emirate}` : ''}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField label="Loan Date" error={createErrors.loan_date} required>
                  <DatePicker required value={loanDate} onChange={setLoanDate} />
                </FormField>

                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Loan Principal (AED)" error={createErrors.loan_amount} required>
                    <input
                      type="number"
                      required
                      className="w-full text-xs px-3 py-2 border border-slate-205 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-light text-slate-850 dark:text-slate-100"
                      value={loanAmount}
                      onChange={(e) => setLoanAmount(Number(e.target.value))}
                    />
                  </FormField>

                  <FormField label="Installments (Months)" error={createErrors.number_of_installments} required>
                    <input
                      type="number"
                      required
                      className="w-full text-xs px-3 py-2 border border-slate-205 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-light text-slate-850 dark:text-slate-100"
                      value={installments}
                      onChange={(e) => setInstallments(Number(e.target.value))}
                    />
                  </FormField>
                </div>

                <FormField label="Monthly Deduction (AED)" error={createErrors.monthly_deduction}>
                  <input
                    type="number"
                    className="w-full text-xs px-3 py-2 border border-slate-205 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-light text-slate-850 dark:text-slate-100"
                    placeholder={`Defaults to ${formatCurrency(calculatedMonthly)}`}
                    value={monthlyDeduction}
                    onChange={(e) => setMonthlyDeduction(e.target.value)}
                  />
                </FormField>

                {/* Calculator display */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-500 dark:text-slate-400">Estimated Monthly Deduction:</span>
                  <strong className="text-sm text-slate-800 dark:text-white font-mono">
                    {formatCurrency(Number(monthlyDeduction) || calculatedMonthly)} / mo
                  </strong>
                </div>

                <FormField label="Loan Purpose Description">
                  <textarea
                    className="w-full text-xs px-3 py-2 border border-slate-205 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-light text-slate-850 dark:text-slate-100 h-16"
                    placeholder="Provide details or contract terms here..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </FormField>
              </div>

              <div className="flex items-center justify-end gap-2 px-6 py-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-150 dark:border-slate-700">
                <button
                  type="button"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-750 text-slate-700 dark:text-slate-300 hover:bg-slate-50 disabled:opacity-50"
                  onClick={() => setIsCreateOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-brand-light hover:opacity-95 text-white shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submitting && <Loader2 size={13} className="animate-spin" />}
                  Issue Advance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {isPaymentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 border border-slate-205 dark:border-slate-700 rounded-xl max-w-md w-full shadow-2xl overflow-hidden animate-fade-in text-left">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-150 dark:border-slate-700">
              <h3 className="text-base font-bold text-slate-850 dark:text-slate-100 flex items-center gap-2">
                <Coins size={18} className="text-emerald-500" />
                Record Loan Repayment
              </h3>
            </div>

            <form onSubmit={handleLogPayment}>
              <div className="p-6 space-y-4">
                {pmtError && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 text-rose-700 dark:text-rose-400 rounded-lg text-xs font-semibold">
                    {pmtError}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Payment Date" error={pmtErrors.payment_date} required>
                    <DatePicker required value={pmtDate} onChange={setPmtDate} />
                  </FormField>

                  <FormField label="Repayment Amount (AED)" error={pmtErrors.payment_amount} required>
                    <input
                      type="number"
                      required
                      className="w-full text-xs px-3 py-2 border border-slate-205 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-light text-slate-850 dark:text-slate-100"
                      placeholder="Enter amount"
                      value={pmtAmount}
                      onChange={(e) => setPmtAmount(e.target.value)}
                    />
                  </FormField>
                </div>

                <FormField label="Payment Method" error={pmtErrors.payment_method} required>
                  <select
                    className="w-full text-xs px-3 py-2 border border-slate-205 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:outline-none text-slate-850 dark:text-slate-100"
                    value={pmtMethod}
                    onChange={(e) => setPmtMethod(e.target.value)}
                  >
                    <option value="">-- Select Method --</option>
                    {LOAN_PAYMENT_METHODS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField label="Repayment Notes">
                  <input
                    type="text"
                    className="w-full text-xs px-3 py-2 border border-slate-205 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-light text-slate-850 dark:text-slate-100"
                    placeholder="e.g. Cash received at office"
                    value={pmtNotes}
                    onChange={(e) => setPmtNotes(e.target.value)}
                  />
                </FormField>

                <FormField label="Attachment (optional)">
                  <label className="flex items-center gap-2 text-xs px-3 py-2 border border-dashed border-slate-205 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg cursor-pointer text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">
                    <Paperclip size={14} />
                    <span className="truncate">{pmtFile ? pmtFile.name : 'Attach receipt (PDF / image)'}</span>
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => setPmtFile(e.target.files?.[0] || null)}
                    />
                  </label>
                </FormField>
              </div>

              <div className="flex items-center justify-end gap-2 px-6 py-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-150 dark:border-slate-700">
                <button
                  type="button"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-750 text-slate-700 dark:text-slate-300 hover:bg-slate-50 disabled:opacity-50"
                  onClick={() => setIsPaymentOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submitting && <Loader2 size={13} className="animate-spin" />}
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Loan Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 border border-slate-205 dark:border-slate-700 rounded-xl max-w-md w-full shadow-2xl overflow-hidden animate-fade-in text-left">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-150 dark:border-slate-700">
              <h3 className="text-base font-bold text-slate-850 dark:text-slate-100 flex items-center gap-2">
                <Pencil size={16} className="text-brand-light" />
                Update Loan
              </h3>
            </div>

            <form onSubmit={handleUpdateLoan}>
              <div className="p-6 space-y-4">
                {editError && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 text-rose-700 dark:text-rose-400 rounded-lg text-xs font-semibold">
                    {editError}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Monthly Deduction (AED)" error={editErrors.monthly_deduction}>
                    <input
                      type="number"
                      className="w-full text-xs px-3 py-2 border border-slate-205 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-light text-slate-850 dark:text-slate-100"
                      value={editDeduction}
                      onChange={(e) => setEditDeduction(e.target.value)}
                    />
                  </FormField>

                  <FormField label="Status" error={editErrors.status}>
                    <select
                      className="w-full text-xs px-3 py-2 border border-slate-205 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:outline-none text-slate-850 dark:text-slate-100"
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                    >
                      {LOAN_STATUS.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </FormField>
                </div>

                <FormField label="Notes">
                  <textarea
                    className="w-full text-xs px-3 py-2 border border-slate-205 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-light text-slate-850 dark:text-slate-100 h-16"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                  />
                </FormField>
              </div>

              <div className="flex items-center justify-end gap-2 px-6 py-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-150 dark:border-slate-700">
                <button
                  type="button"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-750 text-slate-700 dark:text-slate-300 hover:bg-slate-50 disabled:opacity-50"
                  onClick={() => setIsEditOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-brand-light hover:opacity-95 text-white shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submitting && <Loader2 size={13} className="animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
