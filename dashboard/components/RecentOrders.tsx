import React from 'react';
import { Order } from '../types';
import { MoreHorizontal, Package, XCircle, ExternalLink } from 'lucide-react';

interface RecentOrdersProps {
  orders: Order[];
  onOrderClick: (order: Order) => void;
}

const RecentOrders: React.FC<RecentOrdersProps> = ({ orders, onOrderClick }) => {
  const [activeMenu, setActiveMenu] = React.useState<string | null>(null);

  const handleAction = (e: React.MouseEvent, action: string, orderId: string) => {
    e.stopPropagation();
    console.log(`Action ${action} for order ${orderId}`);
    setActiveMenu(null);
    // In a real app, trigger state update or API call here
  };
  return (
    <div className="bg-theme-panel rounded-xl p-6 shadow-sm border border-theme-border">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-bold text-theme-text">Recent Orders</h3>
        <button className="text-theme-muted hover:text-theme-text transition-colors" title="View All Orders"><MoreHorizontal size={18} /></button>
      </div>

      <div className="space-y-4">
        {orders.map((order) => (
          <div
            key={order.id}
            className="flex items-center justify-between group cursor-pointer hover:bg-theme-bg p-2 -mx-2 rounded-lg transition-colors"
            onClick={() => onOrderClick(order)}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-theme-bg overflow-hidden flex-shrink-0">
                <img src={order.productImage} alt={order.productName} className="w-full h-full object-cover" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-theme-text line-clamp-1 max-w-[120px]">{order.productName}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-theme-muted">{order.time}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium border ${order.status === 'cancelled' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                    order.status === 'delivered' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                      'bg-slate-500/10 text-slate-500 border-slate-500/20'
                    }`}>
                    {order.status}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-theme-text">₹{typeof order.price === 'number' ? order.price.toLocaleString('en-IN') : order.price}</span>
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenu(activeMenu === order.id ? null : order.id);
                  }}
                  className={`p-1.5 rounded-lg transition-colors ${activeMenu === order.id ? 'bg-theme-bg text-theme-text' : 'text-theme-muted hover:text-theme-text hover:bg-theme-bg opacity-0 group-hover:opacity-100'}`}
                  title="Quick Actions"
                >
                  <MoreHorizontal size={16} />
                </button>

                {activeMenu === order.id && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setActiveMenu(null); }} />
                    <div className="absolute right-0 mt-2 w-48 bg-theme-panel border border-theme-border/20 rounded-xl shadow-xl z-20 py-1 overflow-hidden animate-[fadeIn_0.1s_ease-out]">
                      <button
                        onClick={(e) => handleAction(e, 'view', order.id)}
                        className="w-full flex items-center gap-2 px-4 py-2 text-xs text-theme-text hover:bg-theme-bg transition-colors"
                      >
                        <ExternalLink size={14} className="text-theme-muted" /> View Details
                      </button>
                      <button
                        onClick={(e) => handleAction(e, 'pack', order.id)}
                        className="w-full flex items-center gap-2 px-4 py-2 text-xs text-theme-text hover:bg-theme-bg transition-colors"
                      >
                        <Package size={14} className="text-theme-muted" /> Mark as Packed
                      </button>
                      <div className="h-px bg-theme-border/10 my-1" />
                      <button
                        onClick={(e) => handleAction(e, 'cancel', order.id)}
                        className="w-full flex items-center gap-2 px-4 py-2 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                      >
                        <XCircle size={14} /> Cancel Order
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentOrders;
