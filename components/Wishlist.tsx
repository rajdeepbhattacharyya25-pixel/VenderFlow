import React, { useState, useMemo } from 'react';
import { Product } from '../types';
import {
  IconHeart,
  IconTrash,
  IconShoppingBag,
  IconShare,
  IconTrending,
  IconZap
} from './Icons';

interface WishlistProps {
  products: Product[];
  onQuickView: (product: Product) => void;
  onToggleWishlist: (product: Product) => void;
  onNavigateHome: () => void;
  onAddToCart?: (product: Product) => void;
}

type SortOption = 'newest' | 'price-low' | 'price-high' | 'popular';
type FilterOption = 'all' | 'on-sale';

export const Wishlist: React.FC<WishlistProps> = ({ products, onQuickView, onToggleWishlist, onNavigateHome, onAddToCart: _onAddToCart }) => {
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [alertsEnabled, setAlertsEnabled] = useState(false);
  const [showShareTooltip, setShowShareTooltip] = useState<string | null>(null);

  // --- Logic for Sorting & Filtering ---
  const processedProducts = useMemo(() => {
    let result = [...products];

    // Filter
    if (filterBy === 'on-sale') {
      result = result.filter(p => p.original_price && p.original_price > p.price);
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'price-low': return a.price - b.price;
        case 'price-high': return b.price - a.price;
        case 'popular': return b.reviews - a.reviews;
        case 'newest': default: return (b.created_at || '').localeCompare(a.created_at || '');
      }
    });

    return result;
  }, [products, sortBy, filterBy]);

  // --- Handlers ---
  const handleShare = (product: Product) => {
    if (navigator.share) {
      navigator.share({
        title: product.name,
        text: `Check out ${product.name} on FashionStore!`,
        url: window.location.href, // In real app, this would be product URL
      }).catch(console.error);
    } else {
      // Fallback
      navigator.clipboard.writeText(window.location.href);
      setShowShareTooltip(product.id);
      setTimeout(() => setShowShareTooltip(null), 2000);
    }
  };

  const handleShareWishlist = () => {
    if (navigator.share) {
      navigator.share({
        title: 'My Wishlist',
        text: `Check out my wishlist on FashionStore!`,
        url: window.location.href,
      }).catch(console.error);
    } else {
      alert("Wishlist link copied to clipboard!");
    }
  };

  // --- Render Empty State ---
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 animate-in fade-in zoom-in duration-500">
        <div className="w-24 h-24 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-6 animate-pulse">
          <IconHeart className="w-10 h-10 text-red-500" />
        </div>
        <h2 className="text-3xl font-heading font-bold text-gray-900 dark:text-white mb-3">Your Wishlist is Empty</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-sm leading-relaxed">
          Keep track of items you love. Tap the heart icon to add items here.
        </p>
        <button
          onClick={onNavigateHome}
          className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-200 font-bold py-4 px-10 rounded-full transition-all shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
        >
          Explore Collection
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12 min-h-screen">

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 animate-in slide-in-from-top-4 duration-500">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold font-heading text-gray-900 dark:text-white mb-2">
            My Wishlist <span className="text-gray-400 font-sans text-2xl font-medium ml-2">({products.length})</span>
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Everything you've saved for later.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={handleShareWishlist}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-700 rounded-full text-sm font-bold text-gray-700 dark:text-gray-200 hover:border-primary hover:text-primary transition-all shadow-sm"
          >
            <IconShare className="w-4 h-4" /> Share List
          </button>

          <div className="flex items-center gap-3 bg-white dark:bg-surface-dark px-4 py-2.5 rounded-full border border-gray-200 dark:border-gray-700 shadow-sm">
            <span className="text-xs font-bold uppercase text-gray-400 tracking-wider">Alerts</span>
            <button
              onClick={() => setAlertsEnabled(!alertsEnabled)}
              aria-label={alertsEnabled ? "Disable price alerts" : "Enable price alerts"}
              title={alertsEnabled ? "Disable price alerts" : "Enable price alerts"}
              className={`relative w-10 h-5 rounded-full transition-colors ${alertsEnabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${alertsEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="flex overflow-x-auto hide-scroll gap-3 mb-8 pb-2 sticky top-[72px] z-30 bg-white/90 dark:bg-background-dark/90 backdrop-blur-sm py-2 -mx-4 px-4 md:mx-0 md:px-0">
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          aria-label="Sort wishlist items"
          title="Sort wishlist"
          className="appearance-none bg-gray-50 dark:bg-surface-dark border border-transparent hover:border-gray-200 dark:hover:border-gray-600 rounded-full px-5 py-2 text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
        >
          <option value="newest">Newest Added</option>
          <option value="popular">Most Popular</option>
          <option value="price-low">Price: Low to High</option>
          <option value="price-high">Price: High to Low</option>
        </select>

        <button
          onClick={() => setFilterBy(filterBy === 'all' ? 'on-sale' : 'all')}
          className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap border ${filterBy === 'on-sale'
            ? 'bg-red-50 dark:bg-red-900/20 border-red-200 text-red-600 dark:text-red-400'
            : 'bg-gray-50 dark:bg-surface-dark border-transparent text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
        >
          <IconZap className="w-4 h-4" /> On Sale
        </button>

        <div className="flex-grow"></div>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 pb-20">
        {processedProducts.map((product) => (
          <WishlistItem
            key={product.id}
            product={product}
            onQuickView={onQuickView}
            onRemove={() => onToggleWishlist(product)}
            onShare={() => handleShare(product)}
            showTooltip={showShareTooltip === product.id}
          />
        ))}
      </div>
    </div>
  );
};

// --- Sub-Component: Wishlist Item Card ---
const WishlistItem: React.FC<{
  product: Product;
  onQuickView: (p: Product) => void;
  onRemove: () => void;
  onShare: () => void;
  showTooltip: boolean;
}> = ({ product, onQuickView, onRemove, onShare, showTooltip }) => {

  // Smart Triggers Logic (Mocked for Demo)
  const isLowStock = product.id.length % 3 === 0; // Randomly low stock
  const isTrending = product.rating > 4.7;
  const hasPriceDrop = product.original_price && product.original_price > product.price;
  const discount = product.original_price ? Math.round(((product.original_price - product.price) / product.original_price) * 100) : 0;

  return (
    <div className="group bg-white dark:bg-surface-dark rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col relative animate-in zoom-in-50 duration-300">

      {/* Image Area */}
      <div className="relative aspect-[4/5] overflow-hidden bg-gray-50 dark:bg-gray-800 cursor-pointer" onClick={() => onQuickView(product)}>
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover mix-blend-multiply dark:mix-blend-normal transition-transform duration-700 group-hover:scale-105"
        />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start">
          {hasPriceDrop && (
            <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm flex items-center gap-1">
              <IconTrending className="w-3 h-3" /> {discount}% OFF
            </span>
          )}
          {isTrending && !hasPriceDrop && (
            <span className="bg-orange-400 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm flex items-center gap-1">
              <IconZap className="w-3 h-3" /> TRENDING
            </span>
          )}
        </div>

        {/* Remove Button */}
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="absolute top-2 right-2 p-2 bg-white shadow-md dark:bg-gray-800 rounded-full text-gray-400 hover:text-white hover:bg-red-500 dark:hover:bg-red-600 transition-all duration-300 z-20 group/remove"
          aria-label="Remove from wishlist"
          title="Remove from wishlist"
        >
          <IconTrash className="w-4 h-4" />
        </button>

        {/* Quick Actions Overlay (Desktop) */}
        <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex justify-end">
          <button
            onClick={(e) => { e.stopPropagation(); onShare(); }}
            className="text-white hover:text-primary-light transition-colors relative"
          >
            <IconShare className="w-5 h-5" />
            {showTooltip && (
              <span className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-black text-white text-[10px] rounded whitespace-nowrap">Copied!</span>
            )}
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-4 flex flex-col flex-grow">

        {/* Stock Status */}
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-2 h-2 rounded-full ${isLowStock ? 'bg-yellow-400 animate-pulse' : 'bg-green-500'}`}></div>
          <span className={`text-[10px] font-bold uppercase tracking-wide ${isLowStock ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'}`}>
            {isLowStock ? 'Only 2 Left' : 'In Stock'}
          </span>
        </div>

        <h3
          className="font-bold text-gray-900 dark:text-white font-heading text-lg leading-tight mb-1 cursor-pointer hover:text-primary dark:hover:text-primary-light transition-colors line-clamp-1"
          onClick={() => onQuickView(product)}
        >
          {product.name}
        </h3>

        <div className="flex items-baseline gap-2 mb-3">
          <span className="font-bold text-gray-900 dark:text-white">${product.price.toFixed(2)}</span>
          {product.original_price && (
            <span className="text-xs text-gray-400 line-through">${product.original_price.toFixed(2)}</span>
          )}
          {hasPriceDrop && (
            <span className="text-xs font-medium text-green-600 dark:text-green-400">Price dropped!</span>
          )}
        </div>

        <div className="mt-auto flex gap-2">
          <button
            onClick={() => onQuickView(product)}
            className="flex-1 bg-gray-900 dark:bg-white text-white dark:text-black py-2.5 rounded-xl text-sm font-bold shadow-md hover:shadow-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-all flex items-center justify-center gap-2 active:scale-95"
          >
            <IconShoppingBag className="w-4 h-4" /> Add to Cart
          </button>
          <button
            onClick={onShare}
            aria-label="Share product"
            title="Share product"
            className="md:hidden p-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <IconShare className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
