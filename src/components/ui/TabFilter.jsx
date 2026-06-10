import React from 'react';

export const TabFilter = ({ tabs = [], activeTab, onChange }) => {
  return (
    <div className="flex items-center gap-0.5 sm:gap-1 bg-slate-100 dark:bg-slate-900 p-0.5 sm:p-1 rounded-lg w-fit border border-slate-200/50 dark:border-slate-800 overflow-x-auto custom-scrollbar">
      {tabs.map((tab) => {
        const id = typeof tab === 'string' ? tab : tab.id;
        const label = typeof tab === 'string' ? tab : tab.label;
        const isActive = activeTab === id;

        return (
          <button
            key={id}
            type="button"
            className={`px-2 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-semibold rounded-md transition-all whitespace-nowrap flex-shrink-0 ${
              isActive
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
            onClick={() => onChange(id)}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
};
