import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { OwnerOnly } from '../OwnerOnly';
import {
  LayoutDashboard,
  Users,
  Bike,
  ClipboardList,
  Coins,
  FileSpreadsheet,
  AlertOctagon,
  Wrench,
  FilePieChart,
  Settings,
  Activity,
  LogOut,
  TrendingUp,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  KeyRound,
  X
} from 'lucide-react';

export const Sidebar = ({ collapsed, toggleCollapsed, mobileOpen, setMobileOpen }) => {
  const { user, logout } = useAuth();
  const { isOwner } = usePermissions();

  const navItemClass = ({ isActive }) => {
    const base = "flex items-center gap-3 px-3 py-2.5 text-xs font-semibold rounded-lg transition-all group relative ";
    if (isActive) {
      return base + "bg-brand-light/10 text-brand-light dark:bg-brand-dark/10 dark:text-brand-dark border-l-4 border-brand-light dark:border-brand-dark rounded-l-none pl-2";
    }
    return base + "text-slate-500 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-900";
  };

  const handleNavClick = () => {
    // Close mobile sidebar when a link is clicked
    if (setMobileOpen) setMobileOpen(false);
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex fixed top-0 bottom-0 left-0 z-40 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex-col justify-between transition-all duration-300 ${
          collapsed ? 'w-[70px]' : 'w-[240px]'
        }`}
      >
        {/* Sidebar Header / Brand Logo */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-slate-200 dark:border-slate-700 h-16">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-brand-light dark:bg-brand-dark text-white font-bold flex-shrink-0 font-heading text-lg">
              M
            </div>
            {!collapsed && (
              <span className="font-bold tracking-tight text-sm font-heading text-slate-800 dark:text-slate-100 uppercase">
                Muzn ERP
              </span>
            )}
          </div>
          
          <button
            onClick={toggleCollapsed}
            className="p-1 rounded bg-slate-50 dark:bg-slate-900 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-700"
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {/* Navigation items list */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-4 custom-scrollbar">
          <SidebarNav collapsed={collapsed} navItemClass={navItemClass} isOwner={isOwner} onNavClick={handleNavClick} />
        </div>

        {/* User profile section at bottom */}
        <SidebarUserFooter user={user} collapsed={collapsed} logout={logout} />
      </aside>

      {/* Mobile Sidebar Drawer */}
      <aside
        className={`md:hidden fixed top-0 bottom-0 left-0 z-50 w-[280px] bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col justify-between transition-transform duration-300 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Mobile Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-slate-200 dark:border-slate-700 h-16">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-brand-light dark:bg-brand-dark text-white font-bold flex-shrink-0 font-heading text-lg">
              M
            </div>
            <span className="font-bold tracking-tight text-sm font-heading text-slate-800 dark:text-slate-100 uppercase">
              Muzn ERP
            </span>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Mobile Navigation */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-4 custom-scrollbar">
          <SidebarNav collapsed={false} navItemClass={navItemClass} isOwner={isOwner} onNavClick={handleNavClick} />
        </div>

        {/* Mobile User Footer */}
        <SidebarUserFooter user={user} collapsed={false} logout={logout} />
      </aside>
    </>
  );
};

