import React, { useState } from 'react';
import { Loader2, Sparkles, Wand2 } from 'lucide-react';
import { generateSmartSetup, SmartSetupResult } from '../../lib/ai';

interface SmartSetupWizardProps {
    onComplete: (result: SmartSetupResult) => void;
    onSkip: () => void;
}

export default function SmartSetupWizard({ onComplete, onSkip }: SmartSetupWizardProps) {
    const [keywords, setKeywords] = useState('');
    const [businessType, setBusinessType] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleGenerate = async () => {
        if (!keywords.trim() || !businessType.trim()) {
            setError('Please provide both keywords and business type.');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const result = await generateSmartSetup(keywords, businessType);
            onComplete(result);
        } catch (err: any) {
            setError(err.message || 'Failed to generate store setup. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700">
            <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full mb-4">
                    <Wand2 className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">AI Smart Setup</h2>
                <p className="text-gray-600 dark:text-gray-300">
                    Let our AI generate your store description, categories, and SEO tags instantly.
                </p>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Business Type / Category
                    </label>
                    <input
                        type="text"
                        placeholder="e.g. Handmade Jewelry, Electronics"
                        value={businessType}
                        onChange={(e) => setBusinessType(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                        autoFocus
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Keywords (comma separated)
                    </label>
                    <input
                        type="text"
                        placeholder="e.g. artisan, silver, sustainable, rings"
                        value={keywords}
                        onChange={(e) => setKeywords(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                    />
                </div>

                {error && (
                    <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        {error}
                    </div>
                )}

                <div className="pt-4 flex flex-col space-y-3">
                    <button
                        onClick={handleGenerate}
                        disabled={isLoading}
                        className="w-full relative flex items-center justify-center space-x-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 disabled:opacity-70"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>Generating Magic...</span>
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-5 h-5" />
                                <span>Generate Setup</span>
                            </>
                        )}
                    </button>

                    <button
                        onClick={onSkip}
                        disabled={isLoading}
                        className="w-full py-3 px-6 text-gray-600 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        Skip, I'll set up manually
                    </button>
                </div>
            </div>
        </div>
    );
}
