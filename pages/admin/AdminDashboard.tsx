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
        healthStatus: 'Normal'
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
            label: 'Total Sellers',
            value: loading ? '...' : stats.totalSellers.toString(),
            change: `${stats.sellerChange >= 0 ? '+' : ''}${stats.sellerChange}%`,
            isPositive: stats.sellerChange >= 0,
            icon: Users,
            color: 'text-blue-500',
            bg: 'bg-blue-500/10'
        },
        {
            label: 'Live Revenue',
            value: loading ? '...' : formatCurrency(stats.liveRevenue),
            change: `${stats.revenueChange >= 0 ? '+' : ''}${stats.revenueChange}%`,
            isPositive: stats.revenueChange >= 0,
            icon: Activity,
            color: 'text-emerald-500',
            bg: 'bg-emerald-500/10'
        },
        {
            label: 'Active Orders',
            value: loading ? '...' : stats.activeOrders.toLocaleString(),
            change: `${stats.ordersChange >= 0 ? '+' : ''}${stats.ordersChange}%`,
            isPositive: stats.ordersChange >= 0,
            icon: ShoppingCart,
            color: 'text-amber-500',
            bg: 'bg-amber-500/10'
        },
        {
            label: 'Sys Health',
            value: loading ? '...' : `${stats.sysHealth}%`,
            change: stats.healthStatus,
            isPositive: stats.healthStatus === 'Normal',
            icon: Activity,
            color: stats.healthStatus === 'Normal' ? 'text-emerald-500' :
                stats.healthStatus === 'Warning' ? 'text-amber-500' : 'text-red-500',
            bg: stats.healthStatus === 'Normal' ? 'bg-emerald-500/10' :
                stats.healthStatus === 'Warning' ? 'bg-amber-500/10' : 'bg-red-500/10'
        },
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Platform Overview</h1>
                    <p className="text-neutral-500 text-sm mt-1">Real-time snapshots of your e-commerce ecosystem.</p>
                </div>
                <div className="flex items-center gap-2 md:gap-4 flex-wrap">
                    <button
                        onClick={() => setShowSupportModal(true)}
                        className="flex items-center justify-center gap-2 px-3 md:px-4 py-3 md:py-2 min-h-[44px] bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl transition-colors font-medium text-xs md:text-sm border border-neutral-700 relative"
                        style={{ WebkitTapHighlightColor: 'transparent' }}
                    >
                        <MessageSquare size={16} />
                        <span className="hidden sm:inline">Support Tickets</span>
                        <span className="sm:hidden">Support</span>
                        {unreadSupportCount > 0 && (
                            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white border-2 border-neutral-900">
                                {unreadSupportCount}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setShowAnnouncementModal(true)}
                        className="flex items-center justify-center gap-2 px-3 md:px-4 py-3 md:py-2 min-h-[44px] bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors font-medium text-xs md:text-sm shadow-lg shadow-indigo-500/20"
                        style={{ WebkitTapHighlightColor: 'transparent' }}
                    >
                        <Megaphone size={16} />
                        <span className="hidden sm:inline">Create Announcement</span>
                        <span className="sm:hidden">Announce</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                {statsDisplay.map((stat, i) => (
                    <div key={i} className="bg-neutral-900 border border-neutral-800 p-4 md:p-6 rounded-2xl hover:border-neutral-700 transition-all group">
                        <div className="flex items-center justify-between mb-4">
                            <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                                <stat.icon size={24} />
                            </div>
                            <div className={`flex items-center text-xs font-medium ${stat.isPositive ? 'text-emerald-500' : 'text-amber-500'}`}>
                                {stat.isPositive ? <ArrowUpRight size={14} className="mr-1" /> : <ArrowDownRight size={14} className="mr-1" />}
                                {stat.change}
                            </div>
                        </div>
                        <p className="text-neutral-500 text-[11px] md:text-sm font-medium uppercase tracking-wider">{stat.label}</p>
                        <h3 className="text-xl md:text-2xl font-bold text-white mt-1">{stat.value}</h3>

                        {/* Storage indicator for Sys Health card */}
                        {stat.label === 'Sys Health' && !loading && (
                            <div className="mt-4 pt-4 border-t border-neutral-800">
                                <div className="flex items-center justify-between text-xs mb-2">
                                    <span className="text-neutral-500">File Storage (Est.)</span>
                                    <span className="text-neutral-400 font-medium">
                                        {stats.estimatedStorageMB?.toFixed(1) || 0} MB / 8 GB
                                    </span>
                                </div>
                                <div className="h-2 bg-neutral-800 rounded-full overflow-hidden mb-3">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${(stats.storagePercentage || 0) >= 90 ? 'bg-red-500' :
                                            (stats.storagePercentage || 0) >= 75 ? 'bg-amber-500' : 'bg-emerald-500'
                                            }`}
                                        style={{ width: `${Math.min(stats.storagePercentage || 0, 100)}%` }}
                                    />
                                </div>

                                <div className="flex items-center justify-between text-xs mb-1">
                                    <span className="text-neutral-500">Database Size (Actual)</span>
                                    <span className="text-indigo-400 font-bold font-mono">
                                        {stats.databaseSize || 'Unknown'}
                                    </span>
                                </div>

                                <p className="text-[10px] text-neutral-600 mt-2 pt-2 border-t border-neutral-800/50">
                                    {stats.productCount || 0} products · {stats.imageCount || 0} images
                                </p>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Activity Feed */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-bold text-white">Recent Activity</h2>
                            <button
                                onClick={() => navigate('/admin/logs')}
                                className="text-indigo-400 hover:text-indigo-300 text-sm font-medium"
                            >
                                View all
                            </button>
                        </div>
                        <div className="space-y-4">
                            {loading ? (
                                <div className="text-neutral-500 text-center py-8">Loading activity...</div>
                            ) : recentActivity.length === 0 ? (
                                <div className="text-neutral-500 text-center py-8">No recent activity</div>
                            ) : (
                                recentActivity.map((act) => (
                                    <div key={act.id} className="flex items-start gap-4 p-3 hover:bg-neutral-800/50 rounded-xl transition-colors group">
                                        <div className={`w-2 h-2 rounded-full mt-2 ${act.status === 'pending' ? 'bg-blue-500' :
                                            act.status === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'
                                            }`} />
                                        <div className="flex-1">
                                            <p className="text-sm text-neutral-300">
                                                <span className="font-bold text-white group-hover:text-indigo-400 transition-colors">{act.user}</span> {act.detail}
                                            </p>
                                            <p className="text-xs text-neutral-500 mt-1">{act.time}</p>
                                        </div>
                                        <button
                                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-neutral-700 rounded transition-all"
                                            title="View activity details"
                                        >
                                            <ArrowUpRight size={14} className="text-neutral-400" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Revenue Growth Chart */}
                    <RevenueChart />
                </div>

                {/* Sidebar Cards */}
                <div className="space-y-6">
                    {/* Alerts Card */}
                    <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6">
                        <div className="flex items-center gap-2 mb-4 text-red-500">
                            <AlertCircle size={20} />
                            <h3 className="font-bold">Critical Alerts</h3>
                        </div>
                        <ul className="space-y-3">
                            {loading ? (
                                <li className="text-xs text-neutral-400">Loading alerts...</li>
                            ) : alerts.length === 0 ? (
                                <li className="text-xs text-emerald-400 flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    All systems operating normally
                                </li>
                            ) : (
                                alerts.map(alert => (
                                    <li key={alert.id} className="text-xs text-neutral-400 group">
                                        <div className="flex items-start gap-2">
                                            <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${alert.severity === 'critical' ? 'bg-red-500' : 'bg-amber-500'
                                                }`} />
                                            <div className="flex-1 min-w-0">
                                                <p className="leading-relaxed">{alert.message}</p>
                                                {alert.actionLabel && alert.actionUrl && (
                                                    <button
                                                        onClick={() => {
                                                            if (alert.actionUrl?.startsWith('http')) {
                                                                window.open(alert.actionUrl, '_blank');
                                                            } else {
                                                                navigate(alert.actionUrl || '/admin');
                                                            }
                                                        }}
                                                        className={`mt-2 px-3 py-1 rounded-lg text-[10px] font-semibold transition-all ${alert.severity === 'critical'
                                                            ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                                                            : 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                                                            }`}
                                                    >
                                                        {alert.actionLabel} →
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </li>
                                ))
                            )}
                        </ul>
                    </div>

                    {/* Quick Onboarding */}
                    <div className="bg-indigo-600 p-6 rounded-2xl text-white relative overflow-hidden group">
                        <div className="absolute -right-6 -bottom-6 opacity-10 group-hover:scale-110 transition-transform duration-500">
                            <Plus size={120} strokeWidth={4} />
                        </div>
                        <h2 className="text-xl font-bold mb-2 relative z-10">Invite new Store</h2>
                        <p className="text-indigo-100 text-xs mb-4 relative z-10 opacity-80">Grow your platform today by onboarding qualified sellers.</p>
                        <button
                            onClick={() => navigate('/admin/invites')}
                            className="w-full py-2.5 bg-white text-indigo-600 rounded-xl text-sm font-bold shadow-lg shadow-black/10 relative z-10 hover:bg-indigo-50 transition-colors"
                        >
                            START ONBOARDING
                        </button>
                    </div>
                </div>
            </div>

            {/* Announcement Modal */}
            {showAnnouncementModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end md:items-center justify-center z-50 md:p-4">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-t-2xl md:rounded-2xl w-full md:max-w-lg p-5 md:p-6 animate-in slide-in-from-bottom-4 md:zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-white">Create Announcement</h2>
                            <button
                                onClick={() => setShowAnnouncementModal(false)}
                                className="w-11 h-11 flex items-center justify-center hover:bg-neutral-800 rounded-lg transition-colors"
                                aria-label="Close modal"
                            >
                                <X size={20} className="text-neutral-400" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-neutral-400 mb-2">Title</label>
                                <input
                                    type="text"
                                    value={announcementTitle}
                                    onChange={(e) => setAnnouncementTitle(e.target.value)}
                                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 transition-colors"
                                    placeholder="Announcement title..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-neutral-400 mb-2">Content</label>
                                <textarea
                                    value={announcementContent}
                                    onChange={(e) => setAnnouncementContent(e.target.value)}
                                    rows={4}
                                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                                    placeholder="Write your announcement..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-neutral-400 mb-2">Target</label>
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    <button
                                        onClick={() => setTargetType('platform')}
                                        className={`px-4 py-3 rounded-xl border text-sm font-medium transition-all ${targetType === 'platform'
                                            ? 'bg-indigo-600 border-indigo-500 text-white'
                                            : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-600'
                                            }`}
                                    >
                                        All Sellers
                                    </button>
                                    <button
                                        onClick={() => setTargetType('seller')}
                                        className={`px-4 py-3 rounded-xl border text-sm font-medium transition-all ${targetType === 'seller'
                                            ? 'bg-indigo-600 border-indigo-500 text-white'
                                            : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-600'
                                            }`}
                                    >
                                        Specific Seller
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
                                                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 transition-colors"
                                                    placeholder="Search for a seller..."
                                                />
                                                {searchingSellers && (
                                                    <div className="absolute right-3 top-3.5 text-neutral-500 text-xs">Searching...</div>
                                                )}
                                                {sellerResults.length > 0 && (
                                                    <div className="absolute z-10 w-full mt-1 bg-neutral-800 border border-neutral-700 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                                                        {sellerResults.map(s => (
                                                            <button
                                                                key={s.id}
                                                                onClick={() => {
                                                                    setTargetSellerId(s.id);
                                                                    setSelectedSellerName(s.store_name);
                                                                    setSellerResults([]);
                                                                    setSellerSearch('');
                                                                }}
                                                                className="w-full text-left px-4 py-3 hover:bg-neutral-700 text-sm text-white border-b border-neutral-700 last:border-0"
                                                            >
                                                                <div className="font-bold">{s.store_name}</div>
                                                                <div className="text-xs text-neutral-400">@{s.slug}</div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                                    <span className="text-emerald-400 font-medium text-sm">{selectedSellerName}</span>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        setSelectedSellerName('');
                                                        setTargetSellerId('');
                                                    }}
                                                    className="w-11 h-11 flex items-center justify-center hover:bg-emerald-500/20 rounded-lg text-emerald-400 transition-colors"
                                                    aria-label="Remove seller"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-neutral-400 mb-2">Type</label>
                                <div className="flex gap-3">
                                    {(['info', 'warning', 'update'] as const).map(type => (
                                        <button
                                            key={type}
                                            onClick={() => setAnnouncementType(type)}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${announcementType === type
                                                ? type === 'info' ? 'bg-blue-500 text-white' :
                                                    type === 'warning' ? 'bg-amber-500 text-white' :
                                                        'bg-emerald-500 text-white'
                                                : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                                                }`}
                                        >
                                            {type.charAt(0).toUpperCase() + type.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowAnnouncementModal(false)}
                                className="flex-1 py-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateAnnouncement}
                                disabled={isSubmitting || !announcementTitle.trim() || !announcementContent.trim() || (targetType === 'seller' && !targetSellerId)}
                                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors"
                            >
                                {isSubmitting ? 'Creating...' : 'Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showSupportModal && (
                <AdminSupportModal onClose={() => {
                    setShowSupportModal(false);
                    fetchDashboardData(); // Refresh unread count
                }} />
            )}
        </div>
    );
};

export default AdminDashboard;

