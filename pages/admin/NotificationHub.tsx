import React, { useEffect, useState } from 'react';
import { 
    Bell, 
    Mail, 
    ShoppingCart, 
    TrendingUp, 
    RefreshCw, 
    AlertCircle, 
    CheckCircle2, 
    Clock,
    Search,
    Filter,
    ArrowUpRight,
    DollarSign,
    Zap,
    Activity
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

// --- Shared UI Components ---

const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <div className={`relative overflow-hidden bg-neutral-900/40 backdrop-blur-xl border border-white/5 rounded-2xl ${className}`}>
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
        {children}
    </div>
);

const HUDLabel = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <span className={`text-[10px] uppercase tracking-[0.2em] font-bold text-neutral-500 ${className}`}>
        {children}
    </span>
);

const MetricCard = ({ title, value, subtext, icon: Icon, trend, colorClass = "text-indigo-400" }: {
    title: string; value: string | number; subtext: string; icon: any; trend?: string; colorClass?: string;
}) => (
    <GlassCard className="p-6 group hover:border-white/10 transition-all">
        <div className="flex items-center justify-between mb-4">
            <HUDLabel>{title}</HUDLabel>
            <div className={`p-2 rounded-lg bg-white/5 ${colorClass}`}>
                <Icon size={16} />
            </div>
        </div>
        <div className="space-y-1">
            <div className="text-3xl font-black text-white tracking-tight">{value}</div>
            <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-500">{subtext}</span>
                {trend && (
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                        <ArrowUpRight size={10} />
                        {trend}
                    </span>
                )}
            </div>
        </div>
    </GlassCard>
);

// --- Types ---

interface EmailLog {
    id: string;
    recipient: string;
    type: string;
    status: string;
    subject: string;
    sent_at: string;
    error_message?: string;
}

interface RecoveryStats {
    signals_sent: number;
    conversions: number;
    recovered_revenue: number;
    conversion_rate: number;
}

