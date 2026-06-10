import React, { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { DocumentExpiryBadge } from '../../components/ui/DocumentExpiryBadge';
import { SectionCard } from '../../components/ui/SectionCard';
import { FileUploadZone } from '../../components/shared/FileUploadZone';
import { formatDate } from '../../utils/formatters';
import { MotorbikeModal } from './MotorbikeModal';
import { motorbikesApi } from '../../api/services';
import { useFetch, asList } from '../../hooks/useApi';
import { BIKE_STATUS, BIKE_DOCUMENT_TYPES, labelOf } from '../../constants/options';
import { toast, confirmDialog } from '../../utils/notify';
import { apiMessage } from '../../api/axios';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Bike,
  Loader2,
  Paperclip,
  Download,
  Trash,
  UploadCloud
} from 'lucide-react';

export const MotorbikeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const { data: bike, loading, error, refetch } = useFetch(() => motorbikesApi.get(id), [id]);

  // Documents
  const { data: docsData, loading: docsLoading, refetch: refetchDocs } = useFetch(
    () => motorbikesApi.documents(id),
    [id]
  );
  const { rows: documents } = asList(docsData);

  const [docType, setDocType] = useState(BIKE_DOCUMENT_TYPES[0].value);
  const [pendingFile, setPendingFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleDelete = useCallback(() => {
    confirmDialog({
      title: 'Delete Motorbike Record',
      content:
        'Are you sure you want to permanently delete this vehicle from your fleet? All maintenance invoice logs and active assignment histories will be cleared. This action cannot be undone.',
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          await motorbikesApi.remove(id);
          toast.success('Motorbike deleted successfully.');
          navigate('/motorbikes');
        } catch (err) {
          toast.error(apiMessage(err));
        }
      }
    });
  }, [id, navigate]);

  const handleUpload = async () => {
    if (!pendingFile || uploading) return;
    setUploading(true);
    try {
      await motorbikesApi.uploadDocument(id, { document_type: docType, file: pendingFile });
      toast.success('Document uploaded successfully.');
      setPendingFile(null);
      refetchDocs();
    } catch (err) {
      toast.error(apiMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = (documentId) => {
    confirmDialog({
      title: 'Delete Document',
      content: 'Remove this document from the vehicle record? This cannot be undone.',
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          await motorbikesApi.deleteDocument(id, documentId);
          toast.success('Document deleted.');
          refetchDocs();
        } catch (err) {
          toast.error(apiMessage(err));
        }
      }
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-500 gap-2">
        <Loader2 size={24} className="animate-spin" />
        <span className="text-xs font-semibold">Loading motorbike record...</span>
      </div>
    );
  }

  if (error || !bike) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400 dark:text-slate-500">{error || 'Motorbike record not found.'}</p>
        <button onClick={() => navigate('/motorbikes')} className="mt-4 text-xs font-bold text-brand-light">
          Back to list
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate('/motorbikes')}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
        >
          <ArrowLeft size={14} />
        </button>
        <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">Back to fleet</span>
      </div>

      <PageHeader
        title={`Plate: ${bike.plate_number} ${bike.plate_code || ''}`}
        subtitle={`${bike.brand} ${bike.model} (${bike.year}) — ID: ${bike.bike_id || bike.id}`}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900 font-semibold rounded-lg text-xs transition-all"
            >
              <Edit size={13} />
              <span>Edit Details</span>
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 text-rose-700 dark:text-rose-400 hover:bg-rose-100/50 dark:hover:bg-rose-950/40 font-semibold rounded-lg text-xs transition-all"
            >
              <Trash2 size={13} />
              <span>Delete</span>
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column */}
        <div className="lg:col-span-1 space-y-6">
          <SectionCard>
            <div className="flex flex-col items-center text-center pb-4 border-b border-slate-100 dark:border-slate-700">
              <div className="p-4 bg-brand-light/10 dark:bg-brand-dark/10 text-brand-light dark:text-brand-dark rounded-2xl mb-3">
                <Bike size={32} />
              </div>
              <h3 className="font-bold text-base text-slate-850 dark:text-slate-100 font-heading">
                {bike.brand} {bike.model}
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold mt-0.5">
                {bike.bike_type || 'Motorbike'} ({bike.color || 'N/A'})
              </p>
              <div className="mt-2.5">
                <StatusBadge status={labelOf(BIKE_STATUS, bike.status)} />
              </div>
            </div>

            {/* Spec details */}
            <div className="py-4 space-y-3.5 border-b border-slate-100 dark:border-slate-700 text-xs text-left">
              <div className="flex justify-between">
                <span className="text-slate-450 font-semibold">Chassis No.</span>
                <span className="font-bold text-slate-750 dark:text-slate-200 select-all">{bike.chassis_number || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-450 font-semibold">Engine No.</span>
                <span className="font-bold text-slate-750 dark:text-slate-200 select-all">{bike.engine_number || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-450 font-semibold">Reg. Emirate</span>
                <span className="font-bold text-slate-750 dark:text-slate-200">{bike.emirate} ({bike.zone || 'No Zone'})</span>
              </div>
            </div>

            {/* Expiries */}
            <div className="pt-4 space-y-3.5 text-xs text-left">
              <div>
                <span className="text-slate-400 dark:text-slate-500 block mb-1">Mulkiya Registration Expiry</span>
                <DocumentExpiryBadge expiryDate={bike.mulkiya_expiry} label="Mulkiya" />
              </div>
              <div>
                <span className="text-slate-450 block mb-1">Insurance Policy Expiry ({bike.insurance_company || 'N/A'})</span>
                <DocumentExpiryBadge expiryDate={bike.insurance_expiry} label="Insurance" />
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Right Column - Tabs */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-800 border border-slate-205 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
            <div className="flex border-b border-slate-150 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/10 px-4">
              {['overview', 'documents'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-3 text-xs font-bold capitalize transition-colors ${
                    activeTab === tab
                      ? 'border-b-2 border-brand-light dark:border-brand-dark text-brand-light dark:text-brand-dark'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-750 dark:hover:text-slate-200'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="p-6">

              {/* Tab 1: Overview and Notes */}
              {activeTab === 'overview' && (
                <div className="text-left space-y-4">
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Fleet Maintenance notes</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-350 bg-slate-50 dark:bg-slate-900 p-3.5 rounded-lg border border-slate-150 dark:border-slate-800 leading-relaxed">
                      {bike.notes || 'No condition details logged. Vehicle is in standard operational status.'}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Registration Info</h4>
                    <ul className="text-xs space-y-2 text-slate-600 dark:text-slate-300">
                      <li>• Insurance Company: <strong>{bike.insurance_company || '—'}</strong></li>
                      <li>• Policy Expiry: <strong>{formatDate(bike.insurance_expiry)}</strong></li>
                      <li>• Mulkiya Expiry: <strong>{formatDate(bike.mulkiya_expiry)}</strong></li>
                    </ul>
                  </div>
                </div>
              )}

              {/* Tab 2: Documents */}
              {activeTab === 'documents' && (
                <div className="text-left space-y-5">
                  {/* Upload form */}
                  <div className="space-y-3 border border-slate-150 dark:border-slate-700 rounded-xl p-4 bg-slate-50/40 dark:bg-slate-900/10">
                    <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Upload Document</h4>
                    <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                      <select
                        className="text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:outline-none text-slate-800 dark:text-slate-100"
                        value={docType}
                        onChange={(e) => setDocType(e.target.value)}
                      >
                        {BIKE_DOCUMENT_TYPES.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={handleUpload}
                        disabled={!pendingFile || uploading}
                        className="flex items-center justify-center gap-1.5 px-4 py-2 bg-brand-light hover:opacity-95 text-white font-semibold rounded-lg text-xs transition-all disabled:opacity-50"
                      >
                        <UploadCloud size={14} />
                        <span>{uploading ? 'Uploading...' : 'Upload'}</span>
                      </button>
                    </div>
                    <FileUploadZone
                      accept=".pdf,.png,.jpg,.jpeg"
                      onUpload={(file) => setPendingFile(file)}
                    />
                  </div>

                  {/* Document list */}
                  {docsLoading ? (
                    <div className="flex items-center justify-center py-6 text-slate-400 dark:text-slate-500 gap-2">
                      <Loader2 size={18} className="animate-spin" />
                      <span className="text-xs">Loading documents...</span>
                    </div>
                  ) : documents.length > 0 ? (
                    <div className="space-y-2.5">
                      {documents.map((file) => (
                        <div
                          key={file.id}
                          className="flex justify-between items-center text-xs border border-slate-150 dark:border-slate-700 p-2.5 rounded-lg bg-slate-50/30 dark:bg-slate-900/20"
                        >
                          <div className="flex items-center gap-2">
                            <Paperclip size={14} className="text-slate-400 dark:text-slate-500" />
                            <div>
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {file.file_name || file.name || `Document #${file.id}`}
                              </span>
                              {(file.document_type || file.type) && (
                                <span className="inline-block text-[9px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 px-1.5 py-0.2 rounded ml-2 uppercase">
                                  {labelOf(BIKE_DOCUMENT_TYPES, file.document_type || file.type)}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {(file.url || file.file_url) && (
                              <a
                                href={file.url || file.file_url}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-700 transition-colors"
                                title="Download document"
                              >
                                <Download size={14} />
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteDocument(file.id)}
                              className="p-1 rounded hover:bg-rose-100 dark:hover:bg-rose-950/30 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                              title="Delete document"
                            >
                              <Trash size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-xs text-slate-400 dark:text-slate-500 flex flex-col items-center gap-1.5">
                      <Paperclip size={18} />
                      <span>No document uploads attached to this vehicle.</span>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>

      </div>

      {/* Edit Form Modal */}
      <MotorbikeModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        bike={bike}
        onSaved={refetch}
      />
    </div>
  );
};
