// ============================================
// Simplified E-commerce Schema Types
// ============================================

// Product (main entity)
export interface Product {
  id: string;
  name: string;
  description?: string;
  category?: string[];
  price: number;
  discount_price?: number;
  is_active: boolean;
  has_variants: boolean;
  status?: 'active' | 'pending' | 'rejected' | 'draft';
  created_at: string;
  updated_at: string;
  // Virtual / Joined fields for UI convenience
  image?: string;
  images?: string[]; // Kept for backward compat in some places, but prefer media below
  media?: ProductMedia[];
  stock_quantity?: number;
  stock?: number; // Virtual for UI
  orders?: number; // Virtual for UI
  amount?: number; // Virtual for UI
  low_stock_threshold?: number;
  allow_out_of_stock_orders?: boolean;
  variants?: ProductVariant[];
}

// Product Variant (only if has_variants = true)
export interface ProductVariant {
  id: string;
  product_id: string;
  variant_name: string;
  price_override?: number;
  stock_quantity: number;
  created_at: string;
}

// Product Stock (1:1 with products)
export interface ProductStock {
  product_id: string;
  track_stock: boolean;
  stock_quantity: number;
  low_stock_threshold: number;
  allow_out_of_stock_orders: boolean;
  updated_at: string;
}

// Product Media (images and videos)
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

// Order (reference for stock updates)
export interface Order {
  id: string;
  productName: string;
  productImage: string;
  customerName: string;
  customerEmail: string;
  customerAddress: string;
  price: number;
  time: string;
  status: string;
  created_at?: string;
}

export type Theme = 'light' | 'dark';

// ============================================
// Dashboard Types (unchanged)
// ============================================

export interface ChartDataPoint {
  name: string;
  value: number;
  sales?: number;
  target?: number;
}

export interface ChartData {
  name: string;
  value: number;
}

export interface DonutData {
  name: string;
  value: number;
  color: string;
}
