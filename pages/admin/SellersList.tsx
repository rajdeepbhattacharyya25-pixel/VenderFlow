import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search,
    Filter,
    MoreVertical,
    ExternalLink,
    UserX,
    UserCheck,
    ChevronLeft,
    ChevronRight,
    Eye,
    Plus,
    Loader2,
    Store,
    RefreshCw,
    CheckSquare,
    Square,
    X,
    MessageSquare,
    Send
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { adminDb } from '../../lib/admin-api';

interface Seller {
    id: string;
    store_name: string;
    slug: string;
    plan: string;
    status: string;
    is_active: boolean;
    created_at: string;
    profiles?: {
        full_name: string | null;
        avatar_url: string | null;
    };
}

const SellersList: React.FC = () => {
    const navigate = useNavigate();
    const [sellers, setSellers] = useState<Seller[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [planFilter, setPlanFilter] = useState<string>('');
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [showFilters, setShowFilters] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [bulkLoading, setBulkLoading] = useState(false);
    const [messageModalSeller, setMessageModalSeller] = useState<Seller | null>(null);
    const [messageSubject, setMessageSubject] = useState('');
    const [messageContent, setMessageContent] = useState('');
    const [sendingMessage, setSendingMessage] = useState(false);
    const limit = 25;

    const loadSellers = async () => {
        setLoading(true);
        try {
            const { sellers: data, total } = await adminDb.listSellers({
                page,
                limit,
                search: searchTerm,
                status: statusFilter,
                plan: planFilter
            });

            setSellers(data || []);
            setTotalCount(total || 0);
        } catch (error) {
            console.error('Error loading sellers:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSellers();
    }, [page, statusFilter, planFilter]);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            setPage(1);
            loadSellers();
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const handleQuickStatusChange = async (seller: Seller, newStatus: 'active' | 'suspended') => {
        try {
            const { error } = await supabase
                .from('sellers')
                .update({
                    status: newStatus,
                    is_active: newStatus === 'active',
                    updated_at: new Date().toISOString()
                })
                .eq('id', seller.id);

            if (error) throw error;

            // Log action
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase.from('audit_logs').insert({
                    actor_id: user.id,
                    action: newStatus === 'suspended' ? 'seller_suspended' : 'seller_activated',
                    target_type: 'seller',
                    target_id: seller.id,
                    metadata: { store_name: seller.store_name }
                });
            }

            // Reload
            loadSellers();
        } catch (error) {
            console.error('Error updating seller:', error);
        }
    };

    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'active': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
            case 'pending': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
            case 'suspended': return 'bg-red-500/10 text-red-500 border-red-500/20';
            default: return 'bg-neutral-500/10 text-neutral-500 border-neutral-500/20';
        }
    };

    const getPlanStyles = (plan: string) => {
        switch (plan) {
            case 'enterprise': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
            case 'pro': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
            default: return 'bg-neutral-700/30 text-neutral-500 border-neutral-700/50';
        }
    };

    // Bulk selection functions
    const toggleSelect = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === sellers.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(sellers.map(s => s.id)));
        }
    };

    const clearSelection = () => {
        setSelectedIds(new Set());
    };

    const handleBulkAction = async (action: 'activate' | 'suspend') => {
        if (selectedIds.size === 0) return;

        setBulkLoading(true);
        try {
            const newStatus = action === 'activate' ? 'active' : 'suspended';
            const ids = Array.from(selectedIds);

            const { error } = await supabase
                .from('sellers')
                .update({
                    status: newStatus,
                    is_active: action === 'activate',
                    updated_at: new Date().toISOString()
                })
                .in('id', ids);

            if (error) throw error;

            // Log bulk action
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase.from('audit_logs').insert({
                    actor_id: user.id,
                    action: `bulk_${action}`,
                    target_type: 'sellers',
                    target_id: ids[0],
                    metadata: {
                        count: ids.length,
                        action: action,
                        seller_ids: ids
                    }
                });
            }

            clearSelection();
            loadSellers();
        } catch (error) {
            console.error('Error performing bulk action:', error);
        } finally {
            setBulkLoading(false);
        }
    };

    const sendDirectMessage = async () => {
        if (!messageModalSeller || !messageSubject.trim() || !messageContent.trim()) return;

        setSendingMessage(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // Create a support ticket for this seller
            const { data: ticket, error: ticketError } = await supabase
                .from('support_tickets')
                .insert({
                    seller_id: messageModalSeller.id,
                    subject: messageSubject,
                    status: 'open'
                })
                .select('id')
                .single();

            if (ticketError) throw ticketError;

            // Send the admin's message
            const { error: msgError } = await supabase
                .from('support_messages')
                .insert({
                    ticket_id: ticket.id,
                    sender_id: user.id,
                    sender_role: 'admin',
                    content: messageContent
                });

            if (msgError) throw msgError;

            // Reset and close modal
            setMessageModalSeller(null);
            setMessageSubject('');
            setMessageContent('');
            alert('Message sent successfully!');
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Failed to send message. Please try again.');
        } finally {
            setSendingMessage(false);
        }
    };

    const totalPages = Math.ceil(totalCount / limit);
    const allSelected = sellers.length > 0 && selectedIds.size === sellers.length;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Floating Bulk Action Bar */}
            {selectedIds.size > 0 && (
                <div className="fixed bottom-4 left-4 right-4 md:left-1/2 md:right-auto md:-translate-x-1/2 md:bottom-6 z-50 animate-in slide-in-from-bottom-4 duration-200">
                    <div className="bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl shadow-black/50 px-4 md:px-6 py-3 md:py-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 md:gap-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center font-bold text-white">
                                {selectedIds.size}
                            </div>
                            <span className="text-neutral-300 text-sm">
                                seller{selectedIds.size > 1 ? 's' : ''} selected
                            </span>
                        </div>

                        <div className="w-px h-8 bg-neutral-700" />

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handleBulkAction('activate')}
                                disabled={bulkLoading}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 md:px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-all"
                                style={{ WebkitTapHighlightColor: 'transparent' }}
                            >
                                <UserCheck size={16} />
                                Activate All
                            </button>
                            <button
                                onClick={() => handleBulkAction('suspend')}
                                disabled={bulkLoading}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 md:px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-all"
                                style={{ WebkitTapHighlightColor: 'transparent' }}
                            >
                                <UserX size={16} />
                                Suspend All
                            </button>
                        </div>

                        <button
                            onClick={clearSelection}
                            className="p-2 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-all"
                            title="Clear selection"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Sellers</h1>
                    <p className="text-neutral-500 text-sm mt-1">
                        Manage and monitor all platform partners. {totalCount} total sellers.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => loadSellers()}
                        className="p-2 hover:bg-neutral-800 rounded-xl transition-colors"
                        title="Refresh"
                        aria-label="Refresh sellers list"
                    >
                        <RefreshCw size={18} className={`text-neutral-400 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={() => navigate('/admin/invites')}
                        className="flex items-center gap-2 px-4 py-3 md:py-2 min-h-[44px] md:min-h-0 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-emerald-600/20"
                    >
                        <Plus size={18} />
                        Invite Seller
                    </button>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 md:gap-4">
                <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                        <input
                            type="text"
                            placeholder="Search by name or slug..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-3 md:py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all"
                            aria-label="Search sellers by name or slug"
                        />
                    </div>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-4 py-3 md:py-2 min-h-[44px] md:min-h-0 border rounded-xl text-sm transition-all ${showFilters || statusFilter || planFilter
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                            : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                            }`}
                    >
                        <Filter size={16} />
                        Filters
                    </button>
                </div>

                <div className="flex items-center gap-2 text-sm text-neutral-500">
                    <span>Show:</span>
                    <select
                        title="Records per page"
                        aria-label="Records per page"
                        className="bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-1 outline-none text-neutral-300"
                        value={limit}
                        disabled
                    >
                        <option>25</option>
                    </select>
                </div>
            </div>

            {/* Filter Options */}
            {showFilters && (
                <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-2xl flex flex-wrap gap-4">
                    <div>
                        <label className="block text-xs text-neutral-500 mb-1.5">Status</label>
                        <select
                            value={statusFilter}
                            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                            className="bg-neutral-950 border border-neutral-800 rounded-xl py-2 px-3 text-sm outline-none text-neutral-300"
                        >
                            <option value="">All Statuses</option>
                            <option value="active">Active</option>
                            <option value="pending">Pending</option>
                            <option value="suspended">Suspended</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs text-neutral-500 mb-1.5">Plan</label>
                        <select
                            value={planFilter}
                            onChange={(e) => { setPlanFilter(e.target.value); setPage(1); }}
                            className="bg-neutral-950 border border-neutral-800 rounded-xl py-2 px-3 text-sm outline-none text-neutral-300"
                        >
                            <option value="">All Plans</option>
                            <option value="free">Free</option>
                            <option value="pro">Pro</option>
                            <option value="enterprise">Enterprise</option>
                        </select>
                    </div>
                    {(statusFilter || planFilter) && (
                        <button
                            onClick={() => { setStatusFilter(''); setPlanFilter(''); setPage(1); }}
                            className="self-end px-3 py-2 text-sm text-neutral-400 hover:text-white transition-colors"
                        >
                            Clear Filters
                        </button>
                    )}
                </div>
            )}

            {/* Sellers Table */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                    </div>
                ) : sellers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <Store className="w-16 h-16 text-neutral-700 mb-4" />
                        <p className="text-neutral-500">No sellers found</p>
                        <p className="text-neutral-600 text-sm mt-1">
                            {searchTerm || statusFilter || planFilter
                                ? 'Try adjusting your filters'
                                : 'Invite your first seller to get started'}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm border-collapse">
                            <thead>
                                <tr className="border-b border-neutral-800 bg-neutral-900/50">
                                    <th className="p-4 w-12">
                                        <button
                                            onClick={toggleSelectAll}
                                            className="w-11 h-11 flex items-center justify-center hover:bg-neutral-700 rounded transition-colors"
                                            title={allSelected ? "Deselect all" : "Select all"}
                                            aria-label={allSelected ? "Deselect all sellers" : "Select all sellers"}
                                        >
                                            {allSelected ? (
                                                <CheckSquare size={18} className="text-emerald-500" />
                                            ) : (
                                                <Square size={18} className="text-neutral-500" />
                                            )}
                                        </button>
                                    </th>
                                    <th className="p-4 font-medium text-neutral-500 uppercase tracking-wider text-[11px]">
                                        Store Name
                                    </th>
                                    <th className="p-4 font-medium text-neutral-500 uppercase tracking-wider text-[11px]">
                                        Slug
                                    </th>
                                    <th className="p-4 font-medium text-neutral-500 uppercase tracking-wider text-[11px]">
                                        Plan
                                    </th>
                                    <th className="p-4 font-medium text-neutral-500 uppercase tracking-wider text-[11px]">
                                        Status
                                    </th>
                                    <th className="p-4 font-medium text-neutral-500 uppercase tracking-wider text-[11px]">
                                        Storage (Est.)
                                    </th>
                                    <th className="p-4 font-medium text-neutral-500 uppercase tracking-wider text-[11px]">
                                        Joined
                                    </th>
                                    <th className="p-4 font-medium text-neutral-500 uppercase tracking-wider text-[11px] text-right">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-800">
                                {sellers.map((seller: any) => {
                                    // Calculate estimated storage
                                    const stats = seller.stats || { productCount: 0, imageCount: 0, orderCount: 0 };
                                    const estimatedMB = (((stats.productCount || 0) * 5) + ((stats.imageCount || 0) * 500) + ((stats.orderCount || 0) * 2)) / 1024;

                                    return (
                                        <tr
                                            key={seller.id}
                                            className={`hover:bg-neutral-800/30 transition-colors group ${selectedIds.has(seller.id) ? 'bg-emerald-500/10' : ''
                                                }`}
                                        >
                                            <td className="p-4 w-12">
                                                <button
                                                    onClick={() => toggleSelect(seller.id)}
                                                    className="w-11 h-11 flex items-center justify-center hover:bg-neutral-700 rounded transition-colors"
                                                    title={selectedIds.has(seller.id) ? "Deselect" : "Select"}
                                                    aria-label={selectedIds.has(seller.id) ? `Deselect ${seller.store_name}` : `Select ${seller.store_name}`}
                                                >
                                                    {selectedIds.has(seller.id) ? (
                                                        <CheckSquare size={18} className="text-emerald-500" />
                                                    ) : (
                                                        <Square size={18} className="text-neutral-500" />
                                                    )}
                                                </button>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-white font-medium group-hover:text-emerald-400 transition-colors">
                                                        {seller.store_name}
                                                    </span>
                                                    <button
                                                        onClick={() => setMessageModalSeller(seller)}
                                                        className="w-11 h-11 flex items-center justify-center hover:bg-emerald-500/20 rounded-lg text-neutral-500 hover:text-emerald-400 transition-all opacity-0 group-hover:opacity-100"
                                                        title="Send message"
                                                        aria-label={`Send message to ${seller.store_name}`}
                                                    >
                                                        <MessageSquare size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <code className="text-neutral-400 text-xs bg-neutral-800 px-2 py-1 rounded">
                                                    {seller.slug}
                                                </code>
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase border ${getPlanStyles(seller.plan)}`}>
                                                    {seller.plan}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase border ${getStatusStyles(seller.status)}`}>
                                                    {seller.status}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex flex-col">
                                                    <span className="text-neutral-300 text-xs font-mono">
                                                        {estimatedMB.toFixed(2)} MB
                                                    </span>
                                                    <span className="text-[10px] text-neutral-600">
                                                        {stats.imageCount || 0} imgs · {stats.productCount || 0} prods
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-4 text-neutral-500 font-mono text-xs">
                                                {new Date(seller.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex items-center justify-end gap-1 md:gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => navigate(`/admin/seller/${seller.id}`)}
                                                        className="w-11 h-11 flex items-center justify-center hover:bg-neutral-700 rounded-lg text-neutral-400 hover:text-white transition-all"
                                                        title="View profile"
                                                        aria-label={`View profile for ${seller.store_name}`}
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                    <a
                                                        href={`/store/${seller.slug}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="w-11 h-11 flex items-center justify-center hover:bg-neutral-700 rounded-lg text-neutral-400 hover:text-white transition-all"
                                                        title="View storefront"
                                                        aria-label={`View storefront for ${seller.store_name}`}
                                                    >
                                                        <ExternalLink size={16} />
                                                    </a>
                                                    {seller.status === 'active' ? (
                                                        <button
                                                            onClick={() => handleQuickStatusChange(seller, 'suspended')}
                                                            className="w-11 h-11 flex items-center justify-center hover:bg-red-500/10 rounded-lg text-neutral-400 hover:text-red-500 transition-all"
                                                            title="Suspend"
                                                            aria-label={`Suspend ${seller.store_name}`}
                                                        >
                                                            <UserX size={16} />
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleQuickStatusChange(seller, 'active')}
                                                            className="w-11 h-11 flex items-center justify-center hover:bg-emerald-500/10 rounded-lg text-neutral-400 hover:text-emerald-500 transition-all"
                                                            title="Activate"
                                                            aria-label={`Activate ${seller.store_name}`}
                                                        >
                                                            <UserCheck size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="p-4 border-t border-neutral-800 flex items-center justify-between bg-neutral-900/50">
                        <p className="text-xs text-neutral-500">
                            Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, totalCount)} of {totalCount} results
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="w-11 h-11 md:w-8 md:h-8 flex items-center justify-center border border-neutral-800 rounded-lg text-neutral-500 hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed"
                                aria-label="Previous page"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNum;
                                if (totalPages <= 5) {
                                    pageNum = i + 1;
                                } else if (page <= 3) {
                                    pageNum = i + 1;
                                } else if (page >= totalPages - 2) {
                                    pageNum = totalPages - 4 + i;
                                } else {
                                    pageNum = page - 2 + i;
                                }
                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => setPage(pageNum)}
                                        className={`w-11 h-11 md:w-8 md:h-8 flex items-center justify-center rounded-lg text-sm md:text-xs font-bold transition-colors ${page === pageNum
                                            ? 'bg-emerald-600 text-white'
                                            : 'hover:bg-neutral-800 text-neutral-400'
                                            }`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="w-11 h-11 md:w-8 md:h-8 flex items-center justify-center border border-neutral-800 rounded-lg text-neutral-500 hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed"
                                aria-label="Next page"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Direct Message Modal */}
            {messageModalSeller && (
                <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-neutral-900 border border-neutral-700 rounded-t-2xl md:rounded-2xl w-full md:max-w-lg shadow-2xl animate-in slide-in-from-bottom-4 md:zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-neutral-800">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-bold text-white">Send Message</h3>
                                    <p className="text-sm text-neutral-400 mt-1">
                                        To: {messageModalSeller.store_name}
                                    </p>
                                </div>
                                <button
                                    onClick={() => {
                                        setMessageModalSeller(null);
                                        setMessageSubject('');
                                        setMessageContent('');
                                    }}
                                    className="w-11 h-11 flex items-center justify-center hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors"
                                    title="Close"
                                    aria-label="Close message modal"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-neutral-400 mb-2">Subject</label>
                                <input
                                    type="text"
                                    value={messageSubject}
                                    onChange={(e) => setMessageSubject(e.target.value)}
                                    placeholder="e.g., Account Update, Policy Change..."
                                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-3 px-4 text-white placeholder-neutral-600 focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-neutral-400 mb-2">Message</label>
                                <textarea
                                    value={messageContent}
                                    onChange={(e) => setMessageContent(e.target.value)}
                                    placeholder="Type your message here..."
                                    rows={4}
                                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-3 px-4 text-white placeholder-neutral-600 focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all resize-none"
                                />
                            </div>
                        </div>
                        <div className="p-6 border-t border-neutral-800 flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    setMessageModalSeller(null);
                                    setMessageSubject('');
                                    setMessageContent('');
                                }}
                                className="px-4 py-3 md:py-2 min-h-[44px] md:min-h-0 text-neutral-400 hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={sendDirectMessage}
                                disabled={sendingMessage || !messageSubject.trim() || !messageContent.trim()}
                                className="flex items-center gap-2 px-5 py-3 md:py-2 min-h-[44px] md:min-h-0 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-all"
                            >
                                {sendingMessage ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : (
                                    <Send size={16} />
                                )}
                                Send Message
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SellersList;
