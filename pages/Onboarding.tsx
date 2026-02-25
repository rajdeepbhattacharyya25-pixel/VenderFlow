import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Store, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Onboarding() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const completeOnboarding = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            const { error } = await supabase
                .from('sellers')
                .update({ status: 'active' })
                .eq('id', user.id);

            if (error) throw error;

            toast.success("Welcome aboard!");
            navigate('/dashboard', { replace: true });
        } catch (err: any) {
            toast.error(err.message || "Failed to complete onboarding");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center space-y-6">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                    <Store className="w-8 h-8 text-emerald-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold font-display text-gray-900 mb-2">Welcome to VenderFlow!</h1>
                    <p className="text-gray-600">Your seller account is approved and ready. Let's get your store set up to start selling.</p>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 text-left space-y-4 border border-gray-100">
                    <h3 className="font-semibold text-gray-900 text-sm uppercase tracking-wider">Next Steps in Dashboard</h3>
                    <div className="flex items-start gap-3 text-sm text-gray-700">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                        <div>
                            <span className="font-medium text-gray-900 block">Add your first product</span>
                            <span className="text-gray-500">Upload images and set prices.</span>
                        </div>
                    </div>
                    <div className="flex items-start gap-3 text-sm text-gray-700">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                        <div>
                            <span className="font-medium text-gray-900 block">Customize your storefront</span>
                            <span className="text-gray-500">Pick your theme and design.</span>
                        </div>
                    </div>
                    <div className="flex items-start gap-3 text-sm text-gray-700">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                        <div>
                            <span className="font-medium text-gray-900 block">Set up payments</span>
                            <span className="text-gray-500">Connect your bank account.</span>
                        </div>
                    </div>
                </div>

                <button
                    onClick={completeOnboarding}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white font-semibold py-3 px-4 rounded-xl hover:bg-emerald-700 transition disabled:opacity-50"
                >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                        <>Go to Dashboard <ArrowRight className="w-4 h-4" /></>
                    )}
                </button>
            </div>
        </div>
    );
}
