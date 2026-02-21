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
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-neutral-950/95 backdrop-blur-lg border-t border-gray-200 dark:border-neutral-800 transition-colors"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      role="tablist"
      aria-label="Main navigation"
    >
      <div className="flex items-stretch justify-around px-1">
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
                relative flex flex-col items-center justify-center gap-0.5
                min-w-[56px] py-2 px-1 rounded-xl
                transition-all duration-150 ease-out
                ${isPressed ? 'scale-90' : 'scale-100'}
                ${isActive
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-gray-400 dark:text-gray-500 active:text-gray-600 dark:active:text-gray-300'
                }
              `}
              style={{ minHeight: '56px', WebkitTapHighlightColor: 'transparent' }}
            >
              {/* Active indicator bar */}
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-emerald-500 dark:bg-emerald-400 rounded-full" />
              )}

              {/* Icon with badge */}
              <span className="relative">
                <Icon
                  className={`w-[22px] h-[22px] transition-all duration-150 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`}
                  fill={isActive && id === 'wishlist' ? 'currentColor' : 'none'}
                />
                {badge > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-[16px] flex items-center justify-center bg-emerald-600 text-white text-[9px] font-bold rounded-full px-1 border-2 border-white dark:border-neutral-950 animate-in zoom-in duration-200">
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </span>

              {/* Label */}
              <span className={`text-[10px] leading-tight font-medium ${isActive ? 'font-semibold' : ''}`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};