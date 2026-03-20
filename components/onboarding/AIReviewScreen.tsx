import React, { useState } from 'react';
import { SmartSetupResult } from '../../lib/ai';
import { Check, Edit3, Type, Tag } from 'lucide-react';

interface AIReviewScreenProps {
    initialData: SmartSetupResult;
    onAccept: (data: SmartSetupResult) => void;
    onDiscard: () => void;
}

export default function AIReviewScreen({ initialData, onAccept, onDiscard }: AIReviewScreenProps) {
    const [data, setData] = useState<SmartSetupResult>(initialData);

    const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setData((prev) => ({ ...prev, storeDescription: e.target.value }));
    };

    const handleCategoriesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const cats = e.target.value.split(',').map((c) => c.trim());
        setData((prev) => ({ ...prev, categories: cats }));
    };

    const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const tags = e.target.value.split(',').map((t) => t.trim());
        setData((prev) => ({ ...prev, seoTags: tags }));
    };

    const handleSave = () => {
        // Filter out top-level empty strings
        const cleanedData = {
            ...data,
            categories: data.categories.filter((c) => c),
            seoTags: data.seoTags.filter((t) => t),
        };
        onAccept(cleanedData);
    };

    return (
        <div className="max-w-2xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 animate-fade-in-up">
            <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-600 dark:text-green-400">
                    <Check className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Review AI Content</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Feel free to tweak anything before publishing.</p>
                </div>
            </div>

            <div className="space-y-6">
                <div className="space-y-2">
                    <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
                        <Type className="w-4 h-4 mr-2 text-teal-500" />
                        Store Description
                    </label>
                    <textarea
                        value={data.storeDescription}
                        onChange={handleDescriptionChange}
                        rows={4}
                        className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 bg-gray-50 dark:bg-gray-700/50 dark:text-white transition-all text-sm"
                    />
                </div>

                <div className="space-y-2">
                    <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
                        <Tag className="w-4 h-4 mr-2 text-blue-500" />
                        Suggested Categories
                    </label>
                    <input
                        type="text"
                        value={data.categories.join(', ')}
                        onChange={handleCategoriesChange}
                        className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 bg-gray-50 dark:bg-gray-700/50 dark:text-white transition-all text-sm"
                    />
                    <p className="text-xs text-gray-400">Comma separated. E.g. Necklaces, Rings, Bracelets</p>
                </div>

                <div className="space-y-2">
                    <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
                        <Tag className="w-4 h-4 mr-2 text-emerald-500" />
                        SEO Tags
                    </label>
                    <input
                        type="text"
                        value={data.seoTags.join(', ')}
                        onChange={handleTagsChange}
                        className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 bg-gray-50 dark:bg-gray-700/50 dark:text-white transition-all text-sm"
                    />
                </div>
            </div>

            <div className="mt-8 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-3">
                <button
                    onClick={onDiscard}
                    className="mt-3 sm:mt-0 px-6 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                    Discard
                </button>
                <button
                    onClick={handleSave}
                    className="flex items-center justify-center px-6 py-2.5 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-all shadow-md shadow-teal-500/20"
                >
                    <Edit3 className="w-4 h-4 mr-2" />
                    Looks Good, Save
                </button>
            </div>
        </div>
    );
}
