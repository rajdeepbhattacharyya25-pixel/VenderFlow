import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
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
    TrendingUp,
    ShieldAlert,
    Gavel,
    Sparkles,
    ChevronDown,
    ChevronRight,
    LayoutDashboard,
    Activity
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import CommandPalette from './components/CommandPalette';
import NotificationCenter from './components/NotificationCenter';
import FinancialOracle from './components/FinancialOracle';
import TopAlertBar from './components/TopAlertBar';
import { notifyAdmin } from '../../lib/notifications';

interface NavItem {
    icon: React.ElementType;
    label: string;
    path: string;
    shortcut?: string;
}

interface NavGroup {
    title: string;
    items: NavItem[];
}

const AdminLayout: React.FC = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isMobile, setIsMobile] = useState(false);
    const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
    const [isOracleOpen, setIsOracleOpen] = useState(false);
    const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
    
    const navigate = useNavigate();
    const location = useLocation();

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

    // Set page title and theme
    useEffect(() => {
        document.title = 'VendorFlow Admin';
        document.documentElement.classList.add('dark');
    }, []);

    const handleLogout = React.useCallback(async (reason?: string) => {
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
    }, [navigate]);

    // Session Timeout Logic
    useEffect(() => {
        let lastActivity = Date.now();
        let interval: NodeJS.Timeout | null = null;
        let timeoutMinutes = 15;

        const updateActivity = () => {
            lastActivity = Date.now();
        };

        const checkActivity = () => {
            if (timeoutMinutes <= 0) return;
            const TIMEOUT_MS = timeoutMinutes * 60 * 1000;
            if (Date.now() - lastActivity > TIMEOUT_MS) {
                if (interval) clearInterval(interval);
                handleLogout('timeout');
            }
        };

        const fetchTimeoutSetting = async () => {
            try {
                const { data } = await supabase
                    .from('platform_settings')
                    .select('session_timeout_minutes')
                    .limit(1)
                    .single();

                if (data?.session_timeout_minutes) {
                    timeoutMinutes = data.session_timeout_minutes;
                }
            } catch (error) {
                console.error('Error fetching session timeout:', error);
            }
        };

        fetchTimeoutSetting();

        window.addEventListener('mousemove', updateActivity);
        window.addEventListener('keypress', updateActivity);
        window.addEventListener('click', updateActivity);
        window.addEventListener('scroll', updateActivity);
        window.addEventListener('touchstart', updateActivity);

        interval = setInterval(checkActivity, 60 * 1000);

        return () => {
            window.removeEventListener('mousemove', updateActivity);
            window.removeEventListener('keypress', updateActivity);
            window.removeEventListener('click', updateActivity);
            window.removeEventListener('scroll', updateActivity);
            window.removeEventListener('touchstart', updateActivity);
            if (interval) clearInterval(interval);
        };
    }, [handleLogout]);

    // Keyboard shortcuts
    useKeyboardShortcuts({
        onCommandPalette: () => setIsCommandPaletteOpen(true),
        onShowHelp: () => console.log('Shortcuts active')
    });

    const navGroups: NavGroup[] = [
        {
            title: 'Core Ops',
            items: [
                { icon: LayoutDashboard, label: 'Control Hub', path: '/admin', shortcut: 'R D' },
                { icon: ShoppingBag, label: 'Products & Stock', path: '/admin/products', shortcut: 'R P' },
                { icon: ShoppingCart, label: 'Orders & Flow', path: '/admin/orders', shortcut: 'R O' },
                { icon: TrendingUp, label: 'Growth Oracle', path: '/admin/analytics', shortcut: 'R A' },
            ]
        },
        {
            title: 'Sellers & Trust',
            items: [
                { icon: FileText, label: 'Applications', path: '/admin/applications', shortcut: 'R E' },
                { icon: Users, label: 'Merchant Index', path: '/admin/sellers', shortcut: 'R S' },
                { icon: Mail, label: 'Recruitment', path: '/admin/invites', shortcut: 'R I' },
                { icon: Gavel, label: 'Resolution Center', path: '/admin/disputes', shortcut: 'R J' },
            ]
        },
        {
            title: 'System & Safety',
            items: [
                { icon: ShieldAlert, label: 'Payout Shields', path: '/admin/payouts', shortcut: 'R G' },
                { icon: Bell, label: 'Comm Center', path: '/admin/notifications', shortcut: 'R N' },
                { icon: Activity, label: 'Audit Matrix', path: '/admin/logs', shortcut: 'R L' },
                { icon: Settings, label: 'System Prefs', path: '/admin/settings' },
            ]
        }
    ];

    const toggleGroup = (title: string) => {
        setCollapsedGroups(prev => ({ ...prev, [title]: !prev[title] }));
    };

    const closeMobileSidebar = () => {
        if (isMobile) setIsSidebarOpen(false);
    };

    return (
        <div className="min-h-screen bg-[#05060B] text-white selection:bg-emerald-500/30 overflow-x-hidden">
            {/* Command Palette */}
            <CommandPalette
                isOpen={isCommandPaletteOpen}
                onClose={() => setIsCommandPaletteOpen(false)}
            />

            {/* Mobile Overlay */}
            {isMobile && isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/80 z-[60] backdrop-blur-md animate-in fade-in duration-300"
                    onClick={closeMobileSidebar}
                />
            )}

            {/* Sidebar HUD */}
            <aside
                className={`fixed top-0 left-0 h-full bg-[#0B0F19] border-r border-white/5 transition-all duration-300 z-[70] flex flex-col
                    ${isMobile
                        ? (isSidebarOpen ? 'translate-x-0 w-[280px]' : '-translate-x-full w-[280px]')
                        : (isSidebarOpen ? 'w-64' : 'w-20')
                    }
                `}
            >
                {/* HUD Header */}
                <div className="h-16 flex items-center justify-between px-5 border-b border-white/5 shrink-0 bg-gradient-to-b from-indigo-500/5 to-transparent">
                    <NavLink to="/admin" onClick={closeMobileSidebar} className="flex items-center gap-3 hover:opacity-80 transition-opacity min-w-0">
                        <div className="w-10 h-10 rounded-full bg-indigo-600/20 border border-indigo-500/50 flex items-center justify-center p-1.5 shadow-[0_0_20px_rgba(99,102,241,0.2)]">
                            <span className="text-indigo-400 font-mono font-bold text-xs">VF</span>
                        </div>
                        {(isSidebarOpen || isMobile) && (
                            <span className="font-mono font-bold text-lg tracking-[0.3em] text-white truncate uppercase">
                                VENDERFLOW
                            </span>
                        )}
                    </NavLink>
                    {isMobile && isSidebarOpen && (
                        <button 
                            onClick={closeMobileSidebar} 
                            className="text-neutral-500 hover:text-white transition-colors p-2"
                        >
                            <X size={20} />
                        </button>
                    )}
                </div>

                {/* Navigation HUD */}
                <nav className="flex-1 py-6 px-3 space-y-8 overflow-y-auto custom-scrollbar">
                    {navGroups.map((group) => (
                        <div key={group.title} className="space-y-2">
                            {(isSidebarOpen || isMobile) && (
                                <button 
                                    onClick={() => toggleGroup(group.title)}
                                    className="flex items-center justify-between w-full px-3 mb-2 text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-neutral-500 group"
                                >
                                    <span className="group-hover:text-emerald-500 transition-colors">{group.title}</span>
                                    {collapsedGroups[group.title] ? <ChevronRight size={10} /> : <ChevronDown size={10} />}
                                </button>
                            )}
                            
                            {!collapsedGroups[group.title] && (
                                <div className="space-y-1">
                                    {group.items.map((item) => (
                                        <NavLink
                                            key={item.path}
                                            to={item.path}
                                            end={item.path === '/admin'}
                                            onClick={closeMobileSidebar}
                                            className={({ isActive }) => `
                                                flex items-center p-2.5 rounded-sm transition-all duration-200 group relative
                                                ${isActive 
                                                    ? 'bg-emerald-500/10 text-emerald-400 border-l-2 border-emerald-500 shadow-[inset_10px_0_15px_rgba(16,185,129,0.05)]' 
                                                    : 'text-neutral-500 hover:bg-white/5 hover:text-neutral-200'}
                                            `}
                                        >
                                            <item.icon size={18} className={`min-w-[18px] ${location.pathname === item.path ? 'text-indigo-500' : 'group-hover:text-indigo-400 transition-colors'}`} />
                                            {(isSidebarOpen || isMobile) && (
                                                <>
                                                    <span className="ml-3 font-mono text-xs lowercase tracking-wider">{item.label}</span>
                                                    {item.shortcut && !isMobile && (
                                                        <kbd className="ml-auto text-[8px] font-mono bg-white/5 border border-white/10 px-1 py-0.5 rounded-sm opacity-30 group-hover:opacity-60 transition-opacity uppercase">
                                                            {item.shortcut}
                                                        </kbd>
                                                    )}
                                                </>
                                            )}
                                        </NavLink>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </nav>

                {/* Sidebar Footer */}
                <div className="p-4 border-t border-white/5 space-y-4">
                    <button
                        onClick={() => handleLogout()}
                        className="w-full flex items-center p-2.5 rounded-sm text-neutral-500 hover:bg-red-500/10 hover:text-red-500 transition-all group font-mono text-xs uppercase tracking-widest"
                    >
                        <LogOut size={18} className="min-w-[18px]" />
                        {(isSidebarOpen || isMobile) && <span className="ml-3">Deactivate</span>}
                    </button>
                </div>
            </aside>

            {/* Main Viewport */}
            <div className={`transition-all duration-300 ${isMobile ? 'pl-0' : isSidebarOpen ? 'pl-64' : 'pl-20'}`}>
                {/* Real-time Alert Layer */}
                <TopAlertBar />

                {/* Header */}
                <header className="h-16 border-b border-white/5 bg-[#0B0F19]/80 backdrop-blur-md sticky top-8 z-50 px-4 md:px-8 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="w-10 h-10 flex items-center justify-center hover:bg-white/5 rounded-sm transition-colors text-neutral-500 border border-transparent hover:border-white/10"
                        >
                            <Menu size={20} />
                        </button>
                        
                        <div className="hidden md:flex items-center gap-2 text-[10px] font-mono text-neutral-600 uppercase tracking-[0.2em]">
                            <span className="text-indigo-500/80">platform_admin</span>
                            <span className="text-neutral-800">/</span>
                            <span className="text-neutral-400">{location.pathname === '/admin' ? 'hub' : location.pathname.split('/').pop()?.toLowerCase()}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Search Trigger */}
                        <button
                            onClick={() => setIsCommandPaletteOpen(true)}
                            className="hidden lg:flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-sm py-2 px-4 text-[11px] font-mono w-64 transition-all text-left group"
                        >
                            <Search size={14} className="text-neutral-500 group-hover:text-indigo-500 transition-colors" />
                            <span className="text-neutral-500 flex-1 lowercase">search core nodes...</span>
                            <kbd className="text-[10px] bg-emerald-500/20 px-1.5 py-0.5 rounded-sm text-emerald-400 border border-emerald-500/30 flex items-center gap-0.5">
                                <Command size={10} />K
                            </kbd>
                        </button>

                        <button
                            onClick={() => navigate('/admin/invites')}
                            className="hidden md:flex px-4 py-2 border border-white/10 bg-white/5 text-white rounded-sm hover:bg-white/10 transition-all font-mono text-xs uppercase tracking-widest items-center gap-2"
                        >
                            <PlusCircle size={14} className="text-emerald-500" />
                            <span>Invite Seller</span>
                        </button>

                        <button
                            onClick={() => setIsOracleOpen(true)}
                            className="w-10 h-10 flex items-center justify-center bg-emerald-500/10 text-emerald-400 rounded-sm border border-emerald-500/20 hover:bg-emerald-500/20 transition-all group relative overflow-hidden"
                        >
                            <Sparkles size={18} className="group-hover:scale-110 transition-transform" />
                        </button>

                        <NotificationCenter />
                        
                        <div className="flex items-center gap-3 ml-2 pl-4 border-l border-white/10">
                             <div className="text-right hidden sm:block">
                                <p className="text-[9px] font-mono text-neutral-600 uppercase leading-none mb-1">Authenticated</p>
                                <p className="text-xs font-bold text-white leading-none font-mono">RAJDEEP_B</p>
                             </div>
                             <img src="/logo.jpg" alt="Admin" className="w-8 h-8 rounded-sm grayscale hover:grayscale-0 transition-all cursor-pointer border border-white/10" />
                        </div>
                    </div>
                </header>

                <main className="px-4 md:px-6 lg:px-8 pt-2 pb-8 min-h-[calc(100vh-4rem)]">
                    <Outlet />
                </main>
            </div>

            {/* Financial Oracle Sidebar */}
            <FinancialOracle 
                isOpen={isOracleOpen} 
                onClose={() => setIsOracleOpen(false)} 
            />

            {/* Global HUD Scanning Line */}
            <div className="fixed inset-0 pointer-events-none z-[100] scanline opacity-[0.03]"></div>
        </div>
    );
};

export default AdminLayout;
