import React, { useState, useEffect } from 'react';
import { Plus, Tag, RefreshCw, Trash2, Edit } from 'lucide-react';
import type { Promotion } from '../../types';
import { promotionsApi } from '../../lib/promotions';
import { supabase } from '../../lib/supabase';
import PromotionModal from '../components/promotions/PromotionModal';

const Promotions = () => {
    const [promotions, setPromotions] = useState<Promotion[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);

    const fetchPromotions = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const data = await promotionsApi.getPromotions(user.id);
            setPromotions(data);
        } catch (error) {
            console.error('Error fetching promotions:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPromotions();
    }, []);

    const handleCreate = () => {
        setEditingPromotion(null);
        setIsModalOpen(true);
    };

    const handleEdit = (promo: Promotion) => {
        setEditingPromotion(promo);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this promotion?')) return;

        try {
            await promotionsApi.deletePromotion(id);
            setPromotions(promotions.filter(p => p.id !== id));
        } catch (error) {
            console.error('Error deleting promotion:', error);
            alert('Failed to delete promotion');
        }
    };

    const handleSave = async (data: Partial<Promotion>) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            if (editingPromotion) {
                await promotionsApi.updatePromotion(editingPromotion.id, data);
            } else {
                await promotionsApi.createPromotion({ ...data, seller_id: user.id });
            }
            fetchPromotions();
            setIsModalOpen(false);
        } catch (error: any) {
            console.error('Error saving promotion:', error);
            alert(error.message || 'Failed to save promotion');
            throw error;
        }
    };

    const getStatusText = (promo: Promotion) => {
        if (!promo.is_active) return <span className="text-red-400">Inactive</span>;
        if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
            return <span className="text-amber-400">Expired</span>;
        }
        if (promo.max_uses && promo.current_uses >= promo.max_uses) {
            return <span className="text-amber-400">Limit Reached</span>;
        }
        return <span className="text-emerald-400">Active</span>;
    };

    return (
        <div className="flex flex-col gap-6 animate-[fadeIn_0.5s_ease-out]">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-display font-bold text-text mb-1">Discount Codes</h1>
                    <p className="text-muted text-sm">Create and manage promotions to drive sales.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={fetchPromotions}
                        className="p-2.5 rounded-xl bg-panel border border-muted/20 text-muted hover:text-text hover:border-chart-line transition-all"
                        title="Refresh"
                    >
                        <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button
                        onClick={handleCreate}
                        className="flex items-center gap-2 px-4 py-2.5 bg-text text-bg rounded-xl font-bold hover:opacity-90 transition-opacity shadow-lg shadow-chart-line/10"
                    >
                        <Plus size={20} />
                        <span className="hidden sm:inline">New Code</span>
                    </button>
                </div>
            </div>

            <div className="bg-panel border border-muted/10 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-bg text-muted font-medium border-b border-muted/10">
                            <tr>
                                <th className="px-6 py-4">Code</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Discount</th>
                                <th className="px-6 py-4">Limits</th>
                                <th className="px-6 py-4">Uses</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-muted/10">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-muted">Loading...</td>
                                </tr>
                            ) : promotions.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-muted">
                                        <Tag className="w-8 h-8 opacity-50 mx-auto mb-3" />
                                        <p>No promotions created yet.</p>
                                    </td>
                                </tr>
                            ) : (
                                promotions.map(promo => (
                                    <tr key={promo.id} className="hover:bg-muted/5 transition-colors group">
                                        <td className="px-6 py-4">
                                            <span className="font-bold text-text font-mono bg-muted/10 px-2 py-1 rounded inline-block">
                                                {promo.code}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-medium">
                                            {getStatusText(promo)}
                                        </td>
                                        <td className="px-6 py-4">
                                            {promo.type === 'percentage' ? `${promo.value}% off` : `$${promo.value.toFixed(2)} off`}
                                        </td>
                                        <td className="px-6 py-4 text-xs text-muted">
                                            {promo.min_order_amount && <div>Min: ${promo.min_order_amount}</div>}
                                            {promo.expires_at && <div>Ends: {new Date(promo.expires_at).toLocaleDateString()}</div>}
                                            {!promo.min_order_amount && !promo.expires_at && <div>None</div>}
                                        </td>
                                        <td className="px-6 py-4">
                                            {promo.current_uses} {promo.max_uses ? `/ ${promo.max_uses}` : ''}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleEdit(promo)}
                                                className="p-2 text-muted hover:text-text transition-colors"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(promo.id)}
                                                className="p-2 text-muted hover:text-red-400 transition-colors ml-2"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <PromotionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                promotion={editingPromotion}
                onSave={handleSave}
            />
        </div>
    );
};

export default Promotions;
