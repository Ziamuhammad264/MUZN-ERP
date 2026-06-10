import { useAuth } from '../context/AuthContext';

// Modules that are restricted to owner + superadmin per the API docs.
const ELEVATED_MODULES = [
  'platform-income',
  'profit-loss',
  'users',
  'permissions',
  'audit-logs'
];

export const usePermissions = () => {
  const { user, permissions } = useAuth();
  const role = user?.role;

  const isOwner = () => role === 'owner';
  const isSuperadmin = () => role === 'superadmin';
  // Owner & superadmin both unlock financial / system modules.
  const isElevated = () => role === 'owner' || role === 'superadmin';

  // Check a single permission slug (e.g. "employees.create").
  const can = (slug) => {
    if (role === 'owner') return true;
    if (!slug) return true;
    return Array.isArray(permissions) && permissions.includes(slug);
  };

  const canAccess = (module) => {
    if (ELEVATED_MODULES.includes(module)) return isElevated();
    return true;
  };

  return {
    isOwner,
    isSuperadmin,
    isElevated,
    can,
    canAccess,
    permissions,
    userRole: role
  };
};
