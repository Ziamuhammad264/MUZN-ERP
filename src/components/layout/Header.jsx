import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { dashboardApi } from '../../api/services';
import { toast } from '../../utils/notify.jsx';
import { apiMessage } from '../../api/axios';
import {
  Bell,
  Sun,
  Moon,
  ChevronDown,
  Settings,
  LogOut,
  AlertTriangle,
  Wrench,
  BookOpen,
  Menu
} from 'lucide-react';

export const Header = ({ toggleMobileOpen }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const { user, logout } = useAuth();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Raw alert payload from the live dashboard alerts endpoint.
  const [alertData, setAlertData] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await dashboardApi.alerts();
        if (active) setAlertData(data || {});
      } catch (err) {
        if (active) toast.error(apiMessage(err));
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Track which alerts the user has already opened ("read"). Persisted so the
  // badge count stays reduced across reloads. Alert ids are deterministic.
  const READ_ALERTS_KEY = 'muzn_read_alerts';
  const [readAlertIds, setReadAlertIds] = useState(() => {
    try {
      const stored = localStorage.getItem(READ_ALERTS_KEY);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const persistReadIds = useCallback((set) => {
    try {
      localStorage.setItem(READ_ALERTS_KEY, JSON.stringify([...set]));
    } catch {
      /* ignore storage failures */
    }
  }, []);

  const markAlertRead = useCallback((id) => {
    setReadAlertIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      persistReadIds(next);
      return next;
    });
  }, [persistReadIds]);

  // Pick the first defined value from candidate keys (snake_case payloads vary).
  const pick = useCallback((obj, ...keys) => {
    for (const k of keys) {
      if (obj && obj[k] !== undefined && obj[k] !== null && obj[k] !== '') return obj[k];
    }
    return undefined;
  }, []);

  // Flatten the live dashboard alert payload into renderable list items.
  const alertsList = useMemo(() => {
    if (!alertData) return [];
    const list = [];

    const severityFor = (days) => {
      if (days === undefined || days === null) return 'amber';
      return days < 15 ? 'red' : 'amber';
    };

    const expiryMessage = (subject, docType, days) => {
      if (days === undefined || days === null) return `${subject} ${docType} expiring soon`;
      return `${subject} ${docType} ${days < 0 ? 'expired' : `expires in ${days} days`}`;
    };

    // 1. Employee document expiries -> /employees
    (alertData.employee_document_expiry || []).forEach((item, idx) => {
      const subject = pick(item, 'employee_name', 'name') || 'Employee';
      const docType = pick(item, 'document_type', 'type') || 'document';
      const days = pick(item, 'days_remaining');
      const key = pick(item, 'id', 'employee_id') ?? idx;
      list.push({
        id: `emp-doc-${key}-${docType}`,
        type: 'document',
        message: expiryMessage(subject, docType, days),
        severity: severityFor(days),
        link: '/employees'
      });
    });

    // 2. Bike document expiries -> /motorbikes
    (alertData.bike_document_expiry || []).forEach((item, idx) => {
      const plate = pick(item, 'plate_number');
      const subject = plate ? `Plate ${plate}` : pick(item, 'bike_id', 'name') || 'Motorbike';
      const docType = pick(item, 'document_type', 'type') || 'document';
      const days = pick(item, 'days_remaining');
      const key = pick(item, 'id', 'bike_id') ?? idx;
      list.push({
        id: `bike-doc-${key}-${docType}`,
        type: 'document',
        message: expiryMessage(subject, docType, days),
        severity: severityFor(days),
        link: '/motorbikes'
      });
    });

    // 3. Upcoming maintenance -> /maintenance
    (alertData.upcoming_maintenance || []).forEach((item, idx) => {
      const plate = pick(item, 'plate_number');
      const subject = plate ? `Plate ${plate}` : pick(item, 'bike_id', 'name') || 'Motorbike';
      const type = pick(item, 'maintenance_type', 'type') || 'service';
      const days = pick(item, 'days_remaining');
      const key = pick(item, 'id', 'motorbike_id', 'bike_id') ?? idx;
      list.push({
        id: `mnt-${key}`,
        type: 'maintenance',
        message:
          days !== undefined && days !== null
            ? `${subject} maintenance due (${String(type).replace(/_/g, ' ')}) in ${days} days`
            : `${subject} requires maintenance: ${String(type).replace(/_/g, ' ')}`,
        severity: 'amber',
        link: '/maintenance'
      });
    });

    return list;
  }, [alertData, pick]);

  // Unread = current alerts the user hasn't opened yet.
  const unreadCount = useMemo(
    () => alertsList.filter((a) => !readAlertIds.has(a.id)).length,
    [alertsList, readAlertIds]
  );

  const markAllAlertsRead = useCallback(() => {
    setReadAlertIds((prev) => {
      const next = new Set(prev);
      alertsList.forEach((a) => next.add(a.id));
      persistReadIds(next);
      return next;
    });
  }, [alertsList, persistReadIds]);

  const breadcrumbs = useMemo(() => {
    const ROUTE_LABELS = {
      dashboard: 'Dashboard',
      employees: 'Employees',
      motorbikes: 'Motorbikes',
      assignments: 'Assignments',
      payroll: 'Payroll',
      loans: 'Loans',
      fines: 'Fines & Salik',
      expenses: 'Expenses',
      'platform-income': 'Platform Income',
      'profit-loss': 'Profit & Loss',
      maintenance: 'Maintenance',
      reports: 'Reports',
      settings: 'Settings',
      users: 'User Management',
      permissions: 'Permissions',
      'audit-logs': 'Audit Logs',
    };

    const resolveLabel = (segment) => {
      if (ROUTE_LABELS[segment]) return ROUTE_LABELS[segment];

      return segment
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
    };

    const segments = location.pathname.split('/').filter(Boolean);

    if (segments.length === 0 || (segments.length === 1 && segments[0] === 'dashboard')) {
      return [{ to: '/dashboard', label: 'Dashboard', isLast: true }];
    }

    const crumbs = [{ to: '/dashboard', label: 'Dashboard', isLast: false }];

    segments.forEach((segment, index) => {
      crumbs.push({
        to: `/${segments.slice(0, index + 1).join('/')}`,
        label: resolveLabel(segment),
        isLast: index === segments.length - 1,
      });
    });

    return crumbs;
  }, [location.pathname]);

  return (
    <header className="sticky top-0 right-0 z-30 flex items-center justify-between px-2 sm:px-4 md:px-6 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 h-12 sm:h-16 shadow-sm">
      {/* Left side: Mobile Menu Button + Breadcrumb Trail */}
      <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 flex-1">
        {/* Hamburger — mobile only */}
        <button
          onClick={toggleMobileOpen}
          className="md:hidden p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex-shrink-0"
          aria-label="Open navigation menu"
        >
          <Menu size={20} />
        </button>

      {/* Breadcrumb trail */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs sm:text-sm overflow-x-auto custom-scrollbar min-w-0">
        {breadcrumbs.map((crumb, idx) => (
          <React.Fragment key={crumb.to}>
            {idx > 0 && (
              <span className="text-slate-300 dark:text-slate-600 flex-shrink-0 hidden sm:inline" aria-hidden="true">
                /
              </span>
            )}
            {crumb.isLast ? (
              <span className="text-slate-900 dark:text-slate-100 font-semibold truncate max-w-[140px] sm:max-w-none">
                {crumb.label}
              </span>
            ) : (
              <Link
                to={crumb.to}
                className="text-slate-500 dark:text-slate-400 font-medium hover:text-slate-800 dark:hover:text-slate-200 transition-colors truncate whitespace-nowrap hidden sm:inline"
              >
                {crumb.label}
              </Link>
            )}
          </React.Fragment>
        ))}
      </nav>
      </div>

      {/* Right side controls */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 sm:p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors flex-shrink-0"
          title="Toggle Light/Dark mode"
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Notification Bell */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 sm:p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors relative"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-slate-800 animate-pulse">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown Panel */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden py-1 animate-fade-in max-h-96">
              <div className="flex justify-between items-center px-4 py-2 border-b border-slate-150 dark:border-slate-700">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                  Document & Operations Alerts
                </span>
                {unreadCount > 0 ? (
                  <button
                    onClick={markAllAlertsRead}
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand-light/10 text-brand-light dark:bg-brand-dark/20 dark:text-brand-dark hover:bg-brand-light/20 dark:hover:bg-brand-dark/30 transition-colors"
                  >
                    Mark all read ({unreadCount})
                  </button>
                ) : (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300">
                    {alertsList.length} Active
                  </span>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700 custom-scrollbar">
                {alertsList.length > 0 ? (
                  alertsList.map((alert) => {
                    const isRead = readAlertIds.has(alert.id);
                    return (
                    <div
                      key={alert.id}
                      onClick={() => {
                        markAlertRead(alert.id);
                        setShowNotifications(false);
                        navigate(alert.link);
                      }}
                      className={`p-3 hover:bg-slate-50 dark:hover:bg-slate-900/40 cursor-pointer flex gap-2.5 items-start text-xs text-left ${isRead ? 'opacity-60' : ''}`}
                    >
                      {alert.type === 'document' ? (
                        <AlertTriangle className={`flex-shrink-0 mt-0.5 ${alert.severity === 'red' ? 'text-rose-500' : 'text-amber-500'}`} size={14} />
                      ) : (
                        <Wrench className="flex-shrink-0 text-blue-500 mt-0.5" size={14} />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={`text-slate-700 dark:text-slate-300 ${isRead ? 'font-normal' : 'font-medium'}`}>
                          {alert.message}
                        </p>
                      </div>
                      {!isRead && (
                        <span className="flex-shrink-0 mt-1 h-2 w-2 rounded-full bg-brand-light dark:bg-brand-dark" aria-label="Unread" />
                      )}
                    </div>
                    );
                  })
                ) : (
                  <div className="py-6 text-center text-slate-400 dark:text-slate-500 flex flex-col items-center gap-1.5">
                    <BookOpen size={18} />
                    <span className="text-xs font-medium">No active alerts</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile Menu Dropdown */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-1 sm:gap-1.5 p-1.5 sm:p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <img 
              src={user?.avatar} 
              alt={user?.name} 
              className="w-6 h-6 sm:w-7 sm:h-7 rounded-full object-cover border border-slate-250 dark:border-slate-750" 
            />
            <ChevronDown size={14} className="text-slate-500 dark:text-slate-400 hidden sm:block" />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden py-1 animate-fade-in">
              <div className="px-4 py-2 border-b border-slate-150 dark:border-slate-700">
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{user?.name}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
              </div>
              
              <Link 
                to="/settings" 
                onClick={() => setShowProfileMenu(false)}
                className="flex items-center gap-2 px-4 py-2.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900/40"
              >
                <Settings size={14} />
                <span>Settings</span>
              </Link>
              
              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  logout();
                }}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-slate-50 dark:hover:bg-slate-900/40 border-t border-slate-100 dark:border-slate-700"
              >
                <LogOut size={14} />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>

    </header>
  );
};
