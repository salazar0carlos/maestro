'use client';

import { useEffect, useState } from 'react';
import { NotificationType } from '@/lib/types';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

export interface ToastProps {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  duration?: number;
  onClose: (id: string) => void;
  link?: string;
  linkText?: string;
}

export function Toast({ id, type, title, message, duration = 5000, onClose, link, linkText }: ToastProps) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose(id);
    }, 300); // Match animation duration
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="text-green-400" size={20} />;
      case 'error':
        return <XCircle className="text-red-400" size={20} />;
      case 'warning':
        return <AlertCircle className="text-orange-400" size={20} />;
      case 'info':
        return <Info className="text-blue-400" size={20} />;
    }
  };

  const getColors = () => {
    switch (type) {
      case 'success':
        return 'bg-green-950 border-green-800 text-green-100';
      case 'error':
        return 'bg-red-950 border-red-800 text-red-100';
      case 'warning':
        return 'bg-orange-950 border-orange-800 text-orange-100';
      case 'info':
        return 'bg-blue-950 border-blue-800 text-blue-100';
    }
  };

  return (
    <div
      className={`
        ${getColors()}
        border rounded-lg shadow-lg p-4 mb-3 min-w-[320px] max-w-md
        transition-all duration-300 ease-out
        ${isExiting ? 'animate-out fade-out slide-out-to-right' : 'animate-in fade-in slide-in-from-right'}
      `}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">{getIcon()}</div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm mb-1">{title}</p>
          <p className="text-sm opacity-90">{message}</p>

          {link && linkText && (
            <a
              href={link}
              className="text-sm underline mt-2 inline-block hover:opacity-80 transition"
              onClick={(e) => {
                e.preventDefault();
                window.location.href = link;
                handleClose();
              }}
            >
              {linkText}
            </a>
          )}
        </div>

        <button
          onClick={handleClose}
          className="flex-shrink-0 opacity-70 hover:opacity-100 transition"
          aria-label="Close notification"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
