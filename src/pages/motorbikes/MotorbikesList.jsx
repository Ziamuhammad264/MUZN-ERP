import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { DataTable } from '../../components/ui/DataTable';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { MotorbikeModal } from './MotorbikeModal';
import { motorbikesApi } from '../../api/services';
import { useFetch, asList } from '../../hooks/useApi';
import { BIKE_STATUS, labelOf } from '../../constants/options';
import { toast, confirmDialog } from '../../utils/notify';
import { apiMessage } from '../../api/axios';
import { formatDate, getDaysRemaining } from '../../utils/formatters';
import { Plus, Eye, Edit2, Trash2, Wrench, CheckCircle, ShieldAlert, Bike, Loader2 } from 'lucide-react';

export const MotorbikesList = () => {
  const navigate = useNavigate();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBike, setSelectedBike] = useState(null);

  const { data: listData, loading: listLoading, refetch: refetchList } = useFetch(
    () => motorbikesApi.list({ page: 1 }),
    []
  );
  const { data: stats, refetch: refetchStats } = useFetch(() => motorbikesApi.stats(), []);

  const { rows: bikes } = asList(listData);

  const refetchAll = useCallback(() => {
    refetchList();
    refetchStats();
  }, [refetchList, refetchStats]);

  const handleEdit = (bike, e) => {
    e.stopPropagation();
    setSelectedBike(bike);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (bike, e) => {
    e.stopPropagation();
    confirmDialog({
      title: 'Delete Fleet Vehicle Record',
      content:
        'Are you sure you want to delete this vehicle from your fleet registry? All historical assignment records and garage maintenance reference indices will be cleared. This cannot be undone.',
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          await motorbikesApi.remove(bike.id);
          toast.success('Motorbike deleted successfully.');
          refetchAll();
        } catch (err) {
          toast.error(apiMessage(err));
        }
      }
    });
  };

  const columns = [
    {
      header: 'Bike ID',
      accessor: 'bike_id',
      sortable: true
    },
    {
      header: 'Plate Details',
      accessor: 'plate_number',
      sortable: true,
      render: (val, row) => (
        <div>
          <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">
            {val} {row.plate_code || ''}
          </span>
          <span className="inline-block text-[9px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1.5 py-0.2 rounded ml-1.5 uppercase">
            {row.emirate}
          </span>
        </div>
      )
    },
    {
      header: 'Vehicle Info',
      accessor: 'brand',
      sortable: true,
      render: (val, row) => (
        <div>
          <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs">
            {val} {row.model}
          </span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-1">({row.year})</span>
        </div>
      )
    },
    {
      header: 'Zone',
      accessor: 'zone',
      sortable: true
    },
    {
      header: 'Mulkiya Expiry',
      accessor: 'mulkiya_expiry',
      sortable: true,
      render: (val) => {
        const days = getDaysRemaining(val);
        let color = 'text-emerald-600 font-semibold';
        if (days < 0) color = 'text-rose-600 font-bold';
        else if (days <= 30) color = 'text-amber-600 font-semibold';
        return <span className={color}>{formatDate(val)}</span>;
      }
    },
    {
      header: 'Status',
      accessor: 'status',
      sortable: true,
      render: (val) => <StatusBadge status={labelOf(BIKE_STATUS, val)} />
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (val, row) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => navigate(`/motorbikes/${val}`)}
            className="p-1 text-slate-400 dark:text-slate-500 hover:text-brand-light dark:hover:text-brand-dark rounded hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors"
            title="View History Details"
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fleet Motorbikes"
        subtitle="Manage fleet distribution, registration document expiries, assignment states, and garage logs."
        actions={
          <button
            onClick={() => {
              setSelectedBike(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-brand-light dark:bg-brand-dark hover:opacity-95 text-white font-semibold rounded-lg shadow-sm text-xs transition-all"
          >
            <Plus size={14} />
            <span>Register Bike</span>
          </button>
        }
      />

      {/* Fleet summary */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-xl flex items-center gap-3">
          <div className="p-2 bg-blue-50 dark:bg-blue-950/20 text-blue-500 rounded-lg">
            <Bike size={16} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Total Fleet Size</p>
            <p className="text-lg font-bold text-slate-850 dark:text-slate-100">{stats?.total ?? 0}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-xl flex items-center gap-3">
          <div className="p-2 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 rounded-lg">
            <CheckCircle size={16} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Available / Unassigned</p>
            <p className="text-lg font-bold text-slate-850 dark:text-slate-100">{stats?.available ?? 0}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-xl flex items-center gap-3">
          <div className="p-2 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-lg">
            <ShieldAlert size={16} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Expired Mulkiya / Ins.</p>
            <p className="text-lg font-bold text-slate-850 dark:text-slate-100">{stats?.expiry_alerts ?? 0}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-xl flex items-center gap-3">
          <div className="p-2 bg-amber-50 dark:bg-amber-950/20 text-amber-500 rounded-lg">
            <Wrench size={16} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">In Garage Repair</p>
            <p className="text-lg font-bold text-slate-850 dark:text-slate-100">{stats?.maintenance ?? 0}</p>
          </div>
        </div>
      </div>

      {/* Main Data table */}
      {listLoading ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-500 gap-2">
          <Loader2 size={24} className="animate-spin" />
          <span className="text-xs font-semibold">Loading fleet records...</span>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={bikes}
          searchPlaceholder="Search by ID, plate number, brand, model..."
          filterOptions={{
            key: 'status',
            label: 'Status',
            options: BIKE_STATUS.map((s) => s.value)
          }}
          emirateFilter
          emptyMessage="No motorbikes registered yet."
        />
      )}

      {/* Modal form */}
      <MotorbikeModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedBike(null);
        }}
        bike={selectedBike}
        onSaved={refetchAll}
      />
    </div>
  );
};
