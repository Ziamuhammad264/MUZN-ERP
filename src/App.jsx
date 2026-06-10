import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { App as AntdApp } from 'antd';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { AntdProvider } from './components/providers/AntdProvider';
import { NotificationBridge } from './utils/notify';
import { ProtectedRoute, OwnerRoute } from './components/RouteGuards';
import { Layout } from './components/layout/Layout';

// Pages — lazy loaded for performance
const Login = lazy(() => import('./pages/auth/Login').then(m => ({ default: m.Login })));
const Dashboard = lazy(() => import('./pages/dashboard/Dashboard').then(m => ({ default: m.Dashboard })));
const EmployeesList = lazy(() => import('./pages/employees/EmployeesList').then(m => ({ default: m.EmployeesList })));
const EmployeeDetail = lazy(() => import('./pages/employees/EmployeeDetail').then(m => ({ default: m.EmployeeDetail })));
const MotorbikesList = lazy(() => import('./pages/motorbikes/MotorbikesList').then(m => ({ default: m.MotorbikesList })));
const MotorbikeDetail = lazy(() => import('./pages/motorbikes/MotorbikeDetail').then(m => ({ default: m.MotorbikeDetail })));
const Assignments = lazy(() => import('./pages/assignments/Assignments').then(m => ({ default: m.Assignments })));
const Payroll = lazy(() => import('./pages/payroll/Payroll').then(m => ({ default: m.Payroll })));
const Loans = lazy(() => import('./pages/loans/Loans').then(m => ({ default: m.Loans })));
const Fines = lazy(() => import('./pages/fines/Fines').then(m => ({ default: m.Fines })));
const Expenses = lazy(() => import('./pages/expenses/Expenses').then(m => ({ default: m.Expenses })));
const PlatformIncome = lazy(() => import('./pages/platform-income/PlatformIncome').then(m => ({ default: m.PlatformIncome })));
const ProfitLoss = lazy(() => import('./pages/profit-loss/ProfitLoss').then(m => ({ default: m.ProfitLoss })));
const Maintenance = lazy(() => import('./pages/maintenance/Maintenance').then(m => ({ default: m.Maintenance })));
const Reports = lazy(() => import('./pages/reports/Reports').then(m => ({ default: m.Reports })));
const AuditLogs = lazy(() => import('./pages/audit-logs/AuditLogs').then(m => ({ default: m.AuditLogs })));
const Settings = lazy(() => import('./pages/settings/Settings').then(m => ({ default: m.Settings })));
const UserManagement = lazy(() => import('./pages/settings/UserManagement').then(m => ({ default: m.UserManagement })));
const Permissions = lazy(() => import('./pages/permissions/Permissions').then(m => ({ default: m.Permissions })));

// Full-screen loading spinner while lazy chunks load
const PageLoader = () => (
  <div className="flex h-screen w-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
    <div className="flex flex-col items-center gap-3">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">Loading MUZN ERP…</span>
    </div>
  </div>
);

function App() {
  return (
    <ThemeProvider>
      <AntdProvider>
      <AntdApp component={false}>
      <NotificationBridge />
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public */}
              <Route path="/login" element={<Login />} />

              {/* Protected layout shell */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />

                {/* Employees */}
                <Route path="employees" element={<EmployeesList />} />
                <Route path="employees/:id" element={<EmployeeDetail />} />

                {/* Fleet */}
                <Route path="motorbikes" element={<MotorbikesList />} />
                <Route path="motorbikes/:id" element={<MotorbikeDetail />} />
                <Route path="assignments" element={<Assignments />} />
                <Route path="maintenance" element={<Maintenance />} />

                {/* HR / Finance */}
                <Route path="payroll" element={<Payroll />} />
                <Route path="loans" element={<Loans />} />
                <Route path="fines" element={<Fines />} />
                <Route path="expenses" element={<Expenses />} />

                {/* Owner-only financial views */}
                <Route
                  path="platform-income"
                  element={
                    <OwnerRoute>
                      <PlatformIncome />
                    </OwnerRoute>
                  }
                />
                <Route
                  path="profit-loss"
                  element={
                    <OwnerRoute>
                      <ProfitLoss />
                    </OwnerRoute>
                  }
                />

                {/* Operations */}
                <Route path="reports" element={<Reports />} />
                <Route path="audit-logs" element={<AuditLogs />} />

                {/* System */}
                <Route path="settings" element={<Settings />} />
                <Route
                  path="users"
                  element={
                    <OwnerRoute>
                      <UserManagement />
                    </OwnerRoute>
                  }
                />
                <Route
                  path="permissions"
                  element={
                    <OwnerRoute>
                      <Permissions />
                    </OwnerRoute>
                  }
                />
              </Route>

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
      </AntdApp>
      </AntdProvider>
    </ThemeProvider>
  );
}

export default App;