export default function NotificationHub() {
    const [logs, setLogs] = useState<EmailLog[]>([]);
    const [stats, setStats] = useState<RecoveryStats | null>(null);
    const [summary, setSummary] = useState<any[]>([]);
    const [quota, setQuota] = useState<any>(null);
    const [apiUsage, setApiUsage] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Fetch recent logs
            const { data: logsData, error: logsError } = await supabase
                .from('email_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(20);

            if (logsError) throw logsError;
            setLogs(logsData || []);

            // 2. Fetch recovery stats
            const { data: statsData, error: statsError } = await supabase
                .from('recovery_analytics')
                .select('*');

            if (statsError) throw statsError;
            
            // Consolidate stats across all sellers for global view
            const globalStats = (statsData || []).reduce((acc, curr) => ({
                signals_sent: acc.signals_sent + Number(curr.signals_sent),
                conversions: acc.conversions + Number(curr.conversions),
                recovered_revenue: acc.recovered_revenue + Number(curr.recovered_revenue),
                conversion_rate: 0 // Will calculate later
            }), { signals_sent: 0, conversions: 0, recovered_revenue: 0, conversion_rate: 0 });

            if (globalStats.signals_sent > 0) {
                globalStats.conversion_rate = (globalStats.conversions / globalStats.signals_sent) * 100;
            }
            setStats(globalStats);

            // 3. Fetch summary by type
            const { data: summaryData, error: summaryError } = await supabase
                .from('email_logs_summary')
                .select('*');
            
            if (summaryError) throw summaryError;
            setSummary(summaryData || []);

            // 4. Fetch Brevo Quota & Local Usage
            const { data: quotaData } = await supabase.functions.invoke('get-brevo-quota');
            setQuota(quotaData);

            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);

            const { count: usageCount } = await supabase
                .from('api_usage_logs')
                .select('*', { count: 'exact', head: true })
                .eq('provider', 'brevo')
                .gte('created_at', startOfMonth.toISOString());
            
            const { data: config } = await supabase
                .from('api_limits_config')
                .select('*')
                .eq('provider', 'brevo')
                .maybeSingle();

            setApiUsage({ 
                count: usageCount || 0, 
                limit: config?.monthly_limit || 300 
            });

        } catch (err) {
            console.error("Hub Error:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 60000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                        </div>
                        <h1 className="text-3xl font-black text-white tracking-tight uppercase">
                            Notification <span className="text-indigo-500">Hub</span>
                        </h1>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-mono text-neutral-500 italic">
                        <span>SERVICE: BREVO_V3</span>
                        <span>•</span>
                        <span>STATUS: ACTIVE</span>
                        <span>•</span>
                        <span>REGION: US-EAST-1</span>
                    </div>
                </div>

                <button 
                    onClick={fetchData}
                    disabled={loading}
                    className="flex items-center gap-2 px-6 py-2.5 bg-neutral-800/50 hover:bg-neutral-700/50 border border-white/5 rounded-full text-xs font-bold uppercase tracking-widest transition-all hover:scale-105 active:scale-95"
                >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    Force Sync
                </button>
            </div>

            {/* Error Alert */}
            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm font-medium">
                    <AlertCircle size={18} />
                    {error}
                </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard 
                    title="Total Signals" 
                    value={summary.length > 0 ? (summary.reduce((a,b) => a + Number(b.count), 0)) : 0} 
                    subtext="Sent across all events" 
                    icon={Mail}
                />
                <MetricCard 
                    title="Recovered Revenue" 
                    value={`₹${stats?.recovered_revenue?.toLocaleString() || 0}`} 
                    subtext="From abandoned carts" 
                    icon={DollarSign}
                    colorClass="text-emerald-400"
                    trend={`${stats?.conversion_rate?.toFixed(1) || 0}% rate`}
                />
                <MetricCard 
                    title="Recovery Signals" 
                    value={stats?.signals_sent || 0} 
                    subtext="Emails sent to prospects" 
                    icon={Zap}
                    colorClass="text-amber-400"
                />
                <MetricCard 
                    title="Delivery Health" 
                    value={summary.length > 0 ? `${((summary.filter(s => s.status === 'sent').reduce((a,b) => a + Number(b.count), 0) / summary.reduce((a,b) => a + Number(b.count), 0)) * 100).toFixed(1)}%` : '100%'} 
                    subtext="Successful deliveries" 
                    icon={CheckCircle2}
                    colorClass="text-indigo-400"
                />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Main Event Stream */}
                <GlassCard className="xl:col-span-2">
                    <div className="p-6 border-b border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Clock size={18} className="text-indigo-400" />
                            <HUDLabel>Recent Transmission Log</HUDLabel>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-white/5">
                                    <th className="px-6 py-3"><HUDLabel>Timestamp</HUDLabel></th>
                                    <th className="px-6 py-3"><HUDLabel>Recipient</HUDLabel></th>
                                    <th className="px-6 py-3"><HUDLabel>Type</HUDLabel></th>
                                    <th className="px-6 py-3"><HUDLabel>Status</HUDLabel></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4 text-[10px] font-mono text-neutral-500">
                                            {log.sent_at ? new Date(log.sent_at).toLocaleString() : 'Pending'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-xs font-bold text-white uppercase tracking-tight">{log.recipient.split('@')[0]}</div>
                                            <div className="text-[10px] text-neutral-500 font-mono italic">{log.recipient}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 font-black border border-indigo-500/20">
                                                {log.type.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className={`h-1.5 w-1.5 rounded-full ${
                                                    log.status === 'sent' ? 'bg-emerald-500' : 
                                                    log.status === 'failed' ? 'bg-red-500' : 'bg-amber-500'
                                                }`} />
                                                <span className={`text-[10px] font-bold uppercase ${
                                                    log.status === 'sent' ? 'text-emerald-400' : 
                                                    log.status === 'failed' ? 'text-red-400' : 'text-amber-400'
                                                }`}>
                                                    {log.status}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {logs.length === 0 && !loading && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-20 text-center text-neutral-600">
                                            <HUDLabel>No transmissions recorded</HUDLabel>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </GlassCard>

                {/* Sidebar Breakdown */}
                <div className="space-y-6">
                    {/* API Usage Section */}
                    <GlassCard className="p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <Activity size={18} className="text-indigo-400" />
                            <HUDLabel>API Health & Quota</HUDLabel>
                        </div>
                        <div className="space-y-6">
                            {/* Monthly Limit (Local tracking) */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-end">
                                    <span className="text-[10px] text-white font-bold uppercase tracking-widest">Monthly Limit</span>
                                    <span className="text-xs font-mono text-neutral-500">{apiUsage?.count || 0} / {apiUsage?.limit || '---'}</span>
                                </div>
                                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full rounded-full transition-all duration-1000 ${
                                            (apiUsage?.count / apiUsage?.limit) > 0.9 ? 'bg-red-500' : 
                                            (apiUsage?.count / apiUsage?.limit) > 0.7 ? 'bg-amber-500' : 'bg-indigo-500'
                                        }`} 
                                        style={{ width: `${Math.min((apiUsage?.count / apiUsage?.limit) * 100, 100) || 0}%` }}
                                    />
                                </div>
                            </div>

                            {/* Credits (From Brevo) */}
                            {quota?.plan && quota.plan.map((p: any, idx: number) => (
                                <div key={idx} className="p-3 bg-white/5 border border-white/5 rounded-xl">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-[9px] text-neutral-400 uppercase font-mono tracking-tighter">Brevo {p.creditsType} Credits</span>
                                        <span className="text-xs font-black text-white">{p.credits?.toLocaleString() || '---'}</span>
                                    </div>
                                    <div className="text-[8px] text-neutral-600 font-mono uppercase italic italic text-right">
                                        Type: {p.type}
                                    </div>
                                </div>
                            ))}

                            {!quota && !loading && (
                                <div className="text-[9px] text-neutral-600 font-mono italic p-3 border border-white/5 rounded-xl text-center">
                                    BREVO_AUTH_PENDING...
                                </div>
                            )}
                        </div>
                    </GlassCard>

                    <GlassCard className="p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <TrendingUp size={18} className="text-emerald-400" />
                            <HUDLabel>Volume Distribution</HUDLabel>
                        </div>
                        <div className="space-y-4">
                            {summary.length > 0 ? (
                                // Group summary by type
                                Object.entries(summary.reduce((acc: any, curr) => {
                                    acc[curr.type] = (acc[curr.type] || 0) + Number(curr.count);
                                    return acc;
                                }, {})).map(([type, count]: [string, any]) => (
                                    <div key={type} className="space-y-1.5">
                                        <div className="flex justify-between items-end">
                                            <span className="text-[10px] text-white font-bold uppercase tracking-widest">{type.replace('_', ' ')}</span>
                                            <span className="text-xs font-mono text-neutral-500">{count}</span>
                                        </div>
                                        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-indigo-500 rounded-full" 
                                                style={{ width: `${(count / summary.reduce((a,b) => a + Number(b.count), 0)) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-xs text-neutral-600 font-mono italic">CALCULATING_METRICS...</div>
                            )}
                        </div>
                    </GlassCard>

                    <GlassCard className="p-6 bg-indigo-500/5 border-indigo-500/20">
                        <div className="flex items-center gap-3 mb-4">
                            <ShoppingCart size={18} className="text-indigo-400" />
                            <HUDLabel className="text-indigo-400">Recovery System</HUDLabel>
                        </div>
                        <p className="text-xs text-neutral-400 leading-relaxed mb-6">
                            Our AI-driven recovery cron scans for abandoned carts every hour. Conversion is attributed if an order is placed within 48h of a recovery signal.
                        </p>
                        <div className="p-3 bg-black/40 border border-white/5 rounded-xl space-y-2">
                            <div className="flex justify-between text-[9px] font-mono">
                                <span className="text-neutral-500 uppercase">Retention Window</span>
                                <span className="text-white">48 HOURS</span>
                            </div>
                            <div className="flex justify-between text-[9px] font-mono">
                                <span className="text-neutral-500 uppercase">Precision</span>
                                <span className="text-emerald-400">OPTIMIZED</span>
                            </div>
                        </div>
                    </GlassCard>
                </div>
            </div>
        </div>
    );
}
