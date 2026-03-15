import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, AlertTriangle, Zap, ShoppingBag, Package, Shield } from 'lucide-react';
import { clsx } from 'clsx';
import { CustomTooltip } from './CustomTooltip';

interface RevenueTabProps {
    revenueStats: any;
    chartData: any[];
    chartTitleRange: string;
}

export const RevenueTab: React.FC<RevenueTabProps> = ({ revenueStats, chartData, chartTitleRange }) => {
    const healthScore = Math.max(0, Math.min(100, Math.round(100 - revenueStats.refundRate * 5 + (revenueStats.growthRate > 0 ? 15 : -10))));

    return (
        <div className="animate-[fadeIn_0.3s] space-y-6">
            {/* Revenue Waterfall Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                <div className="relative overflow-hidden bg-white dark:bg-white/[0.03] border border-neutral-200 dark:border-indigo-500/20 rounded-2xl p-6 backdrop-blur-sm group hover:border-indigo-500/40 transition-all duration-300">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent pointer-events-none" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center"><DollarSign className="w-4 h-4 text-indigo-400" /></div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Gross Revenue</p>
                        </div>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white mb-3">₹{revenueStats.gross.toLocaleString()}</p>
                        <div className="h-1 w-full bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-full" style={{ width: '100%' }} /></div>
                    </div>
                </div>
                <div className="relative overflow-hidden bg-white dark:bg-white/[0.03] border border-neutral-200 dark:border-red-500/20 rounded-2xl p-6 backdrop-blur-sm group hover:border-red-500/40 transition-all duration-300">
                    <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent pointer-events-none" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center"><AlertTriangle className="w-4 h-4 text-red-400" /></div>
                            <p className="text-sm font-medium text-red-500 dark:text-red-400">Leaked to Refunds</p>
                        </div>
                        <p className="text-3xl font-bold text-red-500 dark:text-red-400 mb-3">-₹{revenueStats.refunds.toLocaleString()}</p>
                        <div className="h-1 w-full bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full" style={{ width: `${revenueStats.gross > 0 ? (revenueStats.refunds / revenueStats.gross * 100) : 0}%` }} /></div>
                    </div>
                </div>
                <div className="relative overflow-hidden bg-white dark:bg-white/[0.03] border border-neutral-200 dark:border-emerald-500/20 rounded-2xl p-6 backdrop-blur-sm group hover:border-emerald-500/40 transition-all duration-300">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center"><Zap className="w-4 h-4 text-emerald-400" /></div>
                            <p className="text-sm font-medium text-emerald-500 dark:text-emerald-400">Net Revenue</p>
                        </div>
                        <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mb-3">₹{revenueStats.net.toLocaleString()}</p>
                        <div className="h-1 w-full bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full" style={{ width: `${revenueStats.gross > 0 ? (revenueStats.net / revenueStats.gross * 100) : 0}%` }} /></div>
                    </div>
                </div>
            </div>

            {/* Order Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                <div className="bg-white dark:bg-white/[0.03] border border-neutral-200 dark:border-white/[0.08] rounded-2xl p-5 backdrop-blur-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Orders</p>
                            <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">{revenueStats.totalOrders.toLocaleString()}</p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center"><ShoppingBag className="w-5 h-5 text-indigo-400" /></div>
                    </div>
                </div>
                <div className="bg-white dark:bg-white/[0.03] border border-neutral-200 dark:border-white/[0.08] rounded-2xl p-5 backdrop-blur-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Refunded Orders</p>
                            <p className="text-2xl font-bold text-red-500 dark:text-red-400 mt-1">{revenueStats.refundedOrders}</p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center"><Package className="w-5 h-5 text-red-400" /></div>
                    </div>
                </div>
                <div className="bg-white dark:bg-white/[0.03] border border-neutral-200 dark:border-white/[0.08] rounded-2xl p-5 backdrop-blur-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Refund Rate</p>
                            <p className="text-2xl font-bold text-amber-500 dark:text-amber-400 mt-1">{revenueStats.refundRate.toFixed(1)}%</p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center"><Shield className="w-5 h-5 text-amber-400" /></div>
                    </div>
                </div>
            </div>

            {/* Revenue Trend Area Chart */}
            <div className="bg-white dark:bg-white/[0.03] border border-neutral-200 dark:border-white/[0.08] rounded-2xl p-6 backdrop-blur-sm">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Revenue Trend ({chartTitleRange})</h3>
                <div className="h-[320px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                            <defs>
                                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--dashboard-muted)" opacity={0.2} />
                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--dashboard-muted)' }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--dashboard-muted)' }} tickFormatter={(v) => `₹${v}`} />
                            <Tooltip content={<CustomTooltip formatter={(v: number) => [`₹${v?.toFixed(0)}`, 'Revenue']} />} />
                            <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2.5} fill="url(#revenueGradient)" dot={false} activeDot={{ r: 5, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Revenue Health Indicator */}
            <div className="bg-white dark:bg-white/[0.03] border border-neutral-200 dark:border-white/[0.08] rounded-2xl p-6 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Revenue Health</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Based on refund rate, growth trajectory, and order volume</p>
                    </div>
                    <span className={healthScore >= 70 ? "text-2xl font-bold text-emerald-500" : healthScore >= 40 ? "text-2xl font-bold text-amber-500" : "text-2xl font-bold text-red-500"}>{healthScore}/100</span>
                </div>
                <div className="h-3 w-full bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                    <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{
                            width: `${healthScore}%`,
                            background: `linear-gradient(90deg, #ef4444 0%, #f59e0b 40%, #10b981 70%, #059669 100%)`
                        }}
                    />
                </div>
                <div className="flex justify-between mt-2 text-xs text-gray-400">
                    <span>Critical</span><span>Needs Attention</span><span>Healthy</span><span>Excellent</span>
                </div>
            </div>
        </div>
    );
};
