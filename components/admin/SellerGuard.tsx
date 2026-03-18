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
    const [debugLogs, setDebugLogs] = useState<string[]>([]);
    const [retryCount, setRetryCount] = useState(0);
    
    const addLog = (msg: string) => {
        console.log(`[SellerGuard] ${msg}`);
        setDebugLogs(prev => [...prev.slice(-4), `${new Date().toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit' })} ${msg}`]);
    };

    const handleRetry = () => {
        setIsLoading(true);
        setIsAuthorized(null);
        setRetryCount(prev => prev + 1);
    };

    useEffect(() => {
        let isMounted = true;

        const withTimeout = <T,>(promise: PromiseLike<T> | Promise<T>, ms: number, label: string): Promise<T> => {
            return Promise.race([
                Promise.resolve(promise),
                new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Timeout: ${label}`)), ms))
            ]);
        };

        const checkSellerAuth = async () => {
            try {
                // 1. Check user - Use getUser() for guaranteed server check
                addLog('Verifying user session...');
                const { data: { user }, error: userError } = await withTimeout(
                    supabase.auth.getUser(),
                    15000,
                    'getUser'
                );
                
                if (!isMounted) return;

                if (userError || !user) {
                    addLog(userError ? `Auth Error: ${userError.message}` : 'No active session');
                    setIsAuthorized(false);
                    return;
                }

                addLog(`User: ${user.email}`);

                // 2. Check Role
                const profileResponse = await withTimeout(
                    supabase.from('profiles').select('role').eq('id', user.id).maybeSingle(),
                    15000,
                    'profiles role'
                ) as any;

                if (!isMounted) return;

                const role = profileResponse.data?.role;
                addLog(`Role: ${role || 'none'}`);

                if (role === 'admin') {
                    addLog('Admin access');
                    setIsAuthorized(true);
                    return;
                }

                // 3. Check Seller Status
                const sellerResponse = await withTimeout(
                    supabase.from('sellers').select('id, status').eq('id', user.id).maybeSingle(),
                    15000,
                    'sellers status'
                ) as any;

                if (!isMounted) return;

                const sellerData = sellerResponse.data;
                addLog(`Status: ${sellerData?.status || 'missing'}`);

                if (sellerData && (sellerData.status === 'active' || sellerData.status === 'pending' || sellerData.status === 'onboarding')) {
                    addLog('Access granted (Owner)');
                    setIsAuthorized(true);
                    return;
                }

                // 4. Check Staff Status
                addLog('Checking staff membership...');
                const staffResponse = await withTimeout(
                    supabase.from('store_staff').select('id, store_id, role, permissions').eq('user_id', user.id).maybeSingle(),
                    15000,
                    'store_staff'
                ) as any;

                if (!isMounted) return;

                const staffData = staffResponse.data;
                if (staffData) {
                    addLog(`Staff Access: ${staffData.role}`);
                    // Store staff info in local storage for sidebar pruning if needed, 
                    // or ideally use a Context provider. For now, localStorage is a quick fix.
                    localStorage.setItem('staff_context', JSON.stringify(staffData));
                    setIsAuthorized(true);
                } else {
                    addLog('Access denied (Not a seller or staff)');
                    setIsAuthorized(false);
                }
            } catch (error: any) {
                const isAbortError = error?.name === 'AbortError' || 
                                   error?.message?.toLowerCase().includes('abort') ||
                                   error?.message?.toLowerCase().includes('canceled');

                if (!isMounted || isAbortError) {
                    if (isAbortError) console.debug('SellerGuard check aborted');
                    return;
                }

                addLog(`Err: ${error.message || 'Unknown'}`);
                console.error('SellerGuard error:', error);
                setIsAuthorized(false);
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        checkSellerAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (isMounted && (event === 'SIGNED_IN' || event === 'SIGNED_OUT')) {
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
                <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
                <p className="text-neutral-500">Verifying security setup...</p>
                <div className="mt-8 text-[10px] font-mono text-gray-500 space-y-1">
                    {debugLogs.map((log, i) => <div key={i}>{log}</div>)}
                </div>
            </div>
        );
    }

    if (!isAuthorized) {
        return (
            <div className="relative">
                <DashboardLogin />
                <div className="fixed bottom-4 left-4 z-[9999] bg-black/95 text-[10px] text-green-400 p-3 rounded-lg border border-green-500/30 font-mono max-w-[280px] shadow-2xl backdrop-blur-md">
                    <div className="flex justify-between items-center border-b border-green-900 mb-2 pb-1">
                        <span className="font-bold">Access Debug Panel</span>
                        <button 
                            onClick={handleRetry}
                            className="bg-green-500/10 hover:bg-green-500/20 text-green-400 px-2 py-0.5 rounded border border-green-500/20 transition-colors pointer-events-auto"
                        >
                            Retry Auth
                        </button>
                    </div>
                    <div className="space-y-1">
                        {debugLogs.length === 0 ? <div className="animate-pulse">Waiting for logs...</div> : debugLogs.map((log, i) => (
                            <div key={i} className="truncate select-text opacity-90">{log}</div>
                        ))}
                    </div>
                    <div className={`mt-2 pt-2 border-t border-green-900/50 flex justify-between items-center font-bold ${isAuthorized ? 'text-green-500' : 'text-red-400'}`}>
                        <span>Final Result:</span>
                        <span>{isAuthorized ? 'Authorized' : 'Denied'}</span>
                    </div>
                </div>
            </div>
        );
    }

    return <Outlet />;
};

export default SellerGuard;
