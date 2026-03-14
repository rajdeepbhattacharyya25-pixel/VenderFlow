import React, { useEffect, useState } from 'react';
import { Product } from '../types';
import { IconX, IconStar, IconStarHalf, IconCheck, IconHeart, IconShield, IconTruck, IconReturn } from './Icons';
import { ReviewSummaries } from './ReviewSummaries';

interface QuickViewModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  isWishlisted: boolean;
  onToggleWishlist: (product: Product) => void;
  onAddToCart?: (product: Product, size: string) => void;
}

export const QuickViewModal: React.FC<QuickViewModalProps> = ({ product, isOpen, onClose, isWishlisted, onToggleWishlist, onAddToCart }) => {
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [activeMedia, setActiveMedia] = useState<{ url: string, type: 'image' | 'video' } | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isHeartPulse, setIsHeartPulse] = useState(false);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Reset state when product changes
  useEffect(() => {
    if (product) {
      setSelectedSize(product.sizes[0] || null);
      // Set initial media
      if (product.media && product.media.length > 0) {
        const primary = product.media.find(m => m.is_primary) || product.media[0];
        setActiveMedia({ url: primary.file_url, type: primary.media_type });
      } else {
        const url = product.images && product.images.length > 0 ? product.images[0] : product.image;
        setActiveMedia({ url, type: 'image' });
      }
    }
  }, [product]);

  if (!isOpen || !product) return null;

  const handleAddToCart = () => {
    if (onAddToCart && selectedSize) {
      setIsAdding(true);
      setTimeout(() => {
        onAddToCart(product, selectedSize);
        setIsAdding(false);
        // We don't necessarily want to close the modal immediately to show the animation
        // but the current logic calls onClose(). I'll add a tiny delay.
        setTimeout(onClose, 200);
      }, 400);
    }
  };

  const handleWishlistClick = () => {
    setIsHeartPulse(true);
    onToggleWishlist(product);
    setTimeout(() => setIsHeartPulse(false), 400);
  };

  const mediaItems = product.media && product.media.length > 0
    ? product.media
    : (product.images && product.images.length > 0
      ? product.images.map((url, i) => ({ id: String(i), file_url: url, media_type: 'image' as const }))
      : [{ id: '0', file_url: product.image, media_type: 'image' as const }]);

  const handleSizeSelect = (size: string) => {
    setSelectedSize(size);
    if (product.media) {
      const variantMedia = product.media.find(m => m.media_type === 'image' && m.variant_value === size);
      if (variantMedia) {
        setActiveMedia({ url: variantMedia.file_url, type: 'image' });
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70">

      {/* Modal Content - Added high z-index and solid background */}
      <div className="bg-white dark:bg-stone-950 rounded-3xl shadow-2xl w-full max-w-6xl max-h-[90vh] relative flex flex-col md:flex-row animate-in fade-in zoom-in-95 duration-500 transition-colors border border-gray-100 dark:border-stone-800/50 z-10">

        {/* Close Button - Reduced size and moved inside content boundaries */}
        <button
          onClick={onClose}
          title="Close Modal"
          className="absolute top-4 right-4 z-[100] p-1.5 bg-stone-100 hover:bg-stone-200 dark:bg-stone-900 dark:hover:bg-stone-800 rounded-full text-gray-500 dark:text-stone-400 transition-all shadow-md border border-gray-200 dark:border-stone-700 hover:scale-110 active:scale-95"
        >
          <IconX className="w-5 h-5" />
        </button>

        {/* Image Section - Simplified to extreme */}
        <div className="w-full md:w-[60%] bg-stone-50 dark:bg-stone-900 flex flex-col p-4 md:p-6 transition-colors gap-4 border-b md:border-b-0 md:border-r border-stone-100 dark:border-stone-800/50">

          {/* Main Image/Video Viewport */}
          <div className="flex-1 w-full flex items-center justify-center relative rounded-xl overflow-hidden bg-white dark:bg-stone-950 border border-stone-100 dark:border-stone-800/20 shadow-sm group">
            {activeMedia?.type === 'video' ? (
              <video
                key={activeMedia.url}
                src={activeMedia.url}
                className="max-w-full max-h-full object-contain"
                controls
                autoPlay
                loop
                muted
              />
            ) : (
              <img
                key={activeMedia?.url}
                src={activeMedia?.url || product.image}
                alt={product.name}
                className="max-w-full max-h-full object-contain"
              />
            )}
          </div>

          {/* Thumbnails Swatch */}
          {mediaItems.length > 1 && (
            <div className="flex gap-4 overflow-x-auto pb-2 px-2">
              {mediaItems.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveMedia({ url: item.file_url, type: item.media_type })}
                  className={`
                                flex-shrink-0 w-20 h-24 rounded-lg overflow-hidden border-2 transition-all duration-300 relative
                                ${activeMedia?.url === item.file_url
                      ? 'border-stone-900 dark:border-stone-400 scale-105 shadow-lg'
                      : 'border-transparent opacity-60 hover:opacity-100 hover:border-stone-200 dark:hover:border-stone-800'}
                            `}
                >
                  {item.media_type === 'video' ? (
                    <div className="relative w-full h-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center">
                      <video src={item.file_url} className="absolute inset-0 w-full h-full object-cover opacity-50" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="bg-white/90 dark:bg-black/80 rounded-full p-2 shadow-sm">
                          <svg className="w-4 h-4 text-stone-900 dark:text-white pl-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <img src={item.file_url} alt={`View ${idx + 1}`} className="w-full h-full object-cover" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details Section - Preserved scrolling only here if height exceeds viewport */}
        <div className="w-full md:w-[40%] p-8 md:p-14 flex flex-col overflow-y-auto bg-white dark:bg-stone-950 rounded-r-3xl">
          <div className="flex flex-col gap-6 mb-10">
            <div className="flex items-center gap-3">
              {product.badge && (
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] ${product.badge.bg} ${product.badge.color}`}>
                  {product.badge.text}
                </span>
              )}
              {product.originalPrice && (
                <span className="text-[10px] font-bold text-stone-950 dark:text-stone-400 px-3 py-1 bg-stone-100 dark:bg-stone-800/50 rounded-full tracking-wider">
                  {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% REDUCTION
                </span>
              )}
            </div>

            <h2 className="text-4xl md:text-5xl font-heading font-medium text-stone-950 dark:text-stone-50 transition-colors leading-[1.1] tracking-tight">
              {product.name}
            </h2>

            <div className="flex items-center gap-6 mt-2">
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-light text-stone-950 dark:text-stone-50 transition-colors tracking-tighter">
                  ₹{product.price.toLocaleString()}
                </span>
                {product.originalPrice && (
                  <span className="text-xl text-stone-400 line-through font-light opacity-60">₹{product.originalPrice.toLocaleString()}</span>
                )}
              </div>

              <div className="h-4 w-px bg-stone-200 dark:bg-stone-800"></div>

              <div className="flex items-center gap-2">
                <div className="flex text-stone-950 dark:text-stone-400 text-xs gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <IconStar key={star} className={`w-3.5 h-3.5 ${product.rating >= star ? 'fill-current' : 'text-stone-200 dark:text-stone-800'}`} />
                  ))}
                </div>
                <span className="text-[11px] font-bold text-stone-400 dark:text-stone-600 uppercase tracking-widest">
                  {product.reviews} REVIEWS
                </span>
              </div>
            </div>

            {/* AI Review Summary */}
            <ReviewSummaries productId={product.id} />
          </div>

          <p className="text-base text-stone-600 dark:text-stone-400 leading-relaxed mb-10 transition-colors font-light">
            {product.description || "A masterfully crafted piece designed for the modern individual. Merging uncompromising quality with a refined silhouette, it represents a commitment to enduring style and exceptional comfort."}
          </p>

          <div className="mb-10">
            <div className="flex justify-between items-center mb-5">
              <span className="text-[11px] font-bold text-stone-950 dark:text-stone-50 uppercase tracking-[0.2em] transition-colors pl-1">Size Selection</span>
            </div>
            <div className="grid grid-cols-4 gap-4">
              {product.sizes.map((size) => (
                <button
                  key={size}
                  onClick={() => handleSizeSelect(size)}
                  className={`
                    h-14 flex items-center justify-center rounded-xl text-xs font-bold tracking-widest transition-all duration-300
                    ${selectedSize === size
                      ? 'bg-stone-950 dark:bg-stone-50 text-white dark:text-stone-950 shadow-2xl shadow-stone-900/20 scale-[1.02]'
                      : 'bg-stone-50 dark:bg-stone-900/40 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800/60 border border-stone-100 dark:border-stone-800/50'}
                  `}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-4 mb-10 mt-auto">
            <button
              onClick={handleAddToCart}
              className={`flex-[2.5] bg-stone-950 hover:bg-black dark:bg-stone-50 dark:text-stone-950 dark:hover:bg-white text-white font-bold py-5 px-8 rounded-2xl transition-all shadow-xl hover:shadow-2xl hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] flex items-center justify-center gap-3 text-xs uppercase tracking-[0.2em] group ${isAdding ? 'animate-cart-bounce' : ''}`}
            >
              <IconCheck className={`w-4 h-4 transition-transform duration-300 ${isAdding ? 'scale-125' : ''}`} />
              {isAdding ? 'Added!' : 'Add to Cart'}
            </button>
            <button
              onClick={handleWishlistClick}
              title={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
              className={`flex-1 flex items-center justify-center rounded-2xl border transition-all duration-500 ${isWishlisted
                ? 'bg-stone-100 dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-red-500 shadow-md'
                : 'bg-stone-50 dark:bg-stone-950 border-stone-100 dark:border-stone-800 text-stone-400 hover:border-stone-300 dark:hover:border-stone-600'
                } ${isHeartPulse ? 'animate-heart-pulse' : ''}`}
            >
              <IconHeart className={`w-5 h-5 ${isWishlisted ? 'fill-current' : ''} ${isHeartPulse ? 'scale-110' : ''}`} />
            </button>
          </div>

          <div className="pt-8 border-t border-stone-100 dark:border-stone-900 bg-stone-50/30 dark:bg-stone-950/20 -mx-8 -mb-8 px-8 pb-10 transition-colors grid grid-cols-3 gap-6">
            <div className="flex flex-col items-center justify-center text-center gap-2 group">
              <div className="text-stone-900 dark:text-stone-400 p-2 rounded-full group-hover:bg-stone-100 dark:group-hover:bg-stone-900 transition-colors">
                <IconTruck className="w-5 h-5 stroke-[1.5]" />
              </div>
              <span className="text-[10px] font-bold text-stone-400 dark:text-stone-600 uppercase tracking-widest">Global Dispatch</span>
            </div>
            <div className="flex flex-col items-center justify-center text-center gap-2 group">
              <div className="text-stone-900 dark:text-stone-400 p-2 rounded-full group-hover:bg-stone-100 dark:group-hover:bg-stone-900 transition-colors">
                <IconReturn className="w-5 h-5 stroke-[1.5]" />
              </div>
              <span className="text-[10px] font-bold text-stone-400 dark:text-stone-600 uppercase tracking-widest">Return Policy</span>
            </div>
            <div className="flex flex-col items-center justify-center text-center gap-2 group">
              <div className="text-stone-900 dark:text-stone-400 p-2 rounded-full group-hover:bg-stone-100 dark:group-hover:bg-stone-900 transition-colors">
                <IconShield className="w-5 h-5 stroke-[1.5]" />
              </div>
              <span className="text-[10px] font-bold text-stone-400 dark:text-stone-600 uppercase tracking-widest">Secure Flow</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
