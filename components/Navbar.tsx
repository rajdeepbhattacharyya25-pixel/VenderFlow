import React, { useState } from 'react';
import { User } from '@supabase/supabase-js';
import { IconSearch, IconUser, IconShoppingBag, IconMenu, IconX, IconHeart, IconSun, IconMoon, IconChevronDown } from './Icons';
import { NotificationBell } from './NotificationBell';

interface NavbarProps {
  onNavigate: (view: 'home' | 'wishlist' | 'cart' | 'account' | 'orders' | 'viewAll' | 'storeLogin' | 'storeRegister') => void;
  onCategoryClick: (category: string) => void;
  onSearch: (query: string) => void;
  wishlistCount: number;
  cartCount: number;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  user?: { email: string } | null;
  onLogin?: () => void;
  storeName?: string;
  storeLogo?: string;
  categories?: string[];
  isAdmin?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  onNavigate,
  onCategoryClick,
  onSearch,
  wishlistCount,
  cartCount,
  isDarkMode,
  toggleDarkMode,
  user,
  onLogin,
  storeName = "VenderFlow",
  storeLogo = "/logo.jpg",
  categories = ["Women", "Men", "Kids", "Accessories"],
  isAdmin = false
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleNavClick = (view: any) => {
    onNavigate(view);
    setIsMenuOpen(false);
  };

  const handleCategorySelect = (category: string) => {
    onCategoryClick(category);
    setIsMenuOpen(false);
  };

  const handleSearchSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (searchQuery.trim()) {
      onSearch(searchQuery);
      setIsMenuOpen(false);
      // Optional: Clear search query or keep it? Keeping it is better UX usually.
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearchSubmit();
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/80 dark:bg-[#0B1120]/80 backdrop-blur-md border-b border-gray-100 dark:border-white/5 transition-all shadow-sm">
      <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Mobile Menu Button */}
          <button
            className="lg:hidden text-gray-800 dark:text-gray-200 hover:text-primary transition-colors focus:outline-none"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <IconX className="w-6 h-6" /> : <IconMenu className="w-6 h-6" />}
          </button>

          <button onClick={() => handleNavClick('home')} className="flex items-center gap-2 hover:opacity-90 transition-opacity">
            {storeLogo && <img src={storeLogo} alt={storeName} className="h-10 w-auto object-contain rounded-md" />}
            <span className="text-2xl font-bold font-display text-primary dark:text-white tracking-tighter">
              {storeName}
            </span>
          </button>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-8 text-sm font-medium text-gray-600 dark:text-gray-300">

          {/* Category Dropdown */}
          <div className="relative group">
            <button className="text-gray-900 dark:text-white hover:text-primary dark:hover:text-primary-light transition-colors flex items-center gap-1.5 py-2 group font-extrabold tracking-wide text-base">
              Categories <IconChevronDown className="w-4 h-4 transition-transform duration-300 group-hover:-rotate-180 text-gray-400 group-hover:text-primary dark:group-hover:text-primary-light" />
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary dark:bg-primary-light transition-all duration-300 group-hover:w-full"></span>
            </button>

