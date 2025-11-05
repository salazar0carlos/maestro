'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Toast, ToastProps } from './Toast';

interface ToastContextValue {
  showToast: (toast: Omit<ToastProps, 'id' | 'onClose'>) => void;
  showSuccess: (title: string, message: string, options?: ToastOptions) => void;
  showError: (title: string, message: string, options?: ToastOptions) => void;
  showWarning: (title: string, message: string, options?: ToastOptions) => void;
  showInfo: (title: string, message: string, options?: ToastOptions) => void;
}

interface ToastOptions {
  duration?: number;
  link?: string;
  linkText?: string;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((toast: Omit<ToastProps, 'id' | 'onClose'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newToast: ToastProps = {
      ...toast,
      id,
      onClose: removeToast,
    };
    setToasts(prev => [...prev, newToast]);
  }, [removeToast]);

  const showSuccess = useCallback((title: string, message: string, options?: ToastOptions) => {
    showToast({
      type: 'success',
      title,
      message,
      ...options,
    });
  }, [showToast]);

  const showError = useCallback((title: string, message: string, options?: ToastOptions) => {
    showToast({
      type: 'error',
      title,
      message,
      duration: options?.duration ?? 7000, // Errors stay longer
      ...options,
    });
  }, [showToast]);

  const showWarning = useCallback((title: string, message: string, options?: ToastOptions) => {
    showToast({
      type: 'warning',
      title,
      message,
      ...options,
    });
  }, [showToast]);

  const showInfo = useCallback((title: string, message: string, options?: ToastOptions) => {
    showToast({
      type: 'info',
      title,
      message,
      ...options,
    });
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showError, showWarning, showInfo }}>
      {children}

      {/* Toast Container */}
      <div
        className="fixed top-4 right-4 z-50 pointer-events-none"
        aria-live="polite"
        aria-atomic="true"
      >
        <div className="flex flex-col items-end pointer-events-auto">
          {toasts.map(toast => (
            <Toast key={toast.id} {...toast} />
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}
