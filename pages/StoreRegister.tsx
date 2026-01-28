import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerStoreCustomer } from '../lib/storeAuth';
import { Seller } from '../lib/seller';
import { supabase } from '../lib/supabase';
import { Lock, Mail, Store, ArrowLeft, User } from 'lucide-react';

interface StoreRegisterProps {
    seller: Seller;
    onSuccess?: () => void;
}

export const StoreRegister: React.FC<StoreRegisterProps> = ({ seller, onSuccess }) => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [displayName, setDisplayName] = useState('');

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setIsLoading(true);

        const result = await registerStoreCustomer(
            seller.id,
            seller.slug,
            email,
            password,
            displayName || undefined
        );

        if (result.success) {
            if (onSuccess) {
                onSuccess();
            } else {
                navigate(`/store/${seller.slug}`);
            }
        } else {
            setError(result.error || 'Registration failed');
        }

        setIsLoading(false);
    };

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        setError(null);

        try {
            // Store store metadata for the callback handler
            sessionStorage.setItem('auth_type', 'store_customer');
            sessionStorage.setItem('store_seller_id', seller.id);
            sessionStorage.setItem('store_seller_slug', seller.slug);
            sessionStorage.setItem('auth_redirect', `/store/${seller.slug}`);

            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/auth-callback`,
                },
            });

            if (error) throw error;
        } catch (err: any) {
            setError(err.message || 'Google registration failed');
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6 sm:p-12 relative overflow-hidden font-body">
            {/* Elegant Background Elements */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-0 w-[60vw] h-[60vh] bg-stone-200/40 rounded-full blur-[140px] -translate-y-1/2 -translate-x-1/3"></div>
                <div className="absolute bottom-0 right-0 w-[50vw] h-[50vh] bg-amber-100/30 rounded-full blur-[120px] translate-y-1/3 translate-x-1/4"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.8)_0%,transparent_100%)]"></div>
            </div>

            <div className="relative z-10 w-full max-w-[28rem]">
                {/* Clean Back Navigation */}
                <button
                    onClick={() => navigate(`/store/${seller.slug}`)}
                    className="group flex items-center gap-4 text-stone-400 hover:text-stone-900 mb-12 transition-all duration-500"
                >
                    <div className="w-11 h-11 rounded-full border border-stone-200 flex items-center justify-center group-hover:bg-white group-hover:border-stone-950 group-hover:shadow-xl group-hover:shadow-stone-950/5 transition-all duration-500">
                        <ArrowLeft size={18} strokeWidth={1.5} />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.3em] pt-0.5 opacity-60 group-hover:opacity-100 transition-opacity">Return to Store</span>
                </button>

                <div className="bg-white/70 backdrop-blur-3xl border border-white/50 rounded-[3rem] p-10 sm:p-16 shadow-[0_8px_30px_rgb(0,0,0,0.04),0_30px_60px_-12px_rgba(28,25,23,0.12)]">
                    {/* Prestigious Branding */}
                    <div className="text-center mb-16">
                        <div className="w-24 h-24 bg-stone-950 rounded-[2rem] flex items-center justify-center mx-auto mb-10 shadow-2xl relative group overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-tr from-stone-900 to-stone-800 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                            <Store className="w-10 h-10 text-stone-50 relative z-10" strokeWidth={1.2} />
                        </div>
                        <h1 className="text-5xl sm:text-6xl font-display font-medium text-stone-950 mb-6 tracking-tight leading-tight">
                            Join {seller.store_name}
                        </h1>
                        <div className="flex items-center justify-center gap-6">
                            <div className="h-px w-10 bg-stone-100"></div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-stone-300">Registration</p>
                            <div className="h-px w-10 bg-stone-100"></div>
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-50/50 border border-red-100/50 text-red-600 px-8 py-5 rounded-[1.5rem] mb-10 text-xs font-semibold animate-in fade-in slide-in-from-top-4 duration-500">
                            {error}
                        </div>
                    )}

                    <div className="space-y-10">
                        {/* Registration Form */}
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-4">
                                <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-[0.3em] ml-2">
                                    Display Name
                                </label>
                                <div className="relative group">
                                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-stone-300 group-focus-within:text-stone-950 transition-colors duration-500">
                                        <User size={20} strokeWidth={1.2} />
                                    </div>
                                    <input
                                        type="text"
                                        value={displayName}
                                        onChange={(e) => setDisplayName(e.target.value)}
                                        autoComplete="off"
                                        className="w-full bg-stone-100/50 border border-transparent rounded-[1.25rem] pl-16 pr-6 py-4.5 text-stone-950 placeholder-stone-300 focus:bg-white focus:border-stone-950/10 focus:ring-0 outline-none transition-all duration-500 text-sm font-medium shadow-none focus:shadow-xl focus:shadow-stone-950/[0.02]"
                                        placeholder="Enter your name"
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-[0.3em] ml-2">
                                    Email Profile
                                </label>
                                <div className="relative group">
                                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-stone-300 group-focus-within:text-stone-950 transition-colors duration-500">
                                        <Mail size={20} strokeWidth={1.2} />
                                    </div>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        autoComplete="off"
                                        className="w-full bg-stone-100/50 border border-transparent rounded-[1.25rem] pl-16 pr-6 py-4.5 text-stone-950 placeholder-stone-300 focus:bg-white focus:border-stone-950/10 focus:ring-0 outline-none transition-all duration-500 text-sm font-medium shadow-none focus:shadow-xl focus:shadow-stone-950/[0.02]"
                                        placeholder="you@example.com"
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <p className="block text-[10px] font-bold text-stone-400 uppercase tracking-[0.3em] ml-2">
                                    Access Code
                                </p>
                                <div className="relative group">
                                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-stone-300 group-focus-within:text-stone-950 transition-colors duration-500">
                                        <Lock size={20} strokeWidth={1.2} />
                                    </div>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        minLength={6}
                                        autoComplete="new-password"
                                        className="w-full bg-stone-100/50 border border-transparent rounded-[1.25rem] pl-16 pr-6 py-4.5 text-stone-950 placeholder-stone-300 focus:bg-white focus:border-stone-950/10 focus:ring-0 outline-none transition-all duration-500 text-sm font-medium shadow-none focus:shadow-xl focus:shadow-stone-950/[0.02]"
                                        placeholder="Min. 6 characters"
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-[0.3em] ml-2">
                                    Confirm Code
                                </label>
                                <div className="relative group">
                                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-stone-300 group-focus-within:text-stone-950 transition-colors duration-500">
                                        <Lock size={20} strokeWidth={1.2} />
                                    </div>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                        minLength={6}
                                        autoComplete="new-password"
                                        className="w-full bg-stone-100/50 border border-transparent rounded-[1.25rem] pl-16 pr-6 py-4.5 text-stone-950 placeholder-stone-300 focus:bg-white focus:border-stone-950/10 focus:ring-0 outline-none transition-all duration-500 text-sm font-medium shadow-none focus:shadow-xl focus:shadow-stone-950/[0.02]"
                                        placeholder="Re-enter code"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full group relative overflow-hidden bg-stone-950 text-stone-50 font-bold py-6 rounded-[1.25rem] shadow-2xl shadow-stone-950/20 hover:shadow-stone-950/40 active:scale-[0.98] transition-all duration-700 mt-6"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-stone-900 via-stone-950 to-stone-900 opacity-0 group-hover:opacity-100 transition-opacity duration-700 bg-[length:200%_100%] group-hover:animate-shimmer"></div>
                                <span className="relative z-10 flex items-center justify-center gap-4 text-[10px] uppercase tracking-[0.4em]">
                                    {isLoading ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                            Registering...
                                        </>
                                    ) : (
                                        'Begin Journey'
                                    )}
                                </span>
                            </button>
                        </form>

                        {/* Luxury "Or" Divider */}
                        <div className="relative py-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-stone-100"></div>
                            </div>
                            <div className="relative flex justify-center">
                                <span className="px-6 bg-white/70 backdrop-blur-sm text-[9px] font-bold text-stone-300 uppercase tracking-[0.5em]">
                                    Social Identity
                                </span>
                            </div>
                        </div>

                        {/* Premium Google Button */}
                        <button
                            onClick={handleGoogleLogin}
                            className="w-full group flex items-center justify-center gap-5 bg-white border border-stone-100 text-stone-950 font-bold py-5 rounded-[1.25rem] hover:bg-white hover:border-stone-950 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.06)] active:scale-[0.98] transition-all duration-500"
                        >
                            <svg className="w-5 h-5 transition-transform duration-500 group-hover:scale-110" viewBox="0 0 24 24">
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
                            <span className="text-[10px] uppercase tracking-[0.3em]">Join with Google</span>
                        </button>
                    </div>

                    <div className="mt-16 text-center pt-10 border-t border-stone-50">
                        <p className="text-[10px] text-stone-400 font-bold uppercase tracking-[0.2em]">
                            Existing Guest?{' '}
                            <Link
                                to={`/store/${seller.slug}/`}
                                className="text-stone-950 font-black ml-3 underline underline-offset-[6px] decoration-stone-200 hover:decoration-stone-950 transition-all"
                            >
                                Sign In
                            </Link>
                        </p>
                    </div>
                </div>

                <div className="mt-12 flex items-center justify-center gap-8 opacity-40">
                    <p className="text-[9px] font-bold text-stone-400 uppercase tracking-[0.4em]">
                        Merchant Protection Active
                    </p>
                    <div className="h-px w-6 bg-stone-200"></div>
                    <p className="text-[9px] font-bold text-stone-500 uppercase tracking-[0.4em]">
                        {seller.store_name} Boutique
                    </p>
                </div>
            </div>
        </div>
    );
};
export default StoreRegister;
