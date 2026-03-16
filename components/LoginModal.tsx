import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Store, ShieldCheck, Lock, Star, Sparkles, X, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { OwlOverlay } from './OwlOverlay';

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


    const navigate = useNavigate();

    // Reset state when modal opens/closes
    useEffect(() => {
        if (!isOpen) {
            setError(null);
            setEmail('');
            setPassword('');
            setIsSignUp(false);
            setMode(initialMode);
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
        } catch (err: any) {
            setError(err.message || 'Login failed. Please try again.');
            setIsLoading(false);
        }
    };

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            // Check if we are performing Store Customer Auth
            if (sellerId && sellerSlug && mode === 'customer') {
                // Dynamic import to avoid circular dependencies if any, or just use the imported functions
                // Assuming we imported them. I will add imports in a separate step or assume they are available? 
                // Wait, I need to add imports to the file first!
                // But I can't add imports in this chunk easily if I am only replacing this function.
                // I will use window object or assume imports are added.
                // Better: I will Update IMPORTS first in a separate call or do it here if possible?
                // I'll assume I update imports in next step. For now I write the logic hoping imports exist.
                // Actually, I can't use them if not imported.
                // I will use strictly typed imports in next step.
                // For this step, I will throw error if not implemented? No.
                // I MUST update imports first. 
                // I will abort this tool call and do imports first? 
                // No, I can do imports in `multi_replace`?
                // I'll stick to `replace_file_content` for simplicity. 
                // I'll update imports AND this function if they are close? No, imports are at top.
                // I will update this function to use a placeholder or fully qualified name if possible? No.
                // I will update imports in a separate tool call immediately after this.
                // Or I can use `multi_replace`.

                // Let's use logic:
                // If I am a Store Customer:
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

                    navigate('/store/profile'); // Or reload to update state
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
                        const { data: sessionData, error: sessionFnError } = await supabase.functions.invoke('log-session', {
                            body: { device_info: navigator.userAgent }
                        });
                        if (sessionData?.session_id) {
                            localStorage.setItem('current_session_id', sessionData.session_id);
                        }
                    } catch (sessionError) {
                        console.error('Failed to log session:', sessionError);
                    }

                    const { data: profile, error: profileError } = await supabase
                        .from('profiles')
                        .select('role')
                        .eq('id', data.user.id)
                        .maybeSingle();

                    console.log("DEBUG LOGIN:", { user: data.user.email, role: profile?.role, error: profileError });


                    let currentProfile = profile;
                    if (!currentProfile) {
                        console.log("Profile not found in LoginModal. creating one...");
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
                            } else {
                                console.error("LoginModal profile creation failed:", createError);
                            }
                        } catch (err) {
                            console.error("LoginModal profile creation exception:", err);
                        }
                    }

                    if (currentProfile?.role === 'admin') {
                        // Force a hard navigation for admin to ensure clean state
                        window.location.href = '/admin';
                        return;
                    } else if (currentProfile?.role === 'seller' || mode === 'seller') {
                        // If we just created it or if mode is seller, go to dashboard
                        navigate('/dashboard');
                    }
                    onClose();
                }
            }
        } catch (err: any) {
            setError(err.message || 'Authentication failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pt-28 md:pt-32 pb-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-stone-950/40 backdrop-blur-md transition-opacity animate-in fade-in duration-500"
                onClick={onClose}
            ></div>

            <div id="login-panel" className="relative w-full max-h-[calc(100vh-140px)] md:max-h-[calc(100vh-160px)] md:max-w-[360px] bg-stone-950 rounded-[2rem] overflow-visible shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] animate-in slide-in-from-bottom-4 zoom-in-95 duration-500 border border-white/10 flex flex-col mt-4 md:mt-0">
                <OwlOverlay targetSelector="#login-panel" isError={!!error} />
                <div className="p-6 sm:p-8 flex-1 overflow-y-auto" style={{ paddingTop: 'max(env(safe-area-inset-top, 24px), 24px)' }}>
                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        aria-label="Close modal"
                        className="absolute top-8 right-8 p-2 text-stone-500 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-all duration-300"
                    >
                        <X className="w-5 h-5" strokeWidth={1.5} />
                    </button>

                    <div className="flex flex-col items-center">
                        {/* Header */}
                        <div className="text-center mb-5 w-full">
                            <div className="mx-auto w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center mb-3">
                                <Lock className="w-5 h-5 text-stone-100" strokeWidth={1.2} />
                            </div>
                            <h3 className="text-2xl font-display font-medium text-white mb-1.5 tracking-tight">
                                {isSignUp ? 'Create Account' : (mode === 'seller' ? 'Vendor Portal' : 'Welcome Back')}
                            </h3>
                            <p className="text-stone-500 text-[9px] font-bold uppercase tracking-[0.3em]">
                                {mode === 'seller'
                                    ? 'Manage your boutique'
                                    : (isSignUp ? 'Join the community' : 'Sign in to continue')}
                            </p>
                        </div>

                        {error && (
                            <div className="w-full mb-6 p-3 bg-red-950/20 border border-red-900/30 rounded-xl animate-in slide-in-from-top-2">
                                <p className="text-red-400 text-[10px] font-medium text-center">{error}</p>
                            </div>
                        )}

                        <form onSubmit={handleEmailAuth} className="w-full space-y-4" autoComplete="off">
                            <div className="space-y-3">
                                <div className="space-y-1.5">
                                    <label className="block text-[9px] font-bold text-stone-500 uppercase tracking-[0.3em] ml-1">Email</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        autoComplete="off"
                                        className="w-full bg-stone-900/50 border border-white/5 rounded-xl px-4 py-3 text-white placeholder-stone-700 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all text-sm font-medium"
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
                                        className="w-full bg-stone-900/50 border border-white/5 rounded-xl px-4 py-3 text-white placeholder-stone-700 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all text-sm font-medium"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-white text-stone-950 font-bold py-3.5 rounded-xl hover:bg-stone-200 active:scale-[0.98] transition-all duration-300 disabled:opacity-50 text-[10px] uppercase tracking-[0.4em] shadow-xl shadow-white/5"
                                style={{ minHeight: '44px', WebkitTapHighlightColor: 'transparent' }}
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

                        <div className="w-full relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-white/5"></div>
                            </div>
                            <div className="relative flex justify-center">
                                <span className="px-6 bg-stone-950 text-[9px] font-bold text-stone-600 uppercase tracking-[0.5em]">
                                    OR
                                </span>
                            </div>
                        </div>

                        <button
                            onClick={handleGoogleLogin}
                            disabled={isLoading}
                            className="w-full flex items-center justify-center gap-4 bg-stone-900/50 border border-white/5 text-white font-bold py-3.5 rounded-xl hover:bg-stone-800 transition-all active:scale-[0.98] disabled:opacity-50 text-[10px] uppercase tracking-[0.4em]"
                            style={{ minHeight: '44px' }}
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

                        <div className="mt-6 w-full text-center space-y-3">
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
