import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  History as HistoryIcon, 
  Search, 
  Filter, 
  Download, 
  User, 
  Clock, 
  Tag,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

interface AuditLog {
  id: string;
  actor_id: string;
  store_id: string;
  action: string;
  target_type: string;
  target_id: string;
  metadata: any;
  created_at: string;
  profiles?: {
    email: string;
    full_name: string;
  };
  store_staff?: {
    name: string;
  }[];
  sellers?: {
    store_name: string;
  };
}

const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 20;

  useEffect(() => {
    fetchLogs();
  }, [page, filterAction]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Get store_id
      let storeId: string | null = null;
      
      // Try seller first
      const { data: seller } = await supabase.from('sellers').select('id').eq('id', user.id).maybeSingle();
      if (seller) {
        storeId = seller.id;
      } else {
        // Try staff
        const { data: staff } = await supabase.from('store_staff').select('store_id').eq('user_id', user.id).maybeSingle();
        if (staff) {
          storeId = staff.store_id;
        }
      }

      if (!storeId) return;

      // 2. Query logs
      let query = supabase
        .from('audit_logs')
        .select(`
          *,
          profiles:actor_id (
            email,
            full_name
          ),
          store_staff:actor_id (
            name
          ),
          sellers:actor_id (
            store_name
          )
        `, { count: 'exact' })
        .eq('store_id', storeId)
        .order('created_at', { ascending: false })
        .range((page - 1) * itemsPerPage, page * itemsPerPage - 1);

      if (filterAction !== 'all') {
        query = query.eq('action', filterAction);
      }

      if (searchTerm) {
        // Full text search or ilike
        query = query.or(`target_type.ilike.%${searchTerm}%,action.ilike.%${searchTerm}%`);
      }

      const { data, count, error } = await query;

      if (error) throw error;
      setLogs(data || []);
      setTotalCount(count || 0);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const csvRows = [
      ['Date', 'User', 'Action', 'Target Type', 'Full Name'],
      ...logs.map(log => [
        new Date(log.created_at).toLocaleString(),
        log.profiles?.email || log.actor_id,
        log.action,
        log.target_type,
        log.store_staff?.[0]?.name || log.profiles?.full_name || log.sellers?.store_name || 'System User'
      ])
    ];

    const csvContent = csvRows.map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `audit-logs-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getActionColor = (action: string) => {
    if (action.includes('create') || action.includes('add')) return 'text-green-500 bg-green-500/10 border-green-500/20';
    if (action.includes('delete') || action.includes('remove')) return 'text-red-500 bg-red-500/10 border-red-500/20';
    if (action.includes('update')) return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
    return 'text-neutral-500 bg-neutral-500/10 border-neutral-500/20';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-theme-text to-theme-text/70 bg-clip-text text-transparent">
            Staff Audit Logs
          </h1>
          <p className="text-theme-muted text-sm mt-1">Track all activities performed by your staff members</p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-theme-panel border border-theme-border/50 text-theme-text rounded-xl hover:bg-theme-bg transition-all active:scale-95 shadow-soft"
        >
          <Download size={18} />
          <span className="font-medium">Export CSV</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-theme-panel border border-theme-border/50 rounded-2xl p-4 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted" size={18} />
          <input
            type="text"
            placeholder="Search targets or actions..."
            className="w-full bg-theme-bg/50 border border-theme-border/50 rounded-xl py-2 pl-10 pr-4 text-theme-text focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
            title="Search logs"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchLogs()}
          />
        </div>
        <div className="flex gap-2">
          <select
            className="bg-theme-bg/50 border border-theme-border/50 rounded-xl py-2 px-3 text-theme-text focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            title="Filter by action type"
          >
            <option value="all">All Actions</option>
            <option value="staff_invite">Invites</option>
            <option value="staff_remove">Removals</option>
            <option value="order_ship">Shipping</option>
            <option value="product_update">Product Updates</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-theme-panel border border-theme-border/50 rounded-2xl overflow-hidden shadow-soft">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-theme-bg/50 border-b border-theme-border/50">
                <th className="px-6 py-4 text-xs font-bold text-theme-muted uppercase tracking-wider">Timestamp</th>
                <th className="px-6 py-4 text-xs font-bold text-theme-muted uppercase tracking-wider">User</th>
                <th className="px-6 py-4 text-xs font-bold text-theme-muted uppercase tracking-wider">Action</th>
                <th className="px-6 py-4 text-xs font-bold text-theme-muted uppercase tracking-wider">Target</th>
                <th className="px-6 py-4 text-xs font-bold text-theme-muted uppercase tracking-wider text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme-border/30">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-theme-muted">Fetching audit trails...</p>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <HistoryIcon size={48} className="text-theme-border mx-auto mb-4 opacity-20" />
                    <p className="text-theme-text font-medium">No logs found</p>
                    <p className="text-theme-muted text-sm px-4">Activities will appear here once your staff begins using the dashboard.</p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-theme-bg/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-theme-text text-sm">
                        <Clock size={14} className="text-theme-muted" />
                        {new Date(log.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center text-[10px] font-bold">
                          {(log.store_staff?.[0]?.name || log.profiles?.full_name || log.sellers?.store_name || '?').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-theme-text truncate">
                            {log.store_staff?.[0]?.name || log.profiles?.full_name || log.sellers?.store_name || 'System User'}
                          </p>
                          <p className="text-[10px] text-theme-muted truncate">{log.profiles?.email || log.actor_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${getActionColor(log.action)}`}>
                        {log.action.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-theme-text">
                        <Tag size={14} className="text-theme-muted" />
                        {log.target_type}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {log.metadata && Object.keys(log.metadata).length > 0 ? (
                        <button 
                          className="text-xs text-emerald-500 hover:text-emerald-400 font-medium transition-colors"
                          title="View log details"
                          onClick={() => console.log('Log details:', log.metadata)}
                        >
                          View Details
                        </button>
                      ) : (
                        <span className="text-xs text-theme-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalCount > itemsPerPage && (
          <div className="px-6 py-4 bg-theme-bg/30 border-t border-theme-border/50 flex items-center justify-between">
            <p className="text-xs text-theme-muted font-medium">
              Showing {(page - 1) * itemsPerPage + 1} to {Math.min(page * itemsPerPage, totalCount)} of {totalCount} logs
            </p>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="p-1.5 rounded-lg border border-theme-border/50 text-theme-text hover:bg-theme-panel disabled:opacity-50 transition-all"
                title="Previous page"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                disabled={page * itemsPerPage >= totalCount}
                onClick={() => setPage(page + 1)}
                className="p-1.5 rounded-lg border border-theme-border/50 text-theme-text hover:bg-theme-panel disabled:opacity-50 transition-all"
                title="Next page"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Security Info */}
      <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-4 flex gap-3">
        <ShieldCheck className="text-emerald-500 flex-shrink-0" size={20} />
        <div>
          <h4 className="text-sm font-bold text-theme-text">Security Transparency</h4>
          <p className="text-xs text-theme-muted leading-relaxed mt-1">
            Audit logs are immutable records of actions taken within your store dashboard. They include user identity, timestamp, IP address, and details of the operation ensuring accountability and troubleshooting capabilities.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuditLogs;
