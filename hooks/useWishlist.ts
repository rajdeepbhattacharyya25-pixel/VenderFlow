import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Product } from '../types';

export function useWishlist(storeCustomer: any) {
    const [wishlistIds, setWishlistIds] = useState<string[]>([]);

    // Load from local storage initially (fallback) or clean slate
    // For now, start empty or load from localStorage if we want guest wishlist support (out of scope for now, focused on auth)

    useEffect(() => {
        if (!storeCustomer) {
            setWishlistIds([]); // Reset on logout
            return;
        }

        const fetchWishlist = async () => {
            const { data, error } = await supabase
                .from('store_wishlists')
                .select('product_id')
                .eq('customer_id', storeCustomer.customer_id || storeCustomer.id);

            if (data) {
                setWishlistIds(data.map(item => item.product_id));
            }
        };

        fetchWishlist();
    }, [storeCustomer]);

    const toggleWishlist = async (product: Product) => {
        // Optimistic update
        const isAdding = !wishlistIds.includes(product.id);

        setWishlistIds(prev =>
            prev.includes(product.id)
                ? prev.filter(id => id !== product.id)
                : [...prev, product.id]
        );

        if (!storeCustomer) return isAdding; // Just return status for toast if guest

        if (isAdding) {
            await supabase.from('store_wishlists').insert({
                customer_id: storeCustomer.customer_id || storeCustomer.id,
                seller_id: storeCustomer.seller_id,
                product_id: product.id
            });
        } else {
            await supabase.from('store_wishlists').delete()
                .eq('customer_id', storeCustomer.customer_id || storeCustomer.id)
                .eq('product_id', product.id);
        }

        return isAdding;
    };

    return { wishlistIds, toggleWishlist };
}
