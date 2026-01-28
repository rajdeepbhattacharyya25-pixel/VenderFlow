import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Seller } from '../../lib/seller';

import DashboardLogin from './DashboardLogin';

const SellerGuard: React.FC = () => {
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const location = useLocation();

    useEffect(() => {
        const checkSellerAuth = async () => {
            try {
                // 1. Check basic auth
                const { data: { user } } = await supabase.auth.getUser();

                if (!user) {
                    setIsAuthorized(false);
                    setIsLoading(false);
                    return;
                }

                // 2. Check if user is a seller or admin
                // First check if they are an admin
                const { data: adminData } = await supabase.rpc('is_admin');

                if (adminData) {
                    setIsAuthorized(true);
                    setIsLoading(false);
                    return;
                }

                // Check if they have a seller profile
                const { data: sellerData, error } = await supabase
                    .from('sellers')
                    .select('id, status')
                    .eq('id', user.id)
                    .single();

                if (sellerData && (sellerData.status === 'active' || sellerData.status === 'pending')) {
                    setIsAuthorized(true);
                } else {
                    console.warn('User is authenticated but not a valid seller');
                    setIsAuthorized(false);
                }
            } catch (error) {
                console.error('Seller guard check failed:', error);
                setIsAuthorized(false);
            } finally {
                setIsLoading(false);
            }
        };

        checkSellerAuth();
    }, []);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-white dark:bg-neutral-950 flex flex-col items-center justify-center p-4">
                <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
                <p className="text-neutral-500">Verifying access...</p>
            </div>
        );
    }

    if (!isAuthorized) {
        // Render the Login UI directly at /dashboard URL instead of redirecting
        return <DashboardLogin />;
    }

    return <Outlet />;
};

export default SellerGuard;
