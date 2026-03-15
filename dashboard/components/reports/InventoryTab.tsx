import React from 'react';
import { Package, AlertTriangle, Activity, Trophy, Zap } from 'lucide-react';
import { clsx } from 'clsx';
import { MetricCard } from './MetricCard';

interface InventoryTabProps {
    inventoryForecast: any[];
}

export const InventoryTab: React.FC<InventoryTabProps> = ({ inventoryForecast }) => {
    return (
        <div className="animate-[fadeIn_0.3s] space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <MetricCard
                    title="Total SKUs"
                    value={inventoryForecast.length.toString()}
                    icon={<Package className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />}
                    bgClass="bg-indigo-50 dark:bg-indigo-500/10"
                />
                <MetricCard
                    title="Critical Alerts"
                    value={inventoryForecast.filter(i => i.stock_status === 'Critical' || i.stock_status === 'Out of Stock').length.toString()}
                    icon={<AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />}
                    bgClass="bg-red-50 dark:bg-red-500/10"
                />
                <MetricCard
                    title="Avg Stockout Window"
                    value={`${Math.round(inventoryForecast.reduce((acc, i) => acc + (i.days_until_stockout || 0), 0) / (inventoryForecast.length || 1))} Days`}
                    icon={<Activity className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />}
                    bgClass="bg-emerald-50 dark:bg-emerald-500/10"
                />
                <MetricCard
                    title="Health Score"
                    value={`${Math.round((inventoryForecast.filter(i => i.stock_status === 'Healthy').length / (inventoryForecast.length || 1)) * 100)}%`}
                    icon={<Trophy className="w-6 h-6 text-amber-600 dark:text-amber-400" />}
                    bgClass="bg-amber-50 dark:bg-amber-500/10"
                />
            </div>

            <div className="bg-white dark:bg-white/[0.03] border border-neutral-200 dark:border-white/[0.08] rounded-2xl overflow-hidden backdrop-blur-sm">
                <div className="p-6 border-b border-neutral-200 dark:border-white/[0.08] flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Predictive Inventory Insights</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">30-day forecast based on recent velocity and seasonality.</p>
                    </div>
                    <div className="px-3 py-1.5 bg-indigo-500/10 rounded-lg flex items-center gap-2">
                        <Zap className="w-4 h-4 text-indigo-400 animate-pulse" />
                        <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">AI Powered</span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-neutral-50 dark:bg-neutral-900/50">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Product</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-center">Current Stock</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-center">Est. Velocity</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-center">Stockout In</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100 dark:divide-white/[0.05]">
                            {inventoryForecast.sort((a,b) => (a.days_until_stockout || 999) - (b.days_until_stockout || 999)).map((item, idx) => (
                                <tr key={idx} className="hover:bg-neutral-50 dark:hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-neutral-200 dark:bg-neutral-800 shrink-0">
                                                {item.image_url && <img src={item.image_url} alt={item.name} className="w-full h-full object-cover rounded-lg" />}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-indigo-500 transition-colors">{item.name}</p>
                                                <p className="text-xs text-gray-500">Category: {item.category}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="text-sm font-bold text-gray-900 dark:text-white">{item.stock_quantity || 0}</span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="text-sm text-gray-500">{item.avg_daily_velocity?.toFixed(2) || 0} / day</span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex flex-col items-center">
                                            <span className={clsx(
                                                "text-sm font-bold",
                                                (item.days_until_stockout || 0) < 7 ? "text-red-500" : (item.days_until_stockout || 0) < 14 ? "text-amber-500" : "text-emerald-500"
                                            )}>
                                                {item.days_until_stockout === 0 ? 'CRITICAL' : `${item.days_until_stockout || 0} Days`}
                                            </span>
                                            {item.expected_stockout_date && (
                                                <span className="text-[10px] text-gray-400">{new Date(item.expected_stockout_date).toLocaleDateString()}</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className={clsx(
                                            "text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full",
                                            item.stock_status === 'Healthy' ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" :
                                            item.stock_status === 'Critical' ? "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400" :
                                            "bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400"
                                        )}>
                                            {item.stock_status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
