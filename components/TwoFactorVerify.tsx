import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { ShieldCheck, Loader2, X, Lock } from 'lucide-react';
import toast from 'react-hot-toast';

interface TwoFactorVerifyProps {
    onVerify: () => void;
    onCancel: () => void;
}

export const TwoFactorVerify: React.FC<TwoFactorVerifyProps> = ({ onVerify, onCancel }) => {
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleVerify = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (code.length !== 6) return;

        setLoading(true);
        setError('');

        try {
            // 1. Get the factor ID
            const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
            if (factorsError) throw factorsError;

            const totpFactor = factors.totp.find(f => f.status === 'verified');
            if (!totpFactor) {
                throw new Error('No verified 2FA factor found. Please set up 2FA first.');
            }

            // 2. Challenge and Verify
            const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
                factorId: totpFactor.id,
                code: code,
            });

            if (verifyError) throw verifyError;

            toast.success('Security check passed');
            onVerify();
        } catch (err: any) {
            console.error('MFA Verification failed:', err);
            setError(err.message || 'Invalid code. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden relative">
                <button
                    onClick={onCancel}
                    aria-label="Close"
                    className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                    <X size={20} />
                </button>

                <div className="p-8">
                    <div className="flex flex-col items-center text-center mb-8">
                        <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl text-emerald-600 dark:text-emerald-400 mb-4">
                            <ShieldCheck size={32} strokeWidth={1.5} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Security Verification</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                            Your account is protected with Two-Factor Authentication. Please enter the code from your authenticator app.
                        </p>
                    </div>

                    <form onSubmit={handleVerify} className="space-y-6">
                        <div className="space-y-3">
                            <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest ml-1 block">
                                Authentication Code
                            </label>
                            <input
                                type="text"
                                value={code}
                                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                placeholder="000 000"
                                autoFocus
                                className="w-full text-center text-3xl font-mono tracking-[0.3em] py-4 bg-gray-50 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-800 rounded-2xl focus:border-emerald-500 dark:focus:border-emerald-500/50 outline-none transition-all"
                            />
                            {error && (
                                <p className="text-red-500 text-xs font-medium text-center animate-in slide-in-from-top-1">
                                    {error}
                                </p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={loading || code.length !== 6}
                            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-600/20 active:scale-[0.98]"
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : (
                                <>
                                    <Lock size={18} />
                                    <span>Verify Identity</span>
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};
