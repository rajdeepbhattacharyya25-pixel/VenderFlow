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
                // Fetch recent sellers if search is empty, otherwise search
                const params = sellerSearch.trim()
                    ? { search: sellerSearch, limit: 5 }
                    : { limit: 5 }; // Default to 5 recent sellers

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

    // Real-time subscription for Unread Tickets
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

            // Convert to CSV
            let csv = '';

            // Sellers section
            if (report.sellers && report.sellers.length > 0) {
                csv += 'SELLERS REPORT\n';
                csv += 'ID,Store Name,Plan,Status,Active,Created At\n';
                report.sellers.forEach(s => {
                    csv += `${s.id},"${s.store_name}",${s.plan},${s.status},${s.is_active},${s.created_at}\n`;
                });
                csv += '\n';
            }

            // Orders section
            if (report.orders && report.orders.length > 0) {
                csv += 'ORDERS REPORT\n';
                csv += 'ID,Total,Status,Created At,Seller ID\n';
                report.orders.forEach(o => {
                    csv += `${o.id},${o.total},${o.status},${o.created_at},${o.seller_id}\n`;
                });
            }

            // Download
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
                fetchDashboardData(); // Refresh activity
            }
        } catch (error) {
            console.error('Error creating announcement:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatCurrency = (value: number) => {
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
            border: 'border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.1)]'
        },
        {
            label: 'Withdrawal Requests',
            value: '3',
            icon: AlertCircle,
            color: 'text-amber-500',
            bg: 'bg-amber-500/10',
            border: 'border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.1)]'
        },
        {
            label: 'Support Tickets',
            value: unreadSupportCount.toString() || '12',
            icon: MessageSquare,
            color: 'text-red-500',
            bg: 'bg-red-500/10',
            border: 'border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.1)]'
        },
        {
            label: 'Flagged Orders',
            value: '2',
            icon: AlertCircle,
            color: 'text-red-500',
            bg: 'bg-red-500/10',
            border: 'border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.1)]'
        }
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-500 bg-[#0B0F19] min-h-screen text-neutral-100 p-2 md:p-4">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-1">VendorFlow Command Center</h1>
                    <p className="text-neutral-500 text-xs md:text-sm font-mono uppercase tracking-widest">System Status: OPERATIONAL</p>
                </div>
                <div className="flex items-center gap-2 md:gap-4 flex-wrap">
                    <button
                        onClick={() => setShowSupportModal(true)}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-[#111827] hover:bg-[#1a2333] text-indigo-400 border border-indigo-500/30 rounded-md transition-all font-mono text-xs md:text-sm shadow-[0_0_10px_rgba(99,102,241,0.1)] relative"
                    >
                        <MessageSquare size={14} />
                        <span>TICKETS</span>
                        {unreadSupportCount > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-sm bg-red-500 text-[9px] font-bold text-white border border-[#0B0F19]">
                                {unreadSupportCount}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setShowAnnouncementModal(true)}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md transition-all font-mono text-xs md:text-sm shadow-[0_0_15px_rgba(99,102,241,0.3)] border border-indigo-400"
                    >
                        <Megaphone size={14} />
                        <span>BROADCAST</span>
                    </button>
                </div>
            </div>

            {/* Main Layout Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">

                {/* LEFT MAIN CONTENT (75%) */}
                <div className="xl:col-span-3 space-y-6">

                    {/* TOP METRICS (Row 1) */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {statsDisplay.map((stat, i) => (
                            <div key={i} className="bg-gradient-to-b from-[#0F172A] to-[#0B0F19] border border-white/5 p-5 rounded-md hover:border-indigo-500/30 transition-all group relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <div className="flex items-center justify-between mb-3">
                                    <div className={`p-2 rounded-sm ${stat.bg} ${stat.color} border border-indigo-500/20`}>
                                        <stat.icon size={16} />
                                    </div>
                                    <div className={`flex items-center text-[10px] font-mono ${stat.isPositive ? 'text-emerald-400' : 'text-amber-400'}`}>
                                        {stat.isPositive ? <ArrowUpRight size={12} className="mr-0.5" /> : <ArrowDownRight size={12} className="mr-0.5" />}
                                        {stat.change}
                                    </div>
                                </div>
                                <h3 className="text-xl md:text-2xl font-bold text-white mt-1 font-mono tracking-tight">{stat.value}</h3>
                                <p className="text-neutral-400 text-[10px] font-mono uppercase tracking-wider mt-1">{stat.label}</p>
                                <p className="text-neutral-600 text-[9px] font-mono mt-2 pt-2 border-t border-white/5">{stat.subtext}</p>
                            </div>
                        ))}
                    </div>

                    {/* OPERATIONS METRICS (Row 2) */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {opsStatsDisplay.map((stat, i) => (
                            <div key={i} className={`bg-[#111827] border p-4 rounded-md transition-all group ${stat.border}`}>
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-neutral-300 text-[10px] font-mono uppercase tracking-wider">{stat.label}</p>
                                    <stat.icon size={14} className={stat.color} />
                                </div>
                                <div className="flex items-baseline gap-2 mt-1">
                                    <h3 className={`text-2xl font-bold font-mono ${stat.color}`}>{stat.value}</h3>
                                    {parseInt(stat.value) > 0 && (
                                        <span className="text-[9px] uppercase font-mono text-neutral-500 flex items-center gap-1">
                                            <div className={`w-1.5 h-1.5 rounded-full ${stat.bg.replace('/10', '')} animate-pulse`} /> action req
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* CHARTS (Row 3) */}
                    <div className="bg-[#111827] border border-white/5 rounded-md p-0 overflow-hidden relative">
                        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent"></div>
                        <div className="p-4 md:p-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-b from-indigo-500/5 to-transparent">
                            <div className="flex items-center gap-2 text-indigo-400">
                                <Activity size={16} />
                                <h2 className="text-sm font-bold font-mono tracking-widest uppercase">Revenue Growth Matrix</h2>
                            </div>
                            <div className="hidden md:flex bg-[#0B0F19] rounded-sm border border-white/5 p-1">
                                {['Today', '7 Days', '30 Days', '12 Months'].map((filter, i) => (
                                    <button key={i} className={`px-3 py-1 text-[10px] font-mono uppercase ${i === 1 ? 'bg-indigo-600/20 text-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.2)]' : 'text-neutral-500 hover:text-neutral-300'} rounded-sm transition-all`}>
                                        {filter}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="p-4 relative">
                            {/* Pass a custom prop to RevenueChart if needed to style it darkly, assuming it adapts or has its own container */}
                            <div className="opacity-90 contrast-125 grayscale-[20%] sepia-[10%] hue-rotate-15">
                                <RevenueChart />
                            </div>
                        </div>
                    </div>

                    {/* INSIGHTS & MONITORING (Row 4 & 5) */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Insights Lists */}
                        <div className="space-y-6">
                            <div className="bg-[#111827] border border-white/5 rounded-md p-5">
                                <h3 className="text-xs font-bold text-neutral-400 font-mono uppercase tracking-widest mb-4 border-b border-white/5 pb-2">Top Performance / Sellers</h3>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-5 h-5 bg-indigo-500/20 border border-indigo-500/50 text-indigo-400 flex items-center justify-center text-[10px] font-bold rounded-sm">1</div>
                                            <span className="text-sm text-neutral-200 font-medium">TechStore</span>
                                        </div>
                                        <span className="text-sm text-emerald-400 font-mono">₹1.2L</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-5 h-5 bg-neutral-800 border border-neutral-700 flex items-center justify-center text-[10px] font-bold rounded-sm">2</div>
                                            <span className="text-sm text-neutral-200 font-medium">FashionHub</span>
                                        </div>
                                        <span className="text-sm text-emerald-400 font-mono">₹84K</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-5 h-5 bg-neutral-800 border border-neutral-700 flex items-center justify-center text-[10px] font-bold rounded-sm">3</div>
                                            <span className="text-sm text-neutral-200 font-medium">GadgetWorld</span>
                                        </div>
                                        <span className="text-sm text-emerald-400 font-mono">₹61K</span>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-[#111827] border border-white/5 rounded-md p-5">
                                <h3 className="text-xs font-bold text-neutral-400 font-mono uppercase tracking-widest mb-4 border-b border-white/5 pb-2">Top Performance / Products</h3>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between group cursor-pointer">
                                        <span className="text-sm text-neutral-300 group-hover:text-indigo-400 transition-colors">Wireless Earbuds Pro</span>
                                        <ArrowUpRight size={14} className="text-indigo-500 opacity-0 group-hover:opacity-100 transition-all" />
                                    </div>
                                    <div className="flex items-center justify-between group cursor-pointer">
                                        <span className="text-sm text-neutral-300 group-hover:text-indigo-400 transition-colors">iPhone 15 Case</span>
                                        <ArrowUpRight size={14} className="text-indigo-500 opacity-0 group-hover:opacity-100 transition-all" />
                                    </div>
                                    <div className="flex items-center justify-between group cursor-pointer">
                                        <span className="text-sm text-neutral-300 group-hover:text-indigo-400 transition-colors">Minimal Smartwatch</span>
                                        <ArrowUpRight size={14} className="text-indigo-500 opacity-0 group-hover:opacity-100 transition-all" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Recent Activity */}
                        <div className="bg-[#111827] border border-white/5 rounded-md p-5 flex flex-col h-full">
                            <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
                                <h3 className="text-xs font-bold text-neutral-400 font-mono uppercase tracking-widest">Live Activity Feed</h3>
                                <div className="flex items-center gap-2 text-[9px] text-emerald-400 font-mono uppercase">
                                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div> Live
                                </div>
                            </div>
                            <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                                {(recentActivity.length > 0 ? recentActivity : [
                                    { id: '1', user: 'TechStore', detail: 'added 12 products', time: 'Just now', status: 'success', type: 'product' },
                                    { id: '2', user: 'System', detail: 'Order #18421 placed (₹1299)', time: '2m ago', status: 'info', type: 'order' },
                                    { id: '3', user: 'FashionHub', detail: 'requested payout', time: '15m ago', status: 'warning', type: 'finance' },
                                    { id: '4', user: 'SmartKart', detail: 'applied as new seller', time: '1h ago', status: 'pending', type: 'user' },
                                ]).map((act) => (
                                    <div key={act.id} className="group relative pl-4 border-l border-white/10 hover:border-indigo-500/50 transition-colors">
                                        <div className={`absolute -left-[3px] top-1.5 w-1.5 h-1.5 rounded-full ${act.status === 'pending' ? 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]' :
                                            act.status === 'warning' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' :
                                                act.status === 'info' ? 'bg-blue-400' : 'bg-emerald-500'
                                            }`} />
                                        <p className="text-xs text-neutral-300 font-mono leading-relaxed">
                                            <span className="font-bold text-white mb-0.5 block">{act.user}</span>
                                            {act.detail}
                                        </p>
                                        <p className="text-[10px] text-neutral-600 mt-1 font-mono">{act.time}</p>
                                    </div>
                                ))}
                            </div>
                            <button
                                onClick={() => navigate('/admin/logs')}
                                className="mt-4 w-full py-2 border border-white/5 hover:border-indigo-500/30 hover:bg-indigo-500/5 text-neutral-400 hover:text-indigo-300 text-[10px] font-mono uppercase tracking-widest rounded-sm transition-all"
                            >
                                View Detailed Logs
                            </button>
                        </div>
                    </div>
                </div>

                {/* RIGHT SIDEBAR (25%) */}
                <div className="space-y-6">

                    {/* QUICK ACTIONS */}
                    <div className="bg-[#111827] border border-white/5 rounded-md p-5 border-t-2 border-t-indigo-500">
                        <h3 className="text-xs font-bold text-indigo-400 font-mono uppercase tracking-widest mb-4">Quick Actions</h3>
                        <div className="space-y-2">
                            <button onClick={() => navigate('/admin/applications')} className="w-full flex items-center justify-between p-3 bg-[#0B0F19] border border-white/5 hover:border-indigo-500/50 rounded-sm group transition-all">
                                <span className="text-sm text-neutral-300 font-medium group-hover:text-white transition-colors flex items-center gap-2">
                                    <Plus size={14} className="text-emerald-500" /> Approve Seller
                                </span>
                                <ArrowUpRight size={14} className="text-neutral-600 group-hover:text-indigo-400 transition-colors" />
                            </button>
                            <button onClick={() => navigate('/admin/sellers')} className="w-full flex items-center justify-between p-3 bg-[#0B0F19] border border-white/5 hover:border-red-500/50 rounded-sm group transition-all">
                                <span className="text-sm text-neutral-300 font-medium group-hover:text-white transition-colors flex items-center gap-2">
                                    <X size={14} className="text-red-500" /> Ban Seller
                                </span>
                                <ArrowUpRight size={14} className="text-neutral-600 group-hover:text-red-400 transition-colors" />
                            </button>
                            <button onClick={() => setShowAnnouncementModal(true)} className="w-full flex items-center justify-between p-3 bg-[#0B0F19] border border-white/5 hover:border-indigo-500/50 rounded-sm group transition-all">
                                <span className="text-sm text-neutral-300 font-medium group-hover:text-white transition-colors flex items-center gap-2">
                                    <Megaphone size={14} className="text-indigo-400" /> Announcement
                                </span>
                                <ArrowUpRight size={14} className="text-neutral-600 group-hover:text-indigo-400 transition-colors" />
                            </button>
                            <button onClick={handleExportReport} className="w-full flex items-center justify-between p-3 bg-[#0B0F19] border border-white/5 hover:border-indigo-500/50 rounded-sm group transition-all">
                                <span className="text-sm text-neutral-300 font-medium group-hover:text-white transition-colors flex items-center gap-2">
                                    <Download size={14} className="text-blue-400" /> Export Revenue
                                </span>
                                <ArrowUpRight size={14} className="text-neutral-600 group-hover:text-indigo-400 transition-colors" />
                            </button>
                        </div>
                    </div>

                    {/* SYSTEM HEALTH */}
                    <div className="bg-[#111827] border border-white/5 rounded-md p-5">
                        <h3 className="text-xs font-bold text-neutral-400 font-mono uppercase tracking-widest mb-4">System Health</h3>
                        <div className="space-y-4">
                            <div>
                                <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400 mb-1">
                                    <span>API UPTIME</span>
                                    <span className="text-emerald-400">99.98%</span>
                                </div>
                                <div className="h-1 bg-[#0B0F19] rounded-none overflow-hidden border border-white/5">
                                    <div className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" style={{ width: '99.98%' }}></div>
                                </div>
                            </div>
                            <div>
                                <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400 mb-1">
                                    <span>DATABASE LOAD</span>
                                    <span className="text-blue-400">NORMAL (24%)</span>
                                </div>
                                <div className="h-1 bg-[#0B0F19] rounded-none overflow-hidden border border-white/5">
                                    <div className="h-full bg-blue-500 w-[24%]"></div>
                                </div>
                            </div>
                            <div>
                                <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400 mb-1">
                                    <span>STORAGE</span>
                                    <span className="text-amber-400">210MB / 1GB</span>
                                </div>
                                <div className="h-1 bg-[#0B0F19] rounded-none overflow-hidden border border-white/5">
                                    <div className="h-full bg-amber-500 w-[21%] shadow-[0_0_10px_rgba(245,158,11,0.2)]"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* CRITICAL ALERTS */}
                    <div className="bg-[#111827] border border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.05)] rounded-md p-5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-full h-[1px] bg-gradient-to-l from-red-500/50 to-transparent"></div>
                        <h3 className="text-xs font-bold text-red-500 font-mono uppercase tracking-widest mb-4 flex items-center gap-2">
                            <AlertCircle size={14} /> Critical Alerts
                        </h3>
                        <div className="space-y-3">
                            <div className="bg-red-500/5 border border-red-500/10 p-3 rounded-sm flex items-start gap-3">
                                <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 animate-pulse shadow-[0_0_5px_rgba(239,68,68,0.8)]"></div>
                                <div>
                                    <p className="text-xs font-medium text-red-400">3 sellers waiting approval</p>
                                    <button onClick={() => navigate('/admin/applications')} className="text-[10px] font-mono text-neutral-400 hover:text-white mt-1 border-b border-neutral-700 pb-0.5 transition-colors">Review now →</button>
                                </div>
                            </div>
                            <div className="bg-amber-500/5 border border-amber-500/10 p-3 rounded-sm flex items-start gap-3">
                                <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-1.5 shadow-[0_0_5px_rgba(245,158,11,0.5)]"></div>
                                <div>
                                    <p className="text-xs font-medium text-amber-400">5 payout requests pending</p>
                                    <button className="text-[10px] font-mono text-neutral-400 hover:text-white mt-1 border-b border-neutral-700 pb-0.5 transition-colors">Open queue →</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Announcement Modal (Unchanged functional structure, styled to match HUD) */}
            {showAnnouncementModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-end md:items-center justify-center z-50 md:p-4">
                    <div className="bg-[#0B0F19] border border-indigo-500/30 shadow-[0_0_40px_rgba(99,102,241,0.15)] rounded-md w-full md:max-w-lg p-5 md:p-6 animate-in slide-in-from-bottom-4 md:zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
                            <h2 className="text-lg font-mono font-bold text-white tracking-widest uppercase">System Broadcast</h2>
                            <button
                                onClick={() => setShowAnnouncementModal(false)}
                                className="w-8 h-8 flex items-center justify-center hover:bg-white/5 rounded-sm transition-colors border border-transparent hover:border-white/10"
                            >
                                <X size={16} className="text-neutral-400" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-mono uppercase tracking-widest text-indigo-400 mb-2">Subject</label>
                                <input
                                    type="text"
                                    value={announcementTitle}
                                    onChange={(e) => setAnnouncementTitle(e.target.value)}
                                    className="w-full bg-[#111827] border border-white/10 rounded-sm px-4 py-3 text-sm font-mono text-white placeholder-neutral-600 focus:outline-none focus:border-indigo-500 transition-colors shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]"
                                    placeholder="Enter broadcast subject..."
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-mono uppercase tracking-widest text-indigo-400 mb-2">Message Payload</label>
                                <textarea
                                    value={announcementContent}
                                    onChange={(e) => setAnnouncementContent(e.target.value)}
                                    rows={4}
                                    className="w-full bg-[#111827] border border-white/10 rounded-sm px-4 py-3 text-sm font-mono text-white placeholder-neutral-600 focus:outline-none focus:border-indigo-500 transition-colors resize-none shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]"
                                    placeholder="Enter transmission data..."
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-mono uppercase tracking-widest text-indigo-400 mb-2">Target Node</label>
                                <div className="grid grid-cols-2 gap-2 mb-3">
                                    <button
                                        onClick={() => setTargetType('platform')}
                                        className={`px-4 py-2 rounded-sm border text-xs font-mono uppercase tracking-wider transition-all ${targetType === 'platform'
                                            ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.2)]'
                                            : 'bg-[#111827] border-white/10 text-neutral-500 hover:border-white/20'
                                            }`}
                                    >
                                        Global (All)
                                    </button>
                                    <button
                                        onClick={() => setTargetType('seller')}
                                        className={`px-4 py-2 rounded-sm border text-xs font-mono uppercase tracking-wider transition-all ${targetType === 'seller'
                                            ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.2)]'
                                            : 'bg-[#111827] border-white/10 text-neutral-500 hover:border-white/20'
                                            }`}
                                    >
                                        Direct Link
                                    </button>
                                </div>

                                {targetType === 'seller' && (
                                    <div className="space-y-2">
                                        {!selectedSellerName ? (
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={sellerSearch}
                                                    onChange={(e) => setSellerSearch(e.target.value)}
                                                    className="w-full bg-[#111827] border border-white/10 rounded-sm px-4 py-3 text-sm font-mono text-white placeholder-neutral-600 focus:outline-none focus:border-indigo-500 transition-colors"
                                                    placeholder="Query merchant database..."
                                                />
                                                {searchingSellers && (
                                                    <div className="absolute right-3 top-3.5 text-indigo-500 font-mono text-xs animate-pulse">Scanning...</div>
                                                )}
                                                {sellerResults.length > 0 && (
                                                    <div className="absolute z-10 w-full mt-1 bg-[#0F172A] border border-indigo-500/30 rounded-sm shadow-[0_10px_30px_rgba(0,0,0,0.8)] max-h-48 overflow-y-auto">
                                                        {sellerResults.map(s => (
                                                            <button
                                                                key={s.id}
                                                                onClick={() => {
                                                                    setTargetSellerId(s.id);
                                                                    setSelectedSellerName(s.store_name);
                                                                    setSellerResults([]);
                                                                    setSellerSearch('');
                                                                }}
                                                                className="w-full text-left px-4 py-3 hover:bg-indigo-500/10 text-sm font-mono text-white border-b border-white/5 last:border-0"
                                                            >
                                                                <div className="font-bold">{s.store_name}</div>
                                                                <div className="text-[10px] text-neutral-500 mt-0.5">UID: {s.id.split('-')[0]}</div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/30 rounded-sm px-4 py-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                                    <span className="text-emerald-400 font-mono text-xs">{selectedSellerName} [CONNECTED]</span>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        setSelectedSellerName('');
                                                        setTargetSellerId('');
                                                    }}
                                                    className="w-8 h-8 flex items-center justify-center hover:bg-red-500/20 rounded-sm text-red-500 transition-colors"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-3 mt-8">
                            <button
                                onClick={() => setShowAnnouncementModal(false)}
                                className="flex-1 py-2 bg-[#111827] border border-white/10 hover:border-white/30 hover:bg-white/5 text-white font-mono text-xs uppercase tracking-widest rounded-sm transition-colors"
                            >
                                Abort
                            </button>
                            <button
                                onClick={handleCreateAnnouncement}
                                disabled={isSubmitting || !announcementTitle.trim() || !announcementContent.trim() || (targetType === 'seller' && !targetSellerId)}
                                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:bg-[#111827] disabled:text-neutral-600 border border-indigo-500 text-white font-mono text-xs uppercase tracking-widest rounded-sm transition-colors shadow-[0_0_15px_rgba(99,102,241,0.3)] disabled:shadow-none"
                            >
                                {isSubmitting ? 'Transmitting...' : 'Transmit'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showSupportModal && (
                <AdminSupportModal onClose={() => {
                    setShowSupportModal(false);
                    fetchDashboardData();
                }} />
            )}
        </div>
    );
};

export default AdminDashboard;

