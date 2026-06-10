import React from 'react';

export const FormField = ({ label, error, children, required = false }) => {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          {label} {required && <span className="text-rose-500 font-bold">*</span>}
        </label>
      )}
      <div className="w-full">
        {children}
      </div>
      {error && (
        <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 mt-0.5">
          {error}
        </span>
      )}
    </div>
  );
};
