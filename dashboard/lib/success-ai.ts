import { supabase } from '../../lib/supabase';

export interface AuditResult {
    score: number;
    tips: string[];
    optimized: {
        name: string;
        description: string;
        tags: string[];
    };
    isUpgradeRequired?: boolean;
    error?: string;
}

/**
 * Calculates an instant, heuristic "Success Score" locally
 * to provide immediate feedback without API costs.
 */
export function calculateLocalScore(product: {
    name: string;
    description: string;
    category: string;
    hasImages: boolean;
    hasVariants: boolean;
    price: number;
}): number {
    let score = 0;

    // 1. Name Analysis (0-20)
    if (product.name.length > 5 && product.name.length < 50) score += 20;
    else if (product.name.length > 0) score += 10;

    // 2. Description Analysis (0-30)
    if (product.description.length > 100) score += 30;
    else if (product.description.length > 20) score += 15;

    // 3. Categorization (0-10)
    if (product.category && product.category !== 'uncategorized') score += 10;

    // 4. Visual Impact (0-20)
    if (product.hasImages) score += 20;

    // 5. Complexity/Options (0-10)
    if (product.hasVariants) score += 10;

    // 6. Pricing (0-10)
    if (product.price > 0) score += 10;

    return Math.min(score, 100);
}

/**
 * Triggers a deep AI audit via Supabase Edge Functions
 */
export async function runDeepAudit(
    sellerId: string,
    productData: {
        name: string;
        description: string;
        category: string;
        tags: string[];
    }
): Promise<AuditResult> {
    const { data, error } = await supabase.functions.invoke('seller-success-audit', {
        body: { sellerId, productData },
    });

    if (error) {
        // Handle plan-based 403 explicitly
        if (error.message?.includes('403')) {
            return {
                score: 0,
                tips: [],
                optimized: { name: '', description: '', tags: [] },
                isUpgradeRequired: true,
                error: "Deeper optimization is only available for Pro and Premium plans."
            };
        }
        throw new Error(error.message || "Failed to run deep audit");
    }

    return data as AuditResult;
}
