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
  onSidebarClose?: () => void;
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

const Sidebar: React.FC<SidebarProps> = ({ collapsed, isMobile, activeTab, setActiveTab, sellerSlug, onSidebarClose }) => {
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
        className={`fixed top-0 left-0 h-full bg-panel border-r border-muted/10 z-40 transition-all duration-300 ease-in-out flex flex-col 
          ${isMobile
            ? (collapsed ? '-translate-x-full' : 'translate-x-0 w-[280px] shadow-2xl')
            : (collapsed ? 'w-[72px]' : 'w-[240px]')
          }
        `}
      >
        {/* Logo Area */}
        <div className={`h-[80px] flex items-center ${collapsed ? 'justify-center' : 'px-8'} border-b border-muted/10`}>
          <div className="flex items-center gap-2 text-text font-bold text-xl tracking-tight">
            <img src="/logo.jpg" alt="VenderFlow" className="w-8 h-8 rounded-lg object-contain" />
            {!collapsed && <span className="opacity-0 animate-[fadeIn_0.3s_ease-out_forwards]">VenderFlow</span>}
          </div>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 py-6 flex flex-col gap-2 px-4 overflow-y-auto">
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
                        relative flex items-center h-12 rounded-xl transition-all duration-200 group
                        ${collapsed ? 'justify-center w-full px-0' : 'px-4 w-full'}
                        ${isActive ? 'bg-text text-bg shadow-lg' : 'text-muted hover:bg-bg hover:text-text'}
                    `}
              >
                <div className="relative">
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 2} className="flex-shrink-0" />
                  {showBadge && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse border-2 border-panel" />
                  )}
                </div>

                {!collapsed && (
                  <span className={`ml-3 text-[13px] font-medium whitespace-nowrap opacity-0 animate-[fadeIn_0.2s_0.1s_ease-out_forwards]`}>
                    {item.label}
                  </span>
                )}

                {/* Tooltip for collapsed state */}
                {collapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-text text-bg text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                    {item.label}
                  </div>
                )}
              </button>
            );
          })}

          <div className="mt-auto flex flex-col gap-2">
            {sellerSlug && (
              <a
                href={`/store/${sellerSlug}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`
                        flex items-center h-12 rounded-xl transition-all duration-200 w-full group text-muted hover:text-primary hover:bg-primary/10
                        ${collapsed ? 'justify-center px-0' : 'px-4'}
                    `}
                title="View Storefront"
              >
                <div className="relative">
                  <ShoppingBag size={20} className="flex-shrink-0" />
                  <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-green-500 border-2 border-panel"></div>
                </div>
                {!collapsed && <span className="ml-3 text-[13px] font-medium whitespace-nowrap">View Store</span>}
              </a>
            )}

            <button
              onClick={handleLogout}
              className={`
                        flex items-center h-12 rounded-xl transition-all duration-200 w-full group text-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10
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