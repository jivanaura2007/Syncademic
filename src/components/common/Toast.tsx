import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'warning' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
    setToasts(prev => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map(toast => {
          const typeIcons = {
            success: <CheckCircle2 className="w-4 h-4 text-[#1E7E34] shrink-0" />,
            warning: <AlertTriangle className="w-4 h-4 text-[#B7791F] shrink-0" />,
            error: <AlertCircle className="w-4 h-4 text-[#D9381E] shrink-0" />,
            info: <Info className="w-4 h-4 text-[#0066CC] shrink-0" />
          };

          const typeStyles = {
            success: 'border-[#C3E6CB] bg-[#F7FDF9]',
            warning: 'border-[#FCEEC0] bg-[#FFFDF5]',
            error: 'border-[#FADBD8] bg-[#FFF8F7]',
            info: 'border-[#CCE5FF] bg-[#F4F9FF]'
          };

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-lg border shadow-lg text-sm text-[#1E2022] ${typeStyles[toast.type]} animate-in slide-in-from-bottom-3 duration-200`}
            >
              <div className="flex items-center gap-2.5">
                {typeIcons[toast.type]}
                <span className="font-medium text-xs sm:text-sm">{toast.message}</span>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-[#848A94] hover:text-[#1E2022] p-0.5 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
