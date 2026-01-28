import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Product } from '../types';
import { Cart } from '../components/Cart';
import { Navbar } from '../components/Navbar';
import { TopBar } from '../components/TopBar';
import { Footer } from '../components/Footer';
import { BottomNav } from '../components/BottomNav';
import { ToastContainer } from '../components/Toast';
import { supabase } from '../lib/supabase';

// Cart state will be managed via localStorage for persistence
const CART_STORAGE_KEY = 'rajdeep_cart';

interface CartItem {
    product: Product;
    size: string;
    quantity: number;
}

const CartPage: React.FC = () => {
    const navigate = useNavigate();
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [wishlistProducts] = useState<Product[]>([]);
    const [toasts, setToasts] = useState<{ id: number; message: string }[]>([]);
    const [user, setUser] = useState<any>(null);

    // Load cart from localStorage
    useEffect(() => {
        const savedCart = localStorage.getItem(CART_STORAGE_KEY);
        if (savedCart) {
            try {
                setCartItems(JSON.parse(savedCart));
            } catch (e) {
                console.error('Error loading cart:', e);
            }
        }

        // Check auth
        supabase.auth.getUser().then(({ data: { user } }) => {
            setUser(user);
        });
    }, []);

    // Save cart to localStorage
    useEffect(() => {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
    }, [cartItems]);

    const showToast = (message: string) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message }]);
    };

    const removeToast = (id: number) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    const handleRemove = (productId: string, size: string) => {
        setCartItems(prev => prev.filter(item =>
            !(String(item.product.id) === productId && item.size === size)
        ));
        showToast('Item removed from cart');
    };

    const handleUpdateQuantity = (productId: string, size: string, delta: number) => {
        setCartItems(prev => prev.map(item => {
            if (String(item.product.id) === productId && item.size === size) {
                return { ...item, quantity: Math.max(1, item.quantity + delta) };
            }
            return item;
        }));
    };

    const handleMoveToWishlist = (product: Product, size: string) => {
        handleRemove(String(product.id), size);
        showToast('Moved to wishlist');
    };

    const handleAddToCart = (product: Product) => {
        setCartItems(prev => {
            const existing = prev.find(item =>
                item.product.id === product.id && item.size === 'Standard'
            );
            if (existing) {
                return prev.map(item =>
                    item.product.id === product.id && item.size === 'Standard'
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            return [...prev, { product, size: 'Standard', quantity: 1 }];
        });
        showToast(`Added ${product.name} to cart`);
    };

    const handleCheckout = (selectedItems: CartItem[]) => {
        // Store selected items for checkout
        sessionStorage.setItem('checkout_items', JSON.stringify(selectedItems));

        // Navigate to checkout (auth guard will handle redirect if not logged in)
        navigate('/checkout');
    };

    const handleNavigateHome = () => navigate('/');
    const handleNavigateWishlist = () => navigate('/');

    return (
        <div className="min-h-screen flex flex-col font-body pb-[80px] md:pb-0 bg-white dark:bg-gray-900 transition-colors duration-300">
            <TopBar />
            <Navbar
                onNavigate={(view) => {
                    if (view === 'home') navigate('/');
                    else if (view === 'cart') navigate('/cart');
                    else if (view === 'orders') navigate('/orders');
                    else if (view === 'account') navigate('/account');
                }}
                onCategoryClick={() => navigate('/')}
                categories={[]}
                wishlistCount={0}
                cartCount={cartItems.reduce((sum, item) => sum + item.quantity, 0)}
                isDarkMode={document.documentElement.classList.contains('dark')}
                toggleDarkMode={() => document.documentElement.classList.toggle('dark')}
                branding={{ storeName: 'rajdeep' }}
                products={[]}
                onProductSelect={() => { }}
            />

            <main className="flex-grow">
                <Cart
                    items={cartItems}
                    wishlistProducts={wishlistProducts}
                    onRemove={handleRemove}
                    onUpdateQuantity={handleUpdateQuantity}
                    onNavigateHome={handleNavigateHome}
                    onNavigateWishlist={handleNavigateWishlist}
                    onMoveToWishlist={handleMoveToWishlist}
                    onAddToCart={handleAddToCart}
                    onCheckout={handleCheckout}
                />
            </main>

            <Footer
                onLinkClick={() => { }}
                branding={{ storeName: 'rajdeep' }}
            />

            <BottomNav
                onNavigate={(view) => {
                    if (view === 'home') navigate('/');
                    else if (view === 'cart') navigate('/cart');
                }}
                cartCount={cartItems.reduce((sum, item) => sum + item.quantity, 0)}
            />

            <ToastContainer toasts={toasts} removeToast={removeToast} />
        </div>
    );
};

export default CartPage;
