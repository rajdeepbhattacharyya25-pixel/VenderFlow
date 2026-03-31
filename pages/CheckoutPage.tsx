import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Checkout } from '../components/Checkout';
import { Product } from '../types';
import { supabase } from '../lib/supabase';
import { getCartSeller, getCartItems, clearCart as clearCartStorage } from '../lib/cart';
import { loadSellerById, Seller, checkStoreMembership, joinStore } from '../lib/seller';
import { ToastContainer } from '../components/Toast';
import { Loader2, ShoppingBag, ArrowLeft } from 'lucide-react';
import { Events } from '../lib/analytics';

interface CartItem {
    product: Product;
    size: string;
    quantity: number;
}

const CheckoutPage = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [seller, setSeller] = useState<Seller | null>(null);
    const [toasts, setToasts] = useState<{ id: number, message: string }[]>([]);

    useEffect(() => {
        const loadCheckoutData = async () => {
            try {
                // Get cart seller
                const sellerId = getCartSeller();

                if (!sellerId) {
                    // No items in cart
                    setLoading(false);
                    return;
                }

                // Load seller info
                const sellerData = await loadSellerById(sellerId);
                setSeller(sellerData);

                // Get cart items from localStorage
                const storedItems = getCartItems();

                if (storedItems.length === 0) {
                    setLoading(false);
                    return;
                }

                // Convert stored items to checkout format by loading product details
                const productIds = storedItems.map(item => item.productId);

                const { data: products } = await supabase
                    .from('products')
                    .select('*, product_media(file_url)')
                    .in('id', productIds);

                if (!products) {
                    setLoading(false);
                    return;
                }

                // Map stored items to cart items with full product data
                const items: CartItem[] = storedItems.map(stored => {
                    const product = products.find(p => p.id === stored.productId);
                    if (!product) return null;

                    // Ghost product safety check
                    const name = (product.name || '').toLowerCase().trim();
                    const hasNoMedia = !product.product_media?.length && !product.image && (!product.images || product.images.length === 0);
                    const isDraftName = !name || name === 'new product' || name === 'demo' || name === 'test' || name === 'demo product' || name.includes('demo');
                    
                    if (isDraftName && Number(product.price) <= 0 && hasNoMedia) {
                        return null;
                    }

                    const images = product.product_media?.map((m: any) => m.file_url) || [];

                    return {
                        product: {
                            ...product,
                            image: images[0] || stored.image || '',
                            images,
                            rating: product.rating || 4.5,
                            reviews: product.reviews || 0,
                            sizes: ['Standard'],
                        } as Product,
                        size: stored.size,
                        quantity: stored.quantity,
                    };
                }).filter((item): item is CartItem => item !== null);

                setCartItems(items);
            } catch (error) {
                console.error('Error loading checkout data:', error);
            } finally {
                setLoading(false);
            }
        };

        loadCheckoutData();
    }, []);

    const showToast = (message: string) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message }]);
    };

    const removeToast = (id: number) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    const handlePlaceOrder = async (orderedItems: CartItem[], address: any, paymentMethod: string, promotionId?: string, discountAmount?: number): Promise<boolean> => {
        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user || !seller) {
                showToast('Error placing order. Please try again.');
                return false;
            }

            // Verify store membership
            const isMember = await checkStoreMembership(seller.id);
            if (!isMember) {
                // Try to auto-join or error
                const { success } = await joinStore(seller.id);
                if (!success) {
                    showToast('You must join this store to place an order.');
                    // Redirect to store
                    setTimeout(() => navigate(`/store/${seller.slug}`), 2000);
                    return false;
                }
            }

            // Calculate total
            const subtotal = orderedItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
            const discountedSubtotal = Math.max(0, subtotal - (discountAmount || 0));
            const shippingCost = (discountedSubtotal >= 2500) ? 0 : 199; // Simple logic mirroring checkout for now
            const tax = discountedSubtotal * 0.12;
            const total = discountedSubtotal + shippingCost + tax;

            // Create order in Supabase
            const { data: order, error } = await supabase
                .from('orders')
                .insert({
                    seller_id: seller.id,
                    customer_id: user.id,
                    total,
                    status: 'pending',
                    shipping_address: {
                        ...address,
                        email: user.email // Ensure email is captured from Auth
                    },
                    payment_method: paymentMethod,
                    promotion_id: promotionId,
                    discount_amount: discountAmount || 0,
                    items: orderedItems.map(item => ({
                        product_id: item.product.id,
                        name: item.product.name,
                        price: item.product.price,
                        size: item.size,
                        quantity: item.quantity,
                        image: item.product.image,
                    })),
                })
                .select()
                .single();

            if (error) {
                console.error('Order error details:', error);
                alert(`Supabase Error: ${error.message} (Code: ${error.code})`);
                showToast(`Failed to place order: ${error.message}`);
                return false;
            }

            // Events Tracking
            if (order) {
                Events.orderCreated({
                    order_id: order.id,
                    buyer_id: user.id,
                    vendor_id: seller.id,
                    order_value: total,
                    items_count: orderedItems.reduce((sum, item) => sum + item.quantity, 0)
                });
            }

            // Record Promo Usage
            if (promotionId && order) {
                const customerEmail = user.email || 'guest@example.com';
                try {
                    await supabase.from('promotion_usages').insert({
                        promotion_id: promotionId,
                        order_id: order.id,
                        customer_email: customerEmail
                    });
                    await supabase.rpc('increment_promotion_uses', { promo_id: promotionId });
                } catch (err) {
                    console.error("Failed to record promo usage:", err);
                }
            }

            // Clear cart
            clearCartStorage();
            setCartItems([]);

            showToast('Order placed successfully!');
            return true;
        } catch (error: any) {
            console.error('Error placing order:', error);
            // Show detailed error to user for debugging
            alert(`Order Failed: ${error.message || JSON.stringify(error)}`);
            showToast(`Error: ${error.message}`);
            return false;
        }
    };


    const handleNavigateCart = () => {
        // Go back to the seller's store cart
        if (seller) {
            navigate(`/${seller.slug}`);
        } else {
            navigate('/');
        }
    };

    const handleNavigateHome = () => {
        if (seller) {
            navigate(`/${seller.slug}`);
        } else {
            navigate('/');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-white dark:bg-neutral-950 flex flex-col items-center justify-center p-4">
                <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
                <p className="text-neutral-500">Loading checkout...</p>
            </div>
        );
    }

    if (cartItems.length === 0) {
        return (
            <div className="min-h-screen bg-white dark:bg-neutral-950 flex flex-col items-center justify-center p-4">
                <ShoppingBag className="w-16 h-16 text-neutral-400 mb-4" />
                <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">
                    Your cart is empty
                </h1>
                <p className="text-neutral-500 mb-6">
                    Add some items to your cart before checking out.
                </p>
                <button
                    onClick={() => navigate('/')}
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors"
                >
                    <ArrowLeft size={18} />
                    Continue Shopping
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white dark:bg-neutral-950">
            <Checkout
                items={cartItems}
                onPlaceOrder={handlePlaceOrder}
                onNavigateCart={handleNavigateCart}
                onNavigateHome={handleNavigateHome}
            />
            <ToastContainer toasts={toasts} removeToast={removeToast} />
        </div>
    );
};

export default CheckoutPage;
