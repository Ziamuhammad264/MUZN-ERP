import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export const Layout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleCollapsed = () => {
    setCollapsed(!collapsed);
  };

  const toggleMobileOpen = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-900 transition-colors duration-250">
      {/* Mobile Sidebar Backdrop Overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Collapsible/Drawer Sidebar */}
      <Sidebar 
        collapsed={collapsed} 
        toggleCollapsed={toggleCollapsed} 
        mobileOpen={mobileOpen} 
        setMobileOpen={setMobileOpen} 
      />

      {/* Main Right panel — no left-padding on mobile (sidebar is a drawer overlay) */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          collapsed ? 'md:pl-[70px]' : 'md:pl-[240px]'
        }`}
      >
        {/* Top Header */}
        <Header toggleMobileOpen={toggleMobileOpen} />

        {/* Viewport Content — react-router nested route renders here */}
        <main className="flex-1 p-2.5 sm:p-3 md:p-4 lg:p-6 overflow-x-hidden overflow-y-auto w-full max-w-[1600px] mx-auto animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
