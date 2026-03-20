import React, { useState, useEffect } from 'react';
import { adminDb } from '../../lib/admin-api';
import {
    Search,
    Filter,
    CheckCircle2,
    XCircle,
    Clock,
    MoreVertical,
    Eye,
    ExternalLink,
    Store,
    Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface Application {
    id: string;
    name: string;
    email: string;
    phone: string;
    business_name: string;
    category: string;
    city: string;
    is_selling_online: boolean;
    monthly_sales_range: string | null;
    instagram: string | null;
    message: string | null;
    status: 'pending' | 'approved' | 'rejected';
    created_at: string;
    reviewed_at: string | null;
}

export default function SellerApplications() {
    const [applications, setApplications] = useState<Application[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('pending');
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [selectedApp, setSelectedApp] = useState<Application | null>(null);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const limit = 25;

    const loadApplications = async () => {
        setLoading(true);
        try {
            const { applications: data, total } = await adminDb.getApplications({
                page,
                limit,
                status: statusFilter
            });

            // Simple client side search for MVP
            let filteredData = data;
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                filteredData = data.filter((app: Application) =>
                    app.name.toLowerCase().includes(term) ||
                    app.email.toLowerCase().includes(term) ||
                    app.business_name.toLowerCase().includes(term) ||
                    app.phone.includes(term)
                );
            }

            setApplications(filteredData || []);
            setTotalCount(total || 0);
        } catch (error) {
            console.error('Error loading applications:', error);
            toast.error('Failed to load applications');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadApplications();
    }, [page, statusFilter, searchTerm]);

    const handleAction = async (applicationId: string, action: 'approve' | 'reject') => {
        if (!window.confirm(`Are you sure you want to ${action} this application?`)) return;

        setProcessingId(applicationId);
        try {
            const res = await adminDb.reviewApplication(applicationId, action);
            if (res.success) {
                toast.success(`Application ${action}d successfully`);
                setSelectedApp(null);
                loadApplications();
            } else {
                throw new Error(res.error);
            }
        } catch (error: any) {
            toast.error(error.message || `Failed to ${action} application`);
        } finally {
            setProcessingId(null);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'approved':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800"><CheckCircle2 className="w-3 h-3 mr-1" /> Approved</span>;
            case 'rejected':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" /> Rejected</span>;
            default:
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800"><Clock className="w-3 h-3 mr-1" /> Pending</span>;
        }
    };

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white mb-1">Seller Applications</h1>
                    <p className="text-neutral-400 text-sm">Review and onboard new sellers to the platform.</p>
                </div>
            </div>

            {/* Filters and Search */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Search by name, email, or business..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 md:py-2.5 min-h-[44px] md:min-h-0 bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-200 placeholder-neutral-600 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors"
                    />
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                    <div className="flex items-center p-1 bg-neutral-950 rounded-xl border border-neutral-800">
                        {['pending', 'approved', 'rejected', 'all'].map((status) => (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status)}
                                className={`px-4 py-3 min-h-[44px] md:min-h-0 md:py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${statusFilter === status
                                    ? 'bg-neutral-800 text-white shadow-sm'
                                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/50'
                                    }`}
                            >
                                {status}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Content Area */}
            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                </div>
            ) : applications.length === 0 ? (
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-12 text-center text-neutral-400">
                    <Store className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium text-neutral-300">No applications found</p>
                    <p className="text-sm mt-1">Try adjusting your filters or search term.</p>
                </div>
            ) : (
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-neutral-300">
                            <thead className="bg-neutral-950 text-neutral-400 border-b border-neutral-800 font-medium">
                                <tr>
                                    <th className="px-6 py-4">Applicant</th>
                                    <th className="px-6 py-4">Business</th>
                                    <th className="px-6 py-4">Date</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-800/50">
                                {applications.map((app) => (
                                    <tr key={app.id} className="hover:bg-neutral-800/20 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-white">{app.name}</div>
                                            <div className="text-neutral-500 text-xs mt-0.5">{app.email}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <Store className="w-4 h-4 text-neutral-500" />
                                                <span className="font-medium">{app.business_name}</span>
                                            </div>
                                            <div className="text-neutral-500 text-xs mt-0.5 capitalize">{app.category}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-neutral-300 whitespace-nowrap">
                                                {format(new Date(app.created_at), 'MMM d, yyyy')}
                                            </div>
                                            <div className="text-neutral-500 text-xs mt-0.5">
                                                {format(new Date(app.created_at), 'h:mm a')}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {getStatusBadge(app.status)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => setSelectedApp(app)}
                                                className="w-11 h-11 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors inline-block"
                                                title="View Details"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Pagination */}
            {totalCount > limit && (
                <div className="flex items-center justify-between bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3">
                    <span className="text-sm text-neutral-400">
                        Showing <span className="font-medium text-white">{(page - 1) * limit + 1}</span> to <span className="font-medium text-white">{Math.min(page * limit, totalCount)}</span> of <span className="font-medium text-white">{totalCount}</span> results
                    </span>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="px-3 py-3 md:py-1 min-h-[44px] md:min-h-0 bg-neutral-800 text-neutral-300 rounded-lg disabled:opacity-50 hover:bg-neutral-700 transition"
                        >
                            Prev
                        </button>
                        <button
                            onClick={() => setPage(p => p + 1)}
                            disabled={page * limit >= totalCount}
                            className="px-3 py-3 md:py-1 min-h-[44px] md:min-h-0 bg-neutral-800 text-neutral-300 rounded-lg disabled:opacity-50 hover:bg-neutral-700 transition"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}

            {/* Application Detail Modal */}
            {selectedApp && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">

                        <div className="flex justify-between items-center p-6 border-b border-neutral-800 shrink-0">
                            <div className="flex items-center gap-3">
                                <h3 className="text-xl font-bold text-white">Application Details</h3>
                                {getStatusBadge(selectedApp.status)}
                            </div>
                            <button
                                onClick={() => setSelectedApp(null)}
                                className="text-neutral-400 hover:text-white transition w-11 h-11 flex items-center justify-center hover:bg-neutral-800 rounded-lg"
                                title="Close Modal"
                            >
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-grow space-y-8">

                            {/* Actions Banner for Pending */}
                            {selectedApp.status === 'pending' && (
                                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                                    <p className="text-emerald-200 text-sm font-medium">This application requires your review.</p>
                                    <div className="flex gap-3 w-full sm:w-auto">
                                        <button
                                            onClick={() => handleAction(selectedApp.id, 'reject')}
                                            disabled={processingId === selectedApp.id}
                                            className="flex-1 sm:flex-none px-4 py-3 min-h-[44px] md:py-2 md:min-h-0 bg-neutral-800 hover:bg-red-500/20 text-neutral-200 hover:text-red-400 rounded-lg font-medium transition-colors disabled:opacity-50"
                                        >
                                            Reject
                                        </button>
                                        <button
                                            onClick={() => handleAction(selectedApp.id, 'approve')}
                                            disabled={processingId === selectedApp.id}
                                            className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-4 py-3 min-h-[44px] md:py-2 md:min-h-0 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium shadow-md shadow-emerald-900/20 transition-all disabled:opacity-50"
                                        >
                                            {processingId === selectedApp.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                            <span>Approve & Create Store</span>
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Profile Stats Box */}
                                <div className="space-y-6">
                                    <div>
                                        <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-tighter mb-4">Applicant Profile</h4>
                                        <div className="bg-neutral-950 rounded-xl border border-neutral-800 p-4 space-y-4">
                                            <div>
                                                <div className="text-xs text-neutral-500 mb-1">Full Name</div>
                                                <div className="font-medium text-white">{selectedApp.name}</div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-neutral-500 mb-1">Email Address</div>
                                                <div className="font-medium text-emerald-400">{selectedApp.email}</div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-neutral-500 mb-1">Phone / WhatsApp</div>
                                                <div className="font-medium text-white">{selectedApp.phone}</div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-neutral-500 mb-1">Location</div>
                                                <div className="font-medium text-white">{selectedApp.city}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Business Stats Box */}
                                <div className="space-y-6">
                                    <div>
                                        <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-tighter mb-4">Business Details</h4>
                                        <div className="bg-neutral-950 rounded-xl border border-neutral-800 p-4 space-y-4">
                                            <div>
                                                <div className="text-xs text-neutral-500 mb-1">Business Name</div>
                                                <div className="font-medium text-white text-lg flex items-center gap-2">
                                                    <Store className="w-4 h-4 text-emerald-500" />
                                                    {selectedApp.business_name}
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <div className="text-xs text-neutral-500 mb-1">Category</div>
                                                    <div className="font-medium text-white capitalize">{selectedApp.category}</div>
                                                </div>
                                                <div>
                                                    <div className="text-xs text-neutral-500 mb-1">Selling Online?</div>
                                                    <div className="font-medium text-white">{selectedApp.is_selling_online ? 'Yes' : 'No'}</div>
                                                </div>
                                            </div>
                                            {selectedApp.is_selling_online && selectedApp.monthly_sales_range && (
                                                <div>
                                                    <div className="text-xs text-neutral-500 mb-1">Est. Monthly Sales</div>
                                                    <div className="inline-flex px-2 py-1 bg-neutral-800 text-neutral-300 rounded text-sm font-mono border border-neutral-700">
                                                        {selectedApp.monthly_sales_range}
                                                    </div>
                                                </div>
                                            )}
                                            {selectedApp.instagram && (
                                                <div>
                                                    <div className="text-xs text-neutral-500 mb-1">Social / Website</div>
                                                    <a href={selectedApp.instagram.startsWith('http') ? selectedApp.instagram : `https://${selectedApp.instagram}`} target="_blank" rel="noreferrer" className="text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1">
                                                        {selectedApp.instagram} <ExternalLink className="w-3 h-3" />
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Optional Message */}
                            {selectedApp.message && (
                                <div>
                                    <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-tighter mb-2">Message from Applicant</h4>
                                    <div className="bg-neutral-800/30 rounded-xl p-4 border-l-2 border-emerald-500 text-neutral-300 italic">
                                        "{selectedApp.message}"
                                    </div>
                                </div>
                            )}

                            {/* Additional metadata */}
                            <div className="flex justify-between items-center text-xs text-neutral-500 pt-4 border-t border-neutral-800">
                                <span>Applied on {format(new Date(selectedApp.created_at), 'MMMM d, yyyy h:mm a')}</span>
                                {selectedApp.reviewed_at && (
                                    <span>Reviewed on {format(new Date(selectedApp.reviewed_at), 'MMMM d, yyyy')}</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