// Extracted nav items so they can be reused for both desktop+mobile
const SidebarNav = ({ collapsed, navItemClass, isOwner, onNavClick }) => (
  <>
    <div className="space-y-1">
      <NavLink to="/dashboard" className={navItemClass} onClick={onNavClick}>
        <LayoutDashboard size={16} />
        {!collapsed && <span>Dashboard</span>}
      </NavLink>
    </div>

    <div className="space-y-1">
      {!collapsed && (
        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase px-3 tracking-wider mb-2">
          Fleet & Workforce
        </p>
      )}
      <NavLink to="/employees" className={navItemClass} onClick={onNavClick}>
        <Users size={16} />
        {!collapsed && <span>Employees / Riders</span>}
      </NavLink>
      <NavLink to="/motorbikes" className={navItemClass} onClick={onNavClick}>
        <Bike size={16} />
        {!collapsed && <span>Motorbikes</span>}
      </NavLink>
      <NavLink to="/assignments" className={navItemClass} onClick={onNavClick}>
        <ClipboardList size={16} />
        {!collapsed && <span>Assignments</span>}
      </NavLink>
    </div>

    <div className="space-y-1">
      {!collapsed && (
        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase px-3 tracking-wider mb-2">
          Payroll & Finances
        </p>
      )}
      <NavLink to="/payroll" className={navItemClass} onClick={onNavClick}>
        <Coins size={16} />
        {!collapsed && <span>Payroll</span>}
      </NavLink>
      <NavLink to="/loans" className={navItemClass} onClick={onNavClick}>
        <CreditCard size={16} />
        {!collapsed && <span>Loans</span>}
      </NavLink>
      <NavLink to="/fines" className={navItemClass} onClick={onNavClick}>
        <AlertOctagon size={16} />
        {!collapsed && <span>Fines & Salik</span>}
      </NavLink>
    </div>

    <div className="space-y-1">
      {!collapsed && (
        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase px-3 tracking-wider mb-2">
          Ledger
        </p>
      )}
      <NavLink to="/expenses" className={navItemClass} onClick={onNavClick}>
        <FileSpreadsheet size={16} />
        {!collapsed && <span>Expenses</span>}
      </NavLink>
      
      <OwnerOnly>
        <NavLink to="/platform-income" className={navItemClass} onClick={onNavClick}>
          <TrendingUp size={16} />
          {!collapsed && <span>Platform Income</span>}
        </NavLink>
        <NavLink to="/profit-loss" className={navItemClass} onClick={onNavClick}>
          <FilePieChart size={16} />
          {!collapsed && <span>Profit & Loss</span>}
        </NavLink>
      </OwnerOnly>
    </div>

    <div className="space-y-1">
      {!collapsed && (
        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase px-3 tracking-wider mb-2">
          Records & Management
        </p>
      )}
      <NavLink to="/maintenance" className={navItemClass} onClick={onNavClick}>
        <Wrench size={16} />
        {!collapsed && <span>Maintenance</span>}
      </NavLink>
      <NavLink to="/reports" className={navItemClass} onClick={onNavClick}>
        <FileSpreadsheet size={16} />
        {!collapsed && <span>Reports</span>}
      </NavLink>
    </div>

    <div className="space-y-1">
      {!collapsed && (
        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase px-3 tracking-wider mb-2">
          System Admin
        </p>
      )}
      <NavLink to="/settings" className={navItemClass} onClick={onNavClick}>
        <Settings size={16} />
        {!collapsed && <span>Settings</span>}
      </NavLink>
      <OwnerOnly>
        <NavLink to="/users" className={navItemClass} onClick={onNavClick}>
          <ShieldCheck size={16} />
          {!collapsed && <span>User Management</span>}
        </NavLink>
        <NavLink to="/permissions" className={navItemClass} onClick={onNavClick}>
          <KeyRound size={16} />
          {!collapsed && <span>Permissions</span>}
        </NavLink>
        <NavLink to="/audit-logs" className={navItemClass} onClick={onNavClick}>
          <Activity size={16} />
          {!collapsed && <span>Audit Logs</span>}
        </NavLink>
      </OwnerOnly>
    </div>
  </>
);

const SidebarUserFooter = ({ user, collapsed, logout }) => (
  <div className="border-t border-slate-200 dark:border-slate-700 p-3 bg-slate-50 dark:bg-slate-900/40">
    <div className="flex items-center gap-3 justify-center md:justify-start">
      <img 
        src={user?.avatar} 
        alt={user?.name} 
        className="w-9 h-9 rounded-full border border-slate-250 dark:border-slate-700 object-cover flex-shrink-0"
      />
      {!collapsed && (
        <div className="flex-1 min-w-0 text-left">
          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
            {user?.name}
          </p>
          <span className="inline-block text-[10px] font-semibold bg-brand-light/10 text-brand-light dark:bg-brand-dark/10 dark:text-brand-dark px-1.5 py-0.5 rounded mt-0.5 capitalize">
            {user?.role}
          </span>
        </div>
      )}
      
      {!collapsed && (
        <button
          onClick={logout}
          className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-rose-500 dark:text-slate-500 dark:hover:text-rose-400 transition-colors"
          title="Logout"
        >
          <LogOut size={16} />
        </button>
      )}
    </div>
    
    {collapsed && (
      <button
        onClick={logout}
        className="w-full flex justify-center p-2 mt-2 text-slate-400 hover:text-rose-500 dark:text-slate-500 dark:hover:text-rose-400 rounded transition-colors"
        title="Logout"
      >
        <LogOut size={16} />
      </button>
    )}
  </div>
);
