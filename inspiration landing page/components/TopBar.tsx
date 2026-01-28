import React from 'react';
import { IconChevronDown } from './Icons';

export const TopBar: React.FC = () => {
  return (
    <div className="bg-secondary dark:bg-background-dark text-gray-600 dark:text-gray-400 text-xs py-2 px-4 md:px-8 flex justify-between items-center border-b border-border-light dark:border-border-dark transition-colors">
      <div className="flex items-center gap-2">
        <span>Free Shipping on Orders Over ₹2,500</span>
      </div>
      <div className="flex items-center gap-6">
        <a href="mailto:support@fashionstore.com" className="hover:text-primary dark:hover:text-white transition-colors">Help Center</a>
      </div>
    </div>
  );
};