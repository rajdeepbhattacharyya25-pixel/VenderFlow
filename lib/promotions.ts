import { supabase } from './supabase';
import type { Promotion } from '../types';

export const promotionsApi = {
    // Seller functions
    async getPromotions(sellerId: string) {
        const { data, error } = await supabase
            .from('promotions')
            .select('*')
            .eq('seller_id', sellerId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data as Promotion[];
    },

    async createPromotion(promotion: Partial<Promotion>) {
        // Ensure code is uppercase
        if (promotion.code) {
            promotion.code = promotion.code.toUpperCase();
        }

        const { data, error } = await supabase
            .from('promotions')
            .insert([promotion])
            .select()
            .single();

        if (error) throw error;
        return data as Promotion;
    },

    async updatePromotion(id: string, updates: Partial<Promotion>) {
        // Ensure code is uppercase
        if (updates.code) {
            updates.code = updates.code.toUpperCase();
        }

        const { data, error } = await supabase
            .from('promotions')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data as Promotion;
    },

    async deletePromotion(id: string) {
        const { error } = await supabase
            .from('promotions')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // Storefront functions
    async validatePromoCode(code: string, sellerId: string, cartTotal: number, customerEmail?: string) {
        if (!code || !code.trim()) {
            return { valid: false, error: 'Please enter a promo code' };
        }

        // 1. Find the promo code
        const { data: promo, error: promoError } = await supabase
            .from('promotions')
            .select('*')
            .eq('seller_id', sellerId)
            .eq('code', code.trim().toUpperCase())
            .single();

        if (promoError || !promo) {
            return { valid: false, error: 'Invalid promo code' };
        }

        if (!promo.is_active) {
            return { valid: false, error: 'This promo code is no longer active' };
        }

        // 2. Check expiry
        if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
            return { valid: false, error: 'Promo code has expired' };
        }

        // 3. Check min order amount
        if (promo.min_order_amount && cartTotal < promo.min_order_amount) {
            return { valid: false, error: `Minimum order amount is $${promo.min_order_amount}` };
        }

        // 4. Check max uses
        if (promo.max_uses && promo.current_uses >= promo.max_uses) {
            return { valid: false, error: 'Promo code usage limit reached' };
        }

        // 5. Check if this customer already used it (if email provided)
        if (customerEmail) {
            const { data: usages, error: usagesError } = await supabase
                .from('promotion_usages')
                .select('id')
                .eq('promotion_id', promo.id)
                .eq('customer_email', customerEmail.toLowerCase());

            if (usagesError) {
                return { valid: false, error: 'Error validating promo code usage' };
            }

            if (usages && usages.length > 0) {
                return { valid: false, error: 'You have already used this promo code' };
            }
        }

        // 6. Calculate discount
        let discountAmount = 0;
        if (promo.type === 'percentage') {
            discountAmount = cartTotal * (promo.value / 100);
        } else if (promo.type === 'fixed') {
            discountAmount = promo.value;
        }

        // Ensure discount doesn't exceed cart total
        discountAmount = Math.min(discountAmount, cartTotal);

        return {
            valid: true,
            promo: promo as Promotion,
            discountAmount
        };
    }
};
