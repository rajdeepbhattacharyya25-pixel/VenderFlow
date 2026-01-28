import React, { useState, useEffect } from 'react';
import { FileText, User, Calendar, ArrowRight, Loader2, RefreshCw, Filter } from 'lucide-react';
import { supabase } from '../../lib/supabase';

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

    const getActionColor = (action: string) => {
        if (action.includes('suspended') || action.includes('deleted')) {
            return 'text-red-400 bg-red-500/10 border-red-500/20';
        }
        if (action.includes('activated') || action.includes('created')) {
            return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
        }
        if (action.includes('invited')) {
            return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20';
        }
        return 'text-neutral-400 bg-neutral-500/10 border-neutral-500/20';
    };

    const formatAction = (action: string) => {
        return action
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    const uniqueActions = Array.from(new Set(logs.map(l => l.action)));

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Audit Logs</h1>
                    <p className="text-neutral-500 text-sm mt-1">
                        Track all administrative actions on the platform.
                    </p>
                </div>
                <button
                    onClick={() => loadLogs()}
                    className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-sm font-medium transition-all"
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {/* Filter */}
            <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-2xl flex items-center gap-4">
                <Filter size={16} className="text-neutral-500" />
                <select
                    value={actionFilter}
                    onChange={(e) => setActionFilter(e.target.value)}
                    className="bg-neutral-950 border border-neutral-800 rounded-xl py-2 px-3 text-sm outline-none text-neutral-300"
                >
                    <option value="">All Actions</option>
                    {uniqueActions.map(action => (
                        <option key={action} value={action}>{formatAction(action)}</option>
                    ))}
                </select>
                {actionFilter && (
                    <button
                        onClick={() => setActionFilter('')}
                        className="text-sm text-neutral-500 hover:text-white transition-colors"
                    >
                        Clear
                    </button>
                )}
            </div>

            {/* Logs List */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                    </div>
                ) : logs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <FileText className="w-16 h-16 text-neutral-700 mb-4" />
                        <p className="text-neutral-500">No audit logs found</p>
                        <p className="text-neutral-600 text-sm mt-1">
                            Admin actions will appear here
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-neutral-800">
                        {logs.map((log) => (
                            <div key={log.id} className="p-4 hover:bg-neutral-800/30 transition-colors">
                                <div className="flex items-start gap-4">
                                    <div className="flex-shrink-0 w-10 h-10 bg-neutral-800 rounded-full flex items-center justify-center">
                                        <User className="w-5 h-5 text-neutral-500" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-medium text-white">
                                                {log.profiles?.full_name || 'Admin'}
                                            </span>
                                            <ArrowRight className="w-4 h-4 text-neutral-600" />
                                            <span className={`px-2 py-0.5 rounded-md text-xs font-medium border ${getActionColor(log.action)}`}>
                                                {formatAction(log.action)}
                                            </span>
                                            {log.target_type && (
                                                <span className="text-neutral-500 text-sm">
                                                    on {log.target_type}
                                                </span>
                                            )}
                                        </div>

                                        {log.metadata && Object.keys(log.metadata).length > 0 && (
                                            <div className="mt-2 text-sm text-neutral-500">
                                                {log.metadata.store_name && (
                                                    <span>Store: <span className="text-neutral-400">{log.metadata.store_name}</span></span>
                                                )}
                                                {log.metadata.email && (
                                                    <span className="ml-3">Email: <span className="text-neutral-400">{log.metadata.email}</span></span>
                                                )}
                                                {log.metadata.slug && (
                                                    <span className="ml-3">Slug: <code className="text-neutral-400 bg-neutral-800 px-1 rounded">{log.metadata.slug}</code></span>
                                                )}
                                            </div>
                                        )}

                                        <div className="flex items-center gap-2 mt-2 text-xs text-neutral-600">
                                            <Calendar className="w-3 h-3" />
                                            {new Date(log.created_at).toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminLogs;
