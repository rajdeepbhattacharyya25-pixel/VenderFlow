import React, { useState, useEffect } from 'react';
import { Search, Bell, Sun, Moon, Menu, ShoppingBag, AlertCircle, User, Package, Settings as SettingsIcon, ChevronRight, FileText, MessageSquare, ExternalLink, X } from 'lucide-react';
import { Theme } from '../types';
import { supabase } from '../../lib/supabase';
import { AnimatedIcon } from '../../components/AnimatedIcon';

interface HeaderProps {
    theme: Theme;
    toggleTheme: () => void;
    isMobile: boolean;
    onMenuClick: () => void;
    activeTab: string;
    setActiveTab: (tab: string) => void;
    searchTerm: string;
    onSearchChange: (value: string) => void;
    businessLogo?: string | null;
    storeName?: string | null;
    sellerSlug?: string | null;
}

interface Notification {
    id: string;
    type: string;
    title: string;
    message: string;
    link?: string;
    is_read: boolean;
    created_at: string;
    user_id: string;
}

interface SearchResult {
    type: 'product' | 'order' | 'setting' | 'feature';
    id: string;
    title: string;
    subtitle?: string;
    action: () => void;
}

const Header: React.FC<HeaderProps> = ({ theme, toggleTheme, isMobile, onMenuClick, activeTab, setActiveTab, searchTerm, onSearchChange, businessLogo, storeName, sellerSlug }) => {
    const [searchFocused, setSearchFocused] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);

    const [toastNotification, setToastNotification] = useState<Notification | null>(null);

    // Fetch notifications
    useEffect(() => {
        let mounted = true;
        let currentUserId = '';

        const fetchNotifications = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user || !mounted) return;
            currentUserId = user.id;

            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(20);

            if (!error && data) {
                setNotifications(data);
                setUnreadCount(data.filter(n => !n.is_read).length);
            }
        };

        // Subscribe to new notifications
        let channel: any;
        
        const setupSubscription = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user || !mounted) return;

            // Use a unique channel name per user to avoid broadcast collisions
            const newChannel = supabase
                .channel(`notifications-${user.id}`)
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`
                }, (payload) => {
                    if (mounted) {
                        const newNotification = payload.new as Notification;
                        setNotifications(prev => [newNotification, ...prev].slice(0, 20));
                        setUnreadCount(prev => prev + 1);
                        setToastNotification(newNotification);
                        setTimeout(() => {
                            if (mounted) setToastNotification(null);
                        }, 5000);
                    }
                });
            
            if (mounted) {
                channel = newChannel.subscribe();
            } else {
                newChannel.unsubscribe();
            }
        };

        setupSubscription();
        fetchNotifications();

        return () => {
            mounted = false;
            if (channel) channel.unsubscribe();
        };
    }, []);

    const markAllAsRead = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', user.id)
            .eq('is_read', false);

        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);
    };

    const formatTimeAgo = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        return `${diffDays}d ago`;
    };

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'order': return <ShoppingBag size={18} />;
            case 'warning': return <AlertCircle size={18} />;
            case 'support': return <MessageSquare size={18} />;
            case 'customer': return <User size={18} />;
            default: return <Bell size={18} />;
        }
    };

    const getNotificationStyle = (type: string) => {
        switch (type) {
            case 'order': return 'bg-green-500/10 text-green-600';
            case 'warning': return 'bg-red-500/10 text-red-600';
            case 'support': return 'bg-emerald-500/10 text-emerald-600';
            case 'customer': return 'bg-teal-500/10 text-teal-600';
            default: return 'bg-blue-500/10 text-blue-600';
        }
    };


    // Global Search Logic
    useEffect(() => {
        const performSearch = async () => {
            if (!searchTerm || searchTerm.length < 2) {
                setSearchResults([]);
                return;
            }

            setIsSearching(true);
            const term = searchTerm.toLowerCase();
            const results: SearchResult[] = [];

            // 1. Search Settings Features (Static)
            const settingsFeatures = [
                { title: 'Business Profile', tab: 'settings', sub: 'profile' },
                { title: 'Shipping Settings', tab: 'settings', sub: 'shipping' },
                { title: 'Trust Badges', tab: 'settings', sub: 'appearance' },
                { title: 'Payment & Billing', tab: 'settings', sub: 'billing' },
                { title: 'Notifications', tab: 'settings', sub: 'notifications' },
                { title: 'Account Security', tab: 'settings', sub: 'security' },
            ];

            settingsFeatures.forEach(feature => {
                if (feature.title.toLowerCase().includes(term)) {
                    results.push({
                        type: 'setting',
                        id: `setting-${feature.sub}`,
                        title: feature.title,
                        subtitle: 'Settings Config',
                        action: () => {
                            setActiveTab('settings');
                            onSearchChange('');
                        }
                    });
                }
            });

            try {
                // 2. Search Products
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data: products } = await supabase
                    .from('products')
                    .select('id, name, price')
                    .eq('seller_id', user.id)
                    .ilike('name', `%${term}%`)
                    .limit(3);

                if (products) {
                    products.forEach(p => {
                        results.push({
                            type: 'product',
                            id: p.id,
                            title: p.name,
                            subtitle: `₹${p.price}`,
                            action: () => {
                                setActiveTab('products');
                            }
                        });
                    });
                }

                // 3. Search Orders
                const { data: orders } = await supabase
                    .from('orders')
                    .select('id, total_amount, status')
                    .ilike('id', `%${term}%`)
                    .limit(3);

                if (orders) {
                    orders.forEach(o => {
                        results.push({
                            type: 'order',
                            id: o.id,
                            title: `Order #${o.id.slice(0, 8)}...`,
                            subtitle: `₹${o.total_amount} • ${o.status}`,
                            action: () => {
                                setActiveTab('orders');
                            }
                        });
                    });
                }

            } catch (err) {
                console.error("Search error", err);
            }

            setSearchResults(results);
            setIsSearching(false);
        };

        const timeout = setTimeout(performSearch, 300);
        return () => clearTimeout(timeout);
    }, [searchTerm, setActiveTab, onSearchChange]);


    const getTitle = (tab: string) => {
        switch (tab) {
            case 'dashboard': return `${storeName || 'Store'} Dashboard`;
            case 'products': return 'Product Catalog';
            case 'orders': return 'Orders & Shipping';
            case 'sales': return 'Sales Tracking';
            case 'reports': return 'Business Analytics';
            case 'settings': return 'Store Settings';
            default: return 'Dashboard';
        }
    };

    return (
        <header className="h-[80px] flex items-center justify-between px-4 sm:px-6 lg:px-10 bg-theme-panel backdrop-blur-md border-b border-theme-border/50 sticky top-0 z-40 transition-all">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                {isMobile && (
                    <button onClick={onMenuClick} className="p-2 -ml-2 text-theme-text hover:bg-theme-bg rounded-xl transition-colors flex-shrink-0" title="Toggle Sidebar">
                        <AnimatedIcon icon={Menu} animation="tilt" trigger="hover" size={24} />
                    </button>
                )}
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-theme-text animate-in slide-in-from-left-2 duration-300">{getTitle(activeTab)}</h1>
            </div>

            {/* Toast Notification */}
            {toastNotification && (
                <div className="fixed top-24 right-4 sm:right-10 z-[100] w-80 bg-theme-panel border border-theme-border/50 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-right-8 fade-in duration-300">
                    <div className="flex bg-theme-bg/50">
                        <div className={`w-1 rounded-l-2xl ${
                            toastNotification.type === 'order' ? 'bg-green-500' :
                            toastNotification.type === 'warning' ? 'bg-red-500' :
                            toastNotification.type === 'support' ? 'bg-emerald-500' :
                            toastNotification.type === 'customer' ? 'bg-teal-500' :
                            'bg-blue-500'
                        }`}></div>
                        <div className="flex-1 p-4 flex gap-3">
                            <div className={`mt-0.5 ${
                                toastNotification.type === 'order' ? 'text-green-500' :
                                toastNotification.type === 'warning' ? 'text-red-500' :
                                toastNotification.type === 'support' ? 'text-emerald-500' :
                                toastNotification.type === 'customer' ? 'text-teal-500' :
                                'text-blue-500'
                            }`}>
                                {getNotificationIcon(toastNotification.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-bold text-theme-text mb-0.5">{toastNotification.title}</h4>
                                <p className="text-xs text-theme-muted line-clamp-2">{toastNotification.message}</p>
                            </div>
                            <button 
                                onClick={() => setToastNotification(null)}
                                title="Close notification"
                                className="text-theme-muted hover:text-theme-text transition-colors p-1"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex items-center gap-4 lg:gap-8">
                {/* Global Search */}
                <div className="relative z-50">
                    <div
                        className={`
                        hidden sm:flex items-center bg-theme-bg/50 border border-theme-border/10 rounded-2xl px-4 py-2.5 transition-all duration-300 ease-out
                        ${searchFocused ? 'w-[400px] border-theme-text/20 ring-4 ring-theme-text/5 bg-theme-panel shadow-lg' : 'w-[280px] hover:border-theme-text/10'}
                    `}
                    >
                        <AnimatedIcon icon={Search} animation="pulse" trigger="hover" size={18} iconClassName={`transition-colors duration-300 ${searchFocused ? 'text-primary' : 'text-theme-muted'}`} />
                        <input
                            type="text"
                            placeholder="Search everything (products, settings, orders)..."
                            value={searchTerm}
                            onChange={(e) => onSearchChange(e.target.value)}
                            className="bg-transparent border-none outline-none text-sm text-theme-text placeholder-theme-muted/60 w-full ml-3 font-medium"
                            onFocus={() => setSearchFocused(true)}
                            onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                        />
                        {isSearching && <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin ml-2"></div>}
                    </div>

                    {/* Search Results Dropdown */}
                    {searchFocused && searchTerm.length >= 2 && searchResults.length > 0 && (
                        <div className="absolute top-full left-0 w-full mt-2 bg-theme-panel border border-theme-border/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="max-h-[400px] overflow-y-auto py-2">
                                <div className="px-4 py-2 text-[10px] font-bold text-theme-muted uppercase tracking-wider bg-theme-bg/50">Top Results</div>
                                {searchResults.map((result) => (
                                    <button
                                        key={result.id}
                                        onClick={result.action}
                                        className="w-full text-left px-4 py-3 hover:bg-theme-bg/50 flex items-center gap-3 transition-colors border-b border-theme-border/5 last:border-0 group"
                                    >
                                        <div className={`p-2 rounded-lg ${result.type === 'product' ? 'bg-orange-500/10 text-orange-600' :
                                            result.type === 'order' ? 'bg-blue-500/10 text-blue-600' :
                                                'bg-emerald-500/10 text-emerald-600'
                                            }`}>
                                            {result.type === 'product' ? <Package size={16} /> :
                                                result.type === 'order' ? <FileText size={16} /> :
                                                    <SettingsIcon size={16} />}
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-sm font-semibold text-theme-text group-hover:text-primary transition-colors">{result.title}</div>
                                            {result.subtitle && <div className="text-xs text-theme-muted">{result.subtitle}</div>}
                                        </div>
                                        <ChevronRight size={14} className="text-theme-muted group-hover:text-primary opacity-0 group-hover:opacity-100 transition-all" />
                                    </button>
                                ))}
                            </div>
                            <div className="p-3 bg-theme-bg/30 text-center border-t border-theme-border/10">
                                <span className="text-[10px] text-theme-muted">Press Enter to see all results</span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-3 lg:gap-4">
                    {/* Preview Store Link */}
                    {sellerSlug && (
                        <a
                            href={`/${sellerSlug}?preview=true`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hidden sm:flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors font-semibold text-xs uppercase tracking-wider border border-emerald-200 dark:border-emerald-500/20"
                        >
                            <ExternalLink size={14} />
                            Preview Live
                        </a>
                    )}

                    {/* Theme Toggle */}
                    <button
                        onClick={toggleTheme}
                        className="relative w-[60px] h-8 rounded-full bg-theme-panel border-2 border-theme-border/5 hover:border-theme-border/10 transition-all flex items-center px-1 group shadow-sm overflow-hidden"
                        aria-label="Toggle Theme"
                    >
                        <div className="absolute inset-0 flex justify-between items-center px-2 pointer-events-none opacity-40">
                            <Sun size={12} className={theme === 'light' ? 'text-orange-500' : 'text-theme-muted'} />
                            <Moon size={12} className={theme === 'dark' ? 'text-emerald-400' : 'text-theme-muted'} />
                        </div>
                        <div
                            className={`w-6 h-6 rounded-lg shadow-lg transform transition-all duration-500 ease-in-out flex items-center justify-center z-10
                        ${theme === 'dark' ?
                                    'translate-x-[26px] bg-emerald-600 rotate-0 shadow-emerald-500/30' :
                                    'translate-x-0 bg-gradient-to-tr from-orange-400 to-yellow-300 rotate-[360deg] shadow-orange-400/30'}
                    `}
                        >
                            {theme === 'light' ?
                                <Sun size={14} className="text-white" /> :
                                <Moon size={14} className="text-white" />
                            }
                        </div>
                    </button>

                    {/* Notifications */}
                    <div className="relative z-50">
                        <button
                            onClick={() => setShowNotifications(!showNotifications)}
                            className={`relative p-2.5 rounded-2xl hover:bg-theme-bg border border-transparent hover:border-theme-border/10 transition-all text-theme-text group ${showNotifications ? 'bg-theme-bg border-theme-border/20' : ''}`}
                            title="Notifications"
                        >
                            <AnimatedIcon icon={Bell} animation="shake" trigger="hover" size={20} iconClassName="group-hover:scale-110 transition-transform" />
                            {unreadCount > 0 && (
                                <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-theme-panel animate-pulse shadow-sm"></span>
                            )}
                        </button>

                        {showNotifications && (
                            <>
                                <div
                                    className="fixed inset-0 z-[60] bg-black/15 backdrop-blur-[2px]"
                                    onClick={() => setShowNotifications(false)}
                                />
                                <div className="absolute right-0 mt-4 w-96 max-w-[calc(100vw-2rem)] bg-theme-panel border border-theme-border/50 rounded-3xl shadow-2xl z-[70] overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                                    <div className="p-5 border-b border-theme-border/20 flex justify-between items-center bg-theme-bg/80">
                                        <h4 className="font-bold text-sm tracking-tight text-theme-text">
                                            Notifications
                                            {unreadCount > 0 && (
                                                <span className="ml-2 text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">{unreadCount}</span>
                                            )}
                                        </h4>
                                        <button
                                            onClick={markAllAsRead}
                                            className="text-[10px] text-theme-muted font-bold uppercase tracking-widest hover:text-theme-text transition-colors bg-theme-bg px-2.5 py-1.5 rounded-lg border border-theme-border/50"
                                        >
                                            Mark all read
                                        </button>
                                    </div>
                                    <div className="max-h-[440px] overflow-y-auto hide-scroll">
                                        {notifications.length === 0 ? (
                                            <div className="p-8 text-center text-theme-muted">
                                                <Bell size={32} className="mx-auto mb-2 opacity-50" />
                                                <p className="text-sm">No notifications yet</p>
                                            </div>
                                        ) : (
                                            notifications.map(n => (
                                                <div
                                                    key={n.id}
                                                    className={`p-4 hover:bg-theme-bg/50 transition-colors border-b border-theme-border/20 flex gap-4 cursor-pointer group relative ${!n.is_read ? 'bg-blue-500/5 dark:bg-blue-500/10' : ''}`}
                                                    onClick={() => {
                                                        if (n.link) {
                                                            const tab = n.link.split('/').pop();
                                                            if (tab) setActiveTab(tab);
                                                        }
                                                        setShowNotifications(false);
                                                    }}
                                                >
                                                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110 ${getNotificationStyle(n.type)}`}>
                                                        {getNotificationIcon(n.type)}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-[13px] font-medium text-theme-text/90 leading-snug mb-1 line-clamp-2">{n.message}</p>
                                                        <span className="text-[10px] font-bold text-theme-muted uppercase tracking-wider">{formatTimeAgo(n.created_at)}</span>
                                                    </div>
                                                    {!n.is_read && (
                                                        <div className="w-2 h-2 rounded-full bg-blue-500 absolute right-4 top-1/2 -translate-y-1/2"></div>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                    <div className="p-4 bg-theme-bg/80 text-center border-t border-theme-border/20">
                                        <button
                                            onClick={() => {
                                                setActiveTab('settings');
                                                setShowNotifications(false);
                                            }}
                                            className="text-xs font-bold text-theme-muted hover:text-theme-text transition-all tracking-wide uppercase"
                                        >
                                            View All Activity
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Avatar / Business Logo */}
                    <button
                        className="w-11 h-11 rounded-2xl overflow-hidden border-2 border-theme-border/5 shadow-sm hover:border-theme-text/20 hover:scale-105 transition-all duration-300 p-0.5 bg-theme-panel"
                        title="Business Profile"
                    >
                        <div className="w-full h-full rounded-xl overflow-hidden">
                            <img
                                src={businessLogo || "/logo.jpg"}
                                alt="Business Logo"
                                className="w-full h-full object-cover"
                            />
                        </div>
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Header;

