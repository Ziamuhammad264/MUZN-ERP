import React from 'react';
import { AlertTriangle, AlertOctagon, CheckCircle } from 'lucide-react';
import { getDaysRemaining } from '../../utils/formatters';

export const DocumentExpiryBadge = ({ expiryDate, label }) => {
  if (!expiryDate) return <span className="text-slate-400 dark:text-slate-500">—</span>;

  const days = getDaysRemaining(expiryDate);
  
  let text = `${days}d`;
  let colorClass = '';
  let Icon = CheckCircle;

  if (days < 0) {
    text = `Expired`;
    colorClass = 'text-rose-600 bg-rose-50 border-rose-200 dark:text-rose-400 dark:bg-rose-950/20 dark:border-rose-900/30';
    Icon = AlertOctagon;
  } else if (days < 15) {
    text = `${days}d left`;
    colorClass = 'text-rose-600 bg-rose-50 border-rose-200 dark:text-rose-400 dark:bg-rose-950/20 dark:border-rose-900/30';
    Icon = AlertTriangle;
  } else if (days <= 30) {
    text = `${days}d left`;
    colorClass = 'text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950/20 dark:border-amber-900/30';
    Icon = AlertTriangle;
  } else {
    colorClass = 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/20 dark:border-emerald-900/30';
    Icon = CheckCircle;
  }

  return (
    <div className={`inline-flex items-center gap-1 text-[10px] sm:text-xs font-semibold px-1.5 sm:px-2 py-0.5 rounded-md border whitespace-nowrap ${colorClass}`} title={label ? `${label}: Expiring ${expiryDate}` : `Expiring ${expiryDate}`}>
      <Icon size={11} className="flex-shrink-0" />
      <span className="hidden sm:inline">{text}</span>
      <span className="sm:hidden">{text === 'Expired' ? '!' : text}</span>
    </div>
  );
};
