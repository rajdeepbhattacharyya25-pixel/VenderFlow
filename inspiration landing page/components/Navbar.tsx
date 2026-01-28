import React, { useState } from 'react';
import { IconSearch, IconUser, IconShoppingBag, IconMenu, IconX, IconHeart, IconSun, IconMoon, IconChevronDown } from './Icons';

interface NavbarProps {
  onNavigate: (view: 'home' | 'wishlist' | 'cart' | 'account' | 'orders' | 'viewAll') => void;
  onCategoryClick: (category: string) => void;
  wishlistCount: number;
  cartCount: number;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onNavigate, onCategoryClick, wishlistCount, cartCount, isDarkMode, toggleDarkMode }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const categories = ["Women", "Men", "Kids", "Accessories"];

  const handleNavClick = (view: 'home' | 'wishlist' | 'cart' | 'account' | 'orders' | 'viewAll') => {
    onNavigate(view);
    setIsMenuOpen(false);
  };

  const handleCategorySelect = (category: string) => {
    onCategoryClick(category);
    setIsMenuOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-gray-100 dark:border-border-dark transition-all">
      <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Mobile Menu Button - Visible until Large Desktop to handle tight spacing */}
          <button 
            className="lg:hidden text-gray-800 dark:text-gray-200 hover:text-primary transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <IconX className="w-6 h-6" /> : <IconMenu className="w-6 h-6" />}
          </button>
          
          <button onClick={() => handleNavClick('home')} className="text-2xl font-bold font-display text-primary dark:text-white tracking-tighter">FashionStore</button>
        </div>
        
        {/* Desktop Navigation - Visible from Large screens up */}
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
            className="px-6 py-2.5 bg-gray-900 dark:bg-primary text-white rounded-full hover:bg-gray-800 dark:hover:bg-primary/90 transition-all shadow-sm hover:shadow hover:-translate-y-0.5 text-xs font-semibold tracking-wide uppercase"
          >
            My Orders
          </button>
        </div>

        {/* Search and Icons */}
        <div className="flex items-center gap-4 lg:gap-6 text-gray-800 dark:text-gray-200">
          {/* Desktop Visible Search Box - Large Box Style - Visible from XL screens */}
          <div className="hidden xl:flex items-center w-[380px] bg-gray-50 dark:bg-surface-dark border border-gray-200 dark:border-border-dark rounded-full p-1 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all shadow-sm hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600">
             <div className="pl-4 text-gray-400">
               <IconSearch className="w-5 h-5" />
             </div>
             <input 
               type="text" 
               placeholder="Search products..." 
               className="flex-grow bg-transparent border-none focus:ring-0 text-sm px-3 py-2.5 text-gray-800 dark:text-gray-100 placeholder:text-gray-400 outline-none w-full"
             />
             <button className="bg-gray-900 dark:bg-primary hover:bg-primary dark:hover:bg-primary/90 text-white px-6 py-2.5 rounded-full text-sm font-bold transition-all shadow-sm flex-shrink-0">
               Search
             </button>
          </div>

          {/* Search Icon for smaller screens (toggles menu/search) - Visible when Box is hidden */}
          <button 
            className="xl:hidden hover:text-primary transition-colors p-1"
            onClick={() => setIsMenuOpen(true)}
          >
            <IconSearch className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 md:gap-4 border-l border-gray-200 dark:border-gray-700 pl-3 md:pl-5">
            <button 
                onClick={toggleDarkMode} 
                className="hover:text-primary dark:hover:text-yellow-400 transition-transform hover:scale-110" 
                aria-label="Toggle dark mode"
            >
                {isDarkMode ? <IconSun className="w-5 h-5" /> : <IconMoon className="w-5 h-5" />}
            </button>

            <button onClick={() => handleNavClick('account')} className="hidden sm:block hover:text-primary transition-transform hover:scale-110" aria-label="Account">
              <IconUser className="w-5 h-5" />
            </button>
            
            <button 
              onClick={() => handleNavClick('wishlist')}
              className="hidden sm:block hover:text-primary transition-transform hover:scale-110 relative group"
              aria-label="Wishlist"
            >
              <IconHeart className="w-5 h-5" />
              {wishlistCount > 0 && (
                <span 
                    key={wishlistCount}
                    className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full shadow-sm ring-2 ring-white dark:ring-background-dark animate-in zoom-in duration-300"
                >
                  {wishlistCount}
                </span>
              )}
            </button>

            <button onClick={() => handleNavClick('cart')} className="relative hover:text-primary transition-transform hover:scale-110 group" aria-label="Cart">
              <IconShoppingBag className="w-5 h-5" />
              {cartCount > 0 && (
                <span 
                    key={cartCount}
                    className="absolute -top-1.5 -right-1.5 bg-primary text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full shadow-sm ring-2 ring-white dark:ring-background-dark animate-in zoom-in duration-300"
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
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 dark:bg-background-dark border border-transparent dark:border-gray-700 focus:bg-white dark:focus:bg-surface-dark focus:border-gray-200 dark:focus:border-gray-500 focus:ring-0 outline-none transition-all text-sm dark:text-gray-100"
                />
                <IconSearch className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
              <button className="bg-gray-900 dark:bg-primary text-white px-5 rounded-xl text-sm font-bold shadow-sm active:scale-95 transition-transform">Search</button>
            </div>

            <div className="lg:hidden flex flex-col space-y-2">
              <div className="pb-2">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 block px-1">Categories</span>
                <div className="grid grid-cols-2 gap-2">
                  {categories.map((cat) => (
                    <button 
                      key={cat} 
                      onClick={() => handleCategorySelect(cat)}
                      className="px-4 py-3 text-sm text-center font-medium bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-px bg-gray-100 dark:bg-gray-700 my-2"></div>
              
              <button 
                  onClick={() => handleNavClick('orders')}
                  className="px-4 py-3 text-sm text-primary dark:text-primary-light bg-primary/5 dark:bg-primary/20 font-bold transition-colors rounded-lg text-left w-full"
                >
                  My Orders
              </button>

              <button 
                onClick={() => handleNavClick('account')}
                className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-primary dark:hover:text-white font-medium transition-colors rounded-lg text-left w-full flex items-center gap-3"
              >
                <IconUser className="w-4 h-4" /> My Account
              </button>
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