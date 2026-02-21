export interface Product {
  id: string;
  name: string;
  image: string;
  price: number;
  orders: number;
  stock: number;
  amount: number;
}

export interface Order {
  id: string;
  productName: string;
  productImage: string;
  time: string;
  price: number;
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

export type Theme = 'light' | 'dark';
