/**
 * pages/admin/AdminAnalytics.tsx
 * Native admin analytics panel — 4-step conversion funnel and live store log.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
    TrendingUp, Users, Clock, RefreshCw, AlertCircle,
    ArrowUpRight, ArrowDownRight, Activity
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
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Conversion Funnel</h1>
                    <p className="text-sm text-neutral-400 mt-1">
                        Real-time acquisition health · Updates every 5 minutes
                        {data?.last_updated && (
                            <span className="ml-2 opacity-60">
                                · Last updated {new Date(data.last_updated).toLocaleTimeString()}
                            </span>
                        )}
                    </p>
                </div>
                <button
                    onClick={fetchAnalytics}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-3 min-h-[44px] md:py-2 md:min-h-0 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-sm transition-colors disabled:opacity-50"
                >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {/* Error State */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
                    <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-semibold text-red-300">Failed to load analytics</p>
                        <p className="text-xs text-red-400/80 mt-1">{error}</p>
                    </div>
                </div>
            )}

            {/* Top Row: Funnel and Core Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* 4-Step Funnel Widget */}
                <div className="lg:col-span-3 bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
                    <div className="flex items-center gap-2 mb-6">
                        <div className="p-2 bg-indigo-500/10 rounded-lg">
                            <TrendingUp size={18} className="text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold text-white">Acquisition Funnel (7D)</h2>
                            <p className="text-xs text-neutral-500">From Curiosity to Content</p>
                        </div>
                    </div>

                    {loading ? (
                        <FunnelSkeleton />
                    ) : data?.funnel ? (
                        <FunnelWidget data={data.funnel} />
                    ) : (
                        <EmptyState label="No funnel data" />
                    )}
                </div>

                {/* Quick Stats Sidebar */}
                <div className="space-y-6">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Activity size={16} className="text-indigo-400" />
                            <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Landing Traffic (7D)</h2>
                        </div>
                        {loading ? (
                            <MetricSkeleton />
                        ) : data?.traffic ? (
                            <TrafficWidget data={data.traffic} />
                        ) : (
                            <EmptyState label="N/A" />
                        )}
                    </div>
                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Users size={16} className="text-emerald-400" />
                            <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Active Vendors</h2>
                        </div>
                        {loading ? (
                            <MetricSkeleton />
                        ) : data?.vendors ? (
                            <VendorWidget data={data.vendors} />
                        ) : (
                            <EmptyState label="N/A" />
                        )}
                    </div>
                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Clock size={16} className="text-amber-400" />
                            <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Speed to Live</h2>
                        </div>
                        {loading ? (
                            <MetricSkeleton />
                        ) : data?.publish ? (
                            <PublishWidget data={data.publish} />
                        ) : (
                            <EmptyState label="N/A" />
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Row: Creation Log */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-3 bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
                    <div className="p-6 border-b border-neutral-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Activity size={18} className="text-indigo-400" />
                            <h2 className="text-sm font-semibold text-white">Store Creation Log</h2>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 bg-neutral-800 text-neutral-500 rounded-full font-mono">LIVE EVENTS</span>
                    </div>

                    <div className="overflow-x-auto">
                        {loading ? (
                            <div className="p-12 text-center text-neutral-500 animate-pulse">Loading recent events...</div>
                        ) : data?.recent_events?.length ? (
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-black/20">
                                        <th className="px-6 py-3 text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">Time</th>
                                        <th className="px-6 py-3 text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">Store Name</th>
                                        <th className="px-6 py-3 text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">Slug</th>
                                        <th className="px-6 py-3 text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">User ID</th>
                                        <th className="px-6 py-3 text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">Plan</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-800">
                                    {data.recent_events.map((event) => (
                                        <tr key={event.id} className="hover:bg-neutral-800/30 transition-colors">
                                            <td className="px-6 py-4 text-xs text-neutral-400 font-mono whitespace-nowrap">
                                                {new Date(event.timestamp).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 text-xs font-medium text-white">
                                                {event.properties.store_name}
                                            </td>
                                            <td className="px-6 py-4">
                                                <code className="text-[10px] bg-neutral-800 px-1.5 py-0.5 rounded text-indigo-400">
                                                    /{event.properties.slug}
                                                </code>
                                            </td>
                                            <td className="px-6 py-4 text-[10px] text-neutral-500 font-mono">
                                                {event.distinct_id.substring(0, 8)}...
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${event.properties.plan === 'pro' ? 'bg-amber-500/10 text-amber-500' : 'bg-neutral-800 text-neutral-400'
                                                    }`}>
                                                    {event.properties.plan || 'free'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="p-12 text-center text-neutral-500">No recent store creations found.</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Sub-widgets ────────────────────────────────────────────────────────────────

function FunnelWidget({ data }: { data: FunnelData }) {
    const max = data.steps[0]?.count || 1;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-4 gap-4">
                {data.steps.map((step, i) => {
                    const percentage = i === 0 ? 100 : (data.steps[i - 1].count > 0 ? (step.count / data.steps[i - 1].count) * 100 : 0);
                    return (
                        <div key={step.name} className="space-y-3">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-tighter mb-1">{step.name}</span>
                                <span className="text-2xl font-bold text-white leading-none">{step.count.toLocaleString()}</span>
                                {i > 0 && <span className="text-[10px] text-emerald-400 mt-1 font-mono">{percentage.toFixed(0)}% CR</span>}
                            </div>
                            <div className="h-24 bg-neutral-800/30 rounded-lg relative overflow-hidden flex flex-col justify-end">
                                <div
                                    className={`w-full ${i === 0 ? 'bg-indigo-500' :
                                        i === 1 ? 'bg-indigo-600' :
                                            i === 2 ? 'bg-emerald-500' : 'bg-amber-500'
                                        } transition-all duration-1000 ease-out`}
                                    style={{ height: `${(step.count / max) * 100}%` }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="pt-6 border-t border-neutral-800 flex items-center justify-between">
                <div className="flex gap-4 text-[10px] text-neutral-500 uppercase font-bold tracking-widest">
                    <span>Funnel Accuracy: High</span>
                    <span className="text-neutral-700">|</span>
                    <span>Window: 7 Days</span>
                </div>
                <div className="text-right">
                    <p className="text-[11px] text-neutral-500 uppercase font-medium">Overall Conversion</p>
                    <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-indigo-400">
                        {data.conversion_rate.toFixed(1)}%
                    </p>
                </div>
            </div>
        </div>
    );
}

function TrafficWidget({ data }: { data: TrafficData }) {
    const isUp = data.change_pct >= 0;
    return (
        <div className="space-y-4">
            <div>
                <p className="text-4xl font-bold text-white">{data.visitors_7d.toLocaleString()}</p>
                <div className={`flex items-center gap-1 mt-1 text-sm font-medium ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
                    {isUp ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                    {Math.abs(data.change_pct).toFixed(1)}% vs last week
                </div>
            </div>
            <div className="pt-4 border-t border-neutral-800">
                <div className="flex justify-between text-sm">
                    <span className="text-neutral-500">Unique Visitors</span>
                    <span className="text-white font-semibold">Landing Page</span>
                </div>
            </div>
        </div>
    );
}

function VendorWidget({ data }: { data: VendorActivityData }) {
    const isUp = data.change_pct >= 0;
    return (
        <div className="space-y-4">
            <div>
                <p className="text-4xl font-bold text-white">{data.weekly_active.toLocaleString()}</p>
                <div className={`flex items-center gap-1 mt-1 text-sm font-medium ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
                    {isUp ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                    {Math.abs(data.change_pct).toFixed(1)}% vs last week
                </div>
            </div>
            <div className="pt-4 border-t border-neutral-800">
                <div className="flex justify-between text-sm">
                    <span className="text-neutral-500">New this week</span>
                    <span className="text-white font-semibold">{data.new_this_week.toLocaleString()}</span>
                </div>
            </div>
        </div>
    );
}

function PublishWidget({ data }: { data: TimeToPublishData }) {
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-neutral-800/50 rounded-xl p-3 text-center">
                    <p className="text-xs text-neutral-500 mb-1">p50</p>
                    <p className="text-2xl font-bold text-amber-400">{data.p50_hours}h</p>
                    <p className="text-xs text-neutral-600">median</p>
                </div>
                <div className="bg-neutral-800/50 rounded-xl p-3 text-center">
                    <p className="text-xs text-neutral-500 mb-1">p90</p>
                    <p className="text-2xl font-bold text-white">{data.p90_hours}h</p>
                    <p className="text-xs text-neutral-600">90th pct</p>
                </div>
            </div>
            {data.top_dropoff_step && (
                <div className="pt-2 border-t border-neutral-800 text-center">
                    <p className="text-[10px] text-neutral-500 uppercase">Top drop-off step</p>
                    <p className="text-xs text-red-300 font-medium mt-1">{data.top_dropoff_step}</p>
                </div>
            )}
        </div>
    );
}

// ── Skeleton & Empty states ────────────────────────────────────────────────────

function FunnelSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="grid grid-cols-4 gap-4">
                {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="space-y-3">
                        <div className="h-4 bg-neutral-800 rounded w-1/2" />
                        <div className="h-24 bg-neutral-800/50 rounded-lg" />
                    </div>
                ))}
            </div>
        </div>
    );
}

function MetricSkeleton() {
    return (
        <div className="space-y-4 animate-pulse">
            <div className="h-10 bg-neutral-800 rounded w-1/2" />
            <div className="h-4 bg-neutral-800 rounded w-full" />
        </div>
    );
}

function EmptyState({ label }: { label: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-8 text-neutral-600 border border-neutral-800 border-dashed rounded-xl">
            <Activity size={24} className="mb-2 opacity-20" />
            <p className="text-xs uppercase tracking-widest font-bold opacity-30">{label}</p>
        </div>
    );
}
