import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

export const ConfirmDeleteModal = ({ isOpen, onClose, onConfirm, title = 'Confirm Delete', message = 'Are you sure you want to delete this record? This action cannot be undone.' }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4">
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-t-2xl sm:rounded-xl max-w-md w-full shadow-2xl overflow-hidden animate-fade-in">
        <div className="flex justify-between items-center px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-150 dark:border-slate-700">
          <h3 className="text-sm sm:text-base font-semibold text-slate-850 dark:text-slate-100 flex items-center gap-2 truncate pr-2">
            <AlertTriangle size={18} className="text-rose-500 flex-shrink-0" />
            {title}
          </h3>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-500 dark:text-slate-500 dark:hover:text-slate-300 transition-colors flex-shrink-0"
          >
            <X size={18} />
          </button>
        </div>
        
        <div className="px-4 sm:px-6 py-4 sm:py-5">
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {message}
          </p>
        </div>
        
        <div className="flex items-center justify-end gap-2 px-4 sm:px-6 py-3 sm:py-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-150 dark:border-slate-700">
          <button
            type="button"
            className="px-3 sm:px-4 py-2 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-750 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="px-3 sm:px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-500 text-white shadow-sm transition-colors"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            Delete Record
          </button>
        </div>
      </div>
    </div>
  );
};
