import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Product } from '../types';

const GUEST_WISHLIST_KEY = (storeSlug: string) => `vf_guest_wishlist_${storeSlug}`;

export function useWishlist(storeCustomer: any, storeSlug: string = 'default') {
    const [wishlistIds, setWishlistIds] = useState<string[]>([]);
    const prevCustomer = useRef<any>(null);

    // Load wishlist based on auth state
    useEffect(() => {
        if (!storeCustomer) {
            // Guest: load from localStorage
            const raw = localStorage.getItem(GUEST_WISHLIST_KEY(storeSlug));
            try {
                setWishlistIds(raw ? JSON.parse(raw) : []);
            } catch {
                setWishlistIds([]);
            }
            return;
        }

        const customerId = storeCustomer.customer_id || storeCustomer.id;

        // Merge guest wishlist on login
        const mergeThenFetch = async () => {
            const guestKey = GUEST_WISHLIST_KEY(storeSlug);
            const raw = localStorage.getItem(guestKey);
            if (raw && prevCustomer.current === null) {
                try {
                    const guestIds: string[] = JSON.parse(raw);
                    if (guestIds.length > 0) {
                        // Fetch existing to avoid duplicates
                        const { data: existing } = await supabase
                            .from('store_wishlists')
                            .select('product_id')
                            .eq('customer_id', customerId);

                        const existingIds = new Set((existing || []).map((e: any) => e.product_id));
                        const toInsert = guestIds
                            .filter(id => !existingIds.has(id))
                            .map(id => ({
                                customer_id: customerId,
                                seller_id: storeCustomer.seller_id,
                                product_id: id,
                            }));

                        if (toInsert.length > 0) {
                            await supabase.from('store_wishlists').insert(toInsert);
                        }
                    }
                    localStorage.removeItem(guestKey);
                } catch { /* ignore merge errors */ }
            }

            // Fetch from DB
            const { data } = await supabase
                .from('store_wishlists')
                .select('product_id')
                .eq('customer_id', customerId);

            if (data) setWishlistIds(data.map((item: any) => item.product_id));
        };

        mergeThenFetch();
        prevCustomer.current = storeCustomer;
    }, [storeCustomer, storeSlug]);

    const toggleWishlist = async (product: Product) => {
        const isAdding = !wishlistIds.includes(product.id);

        const updated = isAdding
            ? [...wishlistIds, product.id]
            : wishlistIds.filter(id => id !== product.id);

        setWishlistIds(updated);

        if (!storeCustomer) {
            // Guest: persist to localStorage
            localStorage.setItem(GUEST_WISHLIST_KEY(storeSlug), JSON.stringify(updated));
            return isAdding;
        }

        const customerId = storeCustomer.customer_id || storeCustomer.id;
        if (isAdding) {
            await supabase.from('store_wishlists').insert({
                customer_id: customerId,
                seller_id: storeCustomer.seller_id,
                product_id: product.id
            });
        } else {
            await supabase.from('store_wishlists').delete()
                .eq('customer_id', customerId)
                .eq('product_id', product.id);
        }

        return isAdding;
    };

    return { wishlistIds, toggleWishlist };
}
