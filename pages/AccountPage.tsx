import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Account } from '../components/Account';
import { Navbar } from '../components/Navbar';
import { TopBar } from '../components/TopBar';
import { Footer } from '../components/Footer';
import { BottomNav } from '../components/BottomNav';
import { ToastContainer } from '../components/Toast';
import { supabase } from '../lib/supabase';

const AccountPage: React.FC = () => {
    const navigate = useNavigate();
    const [toasts, setToasts] = useState<{ id: number; message: string }[]>([]);

    useEffect(() => {
        // Verify auth (guard should handle, but failsafe)
        const checkAuth = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                navigate(`/?redirect=${encodeURIComponent(window.location.pathname)}`, { replace: true });
            }
        };
        checkAuth();
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
        else if (view === 'wishlist') navigate('/');
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        showToast('Signed out successfully');
        setTimeout(() => navigate('/'), 1000);
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
                branding={{ storeName: 'rajdeep' }}
                products={[]}
                onProductSelect={() => { }}
            />

            <main className="flex-grow">
                <Account
                    onNavigate={handleNavigate}
                    showToast={showToast}
                    onLogout={handleLogout}
                />
            </main>

            <Footer
                onLinkClick={() => { }}
                branding={{ storeName: 'rajdeep' }}
            />

            <BottomNav
                onNavigate={handleNavigate}
                cartCount={cartCount}
            />

            <ToastContainer toasts={toasts} removeToast={removeToast} />
        </div>
    );
};

export default AccountPage;
