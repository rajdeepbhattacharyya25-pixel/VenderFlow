import React, { useEffect } from 'react';
import { IconX } from './Icons';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: string;
}

export const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose, title, content }) => {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      ></div>

      {/* Modal Content */}
      <div className="bg-white dark:bg-surface-dark w-full max-w-lg rounded-2xl shadow-2xl relative z-10 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-xl md:text-2xl font-heading font-bold text-gray-900 dark:text-white">{title}</h3>
          <button 
            onClick={onClose}
            className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400"
          >
            <IconX className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar">
           <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-base md:text-lg">
             {content}
           </p>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-black/20 rounded-b-2xl flex justify-end">
           <button 
             onClick={onClose}
             className="px-6 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-black font-bold rounded-xl hover:opacity-90 transition-opacity text-sm"
           >
             Close
           </button>
        </div>
      </div>
    </div>
  );
};
