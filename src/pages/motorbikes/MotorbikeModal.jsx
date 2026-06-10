import React, { useState, useEffect } from 'react';
import { FormField } from '../../components/ui/FormField';
import { DatePicker } from '../../components/ui/date-picker';
import { motorbikesApi } from '../../api/services';
import { BIKE_STATUS } from '../../constants/options';
import { useSettingsOptions } from '../../hooks/useSettings';
import { toast } from '../../utils/notify';
import { apiMessage } from '../../api/axios';
import { v, validateForm, cleanPayload, mapApiErrors } from '../../utils/validation';
import { ModalPortal } from '../../components/ui/ModalPortal';
import { X } from 'lucide-react';

// Static UAE emirates list (registration emirate).
const UAE_EMIRATES = [
  'Dubai',
  'Abu Dhabi',
  'Sharjah',
  'Ajman',
  'Fujairah',
  'Ras Al Khaimah',
  'Umm Al Quwain'
];

const emptyForm = {
  plate_number: '',
  plate_code: '',
  emirate: '',
  zone: '',
  bike_type: '',
  brand: '',
  model: '',
  year: '',
  color: '',
  chassis_number: '',
  engine_number: '',
  insurance_company: '',
  insurance_expiry: '',
  mulkiya_expiry: '',
  status: '',
  notes: ''
};

