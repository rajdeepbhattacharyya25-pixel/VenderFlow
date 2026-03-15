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
  MessageSquare,
  Ticket,
  CreditCard
} from 'lucide-react';
import { signOut } from '../../lib/auth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { AnimatedIcon } from '../../components/AnimatedIcon';



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
  { id: 'promotions', label: 'Promotions', icon: Ticket },
  { id: 'reports', label: 'Business Analytics', icon: PieChart },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'billing', label: 'Billing & Plans', icon: CreditCard },
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
        className={`fixed top-0 left-0 h-full bg-theme-panel border-r border-theme-border/50 z-40 transition-all duration-300 ease-in-out flex flex-col shadow-2xl
          ${isMobile
            ? (collapsed ? '-translate-x-full' : 'translate-x-0 w-[260px]')
            : (collapsed ? 'w-[180px]' : 'w-[260px]')
          }
        `}
      >
        {/* Logo Area */}
        <div className={`h-[70px] flex items-center px-4 border-b border-theme-border/50`}>
          <button
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center gap-2.5 text-theme-text font-heading font-bold tracking-tight hover:opacity-80 transition-opacity text-left w-full group min-w-0"
          >
            <div className="relative flex-shrink-0">
              <img
                src={businessLogo || "/logo.jpg"}
                alt="Business Logo"
                className="w-8 h-8 md:w-10 md:h-10 rounded-lg object-cover shadow-soft group-hover:shadow-glow transition-shadow duration-300"
              />
            </div>
            <span className="truncate uppercase tracking-widest text-xs md:text-sm text-theme-text">
              {storeName || 'VendorFlow'}
            </span>
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
                        relative flex items-center h-11 rounded-lg transition-all duration-300 group overflow-hidden
                        ${collapsed ? 'justify-start w-full px-3' : 'px-4 w-full'}
                        ${isActive
                    ? 'bg-theme-bg text-theme-text translate-x-1'
                    : 'text-theme-muted hover:bg-theme-bg/50 hover:text-theme-text hover:translate-x-1'
                  }
                    `}
              >
                <div className="relative z-10 flex items-center gap-3 min-w-0">
                  <AnimatedIcon
                    icon={Icon}
                    animation="scale"
                    trigger="hover"
                    size={18}
                    className="flex-shrink-0"
                  />
                  {showBadge && (
                    <span className="absolute -top-1 left-3 w-2 h-2 bg-red-500 rounded-full animate-pulse border-2 border-theme-panel" />
                  )}

                  <span className="text-[12px] font-medium whitespace-nowrap truncate">
                    {item.label}
                  </span>
                </div>

                {/* Active Indicator Line */}
                {isActive && collapsed && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-theme-text rounded-r-full" />
                )}

                {/* Tooltip for collapsed state */}
                {collapsed && (
                  <div className="absolute left-full ml-3 px-3 py-1.5 bg-theme-text text-theme-bg text-xs font-bold rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-xl">
                    {item.label}
                  </div>
                )}
              </button>
            );
          })}

          <div className="mt-auto flex flex-col gap-2 pt-6 border-t border-theme-border/50">
            {sellerSlug && (
              <a
                href={`/store/${sellerSlug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 h-11 rounded-lg transition-all duration-200 w-full group text-theme-muted hover:text-theme-text hover:bg-theme-bg px-3"
                title="View Storefront"
              >
                <div className="relative flex-shrink-0">
                  <AnimatedIcon icon={ShoppingBag} animation="bounce" trigger="hover" size={18} className="flex-shrink-0" />
                  <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-green-500 border-2 border-theme-panel"></div>
                </div>
                <span className="text-[12px] font-medium whitespace-nowrap truncate">View Store</span>
              </a>
            )}

            <button
              onClick={handleLogout}
              className="flex items-center gap-3 h-11 rounded-lg transition-all duration-200 w-full group text-theme-muted hover:text-red-500 hover:bg-red-500/10 px-3"
            >
              <AnimatedIcon icon={LogOut} animation="tilt" trigger="hover" size={18} className="flex-shrink-0" />
              <span className="text-[12px] font-medium whitespace-nowrap">Logout</span>
            </button>
          </div>


        </nav>


      </aside>
    </>
  );
};

export default Sidebar;
