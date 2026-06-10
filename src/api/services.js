import api, { unwrap } from './axios';

// Helper for multipart uploads
const multipart = { headers: { 'Content-Type': 'multipart/form-data' } };

// Build a FormData body from a plain object (skips null/undefined)
const toFormData = (obj) => {
  const fd = new FormData();
  Object.entries(obj || {}).forEach(([k, v]) => {
    if (v !== null && v !== undefined) fd.append(k, v);
  });
  return fd;
};


// Trigger a browser download from a blob response
const saveBlob = (response, fallbackName) => {
  const disposition = response.headers?.['content-disposition'] || '';
  const match = /filename\*?=(?:UTF-8''|")?([^";]+)/i.exec(disposition);
  const filename = match ? decodeURIComponent(match[1].replace(/"/g, '')) : fallbackName;
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

// ============================================================ AUTH
export const authApi = {
  login: (payload) => api.post('/auth/login', payload).then(unwrap),
  logout: () => api.post('/auth/logout').then(unwrap),
  logoutAll: () => api.post('/auth/logout-all').then(unwrap),
  me: () => api.get('/auth/me').then(unwrap),
  updateProfile: (payload) => api.put('/auth/profile', payload).then(unwrap),
  changePassword: (payload) => api.put('/auth/change-password', payload).then(unwrap),
  myPermissions: () => api.get('/auth/my-permissions').then(unwrap)
};

// ============================================================ SETTINGS
export const settingsApi = {
  all: () => api.get('/settings').then(unwrap),
  types: () => api.get('/settings/types').then(unwrap),
  byType: (type) => api.get(`/settings/${type}`).then(unwrap),
  create: (payload) => api.post('/settings', payload).then(unwrap),
  update: (id, payload) => api.put(`/settings/${id}`, payload).then(unwrap),
  remove: (id) => api.delete(`/settings/${id}`).then(unwrap),
  reorder: (type, order) => api.put(`/settings/${type}/reorder`, { order }).then(unwrap)
};

// ============================================================ EMPLOYEES
export const employeesApi = {
  list: (params) => api.get('/employees', { params }).then(unwrap),
  stats: () => api.get('/employees/stats').then(unwrap),
  expiryAlerts: () => api.get('/employees/expiry-alerts').then(unwrap),
  create: (payload) => api.post('/employees', payload).then(unwrap),
  get: (id) => api.get(`/employees/${id}`).then(unwrap),
  update: (id, payload) => api.put(`/employees/${id}`, payload).then(unwrap),
  remove: (id) => api.delete(`/employees/${id}`).then(unwrap),
  // Returns { documents_by_type, all_documents }
  documents: (id) => api.get(`/employees/${id}/documents`).then(unwrap),
  uploadDocument: (id, { document_type, file, expiry_date }) =>
    api
      .post(
        `/employees/${id}/documents/${document_type}/upload`,
        toFormData({ file, expiry_date }),
        multipart
      )
      .then(unwrap),
  deleteDocument: (id, documentId) =>
    api.delete(`/employees/${id}/documents/${documentId}`).then(unwrap)
};

// ============================================================ MOTORBIKES
export const motorbikesApi = {
  list: (params) => api.get('/motorbikes', { params }).then(unwrap),
  stats: () => api.get('/motorbikes/stats').then(unwrap),
  expiryAlerts: () => api.get('/motorbikes/expiry-alerts').then(unwrap),
  create: (payload) => api.post('/motorbikes', payload).then(unwrap),
  get: (id) => api.get(`/motorbikes/${id}`).then(unwrap),
  update: (id, payload) => api.put(`/motorbikes/${id}`, payload).then(unwrap),
  remove: (id) => api.delete(`/motorbikes/${id}`).then(unwrap),
  documents: (id) => api.get(`/motorbikes/${id}/documents`).then(unwrap),
  uploadDocument: (id, { document_type, file, notes }) =>
    api
      .post(
        `/motorbikes/${id}/documents/${document_type}/upload`,
        toFormData({ file, notes }),
        multipart
      )
      .then(unwrap),
  deleteDocument: (id, documentId) =>
    api.delete(`/motorbikes/${id}/documents/${documentId}`).then(unwrap)
};

// ============================================================ ASSIGNMENTS
export const assignmentsApi = {
  list: (params) => api.get('/assignments', { params }).then(unwrap),
  current: () => api.get('/assignments/current').then(unwrap),
  stats: () => api.get('/assignments/stats').then(unwrap),
  assign: (payload) => api.post('/assignments/assign', payload).then(unwrap),
  get: (id) => api.get(`/assignments/${id}`).then(unwrap),
  returnBike: (id, payload) => api.post(`/assignments/${id}/return`, payload).then(unwrap),
  pendingReturn: (id) => api.patch(`/assignments/${id}/pending-return`).then(unwrap),
  cancel: (id) => api.patch(`/assignments/${id}/cancel`).then(unwrap),
  employeeHistory: (employeeId) =>
    api.get(`/assignments/employee/${employeeId}/history`).then(unwrap),
  bikeHistory: (bikeId) => api.get(`/assignments/bike/${bikeId}/history`).then(unwrap)
};

// ============================================================ LOANS
export const loansApi = {
  stats: () => api.get('/loans/stats').then(unwrap),
  list: (params) => api.get('/loans', { params }).then(unwrap),
  create: (payload) => api.post('/loans', payload).then(unwrap),
  get: (id) => api.get(`/loans/${id}`).then(unwrap),
  update: (id, payload) => api.put(`/loans/${id}`, payload).then(unwrap),
  recordPayment: (id, payload) => api.post(`/loans/${id}/payments`, payload).then(unwrap),
  payments: (id) => api.get(`/loans/${id}/payments`).then(unwrap),
  uploadAttachment: (id, file) =>
    api.post(`/loans/${id}/attachment`, toFormData({ attachment: file }), multipart).then(unwrap)
};

// ============================================================ PAYROLL
export const payrollApi = {
  stats: (params) => api.get('/payroll/stats', { params }).then(unwrap),
  list: (params) => api.get('/payroll', { params }).then(unwrap),
  create: (payload) => api.post('/payroll', payload).then(unwrap),
  get: (id) => api.get(`/payroll/${id}`).then(unwrap),
  update: (id, payload) => api.put(`/payroll/${id}`, payload).then(unwrap),
  approve: (id, payload) => api.post(`/payroll/${id}/approve`, payload).then(unwrap),
  reject: (id, payload) => api.post(`/payroll/${id}/reject`, payload).then(unwrap),
  markPaid: (id) => api.patch(`/payroll/${id}/mark-paid`).then(unwrap),
  downloadSlip: (id) =>
    api
      .get(`/payroll/${id}/slip`, { responseType: 'blob' })
      .then((res) => saveBlob(res, `salary-slip-${id}.pdf`))
};

// ============================================================ FINES
export const finesApi = {
  stats: () => api.get('/fines/stats').then(unwrap),
  list: (params) => api.get('/fines', { params }).then(unwrap),
  create: (payload) => api.post('/fines', payload).then(unwrap),
  pendingByEmployee: (employeeId) =>
    api.get(`/fines/employee/${employeeId}/pending`).then(unwrap),
  get: (id) => api.get(`/fines/${id}`).then(unwrap),
  update: (id, payload) => api.put(`/fines/${id}`, payload).then(unwrap),
  waive: (id, payload) => api.patch(`/fines/${id}/waive`, payload).then(unwrap),
  remove: (id) => api.delete(`/fines/${id}`).then(unwrap),
  uploadReceipt: (id, file) =>
    api.post(`/fines/${id}/receipt`, toFormData({ receipt: file }), multipart).then(unwrap)
};

// ============================================================ EXPENSES
export const expensesApi = {
  stats: (params) => api.get('/expenses/stats', { params }).then(unwrap),
  categories: () => api.get('/expenses/categories').then(unwrap),
  list: (params) => api.get('/expenses', { params }).then(unwrap),
  create: (payload) => api.post('/expenses', payload).then(unwrap),
  get: (id) => api.get(`/expenses/${id}`).then(unwrap),
  update: (id, payload) => api.put(`/expenses/${id}`, payload).then(unwrap),
  approve: (id, payload) => api.post(`/expenses/${id}/approve`, payload).then(unwrap),
  reject: (id, payload) => api.post(`/expenses/${id}/reject`, payload).then(unwrap),
  remove: (id) => api.delete(`/expenses/${id}`).then(unwrap),
  uploadReceipt: (id, file) =>
    api.post(`/expenses/${id}/receipt`, toFormData({ receipt: file }), multipart).then(unwrap)
};

// ============================================================ DASHBOARD
export const dashboardApi = {
  overview: () => api.get('/dashboard/overview').then(unwrap),
  alerts: () => api.get('/dashboard/alerts').then(unwrap)
};

// ============================================================ MAINTENANCE
export const maintenanceApi = {
  stats: () => api.get('/maintenance/stats').then(unwrap),
  upcoming: () => api.get('/maintenance/upcoming').then(unwrap),
  list: (params) => api.get('/maintenance', { params }).then(unwrap),
  create: (payload) => api.post('/maintenance', payload).then(unwrap),
  get: (id) => api.get(`/maintenance/${id}`).then(unwrap),
  update: (id, payload) => api.put(`/maintenance/${id}`, payload).then(unwrap),
  remove: (id) => api.delete(`/maintenance/${id}`).then(unwrap),
  uploadReceipt: (id, file) =>
    api.post(`/maintenance/${id}/receipt`, toFormData({ receipt: file }), multipart).then(unwrap)
};

// ============================================================ PLATFORM INCOME
export const platformIncomeApi = {
  platforms: () => api.get('/platform-income/platforms').then(unwrap),
  stats: (params) => api.get('/platform-income/stats', { params }).then(unwrap),
  list: (params) => api.get('/platform-income', { params }).then(unwrap),
  create: (payload) => api.post('/platform-income', payload).then(unwrap),
  get: (id) => api.get(`/platform-income/${id}`).then(unwrap),
  update: (id, payload) => api.put(`/platform-income/${id}`, payload).then(unwrap),
  remove: (id) => api.delete(`/platform-income/${id}`).then(unwrap),
  uploadReceipt: (id, file) =>
    api
      .post(`/platform-income/${id}/receipt`, toFormData({ receipt: file }), multipart)
      .then(unwrap)
};

// ============================================================ PROFIT & LOSS
export const profitLossApi = {
  summary: (params) => api.get('/profit-loss/summary', { params }).then(unwrap),
  monthlyTrend: (params) => api.get('/profit-loss/monthly-trend', { params }).then(unwrap)
};

// ============================================================ REPORTS (downloads)
export const reportsApi = {
  employeesExcel: (params) =>
    api
      .get('/reports/employees/excel', { params, responseType: 'blob' })
      .then((res) => saveBlob(res, 'employees.xlsx')),
  payrollExcel: (params) =>
    api
      .get('/reports/payroll/excel', { params, responseType: 'blob' })
      .then((res) => saveBlob(res, 'payroll.xlsx')),
  expensesExcel: (params) =>
    api
      .get('/reports/expenses/excel', { params, responseType: 'blob' })
      .then((res) => saveBlob(res, 'expenses.xlsx')),
  finesExcel: (params) =>
    api
      .get('/reports/fines/excel', { params, responseType: 'blob' })
      .then((res) => saveBlob(res, 'fines.xlsx')),
  payrollPdf: (params) =>
    api
      .get('/reports/payroll/pdf', { params, responseType: 'blob' })
      .then((res) => saveBlob(res, 'payroll.pdf')),
  profitLossPdf: (params) =>
    api
      .get('/reports/profit-loss/pdf', { params, responseType: 'blob' })
      .then((res) => saveBlob(res, 'profit-loss.pdf'))
};

// ============================================================ USERS
export const usersApi = {
  list: (params) => api.get('/users', { params }).then(unwrap),
  create: (payload) => api.post('/users', payload).then(unwrap),
  get: (id) => api.get(`/users/${id}`).then(unwrap),
  update: (id, payload) => api.put(`/users/${id}`, payload).then(unwrap),
  remove: (id) => api.delete(`/users/${id}`).then(unwrap),
  toggleStatus: (id) => api.patch(`/users/${id}/toggle-status`).then(unwrap)
};

// ============================================================ PERMISSIONS
export const permissionsApi = {
  all: () => api.get('/permissions').then(unwrap),
  rolePermissions: (role) => api.get(`/permissions/role/${role}`).then(unwrap),
  updateRolePermissions: (role, permissions) =>
    api.put(`/permissions/role/${role}`, { permissions }).then(unwrap),
  userPermissions: (userId) => api.get(`/permissions/user/${userId}`).then(unwrap),
  updateUserPermissions: (userId, permissions) =>
    api.put(`/permissions/user/${userId}`, { permissions }).then(unwrap),
  resetUserPermissions: (userId) =>
    api.delete(`/permissions/user/${userId}/reset`).then(unwrap)
};

// ============================================================ AUDIT LOGS
export const auditLogsApi = {
  list: (params) => api.get('/audit-logs', { params }).then(unwrap),
  modelTypes: () => api.get('/audit-logs/model-types').then(unwrap),
  modelTrail: (modelType, modelId) =>
    api.get(`/audit-logs/${modelType}/${modelId}`).then(unwrap)
};
