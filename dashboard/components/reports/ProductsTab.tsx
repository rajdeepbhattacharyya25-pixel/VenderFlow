import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Package, Award, AlertTriangle } from 'lucide-react';
import { clsx } from 'clsx';
import { CustomTooltip } from './CustomTooltip';

interface ProductsTabProps {
    topProducts: any[];
    revenueStats: any;
}

export const ProductsTab: React.FC<ProductsTabProps> = ({ topProducts, revenueStats }) => {
    return (
        <div className="animate-[fadeIn_0.3s] space-y-6">
            {topProducts.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-white/[0.03] rounded-2xl border border-neutral-200 dark:border-white/[0.08] border-dashed">
                    <Package className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
                    <p className="text-neutral-500 dark:text-neutral-400 font-medium text-lg">No product data available</p>
                    <p className="text-neutral-400 dark:text-neutral-500 text-sm mt-1">Import data or wait for orders in the selected period.</p>
                </div>
            ) : (
                <>
                    {/* Top 3 Product Spotlight */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                        {topProducts.slice(0, 3).map((product: any, idx: number) => {
                            const contrib = revenueStats.gross > 0 ? (product.revenue / revenueStats.gross * 100) : 0;
                            const rankColors = [
                                { border: 'border-amber-500/30 hover:border-amber-500/50', bg: 'from-amber-500/10', icon: 'text-amber-400', label: '#1' },
                                { border: 'border-gray-400/30 hover:border-gray-400/50', bg: 'from-gray-400/10', icon: 'text-gray-400', label: '#2' },
                                { border: 'border-orange-600/30 hover:border-orange-600/50', bg: 'from-orange-600/10', icon: 'text-orange-500', label: '#3' }
                            ];
                            const rank = rankColors[idx];
                            return (
                                <div key={idx} className={clsx("relative overflow-hidden bg-white dark:bg-white/[0.03] border rounded-2xl p-5 backdrop-blur-sm transition-all duration-300", rank.border)}>
                                    <div className={clsx("absolute inset-0 bg-gradient-to-br to-transparent pointer-events-none", rank.bg)} />
                                    <div className="relative z-10">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className={clsx("text-xs font-bold px-2.5 py-1 rounded-full bg-white/5 border border-white/10", rank.icon)}>{rank.label}</span>
                                            <Award className={clsx("w-5 h-5", rank.icon)} />
                                        </div>
                                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate mb-2">{product.name}</h4>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-xs text-gray-400">Units Sold</p>
                                                <p className="text-lg font-bold text-gray-900 dark:text-white">{product.units.toLocaleString()}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-gray-400">Contribution</p>
                                                <p className="text-lg font-bold text-indigo-500 dark:text-indigo-400">{contrib.toFixed(1)}%</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Product Performance Table */}
                    <div className="bg-white dark:bg-white/[0.03] border border-neutral-200 dark:border-white/[0.08] rounded-2xl p-6 backdrop-blur-sm">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Product Performance</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[800px]">
                                <thead>
                                    <tr className="border-b border-neutral-200 dark:border-white/[0.08] text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                                        <th className="pb-3 px-4 font-medium">Product</th>
                                        <th className="pb-3 px-4 font-medium text-right">Units</th>
                                        <th className="pb-3 px-4 font-medium text-right">Refund %</th>
                                        <th className="pb-3 px-4 font-medium text-right">ASP</th>
                                        <th className="pb-3 px-4 font-medium text-right">Revenue</th>
                                        <th className="pb-3 px-4 font-medium text-right">Share</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {topProducts.map((product: any, idx: number) => {
                                        const totalUnits = product.units + product.refunded_units;
                                        const refundRate = totalUnits > 0 ? (product.refunded_units / totalUnits) * 100 : 0;
                                        const asp = product.units > 0 ? (product.revenue / product.units) : 0;
                                        const contrib = revenueStats.gross > 0 ? (product.revenue / revenueStats.gross) * 100 : 0;
                                        const maxUnits = ((topProducts as any)[0] as any)?.units || 1;

                                        return (
                                            <tr key={idx} className="border-b border-neutral-100 dark:border-white/[0.04] hover:bg-indigo-50/50 dark:hover:bg-white/[0.02] transition-colors">
                                                <td className="py-4 px-4">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-xs font-bold text-theme-muted w-5">{idx + 1}</span>
                                                        <span className="font-medium text-sm text-theme-text">{product.name}</span>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <span className="text-sm font-medium text-theme-text opacity-80">{product.units.toLocaleString()}</span>
                                                        <div className="w-12 h-1.5 bg-theme-border/20 rounded-full overflow-hidden">
                                                            <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${(product.units / maxUnits) * 100}%` }} />
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-4 text-right">
                                                    <span className={clsx(
                                                        "text-xs font-bold px-2.5 py-1 rounded-full",
                                                        refundRate > 10 ? "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400" :
                                                            refundRate > 5 ? "bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400" :
                                                                "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                                                    )}>
                                                        {refundRate.toFixed(1)}%
                                                    </span>
                                                </td>
                                                <td className="py-4 px-4 text-right text-sm font-medium text-gray-600 dark:text-gray-300">₹{asp.toFixed(0)}</td>
                                                <td className="py-4 px-4 text-right text-sm font-bold text-gray-900 dark:text-white">₹{product.revenue.toLocaleString()}</td>
                                                <td className="py-4 px-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <span className="text-xs font-semibold text-gray-500">{contrib.toFixed(1)}%</span>
                                                        <div className="w-16 h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                                                            <div className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full transition-all duration-500" style={{ width: `${contrib}%` }} />
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Revenue Distribution Chart */}
                    <div className="bg-white dark:bg-white/[0.03] border border-neutral-200 dark:border-white/[0.08] rounded-2xl p-6 backdrop-blur-sm">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Revenue Distribution</h3>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={topProducts.slice(0, 8).map((p: any) => ({ name: p.name.length > 20 ? p.name.slice(0, 20) + '…' : p.name, revenue: p.revenue }))} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
                                    <defs>
                                        <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                                            <stop offset="0%" stopColor="#6366f1" />
                                            <stop offset="100%" stopColor="#22d3ee" />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--dashboard-muted)" opacity={0.2} />
                                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--dashboard-muted)' }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                                    <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--dashboard-muted)' }} width={80} />
                                    <Tooltip content={<CustomTooltip formatter={(v: number) => [`₹${v?.toLocaleString()}`, 'Revenue']} />} />
                                    <Bar dataKey="revenue" fill="url(#barGradient)" radius={[0, 6, 6, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Refund Risk Matrix */}
                    {topProducts.filter((p: any) => {
                        const total = p.units + p.refunded_units;
                        return total > 0 && (p.refunded_units / total) * 100 > 10;
                    }).length > 0 && (
                            <div className="bg-white dark:bg-white/[0.03] border border-red-500/20 rounded-2xl p-6 backdrop-blur-sm">
                                <div className="flex items-center gap-3 mb-5">
                                    <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center"><AlertTriangle className="w-4 h-4 text-red-400" /></div>
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Refund Risk Matrix</h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Products with refund rate exceeding 10%</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {topProducts.filter((p: any) => {
                                        const total = p.units + p.refunded_units;
                                        return total > 0 && (p.refunded_units / total) * 100 > 10;
                                    }).map((product: any, idx: number) => {
                                        const total = product.units + product.refunded_units;
                                        const rate = (product.refunded_units / total) * 100;
                                        return (
                                            <div key={idx} className="p-4 rounded-xl bg-red-50/50 dark:bg-red-500/5 border border-red-200/50 dark:border-red-500/10">
                                                <div className="flex items-center justify-between mb-2">
                                                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{product.name}</h4>
                                                    <span className="text-xs font-bold text-red-500 bg-red-100 dark:bg-red-500/20 px-2 py-0.5 rounded-full">{rate.toFixed(1)}%</span>
                                                </div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">{product.refunded_units} units refunded out of {total} total — ₹{product.refund_amount?.toLocaleString() || 0} lost</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                </>
            )}
        </div>
    );
};
