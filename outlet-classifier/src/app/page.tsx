'use client';

import React, { useState } from 'react';
import Chat from '@/components/chat';
import Dashboard from '@/components/dashboard';
import StorePortfolio from '@/components/portfolio';
import OutletClassifier from '@/components/classifier';
import { LayoutDashboard, Store, Bot, Settings, LogOut, ChevronRight, Tags } from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'portfolio' | 'assistant' | 'classifier'>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'portfolio', label: 'Store Portfolio', icon: Store },
    { id: 'assistant', label: 'AI Assistant', icon: Bot },
    { id: 'classifier', label: 'Outlet Classifier', icon: Tags },
  ];

  return (
    <div className="flex h-screen w-full bg-white overflow-hidden text-gray-900 font-sans">

      {/* Global Navigation Sidebar */}
      <div className={`${isSidebarCollapsed ? 'w-20' : 'w-64'} bg-white border-r border-gray-100 flex flex-col h-full shadow-[2px_0_8px_rgba(0,0,0,0.02)] transition-all duration-300 relative`}>

        {/* Toggle Button */}
        <button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="absolute -right-3 top-20 bg-white border border-gray-100 rounded-full p-1.5 shadow-md hover:bg-red-50 text-gray-500 hover:text-red-600 z-50 transition-all font-bold"
        >
          <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${isSidebarCollapsed ? '' : 'rotate-180'}`} />
        </button>

        <div className={`p-6 border-b border-gray-50 flex items-center transition-all ${isSidebarCollapsed ? 'justify-center px-0' : 'gap-3'}`}>
          <img src="/logo.png" alt="Logo" className="w-10 h-10 object-contain shadow-sm rounded-lg p-1 bg-red-50 shrink-0" />
          {!isSidebarCollapsed && (
            <div className="flex flex-col whitespace-nowrap">
              <span className="font-extrabold text-gray-900 text-base leading-tight">Outlet</span>
              <span className="text-red-600 text-xs font-bold tracking-widest uppercase">Classifier</span>
            </div>
          )}
        </div>

        <nav className="flex-1 p-3 space-y-2 mt-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                title={isSidebarCollapsed ? item.label : ''}
                className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all duration-200 group ${isActive
                  ? 'bg-red-50 text-red-700 shadow-sm border border-red-100/50 font-bold'
                  : 'hover:bg-gray-50 text-gray-500 hover:text-gray-900'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 transition-colors ${isActive ? 'text-red-600' : 'text-gray-400 group-hover:text-red-500'} shrink-0`} />
                  {!isSidebarCollapsed && <span className="text-sm font-semibold">{item.label}</span>}
                </div>
                {!isSidebarCollapsed && isActive && <ChevronRight className="w-4 h-4" />}
              </button>
            );
          })}
        </nav>

        <div className={`p-4 border-t border-gray-50 space-y-2 transition-all ${isSidebarCollapsed ? 'items-center flex flex-col' : ''}`}>
          <button className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-500 font-medium hover:bg-gray-50 rounded-xl transition-all ${isSidebarCollapsed ? 'justify-center' : ''}`}>
            <Settings className="w-4 h-4 shrink-0" />
            {!isSidebarCollapsed && <span>Settings</span>}
          </button>
          <button className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-red-500 font-medium hover:bg-red-50 rounded-xl transition-all ${isSidebarCollapsed ? 'justify-center' : ''}`}>
            <LogOut className="w-4 h-4 shrink-0" />
            {!isSidebarCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </div>

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {activeTab === 'dashboard' && <Dashboard onNavigate={setActiveTab} />}
        {activeTab === 'portfolio' && <StorePortfolio />}
        {activeTab === 'assistant' && <Chat />}
        {activeTab === 'classifier' && <OutletClassifier />}
      </div>
    </div>
  );
}
