import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { SectionCard } from '../../components/ui/SectionCard';
import { FormField } from '../../components/ui/FormField';
import { KeyRound, ShieldCheck, Users, Loader2, Save, RotateCcw, Lock } from 'lucide-react';
import { permissionsApi, usersApi } from '../../api/services';
import { asList } from '../../hooks/useApi';
import { apiMessage } from '../../api/axios';
import { toast, confirmDialog } from '../../utils/notify';
import { usePermissions } from '../../hooks/usePermissions';

const ROLE_OPTIONS = [
  { value: 'owner', label: 'Owner' },
  { value: 'superadmin', label: 'Superadmin' },
  { value: 'admin', label: 'Admin' }
];

// Normalize the /permissions payload (object keyed by module OR flat array of
// "module.action" slugs) into a { module: [slug, ...] } map plus a flat list.
const normalizePermissions = (payload) => {
  const groups = {};
  const flat = [];

  const push = (slug) => {
    if (typeof slug !== 'string' || !slug) return;
    flat.push(slug);
    const module = slug.includes('.') ? slug.split('.')[0] : 'other';
    if (!groups[module]) groups[module] = [];
    if (!groups[module].includes(slug)) groups[module].push(slug);
  };

  if (Array.isArray(payload)) {
    payload.forEach(push);
  } else if (payload && typeof payload === 'object') {
    Object.entries(payload).forEach(([module, value]) => {
      if (Array.isArray(value)) {
        // { employees: ["employees.view", ...] } OR { employees: ["view", ...] }
        value.forEach((item) => {
          if (typeof item === 'string') {
            push(item.includes('.') ? item : `${module}.${item}`);
          } else if (item && typeof item === 'object' && item.slug) {
            push(item.slug);
          }
        });
      } else if (typeof value === 'string') {
        push(value.includes('.') ? value : `${module}.${value}`);
      }
    });
  }

  return { groups, flat };
};

// Extract a flat list of granted slugs from a role/user permissions payload,
// which may be a flat array, a grouped object, or wrap them under `.permissions`.
const extractGranted = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return normalizePermissions(payload).flat;
  if (Array.isArray(payload.permissions)) return normalizePermissions(payload.permissions).flat;
  return normalizePermissions(payload).flat;
};

const prettyModule = (module) =>
  module
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

