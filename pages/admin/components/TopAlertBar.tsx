import React, { useState, useEffect } from 'react';
import { AlertCircle, Activity, Shield, Zap, ChevronRight, X } from 'lucide-react';
import { adminDb } from '../../../lib/admin-api';

interface Alert {
    severity: 'critical' | 'warning' | 'info';
    message: string;
    actionLabel?: string;
    actionUrl?: string;
}

interface AdminStats {
    healthStatus: 'Critical' | 'Warning' | 'Normal' | 'Operational' | 'Error';
    storagePercentage: number;
}

const TopAlertBar: React.FC = () => {
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [currentAlertIndex, setCurrentAlertIndex] = useState(0);
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [statsData, alertsData] = await Promise.all([
                    adminDb.getAdminStats(),
                    adminDb.getCriticalAlerts()
                ]);
                setStats(statsData);
                setAlerts(alertsData);
            } catch (error) {
                console.error('Error fetching alert bar data:', error);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 60000); // Refresh every minute
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (alerts.length > 1) {
            const interval = setInterval(() => {
                setCurrentAlertIndex((prev) => (prev + 1) % alerts.length);
            }, 5000); // Rotate alerts every 5 seconds
            return () => clearInterval(interval);
        }
    }, [alerts]);

    if (!isVisible) return null;

    const healthColorClass = stats?.healthStatus === 'Critical' ? 'hud-text-red' : 
                            stats?.healthStatus === 'Warning' ? 'hud-text-amber' : 
                            'hud-text-emerald';

    const healthBgClass = stats?.healthStatus === 'Critical' ? 'bg-red-500/10' : 
                         stats?.healthStatus === 'Warning' ? 'bg-[#FFB800]/10' : 
                         'bg-[#10B981]/10';

    const healthBorderClass = stats?.healthStatus === 'Critical' ? 'hud-border-red opacity-40' : 
                             stats?.healthStatus === 'Warning' ? 'hud-border-amber opacity-40' : 
                             'hud-border-emerald opacity-20';

    return (
        <div className="sticky top-0 w-full bg-[#0B0F19]/80 backdrop-blur-md border-b border-white/5 h-8 flex items-center px-4 md:px-8 overflow-hidden z-[60] group hud-glass">
            {/* Background Glow */}
            <div className={`absolute inset-0 bg-gradient-to-r ${stats?.healthStatus === 'Critical' ? 'from-red-500/5' : 'from-emerald-500/5'} via-transparent to-transparent opacity-50`}></div>
            
            {/* System Status Section */}
            <div className="flex items-center gap-6 z-10">
                <div className={`flex items-center gap-2 px-2 py-0.5 rounded-sm border ${healthBorderClass} ${healthBgClass} transition-all duration-500`}>
                    <Activity size={12} className={healthColorClass} />
                    <span className={`text-[10px] font-technical font-bold uppercase tracking-wider ${healthColorClass}`}>
                        SYS: {stats?.healthStatus || 'LOADING...'}
                    </span>
                    <div className={`w-1 h-1 rounded-full ${stats?.healthStatus === 'Critical' ? 'bg-red-500' : 'bg-[#10B981]'} animate-pulse`}></div>
                </div>

                <div className="hidden md:flex items-center gap-4 text-[10px] font-technical text-neutral-500 uppercase tracking-widest">
                    <div className="flex items-center gap-1.5 border-r border-white/10 pr-4">
                        <Shield size={10} className="hud-text-cyan" />
                        <span>Security: <span className="text-neutral-300">Hardened</span></span>
                    </div>
                    <div className="flex items-center gap-1.5 border-r border-white/10 pr-4">
                        <Zap size={10} className="hud-text-amber" />
                        <span>Storage: <span className="text-neutral-300">{stats?.storagePercentage || 12}%</span></span>
                    </div>
                </div>
            </div>

            {/* Alert Carousel */}
            <div className="flex-1 flex justify-center items-center px-4 overflow-hidden z-10">
                {alerts.length > 0 ? (
                    <div className="flex items-center gap-2 animate-in slide-in-from-top-2 duration-500">
                        <AlertCircle size={12} className={alerts[currentAlertIndex].severity === 'critical' ? 'hud-text-red' : 'hud-text-amber'} />
                        <p className="text-[11px] font-technical text-neutral-300 truncate max-w-md uppercase tracking-tight">
                            {alerts[currentAlertIndex].message}
                        </p>
                        {alerts[currentAlertIndex].actionLabel && (
                            <a 
                                href={alerts[currentAlertIndex].actionUrl} 
                                title={alerts[currentAlertIndex].actionLabel}
                                className="text-[10px] font-bold hud-text-emerald hover:text-emerald-300 flex items-center gap-0.5 group/link bg-emerald-500/5 px-2 py-0.5 rounded ml-2 border border-emerald-500/20"
                            >
                                {alerts[currentAlertIndex].actionLabel}
                                <ChevronRight size={10} className="group-hover/link:translate-x-0.5 transition-transform" />
                            </a>
                        )}
                        {alerts.length > 1 && (
                            <span className="text-[9px] text-neutral-600 font-data ml-2">
                                +{alerts.length - 1} MORE
                            </span>
                        )}
                    </div>
                ) : (
                    <p className="text-[10px] font-technical text-neutral-600 uppercase tracking-widest italic opacity-50">
                        [ All_Systems_Operational // No_Critical_Alerts ]
                    </p>
                )}
            </div>

            {/* Close Button / Info Toggle */}
            <div className="flex items-center gap-4 z-10">
                <div className="hidden lg:flex items-center gap-2 text-[10px] font-technical text-neutral-500">
                    <span className="animate-pulse hud-text-emerald">●</span>
                    <span className="tracking-tighter">LIVE_FEED: ACTIVE</span>
                </div>
                <button 
                    onClick={() => setIsVisible(false)}
                    className="p-1 hover:bg-white/5 rounded transition-colors text-neutral-600 hover:text-neutral-400 lg:opacity-0 group-hover:opacity-100"
                    title="Dismiss_Top_Bar"
                    aria-label="Dismiss Top Bar"
                >
                    <X size={14} />
                </button>
            </div>
            
            {/* HUD Scanline Effect */}
            <div className="absolute inset-x-0 bottom-0 h-[1px] bg-white/20 animate-scanline pointer-events-none"></div>
            <div className="absolute inset-0 hud-scanlines opacity-[0.03] pointer-events-none"></div>
        </div>
    );
};

export default TopAlertBar;
