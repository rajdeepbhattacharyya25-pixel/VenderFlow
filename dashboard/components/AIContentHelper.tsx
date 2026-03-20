import React, { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { generateProductAI, generateSmartSetup } from '../../lib/ai';

interface AIContentHelperProps {
    type: 'product' | 'store';
    context: {
        name?: string;
        keywords?: string;
        category?: string;
        businessType?: string;
    };
    onApply: (data: any) => void;
    className?: string;
}

export const AIContentHelper: React.FC<AIContentHelperProps> = ({ type, context, onApply, className }) => {
    const [loading, setLoading] = useState(false);

    const handleGenerate = async () => {
        // Validation
        if (type === 'product' && !context.name) {
            alert("Please enter a product name first so AI knows what to generate for.");
            return;
        }

        setLoading(true);
        try {
            if (type === 'product') {
                const result = await generateProductAI(
                    context.name || '',
                    context.keywords || '',
                    context.category || ''
                );
                onApply(result);
            } else {
                const result = await generateSmartSetup(
                    context.keywords || '',
                    context.businessType || context.category || ''
                );
                onApply(result);
            }
        } catch (error: any) {
            console.error(error);
            alert(`AI generation failed: ${error.message || 'Unknown error'}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            type="button"
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleGenerate();
            }}
            disabled={loading}
            className={`flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-cyan-600 text-white rounded-lg text-xs font-medium hover:from-emerald-500 hover:to-cyan-500 transition-all disabled:opacity-50 shadow-sm ${className}`}
        >
            {loading ? (
                <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Generating...</span>
                </>
            ) : (
                <>
                    <Sparkles size={14} />
                    <span>Generate with AI</span>
                </>
            )}
        </button>
    );
};
