import { supabase } from './supabase';

export interface Seller {
    id: string;
    store_name: string;
    slug: string;
    plan: 'free' | 'pro' | 'enterprise';
    status: 'pending' | 'active' | 'suspended';
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

/**
 * Extract seller slug from the current URL path.
 * Works with path-based routing: /store/:slug
 * 
 * @returns The seller slug or null if not on a store page
 */
export function getSellerSlug(): string | null {
    const host = window.location.hostname;

    // For localhost or Vercel preview/production URLs, resolve from path: /store/:slug
    if (host.includes('localhost') || host.includes('127.0.0.1') || host.includes('vercel.app')) {
        const parts = window.location.pathname.split('/');
        // Expected: /store/:slug or /store/:slug/...
        return parts[1] === 'store' ? parts[2] || null : null;
    }

    // For custom domains (future support)
    const hostnameParts = host.split('.');
    return hostnameParts.length > 2 ? hostnameParts[0] : null;
}

/**
 * Load seller data from Supabase by slug
 * 
 * @param slug - The seller's URL slug
 * @returns Seller data or null if not found
 */
export async function loadSellerBySlug(slug: string): Promise<Seller | null> {
    const { data, error } = await supabase
        .from('sellers')
        .select('id, store_name, slug, plan, status, is_active, created_at, updated_at')
        .eq('slug', slug)
        .single();

    if (error || !data) {
        console.error('Error loading seller:', error);
        return null;
    }

    if (!data.id || !data.slug) {
        console.error('Invalid seller data:', data);
        return null;
    }

    return data as Seller;
}

/**
 * Load seller data from Supabase by ID
 * 
 * @param id - The seller's UUID
 * @returns Seller data or null if not found
 */
export async function loadSellerById(id: string): Promise<Seller | null> {
    const { data, error } = await supabase
        .from('sellers')
        .select('id, store_name, slug, plan, status, is_active, created_at, updated_at')
        .eq('id', id)
        .single();

    if (error || !data) {
        console.error('Error loading seller:', error);
        return null;
    }

    return data as Seller;
}

// localStorage keys
const CURRENT_SELLER_KEY = 'current_seller_id';

/**
 * Set the current seller ID in localStorage
 * Used to track which store the user is currently browsing
 */
export function setCurrentSeller(sellerId: string): void {
    localStorage.setItem(CURRENT_SELLER_KEY, sellerId);
}

/**
 * Get the current seller ID from localStorage
 */
export function getCurrentSeller(): string | null {
    return localStorage.getItem(CURRENT_SELLER_KEY);
}

/**
 * Clear the current seller from localStorage
 */
export function clearCurrentSeller(): void {
    localStorage.removeItem(CURRENT_SELLER_KEY);
}


/**
 * Check if a seller is active and can have their store accessed
 */
export function isSellerAccessible(seller: Seller): boolean {
    return seller.status === 'active' && seller.is_active;
}

/**
 * Check if the current user is a member of the store
 */
export async function checkStoreMembership(sellerId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
        .from('store_customers')
        .select('id')
        .eq('seller_id', sellerId)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

    if (error && error.code !== 'PGRST116') {
        // PGRST116 is "no rows returned" - expected if not a member
        console.error('Error checking store membership:', error);
    }

    return !!data;
}

/**
 * Join a specific store (create membership)
 */
export async function joinStore(sellerId: string): Promise<{ success: boolean; error?: any }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const { error } = await supabase
        .from('store_customers')
        .insert({
            seller_id: sellerId,
            user_id: user.id,
            status: 'active'
        });

    if (error) {
        // If unique violation, they are already a member (which is fine)
        if (error.code === '23505') {
            return { success: true };
        }
        console.error('Error joining store:', error);
        return { success: false, error };
    }

    return { success: true };
}
