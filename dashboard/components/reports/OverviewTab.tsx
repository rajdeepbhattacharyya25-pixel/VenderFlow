import React from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, ShoppingBag, TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { clsx } from 'clsx';
import { MetricCard } from './MetricCard';
import { CustomTooltip } from './CustomTooltip';

interface OverviewTabProps {
    revenueStats: any;
    chartData: any[];
    chartTitleRange: string;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ revenueStats, chartData, chartTitleRange }) => {
    return (
        <div className="animate-[fadeIn_0.3s]">
            {/* Metric Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
                <MetricCard
                    title="Net Revenue"
                    value={`₹${revenueStats.net.toLocaleString()}`}
                    icon={<DollarSign className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />}
                    bgClass="bg-emerald-50 dark:bg-emerald-500/10"
                    trend={revenueStats.growthRate}
                />
                <MetricCard
                    title="Total Orders"
                    value={revenueStats.totalOrders.toLocaleString()}
                    icon={<ShoppingBag className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />}
                    bgClass="bg-indigo-50 dark:bg-indigo-500/10"
                />
                <MetricCard
                    title="Refund Rate"
                    value={`${revenueStats.refundRate.toFixed(1)}%`}
                    icon={revenueStats.refundRate > 5 ? <ArrowUpRight className="w-6 h-6 text-red-600" /> : <ArrowDownRight className="w-6 h-6 text-emerald-600" />}
                    bgClass={revenueStats.refundRate > 5 ? "bg-red-50 dark:bg-red-500/10" : "bg-emerald-50 dark:bg-emerald-500/10"}
                />
                <MetricCard
                    title="Revenue Growth"
                    value={`${revenueStats.growthRate > 0 ? '+' : ''}${revenueStats.growthRate.toFixed(1)}%`}
                    icon={<TrendingUp className={`w-6 h-6 ${revenueStats.growthRate >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`} />}
                    bgClass={revenueStats.growthRate >= 0 ? "bg-emerald-50 dark:bg-emerald-500/10" : "bg-red-50 dark:bg-red-500/10"}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <div className="lg:col-span-2 bg-white dark:bg-white/[0.03] border border-neutral-200 dark:border-white/[0.08] rounded-2xl p-6 backdrop-blur-sm">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Net Revenue ({chartTitleRange})</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                <defs>
                                    <linearGradient id="overviewGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.25} />
                                        <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--dashboard-muted)" opacity={0.2} />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--dashboard-muted)' }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--dashboard-muted)' }} tickFormatter={(v) => `₹${v}`} />
                                <Tooltip content={<CustomTooltip formatter={(v: number) => [`₹${v?.toFixed(0)}`, 'Revenue']} />} />
                                <Area type="monotone" dataKey="revenue" stroke="#4F46E5" strokeWidth={2.5} fill="url(#overviewGradient)" dot={false} activeDot={{ r: 5, fill: '#4F46E5', strokeWidth: 2, stroke: '#fff' }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="bg-white dark:bg-white/[0.03] border border-neutral-200 dark:border-white/[0.08] rounded-2xl p-6 backdrop-blur-sm">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Daily Orders</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: -20 }}>
                                <defs>
                                    <linearGradient id="ordersBarGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#6366F1" stopOpacity={1} />
                                        <stop offset="100%" stopColor="#818CF8" stopOpacity={0.6} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--dashboard-muted)" opacity={0.2} />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--dashboard-muted)' }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--dashboard-muted)' }} allowDecimals={false} />
                                <Tooltip content={<CustomTooltip formatter={(v: number) => [v, 'Orders']} />} cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }} />
                                <Bar dataKey="orders" fill="url(#ordersBarGradient)" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};
