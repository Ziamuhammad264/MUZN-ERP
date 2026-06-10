import React from 'react';
import { FileDown, FileText } from 'lucide-react';

export const ExportButton = ({ type = 'excel', onClick, label }) => {
  const isExcel = type === 'excel';
  
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
        isExcel
          ? 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-950/20 dark:border-emerald-900/30 dark:hover:bg-emerald-950/40'
          : 'text-rose-700 bg-rose-50 border-rose-200 hover:bg-rose-100 dark:text-rose-400 dark:bg-rose-950/20 dark:border-rose-900/30 dark:hover:bg-rose-950/40'
      }`}
    >
      {isExcel ? <FileDown size={14} /> : <FileText size={14} />}
      <span>{label || (isExcel ? 'Export Excel' : 'Export PDF')}</span>
    </button>
  );
};
