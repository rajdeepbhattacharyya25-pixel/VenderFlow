/**
 * pages/admin/AdminAnalytics.tsx
 * Native admin analytics panel — 4-step conversion funnel and live store log.
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
    TrendingUp, Users, Clock, RefreshCw, AlertCircle,
    ArrowUpRight, ArrowDownRight, Activity, Zap,
    Shield, Globe, Database, Terminal
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

// ── Types ─────────────────────────────────────────────────────────────────────

interface FunnelStep {
    name: string;
    count: number;
}

interface FunnelData {
    total_visitors: number;
    signups: number;
    stores_created: number;
    published: number;
    conversion_rate: number;
    steps: FunnelStep[];
}

interface TrafficData {
    visitors_7d: number;
    change_pct: number;
}

interface VendorActivityData {
    weekly_active: number;
    new_this_week: number;
    change_pct: number;
}

interface TimeToPublishData {
    p50_hours: number;
    p90_hours: number;
    top_dropoff_step: string;
}

interface RecentStoreEvent {
    id: string;
    timestamp: string;
    distinct_id: string;
    properties: {
        store_name: string;
        slug: string;
        plan: string;
        client_request_id: string;
    };
}

interface AnalyticsData {
    funnel: FunnelData | null;
    traffic: TrafficData | null;
    vendors: VendorActivityData | null;
    publish: TimeToPublishData | null;
    recent_events: RecentStoreEvent[] | null;
    last_updated: string;
    errors?: {
        funnel: string | null;
        traffic: string | null;
        vendors: string | null;
        publish: string | null;
        recent_events: string | null;
    };
}

// ── Shared UI Components ──────────────────────────────────────────────────────

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

const PulseIndicator = ({ active = true }: { active?: boolean }) => (
    <div className="relative flex h-2 w-2">
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${active ? 'bg-emerald-400' : 'bg-red-400'} opacity-75`}></span>
        <span className={`relative inline-flex rounded-full h-2 w-2 ${active ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
    </div>
);

// ── Main Component ────────────────────────────────────────────────────────────

export default function AdminAnalytics() {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAnalytics = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('No auth session');

            const res = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/posthog-proxy`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        widgets: ['funnel', 'traffic', 'vendors', 'publish', 'recent_events']
                    }),
                }
            );
            if (!res.ok) {
                const msg = await res.text();
                throw new Error(msg || `HTTP ${res.status}`);
            }
            const json = await res.json();
            setData(json);
        } catch (err) {
            console.error('Analytics Error:', err);
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAnalytics();
        const interval = setInterval(fetchAnalytics, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [fetchAnalytics]);

    return (
        <div className="min-h-screen bg-transparent text-neutral-300 font-sans selection:bg-emerald-500/30">
            {/* HUD Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <PulseIndicator active={!error && !loading} />
                        <h1 className="text-3xl font-black text-white tracking-tight uppercase">
                            Command <span className="text-emerald-500">Center</span>
                        </h1>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-mono text-neutral-500 italic">
                        <span>SYSTEM_LATENCY: 42ms</span>
                        <span>•</span>
                        <span>STATUS: OPERATIONAL</span>
                        {data?.last_updated && (
                            <>
                                <span>•</span>
                                <span>SYNC: {(() => {
                                    try {
                                        return new Date(data.last_updated).toLocaleTimeString();
                                    } catch (e) {
                                        return 'UNKNOWN';
                                    }
                                })()}</span>
                            </>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchAnalytics}
                        disabled={loading}
                        className="group relative flex items-center gap-2 px-6 py-2.5 bg-neutral-800/50 hover:bg-neutral-700/50 border border-white/5 rounded-full text-xs font-bold uppercase tracking-widest transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                    >
                        <RefreshCw size={14} className={`${loading ? 'animate-spin text-emerald-400' : 'text-neutral-400 group-hover:text-white'}`} />
                        <span>Force Sync</span>
                    </button>
                </div>
            </div>

            {/* ERROR ALERT */}
            {error && (
                <GlassCard className="mb-8 border-red-500/20 bg-red-500/5">
                    <div className="p-4 flex items-center gap-4">
                        <div className="p-2 bg-red-500/10 rounded-lg">
                            <AlertCircle size={20} className="text-red-400" />
                        </div>
                        <div>
                            <HUDLabel className="text-red-400">System Alert</HUDLabel>
                            <p className="text-sm font-medium text-white mt-0.5">{error}</p>
                        </div>
                    </div>
                </GlassCard>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                {/* ── CENTRAL FUNNEL ANALYSIS ── */}
                <div className="xl:col-span-3 space-y-6">
                    <GlassCard className="p-8">
                        <div className="flex items-start justify-between mb-10">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                                    <TrendingUp size={24} className="text-emerald-400" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white uppercase tracking-tight">Conversion Funnel</h2>
                                    <HUDLabel>Terminal View • 7D Window</HUDLabel>
                                </div>
                            </div>

                            {!loading && data?.funnel && (
                                <div className="text-right">
                                    <HUDLabel>Overall Throughput</HUDLabel>
                                    <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-400">
                                        {(data.funnel.conversion_rate || 0).toFixed(1)}%
                                    </div>
                                </div>
                            )}
                        </div>

                        {loading ? (
                            <FunnelSkeleton />
                        ) : data?.funnel ? (
                            <FunnelVisualization data={data.funnel} />
                        ) : (
                            <EmptyState label="Awaiting Funnel Data" />
                        )}
                    </GlassCard>

                    {/* LIVE EVENT LOG */}
                    <GlassCard>
                        <div className="p-6 border-b border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Terminal size={18} className="text-emerald-400" />
                                <h2 className="text-sm font-bold text-white uppercase tracking-widest">Event Stream</h2>
                            </div>
                            <div className="flex items-center gap-2">
                                <HUDLabel>Status:</HUDLabel>
                                <span className="text-[10px] font-mono text-emerald-400 animate-pulse">L0_INGEST_ACTIVE</span>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            {loading ? (
                                <div className="p-20 flex flex-col items-center gap-4">
                                    <Zap size={24} className="text-emerald-500/40 animate-pulse" />
                                    <span className="text-xs font-mono text-neutral-600">INGESTING_LATEST_EVENTS...</span>
                                </div>
                            ) : data?.recent_events?.length ? (
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-white/5">
                                            <th className="px-6 py-3"><HUDLabel>Time (UTC)</HUDLabel></th>
                                            <th className="px-6 py-3"><HUDLabel>Entity</HUDLabel></th>
                                            <th className="px-6 py-3"><HUDLabel>Namespace</HUDLabel></th>
                                            <th className="px-6 py-3"><HUDLabel>Auth_ID</HUDLabel></th>
                                            <th className="px-6 py-3"><HUDLabel>Tier</HUDLabel></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {data.recent_events.map((event) => (
                                            <tr key={event.id} className="group hover:bg-emerald-500/5 transition-colors">
                                                <td className="px-6 py-4 text-[10px] font-mono text-neutral-500 whitespace-nowrap">
                                                    {new Date(event.timestamp).toLocaleString()}
                                                </td>
                                                <td className="px-6 py-4 text-xs font-bold text-white">
                                                    {event.properties.store_name}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <code className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">
                                                        /{event.properties.slug}
                                                    </code>
                                                </td>
                                                <td className="px-6 py-4 text-[10px] text-neutral-500 font-mono">
                                                    {event.distinct_id.substring(0, 12)}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`text-[9px] px-2 py-0.5 rounded-sm font-black uppercase tracking-widest ${event.properties.plan === 'pro'
                                                        ? 'bg-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                                                        : 'bg-neutral-800 text-neutral-500'
                                                        }`}>
                                                        {event.properties.plan || 'BASE'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="p-20 flex flex-col items-center gap-4 text-neutral-600">
                                    <Activity size={32} className="opacity-10" />
                                    <HUDLabel>Zero events returned</HUDLabel>
                                </div>
                            )}
                        </div>
                    </GlassCard>
                </div>

                {/* ── SIDEBAR METRICS ── */}
                <div className="space-y-6">
                    {/* TRAFFIC */}
                    <GlassCard className="p-6 group hover:border-emerald-500/30 transition-all">
                        <div className="flex items-center justify-between mb-4">
                            <HUDLabel>Traffic Flux</HUDLabel>
                            <Globe size={16} className="text-emerald-400 group-hover:animate-spin-slow" />
                        </div>
                        {loading ? (
                            <MetricSkeleton />
                        ) : data?.traffic ? (
                            <div className="space-y-2">
                                <div className="text-4xl font-black text-white">{data.traffic.visitors_7d.toLocaleString()}</div>
                                <div className={`flex items-center gap-1.5 text-xs font-black tracking-tighter ${data.traffic.change_pct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {data.traffic.change_pct >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                    {Math.abs(data.traffic.change_pct).toFixed(1)}% <span className="opacity-40 ml-1">VS_PRIOR_PERIOD</span>
                                </div>
                            </div>
                        ) : (
                            <div className="text-xs font-mono text-neutral-600 tracking-tighter">DATA_FETCH_NULL</div>
                        )}
                    </GlassCard>

                    {/* VENDORS */}
                    <GlassCard className="p-6 group hover:border-emerald-500/30 transition-all">
                        <div className="flex items-center justify-between mb-4">
                            <HUDLabel>Active Node Count</HUDLabel>
                            <Users size={16} className="text-emerald-400" />
                        </div>
                        {loading ? (
                            <MetricSkeleton />
                        ) : data?.vendors ? (
                            <div className="space-y-4">
                                <div className="text-4xl font-black text-white">{data.vendors.weekly_active.toLocaleString()}</div>
                                <div className="flex justify-between items-end border-t border-white/5 pt-4">
                                    <div className="space-y-0.5">
                                        <HUDLabel className="text-[8px]">New_Deployment</HUDLabel>
                                        <div className="text-lg font-bold text-white">{data.vendors.new_this_week}</div>
                                    </div>
                                    <div className={`px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20`}>
                                        +{Math.abs(data.vendors.change_pct).toFixed(0)}%
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-xs font-mono text-neutral-600">CLUSTER_DATA_OFFLINE</div>
                        )}
                    </GlassCard>

                    {/* PERFORMANCE */}
                    <GlassCard className="p-6 group hover:border-amber-500/30 transition-all">
                        <div className="flex items-center justify-between mb-4">
                            <HUDLabel>Deployment Velocity</HUDLabel>
                            <Clock size={16} className="text-amber-400" />
                        </div>
                        {loading ? (
                            <MetricSkeleton />
                        ) : data?.publish ? (
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-black/40 border border-white/5 rounded-xl p-3">
                                        <HUDLabel className="text-[8px]">Target (p50)</HUDLabel>
                                        <div className="text-2xl font-black text-amber-400 tracking-tighter">{data.publish.p50_hours}<span className="text-[10px] ml-0.5 uppercase">h</span></div>
                                    </div>
                                    <div className="bg-black/40 border border-white/5 rounded-xl p-3">
                                        <HUDLabel className="text-[8px]">Max (p90)</HUDLabel>
                                        <div className="text-2xl font-black text-white tracking-tighter">{data.publish.p90_hours}<span className="text-[10px] ml-0.5 uppercase">h</span></div>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <HUDLabel className="text-red-400 text-[8px]">Crit_Critical Path Dropoff</HUDLabel>
                                    <div className="flex items-center gap-2 px-3 py-2 bg-red-500/5 border border-red-500/20 rounded-lg">
                                        <Shield size={12} className="text-red-400" />
                                        <span className="text-xs font-bold text-red-300 uppercase tracking-tight">{data.publish.top_dropoff_step}</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <HUDLabel>WAITING_ON_PROB_DIST</HUDLabel>
                        )}
                    </GlassCard>

                    {/* INFRA STATUS */}
                    <GlassCard className="p-4 bg-gradient-to-t from-emerald-500/10 to-transparent">
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-2">
                                <Database size={14} className="text-neutral-500" />
                                <HUDLabel className="text-[8px]">Database Core</HUDLabel>
                                <div className="ml-auto flex h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_#10b981]" />
                            </div>
                            <div className="flex items-center gap-2">
                                <Zap size={14} className="text-neutral-500" />
                                <HUDLabel className="text-[8px]">Compute Engine</HUDLabel>
                                <div className="ml-auto flex h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_#10b981]" />
                            </div>
                        </div>
                    </GlassCard>
                </div>
            </div>
        </div>
    );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function FunnelVisualization({ data }: { data: FunnelData }) {
    const max = Math.max(...data.steps.map(s => s.count), 1);

    return (
        <div className="space-y-12">
            <div className="relative grid grid-cols-1 sm:grid-cols-4 gap-8">
                {data.steps.map((step, i) => {
                    const nextStep = data.steps[i + 1];
                    const dropoff = (nextStep && step.count > 0) ? (100 - (nextStep.count / step.count) * 100) : 0;
                    const cr = (i > 0 && data.steps[i - 1].count > 0) ? (step.count / data.steps[i - 1].count) * 100 : 100;

                    return (
                        <div key={step.name} className="relative group">
                            {/* VERTICAL BAR CONTAINER */}
                            <div className="h-64 relative bg-black/40 border border-white/5 rounded-2xl p-2 flex flex-col justify-end overflow-hidden">
                                {/* GRID LINES */}
                                <div className="absolute inset-x-0 bottom-0 h-full flex flex-col justify-between opacity-10 pointer-events-none p-2">
                                    {[1, 2, 3, 4].map(l => <div key={l} className="border-t border-white" />)}
                                </div>

                                <div
                                    className={`relative z-10 w-full rounded-xl transition-all duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:brightness-110 shadow-[0_-10px_20px_rgba(0,0,0,0.5)] ${i === 0 ? 'bg-gradient-to-t from-emerald-600 to-emerald-400' :
                                        i === 1 ? 'bg-gradient-to-t from-emerald-500 to-emerald-300' :
                                            i === 2 ? 'bg-gradient-to-t from-emerald-600 to-emerald-400' :
                                                'bg-gradient-to-t from-amber-600 to-amber-400'
                                        }`}
                                    style={{ height: `${(step.count / max) * 100}%` }}
                                >
                                    <div className="absolute top-4 left-1/2 -translate-x-1/2 text-center">
                                        <div className="text-2xl font-black text-white tracking-widest leading-none drop-shadow-md">{step.count.toLocaleString()}</div>
                                        {i > 0 && <div className="text-[10px] font-mono text-white/50">{cr.toFixed(0)}% CR</div>}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 text-center">
                                <HUDLabel className="text-white tracking-widest">{step.name}</HUDLabel>
                            </div>

                            {/* DROPOFF ARROW (Desktop only) */}
                            {nextStep && (
                                <div className="hidden sm:block absolute top-1/2 -translate-y-1/2 -right-6 z-20">
                                    <div className="flex flex-col items-center">
                                        <ArrowUpRight size={14} className="rotate-90 text-red-500/40" />
                                        <span className="text-[8px] font-mono text-red-400/80">-{dropoff.toFixed(0)}%</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="flex flex-wrap gap-10 border-t border-white/5 pt-8">
                <div className="flex items-center gap-3">
                    <div className="h-2 w-8 bg-emerald-500 rounded-full" />
                    <HUDLabel>Entry Phase</HUDLabel>
                </div>
                <div className="flex items-center gap-3">
                    <div className="h-2 w-8 bg-emerald-500 rounded-full" />
                    <HUDLabel>Activation</HUDLabel>
                </div>
                <div className="flex items-center gap-3">
                    <div className="h-2 w-8 bg-amber-500 rounded-full" />
                    <HUDLabel>Retention</HUDLabel>
                </div>
                <div className="ml-auto hidden xl:flex items-center gap-2">
                    <HUDLabel>Provider Status:</HUDLabel>
                    <div className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-mono rounded border border-emerald-500/20">POSTHOG_V3_BRIDGE</div>
                </div>
            </div>
        </div>
    );
}

function FunnelSkeleton() {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-8">
            {[1, 2, 3, 4].map(idx => (
                <div key={idx} className="space-y-4">
                    <div className="h-64 bg-white/5 rounded-2xl animate-pulse" />
                    <div className="h-4 bg-white/5 rounded-lg w-1/2 mx-auto animate-pulse" />
                </div>
            ))}
        </div>
    );
}

function MetricSkeleton() {
    return (
        <div className="space-y-4 animate-pulse">
            <div className="h-10 bg-white/5 rounded-xl w-3/4" />
            <div className="h-4 bg-white/5 rounded-lg w-full" />
        </div>
    );
}

function EmptyState({ label }: { label: string }) {
    return (
        <div className="h-64 border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center gap-4 text-neutral-600">
            <Database size={32} className="opacity-10" />
            <HUDLabel>{label}</HUDLabel>
        </div>
    );
}
