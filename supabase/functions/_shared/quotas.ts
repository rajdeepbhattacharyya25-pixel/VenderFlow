import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

export async function checkQuota(supabase: any, sellerId: string, quotaType: 'product' | 'storage' | 'telegram' | 'email') {
    const { data: seller, error } = await supabase
        .from('sellers')
        .select(`plan, product_count, image_storage_bytes_used, telegram_message_quota_remaining, email_quota_remaining`)
        .eq('id', sellerId)
        .single();

    if (error || !seller) throw new Error("Seller not found");

    const limits: Record<string, any> = {
        free: { product: 10, storage: 100 * 1024 * 1024, telegram: 200, email: 50 },
        pro: { product: 200, storage: 2 * 1024 * 1024 * 1024, telegram: 5000, email: -1 }, // -1 means unlimited
        premium: { product: -1, storage: -1, telegram: -1, email: -1 }
    };

    const planLimits = limits[seller.plan] || limits.free;

    switch (quotaType) {
        case 'product':
            if (planLimits.product !== -1 && seller.product_count >= planLimits.product) return false;
            break;
        case 'storage':
            if (planLimits.storage !== -1 && seller.image_storage_bytes_used >= planLimits.storage) return false;
            break;
        case 'telegram':
            if (planLimits.telegram !== -1 && seller.telegram_message_quota_remaining <= 0) return false;
            break;
        case 'email':
            if (planLimits.email !== -1 && seller.email_quota_remaining <= 0) return false;
            break;
    }

    return true;
}

export async function consumeQuota(supabase: any, sellerId: string, quotaType: 'product' | 'storage' | 'telegram' | 'email', amount: number = 1) {
    const update: any = {};
    const column = {
        product: 'product_count',
        storage: 'image_storage_bytes_used',
        telegram: 'telegram_message_quota_remaining',
        email: 'email_quota_remaining'
    }[quotaType];

    // For product and storage, we increment. For telegram and email, we decrement.
    if (quotaType === 'product' || quotaType === 'storage') {
        const { error } = await supabase.rpc('increment_seller_quota', {
            seller_id_param: sellerId,
            column_param: column,
            amount_param: amount
        });
        if (error) throw error;
    } else {
        const { error } = await supabase.rpc('decrement_seller_quota', {
            seller_id_param: sellerId,
            column_param: column,
            amount_param: amount
        });
        if (error) throw error;
    }
}
