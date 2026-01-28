import { supabase } from './supabase';

export interface OrderItem {
    product_id: string;
    product_name: string;
    product_image: string;
    variant_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
}

export interface OrderData {
    customer_id?: string;
    items: OrderItem[];
    subtotal: number;
    shipping_cost: number;
    tax: number;
    total: number;
    shipping_address: {
        name: string;
        phone: string;
        street: string;
        building?: string;
        city: string;
        state?: string;
        zip: string;
    };
    payment_method: 'card' | 'upi' | 'cod';
    delivery_method: 'standard' | 'express';
    status?: string;
}

export interface Order extends OrderData {
    id: string;
    created_at: string;
    updated_at: string;
}

/**
 * Create a new order
 */
export async function createOrder(orderData: OrderData): Promise<Order> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error('User must be authenticated to create an order');
    }

    const { data, error } = await supabase
        .from('orders')
        .insert({
            customer_id: user.id,
            items: orderData.items,
            subtotal: orderData.subtotal,
            shipping_cost: orderData.shipping_cost,
            tax: orderData.tax,
            total: orderData.total,
            shipping_address: orderData.shipping_address,
            payment_method: orderData.payment_method,
            delivery_method: orderData.delivery_method,
            status: 'pending'
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating order:', error);
        throw error;
    }

    return data;
}

/**
 * Get all orders for the current customer
 */
export async function getCustomerOrders(): Promise<Order[]> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error('User must be authenticated to view orders');
    }

    const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching orders:', error);
        throw error;
    }

    return data || [];
}

/**
 * Get a single order by ID
 */
export async function getOrderById(orderId: string): Promise<Order | null> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error('User must be authenticated to view order');
    }

    const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .eq('customer_id', user.id) // RLS backup - ensure user owns the order
        .single();

    if (error) {
        if (error.code === 'PGRST116') {
            return null; // Not found
        }
        console.error('Error fetching order:', error);
        throw error;
    }

    return data;
}
