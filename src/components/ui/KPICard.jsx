import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export const KPICard = ({ title, icon: Icon, value, trend, trendType = 'up', badge }) => {
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 sm:p-4 md:p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between min-w-0">
      <div className="flex items-start justify-between mb-2 md:mb-4 gap-1">
        <span className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 leading-tight">{title}</span>
        {Icon && (
          <div className="p-1.5 md:p-2 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg text-brand-light dark:text-brand-dark flex-shrink-0">
            <Icon size={13} className="md:hidden" />
            <Icon size={16} className="hidden md:block" />
          </div>
        )}
      </div>
      
      <div className="flex items-baseline justify-between mt-auto flex-wrap gap-1">
        <span className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 truncate">{value}</span>
        
        {trend && (
          <span className={`inline-flex items-center gap-0.5 text-[9px] sm:text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
            trendType === 'up' 
              ? 'text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/30' 
              : 'text-rose-700 bg-rose-50 dark:text-rose-400 dark:bg-rose-950/30'
          }`}>
            {trendType === 'up' ? <ArrowUpRight size={9} /> : <ArrowDownRight size={9} />}
            <span className="hidden sm:inline">{trend}</span>
          </span>
        )}

        {badge && (
          <span className="inline-flex items-center text-[9px] sm:text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex-shrink-0">
            {badge}
          </span>
        )}
      </div>
    </div>
  );
};
