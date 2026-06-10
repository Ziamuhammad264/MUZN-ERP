import React, { useState, useMemo } from 'react';
import { Search, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react';

export const DataTable = ({
  columns,
  data = [],
  searchPlaceholder = 'Search records...',
  searchKey = '',
  filterOptions = null, // e.g. { key: 'status', options: ['Active', 'Inactive'] }
  emirateFilter = false,
  pagination = true,
  defaultPageSize = 10,
  emptyMessage = 'No records found.'
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedEmirate, setSelectedEmirate] = useState('All');
  
  // Sorting state
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Filtered and sorted data
  const processedData = useMemo(() => {
    let filtered = [...data];

    // 1. Search filter
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => {
        if (searchKey) {
          const val = item[searchKey];
          return val ? String(val).toLowerCase().includes(query) : false;
        }
        // Search across all root values
        return Object.values(item).some(val => 
          val && String(val).toLowerCase().includes(query)
        );
      });
    }

    // 2. Status filter
    if (filterOptions && selectedStatus !== 'All') {
      filtered = filtered.filter(item => {
        const itemVal = item[filterOptions.key];
        return itemVal && String(itemVal).toLowerCase() === selectedStatus.toLowerCase();
      });
    }

    // 3. Emirate filter
    if (emirateFilter && selectedEmirate !== 'All') {
      filtered = filtered.filter(item => {
        // Can check workEmirate or emirate
        const itemVal = item.workEmirate || item.emirate;
        return itemVal && String(itemVal).toLowerCase() === selectedEmirate.toLowerCase();
      });
    }

    // 4. Sorting
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];

        // Handle nested or undefined
        if (aVal === undefined || aVal === null) aVal = '';
        if (bVal === undefined || bVal === null) bVal = '';

        // Compare numbers vs strings
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
        }

        aVal = String(aVal).toLowerCase();
        bVal = String(bVal).toLowerCase();

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [data, searchQuery, searchKey, selectedStatus, filterOptions, emirateFilter, selectedEmirate, sortConfig]);

  // Paginated data
  const paginatedData = useMemo(() => {
    if (!pagination) return processedData;
    const startIndex = (currentPage - 1) * pageSize;
    return processedData.slice(startIndex, startIndex + pageSize);
  }, [processedData, pagination, currentPage, pageSize]);

  const totalPages = Math.ceil(processedData.length / pageSize);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const getSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) return null;
    return sortConfig.direction === 'asc' ? <ChevronUp size={14} className="ml-1" /> : <ChevronDown size={14} className="ml-1" />;
  };

  return (
    <div className="flex flex-col gap-3 sm:gap-4 w-full">
      {/* Table Filters Header */}
      <div className="flex flex-col gap-2 sm:gap-3">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400 dark:text-slate-500">
            <Search size={16} />
          </span>
          <input
            type="text"
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-light focus:border-brand-light dark:focus:ring-brand-dark dark:focus:border-brand-dark transition-all placeholder-slate-400 text-slate-800 dark:text-slate-100"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {filterOptions && (
            <div className="flex items-center gap-1 sm:gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs text-slate-600 dark:text-slate-300">
              <span className="font-medium capitalize hidden sm:inline">{filterOptions.label || filterOptions.key}:</span>
              <select
                className="bg-transparent font-semibold focus:outline-none cursor-pointer pr-1 text-[11px] sm:text-xs"
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="All" className="bg-white dark:bg-slate-800">All</option>
                {filterOptions.options.map((opt) => (
                  <option key={opt} value={opt} className="bg-white dark:bg-slate-800">{opt}</option>
                ))}
              </select>
            </div>
          )}

          {emirateFilter && (
            <div className="flex items-center gap-1 sm:gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs text-slate-600 dark:text-slate-300">
              <span className="font-medium hidden sm:inline">Emirate:</span>
              <select
                className="bg-transparent font-semibold focus:outline-none cursor-pointer pr-1 text-[11px] sm:text-xs"
                value={selectedEmirate}
                onChange={(e) => {
                  setSelectedEmirate(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="All" className="bg-white dark:bg-slate-800">All Emirates</option>
                <option value="Dubai" className="bg-white dark:bg-slate-800">Dubai</option>
                <option value="Abu Dhabi" className="bg-white dark:bg-slate-800">Abu Dhabi</option>
                <option value="Sharjah" className="bg-white dark:bg-slate-800">Sharjah</option>
                <option value="Ajman" className="bg-white dark:bg-slate-800">Ajman</option>
                <option value="Fujairah" className="bg-white dark:bg-slate-800">Fujairah</option>
                <option value="Ras Al Khaimah" className="bg-white dark:bg-slate-800">Ras Al Khaimah</option>
                <option value="Umm Al Quwain" className="bg-white dark:bg-slate-800">Umm Al Quwain</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Actual Data Table Card */}
      <div className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
        <div className="w-full overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-max sm:min-w-full">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wider">
                {columns.map((col, idx) => (
                  <th
                    key={idx}
                    className={`py-2.5 sm:py-3.5 px-3 sm:px-4 select-none whitespace-nowrap sm:whitespace-normal ${col.sortable ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800' : ''}`}
                    onClick={() => col.sortable && requestSort(col.sortableKey || col.accessor)}
                  >
                    <div className="flex items-center">
                      <span>{col.header}</span>
                      {col.sortable && getSortIcon(col.sortableKey || col.accessor)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 dark:divide-slate-700 text-xs sm:text-sm text-slate-700 dark:text-slate-200">
              {paginatedData.length > 0 ? (
                paginatedData.map((row, rowIdx) => (
                  <tr key={rowIdx} className="hover:bg-slate-50/50 dark:hover:bg-slate-750/30 transition-colors">
                    {columns.map((col, colIdx) => (
                      <td key={colIdx} className="py-2.5 sm:py-3 px-3 sm:px-4 whitespace-nowrap sm:whitespace-normal overflow-hidden text-ellipsis">
                        {col.render 
                          ? col.render(row[col.accessor], row) 
                          : row[col.accessor] !== undefined && row[col.accessor] !== null 
                            ? String(row[col.accessor]) 
                            : '—'
                        }
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="py-6 sm:py-8 text-center text-xs sm:text-sm text-slate-400 dark:text-slate-500">
                    {emptyMessage}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {pagination && processedData.length > pageSize && (
          <div className="flex flex-col gap-2 sm:gap-3 sm:flex-row items-center justify-between px-3 sm:px-4 py-2 sm:py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50/35 dark:bg-slate-900/10 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1.5 flex-wrap justify-center sm:justify-start">
              <span>Show</span>
              <select
                className="bg-white dark:bg-slate-800 border border-slate-250 dark:border-slate-700 rounded px-1.5 py-0.5 text-xs text-slate-600 dark:text-slate-300 focus:outline-none"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                {[5, 10, 20, 50].map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
              <span>of <strong>{processedData.length}</strong></span>
            </div>

            <div className="flex items-center gap-1">
              <button
                className="p-1.5 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                title="Previous page"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="px-2 sm:px-3 text-xs">
                Page <strong>{currentPage}</strong> / <strong>{totalPages}</strong>
              </span>
              <button
                className="p-1.5 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                title="Next page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
