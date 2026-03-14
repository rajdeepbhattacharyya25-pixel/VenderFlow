import { supabase } from './supabase';

export interface SmartSetupResult {
    storeDescription: string;
    categories: string[];
    seoTags: string[];
}

export interface AIProductResult {
    description: string;
    suggestedCategory: string;
    tags: string[];
}

export async function generateSmartSetup(keywords: string, businessType: string): Promise<SmartSetupResult> {
    const { data, error } = await supabase.functions.invoke('ai-smart-setup', {
        body: { type: 'store', keywords, businessType },
    });

    if (error) {
        console.error("AI Smart Setup Error:", error);
        throw new Error(error.message || "Failed to generate AI setup");
    }

    return data as SmartSetupResult;
}

export async function generateProductAI(name: string, keywords: string, category: string): Promise<AIProductResult> {
    const { data, error } = await supabase.functions.invoke('ai-smart-setup', {
        body: { type: 'product', name, keywords, category },
    });

    if (error) {
        console.error("AI Product Generation Error:", error);
        throw new Error(error.message || "Failed to generate product info");
    }

    return data as AIProductResult;
}
