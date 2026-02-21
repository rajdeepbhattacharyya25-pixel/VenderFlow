import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  ShoppingBag,
  ShoppingCart,
  Tag,
  PieChart,
  Settings,
  LogOut,
  Zap,
  MessageSquare
} from 'lucide-react';
import { signOut } from '../../lib/auth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';



interface SidebarProps {
  collapsed: boolean;
  isMobile: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  sellerSlug: string | null;
  businessLogo?: string | null;
  onSidebarClose?: () => void;
  storeName?: string | null;
}

const MENU_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'products', label: 'Products', icon: ShoppingBag },
  { id: 'orders', label: 'Orders', icon: ShoppingCart },
  { id: 'sales', label: 'Sales', icon: Tag },
  { id: 'reports', label: 'Reports', icon: PieChart },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'support', label: 'Support', icon: MessageSquare },
];

const Sidebar: React.FC<SidebarProps> = ({ collapsed, isMobile, activeTab, setActiveTab, sellerSlug, businessLogo, onSidebarClose, storeName }) => {
  const navigate = useNavigate();
  const [unreadSupportCount, setUnreadSupportCount] = useState(0);

  // Fetch unread admin messages for this seller
  useEffect(() => {
    const fetchUnreadCount = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get tickets for this seller
      const { data: tickets } = await supabase
        .from('support_tickets')
        .select('id')
        .eq('seller_id', user.id);

      if (!tickets || tickets.length === 0) return;

      const ticketIds = tickets.map(t => t.id);

      // Count unread messages from admin
      const { count } = await supabase
        .from('support_messages')
        .select('*', { count: 'exact', head: true })
        .in('ticket_id', ticketIds)
        .eq('sender_role', 'admin')
        .eq('is_read', false);

      setUnreadSupportCount(count || 0);
    };

    fetchUnreadCount();

    // Subscribe to new messages
    const channel = supabase
      .channel('seller-support-unread')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'support_messages'
      }, () => {
        fetchUnreadCount();
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  // Clear unread count when viewing support
  useEffect(() => {
    if (activeTab === 'support' && unreadSupportCount > 0) {
      const markAsRead = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: tickets } = await supabase
          .from('support_tickets')
          .select('id')
          .eq('seller_id', user.id);

        if (!tickets || tickets.length === 0) return;

        const ticketIds = tickets.map(t => t.id);

        await supabase
          .from('support_messages')
          .update({ is_read: true })
          .in('ticket_id', ticketIds)
          .eq('sender_role', 'admin')
          .eq('is_read', false);

        setUnreadSupportCount(0);
      };

      markAsRead();
    }
  }, [activeTab, unreadSupportCount]);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
      // Optionally show a toast or alert
    }
  };

  // Desktop/Tablet Sidebar AND Mobile Overlay
  return (
    <>
      {/* Mobile Overlay Backdrop */}
      {isMobile && !collapsed && (
        <div
          className="fixed inset-0 bg-black/50 z-30 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={onSidebarClose}
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full bg-[#1a1c2e] border-r border-white/5 z-40 transition-all duration-300 ease-in-out flex flex-col shadow-2xl
          ${isMobile
            ? (collapsed ? '-translate-x-full' : 'translate-x-0 w-[280px]')
            : (collapsed ? 'w-[72px]' : 'w-[240px]')
          }
        `}
      >
        {/* Logo Area */}
        <div className={`h-[80px] flex items-center ${collapsed ? 'justify-center' : 'px-6'} border-b border-white/5`}>
          <button
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center gap-3 text-luxury-text font-display font-bold text-xl tracking-tight hover:opacity-80 transition-opacity text-left w-full group"
          >
            <div className="relative">
              <img
                src={businessLogo || "/logo.jpg"}
                alt="Business Logo"
                className="w-9 h-9 rounded-lg object-cover flex-shrink-0 shadow-soft group-hover:shadow-glow transition-shadow duration-300"
              />
            </div>

            {!collapsed && (
              <span className="opacity-0 animate-[fadeIn_0.3s_ease-out_forwards] truncate uppercase tracking-widest text-sm text-white">
                {storeName || 'VenderFlow'}
              </span>
            )}
          </button>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 py-6 flex flex-col gap-1.5 px-3 overflow-y-auto">
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const showBadge = item.id === 'support' && unreadSupportCount > 0 && !isActive;

            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  if (isMobile && onSidebarClose) onSidebarClose();
                }}
                className={`
                        relative flex items-center h-12 rounded-lg transition-all duration-300 group overflow-hidden
                        ${collapsed ? 'justify-center w-full px-0' : 'px-4 w-full'}
                        ${isActive
                    ? 'bg-white/10 text-white translate-x-1'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white hover:translate-x-1'
                  }
                    `}
              >
                <div className="relative z-10 flex items-center">
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 1.5} className="flex-shrink-0" />
                  {showBadge && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse border-2 border-luxury-card" />
                  )}

                  {!collapsed && (
                    <span className={`ml-3 text-[13px] font-medium whitespace-nowrap opacity-0 animate-[fadeIn_0.2s_0.1s_ease-out_forwards]`}>
                      {item.label}
                    </span>
                  )}
                </div>

                {/* Active Indicator Line */}
                {isActive && collapsed && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-r-full" />
                )}

                {/* Tooltip for collapsed state */}
                {collapsed && (
                  <div className="absolute left-full ml-3 px-3 py-1.5 bg-luxury-text text-luxury-bg text-xs font-bold rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-xl">
                    {item.label}
                  </div>
                )}
              </button>
            );
          })}

          <div className="mt-auto flex flex-col gap-2 pt-6 border-t border-white/5">
            {sellerSlug && (
              <a
                href={`/store/${sellerSlug}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`
                        flex items-center h-12 rounded-lg transition-all duration-200 w-full group text-slate-400 hover:text-white hover:bg-white/5
                        ${collapsed ? 'justify-center px-0' : 'px-4'}
                    `}
                title="View Storefront"
              >
                <div className="relative">
                  <ShoppingBag size={20} className="flex-shrink-0" />
                  <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-green-500 border-2 border-luxury-card"></div>
                </div>
                {!collapsed && <span className="ml-3 text-[13px] font-medium whitespace-nowrap">View Store</span>}
              </a>
            )}

            <button
              onClick={handleLogout}
              className={`
                        flex items-center h-12 rounded-lg transition-all duration-200 w-full group text-slate-400 hover:text-red-400 hover:bg-red-500/10
                        ${collapsed ? 'justify-center px-0' : 'px-4'}
                    `}
            >
              <LogOut size={20} className="flex-shrink-0" />
              {!collapsed && <span className="ml-3 text-[13px] font-medium whitespace-nowrap">Logout</span>}
            </button>
          </div>

        </nav>


      </aside>
    </>
  );
};

export default Sidebar;