import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, ArrowUpRight, ArrowDownRight, TrendingUp, Zap } from 'lucide-react';
import { clsx } from 'clsx';
import { CustomTooltip } from './CustomTooltip';

interface TrendsTabProps {
    chartData: any[];
}

export const TrendsTab: React.FC<TrendsTabProps> = ({ chartData }) => {
    const lastRevenue = chartData[chartData.length - 1]?.revenue || 0;
    const lastMa3 = chartData[chartData.length - 1]?.ma3 || 0;
    const lastMa7 = chartData[chartData.length - 1]?.ma7 || 0;
    const prevMa7 = chartData[chartData.length - 3]?.ma7 || lastMa7;
    const momentum = lastMa3 > 0 ? ((lastRevenue - lastMa3) / lastMa3 * 100) : 0;
    const weeklyDir = lastMa7 > prevMa7 ? 'Up' : lastMa7 < prevMa7 ? 'Down' : 'Flat';
    const revenueValues = chartData.map((d: any) => d.revenue).filter(Boolean);
    const mean = revenueValues.length > 0 ? revenueValues.reduce((a: number, b: number) => a + b, 0) / revenueValues.length : 0;
    const variance = revenueValues.length > 0 ? revenueValues.reduce((sum: number, v: number) => sum + Math.pow(v - mean, 2), 0) / revenueValues.length : 0;
    const stdDev = Math.sqrt(variance);
    const volatility = mean > 0 ? Math.min(100, Math.round((stdDev / mean) * 100)) : 0;

    return (
        <div className="animate-[fadeIn_0.3s] space-y-6">
            {/* Header with Trend Badges */}
            <div className="bg-white dark:bg-white/[0.03] border border-neutral-200 dark:border-white/[0.08] rounded-2xl p-6 backdrop-blur-sm">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Trend Intelligence</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Moving Averages reduce daily noise to reveal actual business trajectory.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-gray-400/60" /><span className="text-xs text-gray-400">Daily</span></div>
                        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-sky-400" /><span className="text-xs text-gray-400">3-Day MA</span></div>
                        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /><span className="text-xs text-gray-400">7-Day MA</span></div>
                    </div>
                </div>

                <div className="h-[450px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="trendGradient7" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="trendGradient3" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.1} />
                                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--dashboard-muted)" opacity={0.2} />
                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--dashboard-muted)' }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--dashboard-muted)' }} tickFormatter={(v) => `₹${v}`} />
                            <Tooltip content={<CustomTooltip formatter={(v: number, name: string) => [`₹${(v || 0).toFixed(0)}`, name === 'revenue' ? 'Daily Net' : name === 'ma3' ? '3-Day MA' : '7-Day MA']} />} />
                            <Area type="monotone" dataKey="revenue" name="Daily Net Revenue" stroke="#94a3b8" strokeWidth={1.5} fill="none" dot={false} opacity={0.5} />
                            <Area type="monotone" dataKey="ma3" name="3-Day Trend" stroke="#0ea5e9" strokeWidth={2} fill="url(#trendGradient3)" dot={false} activeDot={{ r: 4, fill: '#0ea5e9', strokeWidth: 2, stroke: '#fff' }} />
                            <Area type="monotone" dataKey="ma7" name="7-Day Meta-Trend" stroke="#10b981" strokeWidth={3} fill="url(#trendGradient7)" dot={false} activeDot={{ r: 5, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Trend Insight Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                <div className="bg-white dark:bg-white/[0.03] border border-neutral-200 dark:border-white/[0.08] rounded-2xl p-5 backdrop-blur-sm">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center"><Activity className="w-4 h-4 text-sky-400" /></div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Short-term Momentum</p>
                    </div>
                    <div className="flex items-end gap-2">
                        <p className={clsx("text-2xl font-bold", momentum >= 0 ? "text-emerald-500" : "text-red-500")}>{momentum > 0 ? '+' : ''}{momentum.toFixed(1)}%</p>
                        {momentum >= 0 ? <ArrowUpRight className="w-5 h-5 text-emerald-400 mb-1" /> : <ArrowDownRight className="w-5 h-5 text-red-400 mb-1" />}
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Current vs 3-day average</p>
                </div>
                <div className="bg-white dark:bg-white/[0.03] border border-neutral-200 dark:border-white/[0.08] rounded-2xl p-5 backdrop-blur-sm">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center"><TrendingUp className="w-4 h-4 text-emerald-400" /></div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Weekly Trend Direction</p>
                    </div>
                    <p className={clsx("text-2xl font-bold", weeklyDir === 'Up' ? "text-emerald-500" : weeklyDir === 'Down' ? "text-red-500" : "text-gray-400")}>{weeklyDir === 'Up' ? '↗ Upward' : weeklyDir === 'Down' ? '↘ Downward' : '→ Flat'}</p>
                    <p className="text-xs text-gray-400 mt-2">Based on 7-day moving average</p>
                </div>
                <div className="bg-white dark:bg-white/[0.03] border border-neutral-200 dark:border-white/[0.08] rounded-2xl p-5 backdrop-blur-sm">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center"><Zap className="w-4 h-4 text-amber-400" /></div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Volatility Score</p>
                    </div>
                    <div className="flex items-end gap-2">
                        <p className={clsx("text-2xl font-bold", volatility < 30 ? "text-emerald-500" : volatility < 60 ? "text-amber-500" : "text-red-500")}>{volatility}/100</p>
                        <span className={clsx("text-xs font-semibold px-2 py-0.5 rounded-full mb-1", volatility < 30 ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" : volatility < 60 ? "bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400" : "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400")}>
                            {volatility < 30 ? 'Stable' : volatility < 60 ? 'Moderate' : 'High'}
                        </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Revenue coefficient of variation</p>
                </div>
            </div>
        </div>
    );
};
