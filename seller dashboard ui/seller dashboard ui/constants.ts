import { ChartData, DonutData, Order, Product } from './types';

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

export const TOP_PRODUCTS: Product[] = [
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
  },
];

export const RECENT_ORDERS: Order[] = [
  { id: 'o1', productName: 'Nike Revolution 3', productImage: 'https://picsum.photos/seed/nike1/64/64', time: 'just now', price: 250 },
  { id: 'o2', productName: 'Round Neck Grey T-Shirt', productImage: 'https://picsum.photos/seed/grey/64/64', time: '2 mins ago', price: 99 },
  { id: 'o3', productName: 'Polo Multicolor T-Shirt', productImage: 'https://picsum.photos/seed/polo/64/64', time: '15 mins ago', price: 139 },
  { id: 'o4', productName: 'Green Plain T-shirt', productImage: 'https://picsum.photos/seed/tshirt/64/64', time: '19 mins ago', price: 79 },
  { id: 'o5', productName: 'Nike Revolution 3', productImage: 'https://picsum.photos/seed/nike1/64/64', time: '25 mins ago', price: 250 },
  { id: 'o6', productName: 'Nike Dunk Shoes', productImage: 'https://picsum.photos/seed/dunk/64/64', time: '1 hour ago', price: 579 },
];

export const DONUT_DATA: DonutData[] = [
  { name: 'Online orders', value: 70, color: 'var(--donut-online)' },
  { name: 'Store orders', value: 30, color: 'var(--donut-store)' },
];