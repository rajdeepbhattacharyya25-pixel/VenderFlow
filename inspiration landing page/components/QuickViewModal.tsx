import React, { useEffect, useState } from 'react';
import { Product } from '../types';
import { IconX, IconStar, IconStarHalf, IconCheck, IconHeart, IconShield, IconTruck, IconReturn } from './Icons';

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
    }
  }, [product]);

  if (!isOpen || !product) return null;

  const handleAddToCart = () => {
    if (onAddToCart && selectedSize) {
      onAddToCart(product, selectedSize);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal Content */}
      <div className="bg-white dark:bg-surface-dark rounded-t-2xl md:rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto overflow-x-hidden relative flex flex-col md:flex-row animate-in slide-in-from-bottom-4 md:zoom-in-95 duration-200 transition-colors">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 bg-white/80 dark:bg-black/50 hover:bg-gray-100 dark:hover:bg-black/70 rounded-full text-gray-500 dark:text-gray-300 transition-colors shadow-sm md:shadow-none"
        >
          <IconX className="w-5 h-5" />
        </button>

        {/* Image Section */}
        <div className="w-full md:w-1/2 bg-gray-50 dark:bg-gray-200 flex items-center justify-center p-6 md:p-12 relative min-h-[250px] transition-colors">
          <img 
            src={product.image} 
            alt={product.name} 
            className="w-auto h-48 md:h-full md:max-h-[400px] object-contain mix-blend-multiply"
          />
        </div>

        {/* Details Section */}
        <div className="w-full md:w-1/2 p-6 md:p-10 flex flex-col pb-safe">
          <div className="flex flex-col gap-2 mb-4 md:mb-6">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-gray-900 dark:text-white transition-colors">{product.name}</h2>
            <div className="flex items-center gap-3">
               {product.originalPrice && (
                 <span className="text-lg text-gray-400 line-through decoration-gray-400">₹{product.originalPrice.toLocaleString()}</span>
               )}
              <span className="text-2xl font-semibold text-red-600 dark:text-red-400 transition-colors">₹{product.price.toLocaleString()}</span>
              <span className="text-gray-300 dark:text-gray-600 mx-1">|</span>
              <div className="flex items-center gap-1">
                <div className="flex text-yellow-400 text-sm">
                  {[1, 2, 3, 4, 5].map((star) => {
                    if (product.rating >= star) {
                      return <IconStar key={star} className="w-4 h-4" fill />;
                    }
                    if (product.rating >= star - 0.5) {
                      return <IconStarHalf key={star} className="w-4 h-4" />;
                    }
                    return <IconStar key={star} className="w-4 h-4 text-gray-300 dark:text-gray-600" />;
                  })}
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400 underline decoration-gray-300 dark:decoration-gray-600 underline-offset-2 ml-1 transition-colors">
                  {product.reviews} reviews
                </span>
              </div>
            </div>
          </div>

          <p className="text-sm md:text-base text-gray-600 dark:text-gray-300 leading-relaxed mb-6 md:mb-8 transition-colors">
            {product.description || "Experience comfort and style with this premium addition to your wardrobe. Designed for versatility and durability."}
          </p>

          <div className="mb-8">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide transition-colors">Select Size</span>
              <a href="#" className="text-xs text-primary dark:text-primary-light underline">Size Guide</a>
            </div>
            <div className="flex flex-wrap gap-3">
              {product.sizes.map((size) => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className={`
                    w-12 h-12 flex items-center justify-center rounded-lg border text-sm font-medium transition-all
                    ${selectedSize === size 
                      ? 'border-primary bg-primary text-white shadow-md transform scale-105' 
                      : 'border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}
                  `}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-4 mb-8">
            <button 
              onClick={handleAddToCart}
              className="flex-1 bg-primary hover:bg-green-900 dark:bg-white dark:text-black dark:hover:bg-gray-200 text-white font-bold py-3 md:py-4 px-6 rounded-full transition-all shadow-lg hover:shadow-xl transform active:scale-95 flex items-center justify-center gap-2 text-sm md:text-base"
            >
              <IconCheck className="w-5 h-5" />
              Add to Cart - ₹{(product.price).toLocaleString()}
            </button>
            <button 
              onClick={() => onToggleWishlist(product)}
              className={`p-3 md:p-4 rounded-full border transition-all ${
                isWishlisted 
                  ? 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50' 
                  : 'border-gray-200 dark:border-gray-600 text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-200 dark:hover:border-red-800 hover:text-red-500'
              }`}
            >
              <IconHeart className="w-6 h-6" fill={isWishlisted} />
            </button>
          </div>

          <div className="mt-auto pt-6 border-t border-gray-100 dark:border-gray-700 grid grid-cols-3 gap-2 transition-colors">
             <div className="flex flex-col items-center justify-center text-center gap-2">
               <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded-full text-primary dark:text-green-400">
                 <IconTruck className="w-4 h-4" />
               </div>
               <span className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400 tracking-wide transition-colors">Fast Shipping</span>
             </div>
             <div className="flex flex-col items-center justify-center text-center gap-2">
               <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded-full text-primary dark:text-green-400">
                 <IconReturn className="w-4 h-4" />
               </div>
               <span className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400 tracking-wide transition-colors">Free Returns</span>
             </div>
             <div className="flex flex-col items-center justify-center text-center gap-2">
               <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded-full text-primary dark:text-green-400">
                 <IconShield className="w-4 h-4" />
               </div>
               <span className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400 tracking-wide transition-colors">Secure Checkout</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};