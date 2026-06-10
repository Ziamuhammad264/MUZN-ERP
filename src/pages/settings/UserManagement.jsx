import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { SectionCard } from '../../components/ui/SectionCard';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { FormField } from '../../components/ui/FormField';
import { ShieldCheck, Plus, Edit, Trash, Loader2 } from 'lucide-react';
import { usersApi } from '../../api/services';
import { asList } from '../../hooks/useApi';
import { apiMessage } from '../../api/axios';
import { toast, confirmDialog } from '../../utils/notify';
import { USER_ROLES } from '../../constants/options';
import { v, validateForm, cleanPayload, mapApiErrors } from '../../utils/validation';
import { ModalPortal } from '../../components/ui/ModalPortal';

const emptyForm = { name: '', email: '', password: '', password_confirmation: '', role: '' };

export const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null); // null = create mode
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const isEditing = !!editingUser;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await usersApi.list();
      const { rows } = asList(payload);
      setUsers(rows);
    } catch (err) {
      toast.error(apiMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const openCreate = () => {
    setEditingUser(null);
    setForm(emptyForm);
    setErrors({});
    setIsModalOpen(true);
  };

  const openEdit = (user) => {
    setEditingUser(user);
    setForm({
      name: user.name || '',
      email: user.email || '',
      password: '',
      password_confirmation: '',
      role: user.role === 'owner' ? 'owner' : user.role || 'admin'
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    setForm(emptyForm);
    setErrors({});
  };

  const validate = () => {
    const rules = {
      name: [v.required('Full name')],
      email: [v.required('Email'), v.email()],
      role: [v.required('Role')]
    };
    if (isEditing) {
      // Password optional on edit — only validate when one was entered.
      if (form.password) {
        rules.password = [v.minLength(6, 'Password')];
        rules.password_confirmation = [v.match('password', 'Passwords')];
      }
    } else {
      rules.password = [v.required('Password'), v.minLength(6, 'Password')];
      rules.password_confirmation = [v.match('password', 'Passwords')];
    }
    const errs = validateForm(form, rules);
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate() || saving) return;

    setSaving(true);
    try {
      if (isEditing) {
        const payload = cleanPayload({ name: form.name, role: form.role });
        if (form.password) {
          payload.password = form.password;
          payload.password_confirmation = form.password_confirmation;
        }
        await usersApi.update(editingUser.id, payload);
        toast.success('User account updated.');
      } else {
        const payload = cleanPayload(form);
        await usersApi.create(payload);
        toast.success('Admin account created.');
      }
      closeModal();
      await fetchUsers();
    } catch (err) {
      const mapped = mapApiErrors(err);
      if (mapped) setErrors(mapped);
      toast.error(apiMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (user) => {
    try {
      await usersApi.toggleStatus(user.id);
      toast.success('Account status updated.');
      await fetchUsers();
    } catch (err) {
      toast.error(apiMessage(err));
    }
  };

  const handleDelete = (user) => {
    confirmDialog({
      title: 'Delete user account?',
      content: `This will permanently remove ${user.name} (${user.email}).`,
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          await usersApi.remove(user.id);
          toast.success('User account deleted.');
          await fetchUsers();
        } catch (err) {
          toast.error(apiMessage(err));
        }
      }
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="User & System Security Accounts"
        subtitle="Manage administrator logins, configure platform access levels, and audit employee access accounts."
        actions={
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 px-3 py-2 bg-brand-light dark:bg-brand-dark hover:opacity-95 text-white font-semibold rounded-lg shadow-sm text-xs transition-all"
          >
            <Plus size={14} />
            <span>Create Admin User</span>
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">

        {/* Left side list */}
        <div className="lg:col-span-2 space-y-4">
          <SectionCard title="Active User Accounts">
            <div className="overflow-x-auto custom-scrollbar">
              {loading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400 dark:text-slate-500">
                  <Loader2 size={24} className="animate-spin" />
                  <span className="text-xs font-semibold">Loading user accounts…</span>
                </div>
              ) : users.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 dark:text-slate-500">
                  No user accounts found.
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-205 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-semibold tracking-wider uppercase">
                      <th className="py-2.5 px-3">Name / Email</th>
                      <th className="py-2.5 px-3">Access Role</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 dark:divide-slate-700 text-slate-700 dark:text-slate-250">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10">
                        <td className="py-3 px-3 font-semibold">
                          <div>{u.name}</div>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">{u.email}</div>
                        </td>
                        <td className="py-3 px-3 font-bold uppercase text-brand-light dark:text-brand-dark">
                          {u.role}
                        </td>
                        <td className="py-3 px-3">
                          <StatusBadge status={u.status} />
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleToggleStatus(u)}
                              className="px-2 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-[10px] font-bold text-slate-750 dark:text-slate-200 rounded border border-slate-250 dark:border-slate-600 transition-colors"
                            >
                              Toggle Active
                            </button>
                            <button
                              onClick={() => openEdit(u)}
                              title="Edit account"
                              className="p-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-750 dark:text-slate-200 rounded border border-slate-250 dark:border-slate-600 transition-colors"
                            >
                              <Edit size={13} />
                            </button>
                            <button
                              onClick={() => handleDelete(u)}
                              disabled={u.role === 'owner'}
                              title={u.role === 'owner' ? 'Owner account cannot be deleted' : 'Delete account'}
                              className="p-1.5 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 text-rose-600 dark:text-rose-400 rounded border border-rose-200 dark:border-rose-900/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <Trash size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </SectionCard>
        </div>

        {/* Right side: Security Policy notes */}
        <div className="lg:col-span-1">
          <SectionCard title="Access Policy Configuration">
            <div className="space-y-4 text-xs">
              <div className="flex gap-2.5 items-start">
                <ShieldCheck size={18} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-slate-700 dark:text-slate-300">Owner Access Permissions</h4>
                  <p className="text-slate-400 dark:text-slate-300 mt-0.5 leading-relaxed">
                    Unrestricted ledger access, profit and loss calculations, WPS statements generation, settlements uploads, settings and audits logs.
                  </p>
                </div>
              </div>

              <div className="flex gap-2.5 items-start pt-3 border-t border-slate-100 dark:border-slate-700">
                <ShieldCheck size={18} className="text-blue-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-slate-700 dark:text-slate-300">Admin Operational Permissions</h4>
                  <p className="text-slate-400 dark:text-slate-300 mt-0.5 leading-relaxed">
                    Riders CRUD directory actions, motorbike registry index logs, assignment and returns process controls. Ledger and financial pages are DOM hidden.
                  </p>
                </div>
              </div>
            </div>
          </SectionCard>
        </div>

      </div>

      {/* Add / Edit User Modal */}
      {isModalOpen && (
        <ModalPortal>
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 text-left">
          <div className="bg-white dark:bg-slate-800 border border-slate-205 dark:border-slate-700 rounded-xl max-w-md w-full shadow-2xl overflow-hidden animate-fade-in">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-150 dark:border-slate-700">
              <h3 className="text-base font-bold text-slate-850 dark:text-slate-100 flex items-center gap-2">
                <ShieldCheck size={18} className="text-brand-light" />
                {isEditing ? 'Edit Admin Account' : 'Create New Admin Account'}
              </h3>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="p-6 space-y-4">
                <FormField label="Full Name" error={errors.name} required>
                  <input
                    type="text"
                    required
                    className="w-full text-xs px-3 py-2 border border-slate-205 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-light text-slate-800 dark:text-slate-100"
                    placeholder="e.g. Fatima Ali"
                    value={form.name}
                    onChange={(e) => setField('name', e.target.value)}
                  />
                </FormField>

                <FormField label="Email Address" error={errors.email} required>
                  <input
                    type="email"
                    required
                    disabled={isEditing}
                    className="w-full text-xs px-3 py-2 border border-slate-205 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-light text-slate-850 dark:text-slate-100 disabled:opacity-60 disabled:cursor-not-allowed"
                    placeholder="fatima@muzn.ae"
                    value={form.email}
                    onChange={(e) => setField('email', e.target.value)}
                  />
                </FormField>

                <FormField label={isEditing ? 'New Password (leave blank to keep)' : 'Password'} error={errors.password} required={!isEditing}>
                  <input
                    type="password"
                    required={!isEditing}
                    autoComplete="new-password"
                    className="w-full text-xs px-3 py-2 border border-slate-205 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-light text-slate-850 dark:text-slate-100"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(e) => setField('password', e.target.value)}
                  />
                </FormField>

                <FormField label="Confirm Password" error={errors.password_confirmation} required={!isEditing}>
                  <input
                    type="password"
                    required={!isEditing || !!form.password}
                    autoComplete="new-password"
                    className="w-full text-xs px-3 py-2 border border-slate-205 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-light text-slate-850 dark:text-slate-100"
                    placeholder="••••••••"
                    value={form.password_confirmation}
                    onChange={(e) => setField('password_confirmation', e.target.value)}
                  />
                </FormField>

                <FormField label="Security Role" error={errors.role} required>
                  {editingUser?.role === 'owner' ? (
                    <input
                      type="text"
                      disabled
                      value="Owner"
                      className="w-full text-xs px-3 py-2 border border-slate-205 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-500 dark:text-slate-400 cursor-not-allowed"
                    />
                  ) : (
                    <select
                      className="w-full text-xs px-3 py-2 border border-slate-205 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:outline-none text-slate-850 dark:text-slate-100"
                      value={form.role}
                      onChange={(e) => setField('role', e.target.value)}
                    >
                      <option value="">Select role…</option>
                      {USER_ROLES.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  )}
                </FormField>
              </div>

              <div className="flex items-center justify-end gap-2 px-6 py-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-150 dark:border-slate-700">
                <button
                  type="button"
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-750 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-brand-light hover:opacity-95 text-white shadow-sm flex items-center gap-1.5 disabled:opacity-60"
                >
                  {saving && <Loader2 size={13} className="animate-spin" />}
                  {isEditing ? 'Save Changes' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
        </ModalPortal>
      )}

    </div>
  );
};
