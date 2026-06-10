import React from 'react';

export const StatusBadge = ({ status }) => {
  if (!status) return null;

  const normalized = status.toLowerCase().trim();

  // Color mappings
  let classes = 'text-slate-700 bg-slate-100 dark:text-slate-300 dark:bg-slate-800';

  if (['active', 'paid', 'approved', 'available', 'registered', 'employee', 'completed', 'returned', 'created'].includes(normalized)) {
    classes = 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/30 dark:border-emerald-800/30';
  } else if (['on leave', 'pending', 'pending review', 'draft', 'expiring soon', 'warning', 'updated'].includes(normalized)) {
    classes = 'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950/30 dark:border-amber-800/30';
  } else if (['resigned', 'terminated', 'cancelled', 'damaged', 'expired', 'danger', 'deleted', 'unpaid'].includes(normalized)) {
    classes = 'text-rose-700 bg-rose-50 border-rose-200 dark:text-rose-400 dark:bg-rose-950/30 dark:border-rose-800/30';
  } else if (['under maintenance', 'maintenance', 'in progress', 'company', 'not registered', 'login'].includes(normalized)) {
    classes = 'text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950/30 dark:border-blue-800/30';
  } else if (['inactive'].includes(normalized)) {
    classes = 'text-slate-500 bg-slate-50 border-slate-200 dark:text-slate-400 dark:bg-slate-900/30 dark:border-slate-800/30';
  }

  return (
    <span className={`inline-flex items-center text-xs font-semibold px-2 sm:px-2.5 py-1 rounded-full border whitespace-nowrap truncate ${classes}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 flex-shrink-0"></span>
      <span className="truncate">{status}</span>
    </span>
  );
};
