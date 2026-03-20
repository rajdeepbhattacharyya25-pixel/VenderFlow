import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2 } from 'lucide-react';

const CustomerAuthGuard: React.FC = () => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
    const location = useLocation();

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const { data } = await supabase.auth.getSession();
                setIsAuthenticated(!!data.session?.user);
            } catch (error) {
                console.error('Auth check failed:', error);
                setIsAuthenticated(false);
            }
        };

        checkAuth();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                setIsAuthenticated(!!session?.user);
            }
        );

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    // Loading state
    if (isAuthenticated === null) {
        return (
            <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col items-center justify-center p-4">
                <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mb-4" />
                <p className="text-gray-500 dark:text-gray-400">Checking authentication...</p>
            </div>
        );
    }

    // Not authenticated - redirect to login with return path
    if (!isAuthenticated) {
        const redirectPath = encodeURIComponent(location.pathname + location.search);
        return <Navigate to={`/?redirect=${redirectPath}`} replace />;
    }

    // Authenticated - render child routes
    return <Outlet />;
};

export default CustomerAuthGuard;
