import React from 'react';
import { Order } from '../types';
import { MoreHorizontal } from 'lucide-react';

interface RecentOrdersProps {
  orders: Order[];
  onOrderClick: (order: Order) => void;
}

const RecentOrders: React.FC<RecentOrdersProps> = ({ orders, onOrderClick }) => {
  return (
    <div className="bg-panel rounded-xl p-6 shadow-sm border border-muted/10">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-bold text-text">Recent Orders</h3>
        <button className="text-muted hover:text-text transition-colors"><MoreHorizontal size={18}/></button>
      </div>

      <div className="space-y-4">
        {orders.map((order) => (
          <div 
            key={order.id} 
            className="flex items-center justify-between group cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 p-2 -mx-2 rounded-lg transition-colors"
            onClick={() => onOrderClick(order)}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                <img src={order.productImage} alt={order.productName} className="w-full h-full object-cover" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-text line-clamp-1 max-w-[120px]">{order.productName}</span>
                <span className="text-[11px] text-muted">{order.time}</span>
              </div>
            </div>
            <span className="text-sm font-semibold text-text">${order.price}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentOrders;