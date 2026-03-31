import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getCartItems, saveCartItems, CartItem } from '../lib/cart';
import { useCallback } from 'react';

export function useCartSync(storeCustomer: any) {
    const syncToDb = useCallback(async (items: CartItem[]) => {
        if (!storeCustomer) return;

        console.log('[CartSync] Syncing to DB...', items);

        const { error: deleteError } = await supabase
            .from('store_cart_items')
            .delete()
            .eq('customer_id', storeCustomer.customer_id || storeCustomer.id);

        if (deleteError) console.error('[CartSync] Delete error:', deleteError);

        if (items.length === 0) return;

        const dbItems = items.map(item => ({
            customer_id: storeCustomer.customer_id || storeCustomer.id,
            seller_id: item.sellerId,
            product_id: item.productId,
            quantity: item.quantity,
            size: item.size
        }));

        const { error, data } = await supabase.from('store_cart_items').insert(dbItems).select();
        if (error) console.error('[CartSync] Insert error:', error);
        else console.log('[CartSync] Insert success:', data);
    }, [storeCustomer]);

    useEffect(() => {
        if (!storeCustomer) return;

        const syncInitial = async () => {
            const { data: remoteItems, error } = await supabase
                .from('store_cart_items')
                .select('*, product:products(name, price, images:product_media(file_url, is_primary))')
                .eq('customer_id', storeCustomer.customer_id || storeCustomer.id);

            if (error || !remoteItems) return;

            const localItems = getCartItems();

            if (localItems.length === 0 && remoteItems.length > 0) {
                const mappedItems: CartItem[] = remoteItems.map(item => ({
                    productId: item.product_id,
                    sellerId: item.seller_id,
                    quantity: item.quantity,
                    size: item.size || 'M',
                    name: item.product?.name || 'Product',
                    price: item.product?.price || 0,
                    image: (item.product?.images?.find((img: { file_url: string; is_primary: boolean }) => img.is_primary) || item.product?.images?.[0])?.file_url || ''
                }));
                saveCartItems(mappedItems);
            } else if (localItems.length > 0) {
                await syncToDb(localItems);
            }
        };

        syncInitial();

        const handleLocalUpdate = () => {
            const items = getCartItems();
            syncToDb(items);
        };

        window.addEventListener('cart-updated', handleLocalUpdate);

        return () => {
            window.removeEventListener('cart-updated', handleLocalUpdate);
        };
    }, [storeCustomer, syncToDb]);
}
