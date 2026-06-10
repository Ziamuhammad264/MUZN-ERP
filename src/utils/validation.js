import { apiErrors } from '../api/axios';

// Reusable field validators. Each returns an error message string, or '' if ok.
// Usage: rules = { name: [v.required('Full name')], email: [v.email()] }
export const v = {
  required: (label = 'This field') => (val) =>
    String(val ?? '').trim() === '' ? `${label} is required.` : '',

  email: (label = 'Email') => (val) =>
    val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(val))
      ? `Enter a valid ${label.toLowerCase()} (e.g. name@muzn.ae).`
      : '',

  // UAE-style mobile: digits, optional + prefix, 7–15 digits.
  mobile: (label = 'Mobile number') => (val) =>
    val && !/^\+?\d[\d\s-]{6,18}$/.test(String(val).trim())
      ? `Enter a valid ${label.toLowerCase()} (e.g. +971501234567).`
      : '',

  number: (label = 'Value') => (val) =>
    val !== '' && val !== null && val !== undefined && isNaN(Number(val))
      ? `${label} must be a number.`
      : '',

  positive: (label = 'Amount') => (val) =>
    val !== '' && val !== null && val !== undefined && Number(val) <= 0
      ? `${label} must be greater than 0.`
      : '',

  min: (n, label = 'Value') => (val) =>
    val !== '' && val !== null && val !== undefined && Number(val) < n
      ? `${label} must be at least ${n}.`
      : '',

  max: (n, label = 'Value') => (val) =>
    val !== '' && val !== null && val !== undefined && Number(val) > n
      ? `${label} must be ${n} or less.`
      : '',

  // ISO date string (YYYY-MM-DD) produced by the DatePicker.
  date: (label = 'Date') => (val) =>
    val && !/^\d{4}-\d{2}-\d{2}$/.test(String(val))
      ? `${label} must be a valid date.`
      : '',

  match: (otherKey, label = 'Values') => (val, form) =>
    val !== form?.[otherKey] ? `${label} do not match.` : '',

  minLength: (n, label = 'This field') => (val) =>
    val && String(val).length < n ? `${label} must be at least ${n} characters.` : ''
};

/**
 * Run a rules map against form data.
 * @param {object} formData
 * @param {Object<string, Function[]>} rules  field -> array of validators
 * @returns {object} errors keyed by field (first failing message per field)
 */
export function validateForm(formData, rules) {
  const errors = {};
  Object.entries(rules).forEach(([field, fns]) => {
    for (const fn of fns) {
      const msg = fn(formData[field], formData);
      if (msg) {
        errors[field] = msg;
        break;
      }
    }
  });
  return errors;
}

/**
 * Build an API payload from form data, omitting empty values (which would fail
 * the API's date/email/numeric validation) and coercing listed number fields.
 * @param {object} formData
 * @param {object} opts  { numbers?: string[], booleans?: string[], keepEmpty?: string[] }
 */
export function cleanPayload(formData, opts = {}) {
  const { numbers = [], booleans = [], keepEmpty = [] } = opts;
  const payload = {};
  Object.entries(formData).forEach(([key, val]) => {
    if (val !== '' && val !== null && val !== undefined) payload[key] = val;
    else if (keepEmpty.includes(key)) payload[key] = val;
  });
  numbers.forEach((n) => {
    if (n in payload) payload[n] = Number(payload[n]) || 0;
  });
  booleans.forEach((b) => {
    if (b in payload) payload[b] = Boolean(payload[b]);
  });
  return payload;
}

// Accept attribute for file inputs — PDF + common image types.
export const FILE_ACCEPT = 'application/pdf,image/*';
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB

/**
 * Validate an uploaded file: only PDF/images, max 5MB.
 * Returns an error message, or '' when ok. An empty/missing file is treated as
 * valid ('') so optional file fields never block a save.
 */
export function validateFile(file) {
  if (!file) return '';
  const name = file.name || '';
  const type = file.type || '';
  const isPdf = type === 'application/pdf' || /\.pdf$/i.test(name);
  const isImage = type.startsWith('image/') || /\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(name);
  if (!isPdf && !isImage) return 'Only PDF and image files are allowed.';
  if (file.size > MAX_FILE_BYTES) return 'File must be 5MB or smaller.';
  return '';
}

/**
 * Convert a 422 API error into a { field: message } map for form display.
 * Returns null if the error has no field-level details.
 */
export function mapApiErrors(error) {
  const fieldErrors = apiErrors(error);
  if (!fieldErrors) return null;
  const mapped = {};
  Object.entries(fieldErrors).forEach(([field, msgs]) => {
    mapped[field] = Array.isArray(msgs) ? msgs[0] : String(msgs);
  });
  return mapped;
}
