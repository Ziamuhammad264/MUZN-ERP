import React from 'react';

export const ProgressBar = ({ value, max, label, subLabel }) => {
  const percentage = Math.min(100, Math.max(0, Math.round((value / max) * 100))) || 0;

  return (
    <div className="w-full flex flex-col gap-1">
      {(label || subLabel) && (
        <div className="flex justify-between items-center text-xs font-semibold text-slate-500 dark:text-slate-400 gap-2 min-w-0">
          <span className="truncate">{label}</span>
          <span className="flex-shrink-0 whitespace-nowrap">{subLabel || `${percentage}%`}</span>
        </div>
      )}
      <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden flex-shrink-0">
        <div 
          className="h-full bg-brand-light dark:bg-brand-dark rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
