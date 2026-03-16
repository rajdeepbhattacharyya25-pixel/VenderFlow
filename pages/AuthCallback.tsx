import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { adminDb } from '../lib/admin-api';
import { Events } from '../lib/analytics';
// import { createStoreSession } from '../lib/storeAuth'; // Removed

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
        // `processed` is local to this effect run. In React StrictMode the effect
        // runs twice (mount → cleanup → remount). Using a closure-local flag instead
        // of a ref guard ensures onAuthStateChange is always subscribed on the
        // final mount, while still preventing the callback from processing twice.
        let processed = false;

        // Global safety timeout — never stay stuck for more than 15s
        const safetyTimeout = setTimeout(() => {
            console.warn('AuthCallback: global safety timeout reached (15s). Redirecting...');
            navigate('/dashboard', { replace: true });
        }, 15000);

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
                    addLog('No session yet in INITIAL_SESSION — waiting for Supabase to parse hash...');
                    // Give Supabase SDK 5s to parse hash tokens and fire SIGNED_IN
                    timeoutRef.current = setTimeout(async () => {
                        if (redirectScheduledRef.current) return;

                        const { data } = await supabase.auth.getSession();
                        if (!data.session) {
                            addLog('Session still not found after 5s — redirecting home.');
                            redirectScheduledRef.current = true;
                            import('react-hot-toast').then(({ toast }) => {
                                toast.error('Login timed out. If this keeps happening, check that cookies and local storage are not blocked in your browser.', {
                                    duration: 10000,
                                });
                            });
                            navigate('/', { replace: true });
                        } else {
                            addLog(`Session recovered via fallback getSession: ${data.session.user.email}`);
                        }
                    }, 5000);
                }

                if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
                    // Prevent processing twice in React StrictMode
                    if (processed) return;
                    processed = true;

                    try {
                        const user = session.user;
                        addLog(`User found: ${user.email}`);
                        setStatus('Verifying your account...');

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
                                currentProfile = newProfile;
                                addLog("Profile created successfully");
                            } catch (err) {
                                console.error("Failed to create profile:", err);
                                setStatus('Account setup failed. Please contact support.');
                                addLog(`Error creating profile: ${err.message || JSON.stringify(err)}`);
                                // Don't redirect immediately so user sees the error
                                return;
                            }
                        }

                        // Check if seller record exists, if not create it (Store Creation Point)
                        if (currentProfile?.role === 'seller') {
                            addLog('Checking for seller record...');
                            const { data: seller } = await supabase
                                .from('sellers')
                                .select('id, slug, status')
                                .eq('id', user.id)
                                .maybeSingle();

                            if (!seller) {
                                addLog('Seller record missing. Creating store...');
                                try {
                                    setStatus('Creating your store...');

                                    let clientRequestId = sessionStorage.getItem('seller_creation_request_id');
                                    if (!clientRequestId) {
                                        clientRequestId = crypto.randomUUID();
                                        sessionStorage.setItem('seller_creation_request_id', clientRequestId);
                                    }

                                    const storeName = sessionStorage.getItem('pending_store_name') || `${user.email?.split('@')[0]}'s Store`;
                                    const storeSlug = sessionStorage.getItem('pending_store_slug') || user.email?.split('@')[0]?.toLowerCase().replace(/[^a-z0-9]/g, '') || `store-${Math.floor(Math.random() * 1000)}`;

                                    // Try edge function with 8s timeout, fallback to direct insert
                                    try {
                                        const result = await withTimeout(
                                            adminDb.createSeller({
                                                store_name: storeName,
                                                slug: storeSlug,
                                                client_request_id: clientRequestId,
                                                utm: JSON.parse(sessionStorage.getItem('utm_params') || '{}')
                                            }),
                                            8000,
                                            'create-seller'
                                        );
                                        addLog(result.created ? 'Store created via edge fn' : 'Store already exists');
                                    } catch (edgeFnError: any) {
                                        addLog(`Edge fn failed (${edgeFnError.message}). Using direct DB insert...`);
                                        // Fallback: direct DB insert
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
                                } catch (createError: any) {
                                    console.error('Failed to create store:', createError);
                                    addLog(`Store creation error: ${createError.message}`);
                                }
                            }
                        }

                        // Log the session for OAuth logins (non-blocking with 5s timeout)
                        try {
                            const sessionResult = await withTimeout(
                                supabase.functions.invoke('log-session', {
                                    body: { device_info: navigator.userAgent }
                                }),
                                5000,
                                'log-session'
                            );
                            if (sessionResult?.data?.session_id) {
                                localStorage.setItem('current_session_id', sessionResult.data.session_id);
                            }
                        } catch (sessionError) {
                            console.error('log-session skipped:', sessionError);
                        }

                        // Check for pending Telegram Link
                        // Check for pending Telegram Link
                        const telegramInitData = sessionStorage.getItem('telegram_init_data');
                        if (telegramInitData && user.id) {
                            try {
                                setStatus('Linking Telegram account...');

                                const { error } = await supabase.functions.invoke('link-telegram', {
                                    body: { initData: telegramInitData }
                                });

                                if (error) throw error;

                                sessionStorage.removeItem('telegram_init_data');
                                console.log('Telegram account linked successfully via backend');
                            } catch (e) {
                                console.error('Failed to link Telegram', e);
                                // We don't block login on this error, just log it
                            }
                        }

                        // Get stored metadata for store-specific logins
                        const storedRedirect = sessionStorage.getItem('auth_redirect');
                        const authType = sessionStorage.getItem('auth_type');

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
                                    const updates: any = { user_id: user.id };

                                    if (googleName && (!customer.display_name || customer.display_name === customer.email?.split('@')[0])) {
                                        updates.display_name = googleName;
                                    }
                                    if (googleAvatar && !customer.avatar_url) {
                                        updates.avatar_url = googleAvatar;
                                    }

                                    updates.metadata = {
                                        ...customer.metadata,
                                        source: 'google',
                                        first_name: metadata.given_name || customer.metadata?.first_name,
                                        last_name: metadata.family_name || customer.metadata?.last_name,
                                        last_login: new Date().toISOString()
                                    };

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

                    } catch (error: any) {
                        console.error('Auth callback error:', error);
                        import('react-hot-toast').then(({ toast }) => {
                            toast.error(`Auth Callback Error: ${error?.message || 'Unknown error'}`, {
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
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl"></div>
            </div>

            <div className="relative z-10 text-center">
                <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-6 mx-auto" />
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
