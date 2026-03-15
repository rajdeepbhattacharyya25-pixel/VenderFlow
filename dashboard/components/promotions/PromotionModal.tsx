import React, { useState, useEffect } from 'react';
import { X, Save, Key, Tag } from 'lucide-react';
import type { Promotion } from '../../../types';

interface PromotionModalProps {
    isOpen: boolean;
    onClose: () => void;
    promotion: Promotion | null;
    onSave: (data: Partial<Promotion>) => Promise<void>;
}

const PromotionModal: React.FC<PromotionModalProps> = ({ isOpen, onClose, promotion, onSave }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<Partial<Promotion>>({
        code: '',
        type: 'percentage',
        value: 10,
        min_order_amount: undefined,
        max_uses: undefined,
        expires_at: undefined,
        is_active: true
    });

    useEffect(() => {
        if (promotion) {
            setFormData({
                ...promotion,
                expires_at: promotion.expires_at ? new Date(promotion.expires_at).toISOString().split('T')[0] : undefined
            });
        } else {
            // Reset to defaults for new
            setFormData({
                code: '',
                type: 'percentage',
                value: 10,
                min_order_amount: undefined,
                max_uses: undefined,
                expires_at: undefined,
                is_active: true
            });
        }
    }, [promotion, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSave(formData);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-theme-panel border border-theme-border w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
                <div className="p-5 border-b border-theme-border flex justify-between items-center shrink-0">
                    <h2 className="text-xl font-heading font-semibold text-theme-text flex items-center gap-2">
                        <Tag className="text-theme-chart-line" size={20} />
                        {promotion ? 'Edit Promotion' : 'Create Promotion'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-theme-bg/50 text-theme-muted hover:text-theme-text hover:bg-theme-bg transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto">
                    <form id="promoForm" onSubmit={handleSubmit} className="space-y-5">
                        {/* Code */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-theme-text">Promotion Code</label>
                            <div className="relative">
                                <Key size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted" />
                                <input
                                    type="text"
                                    required
                                    value={formData.code}
                                    onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                    className="w-full pl-10 pr-4 py-2.5 bg-theme-bg border border-theme-border rounded-xl text-theme-text placeholder-theme-muted focus:ring-2 focus:ring-theme-chart-line/20 focus:border-theme-chart-line transition-all uppercase"
                                    placeholder="e.g. SUMMER25"
                                />
                            </div>
                        </div>

                        {/* Type & Value */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-theme-text">Discount Type</label>
                                <select
                                    value={formData.type}
                                    onChange={e => setFormData({ ...formData, type: e.target.value as 'percentage' | 'fixed' })}
                                    className="w-full px-4 py-2.5 bg-theme-bg border border-theme-border rounded-xl text-theme-text focus:ring-2 focus:ring-theme-chart-line/20 focus:border-theme-chart-line transition-all"
                                >
                                    <option value="percentage">Percentage (%)</option>
                                    <option value="fixed">Fixed Amount ($)</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-theme-text">Value</label>
                                <input
                                    type="number"
                                    required
                                    min="1"
                                    step={formData.type === 'percentage' ? '1' : '0.01'}
                                    max={formData.type === 'percentage' ? '100' : undefined}
                                    value={formData.value || ''}
                                    onChange={e => setFormData({ ...formData, value: parseFloat(e.target.value) })}
                                    className="w-full px-4 py-2.5 bg-theme-bg border border-theme-border rounded-xl text-theme-text focus:ring-2 focus:ring-theme-chart-line/20 focus:border-theme-chart-line transition-all"
                                    placeholder={formData.type === 'percentage' ? '25' : '10.00'}
                                />
                            </div>
                        </div>

                        {/* Limits */}
                        <div className="space-y-1.5 border-t border-theme-border pt-4 mt-2">
                            <label className="text-sm font-medium text-theme-text">Optional Limits</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-theme-muted mb-1 block">Min Order Amount ($)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={formData.min_order_amount || ''}
                                        onChange={e => setFormData({ ...formData, min_order_amount: e.target.value ? parseFloat(e.target.value) : undefined })}
                                        className="w-full px-4 py-2 bg-theme-bg border border-theme-border rounded-lg text-theme-text text-sm focus:ring-2 focus:ring-theme-chart-line/20"
                                        placeholder="No minimum"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-theme-muted mb-1 block">Maximum Uses (Total)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        step="1"
                                        value={formData.max_uses || ''}
                                        onChange={e => setFormData({ ...formData, max_uses: e.target.value ? parseInt(e.target.value) : undefined })}
                                        className="w-full px-4 py-2 bg-theme-bg border border-theme-border rounded-lg text-theme-text text-sm focus:ring-2 focus:ring-theme-chart-line/20"
                                        placeholder="Unlimited"
                                    />
                                </div>
                            </div>

                            <div className="pt-2">
                                <label className="text-xs text-theme-muted mb-1 block">Expiry Date</label>
                                <input
                                    type="date"
                                    value={formData.expires_at || ''}
                                    onChange={e => setFormData({ ...formData, expires_at: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                                    className="w-full px-4 py-2 bg-theme-bg border border-theme-border rounded-lg text-theme-text text-sm focus:ring-2 focus:ring-theme-chart-line/20"
                                />
                            </div>
                        </div>

                        {/* Status Toggle */}
                        <div className="flex items-center gap-3 pt-4 border-t border-theme-border">
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={formData.is_active}
                                    onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                                />
                                <div className="w-11 h-6 bg-theme-bg peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-theme-chart-line"></div>
                            </label>
                            <span className="text-sm font-medium text-theme-text">
                                {formData.is_active ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                    </form>
                </div>

                <div className="p-5 border-t border-theme-border flex justify-end gap-3 shrink-0 bg-theme-panel rounded-b-2xl">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-xl font-medium text-theme-muted hover:text-theme-text hover:bg-theme-bg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="promoForm"
                        disabled={loading || !formData.code || !formData.value}
                        className="px-6 py-2.5 rounded-xl bg-theme-text text-theme-bg font-bold hover:opacity-90 shadow-lg shadow-theme-chart-line/10 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        <Save size={18} />
                        {loading ? 'Saving...' : 'Save Promotion'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PromotionModal;
