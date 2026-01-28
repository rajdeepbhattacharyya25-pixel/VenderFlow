
import { supabase } from './supabase';

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/store-auth-cookie`;

export interface StoreCustomer {
    id: string;
    seller_id: string;
    email: string;
    display_name: string | null;
    phone: string | null;
    alt_phone: string | null;
    gender: string | null;
    dob: string | null;
    avatar_url: string | null;
    status: 'active' | 'suspended' | 'deleted';
    metadata: any;
    created_at: string;
}

export interface AuthResponse {
    success: boolean;
    customer?: Partial<StoreCustomer>;
    error?: string;
}

/**
 * Register a new customer in a specific store
 */
export async function registerStoreCustomer(
    sellerId: string,
    sellerSlug: string,
    email: string,
    password: string,
    displayName?: string
): Promise<AuthResponse> {
    try {
        const response = await fetch(EDGE_FUNCTION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'register',
                sellerId,
                sellerSlug,
                email,
                password,
                displayName
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            return { success: false, error: data.error || 'Registration failed' };
        }

        return { success: true, customer: data.customer };
    } catch (err) {
        console.error('Registration error:', err);
        return { success: false, error: 'Network error occurred.' };
    }
}

/**
 * Login a customer to a specific store
 */
export async function loginStoreCustomer(
    sellerId: string,
    sellerSlug: string,
    email: string,
    password: string
): Promise<AuthResponse> {
    try {
        const response = await fetch(EDGE_FUNCTION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'login',
                sellerId,
                sellerSlug,
                email,
                password
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            return { success: false, error: data.error || 'Login failed' };
        }

        return { success: true, customer: data.customer };
    } catch (err) {
        console.error('Login error:', err);
        return { success: false, error: 'Network error occurred.' };
    }
}

/**
 * Establish a store session using current Supabase Auth session (for OAuth)
 */
export async function establishStoreSession(
    sellerId: string,
    sellerSlug: string
): Promise<AuthResponse> {
    try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.access_token) {
            return { success: false, error: 'No active authentication session' };
        }

        const response = await fetch(EDGE_FUNCTION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({
                action: 'establish_session',
                sellerId,
                sellerSlug
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            return { success: false, error: data.error || 'Failed to establish session' };
        }

        return { success: true, customer: data.customer };
    } catch (err) {
        console.error('Session establishment error:', err);
        return { success: false, error: 'Network error occurred.' };
    }
}

/**
 * Check if customer is logged in (Validate Session)
 */
export async function getCurrentStoreCustomer(sellerSlug?: string): Promise<StoreCustomer | null> {
    try {
        // sellerSlug is kept for API compatibility but not strictly needed for cookie validation
        // as the cookie contains the session info. 
        // However, we might want to verify we are in the right store context if needed.

        const response = await fetch(EDGE_FUNCTION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'validate'
            }),
        });

        if (!response.ok) return null;

        const data = await response.json();

        if (!data.authenticated || !data.customer) {
            return null;
        }

        // Ideally we fetch full profile here if needed, or return what we have
        // The Edge Function returns partial info. 
        // We can fetch full details from DB if needed using the ID
        const { data: fullProfile } = await supabase
            .from('store_customers')
            .select('*')
            .eq('id', data.customer.id)
            .single();

        return fullProfile || null;
    } catch (err) {
        console.error('Session validation error:', err);
        return null;
    }
}

/**
 * Logout
 */
export async function clearStoreSession(sellerSlug?: string): Promise<void> {
    try {
        await fetch(EDGE_FUNCTION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'logout'
            }),
        });
    } catch (err) {
        console.error('Logout error:', err);
    }
}


/**
 * Check if customer is logged in to a specific store
 * (Synchronous check is no longer possible with cookies, mapped to async)
 */
export async function isLoggedInToStore(sellerSlug: string): Promise<boolean> {
    const customer = await getCurrentStoreCustomer(sellerSlug);
    return !!customer;
}

/**
 * Update customer profile data
 * (Kept using direct Supabase for now, assuming RLS allows update by ID)
 */
export async function updateStoreCustomer(
    sellerId: string,
    customerId: string,
    updates: {
        display_name?: string;
        phone?: string;
        alt_phone?: string;
        gender?: string;
        dob?: string;
        avatar_url?: string;
        metadata?: any;
    }
): Promise<{ success: boolean; error?: string }> {
    try {
        const { error } = await supabase
            .from('store_customers')
            .update(updates)
            .eq('id', customerId)
            .eq('seller_id', sellerId);

        if (error) {
            console.error('Error updating profile:', error);
            return { success: false, error: error.message };
        }

        console.log('[StoreAuth] Profile updated successfully');
        return { success: true };
    } catch (err) {
        console.error('Error updating profile:', err);
        return { success: false, error: 'An unexpected error occurred.' };
    }
}


// --- Card Management ---

export interface StoreCard {
    id: string;
    customer_id: string;
    seller_id: string;
    type: string;
    last4: string;
    expiry: string;
    is_default: boolean;
    created_at: string;
}

export async function getStoreCards(customerId: string, sellerId: string) {
    const { data, error } = await supabase
        .from('store_cards')
        .select('*')
        .eq('customer_id', customerId)
        .eq('seller_id', sellerId)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching cards:', error);
        return [];
    }
    return data as StoreCard[];
}

export async function addStoreCard(cardData: Omit<StoreCard, 'id' | 'created_at'>) {
    try {
        // If this is the first card or explicitly set as default, unset others first
        if (cardData.is_default) {
            await supabase
                .from('store_cards')
                .update({ is_default: false })
                .eq('customer_id', cardData.customer_id)
                .eq('seller_id', cardData.seller_id);
        }

        const { data, error } = await supabase
            .from('store_cards')
            .insert(cardData)
            .select()
            .single();

        if (error) throw error;
        return { success: true, card: data as StoreCard };
    } catch (error: any) {
        console.error('Error adding card:', error);
        return { success: false, error: error.message };
    }
}

export async function deleteStoreCard(cardId: string) {
    try {
        const { error } = await supabase
            .from('store_cards')
            .delete()
            .eq('id', cardId);

        if (error) throw error;
        return { success: true };
    } catch (error: any) {
        console.error('Error deleting card:', error);
        return { success: false, error: error.message };
    }
}
