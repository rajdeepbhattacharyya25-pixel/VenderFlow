import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Content */}
      <div className="relative bg-panel w-full max-w-2xl rounded-2xl shadow-2xl transform transition-all animate-[popIn_0.2s_ease-out_forwards] border border-muted/10">
        <div className="flex items-center justify-between p-6 border-b border-muted/10">
          <h3 className="text-lg font-bold text-text">{title}</h3>
          <button onClick={onClose} className="text-muted hover:text-text p-1 rounded-lg hover:bg-bg transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[80vh]">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
