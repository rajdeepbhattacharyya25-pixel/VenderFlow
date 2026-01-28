import React, { useState } from 'react';
import { 
  IconShoppingBag, IconTruck, IconChevronRight, IconArrowLeft, IconMapPin, IconCreditCard, IconBell, IconFilter
} from './Icons';
import { Product } from '../types';
import { products } from '../data';

interface OrdersProps {
  onNavigate: (view: any) => void;
  onAddToCart: (product: Product, size?: string) => void;
  showToast: (message: string) => void;
}

// Extended Order Types
interface OrderItem {
  name: string;
  qty: number;
  price: number;
  image: string;
  size: string;
  id: number;
}

interface Order {
  id: string;
  date: string;
  status: 'Processing' | 'Delivered' | 'Cancelled';
  total: string;
  subtotal: string;
  shipping: string;
  tax: string;
  address: string;
  paymentMethod: string;
  items: OrderItem[];
}

export const Orders: React.FC<OrdersProps> = ({ onNavigate, onAddToCart, showToast }) => {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderFilter, setOrderFilter] = useState<'All' | 'Processing' | 'Delivered' | 'Cancelled'>('All');
  const [orderSort, setOrderSort] = useState<'Newest' | 'Oldest'>('Newest');

  // Mock Orders Data
  const orders: Order[] = [
    { 
      id: '#FS-2934', 
      date: 'Oct 12, 2024', 
      status: 'Delivered', 
      total: '$124.50',
      subtotal: '$110.00',
      shipping: '$5.00',
      tax: '$9.50',
      address: '123 Fashion Ave, Apt 4B, New York, NY 10001',
      paymentMethod: 'Visa ending in 4242',
      items: [
        { id: 1, name: 'Premium Cotton Tee', qty: 2, price: 24.50, image: products[0].image, size: 'M' },
        { id: 7, name: 'Classic Piqué Polo', qty: 1, price: 27.25, image: products[6].image, size: 'L' }
      ] 
    },
    { 
      id: '#FS-2811', 
      date: 'Sep 28, 2024', 
      status: 'Processing', 
      total: '$45.00',
      subtotal: '$40.00',
      shipping: '$0.00',
      tax: '$5.00',
      address: '123 Fashion Ave, Apt 4B, New York, NY 10001',
      paymentMethod: 'Mastercard ending in 8888',
      items: [
        { id: 2, name: 'Oxford Formal Shirt', qty: 1, price: 45.00, image: products[1].image, size: 'L' }
      ]
    },
    { 
      id: '#FS-2100', 
      date: 'Aug 15, 2024', 
      status: 'Cancelled', 
      total: '$89.00',
      subtotal: '$80.00',
      shipping: '$0.00',
      tax: '$9.00',
      address: '456 Tech Blvd, San Francisco, CA 94105',
      paymentMethod: 'PayPal',
      items: [
        { id: 102, name: 'Structured Tote Bag', qty: 1, price: 89.00, image: products[0].image, size: 'One Size' } // Using product 0 image as placeholder if needed
      ]
    },
  ];

  // Filter and Sort Orders
  const filteredOrders = orders.filter(order => orderFilter === 'All' || order.status === orderFilter);
  const sortedOrders = [...filteredOrders].sort((a, b) => {
      // Mock sort based on date string comparison/logic
      return orderSort === 'Newest' ? 0 : 1; 
  });

  const handleBuyAgain = (order: Order) => {
      order.items.forEach(item => {
          // Construct a partial product object to satisfy the interface or fetch real product
          const product = products.find(p => p.id === item.id) || {
              id: item.id,
              name: item.name,
              price: item.price,
              image: item.image,
              sizes: ['S', 'M', 'L'], // Fallback
              category: 'Reorder',
              rating: 5,
              reviews: 0
          };
          onAddToCart(product as Product, item.size);
      });
      showToast("All items added to your bag");
  };

  const handleDownloadInvoice = () => {
      showToast("Invoice downloading...");
  };

  // --- ORDER DETAILS VIEW ---
  if (selectedOrder) {
      return (
          <div className="max-w-4xl mx-auto px-4 md:px-8 pt-8 pb-24 animate-in slide-in-from-right-4 duration-300">
              <button 
                  onClick={() => setSelectedOrder(null)}
                  className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-primary dark:text-gray-400 dark:hover:text-white mb-6 transition-colors"
              >
                  <IconArrowLeft className="w-4 h-4" /> Back to Orders
              </button>

              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                  <div>
                      <div className="flex items-center gap-3 mb-1">
                          <h1 className="text-2xl md:text-3xl font-display font-bold text-gray-900 dark:text-white">Order {selectedOrder.id}</h1>
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wide 
                            ${selectedOrder.status === 'Delivered' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 
                              selectedOrder.status === 'Processing' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : 
                              'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                            {selectedOrder.status}
                          </span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Placed on {selectedOrder.date}</p>
                  </div>
                  <div className="flex gap-3">
                      <button 
                          onClick={handleDownloadInvoice}
                          className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                          Download Invoice
                      </button>
                      <button 
                          onClick={() => handleBuyAgain(selectedOrder)}
                          className="px-6 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-green-900 transition-colors shadow-sm"
                      >
                          Buy Again
                      </button>
                  </div>
              </div>

              <div className="grid md:grid-cols-3 gap-8">
                  {/* Left Column: Items & Address */}
                  <div className="md:col-span-2 space-y-8">
                      {/* Items List */}
                      <div className="bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm">
                          <div className="p-4 border-b border-gray-100 dark:border-gray-700 font-bold text-gray-900 dark:text-white flex justify-between items-center">
                              <span>Items in Order</span>
                              <span className="text-sm font-normal text-gray-500 dark:text-gray-400">{selectedOrder.items.length} Items</span>
                          </div>
                          <div className="divide-y divide-gray-100 dark:divide-gray-700">
                              {selectedOrder.items.map((item, idx) => (
                                  <div key={idx} className="p-4 flex gap-4">
                                      <div className="w-20 h-24 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden shrink-0">
                                          <img src={item.image} alt={item.name} className="w-full h-full object-cover mix-blend-multiply dark:mix-blend-normal" />
                                      </div>
                                      <div className="flex-grow">
                                          <div className="flex justify-between items-start mb-1">
                                              <h4 className="font-bold text-gray-900 dark:text-white text-sm">{item.name}</h4>
                                              <span className="font-bold text-gray-900 dark:text-white text-sm">${item.price.toFixed(2)}</span>
                                          </div>
                                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Size: {item.size}</p>
                                          <span className="text-xs font-medium bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-600 dark:text-gray-300">Qty: {item.qty}</span>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>

                      {/* Delivery & Payment */}
                      <div className="grid sm:grid-cols-2 gap-6">
                          <div className="bg-white dark:bg-surface-dark p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                              <h4 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                  <IconMapPin className="w-4 h-4 text-gray-400" /> Delivery Address
                              </h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{selectedOrder.address}</p>
                          </div>
                          <div className="bg-white dark:bg-surface-dark p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                              <h4 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                  <IconCreditCard className="w-4 h-4 text-gray-400" /> Payment Method
                              </h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400">{selectedOrder.paymentMethod}</p>
                          </div>
                      </div>
                  </div>

                  {/* Right Column: Summary */}
                  <div className="space-y-6">
                      <div className="bg-gray-50 dark:bg-surface-dark p-6 rounded-2xl border border-gray-200 dark:border-gray-700">
                          <h4 className="font-bold text-gray-900 dark:text-white mb-4">Order Summary</h4>
                          <div className="space-y-3 text-sm border-b border-gray-200 dark:border-gray-700 pb-4 mb-4">
                              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                                  <span>Subtotal</span>
                                  <span>{selectedOrder.subtotal}</span>
                              </div>
                              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                                  <span>Shipping</span>
                                  <span>{selectedOrder.shipping}</span>
                              </div>
                              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                                  <span>Tax</span>
                                  <span>{selectedOrder.tax}</span>
                              </div>
                          </div>
                          <div className="flex justify-between items-center font-bold text-lg text-gray-900 dark:text-white">
                              <span>Total</span>
                              <span>{selectedOrder.total}</span>
                          </div>
                      </div>

                      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl text-xs text-blue-800 dark:text-blue-300 leading-relaxed flex gap-3">
                          <IconBell className="w-4 h-4 shrink-0 mt-0.5" />
                          <p>Order updates are sent to your email and phone number registered with this account.</p>
                      </div>
                  </div>
              </div>
          </div>
      );
  }

  // --- ORDERS LIST VIEW ---
  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 pt-8 pb-24 animate-in slide-in-from-bottom-4 duration-500">
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
             <h2 className="text-xl font-bold font-display text-gray-900 dark:text-white flex items-center gap-2 transition-colors">
               <IconShoppingBag className="w-5 h-5 text-primary dark:text-primary-light" /> My Orders
             </h2>
             
             {/* Filters */}
             <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 hide-scroll">
                {['All', 'Processing', 'Delivered', 'Cancelled'].map(filter => (
                    <button 
                        key={filter}
                        onClick={() => setOrderFilter(filter as any)}
                        className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
                            orderFilter === filter 
                            ? 'bg-gray-900 dark:bg-white text-white dark:text-black border-gray-900 dark:border-white shadow-md' 
                            : 'bg-white dark:bg-surface-dark text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-gray-400'
                        }`}
                    >
                        {filter}
                    </button>
                ))}
             </div>
          </div>

          <div className="space-y-4">
            {sortedOrders.length > 0 ? (
                sortedOrders.map((order) => (
                    <div 
                        key={order.id} 
                        className="bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-700 rounded-2xl p-5 hover:shadow-md transition-all cursor-pointer group"
                        onClick={() => setSelectedOrder(order)}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white text-lg">{order.id}</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{order.date}</p>
                            </div>
                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide 
                                ${order.status === 'Delivered' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 
                                order.status === 'Processing' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : 
                                'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                                {order.status}
                            </span>
                        </div>

                        {/* Product Thumbnails Row */}
                        <div className="flex gap-2 mb-4 overflow-x-auto hide-scroll py-2">
                            {order.items.map((item, i) => (
                                <div key={i} className="w-14 h-14 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 flex items-center justify-center shrink-0 p-1">
                                    <img src={item.image} alt="" className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal opacity-90" />
                                </div>
                            ))}
                        </div>
                        
                        <div className="flex justify-between items-end border-t border-gray-50 dark:border-gray-700 pt-3">
                            <div className="text-sm">
                                <span className="text-gray-500 dark:text-gray-400">{order.items.length} items</span>
                                <span className="mx-2 text-gray-300 dark:text-gray-600">|</span>
                                <span className="font-bold text-gray-900 dark:text-white">{order.total}</span>
                            </div>
                            <button className="px-4 py-2 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-bold hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group-hover:bg-primary group-hover:text-white dark:group-hover:bg-primary dark:group-hover:text-white">
                                View Details
                            </button>
                        </div>
                    </div>
                ))
            ) : (
                <div className="bg-gray-50 dark:bg-surface-dark rounded-2xl p-8 text-center border border-dashed border-gray-200 dark:border-gray-700">
                    <div className="w-12 h-12 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
                        <IconShoppingBag className="w-5 h-5 text-gray-400" />
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-4">No orders found in this category.</p>
                    <button onClick={() => onNavigate('home')} className="text-primary dark:text-primary-light text-xs font-bold uppercase tracking-wide hover:underline">Start Shopping</button>
                </div>
            )}
          </div>
        </section>
    </div>
  );
};