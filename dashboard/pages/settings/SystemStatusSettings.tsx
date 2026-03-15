import React from 'react';
import { Activity, RefreshCw, AlertCircle, Database, Layout, Clock, Zap, Globe, Info, Loader2 } from 'lucide-react';

export const SystemStatusSettings = ({ settings, setSettings, renderHeader, handleLogoUpload, saving, setSaving, show2FAModal, setShow2FAModal, timeoutVal, setTimeoutVal, timeoutUnit, setTimeoutUnit, systemStatus, apiUsage, loadingApiUsage, sessions, loadingSessions, selectedSessions, setSelectedSessions, isRevoking, handleRevokeSession, handleRevokeSelected, formatUaString, getDeviceIcon, DEFAULT_THEME_CONFIG, activePreviews, previewLoading, setPreviewLoading, fetchPreviews, fetchApiUsage }: any) => {
    return (
        <div className="bg-panel rounded-2xl p-4 md:p-6 lg:p-8 border border-border shadow-sm animate-fadeIn">
                        {renderHeader('System Status', <Activity size={20} />)}
                        <div className="space-y-6">
                            <div className="bg-bg/50 p-6 rounded-2xl border border-border">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className={`w-10 h-10 ${systemStatus.database.status === 'connected' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'} rounded-full flex items-center justify-center`}>
                                        <Database size={20} />
                                    </div>
                                    <h4 className="font-bold text-sm">Database Connection</h4>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                    <span className={`w-2.5 h-2.5 rounded-full ${systemStatus.database.status === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                                    <span className="text-muted">Status: </span>
                                    <span className={`font-bold ${systemStatus.database.status === 'connected' ? 'text-green-600' : 'text-red-500'}`}>
                                        {systemStatus.database.status === 'checking' ? 'Checking...' :
                                            systemStatus.database.status === 'connected' ? 'Active & Connected' : 'Disconnected'}
                                    </span>
                                </div>
                                {systemStatus.database.latency && (
                                    <div className="mt-2 text-xs text-muted">
                                        Latency: {systemStatus.database.latency}ms
                                    </div>
                                )}
                                <div className="mt-4 pt-4 border-t border-border flex flex-wrap gap-2 justify-between text-[10px] font-bold text-muted uppercase tracking-wider">
                                    <span>Cloud Provider: {systemStatus.provider}</span>
                                    <span>Region: {systemStatus.region}</span>
                                </div>
                            </div>

                            <div className="bg-bg/50 p-6 rounded-2xl border border-border">
                                <div className="flex items-center gap-3 mb-4 text-orange-500">
                                    <Zap size={20} />
                                    <h4 className="font-bold text-sm">API Infrastructure</h4>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-muted">Edge Functions</span>
                                        <span className={`font-bold ${systemStatus.api.status === 'healthy' ? 'text-green-600' : 'text-red-500'}`}>
                                            {systemStatus.api.status === 'checking' ? '...' :
                                                systemStatus.api.status === 'healthy' ? 'Healthy' : 'Degraded'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-muted">Realtime Channel</span>
                                        <span className={`font-bold ${systemStatus.realtime.status === 'live' ? 'text-green-600' : 'text-red-500'}`}>
                                            {systemStatus.realtime.status === 'checking' ? '...' :
                                                systemStatus.realtime.status === 'live' ? 'Live' : 'Offline'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-muted">Storage Buckets</span>
                                        <span className={`font-bold ${systemStatus.storage.status === 'online' ? 'text-green-600' : 'text-red-500'}`}>
                                            {systemStatus.storage.status === 'checking' ? '...' :
                                                systemStatus.storage.status === 'online' ? 'Online' : 'Offline'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-bg/50 p-6 rounded-2xl border border-border">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3 text-primary">
                                        <Globe size={20} />
                                        <h4 className="font-bold text-sm">Third-party API Usage</h4>
                                    </div>
                                    <button
                                        onClick={fetchApiUsage}
                                        className="text-muted hover:text-primary transition-colors"
                                        title="Refresh API Usage"
                                    >
                                        <RefreshCw size={14} className={loadingApiUsage ? "animate-spin" : ""} />
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    {loadingApiUsage && apiUsage.length === 0 ? (
                                        <div className="flex items-center justify-center py-4">
                                            <Loader2 className="animate-spin text-muted" size={20} />
                                        </div>
                                    ) : apiUsage.length > 0 ? (
                                        apiUsage.map((api) => {
                                            const usagePct = (api.count / api.limit) * 100;
                                            const isCritical = usagePct >= api.threshold;

                                            return (
                                                <div key={api.provider} className="space-y-2">
                                                    <div className="flex justify-between items-center text-xs">
                                                        <span className="font-bold uppercase tracking-wider text-text">
                                                            {api.provider.replace('_', ' ')}
                                                        </span>
                                                        <span className={`font-medium ${isCritical ? 'text-red-500' : 'text-muted'}`}>
                                                            {api.count.toLocaleString()} / {api.limit.toLocaleString()} reqs
                                                        </span>
                                                    </div>
                                                    <div className="h-2 w-full bg-border rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full transition-all duration-1000 ${usagePct >= 95 ? 'bg-red-500' :
                                                                usagePct >= api.threshold ? 'bg-orange-500' :
                                                                    'bg-primary'
                                                                }`}
                                                            style={{ width: `${Math.min(usagePct, 100)}%` }}
                                                        />
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-[10px] text-muted">
                                                            Alert Threshold: {api.threshold}%
                                                        </span>
                                                        <span className={`text-[10px] font-bold ${isCritical ? 'text-red-500 animate-pulse' : 'text-green-600'}`}>
                                                            {isCritical ? 'CRITICAL LIMIT' : 'HEALTHY'}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <p className="text-xs text-muted italic text-center py-2">No API configuration found.</p>
                                    )}
                                </div>

                                <div className="mt-6 p-4 bg-primary/5 rounded-xl border border-primary/10">
                                    <div className="flex gap-3">
                                        <Info size={14} className="text-primary flex-shrink-0 mt-0.5" />
                                        <p className="text-[10px] text-muted leading-relaxed">
                                            Usage stats reset on the 1st of every month. Critical alerts are automatically sent to the Admin Telegram bot when reaching the threshold.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                
    );
};
