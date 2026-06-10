# MUZN ERP — Frontend ↔ API Integration Notes

This project was migrated from a mock Zustand store (`src/store/erpStore.js`) to the
live MUZN ERP REST API. The store is being removed; **every page must read/write
through the API service layer**. These notes are the contract for that work.

## Golden rules

1. **Never import `useErpStore`.** Use the API services instead.
2. **Use snake_case field names** everywhere — the API returns/accepts snake_case
   (e.g. `employee.name`, `emp.salary_amount`, `bike.plate_number`,
   `bike.insurance_expiry`, `loan.monthly_deduction`). Do NOT use the old camelCase
   (`fullName`, `salaryAmount`, `plateNumber`, …).
3. **Preserve the existing page UI/layout** (Tailwind classes, components, columns,
   KPI cards, modals). Only swap the data source and adapt field names. Keep the
   same named export (`export const X = () => {…}`).
4. Fetch on mount with `useFetch` (`src/hooks/useApi.js`) or `useState`+`useEffect`.
   After any create/update/delete, **refetch** the list/stats.
5. Wrap mutations in `try/catch`; on success call `toast.success(...)`, on error
   `toast.error(apiMessage(err))`. Use `confirmDialog({...})` for destructive
   actions. Both are in `src/utils/notify.jsx`. `apiMessage` is in `src/api/axios.js`.
6. Show a simple loading state while fetching (spinner or skeleton) and an empty
   state when there are no rows. DataTable already renders an empty message.

## Service layer (`src/api/services.js`)

All methods return the **unwrapped** payload (the API's inner `data`) as a Promise.
Groups: `authApi, settingsApi, employeesApi, motorbikesApi, assignmentsApi,
loansApi, payrollApi, finesApi, expensesApi, dashboardApi, maintenanceApi,
platformIncomeApi, profitLossApi, reportsApi, usersApi, permissionsApi,
auditLogsApi`. See the file for exact method names (they mirror the endpoints).

### List responses & pagination
List endpoints may return either a bare array or a Laravel paginator object
`{ data: [...], current_page, last_page, per_page, total }`. Use the `asList()`
helper from `src/hooks/useApi.js`:
```js
const { rows, meta } = asList(payload); // rows is always an array
```

### File uploads
`uploadDocument(id, { document_type, file, notes })`, `uploadReceipt(id, file)`,
`loansApi.uploadAttachment(id, file)`. Pass a real `File` object.

### Blob downloads (trigger browser download, return void)
`payrollApi.downloadSlip(id)`, and all `reportsApi.*` methods.

## Shared UI components (props)

- `DataTable` — `{ columns, data, searchPlaceholder, searchKey, filterOptions:{key,label,options:[]}, emirateFilter, pagination, defaultPageSize, emptyMessage }`.
  Columns: `{ header, accessor, sortable, sortableKey, render:(value,row)=>node }`.
  Note: built-in `emirateFilter` keys on `row.emirate || row.workEmirate`.
- `StatusBadge` — `{ status }`. Pass a human label; it color-codes by lowercased text
  (active/approved/paid/available/completed/returned = green; pending/draft/on leave =
  amber; rejected/cancelled/unpaid/expired = red; in progress/maintenance = blue).
- `KPICard`, `PageHeader`, `SectionCard`, `FormField`, `ConfirmDeleteModal`,
  `FileUploadZone`, `ExportButton`, `TabFilter`, `DocumentExpiryBadge`,
  `ProgressBar`, `date-picker` — check the file for props before using.
- Formatters (`src/utils/formatters.js`): `formatCurrency(n)`, `formatDate(d)`,
  `getDaysRemaining(d)`.

## Fixed enums (`src/constants/options.js`)

Use these option arrays (`{value,label}`) for selects/filters and `labelOf(opts,val)`
to render labels: `EMPLOYEE_STATUS, SALARY_TYPE, WPS_STATUS, EMPLOYEE_DOCUMENT_TYPES,
BIKE_STATUS, BIKE_DOCUMENT_TYPES, ASSIGNMENT_STATUS, LOAN_STATUS, LOAN_PAYMENT_METHODS,
PAYROLL_STATUS, PAYMENT_STATUS, FINE_TYPE, FINE_STATUS, EXPENSE_CATEGORY, EXPENSE_STATUS,
MAINTENANCE_TYPE, MAINTENANCE_STATUS, INCOME_SOURCE_TYPE, PLATFORMS, USER_ROLES,
AUDIT_MODEL_TYPES`.

Dynamic dropdowns (zones, departments, platforms, bike types) come from the Settings
API — use `useSettingsOptions('zone' | 'department' | 'platform' | 'bike_type')` from
`src/hooks/useSettings.js`, which returns `{value,label}[]`.

## Permissions

`usePermissions()` returns `{ isOwner(), isSuperadmin(), isElevated(), can('slug'),
canAccess('module'), permissions, userRole }`. `isElevated()` = owner OR superadmin
(used to gate financial/system modules). Gate create/edit/delete buttons with
`can('employees.create')`, etc., where helpful — but don't hide whole pages (routing
already guards elevated-only pages).

## Field reference (request/response, per the API docs)

- **Employee**: name, mobile, email, nationality, job_title, department, status,
  work_emirate, zone, platform_name, platform_id, salary_amount, salary_type,
  wps_status, passport_number, passport_expiry, emirates_id, emirates_id_expiry,
  visa_expiry, labour_card_expiry, driving_license, driving_license_expiry, notes.
  Server adds `id`, `employee_id` (EMP-0001).
- **Motorbike**: plate_number, plate_code, emirate, zone, bike_type, brand, model,
  year, color, chassis_number, engine_number, insurance_company, insurance_expiry,
  mulkiya_expiry, status, notes. Server adds `id`, `bike_id` (BK-0001).
- **Assignment**: employee_id, motorbike_id, start_date, handover_condition; return:
  return_date, return_condition, remarks; status active/returned/cancelled.
- **Loan**: employee_id, loan_date, loan_amount, monthly_deduction,
  number_of_installments, notes, status. Payment: payment_date, payment_amount,
  payment_method (cash/bank_transfer/payroll), notes.
- **Payroll**: employee_id, month, year, attendance_days, hours_compliance,
  salik_deduction, penalty_deduction, other_deduction, notes. Server computes
  gross_salary, loan_deduction, fine_deduction, total_deductions, net_salary,
  payroll_status (draft/approved/rejected), payment_status (unpaid/paid).
- **Fine**: employee_id, fine_date, fine_type (salik/traffic_fine/company_penalty/
  other), amount, description, notes, status (pending/deducted/waived).
- **Expense**: expense_date, category, amount, description, vendor_name, notes,
  status (pending/approved/rejected).
- **Maintenance**: motorbike_id, maintenance_date, maintenance_type, cost,
  description, vendor_name, next_maintenance_date, status (completed/pending/
  in_progress).
- **PlatformIncome**: income_date, source_type (platform→platform_name | rider→
  employee_id), amount, description.
- **User**: name, email, password, password_confirmation, role (admin/superadmin),
  status. Toggle via `usersApi.toggleStatus(id)`.

Full request/response examples live in `C:\Users\user\Downloads\API_DOCUMENTATION.md`.
