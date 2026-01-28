import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search,
    Users,
    ShoppingCart,
    ShoppingBag,
    X,
    ArrowRight,
    Loader2,
    BarChart3,
    Mail,
    FileText,
    Sparkles,
    Clock,
    Zap
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface CommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
}

interface SearchResult {
    id: string;
    type: 'seller' | 'order' | 'product';
    title: string;
    subtitle: string;
    path: string;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
    const navigate = useNavigate();
    const inputRef = useRef<HTMLInputElement>(null);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);

    // Focus input when opened
    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setResults([]);
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    // Search function
    const performSearch = useCallback(async (searchQuery: string) => {
        if (!searchQuery.trim()) {
            setResults([]);
            return;
        }

        setLoading(true);
        const searchResults: SearchResult[] = [];

        try {
            // Search sellers
            const { data: sellers } = await supabase
                .from('sellers')
                .select('id, store_name, slug, status')
                .or(`store_name.ilike.%${searchQuery}%,slug.ilike.%${searchQuery}%`)
                .limit(5);

            if (sellers) {
                sellers.forEach(s => {
                    searchResults.push({
                        id: s.id,
                        type: 'seller',
                        title: s.store_name,
                        subtitle: `@${s.slug} · ${s.status}`,
                        path: `/admin/seller/${s.id}`
                    });
                });
            }

            // Search orders by ID
            if (searchQuery.length > 3) {
                const { data: orders } = await supabase
                    .from('orders')
                    .select('id, total, status, created_at')
                    .ilike('id', `%${searchQuery}%`)
                    .limit(3);

                if (orders) {
                    orders.forEach(o => {
                        searchResults.push({
                            id: o.id,
                            type: 'order',
                            title: `Order #${o.id.slice(0, 8)}`,
                            subtitle: `₹${o.total} · ${o.status}`,
                            path: `/admin/orders?id=${o.id}`
                        });
                    });
                }
            }

            // Search products
            const { data: products } = await supabase
                .from('products')
                .select('id, name, price')
                .ilike('name', `%${searchQuery}%`)
                .limit(3);

            if (products) {
                products.forEach(p => {
                    searchResults.push({
                        id: p.id,
                        type: 'product',
                        title: p.name,
                        subtitle: `₹${p.price}`,
                        path: `/admin/products?id=${p.id}`
                    });
                });
            }

            setResults(searchResults);
            setSelectedIndex(0);
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            performSearch(query);
        }, 200);
        return () => clearTimeout(timer);
    }, [query, performSearch]);

    // Handle keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            onClose();
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(i => Math.min(i + 1, results.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(i => Math.max(i - 1, 0));
        } else if (e.key === 'Enter' && results[selectedIndex]) {
            e.preventDefault();
            navigate(results[selectedIndex].path);
            onClose();
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'seller': return Users;
            case 'order': return ShoppingCart;
            case 'product': return ShoppingBag;
            default: return Search;
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'seller': return 'from-violet-500 to-purple-600';
            case 'order': return 'from-emerald-500 to-teal-600';
            case 'product': return 'from-amber-500 to-orange-600';
            default: return 'from-indigo-500 to-blue-600';
        }
    };

    const navItems = [
        { icon: BarChart3, label: 'Dashboard', path: '/admin', key: 'R D', color: 'from-indigo-500 to-blue-600' },
        { icon: Users, label: 'Sellers', path: '/admin/sellers', key: 'R S', color: 'from-violet-500 to-purple-600' },
        { icon: ShoppingCart, label: 'Orders', path: '/admin/orders', key: 'R O', color: 'from-emerald-500 to-teal-600' },
        { icon: Mail, label: 'Invites', path: '/admin/invites', key: 'R I', color: 'from-pink-500 to-rose-600' },
        { icon: ShoppingBag, label: 'Products', path: '/admin/products', key: 'R P', color: 'from-amber-500 to-orange-600' },
        { icon: FileText, label: 'Audit Logs', path: '/admin/logs', key: 'R L', color: 'from-slate-500 to-gray-600' },
    ];

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh]">
            {/* Backdrop with blur */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-md"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-2xl mx-4 animate-in fade-in zoom-in-95 slide-in-from-top-4 duration-200">
                {/* Glow effect */}
                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-3xl blur-xl opacity-20" />

                <div className="relative bg-neutral-900/95 border border-neutral-700/50 rounded-2xl shadow-2xl overflow-hidden">
                    {/* Search Input */}
                    <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 pointer-events-none" />
                        <div className="relative flex items-center p-5">
                            {/* Search Icon */}
                            <div className="relative flex-shrink-0 mr-4">
                                <div className="absolute inset-0 bg-indigo-500 rounded-xl blur-md opacity-30" />
                                <div className="relative p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
                                    <Search className="w-5 h-5 text-white" />
                                </div>
                            </div>

                            {/* Input Field */}
                            <input
                                ref={inputRef}
                                type="text"
                                placeholder="Search anything... sellers, orders, products"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={handleKeyDown}
                                className="flex-1 min-w-0 bg-transparent text-white text-lg font-medium outline-none placeholder:text-neutral-500"
                            />

                            {/* Loading Spinner */}
                            {loading && (
                                <div className="p-2 flex-shrink-0 ml-2">
                                    <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                                </div>
                            )}

                            {/* Close Button */}
                            <button
                                onClick={onClose}
                                className="p-2.5 hover:bg-white/10 rounded-xl transition-all group flex-shrink-0 ml-2"
                                title="Close search"
                            >
                                <X className="w-5 h-5 text-neutral-500 group-hover:text-white transition-colors" />
                            </button>
                        </div>
                    </div>

                    {/* Results */}
                    <div className="max-h-[400px] overflow-y-auto">
                        {query && results.length === 0 && !loading && (
                            <div className="p-12 text-center">
                                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-neutral-800 flex items-center justify-center">
                                    <Search className="w-8 h-8 text-neutral-600" />
                                </div>
                                <p className="text-neutral-400 font-medium">No results found</p>
                                <p className="text-neutral-600 text-sm mt-1">Try searching for something else</p>
                            </div>
                        )}

                        {results.length > 0 && (
                            <div className="p-3 space-y-1">
                                <div className="flex items-center gap-2 px-3 py-2">
                                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                                    <span className="text-[11px] text-neutral-500 uppercase tracking-wider font-semibold">Search Results</span>
                                </div>
                                {results.map((result, index) => {
                                    const Icon = getIcon(result.type);
                                    const isSelected = index === selectedIndex;
                                    return (
                                        <button
                                            key={result.id}
                                            onClick={() => {
                                                navigate(result.path);
                                                onClose();
                                            }}
                                            className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all text-left group ${isSelected
                                                ? 'bg-white/10'
                                                : 'hover:bg-white/5'
                                                }`}
                                        >
                                            <div className={`p-2.5 rounded-xl bg-gradient-to-br ${getTypeColor(result.type)} shadow-lg`}>
                                                <Icon className="w-4 h-4 text-white" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`font-semibold truncate ${isSelected ? 'text-white' : 'text-neutral-200'}`}>
                                                    {result.title}
                                                </p>
                                                <p className="text-xs text-neutral-500 truncate mt-0.5">
                                                    {result.subtitle}
                                                </p>
                                            </div>
                                            <div className={`flex items-center gap-2 transition-all ${isSelected ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'}`}>
                                                <span className="text-xs text-neutral-500">Open</span>
                                                <ArrowRight className="w-4 h-4 text-neutral-400" />
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {!query && (
                            <div className="p-4 space-y-4">
                                {/* Quick Actions */}
                                <div>
                                    <div className="flex items-center gap-2 px-2 py-2">
                                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                                        <span className="text-[11px] text-neutral-500 uppercase tracking-wider font-semibold">Quick Navigation</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        {navItems.map(item => (
                                            <button
                                                key={item.path}
                                                onClick={() => {
                                                    navigate(item.path);
                                                    onClose();
                                                }}
                                                className="group relative overflow-hidden p-4 bg-neutral-800/50 hover:bg-neutral-800 rounded-xl transition-all text-left"
                                            >
                                                <div className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-0 group-hover:opacity-10 transition-opacity`} />
                                                <div className="relative">
                                                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-3 shadow-lg group-hover:scale-110 transition-transform`}>
                                                        <item.icon className="w-5 h-5 text-white" />
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm font-medium text-neutral-200">{item.label}</span>
                                                        <kbd className="text-[9px] bg-black/30 px-1.5 py-0.5 rounded font-mono text-neutral-500">{item.key}</kbd>
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Recent Tip */}
                                <div className="flex items-center gap-3 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                                    <Clock className="w-4 h-4 text-indigo-400" />
                                    <p className="text-xs text-indigo-300">
                                        <span className="font-semibold">Pro tip:</span> Use <kbd className="bg-indigo-500/30 px-1.5 py-0.5 rounded mx-1">R</kbd> + letter shortcuts to navigate instantly
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-neutral-800/50 bg-neutral-900/50 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1.5">
                                <kbd className="px-2 py-1 bg-neutral-800 rounded-md text-[11px] text-neutral-400 font-medium border border-neutral-700">↑</kbd>
                                <kbd className="px-2 py-1 bg-neutral-800 rounded-md text-[11px] text-neutral-400 font-medium border border-neutral-700">↓</kbd>
                                <span className="text-xs text-neutral-600 ml-1">Navigate</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <kbd className="px-2 py-1 bg-neutral-800 rounded-md text-[11px] text-neutral-400 font-medium border border-neutral-700">↵</kbd>
                                <span className="text-xs text-neutral-600 ml-1">Select</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <kbd className="px-2 py-1 bg-neutral-800 rounded-md text-[11px] text-neutral-400 font-medium border border-neutral-700">esc</kbd>
                                <span className="text-xs text-neutral-600 ml-1">Close</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-neutral-600">
                            <span>Press</span>
                            <kbd className="px-2 py-1 bg-neutral-800 rounded-md text-[11px] text-neutral-400 font-medium border border-neutral-700">?</kbd>
                            <span>for all shortcuts</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CommandPalette;
