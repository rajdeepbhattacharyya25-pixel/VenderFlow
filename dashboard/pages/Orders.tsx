import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { getCurrentSeller } from '../../lib/seller';
import { Order } from '../../types';
import {
    Package, Calendar, MapPin, Search, ChevronDown,
    Filter, Download, RefreshCw, AlertCircle, Bell,
    CheckCircle2, Clock, Truck
} from 'lucide-react';
import { ToastContainer } from '../../components/Toast';

interface OrdersProps {
    searchTerm?: string;
}

const Orders = ({ searchTerm = '' }: OrdersProps) => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState(searchTerm);
    const [toasts, setToasts] = useState<{ id: number, message: string }[]>([]);

    // Notification state
    const [newOrderAlert, setNewOrderAlert] = useState<Order | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const [sellerId, setSellerId] = useState<string | null>(null);

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) setSellerId(user.id);
        };
        fetchUser();
    }, []);

    useEffect(() => {
        if (!sellerId) return;

        // 1. Fetch initial orders
        loadOrders();

        // 2. Subscribe to Real-time changes
        const subscription = supabase
            .channel('orders_channel')
            .on((
                'postgres_changes' as any),
                { event: 'INSERT', schema: 'public', table: 'orders', filter: `seller_id=eq.${sellerId}` },
                (payload: any) => {
                    handleNewOrder(payload.new as Order);
                }
            )
            .subscribe();

        // Initialize notification sound
        audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'); // Simple notification bell

        return () => {
            supabase.removeChannel(subscription);
        };
    }, [sellerId]);

    const loadOrders = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('orders')
                .select('*')
                .eq('seller_id', sellerId)
                .order('created_at', { ascending: false });

            if (data) {
                setOrders(data as Order[]);
            }
        } catch (error) {
            console.error('Error loading orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleNewOrder = async (newOrder: Order) => {
        // Play sound
        try {
            await audioRef.current?.play();
        } catch (e) {
            console.log('Audio play failed (user interaction needed)', e);
        }

        // Show visual alert
        setNewOrderAlert(newOrder);

        // Add to list immediately
        setOrders(prev => [newOrder, ...prev]);

        // Auto-hide alert after 5s
        setTimeout(() => setNewOrderAlert(null), 8000);
    };

    const updateStatus = async (orderId: string, newStatus: Order['status']) => {
        const { error } = await supabase
            .from('orders')
            .update({ status: newStatus })
            .eq('id', orderId);

        if (error) {
            showToast('Failed to update status');
        } else {
            setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
            showToast(`Order marked as ${newStatus}`);
        }
    };

    const showToast = (message: string) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message }]);
    };

    const removeToast = (id: number) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    // Derived filtered list
    const filteredOrders = orders.filter(order => {
        const matchStatus = filterStatus === 'all' || order.status === filterStatus;
        const searchLower = searchQuery.toLowerCase();
        const matchSearch = order.id.toLowerCase().includes(searchLower) ||
            order.shipping_address?.name?.toLowerCase().includes(searchLower) || false;
        return matchStatus && matchSearch;
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800';
            case 'processing': return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800';
            case 'shipped': return 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800';
            case 'delivered': return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800';
            case 'cancelled': return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto animate-in fade-in duration-500 relative min-h-screen">

            {/* New Order Alert Popup */}
            {newOrderAlert && (
                <div className="fixed top-8 right-8 z-50 animate-in slide-in-from-top-4 duration-500">
                    <div className="bg-white dark:bg-surface-dark border-l-4 border-primary shadow-2xl rounded-lg p-4 flex items-start gap-4 max-w-sm">
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full animate-bounce">
                            <Bell className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-900 dark:text-white">New Order Received!</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                                {newOrderAlert.shipping_address?.name || 'Customer'} just placed an order for ₹{newOrderAlert.total}
                            </p>
                            <button
                                onClick={() => { setNewOrderAlert(null); window.scrollTo(0, 0); }}
                                className="text-xs font-bold text-primary mt-2 hover:underline"
                            >
                                View Order
                            </button>
                        </div>
                        <button onClick={() => setNewOrderAlert(null)} className="ml-auto text-gray-400 hover:text-gray-600">×</button>
                    </div>
                </div>
            )}

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-heading font-bold text-gray-900 dark:text-white mb-2">Orders</h1>
                    <p className="text-gray-500 dark:text-gray-400">Manage your shipments and track deliverables</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={loadOrders} className="p-2 text-gray-500 hover:text-primary transition-colors bg-white dark:bg-surface-dark border border-dashed border-gray-300 dark:border-gray-700 rounded-lg" title="Refresh">
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <div className="bg-white dark:bg-surface-dark border p-2 rounded-lg flex items-center gap-2 shadow-sm border-gray-200 dark:border-gray-800">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400">LIVE FEED ACTIVE</span>
                    </div>
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[
                    { label: 'Pending', count: orders.filter(o => o.status === 'pending').length, color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
                    { label: 'Processing', count: orders.filter(o => o.status === 'processing').length, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
                    { label: 'Completed', count: orders.filter(o => o.status === 'delivered').length, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
                    { label: 'Total Revenue', value: `₹${orders.reduce((sum, o) => sum + o.total, 0).toLocaleString()}`, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
                ].map((stat, i) => (
                    <div key={i} className={`${stat.bg} p-4 rounded-xl border border-transparent hover:border-black/5 transition-all`}>
                        <p className={`text-sm font-bold opacity-70 ${stat.color}`}>{stat.label}</p>
                        <p className={`text-2xl font-heading font-bold ${stat.color}`}>{stat.count !== undefined ? stat.count : stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-surface-dark rounded-2xl border border-gray-200 dark:border-gray-800 p-4 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by Order ID or Customer Name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                    />
                </div>

                <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                    {['all', 'pending', 'processing', 'shipped', 'delivered'].map(status => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize whitespace-nowrap transition-all ${filterStatus === status
                                ? 'bg-gray-900 text-white dark:bg-white dark:text-black'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                                }`}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>

            {/* Orders List */}
            <div className="space-y-4">
                {filteredOrders.length === 0 ? (
                    <div className="text-center py-20 bg-gray-50 dark:bg-surface-dark border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl">
                        <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">No Orders Found</h3>
                        <p className="text-gray-500 text-sm">Waiting for new orders to arrive...</p>
                    </div>
                ) : (
                    filteredOrders.map((order) => (
                        <div key={order.id} className="bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow group animate-in slide-in-from-bottom-2 duration-300">
                            <div className="flex flex-col md:flex-row justify-between gap-6">

                                {/* Header Info */}
                                <div className="space-y-1 min-w-[200px]">
                                    <div className="flex items-center gap-3">
                                        <span className="font-mono text-xs text-gray-400">#{order.id.slice(0, 8)}</span>
                                        <div className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${getStatusColor(order.status)}`}>
                                            {order.status}
                                        </div>
                                    </div>
                                    <h3 className="font-bold text-gray-900 dark:text-white text-lg">{order.shipping_address?.name || 'Customer'}</h3>
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                        <Calendar className="w-3 h-3" />
                                        {new Date(order.created_at).toLocaleDateString()} at {new Date(order.created_at).toLocaleTimeString()}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                        <MapPin className="w-3 h-3 text-red-400" />
                                        <span className="text-[10px] leading-tight block">
                                            {order.shipping_address?.street}, {order.shipping_address?.city}, {order.shipping_address?.state} - {order.shipping_address?.zip}
                                            <br />Ph: {order.shipping_address?.phone}
                                        </span>
                                    </div>
                                </div>

                                {/* Items Grid */}
                                <div className="flex-grow grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {order.items.map((item, idx) => (
                                        <div key={idx} className="flex items-center gap-3 bg-gray-50 dark:bg-black/20 p-2 rounded-lg border border-gray-100 dark:border-gray-800">
                                            <div className="w-10 h-10 bg-white dark:bg-gray-700 rounded overflow-hidden border border-gray-200 dark:border-gray-600 flex-shrink-0">
                                                <img src={item.image} alt={item.name} className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{item.name}</p>
                                                <p className="text-xs text-gray-500">{item.size} × {item.quantity}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Actions & Total */}
                                <div className="flex flex-row md:flex-col items-center md:items-end justify-between min-w-[150px] gap-4 pt-4 md:pt-0 pl-0 md:pl-4 border-t md:border-t-0 md:border-l border-gray-100 dark:border-gray-800 w-full md:w-auto mt-4 md:mt-0">
                                    <div className="text-left md:text-right">
                                        <p className="text-xs text-gray-500 uppercase font-bold">Total</p>
                                        <p className="text-xl font-heading font-bold text-primary dark:text-white">₹{order.total.toLocaleString()}</p>
                                    </div>

                                    <div className="relative group/menu">
                                        <select
                                            value={order.status}
                                            onChange={(e) => updateStatus(order.id, e.target.value as any)}
                                            className="appearance-none bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-gray-400 rounded-lg py-2 pl-3 pr-8 text-sm font-medium text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer transition-colors"
                                        >
                                            <option value="pending">Mark Pending</option>
                                            <option value="processing">Mark Processing</option>
                                            <option value="shipped">Mark Shipped</option>
                                            <option value="delivered">Mark Delivered</option>
                                            <option value="cancelled">Cancel Order</option>
                                        </select>
                                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <ToastContainer toasts={toasts} removeToast={removeToast} />
        </div>
    );
};

export default Orders;
