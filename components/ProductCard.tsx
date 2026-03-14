import React, { useState, useRef, useEffect } from 'react';
import { Product } from '../types';
import { IconHeart, IconStar, IconStarHalf, IconShare, IconShoppingBag, IconEye, IconCheck } from './Icons';

interface ProductCardProps {
  product: Product;
  onQuickView: (product: Product) => void;
  isWishlisted: boolean;
  onToggleWishlist: (product: Product) => void;
  onAddToCart?: (product: Product) => void;
  compact?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onQuickView, isWishlisted, onToggleWishlist, onAddToCart, compact = false }) => {
  const videoMedia = product.media?.find(m => m.media_type === 'video');
  const [activeAnimation, setActiveAnimation] = useState<'none' | 'wishlist' | 'cart'>('none');
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const triggerAnimation = (type: 'wishlist' | 'cart') => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setActiveAnimation(type);
    timeoutRef.current = window.setTimeout(() => setActiveAnimation('none'), 800);
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.share) {
      navigator.share({
        title: product.name,
        text: `Check out this ${product.name}!`,
        url: window.location.href,
      }).catch((error) => console.log('Error sharing', error));
    } else {
      // Fallback for desktop
      const dummy = document.createElement('input');
      document.body.appendChild(dummy);
      dummy.value = window.location.href;
      dummy.select();
      document.execCommand('copy');
      document.body.removeChild(dummy);
    }
  };

  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerAnimation('cart');

    if (onAddToCart) {
      onAddToCart(product);
    } else {
      onQuickView(product);
    }
  };

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerAnimation('wishlist');
    onToggleWishlist(product);
  };

  return (
    <div className="group flex flex-col h-full relative">
      {/* Image Container */}
      <div className={`relative bg-[#F9F9F9] dark:bg-gray-100/5 rounded-2xl overflow-hidden ${compact ? 'mb-2' : 'mb-4'} aspect-[3/4] shadow-sm group-hover:shadow-md transition-all duration-300 border border-transparent group-hover:border-gray-100 dark:group-hover:border-white/10`}>

        {/* Interaction Animations Overlay */}
        {activeAnimation !== 'none' && (
          <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center bg-white/30 dark:bg-black/20 backdrop-blur-[1px] rounded-2xl animate-in fade-in duration-200">

            {activeAnimation === 'wishlist' && (
              <div className="bg-white/90 dark:bg-gray-800/90 p-4 rounded-full shadow-xl animate-zoom-fade">
                <IconHeart className="w-8 h-8 text-red-500" fill={true} />
              </div>
            )}

            {activeAnimation === 'cart' && (
              <>
                {/* Ghost Image Zoom Effect */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <img
                    src={product.image}
                    alt={`${product.name} zoom effect`}
                    className="w-2/3 h-2/3 object-contain animate-zoom-fade opacity-60 mix-blend-multiply dark:mix-blend-normal"
                  />
                </div>
                {/* Success Icon */}
                <div className="bg-primary dark:bg-white text-white dark:text-primary-light p-4 rounded-full shadow-xl animate-zoom-fade z-10">
                  <IconCheck className="w-8 h-8" />
                </div>
              </>
            )}
          </div>
        )}

        {/* Action Buttons (Top Right) */}
        <div className={`absolute ${compact ? 'top-2 right-2' : 'top-3 right-3'} z-20 flex flex-col gap-2 md:translate-x-10 md:opacity-0 md:group-hover:translate-x-0 md:group-hover:opacity-100 transition-all duration-300`}>
          <button
            onClick={handleWishlistClick}
            className={`flex items-center justify-center rounded-full shadow-sm hover:shadow-md transition-all transform active:scale-90 ${compact ? 'w-10 h-10' : 'w-11 h-11'} ${isWishlisted
              ? 'bg-white text-red-500 hover:bg-red-50'
              : 'bg-white text-gray-400 hover:text-red-500'
              }`}
            aria-label="Add to wishlist"
          >
            <IconHeart className={compact ? "w-4 h-4" : "w-5 h-5"} fill={isWishlisted} />
          </button>
          {(product.video || product.images?.length > 1) && (
            <button
              onClick={handleShare}
              className={`flex items-center justify-center rounded-full shadow-sm hover:shadow-md transition-all transform active:scale-90 bg-white dark:bg-black/90 text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-primary-light ${compact ? 'w-10 h-10' : 'w-11 h-11'}`}
              aria-label="Share product"
            >
              <IconShare className={compact ? "w-4 h-4" : "w-5 h-5"} />
            </button>
          )}    {/* Product Image */}
          <div className={`w-full h-full ${compact ? 'p-3' : 'p-4'} cursor-pointer flex items-center justify-center overflow-hidden relative`} onClick={() => onQuickView(product)}>
            {videoMedia && (
              <div className="absolute top-3 left-3 z-10 bg-black/40 backdrop-blur-md rounded-full p-1.5 shadow-sm opacity-80 group-hover:opacity-0 transition-opacity md:flex hidden">
                <svg className="w-3 h-3 text-white pl-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
              </div>
            )}
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal transform group-hover:scale-105 transition-transform duration-700 ease-out will-change-transform"
            />
            {videoMedia && (
              <video
                src={videoMedia.file_url}
                className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                autoPlay
                muted
                loop
                playsInline
              />
            )}
          </div>

          <div className={`absolute ${compact ? 'inset-x-2 bottom-2' : 'inset-x-3 bottom-3'} flex gap-2 md:translate-y-full md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100 transition-all duration-300 delay-75 z-20`}>
            <button
              onClick={handleAddClick}
              className={`flex-1 bg-gray-900/90 dark:bg-black/90 backdrop-blur-sm hover:bg-black text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 transform active:scale-95 ${compact ? 'py-2.5 text-[11px] min-h-[44px]' : 'py-3 text-sm min-h-[44px]'}`}
            >
              <IconShoppingBag className={compact ? "w-4 h-4" : "w-4 h-4"} />
              Add
            </button>
            <button
              onClick={() => onQuickView(product)}
              className={`bg-white/90 backdrop-blur-sm hover:bg-white text-gray-900 border border-gray-100 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center transform active:scale-95 ${compact ? 'w-11 min-h-[44px]' : 'w-12 min-h-[44px]'}`}
              aria-label="Quick view"
            >
              <IconEye className={compact ? "w-4 h-4" : "w-5 h-5"} />
            </button>
          </div>
        </div>
      </div>
      {/* Product Info */}
      <div className="flex flex-col gap-1 px-1 flex-grow">
        <div className="flex justify-between items-start gap-2">
          <h3
            className={`font-bold text-gray-900 dark:text-gray-100 font-heading group-hover:text-primary dark:group-hover:text-primary-light transition-colors cursor-pointer leading-tight line-clamp-2 ${compact ? 'text-xs md:text-sm' : 'text-sm md:text-base'}`}
            onClick={() => onQuickView(product)}
          >
            {product.name}
          </h3>
          <div className="flex flex-col items-end shrink-0">
            <span className={`font-bold text-gray-900 dark:text-gray-100 ${compact ? 'text-xs md:text-sm' : 'text-sm md:text-base'}`}>₹{product.price.toLocaleString()}</span>
            {!compact && product.originalPrice && (
              <span className="text-xs text-gray-400 line-through">₹{product.originalPrice.toLocaleString()}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 mt-auto pt-1">
          <div className="flex text-yellow-400 text-[10px] md:text-xs">
            {[1, 2, 3, 4, 5].map((star) => {
              const iconSize = compact ? "w-2.5 h-2.5" : "w-3 h-3";
              if (product.rating >= star) {
                return <IconStar key={star} className={`${iconSize} fill-current`} fill />;
              }
              if (product.rating >= star - 0.5) {
                return <IconStarHalf key={star} className={iconSize} />;
              }
              return <IconStar key={star} className={`${iconSize} text-gray-200 dark:text-gray-600`} />;
            })}
          </div>
          <span className={`text-[10px] text-gray-400 dark:text-gray-500 font-medium ${compact ? 'hidden' : ''}`}>({product.reviews})</span>
        </div>
      </div>
    </div>
  );
};
