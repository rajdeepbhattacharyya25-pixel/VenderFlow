import React from 'react';
import { IconHome, IconGrid, IconShoppingBag, IconUser } from './Icons';

interface BottomNavProps {
  onNavigate: (view: 'home' | 'wishlist' | 'cart' | 'account' | 'viewAll') => void;
  cartCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({ onNavigate, cartCount }) => {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-surface-dark border-t border-gray-100 dark:border-gray-800 py-3 px-6 flex justify-between items-center z-40 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] transition-colors">
      <button onClick={() => onNavigate('home')} className="flex flex-col items-center gap-1 text-gray-400 dark:text-gray-500 hover:text-primary dark:hover:text-white transition-colors focus:text-primary dark:focus:text-white">
        <IconHome className="w-6 h-6" />
        <span className="text-[10px] font-medium">Home</span>
      </button>
      <button onClick={() => onNavigate('viewAll')} className="flex flex-col items-center gap-1 text-gray-400 dark:text-gray-500 hover:text-primary dark:hover:text-white transition-colors focus:text-primary dark:focus:text-white">
        <IconGrid className="w-6 h-6" />
        <span className="text-[10px] font-medium">All</span>
      </button>
      <button onClick={() => onNavigate('cart')} className="flex flex-col items-center gap-1 text-gray-400 dark:text-gray-500 hover:text-primary dark:hover:text-white transition-colors relative group focus:text-primary dark:focus:text-white">
        <div className="relative">
             <IconShoppingBag className="w-6 h-6" />
             {cartCount > 0 && (
               <span 
                 key={cartCount}
                 className="absolute -top-1.5 -right-1.5 bg-primary text-white text-[9px] w-3.5 h-3.5 flex items-center justify-center rounded-full border border-white dark:border-surface-dark animate-in zoom-in duration-300"
               >
                 {cartCount}
               </span>
             )}
        </div>
        <span className="text-[10px] font-medium">Cart</span>
      </button>
      <button onClick={() => onNavigate('account')} className="flex flex-col items-center gap-1 text-gray-400 dark:text-gray-500 hover:text-primary dark:hover:text-white transition-colors focus:text-primary dark:focus:text-white">
        <IconUser className="w-6 h-6" />
        <span className="text-[10px] font-medium">Account</span>
      </button>
    </div>
  );
};