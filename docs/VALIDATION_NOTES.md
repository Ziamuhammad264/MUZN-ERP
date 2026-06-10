# Form Validation Standard

Every create/edit form in the app must:
1. Validate fields client-side before submitting (clear "what to enter" messages).
2. Omit empty optional values from the API payload (empty strings 422 on date/
   email/number fields).
3. Surface API 422 field errors back onto the matching form fields.

Use the shared toolkit in `src/utils/validation.js`. Reference implementation:
`src/pages/employees/EmployeeModal.jsx`.

## Toolkit (`src/utils/validation.js`)

```js
import { v, validateForm, cleanPayload, mapApiErrors } from '../../utils/validation';
```

- `v` — validators that return an error string or '':
  `v.required(label)`, `v.email(label)`, `v.mobile(label)`, `v.number(label)`,
  `v.positive(label)`, `v.min(n,label)`, `v.max(n,label)`, `v.date(label)`,
  `v.match(otherKey,label)`, `v.minLength(n,label)`.
- `validateForm(formData, rules)` — `rules` is `{ field: [v.required('Name'), ...] }`;
  returns `{ field: firstMessage }`. Empty object = valid.
- `cleanPayload(formData, { numbers: [...], booleans: [...] })` — drops empty
  values, coerces listed numbers/booleans.
- `mapApiErrors(error)` — turns a 422 into `{ field: message }` (or null).

## Pattern to apply in each form

```js
const [errors, setErrors] = useState({});

const validate = () => {
  const errs = validateForm(form, {
    employee_id: [v.required('Employee')],
    amount: [v.required('Amount'), v.positive('Amount')],
    loan_date: [v.required('Date'), v.date('Date')],
    email: [v.email()],
  });
  setErrors(errs);
  return Object.keys(errs).length === 0;
};

const handleSave = async (e) => {
  e?.preventDefault();
  if (!validate() || saving) return;
  const payload = cleanPayload(form, { numbers: ['amount', 'monthly_deduction'] });
  setSaving(true);
  try {
    await someApi.create(payload);  // or update(id, payload)
    toast.success('Saved.');
    onSuccess?.(); onClose?.();
  } catch (err) {
    const mapped = mapApiErrors(err);
    if (mapped) setErrors(mapped);
    toast.error(apiMessage(err));
  } finally {
    setSaving(false);
  }
};
```

Render each field's error via the existing `FormField`'s `error` prop:
`<FormField label="Amount" error={errors.amount} required>…</FormField>`.
For inputs not wrapped in FormField, show `errors.field` in a small rose-colored
`<span>` beneath the control (same styling FormField uses).

## Field rules per module (apply the sensible required/format set)

- **Employees** (done): name req; mobile req+format; email format; passport_number
  req; emirates_id req; salary_amount positive; all *_expiry are dates.
- **Motorbikes**: plate_number req; emirate req; status req; year number; insurance_
  expiry/mulkiya_expiry dates.
- **Assignments**: employee_id req; motorbike_id req; start_date req+date. Return:
  return_date req+date.
- **Loans**: employee_id req; loan_date req+date; loan_amount req+positive;
  monthly_deduction req+positive; number_of_installments req+min(1). Payment:
  payment_date req+date; payment_amount req+positive; payment_method req.
- **Payroll**: employee_id req; month req; year req; attendance_days number+min(0)+
  max(31); salik_deduction/penalty_deduction/other_deduction number+min(0).
- **Fines**: employee_id req; fine_date req+date; fine_type req; amount req+positive.
- **Expenses**: expense_date req+date; category req; amount req+positive.
- **Maintenance**: motorbike_id req; maintenance_date req+date; maintenance_type req;
  cost number+min(0); next_maintenance_date date.
- **Platform Income**: income_date req+date; source_type req; amount req+positive;
  if source_type==='platform' → platform_name req; if 'rider' → employee_id req.
- **Users**: name req; email req+format; on create password req+minLength(6) and
  password_confirmation must match (v.match('password')); role req.
- **Settings (add option)**: label/value req (already simple).

Numbers to coerce in cleanPayload per module: amounts, deductions, cost, year,
attendance_days, number_of_installments, salary_amount.
