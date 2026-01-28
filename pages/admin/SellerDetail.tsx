import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Seller } from '../../lib/seller';
import {
    ArrowLeft, Store, User, Mail, Calendar, Shield,
    Ban, CheckCircle, AlertTriangle, Package, ShoppingCart,
    TrendingUp, Clock, Loader2
} from 'lucide-react';

const SellerDetail: React.FC = () => {
    const { sellerId } = useParams<{ sellerId: string }>();
    const navigate = useNavigate();

    const [seller, setSeller] = useState<Seller | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [stats, setStats] = useState({
        products: 0,
        orders: 0,
        revenue: 0
    });

    // Confirmation modal state
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmAction, setConfirmAction] = useState<'suspend' | 'activate' | null>(null);
    const [confirmInput, setConfirmInput] = useState('');

    useEffect(() => {
        const loadSeller = async () => {
            if (!sellerId) return;

            try {
                const { data, error } = await supabase
                    .from('sellers')
                    .select('*')
                    .eq('id', sellerId)
                    .single();

                if (error) throw error;
                setSeller(data);

                // Load stats
                const [productsRes, ordersRes] = await Promise.all([
                    supabase.from('products').select('id', { count: 'exact' }).eq('seller_id', sellerId),
                    supabase.from('orders').select('id, total', { count: 'exact' }).eq('seller_id', sellerId)
                ]);

                setStats({
                    products: productsRes.count || 0,
                    orders: ordersRes.count || 0,
                    revenue: ordersRes.data?.reduce((sum, o) => sum + (o.total || 0), 0) || 0
                });
            } catch (err) {
                console.error('Error loading seller:', err);
                setError('Failed to load seller details');
            } finally {
                setLoading(false);
            }
        };

        loadSeller();
    }, [sellerId]);

    const handleStatusChange = async (newStatus: 'active' | 'suspended') => {
        if (!seller) return;

        setActionLoading(true);
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

            // Log the action
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

            setSeller({ ...seller, status: newStatus, is_active: newStatus === 'active' });
            setShowConfirmModal(false);
            setConfirmInput('');
        } catch (err) {
            console.error('Error updating seller:', err);
            setError('Failed to update seller status');
        } finally {
            setActionLoading(false);
        }
    };

    const openConfirmModal = (action: 'suspend' | 'activate') => {
        setConfirmAction(action);
        setShowConfirmModal(true);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
        );
    }

    if (error || !seller) {
        return (
            <div className="text-center py-16">
                <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-white mb-2">Seller Not Found</h2>
                <p className="text-neutral-500 mb-6">{error || 'The seller you are looking for does not exist.'}</p>
                <button
                    onClick={() => navigate('/admin/sellers')}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors"
                >
                    Back to Sellers
                </button>
            </div>
        );
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
            case 'pending': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
            case 'suspended': return 'bg-red-500/10 text-red-500 border-red-500/20';
            default: return 'bg-neutral-500/10 text-neutral-500 border-neutral-500/20';
        }
    };

    const getPlanColor = (plan: string) => {
        switch (plan) {
            case 'enterprise': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
            case 'pro': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
            default: return 'bg-neutral-700/30 text-neutral-500 border-neutral-700/50';
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate('/admin/sellers')}
                    className="p-2 hover:bg-neutral-800 rounded-xl transition-colors"
                >
                    <ArrowLeft size={20} className="text-neutral-400" />
                </button>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-white tracking-tight">{seller.store_name}</h1>
                    <p className="text-neutral-500 text-sm mt-1">Seller Profile & Management</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase border ${getStatusColor(seller.status)}`}>
                        {seller.status}
                    </span>
                    <span className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase border ${getPlanColor(seller.plan)}`}>
                        {seller.plan}
                    </span>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <Package className="w-5 h-5 text-indigo-400" />
                        <span className="text-neutral-500 text-sm">Total Products</span>
                    </div>
                    <p className="text-3xl font-bold text-white">{stats.products}</p>
                </div>
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <ShoppingCart className="w-5 h-5 text-emerald-400" />
                        <span className="text-neutral-500 text-sm">Total Orders</span>
                    </div>
                    <p className="text-3xl font-bold text-white">{stats.orders}</p>
                </div>
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <TrendingUp className="w-5 h-5 text-amber-400" />
                        <span className="text-neutral-500 text-sm">Total Revenue</span>
                    </div>
                    <p className="text-3xl font-bold text-white">₹{stats.revenue.toLocaleString()}</p>
                </div>
            </div>

            {/* Seller Info */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
                <h2 className="text-lg font-bold text-white mb-4">Seller Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex items-center gap-3">
                        <Store className="w-5 h-5 text-neutral-500" />
                        <div>
                            <p className="text-xs text-neutral-500 uppercase tracking-wider">Store Name</p>
                            <p className="text-white font-medium">{seller.store_name}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <User className="w-5 h-5 text-neutral-500" />
                        <div>
                            <p className="text-xs text-neutral-500 uppercase tracking-wider">Slug</p>
                            <p className="text-white font-medium font-mono">{seller.slug}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-neutral-500" />
                        <div>
                            <p className="text-xs text-neutral-500 uppercase tracking-wider">Joined</p>
                            <p className="text-white font-medium">
                                {new Date(seller.created_at).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-neutral-500" />
                        <div>
                            <p className="text-xs text-neutral-500 uppercase tracking-wider">Last Updated</p>
                            <p className="text-white font-medium">
                                {new Date(seller.updated_at).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
                <h2 className="text-lg font-bold text-white mb-4">Actions</h2>
                <div className="flex flex-wrap gap-4">
                    <a
                        href={`/store/${seller.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl font-medium transition-colors"
                    >
                        <Store size={18} />
                        View Storefront
                    </a>

                    {seller.status === 'active' ? (
                        <button
                            onClick={() => openConfirmModal('suspend')}
                            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-xl font-medium transition-colors"
                        >
                            <Ban size={18} />
                            Suspend Seller
                        </button>
                    ) : (
                        <button
                            onClick={() => openConfirmModal('activate')}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 rounded-xl font-medium transition-colors"
                        >
                            <CheckCircle size={18} />
                            Activate Seller
                        </button>
                    )}
                </div>
            </div>

            {/* Confirmation Modal */}
            {showConfirmModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
                        {confirmAction === 'suspend' ? (
                            <>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-3 bg-red-500/10 rounded-xl">
                                        <Ban className="w-6 h-6 text-red-500" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white">Suspend Seller</h3>
                                        <p className="text-neutral-500 text-sm">This action will prevent the seller from operating</p>
                                    </div>
                                </div>
                                <p className="text-neutral-400 mb-4">
                                    To confirm, type <span className="font-mono text-white">{seller.store_name}</span> below:
                                </p>
                                <input
                                    type="text"
                                    value={confirmInput}
                                    onChange={(e) => setConfirmInput(e.target.value)}
                                    placeholder="Type store name to confirm"
                                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-3 px-4 text-white mb-4 focus:ring-2 focus:ring-red-500/50 outline-none"
                                />
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => {
                                            setShowConfirmModal(false);
                                            setConfirmInput('');
                                        }}
                                        className="flex-1 px-4 py-3 border border-neutral-700 rounded-xl font-medium hover:bg-neutral-800 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => handleStatusChange('suspended')}
                                        disabled={confirmInput !== seller.store_name || actionLoading}
                                        className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors"
                                    >
                                        {actionLoading ? 'Suspending...' : 'Suspend'}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-3 bg-emerald-500/10 rounded-xl">
                                        <CheckCircle className="w-6 h-6 text-emerald-500" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white">Activate Seller</h3>
                                        <p className="text-neutral-500 text-sm">This will restore the seller's operations</p>
                                    </div>
                                </div>
                                <p className="text-neutral-400 mb-6">
                                    Are you sure you want to activate <span className="font-semibold text-white">{seller.store_name}</span>?
                                </p>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowConfirmModal(false)}
                                        className="flex-1 px-4 py-3 border border-neutral-700 rounded-xl font-medium hover:bg-neutral-800 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => handleStatusChange('active')}
                                        disabled={actionLoading}
                                        className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-medium transition-colors"
                                    >
                                        {actionLoading ? 'Activating...' : 'Activate'}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SellerDetail;
