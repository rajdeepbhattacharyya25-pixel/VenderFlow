import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { QrCode, Copy, CheckCircle, Loader2, AlertTriangle, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface TwoFactorSetupProps {
    onClose: () => void;
    onComplete: () => void;
}

export const TwoFactorSetup: React.FC<TwoFactorSetupProps> = ({ onClose, onComplete }) => {
    const [step, setStep] = useState<'init' | 'scan' | 'verify'>('init');
    const [qrCode, setQrCode] = useState<string>('');
    const [secret, setSecret] = useState<string>('');
    const [factorId, setFactorId] = useState<string>('');
    const [verifyCode, setVerifyCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const startSetup = async () => {
        setLoading(true);
        setError('');
        try {
            const { data, error } = await supabase.auth.mfa.enroll({
                factorType: 'totp',
            });

            if (error) throw error;

            setFactorId(data.id);
            setQrCode(data.totp.qr_code);
            setSecret(data.totp.secret);
            setStep('scan');
        } catch (err: any) {
            console.error('Error starting 2FA setup:', err);
            setError(err.message || 'Failed to start setup');
        } finally {
            setLoading(false);
        }
    };

    const verifySetup = async () => {
        if (!verifyCode || verifyCode.length !== 6) return;
        setLoading(true);
        setError('');

        try {
            const { data, error } = await supabase.auth.mfa.challengeAndVerify({
                factorId,
                code: verifyCode,
            });

            if (error) throw error;

            toast.success('2FA enabled successfully!');
            onComplete();
        } catch (err: any) {
            console.error('Error verifying code:', err);
            setError('Invalid code. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md border border-gray-200 dark:border-gray-800 shadow-xl overflow-hidden relative">
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                    <X size={20} />
                </button>

                <div className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl text-indigo-600 dark:text-indigo-400">
                            <QrCode size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Secure Your Account</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Two-Factor Authentication (2FA)</p>
                        </div>
                    </div>

                    {step === 'init' && (
                        <div className="space-y-6">
                            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                                <p>Adding 2FA provides an extra layer of security. You'll need an authenticator app like Google Authenticator or Authy to scan a QR code.</p>
                            </div>
                            <button
                                onClick={startSetup}
                                disabled={loading}
                                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="animate-spin" size={18} /> : 'Start Setup'}
                            </button>
                        </div>
                    )}

                    {step === 'scan' && (
                        <div className="space-y-6">
                            <div className="text-center space-y-4">
                                <div className="bg-white p-4 rounded-xl border-2 border-dashed border-gray-200 inline-block">
                                    <img src={qrCode} alt="2FA QR Code" className="w-40 h-40" />
                                </div>

                                <div className="text-xs text-gray-500">
                                    <p className="mb-2">Can't scan?</p>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(secret);
                                            toast.success('Secret copied to clipboard');
                                        }}
                                        className="inline-flex items-center gap-1 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-700 dark:text-gray-300 font-mono"
                                    >
                                        {secret} <Copy size={12} />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Enter Code from App</label>
                                <input
                                    type="text"
                                    value={verifyCode}
                                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    placeholder="000 000"
                                    className="w-full text-center text-2xl font-mono tracking-widest py-3 bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-indigo-500 outline-none transition-colors"
                                />
                                {error && <p className="text-red-500 text-xs text-center">{error}</p>}
                            </div>

                            <button
                                onClick={verifySetup}
                                disabled={loading || verifyCode.length !== 6}
                                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? <Loader2 className="animate-spin" size={18} /> : 'Verify & Enable'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
