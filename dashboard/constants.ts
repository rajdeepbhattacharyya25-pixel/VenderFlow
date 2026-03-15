import { ChartData, DonutData } from './types';

export const EARNINGS_DATA: ChartData[] = [
  { name: 'Jan', value: 1100 },
  { name: 'Feb', value: 2600 },
  { name: 'Mar', value: 2100 },
  { name: 'Apr', value: 2900 },
  { name: 'May', value: 2400 },
  { name: 'Jun', value: 2200 },
  { name: 'Jul', value: 3800 },
  { name: 'Aug', value: 3812.19 },
  { name: 'Sep', value: 3500 },
  { name: 'Oct', value: 3000 },
  { name: 'Nov', value: 4200 },
  { name: 'Dec', value: 3800 },
];

export const WEEKLY_EARNINGS_DATA: ChartData[] = [
  { name: 'Mon', value: 420 },
  { name: 'Tue', value: 560 },
  { name: 'Wed', value: 450 },
  { name: 'Thu', value: 890 },
  { name: 'Fri', value: 1100 },
  { name: 'Sat', value: 1350 },
  { name: 'Sun', value: 1200 },
];

export const TOP_PRODUCTS = [
  {
    id: 'p1',
    name: 'Nike Revolution 3',
    image: 'https://picsum.photos/seed/nike1/64/64',
    price: 250,
    orders: 47,
    stock: 23,
    amount: 12560,
  },
  {
    id: 'p2',
    name: 'Green Plain T-shirt',
    image: 'https://picsum.photos/seed/tshirt/64/64',
    price: 79,
    orders: 98,
    stock: 7,
    amount: 2368,
  },
  {
    id: 'p3',
    name: 'Nike Dunk Shoes',
    image: 'https://picsum.photos/seed/dunk/64/64',
    price: 579,
    orders: 26,
    stock: 3,
    amount: 36987,
    category: 'Footwear',
    is_active: true,
    has_variants: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const RECENT_ORDERS = [
  { id: 'o1', productName: 'Nike Revolution 3', productImage: 'https://picsum.photos/seed/nike1/64/64', time: 'just now', price: 250, status: 'completed', customerName: 'Alex Smith', customerEmail: 'alex@example.com', customerAddress: '123 Street, City' },
  { id: 'o2', productName: 'Round Neck Grey T-Shirt', productImage: 'https://picsum.photos/seed/grey/64/64', time: '2 mins ago', price: 99, status: 'completed', customerName: 'Jordan Doe', customerEmail: 'jordan@example.com', customerAddress: '456 Lane, Town' },
  { id: 'o3', productName: 'Polo Multicolor T-Shirt', productImage: 'https://picsum.photos/seed/polo/64/64', time: '15 mins ago', price: 139, status: 'completed', customerName: 'Sam Wilson', customerEmail: 'sam@example.com', customerAddress: '789 Road, Vill' },
  { id: 'o4', productName: 'Green Plain T-shirt', productImage: 'https://picsum.photos/seed/tshirt/64/64', time: '19 mins ago', price: 79, status: 'completed', customerName: 'Chris Evans', customerEmail: 'chris@example.com', customerAddress: '321 Blvd, Capital' },
  { id: 'o5', productName: 'Nike Revolution 3', productImage: 'https://picsum.photos/seed/nike1/64/64', time: '25 mins ago', price: 250, status: 'completed', customerName: 'Alex Smith', customerEmail: 'alex@example.com', customerAddress: '123 Street, City' },
  { id: 'o6', productName: 'Nike Dunk Shoes', productImage: 'https://picsum.photos/seed/dunk/64/64', time: '1 hour ago', price: 579, status: 'completed', customerName: 'Taylor Swift', customerEmail: 'taylor@example.com', customerAddress: '1989 Album St, NY' },
];

export const DONUT_DATA: DonutData[] = [
  { name: 'Online orders', value: 70, color: 'var(--donut-online)' },
  { name: 'Store orders', value: 30, color: 'var(--donut-store)' },
];