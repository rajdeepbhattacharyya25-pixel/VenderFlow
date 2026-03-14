import React, { useState, useRef, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { IconSearch, IconUser, IconShoppingBag, IconMenu, IconX, IconHeart, IconSun, IconMoon, IconChevronDown } from './Icons';
import { NotificationBell } from './NotificationBell';

interface NavbarProps {
  onNavigate: (view: 'home' | 'wishlist' | 'cart' | 'account' | 'orders' | 'viewAll' | 'storeLogin' | 'storeRegister') => void;
  onCategoryClick: (category: string) => void;
  onSearch: (query: string) => void | Promise<void>;
  wishlistCount: number;
  cartCount: number;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  user?: any;
  onLogin?: () => void;
  storeName?: string;
  storeLogo?: string;
  categories?: string[];
  isAdmin?: boolean;
  products?: any[];
  onProductSelect?: (product: any) => void;
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
  storeName = "VendorFlow",
  storeLogo,
  categories = ["Women", "Men", "Kids", "Accessories"],
  isAdmin = false
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

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
      setIsSearchOpen(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearchSubmit();
    }
  };

  // Auto-focus search input when opening mobile search
  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      requestAnimationFrame(() => searchInputRef.current?.focus());
    }
  }, [isSearchOpen]);

  return (
    <>
      {/* ===== MOBILE HEADER (<md) ===== */}
      <nav
        className="md:hidden sticky top-0 z-50 bg-white/95 dark:bg-neutral-950/95 backdrop-blur-lg border-b border-gray-100 dark:border-neutral-800 transition-colors"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="flex items-center justify-between px-4 h-14">
          {/* Store branding */}
          <button
            onClick={() => handleNavClick('home')}
            className="flex items-center gap-2 min-w-0"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            {storeLogo && (
              <img src={storeLogo} alt={storeName} className="h-8 w-8 object-cover rounded-lg flex-shrink-0" />
            )}
            <span className="text-lg font-bold font-heading text-gray-900 dark:text-white truncate max-w-[140px]">
              {storeName}
            </span>
          </button>

          {/* Right actions */}
          <div className="flex items-center gap-1">
            {/* Search button */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="w-11 h-11 flex items-center justify-center rounded-xl text-gray-600 dark:text-gray-300 active:bg-gray-100 dark:active:bg-neutral-800 transition-colors"
              aria-label="Search"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <IconSearch className="w-5 h-5" />
            </button>

            {/* Dark mode */}
            <button
              onClick={toggleDarkMode}
              className="w-11 h-11 flex items-center justify-center rounded-xl text-gray-600 dark:text-gray-300 active:bg-gray-100 dark:active:bg-neutral-800 transition-colors"
              aria-label="Toggle theme"
              title="Toggle theme"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              {isDarkMode ? <IconSun className="w-5 h-5" /> : <IconMoon className="w-5 h-5" />}
            </button>

            {/* Notification bell (logged in) */}
            {user && <NotificationBell />}
          </div>
        </div>
      </nav>

      {/* Mobile Search Overlay */}
      {isSearchOpen && (
        <div className="md:hidden fixed inset-0 z-[60] bg-white dark:bg-neutral-950 animate-in fade-in duration-200">
          <div
            className="flex items-center gap-3 px-4 h-14 border-b border-gray-100 dark:border-neutral-800"
            style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
          >
            <button
              onClick={() => setIsSearchOpen(false)}
              className="w-11 h-11 flex items-center justify-center rounded-xl text-gray-600 dark:text-gray-300 active:bg-gray-100 dark:active:bg-neutral-800 flex-shrink-0"
              style={{ WebkitTapHighlightColor: 'transparent' }}
              title="Close search"
              aria-label="Close search"
            >
              <IconX className="w-5 h-5" />
            </button>
            <div className="flex-1 relative">
              <input
                ref={searchInputRef}
                type="search"
                inputMode="search"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 outline-none text-sm dark:text-gray-100 placeholder:text-gray-400 transition-all"
              />
              <IconSearch className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
            <button
              onClick={() => handleSearchSubmit()}
              className="px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold active:scale-95 transition-all flex-shrink-0"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              Search
            </button>
          </div>
          {/* Recent searches hint */}
          <div className="px-6 py-8 text-center text-gray-400 dark:text-gray-500 text-sm">
            Search for products, categories, or brands
          </div>
        </div>
      )}

      {/* ===== DESKTOP HEADER (md+) ===== */}
      <nav className="hidden md:block sticky top-0 z-50 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-md border-b border-gray-100 dark:border-neutral-800 transition-all">
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => handleNavClick('home')} className="flex items-center gap-2 hover:opacity-90 transition-opacity">
              {storeLogo && <img src={storeLogo} alt={storeName} className="h-8 w-auto object-contain rounded-md" />}
              <span className="text-2xl font-bold font-heading text-emerald-700 dark:text-white tracking-tighter">
                {storeName}
              </span>
            </button>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-8 text-sm font-medium text-gray-600 dark:text-gray-300">
            {/* Category Dropdown */}
            <div className="relative group">
              <button className="text-gray-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors flex items-center gap-1.5 py-2 group font-extrabold tracking-wide text-base">
                Categories <IconChevronDown className="w-4 h-4 transition-transform duration-300 group-hover:-rotate-180 text-gray-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400" />
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-emerald-600 dark:bg-emerald-400 transition-all duration-300 group-hover:w-full"></span>
              </button>

              <div className="absolute top-full left-0 pt-4 w-56 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform origin-top-left z-50">
                <div className="bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-700 rounded-xl shadow-xl overflow-hidden p-2 flex flex-col gap-1">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => handleCategorySelect(cat)}
                      className="px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-neutral-800 hover:text-emerald-600 dark:hover:text-white rounded-lg transition-colors flex items-center justify-between group/item font-medium text-gray-600 dark:text-gray-300 w-full text-left"
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
              className="px-6 py-2.5 bg-gray-900 dark:bg-emerald-600 text-white rounded-full hover:bg-gray-800 dark:hover:bg-emerald-500 transition-all shadow-sm hover:shadow hover:-translate-y-0.5 text-xs font-semibold tracking-wide uppercase"
            >
              My Orders
            </button>
          </div>

          {/* Search and Icons */}
          <div className="flex items-center gap-4 lg:gap-6 text-gray-800 dark:text-gray-200">
            {/* Desktop Search Box */}
            <div className="hidden xl:flex items-center w-[380px] bg-gray-50 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-full p-1 focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 transition-all shadow-sm hover:shadow-md hover:border-gray-300 dark:hover:border-neutral-600">
              <div className="pl-4 text-gray-400">
                <IconSearch className="w-5 h-5" />
              </div>
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-grow bg-transparent border-none focus:ring-0 text-sm px-3 py-2.5 text-gray-800 dark:text-gray-100 placeholder:text-gray-400 outline-none w-full"
              />
              <button
                onClick={() => handleSearchSubmit()}
                className="bg-gray-900 dark:bg-emerald-600 hover:bg-emerald-600 dark:hover:bg-emerald-500 text-white px-6 py-2.5 rounded-full text-sm font-bold transition-all shadow-sm flex-shrink-0"
              >
                Search
              </button>
            </div>

            {/* Search Icon for tablet */}
            <button
              className="xl:hidden hover:text-emerald-600 transition-colors p-1"
              onClick={() => setIsSearchOpen(true)}
            >
              <IconSearch className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 md:gap-4 border-l border-gray-200 dark:border-neutral-700 pl-3 md:pl-5">
              <button
                onClick={toggleDarkMode}
                className="hover:text-emerald-600 dark:hover:text-yellow-400 transition-transform hover:scale-110"
                aria-label="Toggle dark mode"
              >
                {isDarkMode ? <IconSun className="w-5 h-5" /> : <IconMoon className="w-5 h-5" />}
              </button>

              {user ? (
                <div className="flex items-center gap-3">
                  {isAdmin ? (
                    <a
                      href="/admin"
                      className="flex items-center gap-2 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors shadow-sm"
                    >
                      Admin
                    </a>
                  ) : (
                    <a
                      href="/dashboard"
                      className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all shadow-sm hover:scale-105 active:scale-95 group"
                    >
                      <span>Dashboard</span>
                      <div className="w-1.5 h-1.5 bg-white/40 rounded-full group-hover:bg-white transition-colors" />
                    </a>
                  )}
                  <NotificationBell />
                  <button onClick={() => handleNavClick('account')} className="hover:text-emerald-600 transition-transform hover:scale-110" aria-label="Account">
                    <IconUser className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={onLogin}
                  className="hover:text-emerald-600 transition-colors font-bold text-sm"
                  aria-label="Seller Login"
                >
                  Seller Login
                </button>
              )}

              <button
                onClick={() => handleNavClick('wishlist')}
                className="hover:text-emerald-600 transition-transform hover:scale-110 relative group"
                aria-label="Wishlist"
              >
                <IconHeart className="w-5 h-5" />
                {wishlistCount > 0 && (
                  <span
                    key={wishlistCount}
                    className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full shadow-sm ring-2 ring-white dark:ring-neutral-950 animate-in zoom-in duration-300"
                  >
                    {wishlistCount}
                  </span>
                )}
              </button>

              <button onClick={() => handleNavClick('cart')} className="relative hover:text-emerald-600 transition-transform hover:scale-110 group" aria-label="Cart">
                <IconShoppingBag className="w-5 h-5" />
                {cartCount > 0 && (
                  <span
                    key={cartCount}
                    className="absolute -top-1.5 -right-1.5 bg-emerald-600 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full shadow-sm ring-2 ring-white dark:ring-neutral-950 animate-in zoom-in duration-300"
                  >
                    {cartCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
};
