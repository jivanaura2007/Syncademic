import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AppState } from './types';
import { getStoredState, subscribeToState, syncWithServer, performLogout } from './services/storage';
import { getAuthToken } from './services/api';
import { ToastProvider, useToast } from './components/common/Toast';
import { AppLayout } from './components/layout/AppLayout';
import { LandingPage } from './pages/Landing/LandingPage';
import { LoginPage } from './pages/Auth/LoginPage';
import { RegisterPage } from './pages/Auth/RegisterPage';
import { DashboardPage } from './pages/Dashboard/DashboardPage';
import { AttendancePage } from './pages/Attendance/AttendancePage';
import { BunkPlannerPage } from './pages/BunkPlanner/BunkPlannerPage';
import { TimetablePage } from './pages/Timetable/TimetablePage';
import { NotesPage } from './pages/Notes/NotesPage';
import { SemesterPlannerPage } from './pages/Planner/SemesterPlannerPage';
import { AIAssistantPage } from './pages/AIAssistant/AIAssistantPage';
import { SettingsPage } from './pages/Settings/SettingsPage';
import { QuickMarkModal } from './components/common/QuickMarkModal';
import { GraduationCap } from 'lucide-react';

function AppContent() {
  const { showToast } = useToast();
  const [state, setState] = useState<AppState>(getStoredState());
  const [authStatus, setAuthStatus] = useState<'checking' | 'authenticated' | 'unauthenticated'>('checking');
  const [currentRoute, setCurrentRoute] = useState<string>('login');
  const [isQuickMarkOpen, setIsQuickMarkOpen] = useState(false);
  const [bunkPlannerInitialSubjectId, setBunkPlannerInitialSubjectId] = useState<string | undefined>(undefined);

  // Synchronize with state subscriptions & auth token verification
  useEffect(() => {
    const token = getAuthToken();

    if (!token) {
      performLogout();
      setAuthStatus('unauthenticated');
      setState(getStoredState());
      setCurrentRoute(prev => (prev === 'register' || prev === 'landing' ? prev : 'login'));
    } else {
      setAuthStatus('checking');
      syncWithServer()
        .then((syncedState) => {
          if (syncedState && syncedState.isAuthenticated) {
            setAuthStatus('authenticated');
            setState(syncedState);
            setCurrentRoute(prev => (['login', 'register', 'landing'].includes(prev) ? 'dashboard' : prev));
          } else {
            performLogout();
            setAuthStatus('unauthenticated');
            setState(getStoredState());
            setCurrentRoute('login');
          }
        })
        .catch(() => {
          performLogout();
          setAuthStatus('unauthenticated');
          setState(getStoredState());
          setCurrentRoute('login');
        });
    }

    const unsubscribe = subscribeToState((newState) => {
      setState(newState);
      if (!newState.isAuthenticated) {
        setAuthStatus('unauthenticated');
      } else {
        setAuthStatus('authenticated');
      }
    });

    return () => unsubscribe();
  }, []);

  // Handle clean logout across all stores and state
  const handleLogout = useCallback(() => {
    performLogout();
    setAuthStatus('unauthenticated');
    setState(getStoredState());
    setCurrentRoute('login');
    showToast('Signed out of Syncademic workspace.', 'info');
  }, [showToast]);

  const handleNavigate = (route: string) => {
    // Protected route gate
    if (authStatus !== 'authenticated' && !['landing', 'login', 'register'].includes(route)) {
      setCurrentRoute('login');
      return;
    }
    setCurrentRoute(route);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigateToBunkPlanner = (subjectId?: string) => {
    setBunkPlannerInitialSubjectId(subjectId);
    setCurrentRoute('bunk-planner');
  };

  // 1. Initial Authentication Check Loader
  if (authStatus === 'checking') {
    return (
      <div 
        className="min-h-screen flex flex-col items-center justify-center p-4 select-none"
        style={{ backgroundColor: 'var(--bg-main, #4D0834)' }}
      >
        <div className="text-center space-y-3 animate-in fade-in">
          <div className="w-12 h-12 rounded-xl bg-[#7A1354] border border-[#AF1F72] text-white flex items-center justify-center font-bold text-xl shadow-md mx-auto">
            <span className="text-[#E82A89] font-black text-2xl">S</span>
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Syncademic</h2>
            <p className="text-xs text-[#F472B6] mt-0.5">Verifying academic credentials...</p>
          </div>
          <div className="w-6 h-6 border-2 border-[#E82A89] border-t-transparent rounded-full animate-spin mx-auto mt-4" />
        </div>
      </div>
    );
  }

  // 2. Unauthenticated State Routing
  if (authStatus === 'unauthenticated' || !state.isAuthenticated) {
    if (currentRoute === 'landing') {
      return (
        <LandingPage
          onNavigateToLogin={() => setCurrentRoute('login')}
          onNavigateToRegister={() => setCurrentRoute('register')}
          onEnterApp={() => setCurrentRoute('login')}
        />
      );
    }

    if (currentRoute === 'register') {
      return (
        <RegisterPage
          onSuccess={() => {
            setAuthStatus('authenticated');
            setCurrentRoute('dashboard');
          }}
          onNavigateToLogin={() => setCurrentRoute('login')}
          onBackToLanding={() => setCurrentRoute('landing')}
        />
      );
    }

    // Default to Login
    return (
      <LoginPage
        onSuccess={() => {
          setAuthStatus('authenticated');
          setCurrentRoute('dashboard');
        }}
        onNavigateToRegister={() => setCurrentRoute('register')}
        onBackToLanding={() => setCurrentRoute('landing')}
      />
    );
  }

  // 3. Authenticated State: Render Protected Application Pages inside AppLayout
  return (
    <>
      <AppLayout
        state={state}
        currentRoute={currentRoute}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        onOpenQuickMarkModal={() => setIsQuickMarkOpen(true)}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentRoute}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="w-full"
          >
            {currentRoute === 'dashboard' && (
              <DashboardPage
                state={state}
                onNavigate={handleNavigate}
                onOpenQuickMarkModal={() => setIsQuickMarkOpen(true)}
              />
            )}

            {currentRoute === 'attendance' && (
              <AttendancePage
                state={state}
                onNavigateToBunkPlanner={handleNavigateToBunkPlanner}
              />
            )}

            {currentRoute === 'bunk-planner' && (
              <BunkPlannerPage
                state={state}
                initialSubjectId={bunkPlannerInitialSubjectId}
                onNavigateToAI={() => setCurrentRoute('ai-assistant')}
              />
            )}

            {currentRoute === 'timetable' && (
              <TimetablePage
                state={state}
              />
            )}

            {currentRoute === 'notes' && (
              <NotesPage
                state={state}
                onNavigateToAI={() => setCurrentRoute('ai-assistant')}
              />
            )}

            {currentRoute === 'planner' && (
              <SemesterPlannerPage
                state={state}
              />
            )}

            {currentRoute === 'ai-assistant' && (
              <AIAssistantPage
                state={state}
              />
            )}

            {currentRoute === 'settings' && (
              <SettingsPage
                state={state}
                onLogout={handleLogout}
                initialTab="profile"
              />
            )}

            {currentRoute === 'admin' && (
              <SettingsPage
                state={state}
                onLogout={handleLogout}
                initialTab="admin"
              />
            )}
          </motion.div>
        </AnimatePresence>
      </AppLayout>

      {/* Global Quick Attendance Modal */}
      <QuickMarkModal
        isOpen={isQuickMarkOpen}
        onClose={() => setIsQuickMarkOpen(false)}
        state={state}
      />
    </>
  );
}

export function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}

export default App;
