export interface Product {
    id: string;
    name: string;
    description?: string;
    category?: string[];
    price?: number;
    image?: string;
    tags?: string[];
    indexing_status?: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface QueueItem {
    id: string;
    product_id: string;
    retry_count: number;
    process_after: string;
    last_error?: string;
    products?: Product;
}

export interface AIReviewResult {
    summary: string;
    themes: string[];
    sentiment: 'positive' | 'mixed' | 'negative';
}

export interface AISuccessAudit {
    score: number;
    tips: string[];
    optimized: {
        name: string;
        description: string;
        tags: string[];
    };
}

export interface AIAnalyticsInsight {
    summary: string;
    strengths: string[];
    weaknesses: string[];
    recommendations: {
        title: string;
        action: string;
        impact: 'high' | 'medium' | 'low';
    }[];
}
