import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Loader2 } from 'lucide-react';
import { TwoFactorVerify } from '../TwoFactorVerify';
import { TwoFactorSetup } from '../TwoFactorSetup';
import DashboardLogin from './DashboardLogin';

const AdminGuard: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [needsMFA, setNeedsMFA] = useState(false);
    const [needsMFASetup, setNeedsMFASetup] = useState(false);
    const [retryCount, setRetryCount] = useState(0);

    useEffect(() => {
        const checkAdmin = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const user = session?.user;

                if (!user) {
                    setIsAuthenticated(false);
                    return;
                }

                setIsAuthenticated(true);

                // 1. Check Admin Role
                const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();

                if (!profile || profile.role !== 'admin') {
                    setIsAdmin(false);
                    return;
                }

                setIsAdmin(true);

                // 2. Check 2FA Enforcement
                const { data: settings } = await supabase.from('platform_settings').select('enforce_2fa').single();
                const is2FAEnforced = settings?.enforce_2fa === true;

                if (is2FAEnforced) {
                    const { data: factors } = await supabase.auth.mfa.listFactors();
                    const hasVerifiedFactor = factors?.totp?.some((factor) => factor.status === 'verified');

                    if (!hasVerifiedFactor) {
                        setNeedsMFASetup(true);
                        return;
                    }

                    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
                    if (aal?.currentLevel !== 'aal2') {
                        setNeedsMFA(true);
                        return;
                    }
                }

            } catch (error: any) {
                console.error('Error checking admin role:', error);
                setIsAuthenticated(false);
                setIsAdmin(false);
            } finally {
                setLoading(false);
            }
        };

        checkAdmin();
    }, [retryCount]);

    if (loading) {
        return (
            <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
                <Loader2 className="animate-spin h-12 w-12 text-emerald-500" />
            </div>
        );
    }

    if (!isAuthenticated) {
        return <DashboardLogin />;
    }

    if (needsMFA) {
        return <TwoFactorVerify onVerify={() => setRetryCount(r => r + 1)} onCancel={() => supabase.auth.signOut()} />;
    }

    if (needsMFASetup) {
        return <TwoFactorSetup onClose={() => supabase.auth.signOut()} onComplete={() => setRetryCount(r => r + 1)} />;
    }

    if (!isAdmin) {
        return (
            <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4 text-center">
                <div>
                    <h1 className="text-2xl font-bold text-white mb-3">Access Denied</h1>
                    <p className="text-neutral-400">This area is restricted to administrators only.</p>
                </div>
            </div>
        );
    }

    return <Outlet />;
};

export default AdminGuard;
