import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
// import { createStoreSession } from '../lib/storeAuth'; // Removed

import { Loader2 } from 'lucide-react';

const AuthCallback = () => {
    const navigate = useNavigate();
    const [status, setStatus] = useState('Logging you in...');

    const attemptRef = React.useRef(false);
    const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        // Check for error in URL hash immediately
        if (window.location.hash && window.location.hash.includes('error=')) {
            const params = new URLSearchParams(window.location.hash.substring(1));
            const errorDescription = params.get('error_description') || 'Authentication failed';
            alert(`Auth Link Error: ${errorDescription}`);
            navigate('/', { replace: true });
            return;
        }

        // Listen for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log("Auth Event:", event);

            // Clear any pending timeout if we get a session
            if (session?.user && timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }

            if (event === 'INITIAL_SESSION' && !session) {
                console.log("No session in INITIAL_SESSION, waiting...");
                // Wait longer for hash to be parsed
                timeoutRef.current = setTimeout(async () => {
                    if (attemptRef.current) return;
                    attemptRef.current = true;

                    const { data } = await supabase.auth.getSession();
                    if (!data.session) {
                        console.log("Login timed out - Redirecting to home");
                        // Only redirect if we REALLY don't have a session
                        navigate('/', { replace: true });
                    }
                }, 3000); // Increased to 3s
            }

            if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
                try {
                    const user = session.user;
                    setStatus('Verifying your account...');

                    // Fetch user profile to check role
                    const { data: profile, error: profileError } = await supabase
                        .from('profiles')
                        .select('id, role')
                        .eq('id', user.id)
                        .maybeSingle();

                    if (profileError) console.error("Profile Fetch Error:", profileError);

                    // Log the session for OAuth logins
                    try {
                        const { data: sessionData } = await supabase.functions.invoke('log-session', {
                            body: { device_info: navigator.userAgent }
                        });
                        if (sessionData?.session_id) {
                            localStorage.setItem('current_session_id', sessionData.session_id);
                        }
                    } catch (sessionError) {
                        console.error('Failed to log OAuth session:', sessionError);
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

                    // Determine redirect path
                    let redirectPath = '/';

                    if (profile?.role === 'seller') {
                        redirectPath = '/dashboard';
                    } else if (profile?.role === 'admin') {
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

                    setStatus('Redirecting...');
                    setTimeout(() => {
                        navigate(redirectPath, { replace: true });
                    }, 100);

                } catch (error: any) {
                    console.error('Auth callback error:', error);
                    navigate('/', { replace: true });
                }
            } else if (event === 'SIGNED_OUT') {
                navigate('/', { replace: true });
            }
        });

        // Cleanup subscription
        return () => {
            subscription.unsubscribe();
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
                <p className="text-gray-500">Please wait while we verify your credentials</p>
            </div>
        </div>
    );
};

export default AuthCallback;
