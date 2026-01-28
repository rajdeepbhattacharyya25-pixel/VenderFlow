import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ShieldX, Home } from 'lucide-react';

const AdminGuard: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const location = useLocation();

    useEffect(() => {
        const checkAdmin = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();

                if (!user) {
                    setIsAuthenticated(false);
                    setIsAdmin(false);
                    setLoading(false);
                    return;
                }

                setIsAuthenticated(true);

                const { data: profile, error } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single();

                if (error || !profile || profile.role !== 'admin') {
                    setIsAdmin(false);
                } else {
                    setIsAdmin(true);
                }
            } catch (error) {
                console.error('Error checking admin role:', error);
                setIsAuthenticated(false);
                setIsAdmin(false);
            } finally {
                setLoading(false);
            }
        };

        checkAdmin();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    // Not logged in - redirect to homepage with login modal trigger
    if (!isAuthenticated) {
        return <Navigate to={`/?redirect=${encodeURIComponent(location.pathname + location.search)}&mode=seller`} replace />;
    }

    // Logged in but NOT admin - show Access Denied (don't redirect to prevent loop)
    if (!isAdmin) {
        return (
            <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
                <div className="text-center max-w-md">
                    <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <ShieldX className="w-10 h-10 text-red-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-3">Access Denied</h1>
                    <p className="text-neutral-400 mb-6">
                        You don't have permission to access the admin dashboard.
                        This area is restricted to administrators only.
                    </p>
                    <Link
                        to="/"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors"
                    >
                        <Home size={18} />
                        Return to Homepage
                    </Link>

                    <button
                        onClick={async () => {
                            await supabase.auth.signOut();
                            window.location.href = '/?redirect=/admin&mode=seller';
                        }}
                        className="mt-4 w-full inline-flex items-center justify-center gap-2 px-6 py-3 border border-neutral-800 hover:bg-neutral-900 text-neutral-400 hover:text-white rounded-xl font-medium transition-colors"
                    >
                        <ShieldX size={18} />
                        Wrong Account? Sign in as Admin
                    </button>
                </div>
            </div>
        );
    }

    return <Outlet />;
};

export default AdminGuard;
