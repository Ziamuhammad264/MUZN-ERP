import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { DataTable } from '../../components/ui/DataTable';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmployeeModal } from './EmployeeModal';
import { employeesApi } from '../../api/services';
import { useFetch, asList } from '../../hooks/useApi';
import { toast, confirmDialog } from '../../utils/notify';
import { apiMessage } from '../../api/axios';
import { EMPLOYEE_STATUS, labelOf } from '../../constants/options';
import { formatCurrency, getDaysRemaining } from '../../utils/formatters';
import { Plus, Eye, Edit2, Trash2, ShieldAlert, Award, Users, Loader2 } from 'lucide-react';

export const EmployeesList = () => {
  const navigate = useNavigate();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  // Fetch the employee list + stats together; refetch after any mutation.
  const { data, loading, refetch } = useFetch(
    () =>
      Promise.all([
        employeesApi.list({ page: 1, per_page: 100 }),
        employeesApi.stats().catch(() => null)
      ]).then(([listPayload, statsPayload]) => ({
        rows: asList(listPayload).rows,
        stats: statsPayload
      })),
    []
  );

  const rows = data?.rows ?? [];
  const stats = data?.stats ?? null;
  const loadData = refetch;

  const handleEdit = (employee, e) => {
    e.stopPropagation();
    setSelectedEmployee(employee);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (employee, e) => {
    e.stopPropagation();
    confirmDialog({
      title: 'Delete Employee Profile',
      content:
        'Are you sure you want to delete this employee profile? All payroll history references and fine assignments will be lost. This cannot be undone.',
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          await employeesApi.remove(employee.id);
          toast.success('Employee profile deleted.');
          loadData();
        } catch (err) {
          toast.error(apiMessage(err));
        }
      }
    });
  };

  // Helper to render document alert circles
  const renderDocAlerts = (emp) => {
    const dates = [
      { name: 'Passport', d: emp.passport_expiry },
      { name: 'Emirates ID', d: emp.emirates_id_expiry },
      { name: 'Visa', d: emp.visa_expiry },
      { name: 'Labour Card', d: emp.labour_card_expiry },
      { name: 'Driving License', d: emp.driving_license_expiry }
    ];

    return (
      <div className="flex gap-1">
        {dates.map((doc, idx) => {
          if (!doc.d) return null;
          const days = getDaysRemaining(doc.d);
          let color = 'bg-emerald-500';
          let title = `${doc.name} OK (${days}d remaining)`;

          if (days < 0) {
            color = 'bg-rose-600 animate-pulse';
            title = `${doc.name} EXPIRED!`;
          } else if (days < 15) {
            color = 'bg-rose-500 animate-pulse';
            title = `${doc.name} Expiring in ${days} days`;
          } else if (days <= 30) {
            color = 'bg-amber-500';
            title = `${doc.name} Expiring in ${days} days`;
          }

          return (
            <span
              key={idx}
              className={`w-2 h-2 rounded-full ${color}`}
              title={title}
            />
          );
        })}
      </div>
    );
  };

  const columns = [
    {
      header: 'ID',
      accessor: 'employee_id',
      sortable: true
    },
    {
      header: 'Rider / Employee',
      accessor: 'name',
      sortable: true,
      render: (val, row) => (
        <div>
          <div className="font-bold text-slate-850 dark:text-slate-100">{val}</div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">{row.mobile}</div>
        </div>
      )
    },
    {
      header: 'Job & platform',
      accessor: 'job_title',
      sortable: true,
      render: (val, row) => (
        <div>
          <div className="font-semibold text-slate-700 dark:text-slate-300 text-xs">{val}</div>
          {row.platform_name ? (
            <span className="inline-block text-[9px] font-bold bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 px-1.5 py-0.2 rounded mt-0.5 border border-blue-100 dark:border-blue-900/30">
              {row.platform_name} ({row.platform_id})
            </span>
          ) : (
            <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-500">Office</span>
          )}
        </div>
      )
    },
    {
      header: 'Emirate',
      accessor: 'work_emirate',
      sortable: true,
      render: (val, row) => (
        <div>
          <div className="font-medium text-xs">{val}</div>
          <div className="text-[10px] text-slate-405 dark:text-slate-500">{row.zone || 'No Zone'}</div>
        </div>
      )
    },
    {
      header: 'Salary & WPS',
      accessor: 'salary_amount',
      sortable: true,
      render: (val, row) => (
        <div>
          <div className="font-bold text-xs">{formatCurrency(val)}</div>
          <div className="text-[9px] font-semibold text-slate-405">{row.salary_type}</div>
        </div>
      )
    },
    {
      header: 'Alerts',
      accessor: 'id',
      render: (val, row) => renderDocAlerts(row)
    },
    {
      header: 'Status',
      accessor: 'status',
      sortable: true,
      render: (val) => <StatusBadge status={labelOf(EMPLOYEE_STATUS, val)} />
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (val, row) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => navigate(`/employees/${val}`)}
            className="p-1 text-slate-400 dark:text-slate-500 hover:text-brand-light dark:hover:text-brand-dark rounded hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors"
            title="View Details"
          >
            <Eye size={14} />
          </button>
          <button
            onClick={(e) => handleEdit(row, e)}
            className="p-1 text-slate-400 dark:text-slate-500 hover:text-amber-500 dark:hover:text-amber-400 rounded hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors"
            title="Edit"
          >
            <Edit2 size={14} />
          </button>
          <button
            onClick={(e) => handleDeleteClick(row, e)}
            className="p-1 text-slate-400 dark:text-slate-500 hover:text-rose-500 dark:hover:text-rose-455 rounded hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )
    }
  ];

  // KPI values — prefer server stats, fall back to client-side counts.
  const totalRiders = stats?.total ?? rows.length;
  const activeCount =
    stats?.active ?? rows.filter((e) => e.status === 'active').length;
  const expiryCount =
    stats?.expiry_alerts ??
    rows.filter((emp) => {
      const dates = [
        emp.passport_expiry,
        emp.emirates_id_expiry,
        emp.visa_expiry,
        emp.labour_card_expiry,
        emp.driving_license_expiry
      ];
      return dates.some((d) => d && getDaysRemaining(d) < 30);
    }).length;
  const wpsEnrolled =
    stats?.wps ?? rows.filter((e) => e.wps_status === 'wps').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employee & Rider Registry"
        subtitle="Manage profiles, visa expiries, work locations, platform assignments, and contract types."
        actions={
          <button
            onClick={() => {
              setSelectedEmployee(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-brand-light dark:bg-brand-dark hover:opacity-95 text-white font-semibold rounded-lg shadow-sm text-xs transition-all"
          >
            <Plus size={14} />
            <span>Add Employee</span>
          </button>
        }
      />

      {/* KPI summaries */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-xl flex items-center gap-3">
          <div className="p-2 bg-blue-50 dark:bg-blue-950/20 text-blue-500 rounded-lg">
            <Users size={16} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Total Employees</p>
            <p className="text-lg font-bold text-slate-850 dark:text-slate-100">{totalRiders}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-xl flex items-center gap-3">
          <div className="p-2 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 rounded-lg">
            <Award size={16} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Active / On Road</p>
            <p className="text-lg font-bold text-slate-850 dark:text-slate-100">{activeCount}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-xl flex items-center gap-3">
          <div className="p-2 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-lg">
            <ShieldAlert size={16} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Document Expiries</p>
            <p className="text-lg font-bold text-slate-850 dark:text-slate-100">{expiryCount}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-xl flex items-center gap-3">
          <div className="p-2 bg-amber-50 dark:bg-amber-950/20 text-amber-500 rounded-lg">
            <Users size={16} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">WPS Enrolled</p>
            <p className="text-lg font-bold text-slate-850 dark:text-slate-100">{wpsEnrolled}</p>
          </div>
        </div>
      </div>

      {/* Main Data table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-500 gap-2">
          <Loader2 size={28} className="animate-spin text-brand-light dark:text-brand-dark" />
          <span className="text-xs font-semibold">Loading employees…</span>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          searchPlaceholder="Search by ID, name, mobile, platform..."
          filterOptions={{
            key: 'status',
            label: 'Status',
            options: EMPLOYEE_STATUS.map((o) => o.value)
          }}
          emptyMessage="No employees registered yet. Click “Add Employee” to create the first record."
        />
      )}

      {/* Modal form */}
      <EmployeeModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedEmployee(null);
        }}
        employee={selectedEmployee}
        onSuccess={loadData}
      />
    </div>
  );
};
