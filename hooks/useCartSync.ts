import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getCartItems, saveCartItems, CartItem, clearCart } from '../lib/cart';

export function useCartSync(storeCustomer: any) {
    useEffect(() => {
        if (!storeCustomer) return;

        let mounted = true;

        const syncInitial = async () => {
            // 1. Fetch remote cart
            const { data: remoteItems, error } = await supabase
                .from('store_cart_items')
                .select('*, product:products(name, price, images)') // Fetch essential product info if needed
                .eq('customer_id', storeCustomer.customer_id || storeCustomer.id);

            if (error || !remoteItems) return;

            // 2. Map remote DB items to CartItem format
            // Note: We need to ensure we have all fields. In a real app we might fetch product details.
            // For now, we assume the DB stores enough or we rely on product join.
            // Actually, my schema stores product_id. I might need to fetch product data to rebuild CartItem fully 
            // if I don't store name/price in cart table (which I don't, normalized).
            // Let's assume for this MVP we fetch simple or just trust local for now, 
            // BUT wait - if user logs in on new device, local is empty. We MUST fetch product details.

            // Correction: The schema I made links to products. I need to fetch product details.
            // Let's try to do a basic implementation: If local and remote differ, merge.

            // Simplified Strategy for MVP:
            // - If local cart is empty and remote has items -> Load remote
            // - If local has items -> Push local to remote (overwrite or merge)

            const localItems = getCartItems();

            if (localItems.length === 0 && remoteItems.length > 0) {
                // Load from Remote
                const mappedItems: CartItem[] = remoteItems.map(item => ({
                    productId: item.product_id,
                    sellerId: item.seller_id, // Should match
                    quantity: item.quantity,
                    size: item.size || 'M', // Fallback
                    name: item.product?.name || 'Product', // Need join
                    price: item.product?.price || 0,
                    image: item.product?.images?.[0] || ''
                }));
                saveCartItems(mappedItems);
            } else if (localItems.length > 0) {
                // Push Local to Remote (Simple Sync)
                await syncToDb(localItems);
            }
        };

        syncInitial();

        // Listen for local changes to sync UP
        const handleLocalUpdate = () => {
            const items = getCartItems();
            syncToDb(items);
        };

        window.addEventListener('cart-updated', handleLocalUpdate);

        return () => {
            mounted = false;
            window.removeEventListener('cart-updated', handleLocalUpdate);
        };
    }, [storeCustomer]);

    const syncToDb = async (items: CartItem[]) => {
        if (!storeCustomer) return;

        console.log('[CartSync] Syncing to DB...', items);

        // 1. Clear existing remote cart for this customer (easiest way to sync for now)
        // Optimization: In prod, diffing is better. For MVP, delete all and re-insert is safer to avoid dupes/logic errors.
        const { error: deleteError } = await supabase
            .from('store_cart_items')
            .delete()
            .eq('customer_id', storeCustomer.customer_id || storeCustomer.id);

        if (deleteError) console.error('[CartSync] Delete error:', deleteError);

        if (items.length === 0) return;

        // 2. Insert all
        const dbItems = items.map(item => ({
            customer_id: storeCustomer.customer_id || storeCustomer.id,
            seller_id: item.sellerId, // Important: Cart lock logic ensures all items are same seller usually
            product_id: item.productId,
            quantity: item.quantity,
            size: item.size
        }));

        const { error, data } = await supabase.from('store_cart_items').insert(dbItems).select();
        if (error) console.error('[CartSync] Insert error:', error);
        else console.log('[CartSync] Insert success:', data);
    };
}
