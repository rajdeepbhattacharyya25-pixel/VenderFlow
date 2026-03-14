import React, { useState, useEffect } from 'react';
import { Product } from '../types';
import { supabase } from '../lib/supabase';
import { IconShoppingBag, IconSparkles, IconChevronRight, IconChevronLeft } from './Icons';

interface CompleteTheLookProps {
  cartItems: { product: Product; size: string; quantity: number }[];
  allProducts: Product[];
  onAddToCart: (product: Product) => void;
  onQuickView: (product: Product) => void;
}

export const CompleteTheLook: React.FC<CompleteTheLookProps> = ({
  cartItems,
  allProducts,
  onAddToCart,
  onQuickView
}) => {
  const [recommendations, setRecommendations] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cartItems.length === 0) {
      setRecommendations([]);
      return;
    }

    const fetchRecommendations = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { data, error: funcError } = await supabase.functions.invoke('stylist-recommendations', {
          body: { cartItems }
        });

        if (funcError) throw funcError;

        if (data?.recommendations) {
          // Map response IDs to actual product objects from allProducts master list
          const recommendedProducts = data.recommendations
            .map((rec: any) => allProducts.find(p => p.id === rec.id))
            .filter((p: Product | undefined): p is Product => !!p);
          
          setRecommendations(recommendedProducts);
        }
      } catch (err) {
        console.error('Failed to fetch stylist recommendations:', err);
        setError('Could not load styling suggestions.');
      } finally {
        setIsLoading(false);
      }
    };

    // Debounce to avoid excessive calls while customer is adding items
    const timer = setTimeout(fetchRecommendations, 1000);
    return () => clearTimeout(timer);
  }, [cartItems, allProducts]);

  if (cartItems.length === 0 || (!isLoading && recommendations.length === 0)) {
    return null;
  }

  return (
    <div className="mt-12 p-6 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 dark:from-indigo-900/10 dark:to-purple-900/10 rounded-3xl border border-indigo-100/50 dark:border-indigo-500/10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-500 rounded-lg shadow-lg shadow-indigo-500/20">
            <IconSparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold font-heading text-gray-900 dark:text-white">Complete the Look</h3>
            <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">AI-powered styling suggestions</p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex gap-4 overflow-x-hidden pb-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="min-w-[200px] w-[200px] animate-pulse">
              <div className="aspect-[3/4] bg-gray-200 dark:bg-gray-800 rounded-2xl mb-3"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="relative group">
          <div className="flex gap-4 overflow-x-auto hide-scroll pb-4 -mx-2 px-2">
            {recommendations.map(product => (
              <div 
                key={product.id} 
                className="min-w-[200px] w-[200px] flex flex-col group/card cursor-pointer"
                onClick={() => onQuickView(product)}
              >
                <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-white dark:bg-gray-800 mb-3 border border-transparent group-hover/card:border-indigo-200 dark:group-hover/card:border-indigo-500/30 transition-all shadow-sm group-hover/card:shadow-md">
                  <img 
                    src={product.image} 
                    alt={product.name} 
                    className="w-full h-full object-cover mix-blend-multiply dark:mix-blend-normal transform transition-transform duration-500 group-hover/card:scale-105" 
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover/card:bg-black/5 transition-colors"></div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddToCart(product);
                    }}
                    className="absolute bottom-3 right-3 w-10 h-10 bg-white dark:bg-surface-dark shadow-xl rounded-full flex items-center justify-center text-gray-900 dark:text-white hover:bg-indigo-500 hover:text-white transition-all transform hover:scale-110 active:scale-90"
                    aria-label={`Add ${product.name} to cart`}
                  >
                    <IconShoppingBag className="w-5 h-5" />
                  </button>
                </div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate group-hover/card:text-indigo-600 dark:group-hover/card:text-indigo-400 transition-colors">
                  {product.name}
                </h4>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  ₹{product.price.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-500 mt-2">{error}</p>
      )}
    </div>
  );
};
