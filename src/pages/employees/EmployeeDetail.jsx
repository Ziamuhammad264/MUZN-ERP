import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { DocumentExpiryBadge } from '../../components/ui/DocumentExpiryBadge';
import { SectionCard } from '../../components/ui/SectionCard';
import { FileUploadZone } from '../../components/shared/FileUploadZone';
import { DatePicker } from '../../components/ui/date-picker';
import { EmployeeModal } from './EmployeeModal';
import { employeesApi } from '../../api/services';
import { useFetch } from '../../hooks/useApi';
import { toast, confirmDialog } from '../../utils/notify';
import { apiMessage } from '../../api/axios';
import { EMPLOYEE_STATUS, SALARY_TYPE, WPS_STATUS, EMPLOYEE_DOCUMENT_TYPES, labelOf } from '../../constants/options';
import { formatCurrency } from '../../utils/formatters';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Phone,
  Mail,
  Globe,
  Briefcase,
  MapPin,
  Wallet,
  Paperclip,
  Download,
  Loader2,
  FileText,
  Image as ImageIcon
} from 'lucide-react';

export const EmployeeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [isEditOpen, setIsEditOpen] = useState(false);

  // Upload form state
  const [docType, setDocType] = useState('passport');
  const [docFile, setDocFile] = useState(null);
  const [docExpiry, setDocExpiry] = useState('');
  const [uploading, setUploading] = useState(false);

  const { data: employee, loading, refetch: loadEmployee } = useFetch(
    () => employeesApi.get(id),
    [id]
  );

  const { data: documentsData, loading: docsLoading, refetch: loadDocuments } = useFetch(
    () => employeesApi.documents(id).then((payload) => payload?.all_documents ?? []),
    [id]
  );
  const documents = documentsData ?? [];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-500 gap-2">
        <Loader2 size={28} className="animate-spin text-brand-light dark:text-brand-dark" />
        <span className="text-xs font-semibold">Loading profile…</span>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400 dark:text-slate-300">Employee profile not found.</p>
        <button onClick={() => navigate('/employees')} className="mt-4 text-xs font-bold text-brand-light">
          Back to list
        </button>
      </div>
    );
  }

  const handleDelete = () => {
    confirmDialog({
      title: 'Delete Employee Profile',
      content: `Are you sure you want to permanently delete the profile of ${employee.name}? All historical pay records and assignments linked to this user will be removed. This action cannot be undone.`,
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          await employeesApi.remove(employee.id);
          toast.success('Employee profile deleted.');
          navigate('/employees');
        } catch (err) {
          toast.error(apiMessage(err));
        }
      }
    });
  };

  const handleUpload = async () => {
    if (!docFile) {
      toast.warning('Please choose a file to upload.');
      return;
    }
    setUploading(true);
    try {
      await employeesApi.uploadDocument(employee.id, {
        document_type: docType,
        file: docFile,
        expiry_date: docExpiry || undefined
      });
      toast.success('Document uploaded.');
      setDocFile(null);
      setDocExpiry('');
      loadDocuments();
    } catch (err) {
      toast.error(apiMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = (doc) => {
    confirmDialog({
      title: 'Delete Document',
      content: 'Remove this document from the employee profile? This cannot be undone.',
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          await employeesApi.deleteDocument(employee.id, doc.id);
          toast.success('Document deleted.');
          loadDocuments();
        } catch (err) {
          toast.error(apiMessage(err));
        }
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate('/employees')}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
        >
          <ArrowLeft size={14} />
        </button>
        <span className="text-xs font-semibold text-slate-400 dark:text-slate-300">Back to registry</span>
      </div>

      <PageHeader
        title={employee.name}
        subtitle={`Employee ID: ${employee.employee_id || employee.id} — ${employee.job_title || '—'}`}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900 font-semibold rounded-lg text-xs transition-all"
            >
              <Edit size={13} />
              <span>Edit Profile</span>
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

      {/* Main Grid: Left is Summary Cards, Right is Documents */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column - Details Summary Card */}
        <div className="lg:col-span-1 space-y-6">
          <SectionCard>
            <div className="flex flex-col items-center text-center pb-4 border-b border-slate-100 dark:border-slate-700">
              <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-brand-light dark:border-brand-dark mb-3 flex items-center justify-center bg-brand-light/10 dark:bg-brand-dark/10">
                <span className="text-2xl font-bold text-brand-light dark:text-brand-dark">
                  {(employee.name || '?').charAt(0).toUpperCase()}
                </span>
              </div>
              <h3 className="font-bold text-base text-slate-850 dark:text-slate-100 font-heading">{employee.name}</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold mt-0.5">{employee.job_title || '—'}</p>
              <div className="mt-2.5">
                <StatusBadge status={labelOf(EMPLOYEE_STATUS, employee.status)} />
              </div>
            </div>

            {/* Contact details */}
            <div className="py-4 space-y-3 border-b border-slate-100 dark:border-slate-700 text-xs text-left">
              <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300">
                <Phone size={14} className="text-slate-400 dark:text-slate-500 flex-shrink-0" />
                <span>{employee.mobile}</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300">
                <Mail size={14} className="text-slate-400 dark:text-slate-500 flex-shrink-0" />
                <span className="truncate">{employee.email || 'No email registered'}</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300">
                <Globe size={14} className="text-slate-400 dark:text-slate-500 flex-shrink-0" />
                <span>{employee.nationality || '—'}</span>
              </div>
            </div>

            {/* Employment and salary structure details */}
            <div className="pt-4 space-y-3.5 text-xs text-left">
              <div className="flex justify-between">
                <span className="text-slate-450 dark:text-slate-400 font-semibold flex items-center gap-1.5"><Briefcase size={13} /> Job Department</span>
                <span className="font-bold text-slate-750 dark:text-slate-200">{employee.department || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-450 dark:text-slate-400 font-semibold flex items-center gap-1.5"><MapPin size={13} /> Work Emirate</span>
                <span className="font-bold text-slate-750 dark:text-slate-200">{employee.work_emirate} ({employee.zone || 'No zone'})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-450 dark:text-slate-400 font-semibold flex items-center gap-1.5"><Wallet size={13} /> Salary Basis</span>
                <span className="font-bold text-slate-750 dark:text-slate-200">{formatCurrency(employee.salary_amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-455 dark:text-slate-400 font-semibold">Payment / WPS</span>
                <span className="font-bold text-slate-750 dark:text-slate-200">
                  {labelOf(SALARY_TYPE, employee.salary_type)} ({labelOf(WPS_STATUS, employee.wps_status)})
                </span>
              </div>
            </div>
          </SectionCard>

          {/* Platform assignment summary */}
          <SectionCard title="Platform Assignment">
            <div className="text-left text-xs space-y-2 text-slate-600 dark:text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400 dark:text-slate-500">Platform</span>
                <span className="font-semibold">{employee.platform_name || 'None (Office / Internal)'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 dark:text-slate-500">Rider ID</span>
                <span className="font-semibold">{employee.platform_id || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 dark:text-slate-500">Driving License</span>
                <span className="font-semibold">{employee.driving_license || '—'}</span>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-2 space-y-6">

          {/* Government Document Expiry Dashboard */}
          <SectionCard title="Government Credentials & Document Tracker">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
              <div className="flex items-center justify-between p-3 border border-slate-150 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/10 rounded-xl">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Emirates ID</span>
                  <p className="text-xs font-semibold text-slate-750 dark:text-slate-200 mt-0.5">{employee.emirates_id || '—'}</p>
                </div>
                <DocumentExpiryBadge expiryDate={employee.emirates_id_expiry} label="Emirates ID" />
              </div>

              <div className="flex items-center justify-between p-3 border border-slate-150 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/10 rounded-xl">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Passport</span>
                  <p className="text-xs font-semibold text-slate-750 dark:text-slate-200 mt-0.5">{employee.passport_number || '—'}</p>
                </div>
                <DocumentExpiryBadge expiryDate={employee.passport_expiry} label="Passport" />
              </div>

              <div className="flex items-center justify-between p-3 border border-slate-150 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/10 rounded-xl">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Residence Visa</span>
                  <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 mt-0.5">UAE Residence</p>
                </div>
                <DocumentExpiryBadge expiryDate={employee.visa_expiry} label="Residence Visa" />
              </div>

              <div className="flex items-center justify-between p-3 border border-slate-150 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/10 rounded-xl">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Labour Card</span>
                  <p className="text-xs font-semibold text-slate-450 dark:text-slate-500 mt-0.5">Ministry of HR</p>
                </div>
                <DocumentExpiryBadge expiryDate={employee.labour_card_expiry} label="Labour Card" />
              </div>

              <div className="flex items-center justify-between p-3 border border-slate-150 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/10 rounded-xl md:col-span-2">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">UAE Driving License</span>
                  <p className="text-xs font-semibold text-slate-450 dark:text-slate-500 mt-0.5">Motorbike Driver Permit</p>
                </div>
                <DocumentExpiryBadge expiryDate={employee.driving_license_expiry} label="Driving License" />
              </div>
            </div>
          </SectionCard>

          {/* Documents sub-section */}
          <SectionCard title="Document Attachments & Scans">
            <div className="space-y-5 text-left">
              {/* Upload form */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Document Type</label>
                  <select
                    className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:outline-none text-slate-800 dark:text-slate-100"
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                  >
                    {EMPLOYEE_DOCUMENT_TYPES.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2 flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Expiry Date (optional)</label>
                  <DatePicker value={docExpiry} onChange={(val) => setDocExpiry(val || '')} />
                </div>
              </div>

              <FileUploadZone onUpload={(file) => setDocFile(file)} />

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={uploading || !docFile}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-brand-light hover:opacity-95 text-white shadow-sm transition-all disabled:opacity-60"
                >
                  {uploading ? 'Uploading…' : 'Upload Document'}
                </button>
              </div>

              {/* Document list */}
              <div className="border-t border-slate-150 dark:border-slate-700 pt-4 space-y-2">
                {docsLoading ? (
                  <div className="flex items-center justify-center py-6 text-slate-400 dark:text-slate-500 gap-2">
                    <Loader2 size={18} className="animate-spin" />
                    <span className="text-xs font-semibold">Loading documents…</span>
                  </div>
                ) : documents.length > 0 ? (
                  documents.map((file) => {
                    const name = file.original_name || file.file_name || file.name || 'Document';
                    const url = file.file_url || file.url;
                    const isPdf = /\.pdf$/i.test(name) || /\.pdf($|\?)/i.test(url || '');
                    return (
                      <div
                        key={file.id}
                        className="flex justify-between items-center gap-3 text-xs border border-slate-150 dark:border-slate-700 p-3 rounded-xl bg-white dark:bg-slate-800/40 hover:border-brand-light/50 dark:hover:border-brand-dark/50 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`p-2 rounded-lg flex-shrink-0 ${
                              isPdf
                                ? 'bg-rose-50 text-rose-500 dark:bg-rose-950/30 dark:text-rose-400'
                                : 'bg-blue-50 text-blue-500 dark:bg-blue-950/30 dark:text-blue-400'
                            }`}
                          >
                            {isPdf ? <FileText size={16} /> : <ImageIcon size={16} />}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                                {name}
                              </span>
                              <span className="inline-block text-[9px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 px-1.5 py-0.5 rounded uppercase flex-shrink-0">
                                {labelOf(EMPLOYEE_DOCUMENT_TYPES, file.document_type || file.type)}
                              </span>
                            </div>
                            <span className="block text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                              {[file.file_size, file.expiry_date ? `Expires ${file.expiry_date}` : null]
                                .filter(Boolean)
                                .join(' · ') || 'Attachment'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {url && (
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                              title="Download / View"
                            >
                              <Download size={14} />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteDocument(file)}
                            className="p-1.5 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-950/30 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                            title="Delete Document"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-6 text-xs text-slate-400 dark:text-slate-500 flex flex-col items-center gap-1.5">
                    <Paperclip size={18} />
                    <span>No document uploads attached to this profile.</span>
                  </div>
                )}
              </div>

              {/* Notes */}
              {employee.notes && (
                <div className="border-t border-slate-150 dark:border-slate-700 pt-4">
                  <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Operational Notes</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-350 bg-slate-50 dark:bg-slate-900 p-3.5 rounded-lg border border-slate-150 dark:border-slate-800 leading-relaxed">
                    {employee.notes}
                  </p>
                </div>
              )}
            </div>
          </SectionCard>
        </div>
      </div>

      {/* Edit Form Modal */}
      <EmployeeModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        employee={employee}
        onSuccess={() => {
          loadEmployee();
          loadDocuments();
        }}
      />
    </div>
  );
};
