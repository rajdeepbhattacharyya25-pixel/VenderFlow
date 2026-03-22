import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Store, Lock, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { OwlOverlay } from './OwlOverlay';
import { Turnstile } from '@marsidev/react-turnstile';

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialMode?: 'customer' | 'seller';
    sellerId?: string;
    sellerSlug?: string;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, initialMode = 'customer', sellerId, sellerSlug }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [mode, setMode] = useState<'customer' | 'seller'>(initialMode);
    const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
    const [viewportWidth, setViewportWidth] = useState(window.innerWidth);

    const navigate = useNavigate();

    // Track viewport for Turnstile size
    useEffect(() => {
        const handleResize = () => setViewportWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Reset state when modal opens/closes
    useEffect(() => {
        if (!isOpen) {
            setError(null);
            setEmail('');
            setPassword('');
            setIsSignUp(false);
            setMode(initialMode);
            setTurnstileToken(null);
        }
    }, [isOpen, initialMode]);

    if (!isOpen) return null;

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        setError(null);

        try {
            // Store type for after auth callback
            const existingRedirect = sessionStorage.getItem('auth_redirect');
            if (!existingRedirect || existingRedirect === '/') {
                sessionStorage.setItem('auth_redirect', window.location.pathname);
            }

            if (sellerId && sellerSlug) {
                sessionStorage.setItem('auth_type', 'store_customer');
                sessionStorage.setItem('store_seller_id', sellerId);
                sessionStorage.setItem('store_seller_slug', sellerSlug);
            } else if (mode === 'seller') {
                sessionStorage.setItem('auth_type', 'seller');
            }

            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/auth-callback`,
                },
            });

            if (error) throw error;
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Login failed. Please try again.';
            setError(message);
            setIsLoading(false);
        }
    };

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!turnstileToken) {
            setError('Please complete the security check.');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Check if we are performing Store Customer Auth
            if (sellerId && sellerSlug && mode === 'customer') {
                if (isSignUp) {
                    // Register
                    const { registerStoreCustomer } = await import('../lib/storeAuth');
                    const { success, error } = await registerStoreCustomer(sellerId, sellerSlug, email, password);
                    if (!success) throw new Error(error);

                    alert('Registration successful!');
                    onClose();
                } else {
                    // Login
                    const { loginStoreCustomer } = await import('../lib/storeAuth');
                    const { success, error } = await loginStoreCustomer(sellerId, sellerSlug, email, password);
                    if (!success) throw new Error(error);

                    navigate('/store/profile'); 
                    onClose();
                }
                return;
            }

            // Fallback to Supabase Auth (Sellers / Admin)
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: `${window.location.origin}/auth-callback`,
                        data: {
                            full_name: email.split('@')[0],
                        }
                    }
                });
                if (error) throw error;
                alert('Registration successful! Please check your email to verify your account.');
                onClose();
            } else {
                const { error, data } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;

                if (data.user) {
                    // Log the session
                    try {
                        const { data: sessionData } = await supabase.functions.invoke('log-session', {
                            body: { device_info: navigator.userAgent }
                        });
                        if (sessionData?.session_id) {
                            localStorage.setItem('current_session_id', sessionData.session_id);
                        }
                    } catch (sessionError) {
                        console.error('Failed to log session:', sessionError);
                    }

                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('role')
                        .eq('id', data.user.id)
                        .maybeSingle();

                    let currentProfile = profile;
                    if (!currentProfile) {
                        try {
                            const { data: newProfile, error: createError } = await supabase
                                .from('profiles')
                                .insert({
                                    id: data.user.id,
                                    email: data.user.email,
                                    role: 'seller'
                                })
                                .select('role')
                                .single();

                            if (!createError) {
                                currentProfile = newProfile;
                            }
                        } catch (err) {
                            console.error("LoginModal profile creation exception:", err);
                        }
                    }

                    if (currentProfile?.role === 'admin') {
                        window.location.href = '/admin';
                        return;
                    } else if (currentProfile?.role === 'seller' || mode === 'seller') {
                        navigate('/dashboard');
                    }
                    onClose();
                }
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Authentication failed. Please try again.';
            setError(message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 ${viewportWidth < 360 ? 'pt-24' : 'pt-16 md:pt-20'} pb-4`}>
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-stone-950/60 backdrop-blur-xl transition-opacity animate-in fade-in duration-500"
                onClick={onClose}
            ></div>

            <div id="login-panel" className={`relative w-full max-h-[calc(100vh-80px)] md:max-w-[340px] bg-stone-950 rounded-[1.2rem] sm:rounded-[2rem] overflow-visible shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] animate-in slide-in-from-bottom-4 zoom-in-95 duration-500 border border-white/10 flex flex-col mt-2 md:mt-0 ${viewportWidth < 340 ? 'scale-[0.85]' : (viewportWidth < 360 ? 'scale-[0.92]' : '')}`}>
                <OwlOverlay targetSelector="#login-panel" isError={!!error} />
                <div className={`${viewportWidth < 360 ? 'p-3 pb-10' : 'p-4 sm:p-6 pb-8'} flex-1 overflow-y-auto hide-scroll`} style={{ paddingTop: 'max(env(safe-area-inset-top, 24px), 24px)' }}>
                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        aria-label="Close modal"
                        className="absolute top-4 right-4 sm:top-8 sm:right-8 p-1.5 sm:p-2 text-stone-500 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-all duration-300 z-50"
                    >
                        <X className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={1.5} />
                    </button>

                    <div className="flex flex-col items-center">
                        {/* Header */}
                        <div className={`text-center ${viewportWidth < 360 ? 'mb-2' : 'mb-3'} w-full`}>
                            <div className={`mx-auto ${viewportWidth < 360 ? 'w-6 h-6' : 'w-8 h-8 sm:w-10 sm:h-10'} bg-white/5 border border-white/10 rounded-xl flex items-center justify-center mb-2 sm:mb-3`}>
                                <Lock className={`${viewportWidth < 360 ? 'w-3 h-3' : 'w-4 h-4 sm:w-5 sm:h-5'} text-stone-100`} strokeWidth={1.2} />
                            </div>
                            <h3 className={`${viewportWidth < 360 ? 'text-lg' : 'text-xl sm:text-2xl'} font-display font-medium text-white mb-1 tracking-tight`}>
                                {isSignUp ? 'Create Account' : (mode === 'seller' ? 'Vendor Portal' : 'Welcome Back')}
                            </h3>
                            <p className="text-stone-500 text-[8px] sm:text-[9px] font-bold uppercase tracking-[0.2em] sm:tracking-[0.3em]">
                                {mode === 'seller'
                                    ? 'Manage your boutique'
                                    : (isSignUp ? 'Join the community' : 'Sign in to continue')}
                            </p>
                        </div>

                        {error && (
                            <div className={`w-full ${viewportWidth < 360 ? 'mb-3' : 'mb-6'} p-3 bg-red-950/20 border border-red-900/30 rounded-xl animate-in slide-in-from-top-2`}>
                                <p className="text-red-400 text-[10px] font-medium text-center">{error}</p>
                            </div>
                        )}

                        <form onSubmit={handleEmailAuth} className={`w-full ${viewportWidth < 360 ? 'space-y-2' : 'space-y-3'}`} autoComplete="off">
                            <div className={`${viewportWidth < 360 ? 'space-y-2' : 'space-y-3'}`}>
                                <div className="space-y-1.5">
                                    <label className="block text-[9px] font-bold text-stone-500 uppercase tracking-[0.3em] ml-1">Email</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        autoComplete="off"
                                        className={`w-full bg-stone-900/50 border border-white/5 rounded-xl ${viewportWidth < 360 ? 'px-3 py-2.5 text-xs' : 'px-4 py-3 text-sm'} text-white placeholder-stone-700 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all font-medium`}
                                        placeholder="Email Address"
                                        inputMode="email"
                                        autoCapitalize="off"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <p className="block text-[9px] font-bold text-stone-500 uppercase tracking-[0.3em] ml-1">Password</p>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        minLength={6}
                                        autoComplete="new-password"
                                        className={`w-full bg-stone-900/50 border border-white/5 rounded-xl ${viewportWidth < 360 ? 'px-3 py-2.5 text-xs' : 'px-4 py-3 text-sm'} text-white placeholder-stone-700 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all font-medium`}
                                        placeholder="••••••••"
                                    />
                                </div>
                                
                                <div className="flex justify-center">
                                    <Turnstile
                                        // @ts-expect-error - import.meta is allowed but linter might complain about target
                                        sitekey={String(import.meta.env.VITE_TURNSTILE_SITEKEY || '1x00000000000000000000AA')}
                                        onSuccess={(token) => setTurnstileToken(token)}
                                        onExpire={() => setTurnstileToken(null)}
                                        onError={() => setTurnstileToken(null)}
                                        options={{
                                            theme: 'dark',
                                            size: viewportWidth < 340 ? 'compact' : 'normal',
                                        }}
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading || !turnstileToken}
                                className={`w-full bg-white text-stone-950 font-bold ${viewportWidth < 360 ? 'py-2.5 text-[9px]' : 'py-3.5 text-[10px]'} rounded-xl hover:bg-stone-200 active:scale-[0.98] transition-all duration-300 disabled:opacity-50 uppercase tracking-[0.4em] shadow-xl shadow-white/5`}
                                style={{ minHeight: viewportWidth < 360 ? '38px' : '44px', WebkitTapHighlightColor: 'transparent' }}
                            >
                                {isLoading ? (
                                    <div className="flex items-center justify-center gap-3">
                                        <div className="w-3 h-3 border-2 border-stone-950/20 border-t-stone-950 rounded-full animate-spin"></div>
                                        <span>Signing in...</span>
                                    </div>
                                ) : (
                                    isSignUp ? 'Register' : 'Authenticate'
                                )}
                            </button>
                        </form>

                        <div className={`w-full relative ${viewportWidth < 360 ? 'my-2' : 'my-4'}`}>
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-white/5"></div>
                            </div>
                            <div className="relative flex justify-center">
                                <span className={`px-6 bg-stone-950 ${viewportWidth < 360 ? 'text-[8px]' : 'text-[9px]'} font-bold text-stone-600 uppercase tracking-[0.5em]`}>
                                    OR
                                </span>
                            </div>
                        </div>

                        <button
                            onClick={handleGoogleLogin}
                            disabled={isLoading}
                            className={`w-full flex items-center justify-center gap-4 bg-stone-900/50 border border-white/5 text-white font-bold ${viewportWidth < 360 ? 'py-2.5 text-[9px]' : 'py-3.5 text-[10px]'} rounded-xl hover:bg-stone-800 transition-all active:scale-[0.98] disabled:opacity-50 uppercase tracking-[0.4em]`}
                            style={{ minHeight: viewportWidth < 360 ? '38px' : '44px' }}
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path
                                    fill="currentColor"
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                />
                                <path
                                    fill="currentColor"
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                />
                                <path
                                    fill="currentColor"
                                    d="M5.84 14.09c-.22-.67-.35-1.39-.35-2.09s.13-1.42.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                                />
                                <path
                                    fill="currentColor"
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                />
                            </svg>
                            <span>Google Auth</span>
                        </button>

                        <div className={`${viewportWidth < 360 ? 'mt-4' : 'mt-6'} w-full text-center space-y-3`}>
                            {!isSignUp && (
                                <button
                                    onClick={() => setMode(mode === 'customer' ? 'seller' : 'customer')}
                                    className="text-[9px] font-bold text-stone-500 hover:text-white transition-colors uppercase tracking-[0.3em] flex items-center justify-center gap-3 mx-auto"
                                >
                                    {mode === 'customer' ? (
                                        <><Store className="w-3.5 h-3.5" /> Vendor Access</>
                                    ) : (
                                        <><Lock className="w-3.5 h-3.5" /> Member Access</>
                                    )}
                                </button>
                            )}

                            <button
                                onClick={() => setIsSignUp(!isSignUp)}
                                className="text-[10px] font-medium text-stone-500 hover:text-white transition-colors block mx-auto underline underline-offset-[6px] decoration-stone-800 hover:decoration-white"
                            >
                                {isSignUp ? 'Back to Authenticate' : "Create an identity"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
