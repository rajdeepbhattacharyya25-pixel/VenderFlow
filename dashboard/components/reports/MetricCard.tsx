import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { clsx } from 'clsx';

export const MetricCard = ({ title, value, icon, bgClass, trend }: { title: string, value: string | number, icon: React.ReactNode, bgClass: string, trend?: number }) => (
    <div className="relative bg-white dark:bg-white/[0.03] border border-neutral-200 dark:border-white/[0.08] rounded-2xl p-5 md:p-6 shadow-sm hover:shadow-lg dark:hover:border-white/[0.15] transition-all duration-300 backdrop-blur-sm overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
        <div className="relative z-10">
            <div className="flex items-start justify-between mb-3">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
                <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110", bgClass)}>
                    {icon}
                </div>
            </div>
            <div className="flex items-end gap-3">
                <h3 className="text-2xl lg:text-3xl font-heading font-bold text-gray-900 dark:text-white">{value}</h3>
                {trend !== undefined && (
                    <span className={clsx(
                        "text-xs font-semibold px-2.5 py-1 rounded-full mb-1 flex items-center gap-1",
                        trend > 0 ? "text-emerald-700 bg-emerald-100 dark:bg-emerald-500/20 dark:text-emerald-400" :
                            trend < 0 ? "text-red-700 bg-red-100 dark:bg-red-500/20 dark:text-red-400" :
                                "text-gray-700 bg-gray-100 dark:bg-gray-800 dark:text-gray-400"
                    )}>
                        {trend > 0 ? <ArrowUpRight className="w-3 h-3" /> : trend < 0 ? <ArrowDownRight className="w-3 h-3" /> : null}
                        {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
                    </span>
                )}
            </div>
            {trend !== undefined && <p className="text-xs text-gray-400 mt-2">vs previous period</p>}
        </div>
    </div>
);
