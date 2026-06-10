import React from 'react';

export const SectionCard = ({ title, children, actions, className = '' }) => {
  return (
    <div className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm ${className}`}>
      {title && (
        <div className="flex justify-between items-center px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-b border-slate-150 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/10 gap-2">
          <h2 className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 tracking-tight truncate">{title}</h2>
          {actions && <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">{actions}</div>}
        </div>
      )}
      <div className="p-3 sm:p-4 md:p-6 text-slate-700 dark:text-slate-200">
        {children}
      </div>
    </div>
  );
};
