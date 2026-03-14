import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Store, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import SmartSetupWizard from '../components/onboarding/SmartSetupWizard';
import AIReviewScreen from '../components/onboarding/AIReviewScreen';
import { SmartSetupResult } from '../lib/ai';

type OnboardingStep = 'welcome' | 'ai-setup' | 'ai-review' | 'finishing';

export default function Onboarding() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
    const [aiResult, setAiResult] = useState<SmartSetupResult | null>(null);

    const completeOnboarding = async (finalData?: SmartSetupResult) => {
        setLoading(true);
        setCurrentStep('finishing');
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            // Mark seller as active
            const { error: sellerError } = await supabase
                .from('sellers')
                .update({ status: 'active' })
                .eq('id', user.id);

            if (sellerError) throw sellerError;

            // If we have AI data, upsert it into store_settings
            if (finalData) {
                // Fetch existing settings (if any exist) to avoid overwriting everything
                const { data: existingSettings } = await supabase
                    .from('store_settings')
                    .select('*')
                    .eq('seller_id', user.id)
                    .maybeSingle();

                const defaultHero = {
                    badge_text: 'New Collection 2024',
                    headline_1: 'Elevate Your',
                    headline_2: 'Everyday',
                    headline_3: finalData.categories?.[0] || 'Style',
                    description: finalData.storeDescription,
                    image_url: '',
                    button_text: 'Shop Collection'
                };

                const payload = {
                    seller_id: user.id,
                    store_name: existingSettings?.store_name || 'My Store',
                    business_type: finalData.categories?.join(', ') || existingSettings?.business_type || 'Retail Store',
                    hero: existingSettings?.hero ? { ...existingSettings.hero, description: finalData.storeDescription } : defaultHero,
                };

                if (existingSettings?.id) {
                    await supabase
                        .from('store_settings')
                        .update(payload)
                        .eq('id', existingSettings.id);
                } else {
                    await supabase
                        .from('store_settings')
                        .insert([payload]);
                }
            }

            toast.success("Welcome aboard!");
            navigate('/dashboard', { replace: true });
        } catch (err: any) {
            toast.error(err.message || "Failed to complete onboarding");
            setCurrentStep('welcome'); // Revert back on error
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            {currentStep === 'welcome' && (
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center space-y-6 animate-fade-in-up">
                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                        <Store className="w-8 h-8 text-emerald-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold font-heading text-gray-900 mb-2">Welcome to VendorFlow!</h1>
                        <p className="text-gray-600">Your seller account is approved and ready. Before we drop you into the dashboard, let's optimize your new store's look and feel.</p>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-4 text-left space-y-4 border border-gray-100">
                        <h3 className="font-semibold text-gray-900 text-sm uppercase tracking-wider">Next Steps</h3>
                        <div className="flex items-start gap-3 text-sm text-gray-700">
                            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                            <div>
                                <span className="font-medium text-gray-900 block">AI Smart Setup</span>
                                <span className="text-gray-500">Automatically generate your store's description, categories, and SEO data using AI.</span>
                            </div>
                        </div>
                    </div>

                    <div className="pt-2 flex flex-col space-y-3">
                        <button
                            onClick={() => setCurrentStep('ai-setup')}
                            className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white font-semibold py-3 px-4 rounded-xl hover:bg-purple-700 transition"
                        >
                            Start AI Setup <ArrowRight className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => completeOnboarding()}
                            disabled={loading}
                            className="w-full py-3 border border-gray-200 text-gray-600 hover:bg-gray-50 font-semibold rounded-xl transition disabled:opacity-50"
                        >
                            Skip to Dashboard
                        </button>
                    </div>
                </div>
            )}

            {currentStep === 'ai-setup' && (
                <div className="w-full max-w-md animate-fade-in-up">
                    <SmartSetupWizard
                        onComplete={(data) => {
                            setAiResult(data);
                            setCurrentStep('ai-review');
                        }}
                        onSkip={() => completeOnboarding()}
                    />
                </div>
            )}

            {currentStep === 'ai-review' && aiResult && (
                <div className="w-full max-w-2xl animate-fade-in-up">
                    <AIReviewScreen
                        initialData={aiResult}
                        onDiscard={() => completeOnboarding()}
                        onAccept={(data) => completeOnboarding(data)}
                    />
                </div>
            )}

            {currentStep === 'finishing' && (
                <div className="flex flex-col items-center justify-center space-y-4">
                    <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
                    <p className="text-gray-600 font-medium animate-pulse">Setting up your store...</p>
                </div>
            )}
        </div>
    );
}
