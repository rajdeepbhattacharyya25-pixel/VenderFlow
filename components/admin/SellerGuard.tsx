import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Loader2 } from 'lucide-react';

import DashboardLogin from './DashboardLogin';
import { TwoFactorVerify } from '../TwoFactorVerify';
import { TwoFactorSetup } from '../TwoFactorSetup';

const SellerGuard: React.FC = () => {
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [needsMFA, setNeedsMFA] = useState<boolean>(false);
    const [needsMFASetup, setNeedsMFASetup] = useState<boolean>(false);
    
    const [debugLogs, setDebugLogs] = useState<string[]>([]);
    const [retryCount, setRetryCount] = useState(0);
    
    const addLog = (msg: string) => {
        console.log(`[SellerGuard] ${msg}`);
        setDebugLogs(prev => [...prev.slice(-4), `${new Date().toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit' })} ${msg}`]);
    };

    const handleRetry = () => {
        setIsLoading(true);
        setIsAuthorized(null);
        setNeedsMFA(false);
        setNeedsMFASetup(false);
        setRetryCount(prev => prev + 1);
    };

    useEffect(() => {
        let isMounted = true;

        const checkSellerAuth = async () => {
            try {
                // 1. Check user
                addLog('Verifying user session...');
                const { data: { user } } = await supabase.auth.getUser();
                
                if (!isMounted) return;
                if (!user) {
                    addLog('No active session');
                    setIsAuthorized(false);
                    return;
                }

                // 2. Check MFA Status (AAL)
                const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
                const currentAAL = aalData?.currentLevel || 'aal1';
                addLog(`AAL: ${currentAAL}`);

                // 3. Check Role
                const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
                const role = profile?.role;

                if (role === 'admin') {
                    addLog('Admin authenticated');
                    setIsAuthorized(true);
                    return;
                }

                // 4. Check Seller/Store Enforcement
                const { data: storeSettings } = await supabase.from('store_settings').select('enforce_2fa').eq('seller_id', user.id).maybeSingle();
                const is2FAEnforced = storeSettings?.enforce_2fa === true;

                if (is2FAEnforced) {
                    const { data: factors } = await supabase.auth.mfa.listFactors();
                    const hasVerifiedFactor = factors?.totp?.some(f => f.status === 'verified');

                    if (!hasVerifiedFactor) {
                        addLog('MFA Enforced: Setup Required');
                        setNeedsMFASetup(true);
                        return;
                    }

                    if (currentAAL !== 'aal2') {
                        addLog('MFA Enforced: Level 1 -> 2 Needed');
                        setNeedsMFA(true);
                        return;
                    }
                }

                // 5. Normal Seller Check
                const { data: sellerData } = await supabase.from('sellers').select('id, status').eq('id', user.id).maybeSingle();
                if (sellerData && ['active', 'pending', 'onboarding'].includes(sellerData.status)) {
                    setIsAuthorized(true);
                    return;
                }

                // 6. Staff Check
                const { data: staffData } = await supabase.from('store_staff').select('id, store_id, role').eq('user_id', user.id).maybeSingle();
                if (staffData) {
                    localStorage.setItem('staff_context', JSON.stringify(staffData));
                    setIsAuthorized(true);
                } else {
                    setIsAuthorized(false);
                }
            } catch (error: any) {
                addLog(`Err: ${error.message || 'Unknown'}`);
                setIsAuthorized(false);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        checkSellerAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (isMounted && (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'MFA_CHALLENGE_VERIFIED')) {
                addLog(`Auth event: ${event}`);
                checkSellerAuth();
            }
        });

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, [retryCount]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-white dark:bg-neutral-950 flex flex-col items-center justify-center p-4">
                <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mb-4" />
                <p className="text-neutral-500">Verifying security setup...</p>
                <div className="mt-8 text-[10px] font-mono text-gray-500 space-y-1 text-center">
                    {debugLogs.map((log, i) => <div key={i}>{log}</div>)}
                </div>
            </div>
        );
    }

    if (needsMFA) {
        return <TwoFactorVerify onVerify={handleRetry} onCancel={() => supabase.auth.signOut()} />;
    }

    if (needsMFASetup) {
        return <TwoFactorSetup onClose={() => supabase.auth.signOut()} onComplete={handleRetry} />;
    }

    if (!isAuthorized) {
        return <DashboardLogin />;
    }

    return <Outlet />;
};

export default SellerGuard;
