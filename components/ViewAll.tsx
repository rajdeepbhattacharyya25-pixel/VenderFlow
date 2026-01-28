import React, { useState, useMemo } from 'react';
import { Product } from '../types';
import { ProductCard } from './ProductCard';
import { IconFilter, IconChevronDown, IconCheck } from './Icons';

interface ViewAllProps {
  products: Product[];
  title?: string;
  subtitle?: string;
  onQuickView: (product: Product) => void;
  onToggleWishlist: (product: Product) => void;
  isWishlisted: (id: number) => boolean;
  onAddToCart: (product: Product) => void;
}

export const ViewAll: React.FC<ViewAllProps> = ({
  products,
  title = "All Products",
  subtitle,
  onQuickView,
  onToggleWishlist,
  isWishlisted,
  onAddToCart
}) => {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);

  // Filter States
  const [sortBy, setSortBy] = useState<'popular' | 'newest' | 'price_asc' | 'price_desc'>('popular');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<string>('all');

  // Extract Data for Filter Options
  const allCategories = useMemo(() => Array.from(new Set(products.map(p => p.category))), [products]);
  const allSizes = useMemo(() => Array.from(new Set(products.flatMap(p => p.sizes))).sort(), [products]);

  // Filtering Logic
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      // Category Filter
      if (selectedCategories.length > 0 && !selectedCategories.includes(product.category)) {
        return false;
      }

      // Size Filter
      if (selectedSizes.length > 0 && !product.sizes.some(size => selectedSizes.includes(size))) {
        return false;
      }

      // Price Filter
      if (priceRange !== 'all') {
        if (priceRange === 'under_2500' && product.price >= 2500) return false;
        if (priceRange === '2500_5000' && (product.price < 2500 || product.price > 5000)) return false;
        if (priceRange === 'over_5000' && product.price <= 5000) return false;
      }

      return true;
    }).sort((a, b) => {
      switch (sortBy) {
        case 'price_asc': return a.price - b.price;
        case 'price_desc': return b.price - a.price;
        case 'newest': return b.id - a.id; // Assuming higher ID is newer
        case 'popular': default: return b.reviews - a.reviews;
      }
    });
  }, [products, selectedCategories, selectedSizes, priceRange, sortBy]);

  // Toggle Handlers
  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  };

  const toggleSize = (size: string) => {
    setSelectedSizes(prev => prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]);
  };

  const clearFilters = () => {
    setSelectedCategories([]);
    setSelectedSizes([]);
    setPriceRange('all');
    setSortBy('popular');
  };

  return (
    <div className="max-w-[1600px] mx-auto px-4 md:px-8 pt-6 md:pt-10 min-h-screen">
      {/* Header & Controls */}
      {/* Changed md:static to md:relative to ensure z-index stacking context is maintained on desktop */}
      <div className="flex flex-col md:flex-row items-end md:items-center justify-between gap-4 mb-8 sticky top-[65px] md:static z-30 bg-white/95 dark:bg-background-dark/95 backdrop-blur-sm md:backdrop-blur-none py-4 md:py-0 -mx-4 px-4 md:mx-0 md:px-0 transition-all border-b md:border-none border-gray-100 dark:border-gray-800 md:bg-transparent">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white font-display transition-colors">{title}</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 transition-colors">
            {subtitle || `Showing ${filteredProducts.length} items`}
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto relative">

          {/* Filter Toggle */}
          <div className="relative flex-1 md:flex-none">
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`w-full justify-center flex items-center gap-2 font-medium text-sm px-4 py-2.5 rounded-full border shadow-sm transition-all ${isFilterOpen || selectedCategories.length > 0 || selectedSizes.length > 0 || priceRange !== 'all' ? 'bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-black' : 'bg-gray-50 dark:bg-surface-dark text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-primary/30'}`}
            >
              <IconFilter className="w-4 h-4" />
              Filters
              {(selectedCategories.length > 0 || selectedSizes.length > 0 || priceRange !== 'all') && (
                <span className="bg-primary text-white dark:bg-black dark:text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full ml-1">
                  {selectedCategories.length + selectedSizes.length + (priceRange !== 'all' ? 1 : 0)}
                </span>
              )}
            </button>

            {/* Filter Dropdown Panel */}
            {isFilterOpen && (
              <>
                {/* Backdrop: Visible on mobile (dark), Transparent on desktop (for click-outside) */}
                <div
                  className="fixed inset-0 z-40 bg-black/20 md:bg-transparent cursor-default"
                  onClick={() => setIsFilterOpen(false)}
                ></div>

                <div className="absolute top-full right-0 mt-2 w-[300px] md:w-[320px] bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-700 rounded-2xl shadow-xl z-50 p-5 animate-in slide-in-from-top-2 fade-in">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-gray-900 dark:text-white">Filters</h3>
                    <button onClick={clearFilters} className="text-xs text-primary dark:text-primary-light font-bold hover:underline">Reset All</button>
                  </div>

                  <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                    {/* Category */}
                    <div>
                      <h4 className="text-xs font-bold uppercase text-gray-500 mb-2">Category</h4>
                      <div className="flex flex-wrap gap-2">
                        {allCategories.map(cat => (
                          <button
                            key={cat}
                            onClick={() => toggleCategory(cat)}
                            className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${selectedCategories.includes(cat) ? 'bg-primary text-white border-primary' : 'bg-transparent text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'}`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Price */}
                    <div>
                      <h4 className="text-xs font-bold uppercase text-gray-500 mb-2">Price</h4>
                      <div className="space-y-2">
                        {[
                          { val: 'all', label: 'All Prices' },
                          { val: 'under_2500', label: 'Under ₹2,500' },
                          { val: '2500_5000', label: '₹2,500 - ₹5,000' },
                          { val: 'over_5000', label: 'Over ₹5,000' }
                        ].map(opt => (
                          <label key={opt.val} className="flex items-center gap-2 cursor-pointer group">
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${priceRange === opt.val ? 'border-primary bg-primary' : 'border-gray-300 dark:border-gray-600'}`}>
                              {priceRange === opt.val && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                            </div>
                            <input type="radio" name="price" className="hidden" checked={priceRange === opt.val} onChange={() => setPriceRange(opt.val)} />
                            <span className={`text-sm ${priceRange === opt.val ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-200'}`}>{opt.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Size */}
                    <div>
                      <h4 className="text-xs font-bold uppercase text-gray-500 mb-2">Size</h4>
                      <div className="flex flex-wrap gap-2">
                        {allSizes.map(size => (
                          <button
                            key={size}
                            onClick={() => toggleSize(size)}
                            className={`w-10 h-10 flex items-center justify-center text-xs rounded-lg border transition-all ${selectedSizes.includes(size) ? 'bg-primary text-white border-primary' : 'bg-transparent text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'}`}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-end md:hidden">
                    <button onClick={() => setIsFilterOpen(false)} className="bg-primary text-white px-6 py-2 rounded-xl text-sm font-bold w-full">Apply Filters</button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="relative flex-1 md:flex-none">
            <button
              onClick={() => setIsSortOpen(!isSortOpen)}
              className="w-full justify-center flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-primary-light transition-colors font-medium text-sm bg-gray-50 dark:bg-surface-dark border border-gray-200 dark:border-gray-700 px-4 py-2.5 rounded-full hover:border-primary/30 dark:hover:border-gray-500 shadow-sm"
            >
              Sort <IconChevronDown className={`w-4 h-4 transition-transform ${isSortOpen ? 'rotate-180' : ''}`} />
            </button>

            {isSortOpen && (
              <>
                {/* Backdrop: Transparent on all screens for Sort to handle click-outside */}
                <div
                  className="fixed inset-0 z-40 bg-transparent cursor-default"
                  onClick={() => setIsSortOpen(false)}
                ></div>

                <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden animate-in slide-in-from-top-2 fade-in">
                  {[
                    { val: 'popular', label: 'Popular' },
                    { val: 'newest', label: 'Newest' },
                    { val: 'price_asc', label: 'Price: Low to High' },
                    { val: 'price_desc', label: 'Price: High to Low' }
                  ].map(opt => (
                    <button
                      key={opt.val}
                      onClick={() => { setSortBy(opt.val as any); setIsSortOpen(false); }}
                      className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex justify-between items-center ${sortBy === opt.val ? 'text-primary dark:text-primary-light font-bold bg-gray-50 dark:bg-gray-800' : 'text-gray-700 dark:text-gray-300'}`}
                    >
                      {opt.label}
                      {sortBy === opt.val && <IconCheck className="w-4 h-4" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-x-3 gap-y-6 md:gap-x-5 md:gap-y-8 pb-10">
          {filteredProducts.map((product) => (
            <ProductCard
              key={`viewall-${product.id}`}
              product={product}
              onQuickView={onQuickView}
              isWishlisted={isWishlisted(product.id)}
              onToggleWishlist={onToggleWishlist}
              onAddToCart={onAddToCart}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
            <IconFilter className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No products found</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">Try adjusting your filters to find what you're looking for.</p>
          <button onClick={clearFilters} className="text-primary font-bold hover:underline">Clear all filters</button>
        </div>
      )}
    </div>
  );
};