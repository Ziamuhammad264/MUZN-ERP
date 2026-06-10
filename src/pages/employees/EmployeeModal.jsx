import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FormField } from '../../components/ui/FormField';
import { DatePicker } from '../../components/ui/date-picker';
import { employeesApi } from '../../api/services';
import { useSettingsOptions } from '../../hooks/useSettings';
import {
  EMPLOYEE_STATUS,
  SALARY_TYPE,
  WPS_STATUS,
  PLATFORMS,
  EMPLOYEE_DOCUMENT_TYPES,
  EMPLOYEE_DOC_EXPIRY_FIELD,
  labelOf
} from '../../constants/options';
import { toast, confirmDialog } from '../../utils/notify';
import { apiMessage } from '../../api/axios';
import { v, validateForm, cleanPayload, mapApiErrors, validateFile, FILE_ACCEPT } from '../../utils/validation';
import { X, Trash2, Loader2, Upload, CheckCircle2, Download } from 'lucide-react';

// Static UAE emirates list for the work-emirate select.
const UAE_EMIRATES = [
  'Dubai',
  'Abu Dhabi',
  'Sharjah',
  'Ajman',
  'Fujairah',
  'Ras Al Khaimah',
  'Umm Al Quwain'
];

const EMPTY_FORM = {
  name: '',
  mobile: '',
  email: '',
  nationality: '',
  job_title: '',
  department: '',
  status: '',
  work_emirate: '',
  zone: '',
  platform_name: '',
  platform_id: '',
  salary_amount: '',
  salary_type: '',
  wps_status: '',
  passport_number: '',
  passport_expiry: '',
  emirates_id: '',
  emirates_id_expiry: '',
  visa_expiry: '',
  labour_card_expiry: '',
  driving_license: '',
  driving_license_expiry: '',
  notes: ''
};

// Pick only the API-recognised fields off an employee record.
const toFormData = (emp) => {
  const data = { ...EMPTY_FORM };
  Object.keys(EMPTY_FORM).forEach((key) => {
    if (emp[key] !== undefined && emp[key] !== null) data[key] = emp[key];
  });
  return data;
};

const inputClass =
  'w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-light text-slate-800 dark:text-slate-100';
const selectClass =
  'w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:outline-none text-slate-800 dark:text-slate-100';

