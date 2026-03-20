import React, { useState, useEffect } from 'react';
import { FileText, User, Calendar, RefreshCw, Filter, Shield, Key, AlertTriangle, CheckCircle, Lock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import AdminLogStats from '../../dashboard/components/AdminLogStats';

interface AuditLog {
    id: string;
    actor_id: string;
    action: string;
    target_type: string;
    target_id: string | null;
    metadata: Record<string, any>;
    created_at: string;
    profiles?: {
        full_name: string | null;
    };
}

const AdminLogs: React.FC = () => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionFilter, setActionFilter] = useState('');

    const loadLogs = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('audit_logs')
                .select('*, profiles!actor_id(full_name)')
                .order('created_at', { ascending: false })
                .limit(100);

            if (actionFilter) {
                query = query.eq('action', actionFilter);
            }

            const { data, error } = await query;

            if (error) {
                console.error('Error loading logs:', error);
                return;
            }

            setLogs(data || []);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadLogs();
    }, [actionFilter]);

    const getActionConfig = (action: string) => {
        if (action.includes('suspended') || action.includes('deleted') || action.includes('failed')) {
            return {
                icon: AlertTriangle,
                color: 'text-red-400',
                bg: 'bg-red-500/10',
                border: 'border-l-4 border-l-red-500'
            };
        }
        if (action.includes('login') || action.includes('password')) {
            return {
                icon: Key,
                color: 'text-amber-400',
                bg: 'bg-amber-500/5',
                border: 'border-l-4 border-l-amber-500'
            };
        }
        if (action.includes('activated') || action.includes('created') || action.includes('success')) {
            return {
                icon: CheckCircle,
                color: 'text-emerald-400',
                bg: 'bg-emerald-500/5',
                border: 'border-l-4 border-l-emerald-500'
            };
        }
        if (action.includes('maintenance')) {
            return {
                icon: Lock,
                color: 'text-emerald-400',
                bg: 'bg-emerald-500/10',
                border: 'border-l-4 border-l-emerald-500'
            };
        }
        return {
            icon: FileText,
            color: 'text-neutral-400',
            bg: 'bg-neutral-900',
            border: 'border border-neutral-800'
        };
    };

    const formatAction = (action: string) => {
        return action
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    const uniqueActions = Array.from(new Set(logs.map(l => l.action)));

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Audit Logs</h1>
                    <p className="text-neutral-500 text-sm mt-1">
                        Track system security and changes.
                    </p>
                </div>
                <button
                    onClick={() => loadLogs()}
                    className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-sm font-medium transition-all"
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    Refresh Data
                </button>
            </div>

            {/* Analytics Dashboard (Option A) */}
            <AdminLogStats logs={logs} />

            {/* Filters */}
            <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-2xl flex items-center gap-4">
                <Filter size={16} className="text-neutral-500" />
                <select
                    value={actionFilter}
                    onChange={(e) => setActionFilter(e.target.value)}
                    aria-label="Filter by action type"
                    className="bg-transparent text-white border-none focus:ring-0 text-sm outline-none cursor-pointer w-full"
                >
                    <option value="">All Actions</option>
                    {uniqueActions.map((action: string) => (
                        <option key={action} value={action}>{formatAction(action)}</option>
                    ))}
                </select>
            </div>

            {/* Smart Log List (Option C) */}
            <div className="space-y-3">
                {logs.length === 0 ? (
                    <div className="text-center py-20 bg-neutral-900/50 rounded-2xl border border-neutral-800 border-dashed">
                        <Shield size={48} className="mx-auto text-neutral-600 mb-4" />
                        <p className="text-neutral-400">No audit logs found</p>
                        <p className="text-xs text-neutral-600 mt-1">Admin actions will appear here automatically</p>
                    </div>
                ) : (
                    logs.map((log) => {
                        const config = getActionConfig(log.action);
                        const Icon = config.icon;

                        return (
                            <div
                                key={log.id}
                                className={`group flex flex-col md:flex-row md:items-center gap-4 p-5 rounded-r-xl transition-all hover:translate-x-1 ${config.bg} ${config.border}`}
                            >
                                {/* Icon & Action */}
                                <div className="flex items-start gap-4 flex-1">
                                    <div className={`mt-0.5 p-2 rounded-lg bg-black/20 ${config.color}`}>
                                        <Icon size={18} />
                                    </div>
                                    <div>
                                        <h3 className="text-white font-medium flex items-center gap-2">
                                            {formatAction(log.action)}
                                            {log.target_type && (
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 font-normal">
                                                    {log.target_type}
                                                </span>
                                            )}
                                        </h3>
                                        <div className="flex items-center gap-4 mt-1 text-sm text-neutral-400">
                                            <span className="flex items-center gap-1.5">
                                                <User size={12} />
                                                {log.profiles?.full_name || 'System Admin'}
                                            </span>
                                            <span className="w-1 h-1 bg-neutral-700 rounded-full" />
                                            <span className="flex items-center gap-1.5 font-mono text-xs">
                                                <Calendar size={12} />
                                                {new Date(log.created_at).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Smart Metadata (Only show if relevant) */}
                                {log.metadata && (Object.keys(log.metadata).length > 0) && (
                                    <div className="md:w-1/3 flex flex-wrap gap-2 justify-end">
                                        {log.metadata.ip && (
                                            <span className="text-xxs px-2 py-1 bg-black/40 rounded text-neutral-500 font-mono">
                                                IP: {log.metadata.ip}
                                            </span>
                                        )}
                                        {log.metadata.reason && (
                                            <span className="text-xs px-2 py-1 bg-red-500/10 text-red-400 rounded">
                                                Reason: {log.metadata.reason}
                                            </span>
                                        )}
                                        {/* Fallback for other metadata */}
                                        {!log.metadata.ip && !log.metadata.reason && (
                                            <span className="text-xs text-neutral-600 italic">
                                                Checking details...
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default AdminLogs;
