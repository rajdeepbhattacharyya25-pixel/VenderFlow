import React, { useState, useEffect } from 'react';
import { X, Cookie } from 'lucide-react';

export default function CookieConsent() {
    const [isVisible, setIsVisible] = useState(false);
    const [showPreferences, setShowPreferences] = useState(false);

    // Consent categories
    const [necessary, setNecessary] = useState(true); // Always true, cannot be disabled
    const [analytics, setAnalytics] = useState(false);
    const [marketing, setMarketing] = useState(false);

    useEffect(() => {
        // Check if user has already made a choice
        const consent = localStorage.getItem('cookie_consent');
        if (!consent) {
            setIsVisible(true);
        } else {
            try {
                const parsed = JSON.parse(consent);
                setAnalytics(parsed.analytics || false);
                setMarketing(parsed.marketing || false);
            } catch (e) {
                setIsVisible(true);
            }
        }
    }, []);

    const handleAcceptAll = () => {
        const consent = { necessary: true, analytics: true, marketing: true, timestamp: new Date().toISOString() };
        localStorage.setItem('cookie_consent', JSON.stringify(consent));
        setIsVisible(false);
        // Here you would initialize Google Analytics, Meta Pixel, etc.
    };

    const handleRejectAll = () => {
        // Only necessary cookies are allowed
        const consent = { necessary: true, analytics: false, marketing: false, timestamp: new Date().toISOString() };
        localStorage.setItem('cookie_consent', JSON.stringify(consent));
        setIsVisible(false);
    };

    const handleSavePreferences = () => {
        const consent = { necessary: true, analytics, marketing, timestamp: new Date().toISOString() };
        localStorage.setItem('cookie_consent', JSON.stringify(consent));
        setIsVisible(false);
        setShowPreferences(false);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-0 right-0 z-50 p-4 font-sans w-full sm:p-6 sm:max-w-md">
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl rounded-2xl p-5 overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-300">

                {!showPreferences ? (
                    <>
                        <div className="flex items-start gap-4 mb-4">
                            <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-full shrink-0">
                                <Cookie className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mb-1">
                                    We value your privacy
                                </h3>
                                <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                                    We use essential cookies to make our site work. We'd also like to use optional cookies for analytics and personalized content to improve your experience.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2 mt-5">
                            <button
                                onClick={handleAcceptAll}
                                className="w-full sm:flex-1 py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors"
                            >
                                Accept All
                            </button>
                            <button
                                onClick={handleRejectAll}
                                className="w-full sm:flex-1 py-2 px-4 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white text-xs font-semibold rounded-lg transition-colors border border-transparent dark:border-neutral-700"
                            >
                                Reject Non-Essential
                            </button>
                        </div>
                        <div className="mt-3 text-center">
                            <button
                                onClick={() => setShowPreferences(true)}
                                className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
                            >
                                Customize Preferences
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="flex items-center justify-between mb-4 pb-3 border-b border-neutral-100 dark:border-neutral-800">
                            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">Cookie Preferences</h3>
                            <button onClick={() => setShowPreferences(false)} className="text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-4 mb-5 max-h-60 overflow-y-auto pr-1">
                            <div className="flex items-start justify-between">
                                <div className="pr-4">
                                    <h4 className="text-xs font-semibold text-neutral-900 dark:text-white mb-0.5">Strictly Necessary</h4>
                                    <p className="text-[10px] text-neutral-500 dark:text-neutral-400">Required for the website to function correctly (e.g., cart, authentication, theme). Cannot be disabled.</p>
                                </div>
                                <div className="relative inline-block w-8 shrink-0 select-none align-middle mt-1">
                                    <input type="checkbox" checked={true} readOnly className="sr-only" />
                                    <div className="block h-4 w-7 rounded-full bg-emerald-600 opacity-60"></div>
                                    <div className="absolute top-0.5 left-[14px] h-3 w-3 rounded-full bg-white transition-transform"></div>
                                </div>
                            </div>

                            <div className="flex items-start justify-between">
                                <div className="pr-4">
                                    <h4 className="text-xs font-semibold text-neutral-900 dark:text-white mb-0.5">Analytics & Performance</h4>
                                    <p className="text-[10px] text-neutral-500 dark:text-neutral-400">Helps us understand how visitors interact with the site by collecting and reporting information anonymously.</p>
                                </div>
                                <label className="relative inline-block w-8 shrink-0 cursor-pointer select-none align-middle mt-1">
                                    <input type="checkbox" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} className="peer sr-only" />
                                    <div className="block h-4 w-7 rounded-full bg-neutral-200 dark:bg-neutral-700 peer-checked:bg-emerald-600 transition-colors"></div>
                                    <div className="absolute top-0.5 left-0.5 h-3 w-3 rounded-full bg-white transition-transform peer-checked:translate-x-3 shadow-sm"></div>
                                </label>
                            </div>

                            <div className="flex items-start justify-between">
                                <div className="pr-4">
                                    <h4 className="text-xs font-semibold text-neutral-900 dark:text-white mb-0.5">Marketing & Advertising</h4>
                                    <p className="text-[10px] text-neutral-500 dark:text-neutral-400">Used to deliver advertisements more relevant to you and your interests across different platforms.</p>
                                </div>
                                <label className="relative inline-block w-8 shrink-0 cursor-pointer select-none align-middle mt-1">
                                    <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} className="peer sr-only" />
                                    <div className="block h-4 w-7 rounded-full bg-neutral-200 dark:bg-neutral-700 peer-checked:bg-emerald-600 transition-colors"></div>
                                    <div className="absolute top-0.5 left-0.5 h-3 w-3 rounded-full bg-white transition-transform peer-checked:translate-x-3 shadow-sm"></div>
                                </label>
                            </div>
                        </div>

                        <button
                            onClick={handleSavePreferences}
                            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors"
                        >
                            Save Preferences
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
