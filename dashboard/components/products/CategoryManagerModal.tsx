import React, { useState } from 'react';
import { X, Pencil, Trash, Check, AlertCircle, Loader2, Search } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { motion } from 'framer-motion';

interface CategoryManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    categories: string[];
    onCategoriesUpdated: () => void;
    sellerId: string;
    onLoadingChange?: (loading: boolean) => void;
}

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({ 
    isOpen, 
    onClose, 
    categories, 
    onCategoriesUpdated,
    onLoadingChange,
    sellerId
}) => {
    const [editingCategory, setEditingCategory] = useState<string | null>(null);
    const [newName, setNewName] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState<string | null>(null); // Stores the category name being processed
    const [error, setError] = useState<string | null>(null);

    const filteredCategories = categories.filter(cat => 
        cat.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleRename = async (oldName: string) => {
        if (!newName.trim() || newName === oldName) {
            setEditingCategory(null);
            return;
        }

        setLoading(oldName);
        onLoadingChange?.(true);
        setError(null);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { error: rpcError } = await supabase.rpc('manage_product_category', {
                p_seller_id: sellerId,
                p_action: 'rename',
                p_old_name: oldName,
                p_new_name: newName.trim()
            });

            if (rpcError) throw rpcError;

            onCategoriesUpdated();
            setEditingCategory(null);
            setNewName('');
        } catch (err: unknown) {
            console.error('Rename error:', err);
            const errorObj = err as { message?: string };
            setError(errorObj.message || 'Failed to rename category');
        } finally {
            setLoading(null);
            onLoadingChange?.(false);
        }
    };

    const handleDelete = async (categoryName: string) => {
        if (!confirm(`Are you sure you want to remove "${categoryName}" from ALL products? This cannot be undone.`)) return;

        setLoading(categoryName);
        onLoadingChange?.(true);
        setError(null);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { error: rpcError } = await supabase.rpc('manage_product_category', {
                p_seller_id: sellerId,
                p_action: 'delete',
                p_old_name: categoryName
            });

            if (rpcError) throw rpcError;

            onCategoriesUpdated();
        } catch (err: unknown) {
            console.error('Delete error:', err);
            const errorObj = err as { message?: string };
            setError(errorObj.message || 'Failed to delete category');
        } finally {
            setLoading(null);
            onLoadingChange?.(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-theme-panel rounded-2xl w-full max-w-md shadow-2xl border border-theme-border flex flex-col max-h-[80vh]"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-6 border-b border-theme-border/50 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-theme-text">Manage Categories</h2>
                        <p className="text-xs text-theme-muted mt-1">Changes apply to all products</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-theme-border/20 rounded-full transition-colors text-theme-muted" title="Close">
                        <X size={20} />
                    </button>
                </div>

                <div className="px-6 py-3 border-b border-theme-border/30 bg-theme-bg/30">
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Search categories..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-theme-bg/50 border border-theme-border/50 focus:border-sky-500/50 rounded-xl py-2 pl-9 pr-4 text-sm text-theme-text placeholder-theme-muted outline-none transition-all focus:ring-4 focus:ring-sky-500/5"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-theme-border/50 rounded-lg text-theme-muted transition-colors"
                                title="Clear search"
                            >
                                <X size={12} />
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-500 text-sm animate-in fade-in slide-in-from-top-1">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    {filteredCategories.length === 0 ? (
                        <div className="text-center py-12 text-theme-muted">
                            <p>{searchQuery ? `No matches for "${searchQuery}"` : 'No categories found.'}</p>
                        </div>
                    ) : (
                        filteredCategories.map((cat) => (
                            <div 
                                key={cat}
                                className="group flex items-center gap-3 p-3 rounded-xl bg-theme-bg/50 border border-theme-border/50 hover:bg-theme-bg hover:border-theme-border transition-all"
                            >
                                {editingCategory === cat ? (
                                    <div className="flex-1 flex items-center gap-2">
                                        <input 
                                            autoFocus
                                            type="text"
                                            value={newName}
                                            title="New category name"
                                            placeholder="Enter new name..."
                                            onChange={(e) => setNewName(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleRename(cat);
                                                if (e.key === 'Escape') setEditingCategory(null);
                                            }}
                                            className="flex-1 bg-theme-panel border border-sky-500/50 rounded-lg px-3 py-1.5 text-sm text-theme-text outline-none focus:ring-2 focus:ring-sky-500/20"
                                        />
                                        <button 
                                            onClick={() => handleRename(cat)}
                                            disabled={loading === cat}
                                            className="p-1.5 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors disabled:opacity-50"
                                            title="Save name"
                                        >
                                            {loading === cat ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                                        </button>
                                        <button 
                                            onClick={() => setEditingCategory(null)}
                                            className="p-1.5 text-theme-muted hover:bg-theme-border/20 rounded-lg transition-colors"
                                            title="Cancel renaming"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <span className="flex-1 text-sm font-medium text-theme-text truncate">{cat}</span>
                                        <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => {
                                                    setEditingCategory(cat);
                                                    setNewName(cat);
                                                }}
                                                className="p-2 text-theme-muted hover:text-sky-500 hover:bg-sky-500/10 rounded-lg transition-all min-w-[36px] min-h-[36px] flex items-center justify-center"
                                                title="Rename"
                                            >
                                                <Pencil size={16} />
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(cat)}
                                                disabled={loading === cat}
                                                className="p-2 text-theme-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all min-w-[36px] min-h-[36px] flex items-center justify-center"
                                                title="Delete"
                                            >
                                                {loading === cat ? <Loader2 size={16} className="animate-spin" /> : <Trash size={16} />}
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))
                    )}
                </div>

                <div className="p-4 border-t border-theme-border/50 bg-theme-bg/20">
                    <p className="text-[10px] text-theme-muted text-center uppercase tracking-wider font-semibold">
                        Critical Operations — Handle with care
                    </p>
                </div>
            </motion.div>
        </div>
    );
};
