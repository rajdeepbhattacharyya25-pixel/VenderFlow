import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Users,
    ShoppingBag,
    ShoppingCart,
    Activity,
    ArrowUpRight,
    ArrowDownRight,
    Plus,
    AlertCircle,
    X,
    Download,
    Megaphone,
    MessageSquare
} from 'lucide-react';
import { adminDb } from '../../lib/admin-api';
import RevenueChart from './components/RevenueChart';
import AdminSupportModal from './components/AdminSupportModal';
import { supabase } from '../../lib/supabase';

interface AdminStats {
    totalSellers: number;
    sellerChange: number;
    liveRevenue: number;
    revenueChange: number;
    activeOrders: number;
    ordersChange: number;
    sysHealth: number;
    healthStatus: string;
    productCount?: number;
    imageCount?: number;
    estimatedStorageMB?: number;
    storagePercentage?: number;
    healthIssues?: string[];
    totalAvailable: number;
    totalReserves: number;
    totalNegative: number;
}

interface ActivityItem {
    id: string;
    type: string;
    user: string;
    detail: string;
    time: string;
    status: string;
}

interface Alert {
    id: string;
    message: string;
    severity: 'critical' | 'warning' | 'info';
    actionLabel?: string;
    actionUrl?: string;
}

const AdminDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<AdminStats>({
        totalSellers: 0,
        sellerChange: 0,
        liveRevenue: 0,
        revenueChange: 0,
        activeOrders: 0,
        ordersChange: 0,
        sysHealth: 99.9,
        healthStatus: 'Normal',
        totalAvailable: 0,
        totalReserves: 0,
        totalNegative: 0
    });
    const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [unreadSupportCount, setUnreadSupportCount] = useState(0);
    const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
    const [showSupportModal, setShowSupportModal] = useState(false);
    const [announcementTitle, setAnnouncementTitle] = useState('');
    const [announcementContent, setAnnouncementContent] = useState('');
    const [announcementType, setAnnouncementType] = useState<'info' | 'warning' | 'update'>('info');
    const [targetType, setTargetType] = useState<'platform' | 'seller'>('platform');
    const [targetSellerId, setTargetSellerId] = useState<string>('');
    const [sellerSearch, setSellerSearch] = useState('');
    const [sellerResults, setSellerResults] = useState<any[]>([]);
    const [searchingSellers, setSearchingSellers] = useState(false);
    const [selectedSellerName, setSelectedSellerName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    useEffect(() => {
        const searchSellers = async () => {
            if (targetType !== 'seller') {
                setSellerResults([]);
                return;
            }

            setSearchingSellers(true);
            try {
                const params = sellerSearch.trim()
                    ? { search: sellerSearch, limit: 5 }
                    : { limit: 5 };

                const result = await adminDb.listSellers(params);
                setSellerResults(result.sellers || []);
            } catch (error) {
                console.error('Error searching sellers:', error);
            } finally {
                setSearchingSellers(false);
            }
        };

        const timeoutId = setTimeout(searchSellers, 300);
        return () => clearTimeout(timeoutId);
    }, [sellerSearch, targetType]);

    useEffect(() => {
        const channel = supabase
            .channel('dashboard-support-count')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, () => {
                adminDb.getUnreadSupportCount().then(setUnreadSupportCount);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const [statsData, activityData, alertsData, unreadCount] = await Promise.all([
                adminDb.getAdminStats(),
                adminDb.getRecentActivity(5),
                adminDb.getCriticalAlerts(),
                adminDb.getUnreadSupportCount()
            ]);

            setStats(statsData);
            setRecentActivity(activityData);
            setAlerts(alertsData);
            setUnreadSupportCount(unreadCount);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleExportReport = async () => {
        try {
            const report = await adminDb.exportReport('all');
            let csv = 'SELLERS REPORT\nID,Store Name,Plan,Status,Active,Created At\n';
            report.sellers?.forEach(s => {
                csv += `${s.id},"${s.store_name}",${s.plan},${s.status},${s.is_active},${s.created_at}\n`;
            });
            csv += '\nORDERS REPORT\nID,Total,Status,Created At,Seller ID\n';
            report.orders?.forEach(o => {
                csv += `${o.id},${o.total},${o.status},${o.created_at},${o.seller_id}\n`;
            });

            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `platform-report-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error exporting report:', error);
        }
    };

    const handleCreateAnnouncement = async () => {
        if (!announcementTitle.trim() || !announcementContent.trim()) return;
        if (targetType === 'seller' && !targetSellerId) return;

        setIsSubmitting(true);
        try {
            const result = await adminDb.createAnnouncement({
                title: announcementTitle,
                content: announcementContent,
                type: announcementType,
                targetType,
                targetId: targetSellerId || undefined
            });

            if (result.success) {
                setShowAnnouncementModal(false);
                setAnnouncementTitle('');
                setAnnouncementContent('');
                setTargetType('platform');
                setTargetSellerId('');
                setSelectedSellerName('');
                setSellerSearch('');
                fetchDashboardData();
            }
        } catch (error) {
            console.error('Error creating announcement:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatCurrency = (value: number | undefined | null) => {
        if (value === undefined || value === null) return '₹0';
        if (value >= 100000) {
            return `₹${(value / 100000).toFixed(2)}L`;
        } else if (value >= 1000) {
            return `₹${(value / 1000).toFixed(1)}K`;
        }
        return `₹${value.toLocaleString('en-IN')}`;
    };

    const statsDisplay = [
        {
            label: "Total Sales (GMV)",
            value: loading ? '...' : formatCurrency(stats.liveRevenue),
            subtext: `Commission: ${formatCurrency(stats.liveRevenue * 0.1)}`,
            change: `${stats.revenueChange >= 0 ? '+' : ''}${stats.revenueChange}%`,
            isPositive: stats.revenueChange >= 0,
            icon: Activity,
            color: 'text-indigo-400',
            bg: 'bg-indigo-500/10'
        },
        {
            label: 'Platform Reserves',
            value: loading ? '...' : formatCurrency(stats.totalReserves),
            subtext: 'Locked for 7 days',
            change: 'Stable',
            isPositive: true,
            icon: AlertCircle,
            color: 'text-amber-400',
            bg: 'bg-amber-500/10'
        },
        {
            label: 'Net Payables',
            value: loading ? '...' : formatCurrency(stats.totalAvailable),
            subtext: 'Available for seller payout',
            change: '+2.4%',
            isPositive: true,
            icon: ShoppingBag,
            color: 'text-emerald-400',
            bg: 'bg-emerald-500/10'
        },
        {
            label: 'Active Sellers',
            value: loading ? '...' : stats.totalSellers.toString(),
            subtext: `${stats.totalNegative > 0 ? formatCurrency(stats.totalNegative) + ' in recovery' : 'All balances healthy'}`,
            change: `${stats.sellerChange >= 0 ? '+' : ''}${stats.sellerChange}%`,
            isPositive: stats.sellerChange >= 0,
            icon: Users,
            color: 'text-blue-400',
            bg: 'bg-blue-500/10'
        },
    ];

    const opsStatsDisplay = [
        {
            label: 'Pending Approvals',
            value: '6',
            icon: AlertCircle,
            color: 'text-amber-500',
            bg: 'bg-amber-500/10',
            border: 'border-amber-500/30'
        },
        {
            label: 'Withdrawal Requests',
            value: '3',
            icon: AlertCircle,
            color: 'text-amber-500',
            bg: 'bg-amber-500/10',
            border: 'border-amber-500/30'
        },
        {
            label: 'Support Tickets',
            value: unreadSupportCount.toString() || '12',
            icon: MessageSquare,
            color: 'text-red-500',
            bg: 'bg-red-500/10',
            border: 'border-red-500/30'
        },
        {
            label: 'Flagged Orders',
            value: '2',
            icon: AlertCircle,
            color: 'text-red-500',
            bg: 'bg-red-500/10',
            border: 'border-red-500/30'
        }
    ];

    return (
        <div className="admin-hud-content min-h-screen bg-[#0B0F19] text-neutral-100 px-4 md:px-6 pt-2 space-y-6">
            <div className="hud-scanlines pointer-events-none fixed inset-0 z-50 opacity-[0.03]"></div>
            
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/5 pb-4">
                <div>
                    <h1 className="text-3xl font-mono lowercase tracking-tight text-white mb-2">vendorflow command center</h1>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
                        <p className="text-emerald-500 text-xs font-mono uppercase tracking-[0.2em]">System Status: OPERATIONAL</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowSupportModal(true)}
                        className="flex items-center gap-2 px-6 py-2.5 bg-[#111827] hover:bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 transition-all font-mono text-xs tracking-widest relative"
                    >
                        <MessageSquare size={14} />
                        <span>TICKETS</span>
                        {unreadSupportCount > 0 && (
                            <span className="absolute -top-2 -right-2 bg-red-500 text-[10px] font-bold text-white px-1.5 py-0.5 border border-[#0B0F19]">
                                {unreadSupportCount}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setShowAnnouncementModal(true)}
                        className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white transition-all font-mono text-xs tracking-widest border border-indigo-400"
                    >
                        <Megaphone size={14} />
                        <span>BROADCAST</span>
                    </button>
                </div>
            </div>

            {/* Main Layout Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">

                {/* LEFT MAIN CONTENT (75%) */}
                <div className="xl:col-span-3 space-y-8">

                    {/* TOP METRICS (Row 1) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {statsDisplay.map((stat, i) => (
                            <div key={i} className="hud-glass border border-white/5 p-6 relative group overflow-hidden">
                                <div className="absolute top-0 right-0 p-1">
                                    <div className="w-4 h-4 border-t border-r border-white/10 group-hover:border-indigo-500/50 transition-colors"></div>
                                </div>
                                <div className="flex items-center justify-between mb-4">
                                    <div className={`p-2 bg-white/5 ${stat.color} border border-white/5`}>
                                        <stat.icon size={18} />
                                    </div>
                                    <div className={`flex items-center text-[10px] font-mono ${stat.isPositive ? 'text-emerald-400' : 'text-amber-400'}`}>
                                        {stat.change}
                                    </div>
                                </div>
                                <h3 className="text-2xl font-mono font-bold text-white mb-1">{stat.value}</h3>
                                <p className="text-neutral-500 text-[10px] font-mono uppercase tracking-[0.1em]">{stat.label}</p>
                                <div className="mt-4 pt-4 border-t border-white/5">
                                    <p className="text-neutral-600 text-[9px] font-mono">{stat.subtext}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* OPERATIONS METRICS (Row 2) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {opsStatsDisplay.map((stat, i) => (
                            <div key={i} className={`hud-glass border ${stat.border} p-5 transition-all group relative`}>
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-neutral-400 text-[10px] font-mono uppercase tracking-[0.1em]">{stat.label}</p>
                                    <stat.icon size={16} className={stat.color} />
                                </div>
                                <div className="flex items-baseline gap-3">
                                    <h3 className={`text-3xl font-mono font-bold ${stat.color}`}>{stat.value}</h3>
                                    {parseInt(stat.value) > 0 && (
                                        <span className="animate-pulse text-[10px] font-mono text-neutral-600">ACTION REQUIRED</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* CHARTS (Row 3) */}
                    <div className="hud-glass border border-white/5 overflow-hidden">
                        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                            <div className="flex items-center gap-3 text-indigo-400">
                                <Activity size={18} />
                                <h2 className="text-sm font-mono font-bold uppercase tracking-[0.2em]">revenue growth matrix</h2>
                            </div>
                            <div className="flex bg-black/40 p-1 border border-white/5">
                                {['today', '7 days', '30 days', '12 months'].map((filter, i) => (
                                    <button key={i} className={`px-4 py-1.5 text-[10px] font-mono uppercase ${i === 1 ? 'bg-indigo-600 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)]' : 'text-neutral-500 hover:text-neutral-300'} transition-all`}>
                                        {filter}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="h-[350px] w-full">
                                <RevenueChart />
                            </div>
                        </div>
                    </div>

                    {/* INSIGHTS & FEED (Row 4) */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="hud-glass border border-white/5 p-6">
                            <h3 className="text-xs font-mono font-bold text-neutral-500 uppercase tracking-[0.2em] mb-6 border-b border-white/5 pb-3">top nodes / output</h3>
                            <div className="space-y-4">
                                {[
                                    { name: 'TechStore', value: '₹1.2L', rank: '01', trend: 'up' },
                                    { name: 'FashionHub', value: '₹84K', rank: '02', trend: 'up' },
                                    { name: 'GadgetWorld', value: '₹61K', rank: '03', trend: 'down' }
                                ].map((node, i) => (
                                    <div key={i} className="flex items-center justify-between group">
                                        <div className="flex items-center gap-4">
                                            <span className="text-[10px] font-mono text-neutral-700 font-bold">{node.rank}</span>
                                            <span className="text-sm text-neutral-300 font-mono group-hover:text-white transition-colors">{node.name}</span>
                                        </div>
                                        <span className={`text-sm font-mono ${node.trend === 'up' ? 'text-emerald-400' : 'text-amber-400'}`}>{node.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="hud-glass border border-white/5 p-6">
                            <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-3">
                                <h3 className="text-xs font-mono font-bold text-neutral-500 uppercase tracking-[0.2em]">live telemetry</h3>
                                <div className="flex items-center gap-2 text-[10px] text-emerald-500 font-mono">
                                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div> SYNCED
                                </div>
                            </div>
                            <div className="space-y-5">
                                {(recentActivity.length > 0 ? recentActivity : [
                                    { id: '1', user: 'TechStore', detail: 'added 12 products', time: '02m ago', status: 'success' },
                                    { id: '2', user: 'System', detail: 'Order #18421 processed', time: '14m ago', status: 'info' },
                                    { id: '3', user: 'FashionHub', detail: 'requested payout', time: '32m ago', status: 'warning' },
                                ]).map((act) => (
                                    <div key={act.id} className="border-l-2 border-white/5 pl-4 hover:border-indigo-500/30 transition-colors">
                                        <p className="text-xs font-mono text-neutral-300">
                                            <span className="text-white font-bold block mb-0.5">{act.user}</span>
                                            {act.detail}
                                        </p>
                                        <span className="text-[9px] font-mono text-neutral-600 mt-1 block uppercase">{act.time}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT SIDEBAR (25%) */}
                <div className="space-y-8">
                    {/* QUICK ACTIONS */}
                    <div className="hud-glass border border-white/5 p-6 border-t-2 border-t-indigo-500">
                        <h3 className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-[0.2em] mb-6">command override</h3>
                        <div className="space-y-3">
                            {[
                                { label: 'APPROVE SELLER', icon: Plus, color: 'text-emerald-500', path: '/admin/applications' },
                                { label: 'BAN SELLER', icon: X, color: 'text-red-500', path: '/admin/sellers' },
                                { label: 'EMIT BROADCAST', icon: Megaphone, color: 'text-indigo-400', path: '#' },
                                { label: 'EXPORT DATA', icon: Download, color: 'text-blue-400', action: handleExportReport }
                            ].map((action, i) => (
                                <button 
                                    key={i} 
                                    onClick={() => action.action ? action.action() : navigate(action.path)}
                                    className="w-full flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 hover:border-indigo-500/30 group transition-all"
                                >
                                    <div className="flex items-center gap-3">
                                        <action.icon size={14} className={action.color} />
                                        <span className="text-[10px] font-mono font-bold text-neutral-400 group-hover:text-white">{action.label}</span>
                                    </div>
                                    <ArrowUpRight size={14} className="text-neutral-700 group-hover:text-indigo-400" />
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* SYSTEM HEALTH */}
                    <div className="hud-glass border border-white/5 p-6">
                        <h3 className="text-xs font-mono font-bold text-neutral-500 uppercase tracking-[0.2em] mb-6">system diagnostic</h3>
                        <div className="space-y-6">
                            {[
                                { label: 'API CORE', value: '99.98%', color: 'bg-emerald-500', width: '99%' },
                                { label: 'DB CLUSTER', value: '24%', color: 'bg-blue-500', width: '24%' },
                                { label: 'STORAGE', value: '21%', color: 'bg-amber-500', width: '21%' }
                            ].map((health, i) => (
                                <div key={i}>
                                    <div className="flex items-center justify-between text-[9px] font-mono text-neutral-500 mb-2">
                                        <span>{health.label}</span>
                                        <span>{health.value}</span>
                                    </div>
                                    <div className="h-1 bg-white/5 overflow-hidden">
                                        <div className={`h-full ${health.color} shadow-[0_0_10px_rgba(255,255,255,0.1)]`} style={{ width: health.width }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ALERT QUEUE */}
                    <div className="hud-glass border border-red-500/20 p-6 relative">
                        <div className="absolute top-0 right-0 w-24 h-[1px] bg-red-500/50"></div>
                        <h3 className="text-xs font-mono font-bold text-red-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                            <AlertCircle size={14} /> alert queue
                        </h3>
                        <div className="space-y-4">
                            <div className="bg-red-500/5 border border-red-500/10 p-4">
                                <p className="text-[11px] font-mono text-red-400 mb-1">3 SELLERS PENDING</p>
                                <button onClick={() => navigate('/admin/applications')} className="text-[9px] font-mono text-neutral-600 hover:text-white uppercase underline underline-offset-4">verify source</button>
                            </div>
                            <div className="bg-amber-500/5 border border-amber-500/10 p-4">
                                <p className="text-[11px] font-mono text-amber-400 mb-1">5 PAYOUT REQUESTS</p>
                                <button className="text-[9px] font-mono text-neutral-600 hover:text-white uppercase underline underline-offset-4">authorize transmission</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Announcement Modal */}
            {showAnnouncementModal && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-xl flex items-center justify-center z-[100] p-4">
                    <div className="hud-glass border border-indigo-500/50 w-full max-w-lg p-8 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-indigo-500"></div>
                        <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-indigo-500"></div>
                        <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-indigo-500"></div>
                        <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-indigo-500"></div>

                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-[1px] bg-indigo-500"></div>
                                <h2 className="text-lg font-mono font-bold text-white uppercase tracking-[0.3em]">broadcast emit</h2>
                            </div>
                            <button onClick={() => setShowAnnouncementModal(false)} className="text-neutral-500 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-indigo-400 mb-2">transmission subject</label>
                                <input
                                    type="text"
                                    value={announcementTitle}
                                    onChange={(e) => setAnnouncementTitle(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 p-4 text-sm font-mono text-white focus:outline-none focus:border-indigo-500 transition-colors"
                                    placeholder="Enter subject identifier..."
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-indigo-400 mb-2">message load</label>
                                <textarea
                                    value={announcementContent}
                                    onChange={(e) => setAnnouncementContent(e.target.value)}
                                    rows={4}
                                    className="w-full bg-black/40 border border-white/10 p-4 text-sm font-mono text-white focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                                    placeholder="Enter encrypted message data..."
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-indigo-400 mb-2">target vector</label>
                                <div className="grid grid-cols-2 gap-3 mb-4">
                                    <button
                                        onClick={() => setTargetType('platform')}
                                        className={`p-3 border text-[10px] font-mono uppercase tracking-widest transition-all ${targetType === 'platform' ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-white/5 border-white/10 text-neutral-500 hover:border-white/20'}`}
                                    >
                                        GLOBAL BROADCAST
                                    </button>
                                    <button
                                        onClick={() => setTargetType('seller')}
                                        className={`p-3 border text-[10px] font-mono uppercase tracking-widest transition-all ${targetType === 'seller' ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-white/5 border-white/10 text-neutral-500 hover:border-white/20'}`}
                                    >
                                        DIRECT NODE LINK
                                    </button>
                                </div>

                                {targetType === 'seller' && (
                                    <div className="relative">
                                        {!selectedSellerName ? (
                                            <input
                                                type="text"
                                                value={sellerSearch}
                                                onChange={(e) => setSellerSearch(e.target.value)}
                                                className="w-full bg-black/40 border border-white/10 p-4 text-sm font-mono text-white focus:outline-none focus:border-indigo-500"
                                                placeholder="Query merchant nodes..."
                                            />
                                        ) : (
                                            <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/30 p-4">
                                                <span className="text-emerald-400 font-mono text-xs">{selectedSellerName} [ACTIVE LINK]</span>
                                                <button onClick={() => { setSelectedSellerName(''); setTargetSellerId(''); }} className="text-red-500"><X size={14} /></button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-4 mt-10">
                            <button onClick={() => setShowAnnouncementModal(false)} className="flex-1 py-3 border border-white/10 text-white font-mono text-xs uppercase tracking-widest hover:bg-white/5 transition-colors">ABORT</button>
                            <button 
                                onClick={handleCreateAnnouncement}
                                disabled={isSubmitting || !announcementTitle.trim() || !announcementContent.trim()}
                                className="flex-1 py-3 bg-indigo-600 border border-indigo-400 text-white font-mono text-xs uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-[0_0_20px_rgba(99,102,241,0.4)] disabled:opacity-50"
                            >
                                {isSubmitting ? 'TRANSMITTING...' : 'INITIATE TRANSMISSION'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showSupportModal && (
                <AdminSupportModal onClose={() => { setShowSupportModal(false); fetchDashboardData(); }} />
            )}
        </div>
    );
};

export default AdminDashboard;