export const MotorbikeModal = ({ isOpen, onClose, bike = null, onSaved }) => {
  const bikeTypeOptions = useSettingsOptions('bike_type');
  const zoneOptions = useSettingsOptions('zone');

  const [formData, setFormData] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (bike) {
      setFormData({
        plate_number: bike.plate_number ?? '',
        plate_code: bike.plate_code ?? '',
        emirate: bike.emirate ?? '',
        zone: bike.zone ?? '',
        bike_type: bike.bike_type ?? '',
        brand: bike.brand ?? '',
        model: bike.model ?? '',
        year: bike.year ?? '',
        color: bike.color ?? '',
        chassis_number: bike.chassis_number ?? '',
        engine_number: bike.engine_number ?? '',
        insurance_company: bike.insurance_company ?? '',
        insurance_expiry: bike.insurance_expiry ?? '',
        mulkiya_expiry: bike.mulkiya_expiry ?? '',
        status: bike.status ?? '',
        notes: bike.notes ?? ''
      });
    } else {
      setFormData(emptyForm);
    }
    setErrors({});
  }, [bike, isOpen]);

  if (!isOpen) return null;

  const validate = () => {
    const errs = validateForm(formData, {
      plate_number: [v.required('Plate Number')],
      emirate: [v.required('Registration Emirate')],
      status: [v.required('Fleet Status')],
      year: [v.number('Manufacturing Year')],
      insurance_expiry: [v.date('Insurance Expiry')],
      mulkiya_expiry: [v.date('Mulkiya Expiry')]
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!validate() || saving) return;

    // Send only filled fields — empty strings would fail the API's date/numeric
    // validation (422). The year is coerced to a number.
    const payload = cleanPayload(formData, { numbers: ['year'] });

    setSaving(true);
    try {
      if (bike) {
        await motorbikesApi.update(bike.id, payload);
        toast.success('Motorbike updated successfully.');
      } else {
        await motorbikesApi.create(payload);
        toast.success('Motorbike registered successfully.');
      }
      onSaved?.();
      onClose();
    } catch (err) {
      const mapped = mapApiErrors(err);
      if (mapped) setErrors(mapped);
      toast.error(apiMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalPortal>
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-800 border border-slate-205 dark:border-slate-700 rounded-xl max-w-4xl w-full shadow-2xl overflow-hidden animate-fade-in my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-150 dark:border-slate-700 flex-shrink-0">
          <h3 className="text-base font-bold text-slate-850 dark:text-slate-100 font-heading">
            {bike ? `Edit Motorbike Record — ${bike.bike_id || bike.id}` : 'Register New Fleet Motorbike'}
          </h3>
          <button onClick={onClose} className="text-slate-400 dark:text-slate-500 hover:text-slate-500 dark:hover:text-slate-300 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Form Body Scroll container */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar text-left">

          {/* Plate details */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase text-brand-light dark:text-brand-dark tracking-wider pb-1 border-b border-slate-100 dark:border-slate-700">
              License Plate & Registration
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <FormField label="Plate Number" error={errors.plate_number} required>
                <input
                  type="text"
                  className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-light text-slate-800 dark:text-slate-100"
                  placeholder="e.g. 76543"
                  value={formData.plate_number}
                  onChange={(e) => setFormData({ ...formData, plate_number: e.target.value })}
                />
              </FormField>

              <FormField label="Plate Code" error={errors.plate_code} required>
                <input
                  type="text"
                  className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-light text-slate-800 dark:text-slate-100"
                  placeholder="e.g. A"
                  value={formData.plate_code}
                  onChange={(e) => setFormData({ ...formData, plate_code: e.target.value })}
                />
              </FormField>

              <FormField label="Registration Emirate" error={errors.emirate} required>
                <select
                  className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:outline-none text-slate-800 dark:text-slate-100"
                  value={formData.emirate}
                  onChange={(e) => setFormData({ ...formData, emirate: e.target.value })}
                >
                  <option value="">Select emirate…</option>
                  {UAE_EMIRATES.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </FormField>

              <FormField label="Assigned Zone">
                <select
                  className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:outline-none text-slate-800 dark:text-slate-100"
                  value={formData.zone}
                  onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
                >
                  <option value="">Select zone</option>
                  {zoneOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </FormField>
            </div>
          </div>

          {/* Model specs */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase text-brand-light dark:text-brand-dark tracking-wider pb-1 border-b border-slate-100 dark:border-slate-700">
              Vehicle Model & Specs
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <FormField label="Brand / Manufacturer">
                <input
                  type="text"
                  className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-light text-slate-800 dark:text-slate-100"
                  placeholder="Honda"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                />
              </FormField>

              <FormField label="Model Name">
                <input
                  type="text"
                  className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-light text-slate-800 dark:text-slate-100"
                  placeholder="Unicorn"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                />
              </FormField>

              <FormField label="Manufacturing Year" error={errors.year}>
                <input
                  type="text"
                  className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-light text-slate-800 dark:text-slate-100"
                  placeholder="2023"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                />
              </FormField>

              <FormField label="Color">
                <input
                  type="text"
                  className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-light text-slate-800 dark:text-slate-100"
                  placeholder="Red"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                />
              </FormField>

              <FormField label="Fleet Status" error={errors.status} required>
                <select
                  className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:outline-none text-slate-800 dark:text-slate-100"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="">Select status…</option>
                  {BIKE_STATUS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </FormField>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Chassis Number" error={errors.chassis_number} required>
                <input
                  type="text"
                  className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-light text-slate-800 dark:text-slate-100"
                  placeholder="e.g. ME4JA55A123456"
                  value={formData.chassis_number}
                  onChange={(e) => setFormData({ ...formData, chassis_number: e.target.value })}
                />
              </FormField>

              <FormField label="Engine Number">
                <input
                  type="text"
                  className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-light text-slate-800 dark:text-slate-100"
                  placeholder="e.g. JA55E123456"
                  value={formData.engine_number}
                  onChange={(e) => setFormData({ ...formData, engine_number: e.target.value })}
                />
              </FormField>
            </div>

            <FormField label="Bike Type">
              <select
                className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:outline-none text-slate-800 dark:text-slate-100"
                value={formData.bike_type}
                onChange={(e) => setFormData({ ...formData, bike_type: e.target.value })}
              >
                <option value="">Select bike type</option>
                {bikeTypeOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </FormField>
          </div>

          {/* Insurance */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase text-brand-light dark:text-brand-dark tracking-wider pb-1 border-b border-slate-100 dark:border-slate-700">
              Insurance & Mulkiya Expiries
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField label="Insurance Company">
                <input
                  type="text"
                  className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-light text-slate-800 dark:text-slate-100"
                  placeholder="Oman Insurance"
                  value={formData.insurance_company}
                  onChange={(e) => setFormData({ ...formData, insurance_company: e.target.value })}
                />
              </FormField>

              <FormField label="Insurance Expiry Date" error={errors.insurance_expiry} required>
                <DatePicker
                  required
                  value={formData.insurance_expiry}
                  onChange={(val) => setFormData({ ...formData, insurance_expiry: val })}
                />
              </FormField>

              <FormField label="Mulkiya Expiry Date" error={errors.mulkiya_expiry} required>
                <DatePicker
                  required
                  value={formData.mulkiya_expiry}
                  onChange={(val) => setFormData({ ...formData, mulkiya_expiry: val })}
                />
              </FormField>
            </div>
          </div>

          <FormField label="Fleet Remarks / Condition Notes">
            <textarea
              className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-light text-slate-800 dark:text-slate-100 h-20"
              placeholder="e.g. Next service due oil filter change. Body condition details..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </FormField>

        </form>

        {/* Footer */}
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
            {saving ? 'Saving...' : bike ? 'Save Changes' : 'Register Vehicle'}
          </button>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
};
