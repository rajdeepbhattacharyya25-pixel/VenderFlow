import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
    redirectTo?: string;
}

/**
 * Generic authentication guard for protected routes.
 * Redirects unauthenticated users to login with a redirect parameter.
 */
const AuthGuard: React.FC<AuthGuardProps> = ({ redirectTo = '/' }) => {
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const location = useLocation();

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                setIsAuthenticated(!!user);
            } catch (error) {
                console.error('Error checking auth:', error);
                setIsAuthenticated(false);
            } finally {
                setLoading(false);
            }
        };

        checkAuth();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-white dark:bg-neutral-950 flex flex-col items-center justify-center p-4">
                <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
                <p className="text-neutral-500">Checking authentication...</p>
            </div>
        );
    }

    if (!isAuthenticated) {
        // Encode the current path as a redirect parameter
        const redirectParam = encodeURIComponent(location.pathname + location.search);
        return <Navigate to={`${redirectTo}?redirect=${redirectParam}`} replace />;
    }

    return <Outlet />;
};

export default AuthGuard;
