import React from 'react';

export const PageHeader = ({ title, subtitle, actions }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 md:mb-6 border-b border-slate-200/50 dark:border-slate-800 pb-4 md:pb-5">
      <div className="min-w-0">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 truncate">{title}</h1>
        {subtitle && (
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 leading-snug">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 self-start sm:self-auto flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
};
