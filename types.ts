export interface ProductMedia {
  id: string;
  product_id: string;
  file_url: string;
  is_primary: boolean;
  sort_order: number;
  media_type: 'image' | 'video';
  variant_value?: string;
  created_at: string;
}

export interface Product {
    id: string;
    name: string;
    price: number;
    original_price?: number;
    discount_price?: number;
    image: string;
    images?: string[];
    media?: ProductMedia[];
    product_media?: ProductMedia[];
    product_variants?: any[];
    description?: string;
    badge?: {
        text: string;
        color: string;
        bg: string;
    };
    rating: number;
    reviews: number;
    sizes: string[];
    category: string[];
    collection?: string;
    seller_id?: string;
    stock?: number;
    stock_quantity?: number;
    status?: 'draft' | 'live';
    featured?: boolean;
    is_bestseller?: boolean;
    sales?: number;
    popularity_score?: number;
    created_at?: string;
}

export interface NavLink {
    label: string;
    href: string;
}

export interface Address {
    name: string;
    phone: string;
    street: string;
    building?: string;
    city: string;
    state?: string;
    zip: string;
}

export interface Order {
    id: string;
    seller_id: string;
    customer_id: string;
    total: number;
    status: 'pending' | 'processing' | 'packed' | 'shipped' | 'out_for_delivery' | 'delivered' | 'cancelled' | 'refunded';
    items: Array<{
        product_id: string;
        name: string;
        price: number;
        size: string;
        quantity: number;
        image: string;
    }>;
    shipping_address: Address;
    payment_method: string;
    promotion_id?: string;
    discount_amount?: number;
    created_at: string;
}

export interface Promotion {
    id: string;
    seller_id: string;
    code: string;
    type: 'percentage' | 'fixed';
    value: number;
    min_order_amount?: number;
    max_uses?: number;
    current_uses: number;
    expires_at?: string;
    is_active: boolean;
    created_at: string;
}

export interface ThemeConfig {
    colors: {
        primary: string;
        secondary: string;
        background: string;
        text: string;
    };
    fonts: {
        heading: string;
        body: string;
    };
    borderRadius: string;
    layout: {
        show_reviews: boolean;
        show_featured: boolean;
        show_hero: boolean;
    };
    hero: {
        badge_text?: string;
        headline_1?: string;
        headline_2?: string;
        headline_3?: string;
        description?: string;
        image_url?: string;
        button_text?: string;
        overlayOpacity?: number;
        title?: string;
        subtitle?: string;
        image?: string;
    };
}

export interface StoreSettings {
    id?: number;
    store_name: string;
    business_type: string;
    address: string;
    phone: string;
    currency: string;
    tax_id: string;
    bank_details: string;
    invoice_footer: string;
    tax_percentage: number;
    logo_url?: string;
    trust_badges?: { icon: string; text: string; }[];
    show_categories?: boolean;
    show_featured_section?: boolean;
    show_reviews?: boolean;
    socials: {
        instagram: string;
        facebook: string;
        twitter: string;
    };
    hero: {
        badge_text: string;
        headline_1: string;
        headline_2: string;
        headline_3: string;
        description: string;
        image_url: string;
        button_text: string;
    };
    policies: {
        [key: string]: string;
    };
    notifications: {
        low_stock_email: boolean;
        low_stock_push: boolean;
        payment_received_email: boolean;
        payment_received_push: boolean;
        daily_summary_email: boolean;
        daily_summary_push: boolean;
        overdue_bills_email: boolean;
        overdue_bills_push: boolean;
    };
    shipping_fee: number;
    free_shipping_threshold: number;
    theme_config?: ThemeConfig;
    session_timeout_minutes?: number;
    enforce_2fa?: boolean;
}

export interface PlatformSettings {
  id: string;
  commission_rate: number;
  min_payout_amount: number;
  maintenance_mode: boolean;
  announcement_message: string | null;
  session_timeout_minutes: number;
  enforce_2fa: boolean;
  max_login_attempts: number;
  created_at: string;
}