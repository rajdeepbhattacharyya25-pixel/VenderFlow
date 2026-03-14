import React, { useEffect } from 'react';
import { IconCheck } from './Icons';

export interface ToastProps {
  id: number;
  message: string;
  onClose: (id: number) => void;
}

export const Toast: React.FC<ToastProps> = ({ id, message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, 3000);
    return () => clearTimeout(timer);
  }, [id, onClose]);

  return (
    <div className="flex items-center gap-3 bg-gray-900/95 dark:bg-white/95 backdrop-blur-sm text-white dark:text-gray-900 px-5 py-3.5 rounded-2xl shadow-xl shadow-gray-200/20 dark:shadow-none animate-in slide-in-from-bottom-5 fade-in duration-300 min-w-[260px] max-w-sm border border-gray-800 dark:border-gray-200 z-50">
      <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center shrink-0 shadow-sm">
        <IconCheck className="w-3.5 h-3.5 text-white" />
      </div>
      <p className="text-sm font-semibold tracking-wide">{message}</p>
    </div>
  );
};

export const ToastContainer: React.FC<{ toasts: Array<{id: number, message: string}>, removeToast: (id: number) => void }> = ({ toasts, removeToast }) => {
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
       {toasts.map(t => (
         <div key={t.id} className="pointer-events-auto">
            <Toast id={t.id} message={t.message} onClose={removeToast} />
         </div>
       ))}
    </div>
  );
};
