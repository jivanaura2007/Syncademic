import React from 'react';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { AppState } from '../../types';

interface AppLayoutProps {
  state: AppState;
  currentRoute: string;
  onNavigate: (route: string) => void;
  onLogout: () => void;
  onOpenQuickMarkModal?: () => void;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  state,
  currentRoute,
  onNavigate,
  onLogout,
  onOpenQuickMarkModal,
  children
}) => {
  return (
    <div 
      className="min-h-screen flex flex-col selection:bg-[#007FFF]/20 selection:text-[#1E2022] relative overflow-x-hidden"
      style={{ backgroundColor: 'var(--bg-main, #FCFBF8)' }}
    >
      {/* Attractive Background Grid & Ambient Layers */}
      <div 
        className="fixed inset-0 pointer-events-none z-0 bg-grid-pattern opacity-80" 
        aria-hidden="true" 
      />
      <div 
        className="fixed inset-0 pointer-events-none z-0 bg-ambient-radial" 
        aria-hidden="true" 
      />

      <div className="relative z-10 flex flex-col min-h-screen">
        <Navbar
          state={state}
          currentRoute={currentRoute}
          onNavigate={onNavigate}
          onLogout={onLogout}
          onOpenQuickMarkModal={onOpenQuickMarkModal}
        />

        <div className="flex-1 max-w-7xl w-full mx-auto flex">
          {/* Desktop Sidebar */}
          <div className="hidden lg:block shrink-0">
            <Sidebar
              currentRoute={currentRoute}
              onNavigate={onNavigate}
              subjects={state.subjects}
            />
          </div>

          {/* Main Content Area */}
          <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};
