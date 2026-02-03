import React, { useState, useEffect } from 'react';
import { Search, Bell, Sun, Moon, Menu, ShoppingBag, AlertCircle, User, Package, Settings as SettingsIcon, ChevronRight, FileText, MessageSquare } from 'lucide-react';
import { Theme } from '../types';
import { supabase } from '../../lib/supabase';

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
}

interface Notification {
    id: string;
    type: string;
    title: string;
    message: string;
    link?: string;
    is_read: boolean;
    created_at: string;
}

interface SearchResult {
    type: 'product' | 'order' | 'setting' | 'feature';
    id: string;
    title: string;
    subtitle?: string;
    action: () => void;
}

const Header: React.FC<HeaderProps> = ({ theme, toggleTheme, isMobile, onMenuClick, activeTab, setActiveTab, searchTerm, onSearchChange, businessLogo }) => {
    const [searchFocused, setSearchFocused] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);

    // Fetch notifications
    useEffect(() => {
        const fetchNotifications = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

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

        fetchNotifications();

        // Subscribe to new notifications
        const channel = supabase
            .channel('seller-notifications')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'notifications'
            }, () => {
                fetchNotifications();
            })
            .subscribe();

        return () => {
            channel.unsubscribe();
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
            case 'support': return 'bg-indigo-500/10 text-indigo-600';
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
                const { data: products } = await supabase
                    .from('products')
                    .select('id, name, price')
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
            case 'dashboard': return 'Dashboard Overview';
            case 'products': return 'Product Catalog';
            case 'orders': return 'Orders & Shipping';
            case 'sales': return 'Sales Tracking';
            case 'reports': return 'Business Analytics';
            case 'settings': return 'Store Settings';
            default: return 'Dashboard';
        }
    };

    return (
        <header className="h-[80px] flex items-center justify-between px-6 lg:px-10 bg-panel/80 backdrop-blur-md border-b border-muted/5 sticky top-0 z-40 transition-all">
            <div className="flex items-center gap-4">
                {isMobile && (
                    <button onClick={onMenuClick} className="p-2 -ml-2 text-text hover:bg-bg/50 rounded-xl transition-colors" title="Toggle Sidebar">
                        <Menu size={24} />
                    </button>
                )}
                <h1 className="text-xl font-bold tracking-tight text-text animate-in slide-in-from-left-2 duration-300">{getTitle(activeTab)}</h1>
            </div>

            <div className="flex items-center gap-4 lg:gap-8">
                {/* Global Search */}
                <div className="relative z-50">
                    <div
                        className={`
                        hidden sm:flex items-center bg-bg/50 border border-muted/10 rounded-2xl px-4 py-2.5 transition-all duration-300 ease-out
                        ${searchFocused ? 'w-[400px] border-text/20 ring-4 ring-text/5 bg-panel shadow-lg' : 'w-[280px] hover:border-text/10'}
                    `}
                    >
                        <Search size={18} className={`transition-colors duration-300 ${searchFocused ? 'text-primary' : 'text-muted'}`} />
                        <input
                            type="text"
                            placeholder="Search everything (products, settings, orders)..."
                            value={searchTerm}
                            onChange={(e) => onSearchChange(e.target.value)}
                            className="bg-transparent border-none outline-none text-sm text-text placeholder-muted/60 w-full ml-3 font-medium"
                            onFocus={() => setSearchFocused(true)}
                            onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                        />
                        {isSearching && <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin ml-2"></div>}
                    </div>

                    {/* Search Results Dropdown */}
                    {searchFocused && searchTerm.length >= 2 && searchResults.length > 0 && (
                        <div className="absolute top-full left-0 w-full mt-2 bg-panel border border-muted/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="max-h-[400px] overflow-y-auto py-2">
                                <div className="px-4 py-2 text-[10px] font-bold text-muted uppercase tracking-wider bg-bg/50">Top Results</div>
                                {searchResults.map((result) => (
                                    <button
                                        key={result.id}
                                        onClick={result.action}
                                        className="w-full text-left px-4 py-3 hover:bg-bg/50 flex items-center gap-3 transition-colors border-b border-muted/5 last:border-0 group"
                                    >
                                        <div className={`p-2 rounded-lg ${result.type === 'product' ? 'bg-orange-500/10 text-orange-600' :
                                            result.type === 'order' ? 'bg-blue-500/10 text-blue-600' :
                                                'bg-purple-500/10 text-purple-600'
                                            }`}>
                                            {result.type === 'product' ? <Package size={16} /> :
                                                result.type === 'order' ? <FileText size={16} /> :
                                                    <SettingsIcon size={16} />}
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-sm font-semibold text-text group-hover:text-primary transition-colors">{result.title}</div>
                                            {result.subtitle && <div className="text-xs text-muted">{result.subtitle}</div>}
                                        </div>
                                        <ChevronRight size={14} className="text-muted group-hover:text-primary opacity-0 group-hover:opacity-100 transition-all" />
                                    </button>
                                ))}
                            </div>
                            <div className="p-3 bg-bg/30 text-center border-t border-muted/10">
                                <span className="text-[10px] text-muted">Press Enter to see all results</span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-3 lg:gap-4">
                    {/* Theme Toggle */}
                    <button
                        onClick={toggleTheme}
                        className="relative w-[60px] h-8 rounded-full bg-panel border-2 border-muted/5 hover:border-muted/10 transition-all flex items-center px-1 group shadow-sm overflow-hidden"
                        aria-label="Toggle Theme"
                    >
                        <div className="absolute inset-0 flex justify-between items-center px-2 pointer-events-none opacity-40">
                            <Sun size={12} className={theme === 'light' ? 'text-orange-500' : 'text-muted'} />
                            <Moon size={12} className={theme === 'dark' ? 'text-indigo-400' : 'text-muted'} />
                        </div>
                        <div
                            className={`w-6 h-6 rounded-lg shadow-lg transform transition-all duration-500 ease-in-out flex items-center justify-center z-10
                        ${theme === 'dark' ?
                                    'translate-x-[26px] bg-gradient-to-tr from-indigo-600 to-purple-600 rotate-0 shadow-indigo-500/30' :
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
                    <div className="relative">
                        <button
                            onClick={() => setShowNotifications(!showNotifications)}
                            className={`relative p-2.5 rounded-2xl hover:bg-bg border border-transparent hover:border-muted/10 transition-all text-text group ${showNotifications ? 'bg-bg border-muted/20' : ''}`}
                            title="Notifications"
                        >
                            <Bell size={20} className="group-hover:scale-110 transition-transform" />
                            {unreadCount > 0 && (
                                <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-panel animate-pulse shadow-sm"></span>
                            )}
                        </button>

                        {showNotifications && (
                            <>
                                <div
                                    className="fixed inset-0 z-40"
                                    onClick={() => setShowNotifications(false)}
                                />
                                <div className="absolute right-0 mt-4 w-96 bg-panel border border-muted/10 rounded-3xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                                    <div className="p-5 border-b border-muted/10 flex justify-between items-center bg-bg/20">
                                        <h4 className="font-bold text-sm tracking-tight text-text">
                                            Notifications
                                            {unreadCount > 0 && (
                                                <span className="ml-2 text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">{unreadCount}</span>
                                            )}
                                        </h4>
                                        <button
                                            onClick={markAllAsRead}
                                            className="text-[10px] text-text/60 font-bold uppercase tracking-widest hover:text-text transition-colors bg-bg px-2 py-1 rounded-lg"
                                        >
                                            Mark all read
                                        </button>
                                    </div>
                                    <div className="max-h-[440px] overflow-y-auto hide-scroll">
                                        {notifications.length === 0 ? (
                                            <div className="p-8 text-center text-muted">
                                                <Bell size={32} className="mx-auto mb-2 opacity-50" />
                                                <p className="text-sm">No notifications yet</p>
                                            </div>
                                        ) : (
                                            notifications.map(n => (
                                                <div
                                                    key={n.id}
                                                    className={`p-4 hover:bg-bg/40 transition-all border-b border-muted/5 flex gap-4 cursor-pointer group relative ${!n.is_read ? 'bg-bg/20' : ''}`}
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
                                                        <p className="text-[13px] font-medium text-text leading-snug mb-1 line-clamp-2">{n.message}</p>
                                                        <span className="text-[10px] font-bold text-muted uppercase tracking-wider">{formatTimeAgo(n.created_at)}</span>
                                                    </div>
                                                    {!n.is_read && (
                                                        <div className="w-2 h-2 rounded-full bg-blue-500 absolute right-4 top-1/2 -translate-y-1/2"></div>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                    <div className="p-4 bg-bg/20 text-center">
                                        <button
                                            onClick={() => {
                                                setActiveTab('settings');
                                                setShowNotifications(false);
                                            }}
                                            className="text-xs font-bold text-muted hover:text-text transition-all tracking-wide uppercase"
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
                        className="w-11 h-11 rounded-2xl overflow-hidden border-2 border-muted/5 shadow-sm hover:border-text/20 hover:scale-105 transition-all duration-300 p-0.5 bg-panel"
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

