import React, { useState } from 'react';
import { Product } from '../../types';
import { MoreVertical, Edit2, Trash2, Copy, BarChart2 } from 'lucide-react';

interface ProductTableProps {
    products: Product[];
    selectedIds: string[];
    onSelect: (id: string, selected: boolean) => void;
    onSelectAll: (selected: boolean) => void;
    onEdit: (product: Product) => void;
}

const ProductTable: React.FC<ProductTableProps> = ({
    products,
    selectedIds,
    onSelect,
    onSelectAll,
    onEdit
}) => {
    const allSelected = products.length > 0 && selectedIds.length === products.length;

    return (
        <div className="bg-panel rounded-2xl border border-muted/10 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-muted/10 bg-bg/50">
                            <th className="p-4 w-[50px]">
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 rounded border-muted/30 accent-chart-line cursor-pointer"
                                    checked={allSelected}
                                    onChange={(e) => onSelectAll(e.target.checked)}
                                />
                            </th>
                            <th className="p-4 text-xs font-semibold text-muted uppercase tracking-wider">Product</th>
                            <th className="p-4 text-xs font-semibold text-muted uppercase tracking-wider">Status</th>
                            <th className="p-4 text-xs font-semibold text-muted uppercase tracking-wider text-right">Inventory</th>
                            <th className="p-4 text-xs font-semibold text-muted uppercase tracking-wider text-right">Price</th>
                            <th className="p-4 text-xs font-semibold text-muted uppercase tracking-wider text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-muted/10">
                        {products.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="p-8 text-center text-muted">
                                    No products found. Start by adding one!
                                </td>
                            </tr>
                        ) : products.map((product) => (
                            <tr
                                key={product.id}
                                className={`
                                    group transition-colors duration-150 hover:bg-bg/50
                                    ${selectedIds.includes(product.id) ? 'bg-sky-500/5 hover:bg-sky-500/10' : ''}
                                `}
                            >
                                <td className="p-4">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 rounded border-muted/30 accent-chart-line cursor-pointer"
                                        checked={selectedIds.includes(product.id)}
                                        onChange={(e) => onSelect(product.id, e.target.checked)}
                                    />
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-muted/10 flex-shrink-0 overflow-hidden border border-muted/10">
                                            {product.images && product.images[0] ? (
                                                <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-xs text-muted">No Img</div>
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <div
                                                className="font-medium text-text truncate max-w-[200px] cursor-pointer hover:text-chart-line"
                                                onClick={() => onEdit(product)}
                                            >
                                                {product.name}
                                            </div>
                                            <div className="text-xs text-muted">{product.category || 'Uncategorized'}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <span className={`
                                        px-2.5 py-1 rounded-full text-xs font-medium border
                                        ${product.is_active ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'}
                                    `}>
                                        {product.is_active ? 'Published' : 'Draft'}
                                    </span>
                                </td>
                                <td className="p-4 text-right">
                                    <div className="text-sm font-medium text-text">{product.stock_quantity || 0}</div>
                                    <div className="text-xs text-muted">{product.has_variants ? 'Has variants' : 'No variants'}</div>
                                </td>
                                <td className="p-4 text-right">
                                    <div className="text-sm font-medium text-text">₹{product.price.toLocaleString('en-IN')}</div>
                                    {product.discount_price && product.discount_price > 0 && (
                                        <div className="text-xs text-muted line-through opacity-60">
                                            ₹{product.price.toLocaleString('en-IN')}
                                        </div>
                                    )}
                                </td>
                                <td className="p-4 text-right">
                                    <button className="p-2 text-muted hover:text-text rounded-lg hover:bg-bg transition-colors" title="Edit" onClick={() => onEdit(product)}>
                                        <MoreVertical size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ProductTable;
