import React, { useState, useEffect } from 'react';
import { auth } from '../lib/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { IconCheck, IconPhone } from './Icons';
import { Loader2, Edit2, RotateCcw } from 'lucide-react';

declare global {
    interface Window {
        recaptchaVerifier: any;
    }
}

interface PhoneVerificationProps {
    initialPhone?: string;
    onVerifySuccess: (phone: string) => void;
    onPhoneChange?: (phone: string) => void;
}

export const PhoneVerification: React.FC<PhoneVerificationProps> = ({
    initialPhone = '',
    onVerifySuccess,
    onPhoneChange
}) => {
    const [phoneNumber, setPhoneNumber] = useState(initialPhone);
    const [otp, setOtp] = useState('');
    const [step, setStep] = useState<'input' | 'otp' | 'verified'>('input');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [confirmationResult, setConfirmationResult] = useState<any>(null);

    // Initialize Recaptcha
    useEffect(() => {
        const initRecaptcha = async () => {
            if (!window.recaptchaVerifier) {
                try {
                    window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
                        'size': 'invisible',
                        'callback': () => {
                            // reCAPTCHA solved
                        }
                    });
                } catch (e) {
                    console.error("Recaptcha Init Error", e);
                }
            }
        };

        initRecaptcha();

        return () => {
            // Cleanup on unmount to handle React strict mode & navigation correctly
            if (window.recaptchaVerifier) {
                try {
                    window.recaptchaVerifier.clear();
                } catch (e) {
                    console.warn("Failed to clear recaptcha", e);
                }
                window.recaptchaVerifier = null;
            }
        };
    }, []);

    useEffect(() => {
        if (initialPhone && step === 'input') {
            setPhoneNumber(initialPhone);
        }
    }, [initialPhone]);

    const handleSendOtp = async () => {
        if (!phoneNumber || phoneNumber.length < 10) {
            setError('Please enter a valid phone number');
            return;
        }

        setLoading(true);
        setError('');

        try {
            if (!window.recaptchaVerifier) {
                window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
                    'size': 'invisible'
                });
            }

            const appVerifier = window.recaptchaVerifier;
            // Ensure phone has + prefix. Basic assumption +91 for India if missing.
            const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;

            const confirmation = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
            setConfirmationResult(confirmation);
            setStep('otp');
        } catch (err: any) {
            console.error('Firebase Auth Error:', err);
            setError(err.message || 'Failed to send SMS. Try again.');

            // Reset recaptcha on error so user can try again
            if (window.recaptchaVerifier) {
                try {
                    // Force re-render of recaptcha or just let the user retry which might trigger new verifier usage
                    window.recaptchaVerifier.render().then((widgetId: any) => {
                        // grecaptcha.reset(widgetId);
                    });
                } catch (e) { }
            }
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        if (!otp || otp.length < 6) {
            setError('Enter valid 6-digit OTP');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await confirmationResult.confirm(otp);
            setStep('verified');
            onVerifySuccess(phoneNumber);
        } catch (err: any) {
            console.error('Verify Error:', err);
            setError('Invalid Code. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleChangeNumber = () => {
        setStep('input');
        setOtp('');
        setError('');
        setConfirmationResult(null);
    };

    if (step === 'verified') {
        return (
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-200 dark:border-green-800 flex items-center justify-between animate-in fade-in">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-800 flex items-center justify-center">
                        <IconCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-green-800 dark:text-green-300">Verified Number</p>
                        <p className="text-xs text-green-600 dark:text-green-400">{phoneNumber}</p>
                    </div>
                </div>
                <button
                    onClick={handleChangeNumber}
                    className="text-xs text-green-700 underline hover:text-green-800"
                >
                    Change
                </button>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-surface-dark p-6 rounded-xl border border-gray-200 dark:border-gray-700 space-y-4">
            {/* Invisible Recaptcha Container */}
            <div id="recaptcha-container"></div>

            {step === 'input' ? (
                <div className="space-y-3">
                    <label className="block text-xs font-bold uppercase text-gray-500">Verify Phone for COD</label>
                    <div className="flex gap-2">
                        <div className="relative flex-grow">
                            <input
                                type="tel"
                                value={phoneNumber}
                                onChange={(e) => {
                                    setPhoneNumber(e.target.value);
                                    onPhoneChange?.(e.target.value);
                                }}
                                className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 pl-10 outline-none focus:border-primary"
                                placeholder="98765 43210"
                            />
                            <IconPhone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <span className="absolute left-10 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium pr-1 border-r border-gray-300 dark:border-gray-600 mr-2 h-4 flex items-center">
                                +91
                            </span>
                        </div>
                        <button
                            onClick={handleSendOtp}
                            disabled={loading}
                            className="bg-black dark:bg-white text-white dark:text-black px-4 rounded-xl font-bold text-sm whitespace-nowrap disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Get OTP'}
                        </button>
                    </div>
                    <p className="text-[10px] text-gray-400 text-center">
                        <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                        Secured by Google Verification
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <label className="text-xs font-bold uppercase text-gray-500">Enter Verification Code</label>
                        <button onClick={handleChangeNumber} className="text-xs text-primary flex items-center gap-1">
                            <Edit2 className="w-3 h-3" /> Edit Number
                        </button>
                    </div>

                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 text-center tracking-widest font-bold text-lg outline-none focus:border-primary"
                            placeholder="123456"
                            maxLength={6}
                        />
                    </div>

                    <div className="flex justify-between items-center">
                        <span className="text-[10px] text-gray-400">Google sent SMS to {phoneNumber}</span>

                        <button
                            onClick={handleVerifyOtp}
                            disabled={loading}
                            className="bg-primary hover:bg-green-700 text-white px-6 py-2 rounded-lg font-bold text-sm flex items-center gap-2"
                        >
                            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                            Verify
                        </button>
                    </div>
                </div>
            )}

            {error && (
                <p className="text-red-500 text-xs flex items-center gap-1 bg-red-50 p-2 rounded">
                    ⚠️ {error}
                </p>
            )}
        </div>
    );
};
