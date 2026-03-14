import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

const StaffLogin = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        const performLogin = async () => {
            const email = searchParams.get('u');
            const password = searchParams.get('p');

            if (!email || !password) {
                setStatus('error');
                setErrorMsg('Invalid login link. Please scan the QR code again.');
                return;
            }

            try {
                // Logout current session first (optional, but safer for shared devices)
                await supabase.auth.signOut();

                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password
                });

                if (error) throw error;

                if (data.user) {
                    setStatus('success');
                    // Redirect to dashboard after short delay
                    setTimeout(() => {
                        navigate('/dashboard');
                    }, 1500);
                }
            } catch (err: any) {
                console.error('Auto-login error:', err);
                setStatus('error');
                setErrorMsg(err.message || 'Authentication failed.');
            }
        };

        performLogin();
    }, [searchParams, navigate]);

    return (
        <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-6">
            <div className="bg-panel w-full max-w-sm rounded-3xl p-8 border border-border shadow-2xl text-center">

                {status === 'verifying' && (
                    <div className="animate-in fade-in zoom-in duration-300">
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Loader2 className="animate-spin text-primary" size={32} />
                        </div>
                        <h2 className="text-xl font-bold text-text mb-2">Verifying Access...</h2>
                        <p className="text-sm text-muted">Please wait while we log you in securely.</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="animate-in fade-in zoom-in duration-300">
                        <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle2 className="text-green-500" size={32} />
                        </div>
                        <h2 className="text-xl font-bold text-text mb-2">Welcome Back!</h2>
                        <p className="text-sm text-muted">Redirecting to dashboard...</p>
                    </div>
                )}

                {status === 'error' && (
                    <div className="animate-in fade-in zoom-in duration-300">
                        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertCircle className="text-red-500" size={32} />
                        </div>
                        <h2 className="text-xl font-bold text-text mb-2">Login Failed</h2>
                        <p className="text-sm text-muted mb-6">{errorMsg}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full bg-primary text-white py-3 rounded-xl font-bold text-sm hover:brightness-110"
                        >
                            Try Again
                        </button>
                    </div>
                )}
            </div>

            <p className="mt-8 text-xs text-muted font-medium">
                VendorFlow Secure Staff Access
            </p>
        </div>
    );
};

export default StaffLogin;
