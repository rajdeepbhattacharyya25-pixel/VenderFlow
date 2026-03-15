import React from 'react';
import { Product } from '../types';
import { Eye, Edit2 } from 'lucide-react';

interface ProductTableProps {
  products: Product[];
}

const ProductTable: React.FC<ProductTableProps> = ({ products }) => {
  return (
    <div className="bg-theme-panel rounded-xl p-6 shadow-sm border border-theme-border mt-6 overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-sm font-bold text-theme-text">Top Selling Products</h2>
        <div className="relative">
          <select
            title="Select Time Range"
            className="bg-theme-bg text-theme-text text-xs font-medium py-1 px-3 rounded-lg outline-none border border-theme-border/20 focus:border-theme-border cursor-pointer appearance-none pr-8"
          >
            <option>This Week</option>
            <option>This Month</option>
          </select>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-theme-muted">
            <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] border-collapse">
          <thead>
            <tr className="text-left border-b border-theme-border/10">
              <th className="pb-4 text-xs font-semibold text-theme-muted uppercase tracking-wider pl-4">Product</th>
              <th className="pb-4 text-xs font-semibold text-theme-muted uppercase tracking-wider">Price</th>
              <th className="pb-4 text-xs font-semibold text-theme-muted uppercase tracking-wider">Orders</th>
              <th className="pb-4 text-xs font-semibold text-theme-muted uppercase tracking-wider">Stock</th>
              <th className="pb-4 text-xs font-semibold text-theme-muted uppercase tracking-wider pr-4 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-theme-border/5">
            {products.map((product) => (
              <tr key={product.id} className="group card-hover hover:bg-theme-bg transition-colors rounded-lg relative">
                <td className="py-4 pl-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-theme-bg flex-shrink-0">
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                    </div>
                    <span className="text-sm font-medium text-theme-text transition-colors">{product.name}</span>
                  </div>
                </td>
                <td className="py-4 text-sm font-medium text-theme-text">₹{product.price?.toLocaleString('en-IN')}</td>
                <td className="py-4 text-sm text-theme-muted">{product.orders}</td>
                <td className="py-4 text-sm text-theme-muted">{product.stock}</td>
                <td className="py-4 pr-4 text-sm font-bold text-theme-text text-right">₹{product.amount?.toLocaleString('en-IN')}</td>

                {/* Hover Actions - Positioned absolutely or appearing on hover */}
                <td className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 bg-theme-panel border border-theme-border shadow-soft p-1 rounded-md">
                  <button className="p-1.5 hover:bg-theme-bg rounded text-theme-muted hover:text-theme-text" title="View Details" aria-label="View Details"><Eye size={14} /></button>
                  <button className="p-1.5 hover:bg-theme-bg rounded text-theme-muted hover:text-theme-text" title="Edit Product" aria-label="Edit Product"><Edit2 size={14} /></button>
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
