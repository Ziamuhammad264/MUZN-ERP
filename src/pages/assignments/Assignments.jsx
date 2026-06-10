import { useState, useCallback } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { SectionCard } from '../../components/ui/SectionCard';
import { FormField } from '../../components/ui/FormField';
import { DatePicker } from '../../components/ui/date-picker';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { KPICard } from '../../components/ui/KPICard';
import { formatDate } from '../../utils/formatters';
import { ClipboardCheck, Undo2, ArrowLeftRight, UserCheck, Bike, Loader2 } from 'lucide-react';
import { useFetch, asList } from '../../hooks/useApi';
import { assignmentsApi, employeesApi, motorbikesApi } from '../../api/services';
import { toast, confirmDialog } from '../../utils/notify';
import { apiMessage } from '../../api/axios';
import { v, validateForm, cleanPayload, mapApiErrors } from '../../utils/validation';
import { ASSIGNMENT_STATUS, labelOf } from '../../constants/options';

export const Assignments = () => {
  // --- Data fetching --------------------------------------------------------
  const [statusFilter, setStatusFilter] = useState('');

  const {
    data: listPayload,
    loading: listLoading,
    refetch: refetchList,
  } = useFetch(
    () => assignmentsApi.list(statusFilter ? { status: statusFilter } : {}),
    [statusFilter]
  );

  const { data: statsData, refetch: refetchStats } = useFetch(() => assignmentsApi.stats(), []);

  const { data: currentPayload, refetch: refetchCurrent } = useFetch(
    () => assignmentsApi.current(),
    []
  );

  const { data: empPayload } = useFetch(
    () => employeesApi.list({ status: 'active', per_page: 100 }),
    []
  );

  const { data: bikePayload, refetch: refetchBikes } = useFetch(
    () => motorbikesApi.list({ status: 'available', per_page: 100 }),
    []
  );

  const allAssignments = asList(listPayload).rows;
  const currentAssignments = asList(currentPayload).rows;
  const availableEmployees = asList(empPayload).rows;
  const availableBikes = asList(bikePayload).rows;

  // Active assignments come from the dedicated /current endpoint; the history
  // log uses the filtered list (returned/cancelled or whatever is selected).
  const activeAssignments = currentAssignments;
  const historyAssignments = allAssignments.filter((a) => a.status !== 'active');

  const refetchAll = useCallback(() => {
    refetchList();
    refetchStats();
    refetchCurrent();
    refetchBikes();
  }, [refetchList, refetchStats, refetchCurrent, refetchBikes]);

  // --- Assignment form state ------------------------------------------------
  const [employeeId, setEmployeeId] = useState('');
  const [bikeId, setBikeId] = useState('');
  const [assignDate, setAssignDate] = useState('');
  const [handoverCondition, setHandoverCondition] = useState('');
  const [errors, setErrors] = useState({});
  const [assigning, setAssigning] = useState(false);

  // --- Return modal state ---------------------------------------------------
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [selectedAsgId, setSelectedAsgId] = useState(null);
  const [returnDate, setReturnDate] = useState('');
  const [returnCondition, setReturnCondition] = useState('');
  const [returnRemarks, setReturnRemarks] = useState('');
  const [returnErrors, setReturnErrors] = useState({});
  const [returning, setReturning] = useState(false);

  // --- Helpers to read snake_case API fields --------------------------------
  const employeeName = (a) => a.employee_name || a.employee?.name || '—';
  const plateNumber = (a) =>
    a.plate_number || a.motorbike?.plate_number || a.motorbike || '—';

  // --- Mutations ------------------------------------------------------------
  const validateAssign = (form) => {
    const errs = validateForm(form, {
      employee_id: [v.required('Rider')],
      motorbike_id: [v.required('Motorbike')],
      start_date: [v.required('Assignment start date'), v.date('Assignment start date')],
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    const form = {
      employee_id: employeeId,
      motorbike_id: bikeId,
      start_date: assignDate,
      handover_condition: handoverCondition,
    };
    if (!validateAssign(form) || assigning) return;

    // Send only filled fields — empty strings would fail the API's date
    // validation (422). No numeric coercion needed for assignment dates.
    const payload = cleanPayload(form);

    setAssigning(true);
    try {
      await assignmentsApi.assign(payload);
      toast.success('Motorbike assigned successfully.');
      setEmployeeId('');
      setBikeId('');
      setErrors({});
      refetchAll();
    } catch (err) {
      const mapped = mapApiErrors(err);
      if (mapped) setErrors(mapped);
      toast.error(apiMessage(err));
    } finally {
      setAssigning(false);
    }
  };

  const handleReturnClick = (asgId) => {
    setSelectedAsgId(asgId);
    setReturnDate('');
    setReturnCondition('');
    setReturnRemarks('');
    setReturnErrors({});
    setIsReturnModalOpen(true);
  };

  const validateReturn = (form) => {
    const errs = validateForm(form, {
      return_date: [v.required('Return date'), v.date('Return date')],
    });
    setReturnErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleReturnConfirm = async (e) => {
    e.preventDefault();
    if (!selectedAsgId) return;
    const form = {
      return_date: returnDate,
      return_condition: returnCondition,
      remarks: returnRemarks,
    };
    if (!validateReturn(form) || returning) return;

    // Send only filled fields — empty strings would fail the API's date
    // validation (422).
    const payload = cleanPayload(form);

    setReturning(true);
    try {
      await assignmentsApi.returnBike(selectedAsgId, payload);
      toast.success('Bike returned successfully.');
      setIsReturnModalOpen(false);
      setSelectedAsgId(null);
      setReturnErrors({});
      refetchAll();
    } catch (err) {
      const mapped = mapApiErrors(err);
      if (mapped) setReturnErrors(mapped);
      toast.error(apiMessage(err));
    } finally {
      setReturning(false);
    }
  };

  const handlePendingReturn = async (asgId) => {
    try {
      await assignmentsApi.pendingReturn(asgId);
      toast.success('Assignment marked as pending return.');
      refetchAll();
    } catch (err) {
      toast.error(apiMessage(err));
    }
  };

  const handleCancel = (asgId) => {
    confirmDialog({
      title: 'Cancel this assignment?',
      content: 'This will release the motorbike and mark the assignment as cancelled.',
      okText: 'Cancel Assignment',
      okType: 'danger',
      onOk: async () => {
        try {
          await assignmentsApi.cancel(asgId);
          toast.success('Assignment cancelled.');
          refetchAll();
        } catch (err) {
          toast.error(apiMessage(err));
        }
      },
    });
  };

  // --- Stats for KPI cards --------------------------------------------------
  const stats = statsData || {};

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fleet Assignments"
        subtitle="Distribute and assign motorbikes to delivery riders, register returns, and trace vehicle logs."
      />

      {/* KPI widgets */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <KPICard title="Total Assignments" icon={ArrowLeftRight} value={stats.total ?? '—'} />
        <KPICard title="Active" icon={Bike} value={stats.active ?? '—'} />
        <KPICard title="Returned" icon={UserCheck} value={stats.returned ?? '—'} />
        <KPICard title="Cancelled" icon={Undo2} value={stats.cancelled ?? '—'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left pane - Form */}
        <div className="lg:col-span-1">
          <SectionCard title="New Motorbike Assignment">
            <form onSubmit={handleAssign} className="space-y-4 text-left">
              <FormField label="Select Available Rider" error={errors.employee_id} required>
                <select
                  className="w-full text-xs px-3 py-2 border border-slate-205 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-light text-slate-800 dark:text-slate-100"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                >
                  <option value="">-- Select Rider --</option>
                  {availableEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.employee_id}) — {emp.work_emirate}
                    </option>
                  ))}
                </select>
                {availableEmployees.length === 0 && (
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">No active riders available for assignment.</p>
                )}
              </FormField>

              <FormField label="Select Available Motorbike" error={errors.motorbike_id} required>
                <select
                  className="w-full text-xs px-3 py-2 border border-slate-205 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-light text-slate-800 dark:text-slate-100"
                  value={bikeId}
                  onChange={(e) => setBikeId(e.target.value)}
                >
                  <option value="">-- Select Motorbike --</option>
                  {availableBikes.map((bike) => (
                    <option key={bike.id} value={bike.id}>
                      Plate: {bike.plate_number} {bike.plate_code} ({bike.brand} {bike.model})
                    </option>
                  ))}
                </select>
                {availableBikes.length === 0 && (
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">No motorbikes available in stock.</p>
                )}
              </FormField>

              <FormField label="Assignment Start Date" error={errors.start_date} required>
                <DatePicker
                  required
                  value={assignDate}
                  onChange={setAssignDate}
                />
              </FormField>

              <FormField label="Handover Condition" required>
                <input
                  type="text"
                  className="w-full text-xs px-3 py-2 border border-slate-205 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-light text-slate-800 dark:text-slate-100"
                  placeholder="e.g. Good condition, no damage"
                  value={handoverCondition}
                  onChange={(e) => setHandoverCondition(e.target.value)}
                />
              </FormField>

              <button
                type="submit"
                disabled={assigning || availableEmployees.length === 0 || availableBikes.length === 0}
                className="w-full py-2 bg-brand-light dark:bg-brand-dark hover:opacity-95 text-white font-semibold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 text-xs disabled:opacity-50"
              >
                {assigning ? <Loader2 size={14} className="animate-spin" /> : <ClipboardCheck size={14} />}
                <span>{assigning ? 'Assigning…' : 'Confirm Assignment'}</span>
              </button>
            </form>
          </SectionCard>
        </div>

        {/* Right pane - Active assignments */}
        <div className="lg:col-span-2 space-y-6">
          <SectionCard title="Active Assignments">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-semibold tracking-wider">
                    <th className="py-2.5 px-3">Rider / Employee</th>
                    <th className="py-2.5 px-3">Motorbike Plate</th>
                    <th className="py-2.5 px-3">Assigned Date</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 dark:divide-slate-700 text-slate-700 dark:text-slate-200">
                  {listLoading && activeAssignments.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400 dark:text-slate-500">
                        <Loader2 size={18} className="animate-spin inline-block mr-2" />
                        Loading assignments…
                      </td>
                    </tr>
                  ) : activeAssignments.length > 0 ? (
                    activeAssignments.map((asg) => (
                      <tr key={asg.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10">
                        <td className="py-3 px-3 font-semibold">{employeeName(asg)}</td>
                        <td className="py-3 px-3">
                          <span className="font-bold">{plateNumber(asg)}</span>
                        </td>
                        <td className="py-3 px-3">{formatDate(asg.start_date)}</td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handlePendingReturn(asg.id)}
                              className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-white font-semibold rounded-lg text-[10px] shadow-sm transition-colors"
                            >
                              Pending Return
                            </button>
                            <button
                              onClick={() => handleReturnClick(asg.id)}
                              className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-lg text-[10px] shadow-sm transition-colors"
                            >
                              Return Bike
                            </button>
                            <button
                              onClick={() => handleCancel(asg.id)}
                              className="px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 font-semibold rounded-lg text-[10px] shadow-sm transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400 dark:text-slate-500">
                        No active vehicle assignments.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>

      </div>

      {/* Assignment History logs */}
      <SectionCard
        title="Assignment History Log"
        actions={
          <select
            className="text-xs px-2.5 py-1.5 border border-slate-205 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:outline-none text-slate-700 dark:text-slate-200"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            {ASSIGNMENT_STATUS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        }
      >
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-semibold">
                <th className="py-2.5 px-3">Rider Name</th>
                <th className="py-2.5 px-3">Plate No</th>
                <th className="py-2.5 px-3">Assign Date</th>
                <th className="py-2.5 px-3">Return Date</th>
                <th className="py-2.5 px-3">Return Condition</th>
                <th className="py-2.5 px-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 dark:divide-slate-700 text-slate-600 dark:text-slate-300">
              {listLoading && historyAssignments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 dark:text-slate-500">
                    <Loader2 size={18} className="animate-spin inline-block mr-2" />
                    Loading history…
                  </td>
                </tr>
              ) : historyAssignments.length > 0 ? (
                historyAssignments.map((asg) => (
                  <tr key={asg.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10">
                    <td className="py-3 px-3 font-semibold">{employeeName(asg)}</td>
                    <td className="py-3 px-3 font-bold">{plateNumber(asg)}</td>
                    <td className="py-3 px-3">{formatDate(asg.start_date)}</td>
                    <td className="py-3 px-3">{asg.return_date ? formatDate(asg.return_date) : '—'}</td>
                    <td className="py-3 px-3 italic text-slate-500 dark:text-slate-400">{asg.return_condition || '—'}</td>
                    <td className="py-3 px-3 text-right">
                      <StatusBadge status={labelOf(ASSIGNMENT_STATUS, asg.status)} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 dark:text-slate-500">
                    No assignment histories logged.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Return Bike Modal Popup */}
      {isReturnModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl max-w-md w-full shadow-2xl overflow-hidden animate-fade-in text-left">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-150 dark:border-slate-700">
              <h3 className="text-base font-bold text-slate-850 dark:text-slate-100 flex items-center gap-2">
                <Undo2 size={18} className="text-rose-500" />
                Return Fleet Motorbike
              </h3>
            </div>

            <form onSubmit={handleReturnConfirm}>
              <div className="p-6 space-y-4">
                <FormField label="Return Date" error={returnErrors.return_date} required>
                  <DatePicker
                    required
                    value={returnDate}
                    onChange={setReturnDate}
                  />
                </FormField>

                <FormField label="Vehicle Condition on Return" required>
                  <select
                    className="w-full text-xs px-3 py-2 border border-slate-205 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:outline-none text-slate-800 dark:text-slate-100"
                    value={returnCondition}
                    onChange={(e) => setReturnCondition(e.target.value)}
                  >
                    <option value="">Select condition…</option>
                    <option value="Excellent - Cleaned">Excellent - Cleaned</option>
                    <option value="Good - Normal Wear">Good - Normal Wear</option>
                    <option value="Damaged - Repair Required">Damaged - Repair Required</option>
                    <option value="Critical - Accidental Damage">Critical - Accidental Damage</option>
                  </select>
                </FormField>

                <FormField label="Remarks">
                  <input
                    type="text"
                    className="w-full text-xs px-3 py-2 border border-slate-205 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-light text-slate-800 dark:text-slate-100"
                    placeholder="e.g. Returned on time"
                    value={returnRemarks}
                    onChange={(e) => setReturnRemarks(e.target.value)}
                  />
                </FormField>
              </div>

              <div className="flex items-center justify-end gap-2 px-6 py-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-150 dark:border-slate-700">
                <button
                  type="button"
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-750 text-slate-750 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750"
                  onClick={() => setIsReturnModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={returning}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-rose-605 hover:bg-rose-500 text-white shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  {returning && <Loader2 size={13} className="animate-spin" />}
                  Confirm Return
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
