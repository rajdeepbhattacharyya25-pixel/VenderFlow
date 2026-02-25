import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
    BarChart3,
    Users,
    ShoppingBag,
    ShoppingCart,
    Mail,
    Settings,
    FileText,
    LogOut,
    Shield,
    Search,
    Bell,
    PlusCircle,
    Menu,
    Command,
    X,
    TrendingUp
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import CommandPalette from './components/CommandPalette';
import NotificationCenter from './components/NotificationCenter';
import { notifyAdmin } from '../../lib/notifications';

const AdminLayout: React.FC = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isMobile, setIsMobile] = useState(false);
    const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
    const navigate = useNavigate();

    // Responsive detection
    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth <= 768;
            setIsMobile(mobile);
            if (mobile) {
                setIsSidebarOpen(false);
            } else {
                setIsSidebarOpen(true);
            }
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Set page title and theme for admin section
    useEffect(() => {
        document.title = 'Rajdeep Admin';
        document.documentElement.classList.add('dark');

        return () => {
            // Let Storefront handle its own theme state
        };
    }, []);

    // Session Timeout Logic - reads from platform_settings
    useEffect(() => {
        let lastActivity = Date.now();
        let interval: NodeJS.Timeout | null = null;
        let timeoutMinutes = 15; // Default fallback

        const updateActivity = () => {
            lastActivity = Date.now();
        };

        const checkActivity = () => {
            // -1 means "never" timeout
            if (timeoutMinutes <= 0) return;

            const TIMEOUT_MS = timeoutMinutes * 60 * 1000;
            if (Date.now() - lastActivity > TIMEOUT_MS) {
                if (interval) clearInterval(interval);
                handleLogout('timeout');
            }
        };

        // Fetch timeout setting from database
        const fetchTimeoutSetting = async () => {
            try {
                const { data } = await supabase
                    .from('platform_settings')
                    .select('session_timeout_minutes')
                    .limit(1)
                    .single();

                if (data?.session_timeout_minutes) {
                    timeoutMinutes = data.session_timeout_minutes;
                    console.log(`Session timeout set to: ${timeoutMinutes === -1 ? 'Never' : timeoutMinutes + ' minutes'}`);
                }
            } catch (error) {
                console.error('Error fetching session timeout:', error);
            }
        };

        // Initialize
        fetchTimeoutSetting();

        // Listen for user activity
        window.addEventListener('mousemove', updateActivity);
        window.addEventListener('keypress', updateActivity);
        window.addEventListener('click', updateActivity);
        window.addEventListener('scroll', updateActivity);
        window.addEventListener('touchstart', updateActivity);

        // Check every minute
        interval = setInterval(checkActivity, 60 * 1000);

        // LOGGING: Admin Access (Throttled to once per hour)
        const logAdminAccess = async () => {
            const lastLog = localStorage.getItem('last_admin_log');
            const now = Date.now();

            if (!lastLog || now - parseInt(lastLog) > 60 * 60 * 1000) {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    await supabase.from('audit_logs').insert({
                        actor_id: user.id,
                        action: 'admin_login',
                        target_type: 'platform',
                        target_id: null,
                        metadata: {
                            ip: 'client-side',
                            agent: navigator.userAgent
                        }
                    });
                    localStorage.setItem('last_admin_log', now.toString());
                }
            }
        };
        logAdminAccess();

        return () => {
            window.removeEventListener('mousemove', updateActivity);
            window.removeEventListener('keypress', updateActivity);
            window.removeEventListener('click', updateActivity);
            window.removeEventListener('scroll', updateActivity);
            window.removeEventListener('touchstart', updateActivity);
            if (interval) clearInterval(interval);
        };
    }, []);

    const handleLogout = async (reason?: string) => {
        if (reason === 'timeout') {
            try {
                await notifyAdmin({
                    type: 'SYSTEM_ALERT',
                    message: 'Admin session expired due to inactivity. You have been logged out.'
                });
            } catch (err) {
                console.error('Failed to send timeout notification:', err);
            }
        }
        await supabase.auth.signOut();
        navigate('/?mode=seller');
    };

    // Keyboard shortcuts
    useKeyboardShortcuts({
        onCommandPalette: () => setIsCommandPaletteOpen(true),
        onShowHelp: () => {
            console.log('Shortcuts active');
        }
    });

    const navItems = [
        { icon: BarChart3, label: 'Dashboard', path: '/admin', shortcut: 'R D' },
        { icon: FileText, label: 'Applications', path: '/admin/applications', shortcut: 'R E' },
        { icon: Users, label: 'Sellers', path: '/admin/sellers', shortcut: 'R S' },
        { icon: ShoppingBag, label: 'Products', path: '/admin/products', shortcut: 'R P' },
        { icon: ShoppingCart, label: 'Orders', path: '/admin/orders', shortcut: 'R O' },
        { icon: Mail, label: 'Invites', path: '/admin/invites', shortcut: 'R I' },
        { icon: FileText, label: 'Audit Logs', path: '/admin/logs', shortcut: 'R L' },
        { icon: TrendingUp, label: 'Analytics', path: '/admin/analytics', shortcut: 'R A' },
        { icon: Settings, label: 'Settings', path: '/admin/settings' },
    ];

    const closeMobileSidebar = () => {
        if (isMobile) setIsSidebarOpen(false);
    };

    return (
        <div className="min-h-screen bg-neutral-950 text-neutral-200 font-sans selection:bg-indigo-500/30">
            {/* Command Palette */}
            <CommandPalette
                isOpen={isCommandPaletteOpen}
                onClose={() => setIsCommandPaletteOpen(false)}
            />

            {/* Mobile Overlay Backdrop */}
            {isMobile && isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={closeMobileSidebar}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed top-0 left-0 h-full bg-neutral-900 border-r border-neutral-800 transition-all duration-300 z-50 flex flex-col
                    ${isMobile
                        ? (isSidebarOpen ? 'translate-x-0 w-[280px]' : '-translate-x-full w-[280px]')
                        : (isSidebarOpen ? 'w-64' : 'w-20')
                    }
                `}
            >
                <div className="h-16 flex items-center justify-between px-5 border-b border-neutral-800 shrink-0">
                    <NavLink to="/admin" onClick={closeMobileSidebar} className="flex items-center gap-3 hover:opacity-80 transition-opacity min-w-0">
                        <img src="/logo.jpg" alt="Admin Logo" className="w-8 h-8 rounded-lg object-contain flex-shrink-0" />
                        {(isSidebarOpen || isMobile) && <span className="font-bold text-xl tracking-tight text-white truncate">Rajdeep <span className="text-indigo-500 font-medium text-sm">ADMIN</span></span>}
                    </NavLink>
                    {/* Close button on mobile */}
                    {isMobile && isSidebarOpen && (
                        <button
                            onClick={closeMobileSidebar}
                            className="w-11 h-11 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
                            aria-label="Close sidebar"
                            style={{ WebkitTapHighlightColor: 'transparent' }}
                        >
                            <X size={20} />
                        </button>
                    )}
                </div>

                <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.path === '/admin'}
                            onClick={closeMobileSidebar}
                            className={({ isActive }) => `
                                flex items-center p-3 rounded-xl transition-all duration-200 group relative
                                ${isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}
                            `}
                            style={{ WebkitTapHighlightColor: 'transparent' }}
                        >
                            <item.icon size={20} className="min-w-[20px]" />
                            {(isSidebarOpen || isMobile) && (
                                <>
                                    <span className="ml-3 font-medium text-sm">{item.label}</span>
                                    {item.shortcut && !isMobile && (
                                        <kbd className="ml-auto text-[9px] bg-black/20 px-1.5 py-0.5 rounded opacity-50">
                                            {item.shortcut}
                                        </kbd>
                                    )}
                                </>
                            )}
                            {!isSidebarOpen && !isMobile && (
                                <div className="absolute left-16 px-2 py-1 bg-neutral-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 border border-neutral-700">
                                    {item.label}
                                </div>
                            )}
                        </NavLink>
                    ))}

                    <div className="pt-4 mt-4 border-t border-neutral-800">
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center p-3 rounded-xl text-neutral-400 hover:bg-red-500/10 hover:text-red-500 transition-all duration-200"
                            style={{ WebkitTapHighlightColor: 'transparent' }}
                        >
                            <LogOut size={20} className="min-w-[20px]" />
                            {(isSidebarOpen || isMobile) && <span className="ml-3 font-medium text-sm">Logout</span>}
                        </button>
                    </div>
                </nav>
            </aside>

            {/* Main Content */}
            <div className={`transition-all duration-300 ${isMobile ? 'pl-0' : isSidebarOpen ? 'pl-64' : 'pl-20'}`}>
                {/* Header */}
                <header className="h-14 md:h-16 bg-neutral-900/50 backdrop-blur-xl border-b border-neutral-800 flex items-center justify-between px-4 md:px-8 sticky top-0 z-40">
                    <div className="flex items-center gap-2 md:gap-4">
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="w-11 h-11 flex items-center justify-center hover:bg-neutral-800 rounded-lg transition-colors text-neutral-400 active:bg-neutral-700"
                            title={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
                            aria-label="Toggle sidebar"
                            style={{ WebkitTapHighlightColor: 'transparent' }}
                        >
                            <Menu size={20} />
                        </button>
                        {/* Search Trigger - Opens Command Palette */}
                        <button
                            onClick={() => setIsCommandPaletteOpen(true)}
                            className="hidden md:flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 border-none rounded-full py-2 pl-4 pr-3 text-sm w-96 transition-all text-left"
                        >
                            <Search className="w-4 h-4 text-neutral-500" />
                            <span className="text-neutral-500 flex-1">Search platform...</span>
                            <kbd className="text-[10px] bg-neutral-700 px-1.5 py-0.5 rounded text-neutral-400 flex items-center gap-0.5">
                                <Command size={10} />K
                            </kbd>
                        </button>
                        {/* Mobile search icon */}
                        <button
                            onClick={() => setIsCommandPaletteOpen(true)}
                            className="md:hidden w-11 h-11 flex items-center justify-center hover:bg-neutral-800 rounded-lg transition-colors text-neutral-400"
                            aria-label="Search"
                            style={{ WebkitTapHighlightColor: 'transparent' }}
                        >
                            <Search size={20} />
                        </button>
                    </div>

                    <div className="flex items-center gap-2 md:gap-4">
                        <button
                            onClick={() => navigate('/admin/invites')}
                            className="hidden md:flex min-h-[44px] border border-neutral-800 bg-indigo-600/10 text-indigo-400 rounded-lg hover:bg-indigo-600/20 transition-all items-center gap-2 text-sm font-medium px-4"
                        >
                            <PlusCircle size={16} />
                            Invite Seller
                        </button>
                        {/* Mobile: icon-only invite button */}
                        <button
                            onClick={() => navigate('/admin/invites')}
                            className="md:hidden w-11 h-11 flex items-center justify-center bg-indigo-600/10 text-indigo-400 rounded-lg hover:bg-indigo-600/20 transition-colors"
                            aria-label="Invite Seller"
                            style={{ WebkitTapHighlightColor: 'transparent' }}
                        >
                            <PlusCircle size={18} />
                        </button>
                        <NotificationCenter />
                        <img src="/logo.jpg" alt="VenderFlow Logo" className="w-8 h-8 rounded-full border border-white/10 object-cover hidden md:block" />
                    </div>
                </header>

                <main className="p-4 md:p-6 lg:p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;
