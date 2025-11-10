'use client';

import { Toaster } from 'sonner';

export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      theme="dark"
      toastOptions={{
        style: {
          background: '#1e293b',
          border: '1px solid #334155',
          color: '#f1f5f9',
        },
        className: 'sonner-toast',
      }}
    />
  );
}