export const EmployeeModal = ({ isOpen, onClose, employee = null, onSuccess }) => {
  const departmentOptions = useSettingsOptions('department');
  const zoneOptions = useSettingsOptions('zone');
  // Platforms are a fixed API list (also served by /platform-income/platforms),
  // not a Settings type — using the constant avoids a 422 on /settings/platform.
  const platformOptions = PLATFORMS.map((p) => ({ value: p, label: p }));

  const [formData, setFormData] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Document attachments: { [document_type]: File } selected in this session.
  const [docFiles, setDocFiles] = useState({});
  const [docErrors, setDocErrors] = useState({});
  // Existing uploaded documents (edit mode only).
  const [existingDocs, setExistingDocs] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);

  // Reset the form whenever the modal is (re)opened or the target record
  // changes — derived during render to avoid a state-syncing effect.
  const formKey = isOpen ? employee?.id ?? 'new' : null;
  const [activeKey, setActiveKey] = useState(null);
  if (isOpen && formKey !== activeKey) {
    setActiveKey(formKey);
    setFormData(employee ? toFormData(employee) : EMPTY_FORM);
    setErrors({});
    setDocFiles({});
    setDocErrors({});
    setExistingDocs([]);
  }

  // Load already-uploaded documents when editing an existing employee.
  useEffect(() => {
    if (!isOpen || !employee?.id) return;
    let active = true;
    setDocsLoading(true);
    employeesApi
      .documents(employee.id)
      .then((data) => {
        if (active) setExistingDocs(data?.all_documents ?? []);
      })
      .catch(() => active && setExistingDocs([]))
      .finally(() => active && setDocsLoading(false));
    return () => {
      active = false;
    };
  }, [isOpen, employee?.id]);

  if (!isOpen) return null;

  const setField = (key, value) => setFormData((prev) => ({ ...prev, [key]: value }));

  const validate = () => {
    // Per the API, only `name` is required; everything else is optional and is
    // only format-checked when a value is provided.
    const errs = validateForm(formData, {
      name: [v.required('Full name')],
      mobile: [v.mobile()],
      email: [v.email()],
      salary_amount: [v.positive('Salary amount')],
      passport_expiry: [v.date('Passport expiry')],
      emirates_id_expiry: [v.date('Emirates ID expiry')],
      visa_expiry: [v.date('Visa expiry')],
      labour_card_expiry: [v.date('Labour card expiry')],
      driving_license_expiry: [v.date('Driving license expiry')]
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async (e) => {
    e?.preventDefault();
    if (!validate() || saving) return;

    // Send only filled fields — empty strings would fail the API's date/email
    // validation (422). Optional blanks are simply omitted.
    const payload = cleanPayload(formData, { numbers: ['salary_amount'] });

    setSaving(true);
    try {
      let targetId = employee?.id;
      if (employee) {
        await employeesApi.update(employee.id, payload);
      } else {
        const created = await employeesApi.create(payload);
        targetId = created?.id ?? created?.employee?.id;
      }

      // Upload any attached documents to the (now-existing) employee.
      const pending = Object.entries(docFiles).filter(([, file]) => file);
      if (targetId && pending.length) {
        for (const [document_type, file] of pending) {
          try {
            const expiryField = EMPLOYEE_DOC_EXPIRY_FIELD[document_type];
            const expiry_date = expiryField ? formData[expiryField] || undefined : undefined;
            await employeesApi.uploadDocument(targetId, { document_type, file, expiry_date });
          } catch (uploadErr) {
            toast.error(
              apiMessage(uploadErr, `Failed to upload ${labelOf(EMPLOYEE_DOCUMENT_TYPES, document_type)}.`)
            );
          }
        }
      }

      toast.success(employee ? 'Employee profile updated.' : 'Employee registered successfully.');
      onSuccess?.();
      onClose?.();
    } catch (err) {
      // Map API field-level validation errors back onto the form.
      const mapped = mapApiErrors(err);
      if (mapped) setErrors(mapped);
      toast.error(apiMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const setDocFile = (type, file) => {
    // Validate only when a file is chosen; an empty field is always allowed.
    const error = validateFile(file);
    setDocErrors((prev) => ({ ...prev, [type]: error }));
    setDocFiles((prev) => ({ ...prev, [type]: error ? undefined : file || undefined }));
  };

  const existingByType = (type) =>
    existingDocs.find((d) => (d.document_type || d.type) === type);

  const handleDeleteDoc = (doc) => {
    confirmDialog({
      title: 'Delete document?',
      content: 'This document will be permanently removed.',
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          await employeesApi.deleteDocument(employee.id, doc.id);
          setExistingDocs((prev) => prev.filter((d) => d.id !== doc.id));
          toast.success('Document deleted.');
        } catch (err) {
          toast.error(apiMessage(err));
        }
      }
    });
  };

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-800 border border-slate-205 dark:border-slate-700 rounded-t-2xl sm:rounded-xl max-w-4xl w-full shadow-2xl overflow-hidden animate-fade-in flex flex-col max-h-[calc(100vh-16px)] sm:max-h-[90vh] my-0 sm:my-8">
        {/* Header */}
        <div className="flex justify-between items-center px-3 sm:px-6 py-3 sm:py-4 border-b border-slate-150 dark:border-slate-700 flex-shrink-0">
          <h3 className="text-sm sm:text-base font-bold text-slate-850 dark:text-slate-100 font-heading truncate pr-2">
            {employee ? `Edit Record — ${employee.employee_id || employee.id}` : 'Create New Record'}
          </h3>
          <button onClick={onClose} className="text-slate-400 dark:text-slate-500 hover:text-slate-500 dark:hover:text-slate-300 transition-colors flex-shrink-0">
            <X size={18} />
          </button>
        </div>

        {/* Form Body Scroll container */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-6 custom-scrollbar text-left">

          {/* Section 1: Personal Profile */}
          <div className="space-y-3 sm:space-y-4">
            <h4 className="text-[10px] sm:text-xs font-bold uppercase text-brand-light dark:text-brand-dark tracking-wider pb-1 border-b border-slate-100 dark:border-slate-700">
              Personal Information
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-4">
              <FormField label="Full Name" error={errors.name} required>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="e.g. Ahmed Hassan"
                  value={formData.name}
                  onChange={(e) => setField('name', e.target.value)}
                />
              </FormField>

              <FormField label="Mobile Number" error={errors.mobile}>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="e.g. +971 50 123 4567"
                  value={formData.mobile}
                  onChange={(e) => setField('mobile', e.target.value)}
                />
              </FormField>

              <FormField label="Email Address">
                <input
                  type="email"
                  className={inputClass}
                  placeholder="you@muzn.ae"
                  value={formData.email || ''}
                  onChange={(e) => setField('email', e.target.value)}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-4">
              <FormField label="Nationality">
                <input
                  type="text"
                  className={inputClass}
                  placeholder="e.g. Egyptian"
                  value={formData.nationality || ''}
                  onChange={(e) => setField('nationality', e.target.value)}
                />
              </FormField>

              <FormField label="Job Title">
                <input
                  type="text"
                  className={inputClass}
                  placeholder="e.g. Delivery Rider"
                  value={formData.job_title || ''}
                  onChange={(e) => setField('job_title', e.target.value)}
                />
              </FormField>

              <FormField label="Department">
                <select
                  className={selectClass}
                  value={formData.department || ''}
                  onChange={(e) => setField('department', e.target.value)}
                >
                  <option value="">Select department…</option>
                  {departmentOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </FormField>
            </div>
          </div>

          {/* Section 2: Platform & Assignment details */}
          <div className="space-y-3 sm:space-y-4">
            <h4 className="text-[10px] sm:text-xs font-bold uppercase text-brand-light dark:text-brand-dark tracking-wider pb-1 border-b border-slate-100 dark:border-slate-700">
              Operations & Platform Assignment
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2 sm:gap-4">
              <FormField label="Work Emirate">
                <select
                  className={selectClass}
                  value={formData.work_emirate || ''}
                  onChange={(e) => setField('work_emirate', e.target.value)}
                >
                  <option value="">Select emirate…</option>
                  {UAE_EMIRATES.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </FormField>

              <FormField label="Delivery Zone">
                <select
                  className={selectClass}
                  value={formData.zone || ''}
                  onChange={(e) => setField('zone', e.target.value)}
                >
                  <option value="">Select zone…</option>
                  {zoneOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </FormField>

              <FormField label="Delivery Platform">
                <select
                  className={selectClass}
                  value={formData.platform_name || ''}
                  onChange={(e) => setField('platform_name', e.target.value)}
                >
                  <option value="">None (Office / Internal)</option>
                  {platformOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </FormField>

              <FormField label="Platform Rider ID">
                <input
                  type="text"
                  className={inputClass}
                  placeholder="e.g. TAL-001"
                  value={formData.platform_id || ''}
                  onChange={(e) => setField('platform_id', e.target.value)}
                />
              </FormField>

              <FormField label="HR Status">
                <select
                  className={selectClass}
                  value={formData.status}
                  onChange={(e) => setField('status', e.target.value)}
                >
                  <option value="">Select status…</option>
                  {EMPLOYEE_STATUS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </FormField>
            </div>
          </div>

          {/* Section 3: Salary & WPS ledger */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase text-brand-light dark:text-brand-dark tracking-wider pb-1 border-b border-slate-100 dark:border-slate-700">
              Salary & Payroll Configuration
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField label="Monthly Salary (AED)" required>
                <input
                  type="number"
                  className={inputClass}
                  placeholder="3000"
                  value={formData.salary_amount}
                  onChange={(e) => setField('salary_amount', e.target.value)}
                />
              </FormField>

              <FormField label="Salary Type">
                <select
                  className={selectClass}
                  value={formData.salary_type}
                  onChange={(e) => setField('salary_type', e.target.value)}
                >
                  <option value="">Select salary type…</option>
                  {SALARY_TYPE.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </FormField>

              <FormField label="WPS Status" error={errors.wps_status}>
                <select
                  className={selectClass}
                  value={formData.wps_status}
                  onChange={(e) => setField('wps_status', e.target.value)}
                >
                  <option value="">Not specified</option>
                  {WPS_STATUS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </FormField>
            </div>
          </div>

          {/* Section 4: Government Documents Expiry Tracker */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase text-brand-light dark:text-brand-dark tracking-wider pb-1 border-b border-slate-100 dark:border-slate-700">
              Government Credentials & Expiries
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Passport Number" error={errors.passport_number}>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="e.g. AB1234567"
                  value={formData.passport_number}
                  onChange={(e) => setField('passport_number', e.target.value)}
                />
              </FormField>

              <FormField label="Passport Expiry Date">
                <DatePicker
                  value={formData.passport_expiry}
                  onChange={(val) => setField('passport_expiry', val)}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Emirates ID" error={errors.emirates_id}>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="784-YYYY-XXXXXXX-Z"
                  value={formData.emirates_id}
                  onChange={(e) => setField('emirates_id', e.target.value)}
                />
              </FormField>

              <FormField label="Emirates ID Expiry Date">
                <DatePicker
                  value={formData.emirates_id_expiry}
                  onChange={(val) => setField('emirates_id_expiry', val)}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Visa Expiry Date">
                <DatePicker
                  value={formData.visa_expiry}
                  onChange={(val) => setField('visa_expiry', val)}
                />
              </FormField>

              <FormField label="Labour Card Expiry Date">
                <DatePicker
                  value={formData.labour_card_expiry}
                  onChange={(val) => setField('labour_card_expiry', val)}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Driving License Number">
                <input
                  type="text"
                  className={inputClass}
                  placeholder="e.g. DL-12345"
                  value={formData.driving_license || ''}
                  onChange={(e) => setField('driving_license', e.target.value)}
                />
              </FormField>

              <FormField label="Driving License Expiry Date">
                <DatePicker
                  value={formData.driving_license_expiry}
                  onChange={(val) => setField('driving_license_expiry', val)}
                />
              </FormField>
            </div>
          </div>

          {/* Section 5: Document Uploads */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-1">
              <h4 className="text-xs font-bold uppercase text-brand-light dark:text-brand-dark tracking-wider">
                Document Uploads
              </h4>
              {docsLoading && employee && (
                <span className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500">
                  <Loader2 size={11} className="animate-spin" /> Loading
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {EMPLOYEE_DOCUMENT_TYPES.map((dt) => {
                const existing = existingByType(dt.value);
                const selected = docFiles[dt.value];
                const err = docErrors[dt.value];
                return (
                  <div
                    key={dt.value}
                    className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-slate-50/40 dark:bg-slate-900/20 flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{dt.label}</span>
                      {existing && !selected && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 size={12} /> Uploaded
                        </span>
                      )}
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer text-xs px-3 py-2 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 hover:border-brand-light dark:hover:border-brand-dark bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 transition-colors">
                      <Upload size={14} className="flex-shrink-0" />
                      <span className="truncate">
                        {selected ? selected.name : existing ? 'Replace file' : 'Choose file'}
                      </span>
                      <input
                        type="file"
                        accept={FILE_ACCEPT}
                        className="hidden"
                        onChange={(e) => setDocFile(dt.value, e.target.files?.[0])}
                      />
                    </label>

                    {existing && (
                      <div className="flex items-center justify-between gap-2 text-[10px] text-slate-400 dark:text-slate-500">
                        <span className="truncate">
                          {existing.original_name}
                          {existing.file_size ? ` · ${existing.file_size}` : ''}
                        </span>
                        <span className="flex items-center gap-1.5 flex-shrink-0">
                          {existing.file_url && (
                            <a
                              href={existing.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:text-brand-light dark:hover:text-brand-dark"
                              title="View"
                            >
                              <Download size={12} />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteDoc(existing)}
                            className="hover:text-rose-500"
                            title="Delete"
                          >
                            <Trash2 size={12} />
                          </button>
                        </span>
                      </div>
                    )}

                    {err && (
                      <span className="text-[10px] font-semibold text-rose-600 dark:text-rose-400">{err}</span>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">
              PDF or images, up to 5MB each. New files upload after the employee is saved.
            </p>
          </div>

          {/* Notes */}
          <FormField label="Operational Notes / Remarks">
            <textarea
              className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-light text-slate-800 dark:text-slate-100 h-20"
              placeholder="Provide comments or details here..."
              value={formData.notes || ''}
              onChange={(e) => setField('notes', e.target.value)}
            />
          </FormField>

        </form>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-150 dark:border-slate-700 flex-shrink-0">
          <button
            type="button"
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-750 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-brand-light hover:opacity-95 text-white shadow-sm transition-all disabled:opacity-60"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving…' : employee ? 'Save Changes' : 'Register Employee'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
