import React, { useState } from 'react';
import { Search, Bell, Sun, Moon, Menu } from 'lucide-react';
import { Theme } from '../types';

interface HeaderProps {
  theme: Theme;
  toggleTheme: () => void;
  isMobile: boolean;
  onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ theme, toggleTheme, isMobile, onMenuClick }) => {
  const [searchFocused, setSearchFocused] = useState(false);

  return (
    <header className="h-[80px] flex items-center justify-between px-6 lg:px-8 bg-transparent">
      <div className="flex items-center gap-4">
          {isMobile && (
              <button onClick={onMenuClick} className="p-2 -ml-2 text-text">
                  <Menu size={24} />
              </button>
          )}
        <h1 className="text-xl font-medium text-text">Dashboard</h1>
      </div>

      <div className="flex items-center gap-4 lg:gap-6">
        {/* Theme Toggle */}
        <button 
            onClick={toggleTheme}
            className="relative w-12 h-6 rounded-full bg-gray-200 dark:bg-gray-700 transition-colors flex items-center p-1"
            aria-label="Toggle Theme"
        >
            <div 
                className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform duration-300 flex items-center justify-center
                    ${theme === 'dark' ? 'translate-x-6' : 'translate-x-0'}
                `}
            >
                {theme === 'light' ? <Sun size={10} className="text-orange-400" /> : <Moon size={10} className="text-emerald-400" />}
            </div>
        </button>

        {/* Search */}
        <div 
            className={`
                hidden sm:flex items-center bg-panel border border-muted/10 rounded-xl px-4 py-2.5 transition-all duration-200
                ${searchFocused ? 'w-[320px] ring-2 ring-muted/20' : 'w-[240px]'}
            `}
        >
            <Search size={18} className="text-muted mr-3" />
            <input 
                type="text" 
                placeholder="Search here..." 
                className="bg-transparent border-none outline-none text-sm text-text placeholder-muted w-full"
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
            />
        </div>

        {/* Notifications */}
        <button className="relative p-2 rounded-full hover:bg-panel transition-colors text-text group">
            <Bell size={20} />
            <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-bg animate-pulse"></span>
        </button>

        {/* Avatar */}
        <button className="w-10 h-10 rounded-xl overflow-hidden border-2 border-panel shadow-sm hover:scale-105 transition-transform">
            <img src="https://picsum.photos/seed/user/200/200" alt="User Profile" className="w-full h-full object-cover" />
        </button>
      </div>
    </header>
  );
};

export default Header;
