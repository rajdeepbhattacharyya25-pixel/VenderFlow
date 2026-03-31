import React, { useState } from 'react';
import { Home, LayoutGrid, ShoppingBag, Heart, User } from 'lucide-react';

interface BottomNavProps {
  onNavigate: (view: 'home' | 'wishlist' | 'cart' | 'account' | 'viewAll') => void;
  cartCount: number;
  wishlistCount?: number;
  activeTab?: string;
}

const tabs = [
  { id: 'home', label: 'Home', Icon: Home },
  { id: 'viewAll', label: 'Categories', Icon: LayoutGrid },
  { id: 'cart', label: 'Cart', Icon: ShoppingBag },
  { id: 'wishlist', label: 'Wishlist', Icon: Heart },
  { id: 'account', label: 'Profile', Icon: User },
] as const;

export const BottomNav: React.FC<BottomNavProps> = ({
  onNavigate,
  cartCount,
  wishlistCount = 0,
  activeTab = 'home',
}) => {
  const [pressedTab, setPressedTab] = useState<string | null>(null);

  const getBadge = (id: string) => {
    if (id === 'cart' && cartCount > 0) return cartCount;
    if (id === 'wishlist' && wishlistCount > 0) return wishlistCount;
    return 0;
  };

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 transition-colors bg-white/95 dark:bg-emerald-950/95 backdrop-blur-md safe-bottom-fixed border-t border-emerald-100 dark:border-emerald-900/30 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]"
      role="tablist"
      aria-label="Main navigation"
    >
      <div className="flex items-stretch justify-around px-1 h-16">
        {tabs.map(({ id, label, Icon }) => {
          const isActive = activeTab === id;
          const badge = getBadge(id);
          const isPressed = pressedTab === id;

          return (
            <button
              key={id}
              role="tab"
              aria-selected={isActive ? 'true' : 'false'}
              aria-label={label}
              onClick={() => onNavigate(id as any)}
              onTouchStart={() => setPressedTab(id)}
              onTouchEnd={() => setPressedTab(null)}
              className={`
                relative flex flex-col items-center justify-center gap-1
                min-w-[56px] px-1 rounded-xl
                transition-all duration-200 cubic-bezier(0.175, 0.885, 0.32, 1.275)
                ${isPressed ? 'scale-90 opacity-70' : 'scale-100 opacity-100'}
                ${isActive
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-emerald-900/60 dark:text-emerald-100/60'
                }
              `}
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              {/* Active indicator bar */}
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] bg-emerald-500 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.7)] animate-in slide-in-from-top-1 duration-300" />
              )}

              {/* Icon with badge */}
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform duration-300 ${isActive ? 'scale-110' : 'scale-100'}`}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                {badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[14px] h-[14px] flex items-center justify-center bg-rose-500 text-white text-[8px] font-black rounded-full border border-white dark:border-neutral-950 animate-in zoom-in duration-300">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </div>

              {/* Label */}
              <span className="text-[9px] uppercase tracking-wider font-black opacity-100">
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
