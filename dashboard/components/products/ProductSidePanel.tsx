import React, { useState } from 'react';
import { TrendingUp, Package, AlertCircle, ChevronRight, History } from 'lucide-react';

const ProductSidePanel = () => {
    const [activeTab, setActiveTab] = useState<'insights' | 'inventory'>('insights');

    return (
        <div className="h-full flex flex-col gap-6">

            {/* Tab Switcher */}
            <div className="flex bg-theme-panel rounded-lg p-1 border border-theme-border">
                <button
                    onClick={() => setActiveTab('insights')}
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'insights' ? 'bg-theme-bg text-theme-text shadow-sm' : 'text-theme-muted hover:text-theme-text'}`}
                >
                    Insights
                </button>
                <button
                    onClick={() => setActiveTab('inventory')}
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'inventory' ? 'bg-theme-bg text-theme-text shadow-sm' : 'text-theme-muted hover:text-theme-text'}`}
                >
                    Inventory Ops
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1">

                {activeTab === 'insights' ? (
                    <>
                        {/* Summary Widget */}
                        <div className="p-4 rounded-xl bg-theme-panel border border-theme-border">
                            <h4 className="flex items-center gap-2 font-semibold text-theme-text mb-4">
                                <TrendingUp size={16} className="text-sky-600 dark:text-sky-400" />
                                30-Day Performance
                            </h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="text-xs text-theme-muted block">Revenue</span>
                                    <span className="text-lg font-bold text-theme-text">$12,450</span>
                                    <span className="text-xs text-green-500 block">↑ 12%</span>
                                </div>
                                <div>
                                    <span className="text-xs text-theme-muted block">Units Sold</span>
                                    <span className="text-lg font-bold text-theme-text">840</span>
                                    <span className="text-xs text-red-500 block">↓ 3%</span>
                                </div>
                            </div>
                        </div>

                        {/* Top Movers */}
                        <div className="p-4 rounded-xl bg-theme-panel border border-theme-border">
                            <h4 className="flex items-center gap-2 font-semibold text-theme-text mb-4">
                                <Package size={16} className="text-lime-600 dark:text-lime-400" />
                                Fast Moving Stock
                            </h4>
                            <div className="space-y-3">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded bg-theme-bg/50"></div>
                                            <span className="text-theme-text">Premium T-Shirt</span>
                                        </div>
                                        <span className="font-mono text-sky-600 dark:text-sky-400">45 left</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        {/* Actions */}
                        <div className="p-4 rounded-xl bg-theme-panel border border-theme-border space-y-3">
                            <h4 className="font-semibold text-theme-text mb-2">Inventory Actions</h4>
                            <button className="w-full flex items-center justify-between p-3 rounded-lg bg-theme-bg border border-theme-border hover:border-theme-chart-line/50 transition-colors group">
                                <span className="text-sm font-medium text-theme-text">Update Stock Count</span>
                                <ChevronRight size={16} className="text-theme-muted group-hover:text-theme-chart-line" />
                            </button>
                            <button className="w-full flex items-center justify-between p-3 rounded-lg bg-theme-bg border border-theme-border hover:border-theme-chart-line/50 transition-colors group">
                                <span className="text-sm font-medium text-theme-text">Export Stock Report</span>
                                <ChevronRight size={16} className="text-theme-muted group-hover:text-theme-chart-line" />
                            </button>
                        </div>

                        {/* Low Stock Alerts */}
                        <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/10">
                            <h4 className="flex items-center gap-2 font-semibold text-red-500 mb-3">
                                <AlertCircle size={16} />
                                Low Stock Alerts
                            </h4>
                            <ul className="space-y-2">
                                <li className="text-sm text-theme-text flex justify-between">
                                    <span>Blue Jeans (32)</span>
                                    <span className="font-bold">2 left</span>
                                </li>
                                <li className="text-sm text-theme-text flex justify-between">
                                    <span>Red Scarf</span>
                                    <span className="font-bold">0 left</span>
                                </li>
                            </ul>
                        </div>
                    </>
                )}

                {/* Audit Log Stub */}
                <div className="mt-auto p-4 rounded-xl border border-dashed border-theme-border">
                    <h4 className="flex items-center gap-2 font-medium text-theme-muted text-xs mb-3">
                        <History size={14} />
                        Recent Activity
                    </h4>
                    <div className="space-y-3 pl-2 border-l border-theme-border">
                        <div className="relative">
                            <div className="absolute -left-[13px] top-1 w-2 h-2 rounded-full bg-theme-chart-line"></div>
                            <p className="text-xs text-theme-text">Stock updated from 10 to 50</p>
                            <span className="text-[10px] text-theme-muted">2 mins ago by Admin</span>
                        </div>
                        <div className="relative">
                            <div className="absolute -left-[13px] top-1 w-2 h-2 rounded-full bg-theme-muted"></div>
                            <p className="text-xs text-theme-text">Product "Sweater" created</p>
                            <span className="text-[10px] text-theme-muted">1 hour ago by Store Manager</span>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default ProductSidePanel;
