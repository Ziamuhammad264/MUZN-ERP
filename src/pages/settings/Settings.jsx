import React, { useState, useEffect, useCallback } from 'react';
import { settingsApi } from '../../api/services';
import { apiMessage } from '../../api/axios';
import { PageHeader } from '../../components/ui/PageHeader';
import { SectionCard } from '../../components/ui/SectionCard';
import { toast, confirmDialog } from '../../utils/notify';
import { Plus, Trash2, Loader2 } from 'lucide-react';

const prettyType = (type) =>
  type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export const Settings = () => {
  const [types, setTypes] = useState([]);
  const [activeType, setActiveType] = useState(null);
  const [items, setItems] = useState([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [saving, setSaving] = useState(false);

  // Load available setting types once.
  useEffect(() => {
    settingsApi
      .types()
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setTypes(list);
        setActiveType((prev) => prev || list[0] || null);
      })
      .catch((err) => toast.error(apiMessage(err, 'Failed to load setting types')))
      .finally(() => setLoadingTypes(false));
  }, []);

  const loadItems = useCallback((type) => {
    if (!type) return;
    setLoadingItems(true);
    settingsApi
      .byType(type)
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch((err) => toast.error(apiMessage(err, 'Failed to load options')))
      .finally(() => setLoadingItems(false));
  }, []);

  useEffect(() => {
    loadItems(activeType);
  }, [activeType, loadItems]);

  const handleAdd = async (e) => {
    e.preventDefault();
    const label = newLabel.trim();
    if (!label || !activeType) return;
    setSaving(true);
    try {
      await settingsApi.create({
        type: activeType,
        value: label.toLowerCase().replace(/\s+/g, '_'),
        label,
        sort_order: items.length + 1
      });
      setNewLabel('');
      toast.success('Option added.');
      loadItems(activeType);
    } catch (err) {
      toast.error(apiMessage(err, 'Failed to add option'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (item) => {
    confirmDialog({
      title: 'Remove dropdown option?',
      content: `"${item.label}" will be removed from ${prettyType(activeType)}.`,
      okText: 'Remove',
      okType: 'danger',
      onOk: async () => {
        try {
          await settingsApi.remove(item.id);
          toast.success(`Removed "${item.label}".`);
          loadItems(activeType);
        } catch (err) {
          toast.error(apiMessage(err, 'Failed to remove option'));
        }
      }
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Application Options & Settings"
        subtitle="Manage dynamic dropdown values — zones, departments, platforms, bike types, and more."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
        {/* Left categories list */}
        <div className="md:col-span-1 bg-white dark:bg-slate-800 border border-slate-205 dark:border-slate-700 rounded-xl overflow-hidden p-3.5 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase px-2 mb-2 block select-none">
            Setting Types
          </span>
          {loadingTypes ? (
            <div className="flex items-center gap-2 px-3 py-2 text-xs text-slate-400">
              <Loader2 size={14} className="animate-spin" /> Loading…
            </div>
          ) : types.length === 0 ? (
            <p className="px-3 py-2 text-xs text-slate-400">No setting types available.</p>
          ) : (
            types.map((type) => (
              <button
                key={type}
                onClick={() => {
                  setActiveType(type);
                  setNewLabel('');
                }}
                className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
                  activeType === type
                    ? 'bg-brand-light/10 text-brand-light dark:bg-brand-dark/10 dark:text-brand-dark'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-250 dark:hover:bg-slate-900'
                }`}
              >
                {prettyType(type)}
              </button>
            ))
          )}
        </div>

        {/* Right options editor */}
        <div className="md:col-span-2 space-y-6">
          <SectionCard
            title={activeType ? `Configure: ${prettyType(activeType)}` : 'Configure'}
            actions={
              <span className="text-[10px] font-bold text-slate-450">
                {items.length} Options configured
              </span>
            }
          >
            <div className="space-y-6">
              <form onSubmit={handleAdd} className="flex gap-2">
                <input
                  type="text"
                  required
                  disabled={!activeType || saving}
                  className="flex-1 text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-light text-slate-850 dark:text-slate-100 disabled:opacity-50"
                  placeholder={activeType ? `Add new ${prettyType(activeType)} option` : 'Select a type first'}
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={!activeType || saving}
                  className="flex items-center gap-1.5 px-4 py-2 bg-brand-light dark:bg-brand-dark hover:opacity-95 text-white font-semibold rounded-lg shadow-sm text-xs transition-all disabled:opacity-50"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  <span>Add</span>
                </button>
              </form>

              <div className="divide-y divide-slate-100 dark:divide-slate-750 text-xs">
                {loadingItems ? (
                  <div className="flex items-center gap-2 py-4 text-slate-400">
                    <Loader2 size={14} className="animate-spin" /> Loading options…
                  </div>
                ) : items.length === 0 ? (
                  <p className="py-4 text-slate-400">No options configured yet.</p>
                ) : (
                  items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center py-2.5">
                      <span className="font-semibold text-slate-750 dark:text-slate-200">
                        {item.label}
                        <span className="ml-2 text-[10px] text-slate-400 font-mono">{item.value}</span>
                      </span>
                      <button
                        onClick={() => handleDelete(item)}
                        className="p-1 text-slate-400 dark:text-slate-500 hover:text-rose-500 rounded hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                        title="Remove Option"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
};