            {/* Dropdown Menu */}
            <div className="absolute top-full left-0 pt-4 w-56 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform origin-top-left z-50">
              <div className="bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden p-2 flex flex-col gap-1">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => handleCategorySelect(cat)}
                    className="px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-primary dark:hover:text-white rounded-lg transition-colors flex items-center justify-between group/item font-medium text-gray-600 dark:text-gray-300 w-full text-left"
                  >
                    {cat}
                    <IconChevronDown className="w-3 h-3 -rotate-90 opacity-0 group-hover/item:opacity-50 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={() => handleNavClick('orders')}
            className="px-6 py-2.5 bg-gray-900 dark:bg-primary text-white rounded-full hover:bg-gray-800 dark:hover:bg-primary/90 transition-all shadow-sm hover:shadow hover:-translate-y-0.5 text-xs font-semibold tracking-wide uppercase active:scale-95"
          >
            My Orders
          </button>
        </div>

        {/* Search and Icons */}
        <div className="flex items-center gap-4 lg:gap-6 text-gray-800 dark:text-gray-200">
          {/* Desktop Search Box - Refined UI */}
          <div className="hidden xl:flex items-center w-[420px] bg-gray-50 dark:bg-surface-dark border border-gray-200 dark:border-gray-700 rounded-full h-12 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all shadow-sm hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 group relative overflow-hidden">
            <div className="pl-4 pr-2 text-gray-400 group-focus-within:text-primary transition-colors flex items-center h-full">
              <IconSearch className="w-5 h-5" />
            </div>
            <input
              type="text"
              placeholder="Search for products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-grow bg-transparent border-none focus:ring-0 text-sm px-2 text-gray-800 dark:text-gray-100 placeholder:text-gray-400 outline-none h-full"
            />
            <button
              onClick={() => handleSearchSubmit()}
              className="bg-gray-900 dark:bg-primary hover:bg-black dark:hover:bg-primary/90 text-white px-6 h-[calc(100%-6px)] mr-[3px] rounded-full text-sm font-bold transition-all shadow-sm flex items-center justify-center active:scale-95"
            >
              Search
            </button>
          </div>

          {/* Search Icon for smaller screens */}
          <button
            className="xl:hidden hover:text-primary transition-colors p-1"
            onClick={() => setIsMenuOpen(true)}
          >
            <IconSearch className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 md:gap-4 border-l border-gray-200 dark:border-gray-700 pl-3 md:pl-5">
            <button
              onClick={toggleDarkMode}
              className="hover:text-primary dark:hover:text-yellow-400 transition-transform hover:scale-110 p-1"
              aria-label="Toggle dark mode"
            >
              {isDarkMode ? <IconSun className="w-5 h-5" /> : <IconMoon className="w-5 h-5" />}
            </button>

            {user ? (
              <div className="flex items-center gap-3">
                {isAdmin && (
                  <a
                    href="/admin"
                    className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors shadow-sm"
                  >
                    Dashboard
                  </a>
                )}
                <NotificationBell />
                <button onClick={() => handleNavClick('account')} className="hover:text-primary transition-transform hover:scale-110 p-1" aria-label="Account">
                  <IconUser className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button onClick={onLogin} className="hover:text-primary transition-colors font-bold text-sm" aria-label="Login">
                Login
              </button>
            )}

            <button
              onClick={() => handleNavClick('wishlist')}
              className="hidden sm:block hover:text-primary transition-transform hover:scale-110 relative group p-1"
              aria-label="Wishlist"
            >
              <IconHeart className="w-5 h-5" />
              {wishlistCount > 0 && (
                <span
                  key={wishlistCount}
                  className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full shadow-sm ring-2 ring-white dark:ring-background-dark animate-in zoom-in duration-300"
                >
                  {wishlistCount}
                </span>
              )}
            </button>

            <button onClick={() => handleNavClick('cart')} className="relative hover:text-primary transition-transform hover:scale-110 group p-1" aria-label="Cart">
              <IconShoppingBag className="w-5 h-5" />
              {cartCount > 0 && (
                <span
                  key={cartCount}
                  className="absolute -top-1 -right-1 bg-primary text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full shadow-sm ring-2 ring-white dark:ring-background-dark animate-in zoom-in duration-300"
                >
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile/Tablet Menu Dropdown */}
      {isMenuOpen && (
        <div className="xl:hidden absolute top-full left-0 right-0 bg-white dark:bg-surface-dark border-b border-gray-100 dark:border-border-dark shadow-xl animate-in slide-in-from-top-2 duration-300 ease-out z-40 max-h-[80vh] overflow-y-auto">
          <div className="flex flex-col p-4 space-y-4">
            {/* Mobile Search Box with Button */}
            <div className="flex gap-2">
              <div className="relative flex-grow">
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 dark:bg-background-dark border border-transparent dark:border-gray-700 focus:bg-white dark:focus:bg-surface-dark focus:border-gray-200 dark:focus:border-gray-500 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm dark:text-gray-100"
                />
                <IconSearch className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
              <button
                onClick={() => handleSearchSubmit()}
                className="bg-gray-900 dark:bg-primary text-white px-5 rounded-xl text-sm font-bold shadow-sm active:scale-95 transition-transform"
              >
                Search
              </button>
            </div>

            <div className="lg:hidden flex flex-col space-y-2">
              <div className="pb-2">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 block px-1">Categories</span>
                <div className="grid grid-cols-2 gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => handleCategorySelect(cat)}
                      className="px-4 py-3 text-sm text-center font-medium bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-600"
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-px bg-gray-100 dark:bg-gray-700 my-2"></div>

              <button
                onClick={() => handleNavClick('orders')}
                className="px-4 py-3 text-sm text-primary dark:text-primary-light bg-primary/5 dark:bg-primary/20 font-bold transition-colors rounded-lg text-left w-full hover:bg-primary/10 dark:hover:bg-primary/30"
              >
                My Orders
              </button>

              {user ? (
                <button
                  onClick={() => handleNavClick('account')}
                  className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-primary dark:hover:text-white font-medium transition-colors rounded-lg text-left w-full flex items-center gap-3"
                >
                  <IconUser className="w-4 h-4" /> My Account
                </button>
              ) : (
                <button
                  onClick={onLogin}
                  className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-primary dark:hover:text-white font-medium transition-colors rounded-lg text-left w-full flex items-center gap-3"
                >
                  <IconUser className="w-4 h-4" /> Login
                </button>
              )}
              <button
                onClick={() => handleNavClick('wishlist')}
                className="px-4 py-3 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-primary dark:hover:text-white font-medium transition-colors rounded-lg flex justify-between items-center w-full"
              >
                <span className="flex items-center gap-3"><IconHeart className="w-4 h-4" /> Wishlist</span>
                {wishlistCount > 0 && <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">{wishlistCount}</span>}
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};