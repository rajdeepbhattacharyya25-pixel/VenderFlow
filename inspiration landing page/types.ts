export interface Product {
  id: number;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  description?: string;
  badge?: {
    text: string;
    color: string; // Tailwind color class or hex
    bg: string;
  };
  rating: number;
  reviews: number;
  sizes: string[];
  category: string;
}

export interface NavLink {
  label: string;
  href: string;
}