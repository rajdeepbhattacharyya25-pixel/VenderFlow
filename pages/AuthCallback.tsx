import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, secureInvoke } from '../lib/supabase';
import { adminDb } from '../lib/admin-api';

import { Loader2 } from 'lucide-react';

// Helper: race a promise against a timeout
function withTimeout<T>(promise: Promise<T>, ms: number, label = 'Operation'): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
        ),
    ]);
}

const AuthCallback = () => {
    const navigate = useNavigate();
    const [status, setStatus] = useState('Logging you in...');
    const [debugLog, setDebugLog] = useState<string[]>([]);
    const redirectScheduledRef = React.useRef(false);

    const addLog = (msg: string) => {
        console.log(msg);
        setDebugLog(prev => [...prev, msg]);
    };

    const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        // Diagnostic Logging
        const origin = window.location.origin;
        addLog(`Environment: ${origin}`);
        addLog(`Protocol: ${window.location.protocol}`);
        
        // `processed` is local to this effect run. In React StrictMode the effect
        // runs twice (mount → cleanup → remount). Using a closure-local flag instead
        // of a ref guard ensures onAuthStateChange is always subscribed on the
        // final mount, while still preventing the callback from processing twice.
        let processed = false;

        // Global safety timeout — never stay stuck for more than 45s
        const safetyTimeout = setTimeout(() => {
            console.warn('AuthCallback: global safety timeout reached (45s). Redirecting...');
            addLog('Global safety timeout reached. Redirecting to dashboard...');
            navigate('/dashboard', { replace: true });
        }, 45000);

        // Check for error in URL hash immediately
        if (window.location.hash && window.location.hash.includes('error=')) {
            clearTimeout(safetyTimeout);
            const params = new URLSearchParams(window.location.hash.substring(1));
            const errorDescription = params.get('error_description') || 'Authentication failed';
            alert(`Auth Link Error: ${errorDescription}`);
            navigate('/', { replace: true });
            return;
        }

        // Parse URL for debug info only — do NOT manually call setSession.
        // Supabase JS client automatically parses the access_token from the URL hash
        // when onAuthStateChange is set up. A manual setSession call races against this
        // and causes timeouts. Let the SDK handle it.
        const hash = window.location.hash;
        if (hash && (hash.includes('access_token=') || hash.includes('refresh_token='))) {
            addLog(`OAuth hash detected (length: ${hash.length}). Waiting for Supabase SDK...`);
        } else if (hash) {
            addLog(`URL Hash found (length: ${hash.length}), no OAuth tokens.`);
        } else {
            addLog('No URL hash. Checking existing session...');
        }

        addLog('Listening for auth state change...');

        // Listen for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            void (async () => {
                addLog(`Auth Event: ${event}`);

                // Clear any pending timeout if we get a session
                if (session?.user && timeoutRef.current) {
                    clearTimeout(timeoutRef.current);
                    timeoutRef.current = null;
                }

                if (event === 'INITIAL_SESSION' && !session) {
                    addLog('No session yet in INITIAL_SESSION — checking for hash backup...');
                    
                    // Check if we actually have tokens in the URL. If we do, we should wait much longer
                    // because the SDK is clearly supposed to parse them.
                    const hasTokens = window.location.hash.includes('access_token=');
                    const waitTime = hasTokens ? 12000 : 5000;
                    
                    addLog(`Starting ${waitTime}ms safety wait (Tokens present: ${hasTokens})...`);
                    
                    timeoutRef.current = setTimeout(async () => {
                        if (redirectScheduledRef.current) return;

                        addLog('Safety wait finished. Checking getSession secondary source...');
                        const { data } = await supabase.auth.getSession();
                        if (!data.session) {
                            addLog(`Session still not found after ${waitTime}ms — directing to login.`);
                            redirectScheduledRef.current = true;
                            import('react-hot-toast').then(({ toast }) => {
                                toast.error('Login timed out. Please check that cookies and local storage are enabled.', {
                                    duration: 10000,
                                });
                            });
                            navigate('/', { replace: true });
                        } else {
                            addLog(`Session recovered via secondary check: ${data.session.user.email}`);
                            // We don't need to do anything else; the SIGNED_IN event will likely 
                            // fire or we've already handled the state change logic.
                        }
                    }, waitTime);
                }

                if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
                    // Prevent processing twice in React StrictMode
                    if (processed) return;
                    processed = true;

                    try {
                        setStatus('Verifying your account...');
                        addLog(`Event ${event} received. Settling session...`);

                        // Robust session settling to avoid 401 Unauthorized errors.
                        // Sometimes the auth event fires before the internal client headers are updated.
                        const settleSession = async (retries = 4): Promise<import('@supabase/supabase-js').User> => {
                            // Initial small delay to let the event loop finish propagating the session
                            await new Promise(r => setTimeout(r, 200));
                            
                            for (let i = 0; i < retries; i++) {
                                try {
                                    addLog(`Verifying session (Attempt ${i + 1}/${retries})...`);
                                    const { data: { user }, error } = await supabase.auth.getUser();
                                    
                                    if (user && !error) {
                                        // Final check: ensures the session is also readable via getSession
                                        const { data: { session: currentSession } } = await supabase.auth.getSession();
                                        if (currentSession) return user;
                                    }
                                    
                                    if (error) addLog(`Verification error: ${error.message}`);
                                } catch (e) {
                                    addLog(`Verification catch: ${e instanceof Error ? e.message : 'Unknown'}`);
                                }

                                if (i < retries - 1) {
                                    const delay = 500 * (i + 1);
                                    addLog(`Retrying in ${delay}ms...`);
                                    await new Promise(r => setTimeout(r, delay));
                                }
                            }
                            throw new Error("Could not verify session. Please try logging in again.");
                        };

                        const user = await withTimeout(settleSession(), 10000, 'Session verification');
                        addLog(`User fully verified: ${user.email}`);
                        setStatus('Synchronizing profile...');

                        // Fetch user profile to check role
                        addLog('Fetching profile...');
                        const { data: profile, error: profileError } = await supabase
                            .from('profiles')
                            .select('id, role')
                            .eq('id', user.id)
                            .maybeSingle();


                        if (profileError && profileError.code !== 'PGRST116') {
                            console.error("Profile Fetch Error:", profileError);
                        }

                        // Self-healing: Create profile if missing
                        let currentProfile = profile;
                        if (currentProfile) {
                            addLog(`Profile found: ${currentProfile.role}`);
                        } else {
                            addLog("Profile not found. Attempting to create one...");
                            try {
                                const { data: newProfile, error: createError } = await supabase
                                    .from('profiles')
                                    .insert({
                                        id: user.id,
                                        email: user.email,
                                        role: 'seller' // Default role
                                    })
                                    .select()
                                    .single();

                                if (createError) throw createError;

                                currentProfile = newProfile;
                                addLog("Profile created successfully");
                            } catch (err: unknown) {
                                console.error("Failed to create profile:", err);
                                setStatus('Account setup failed. Please contact support.');
                                const errorMsg = err instanceof Error ? err.message : 'Unknown error';
                                addLog(`Error creating profile: ${errorMsg}`);
                                // Don't redirect immediately so user sees the error
                                return;
                            }
                        }

                        // Parallelize background tasks (Store check/creation, Session logging, Telegram linking)
                        addLog('Running background synchronization tasks...');
                        
                        const backgroundTasks = [];

                        // Task 1: Store synchronization (If seller flow)
                        let authType = sessionStorage.getItem('auth_type');
                        const isSellerAuth = authType === 'seller' || authType === 'staff';

                        if (currentProfile?.role === 'seller' && isSellerAuth) {
                            backgroundTasks.push((async () => {
                                addLog('Checking for seller record...');
                                const { data: seller } = await supabase
                                    .from('sellers')
                                    .select('id, slug, status')
                                    .eq('id', user.id)
                                    .maybeSingle();

                                if (!seller) {
                                    addLog('Seller record missing. Creating store...');
                                    setStatus('Creating your store...');

                                    let clientRequestId = sessionStorage.getItem('seller_creation_request_id');
                                    if (!clientRequestId) {
                                        clientRequestId = crypto.randomUUID();
                                        sessionStorage.setItem('seller_creation_request_id', clientRequestId);
                                    }

                                    const storeName = sessionStorage.getItem('pending_store_name') || `${user.email?.split('@')[0]}'s Store`;
                                    const storeSlug = sessionStorage.getItem('pending_store_slug') || user.email?.split('@')[0]?.toLowerCase().replace(/[^a-z0-9]/g, '') || `store-${Math.floor(Math.random() * 1000)}`;

                                    try {
                                        const result = (await withTimeout(
                                            adminDb.createSeller({
                                                store_name: storeName,
                                                slug: storeSlug,
                                                client_request_id: clientRequestId,
                                                utm: JSON.parse(sessionStorage.getItem('utm_params') || '{}')
                                            }),
                                            15000,
                                            'create-seller'
                                        )) as { created: boolean };
                                        addLog(result.created ? 'Store created via edge fn' : 'Store already exists');
                                    } catch (edgeFnError: unknown) {
                                        const errorMsg = edgeFnError instanceof Error ? edgeFnError.message : 'Unknown error';
                                        addLog(`Edge fn failed (${errorMsg}). Using direct DB insert...`);
                                        await supabase.from('sellers').upsert({
                                            id: user.id,
                                            store_name: storeName,
                                            slug: storeSlug,
                                            status: 'pending'
                                        }, { onConflict: 'id' });
                                        addLog('Store created via direct DB insert');
                                    }

                                    sessionStorage.removeItem('pending_store_name');
                                    sessionStorage.removeItem('pending_store_slug');
                                    sessionStorage.removeItem('seller_creation_request_id');
                                    sessionStorage.removeItem('utm_params');
                                }
                            })());
                        }

                        backgroundTasks.push((async () => {
                            try {
                                const { data: result } = (await withTimeout(
                                    secureInvoke('log-session', {
                                        body: { device_info: navigator.userAgent }
                                    }),
                                    5000,
                                    'log-session'
                                )) as { data: { session_id?: string } };
                                
                                if (result?.session_id) {
                                    localStorage.setItem('current_session_id', result.session_id);
                                    addLog('Session logged successfully');
                                }
                            } catch (e) {
                                addLog(`Log session skipped: ${e instanceof Error ? e.message : 'Timeout'}`);
                            }
                        })());

                        // Task 3: Telegram Linking
                        const telegramInitData = sessionStorage.getItem('telegram_init_data');
                        if (telegramInitData) {
                            backgroundTasks.push((async () => {
                                try {
                                    addLog('Linking Telegram account...');
                                    const { error } = await secureInvoke('link-telegram', {
                                        body: { initData: telegramInitData }
                                    });
                                    if (error) throw error;
                                    sessionStorage.removeItem('telegram_init_data');
                                    addLog('Telegram linked successfully');
                                } catch (e) {
                                    addLog(`Telegram linking failed: ${e instanceof Error ? e.message : 'Unknown'}`);
                                }
                            })());
                        }

                        // Wait for critical background tasks to complete
                        // We use allSettled so that failures in optional tasks don't block login
                        await Promise.allSettled(backgroundTasks);

                        // Get stored metadata for store-specific logins
                        const storedRedirect = sessionStorage.getItem('auth_redirect');
                        authType = sessionStorage.getItem('auth_type');

                        let redirectPath = '/';

                        if (currentProfile?.role === 'seller') {
                            // We need to access the seller record we fetched earlier
                            // Since `seller` was scoped inside an if block, let's re-fetch just the status to be safe,
                            // or better yet, we can execute another quick query here since the role is confirmed.
                            const { data: routeSeller } = await supabase
                                .from('sellers')
                                .select('status')
                                .eq('id', user.id)
                                .maybeSingle();

                            if (routeSeller?.status === 'onboarding') {
                                redirectPath = '/onboarding';
                            } else {
                                redirectPath = '/dashboard';
                            }
                        } else if (currentProfile?.role === 'admin') {
                            redirectPath = '/admin';
                        } else if (authType === 'store_customer') {
                            // ... store customer logic (keep existing logic) ...
                            const sellerId = sessionStorage.getItem('store_seller_id');
                            const sellerSlug = sessionStorage.getItem('store_seller_slug');

                            if (sellerId && sellerSlug) {
                                setStatus('Linking your store profile...');
                                // Extract metadata from Google Profile
                                const metadata = user.user_metadata || {};
                                const parts = [];
                                if (metadata.given_name) parts.push(metadata.given_name);
                                if (metadata.family_name) parts.push(metadata.family_name);

                                const googleName = parts.length > 0 ? parts.join(' ') : (metadata.full_name || metadata.name || "");
                                const googleAvatar = metadata.avatar_url || metadata.picture;

                                // Check if customer exists (by email or user_id)
                                const { data: customer } = await supabase
                                    .from('store_customers')
                                    .select('*')
                                    .eq('seller_id', sellerId)
                                    .or(`email.eq.${user.email?.toLowerCase()},user_id.eq.${user.id}`)
                                    .maybeSingle();

                                let targetCustomer = customer;

                                if (!customer) {
                                    // Auto-register if not exists
                                    const { data: newCustomer, error: regError } = await supabase
                                        .from('store_customers')
                                        .insert({
                                            seller_id: sellerId,
                                            user_id: user.id,
                                            email: user.email?.toLowerCase(),
                                            display_name: googleName || user.email?.split('@')[0],
                                            avatar_url: googleAvatar,
                                            status: 'active',
                                            metadata: {
                                                source: 'google',
                                                first_name: metadata.given_name,
                                                last_name: metadata.family_name,
                                                last_login: new Date().toISOString()
                                            }
                                        })
                                        .select()
                                        .single();

                                    if (!regError) {
                                        targetCustomer = newCustomer;
                                    }
                                } else {
                                    // Link existing record AND update profile data if missing or from Google
                                    const updates: { 
                                        user_id: string; 
                                        display_name?: string; 
                                        avatar_url?: string;
                                        metadata: Record<string, unknown>;
                                    } = { 
                                        user_id: user.id,
                                        metadata: {
                                            ...(customer.metadata as Record<string, unknown> || {}),
                                            source: 'google',
                                            first_name: (metadata as Record<string, unknown>).given_name || (customer.metadata as Record<string, unknown>)?.first_name,
                                            last_name: (metadata as Record<string, unknown>).family_name || (customer.metadata as Record<string, unknown>)?.last_name,
                                            last_login: new Date().toISOString()
                                        }
                                    };

                                    if (googleName && (!customer.display_name || customer.display_name === customer.email?.split('@')[0])) {
                                        updates.display_name = googleName;
                                    }
                                    if (googleAvatar && !customer.avatar_url) {
                                        updates.avatar_url = googleAvatar;
                                    }

                                    const { data: linkedCustomer } = await supabase
                                        .from('store_customers')
                                        .update(updates)
                                        .eq('id', customer.id)
                                        .select()
                                        .single();

                                    if (linkedCustomer) {
                                        targetCustomer = linkedCustomer;
                                    }
                                }

                                if (targetCustomer) {
                                    const { establishStoreSession } = await import('../lib/storeAuth');
                                    await establishStoreSession(sellerId, sellerSlug);
                                    redirectPath = `/store/${sellerSlug}/`;
                                } else {
                                    redirectPath = `/store/${sellerSlug}/?error=auth_failed`;
                                }
                            }
                        } else if (storedRedirect && storedRedirect !== '/') {
                            redirectPath = storedRedirect;
                        }

                        sessionStorage.removeItem('auth_redirect');
                        sessionStorage.removeItem('auth_type');
                        sessionStorage.removeItem('store_seller_id');
                        sessionStorage.removeItem('store_seller_slug');

                        clearTimeout(safetyTimeout);
                        setStatus('Redirecting...');
                        setTimeout(() => {
                            navigate(redirectPath, { replace: true });
                        }, 100);

                    } catch (error: unknown) {
                        console.error('Auth callback error:', error);
                        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
                        import('react-hot-toast').then(({ toast }) => {
                            toast.error(`Auth Callback Error: ${errorMsg}`, {
                                duration: 10000,
                                style: { background: '#333', color: '#fff' }
                            });
                        });
                        clearTimeout(safetyTimeout);
                        navigate('/', { replace: true });
                    }
                } else if (event === 'SIGNED_OUT') {
                    clearTimeout(safetyTimeout);
                    navigate('/', { replace: true });
                }
            })();
        });

        // Cleanup subscription
        return () => {
            subscription.unsubscribe();
            clearTimeout(safetyTimeout);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [navigate]);

    return (
        <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-600/20 rounded-full blur-3xl"></div>
            </div>

            <div className="relative z-10 text-center">
                <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-6 mx-auto" />
                <h2 className="text-2xl font-bold text-white mb-2">{status}</h2>
                <p className="text-gray-500 text-sm">Please wait while we set things up</p>
                
                {/* Visual Debug Overlay (Bottom Right) */}
                <div className="fixed bottom-4 right-4 z-[9999] bg-black/90 text-[10px] text-green-400 p-2 rounded border border-green-500/30 font-mono pointer-events-none max-w-[300px] text-left shadow-2xl">
                    <div className="font-bold border-b border-green-900 mb-1 pb-1">AuthCallback Debug</div>
                    {debugLog.length === 0 ? <div>Initializing...</div> : debugLog.map((log, i) => (
                        <div key={i} className="truncate select-none leading-tight opacity-80">{log}</div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AuthCallback;
