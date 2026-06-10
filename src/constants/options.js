// Fixed enumerations defined by the MUZN ERP API.
// Dynamic, user-managed lists (zones, departments, platforms, bike types,
// fine types) come from the Settings API; these are the fixed value sets.

export const EMPLOYEE_STATUS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' }
];

export const SALARY_TYPE = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'daily', label: 'Daily' }
];

export const WPS_STATUS = [
  { value: 'wps', label: 'WPS' },
  { value: 'no_wps', label: 'No WPS' }
];

export const EMPLOYEE_DOCUMENT_TYPES = [
  { value: 'passport', label: 'Passport' },
  { value: 'emirates_id', label: 'Emirates ID' },
  { value: 'visa', label: 'Visa' },
  { value: 'labour_card', label: 'Labour Card' },
  { value: 'driving_license', label: 'Driving License' },
  { value: 'photo', label: 'Profile Photo' },
  { value: 'contract', label: 'Employment Contract' },
  { value: 'other', label: 'Other' }
];

// Document types that carry an expiry date (sent as expiry_date on upload).
export const EMPLOYEE_DOC_EXPIRY_FIELD = {
  passport: 'passport_expiry',
  emirates_id: 'emirates_id_expiry',
  visa: 'visa_expiry',
  labour_card: 'labour_card_expiry',
  driving_license: 'driving_license_expiry'
};

export const BIKE_STATUS = [
  { value: 'available', label: 'Available' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'maintenance', label: 'Maintenance' }
];

export const BIKE_DOCUMENT_TYPES = [
  { value: 'mulkiya', label: 'Mulkiya' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'other', label: 'Other' }
];

export const ASSIGNMENT_STATUS = [
  { value: 'active', label: 'Active' },
  { value: 'returned', label: 'Returned' },
  { value: 'cancelled', label: 'Cancelled' }
];

// Bike handover/return condition — backend enum. Adjust values to match the API's
// allowed set if these are rejected.
export const BIKE_CONDITION = [
  { value: 'excellent', label: 'Excellent' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
  { value: 'damaged', label: 'Damaged' }
];

export const LOAN_STATUS = [
  { value: 'active', label: 'Active' },
  { value: 'paid', label: 'Paid' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'cancelled', label: 'Cancelled' }
];

export const LOAN_PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'payroll', label: 'Payroll' }
];

export const PAYROLL_STATUS = [
  { value: 'draft', label: 'Draft' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' }
];

export const PAYMENT_STATUS = [
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'paid', label: 'Paid' }
];

export const FINE_TYPE = [
  { value: 'salik', label: 'Salik' },
  { value: 'traffic_fine', label: 'Traffic Fine' },
  { value: 'company_penalty', label: 'Company Penalty' },
  { value: 'other', label: 'Other' }
];

export const FINE_STATUS = [
  { value: 'pending', label: 'Pending' },
  { value: 'deducted', label: 'Deducted' },
  { value: 'waived', label: 'Waived' }
];

export const EXPENSE_CATEGORY = [
  { value: 'fuel', label: 'Fuel' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'office', label: 'Office' },
  { value: 'salary', label: 'Salary' },
  { value: 'salik', label: 'Salik' },
  { value: 'other', label: 'Other' }
];

export const EXPENSE_STATUS = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' }
];

export const MAINTENANCE_TYPE = [
  { value: 'oil_change', label: 'Oil Change' },
  { value: 'tire', label: 'Tire' },
  { value: 'brake', label: 'Brake' },
  { value: 'engine', label: 'Engine' },
  { value: 'accident_repair', label: 'Accident Repair' },
  { value: 'general', label: 'General' },
  { value: 'other', label: 'Other' }
];

export const MAINTENANCE_STATUS = [
  { value: 'completed', label: 'Completed' },
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' }
];

export const INCOME_SOURCE_TYPE = [
  { value: 'platform', label: 'Platform Payout' },
  { value: 'rider', label: 'Rider Cash' }
];

export const PLATFORMS = ['Talabat', 'Careem', 'Noon', 'InDrive', 'Other'];

export const USER_ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'superadmin', label: 'Superadmin' }
];

export const AUDIT_MODEL_TYPES = [
  'Employee',
  'Motorbike',
  'Assignment',
  'Loan',
  'Payroll',
  'Fine',
  'Expense',
  'PlatformIncome',
  'Maintenance'
];

// Helper: map a value to its label within an option set.
export const labelOf = (options, value) =>
  options.find((o) => o.value === value)?.label || value || '—';
