import React, { useState, useEffect } from 'react';
import { Product } from '../types';
import { IconX, IconShoppingBag, IconTruck, IconHeart, IconCheck, IconTrash } from './Icons';

interface CartItem {
  product: Product;
  size: string;
  quantity: number;
}

interface CartProps {
  items: CartItem[];
  wishlistProducts: Product[];
  onRemove: (productId: number, size: string) => void;
  onUpdateQuantity: (productId: number, size: string, delta: number) => void;
  onNavigateHome: () => void;
  onNavigateWishlist: () => void;
  onMoveToWishlist: (product: Product, size: string) => void;
  onAddToCart: (product: Product) => void;
  onCheckout: (selectedItems: CartItem[]) => void;
}

export const Cart: React.FC<CartProps> = ({
  items,
  wishlistProducts,
  onRemove,
  onUpdateQuantity,
  onNavigateHome,
  onNavigateWishlist,
  onMoveToWishlist,
  onAddToCart,
  onCheckout
}) => {
  // --- Selection Logic ---
  // Create unique keys for items: "ID-Size"
  const getItemKey = (item: CartItem) => `${item.product.id}-${item.size}`;

  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  // Initial load: Select all
  useEffect(() => {
    const allKeys = new Set(items.map(getItemKey));
    setSelectedKeys(allKeys);
  }, [items.length]);

  const toggleItemSelection = (key: string) => {
    const newSelected = new Set(selectedKeys);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    setSelectedKeys(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedKeys.size === items.length) {
      setSelectedKeys(new Set()); // Deselect all
    } else {
      setSelectedKeys(new Set(items.map(getItemKey))); // Select all
    }
  };

  const selectedItems = items.filter(item => selectedKeys.has(getItemKey(item)));
  const selectedCount = selectedItems.length;

  // --- Calculations ---
  const subtotal = selectedItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const freeShippingThreshold = 2500;
  const progress = Math.min(100, (subtotal / freeShippingThreshold) * 100);
  const remainingForFreeShipping = Math.max(0, freeShippingThreshold - subtotal);
  const shippingCost = subtotal > freeShippingThreshold || subtotal === 0 ? 0 : 199;
  const total = subtotal + shippingCost;

  // --- Empty State ---
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4 animate-in fade-in duration-500">
        <div className="bg-gray-50 dark:bg-gray-800 p-8 rounded-full mb-6 transition-colors shadow-inner">
          <IconShoppingBag className="w-16 h-16 text-gray-300 dark:text-gray-600" />
        </div>
        <h2 className="text-3xl font-display font-bold text-gray-900 dark:text-white mb-3 transition-colors">Your Bag is Empty</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-sm transition-colors leading-relaxed">
          Looks like you haven't added anything yet.
          {wishlistProducts.length > 0 && " Check your wishlist to save items for later!"}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
          {wishlistProducts.length > 0 && (
            <button
              onClick={onNavigateWishlist}
              className="flex-1 bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-bold py-4 px-6 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
            >
              <IconHeart className="w-5 h-5 text-red-500" /> View Wishlist
            </button>
          )}
          <button
            onClick={onNavigateHome}
            className="flex-1 bg-primary hover:bg-green-900 dark:bg-white dark:text-black dark:hover:bg-gray-200 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg hover:shadow-xl transform active:scale-95"
          >
            Start Shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 pt-8 pb-32 animate-in slide-in-from-bottom-4 duration-500 min-h-screen">

      {/* Header & Select All */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-gray-900 dark:text-white transition-colors">Shopping Bag <span className="text-gray-400 dark:text-gray-500 font-sans text-xl font-normal">({items.length})</span></h1>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={selectedKeys.size === items.length && items.length > 0}
              onChange={toggleSelectAll}
              className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary/20 cursor-pointer"
            />
            <span className="text-sm font-bold text-gray-700 dark:text-gray-300 group-hover:text-primary transition-colors">Select All Items</span>
          </label>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 relative">

        {/* Cart Items List */}
        <div className="lg:w-2/3 space-y-4">
          {items.map((item) => {
            const isSelected = selectedKeys.has(getItemKey(item));
            const isLowStock = item.quantity >= 3; // Simulated stock limit for demo

            return (
              <div
                key={getItemKey(item)}
                className={`
                  relative flex gap-4 p-4 rounded-2xl border transition-all duration-300
                  ${isSelected
                    ? 'bg-white dark:bg-surface-dark border-primary/30 dark:border-primary/50 shadow-sm'
                    : 'bg-gray-50 dark:bg-black/20 border-transparent opacity-80 hover:opacity-100'}
                `}
              >
                {/* Selection Checkbox */}
                <div className="pt-2">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleItemSelection(getItemKey(item))}
                    className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary/20 cursor-pointer"
                  />
                </div>

                {/* Product Image */}
                <div className="w-24 h-32 bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden shrink-0 relative">
                  <img src={item.product.image} alt={item.product.name} className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal" />
                  {/* Badge */}
                  {!isSelected && <div className="absolute inset-0 bg-white/40 dark:bg-black/40"></div>}
                </div>

                {/* Content */}
                <div className="flex-grow flex flex-col justify-between py-0.5">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white font-display text-lg leading-tight mb-1 transition-colors">{item.product.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <span>Size: {item.size}</span>
                        {isLowStock && <span className="text-orange-500 text-xs font-bold bg-orange-50 dark:bg-orange-900/20 px-1.5 rounded">Low Stock</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-lg text-gray-900 dark:text-white">₹{(item.product.price * item.quantity).toLocaleString()}</span>
                      {item.quantity > 1 && (
                        <div className="text-xs text-gray-400">₹{item.product.price.toLocaleString()} each</div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-end justify-between gap-4 mt-3">
                    {/* Actions */}
                    <div className="flex items-center gap-2 md:gap-4 order-2 md:order-1">
                      <button
                        onClick={() => onMoveToWishlist(item.product, item.size)}
                        className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-primary dark:text-gray-400 dark:hover:text-white transition-colors py-2 px-3 min-h-[44px] rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <IconHeart className="w-4 h-4" /> <span className="hidden sm:inline">Save for Later</span>
                      </button>
                      <span className="w-px h-4 bg-gray-200 dark:bg-gray-700 hidden sm:block"></span>
                      <button
                        onClick={() => onRemove(item.product.id, item.size)}
                        className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-red-500 dark:text-gray-400 transition-colors py-2 px-3 min-h-[44px] rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                        title="Remove item"
                        aria-label="Remove item"
                      >
                        <IconTrash className="w-4 h-4" /> <span className="hidden sm:inline">Remove</span>
                      </button>
                    </div>

                    {/* Quantity */}
                    <div className="flex items-center bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl order-1 md:order-2 ml-auto md:ml-0">
                      <button
                        onClick={() => onUpdateQuantity(item.product.id, item.size, -1)}
                        className="w-11 h-11 md:w-8 md:h-8 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors rounded-l-xl text-lg font-medium disabled:opacity-30"
                        disabled={item.quantity <= 1}
                        style={{ WebkitTapHighlightColor: 'transparent' }}
                      >
                        −
                      </button>
                      <span className="w-10 md:w-8 text-center text-sm font-bold text-gray-900 dark:text-white">{item.quantity}</span>
                      <button
                        onClick={() => onUpdateQuantity(item.product.id, item.size, 1)}
                        className="w-11 h-11 md:w-8 md:h-8 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors rounded-r-xl text-lg font-medium disabled:opacity-30 disabled:cursor-not-allowed"
                        disabled={isLowStock}
                        style={{ WebkitTapHighlightColor: 'transparent' }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Bottom Wishlist Section */}
          {wishlistProducts.length > 0 && (
            <div className="mt-12 pt-12 border-t border-gray-100 dark:border-gray-800 animate-in slide-in-from-bottom-8 duration-700">
              <div className="flex items-center gap-2 mb-6">
                <IconHeart className="w-5 h-5 text-red-500" fill />
                <h3 className="text-xl font-bold font-display text-gray-900 dark:text-white">Your Wishlist</h3>
              </div>

              {/* Horizontal Scroll Wishlist */}
              <div className="flex gap-4 overflow-x-auto hide-scroll pb-4 -mx-4 px-4 md:mx-0 md:px-0">
                {wishlistProducts.map(product => (
                  <div key={product.id} className="min-w-[160px] w-[160px] flex flex-col group">
                    <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-800 mb-3 border border-transparent group-hover:border-gray-200 dark:group-hover:border-gray-700 transition-all">
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover mix-blend-multiply dark:mix-blend-normal" />
                      <button
                        onClick={() => onAddToCart(product)}
                        className="absolute bottom-2 right-2 w-8 h-8 bg-white dark:bg-surface-dark shadow-md rounded-full flex items-center justify-center text-gray-900 dark:text-white hover:bg-primary hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
                      >
                        <IconShoppingBag className="w-4 h-4" />
                      </button>
                    </div>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">{product.name}</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">₹{product.price.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Order Summary Sidebar */}
        <div className="lg:w-1/3">
          <div className="bg-gray-50 dark:bg-surface-dark rounded-2xl p-6 sticky top-24 border border-transparent dark:border-gray-700 transition-colors">
            <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-4 font-display transition-colors">Order Summary</h3>

            {/* Free Shipping Progress */}
            {remainingForFreeShipping > 0 ? (
              <div className="mb-6 bg-white dark:bg-black/20 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    <IconTruck className="w-3 h-3" />
                  </div>
                  <span>Add <span className="text-primary dark:text-primary-light">₹{remainingForFreeShipping.toFixed(2)}</span> for Free Shipping</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                  <div className="bg-primary dark:bg-primary-light h-1.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                </div>
              </div>
            ) : (
              <div className="mb-6 bg-green-50 dark:bg-green-900/20 p-3 rounded-xl border border-green-100 dark:border-green-900/30 flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-800 text-green-600 dark:text-green-300 flex items-center justify-center">
                  <IconCheck className="w-3 h-3" />
                </div>
                <span className="text-xs font-bold text-green-700 dark:text-green-300">You've unlocked Free Shipping!</span>
              </div>
            )}

            <div className="space-y-3 mb-6 text-sm text-gray-600 dark:text-gray-400 transition-colors">
              <div className="flex justify-between">
                <span>Selected Items</span>
                <span className="font-medium text-gray-900 dark:text-white transition-colors">{selectedCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-medium text-gray-900 dark:text-white transition-colors">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping</span>
                {shippingCost === 0 ? (
                  <span className="text-green-600 dark:text-green-400 font-medium">Free</span>
                ) : (
                  <span className="font-medium text-gray-900 dark:text-white transition-colors">₹{shippingCost.toFixed(2)}</span>
                )}
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-600 pt-4 mb-6 transition-colors">
              <div className="flex justify-between items-center">
                <span className="font-bold text-gray-900 dark:text-white text-lg">Total</span>
                <span className="font-bold text-2xl text-primary dark:text-white text-2xl transition-colors animate-in zoom-in duration-300 key={total}">₹{total.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={() => onCheckout(selectedItems)}
              disabled={selectedCount === 0}
              className="w-full bg-primary hover:bg-green-900 dark:bg-white dark:text-black dark:hover:bg-gray-200 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              Checkout ({selectedCount})
            </button>

            <p className="text-xs text-center text-gray-400 dark:text-gray-500 mt-4 transition-colors">
              Secure Checkout • Free Returns within 30 days
            </p>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Checkout Bar */}
      <div
        className="lg:hidden fixed bottom-[64px] left-0 right-0 bg-white/95 dark:bg-neutral-950/95 backdrop-blur-lg border-t border-gray-100 dark:border-neutral-800 px-4 py-3 shadow-xl z-30"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">Total to Pay</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">₹{total.toFixed(2)}</p>
          </div>
          <button
            onClick={() => onCheckout(selectedItems)}
            disabled={selectedCount === 0}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-6 rounded-xl shadow-md active:scale-95 transition-all disabled:opacity-70 flex items-center justify-center gap-2"
            style={{ minHeight: '48px', WebkitTapHighlightColor: 'transparent' }}
          >
            Checkout ({selectedCount})
          </button>
        </div>
      </div>

    </div>
  );
};