export const Permissions = () => {
  const { isElevated } = usePermissions();

  const [activeTab, setActiveTab] = useState('role'); // 'role' | 'user'

  // All available permission slugs grouped by module.
  const [allGroups, setAllGroups] = useState({});
  const [allLoading, setAllLoading] = useState(true);

  // Role tab state
  const [selectedRole, setSelectedRole] = useState('admin');
  const [roleGranted, setRoleGranted] = useState(new Set());
  const [roleLoading, setRoleLoading] = useState(false);
  const [roleSaving, setRoleSaving] = useState(false);

  // User tab state
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [userGranted, setUserGranted] = useState(new Set());
  const [userLoading, setUserLoading] = useState(false);
  const [userSaving, setUserSaving] = useState(false);
  const [userResetting, setUserResetting] = useState(false);

  const moduleKeys = useMemo(() => Object.keys(allGroups).sort(), [allGroups]);

  // ---- Load all permissions once ----
  const fetchAll = useCallback(async () => {
    setAllLoading(true);
    try {
      const payload = await permissionsApi.all();
      const { groups } = normalizePermissions(payload);
      setAllGroups(groups);
    } catch (err) {
      toast.error(apiMessage(err));
    } finally {
      setAllLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ---- Role permissions ----
  const fetchRolePermissions = useCallback(async (role) => {
    setRoleLoading(true);
    try {
      const payload = await permissionsApi.rolePermissions(role);
      setRoleGranted(new Set(extractGranted(payload)));
    } catch (err) {
      toast.error(apiMessage(err));
      setRoleGranted(new Set());
    } finally {
      setRoleLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'role') fetchRolePermissions(selectedRole);
  }, [activeTab, selectedRole, fetchRolePermissions]);

  // ---- Users + user permissions ----
  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const payload = await usersApi.list();
      const { rows } = asList(payload);
      setUsers(rows);
      if (rows.length && !selectedUserId) setSelectedUserId(String(rows[0].id));
    } catch (err) {
      toast.error(apiMessage(err));
    } finally {
      setUsersLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchUserPermissions = useCallback(async (userId) => {
    if (!userId) return;
    setUserLoading(true);
    try {
      const payload = await permissionsApi.userPermissions(userId);
      setUserGranted(new Set(extractGranted(payload)));
    } catch (err) {
      toast.error(apiMessage(err));
      setUserGranted(new Set());
    } finally {
      setUserLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'user' && users.length === 0) fetchUsers();
  }, [activeTab, users.length, fetchUsers]);

  useEffect(() => {
    if (activeTab === 'user' && selectedUserId) fetchUserPermissions(selectedUserId);
  }, [activeTab, selectedUserId, fetchUserPermissions]);

  // ---- Checkbox helpers ----
  const toggleSlug = (granted, setGranted) => (slug) => {
    setGranted((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  const toggleGroup = (setGranted) => (slugs, checked) => {
    setGranted((prev) => {
      const next = new Set(prev);
      slugs.forEach((s) => (checked ? next.add(s) : next.delete(s)));
      return next;
    });
  };

  // ---- Save handlers ----
  const handleSaveRole = async () => {
    setRoleSaving(true);
    try {
      await permissionsApi.updateRolePermissions(selectedRole, Array.from(roleGranted));
      toast.success(`Permissions updated for ${selectedRole}.`);
      await fetchRolePermissions(selectedRole);
    } catch (err) {
      toast.error(apiMessage(err));
    } finally {
      setRoleSaving(false);
    }
  };

  const handleSaveUser = async () => {
    if (!selectedUserId) return;
    setUserSaving(true);
    try {
      await permissionsApi.updateUserPermissions(selectedUserId, Array.from(userGranted));
      toast.success('User overrides saved.');
      await fetchUserPermissions(selectedUserId);
    } catch (err) {
      toast.error(apiMessage(err));
    } finally {
      setUserSaving(false);
    }
  };

  const handleResetUser = () => {
    if (!selectedUserId) return;
    confirmDialog({
      title: 'Reset to role defaults?',
      content: 'This removes all per-user permission overrides and reverts the user to their role defaults.',
      okText: 'Reset',
      okType: 'danger',
      onOk: async () => {
        setUserResetting(true);
        try {
          await permissionsApi.resetUserPermissions(selectedUserId);
          toast.success('User reverted to role defaults.');
          await fetchUserPermissions(selectedUserId);
        } catch (err) {
          toast.error(apiMessage(err));
        } finally {
          setUserResetting(false);
        }
      }
    });
  };

  // ---- Grouped checkbox grid (shared by both tabs) ----
  const renderGroups = (granted, setGranted, disabled) => {
    if (allLoading) {
      return (
        <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400 dark:text-slate-500">
          <Loader2 size={24} className="animate-spin" />
          <span className="text-xs font-semibold">Loading permissions…</span>
        </div>
      );
    }
    if (moduleKeys.length === 0) {
      return (
        <div className="py-12 text-center text-xs text-slate-400 dark:text-slate-500">
          No permissions available.
        </div>
      );
    }

    const onToggleSlug = toggleSlug(granted, setGranted);
    const onToggleGroup = toggleGroup(setGranted);

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {moduleKeys.map((module) => {
          const slugs = allGroups[module];
          const allChecked = slugs.every((s) => granted.has(s));
          const someChecked = slugs.some((s) => granted.has(s));
          return (
            <div
              key={module}
              className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-slate-50/40 dark:bg-slate-900/20"
            >
              <label className="flex items-center justify-between gap-2 px-3 py-2 border-b border-slate-150 dark:border-slate-700 bg-slate-100/60 dark:bg-slate-800/60 cursor-pointer">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  {prettyModule(module)}
                </span>
                <input
                  type="checkbox"
                  disabled={disabled}
                  checked={allChecked}
                  ref={(el) => {
                    if (el) el.indeterminate = !allChecked && someChecked;
                  }}
                  onChange={(e) => onToggleGroup(slugs, e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-brand-light focus:ring-brand-light disabled:opacity-50"
                />
              </label>
              <div className="p-3 space-y-1.5">
                {slugs.map((slug) => {
                  const action = slug.includes('.') ? slug.split('.').slice(1).join('.') : slug;
                  return (
                    <label
                      key={slug}
                      className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer hover:text-slate-900 dark:hover:text-slate-100"
                    >
                      <input
                        type="checkbox"
                        disabled={disabled}
                        checked={granted.has(slug)}
                        onChange={() => onToggleSlug(slug)}
                        className="h-3.5 w-3.5 rounded border-slate-300 text-brand-light focus:ring-brand-light disabled:opacity-50"
                      />
                      <span className="capitalize">{action.replace(/_/g, ' ')}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Defensive gate — routing guards this page too.
  if (!isElevated()) {
    return (
      <div className="py-12 text-center flex flex-col items-center justify-center gap-2">
        <Lock size={32} className="text-rose-500" />
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">Access Denied</h3>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Permission management is restricted to Owner and Superadmin profiles only.
        </p>
      </div>
    );
  }

  const tabBtn = (key, label, Icon) => (
    <button
      onClick={() => setActiveTab(key)}
      className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border transition-all ${
        activeTab === key
          ? 'bg-brand-light dark:bg-brand-dark text-white border-transparent shadow-sm'
          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
      }`}
    >
      <Icon size={14} />
      <span>{label}</span>
    </button>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles & Permissions"
        subtitle="Define what each access role can do and grant per-user overrides for fine-grained control."
      />

      <div className="flex items-center gap-2">
        {tabBtn('role', 'Role Permissions', ShieldCheck)}
        {tabBtn('user', 'User Overrides', Users)}
      </div>

      {/* ---- ROLE TAB ---- */}
      {activeTab === 'role' && (
        <SectionCard
          title="Role Permissions"
          actions={
            <button
              onClick={handleSaveRole}
              disabled={roleSaving || roleLoading || allLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-light dark:bg-brand-dark hover:opacity-95 text-white font-semibold rounded-lg shadow-sm text-xs transition-all disabled:opacity-60"
            >
              {roleSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              <span>Save Role</span>
            </button>
          }
        >
          <div className="space-y-4">
            <div className="max-w-xs">
              <FormField label="Select Role">
                <select
                  className="w-full text-xs px-3 py-2 border border-slate-205 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:outline-none text-slate-850 dark:text-slate-100"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </FormField>
            </div>

            {roleLoading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400 dark:text-slate-500">
                <Loader2 size={24} className="animate-spin" />
                <span className="text-xs font-semibold">Loading role permissions…</span>
              </div>
            ) : (
              renderGroups(roleGranted, setRoleGranted, roleSaving)
            )}
          </div>
        </SectionCard>
      )}

      {/* ---- USER TAB ---- */}
      {activeTab === 'user' && (
        <SectionCard
          title="Per-User Overrides"
          actions={
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleResetUser}
                disabled={!selectedUserId || userResetting || userLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-300 font-semibold rounded-lg text-xs transition-all disabled:opacity-60"
              >
                {userResetting ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
                <span>Reset to Role Defaults</span>
              </button>
              <button
                onClick={handleSaveUser}
                disabled={!selectedUserId || userSaving || userLoading || allLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-light dark:bg-brand-dark hover:opacity-95 text-white font-semibold rounded-lg shadow-sm text-xs transition-all disabled:opacity-60"
              >
                {userSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                <span>Save Overrides</span>
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="max-w-xs">
              <FormField label="Select User">
                {usersLoading ? (
                  <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 py-2">
                    <Loader2 size={14} className="animate-spin" />
                    Loading users…
                  </div>
                ) : (
                  <select
                    className="w-full text-xs px-3 py-2 border border-slate-205 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:outline-none text-slate-850 dark:text-slate-100"
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                  >
                    {users.length === 0 && <option value="">No users found</option>}
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                )}
              </FormField>
            </div>

            <div className="flex items-start gap-2 text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed">
              <KeyRound size={13} className="mt-0.5 flex-shrink-0" />
              <span>
                Overrides replace this user&apos;s effective permission set. Use “Reset to Role
                Defaults” to remove overrides and fall back to the role&apos;s permissions.
              </span>
            </div>

            {userLoading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400 dark:text-slate-500">
                <Loader2 size={24} className="animate-spin" />
                <span className="text-xs font-semibold">Loading user permissions…</span>
              </div>
            ) : (
              renderGroups(userGranted, setUserGranted, userSaving || !selectedUserId)
            )}
          </div>
        </SectionCard>
      )}
    </div>
  );
};
