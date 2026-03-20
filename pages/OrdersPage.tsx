import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Orders } from '../components/Orders';
import { Navbar } from '../components/Navbar';
import { TopBar } from '../components/TopBar';
import { Footer } from '../components/Footer';
import { BottomNav } from '../components/BottomNav';
import { ToastContainer } from '../components/Toast';
import { supabase } from '../lib/supabase';
import { getCustomerOrders } from '../lib/orders';
import { Product } from '../types';

const OrdersPage: React.FC = () => {
    const navigate = useNavigate();
    const [toasts, setToasts] = useState<{ id: number; message: string }[]>([]);
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                const { data: { user: authUser } } = await supabase.auth.getUser();

                if (!authUser) {
                    if (!localStorage.getItem('user')) {
                        const currentPath = window.location.pathname;
                        navigate(`/?redirect=${encodeURIComponent(currentPath)}`, { replace: true });
                        return;
                    }
                } else {
                    setUser(authUser);
                }

                const customerOrders = await getCustomerOrders();
                setOrders(customerOrders);
            } catch (error) {
                console.error('Error loading data:', error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [navigate]);

    const showToast = (message: string) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message }]);
    };

    const removeToast = (id: number) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    const handleNavigate = (view: string) => {
        if (view === 'home') navigate('/');
        else if (view === 'cart') navigate('/cart');
        else if (view === 'orders') navigate('/orders');
        else if (view === 'account') navigate('/account');
    };

    const handleAddToCart = (product: Product, size?: string) => {
        const cart = JSON.parse(localStorage.getItem('rajdeep_cart') || '[]');
        const existing = cart.find((item: any) =>
            item.product.id === product.id && item.size === (size || 'Standard')
        );

        if (existing) {
            existing.quantity += 1;
        } else {
            cart.push({ product, size: size || 'Standard', quantity: 1 });
        }

        localStorage.setItem('rajdeep_cart', JSON.stringify(cart));
        showToast(`Added ${product.name} to cart`);
    };

    const cartCount = JSON.parse(localStorage.getItem('rajdeep_cart') || '[]')
        .reduce((sum: number, item: any) => sum + item.quantity, 0);

    return (
        <div className="min-h-screen flex flex-col font-body pb-[80px] md:pb-0 bg-white dark:bg-gray-900 transition-colors duration-300">
            <TopBar />
            <Navbar
                onNavigate={handleNavigate}
                onCategoryClick={() => navigate('/')}
                categories={[]}
                wishlistCount={0}
                cartCount={cartCount}
                isDarkMode={document.documentElement.classList.contains('dark')}
                toggleDarkMode={() => document.documentElement.classList.toggle('dark')}
                storeName="rajdeep"
                onSearch={() => {}}
                products={[]}
                onProductSelect={() => { }}
            />

            <main className="flex-grow">
                {loading ? (
                    <div className="flex items-center justify-center min-h-[60vh]">
                        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <Orders
                        onNavigate={handleNavigate}
                        onAddToCart={handleAddToCart}
                        showToast={showToast}
                        sellerId=""
                        storeCustomer={user}
                    />
                )}
            </main>

            <Footer
                onLinkClick={() => { }}
                branding={{ storeName: 'rajdeep', description: '' }}
            />

            <BottomNav
                onNavigate={handleNavigate}
                cartCount={cartCount}
            />

            <ToastContainer toasts={toasts} removeToast={removeToast} />
        </div>
    );
};

export default OrdersPage;
