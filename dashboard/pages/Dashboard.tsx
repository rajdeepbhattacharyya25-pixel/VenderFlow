
import React, { useState, useEffect } from 'react';
import { Tag, ShoppingBag, Plus, FileText, BarChart2, AlertTriangle, ArrowRight, Eye, IndianRupee, MoreHorizontal } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import KPICard from '../components/KPICard';
import EarningsChart from '../components/EarningsChart';
import ProductTable from '../components/ProductTable';
import RecentOrders from '../components/RecentOrders';
import Modal from '../components/Modal';
import { EARNINGS_DATA, WEEKLY_EARNINGS_DATA } from '../constants';
import { Theme, Order, Product } from '../types';
import { supabase } from '../../lib/supabase';
import { ToastContainer } from '../../components/Toast';

interface DashboardProps {
    theme: Theme;
    onTabChange?: (tab: string) => void;
    sellerSlug: string | null;
}

const Dashboard: React.FC<DashboardProps> = ({ theme, onTabChange, sellerSlug }) => {
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        sales: 0,
        earnings: 0,
        orders: 0
    });
    const [recentOrders, setRecentOrders] = useState<Order[]>([]);
    const [topProducts, setTopProducts] = useState<Product[]>([]);
    const [monthlyData, setMonthlyData] = useState(EARNINGS_DATA);
    const [weeklyData, setWeeklyData] = useState(WEEKLY_EARNINGS_DATA);
    const [toasts, setToasts] = useState<{ id: number, message: string }[]>([]);
    const [trafficData, setTrafficData] = useState<{ visitors_7d: number, change_pct: number } | null>(null);

    useEffect(() => {
        let mounted = true;
        let subscription: any = null;

        const setupRealtime = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user || !mounted) return;

            subscription = supabase
                .channel(`dashboard-orders-${user.id}`)
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'orders',
                    filter: `seller_id=eq.${user.id}`
                }, (payload) => {
                    const o = payload.new;
                    setStats(prev => ({
                        sales: prev.sales + (o.total || 0),
                        earnings: prev.earnings + ((o.total || 0) * 0.40),
                        orders: prev.orders + 1
                    }));

                    let shipping = o.shipping_address;
                    if (typeof shipping === 'string') {
                        try { shipping = JSON.parse(shipping); } catch (e) { shipping = {}; }
                    }
                    shipping = shipping || {};
                    const firstItem = o.items?.[0];

                    const mappedOrder = {
                        id: o.id,
                        productName: firstItem?.name || `Order #${o.id.slice(0, 8)}`,
                        productImage: firstItem?.image || 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b',
                        price: o.total || 0,
                        status: o.status || 'pending',
                        time: new Date(o.created_at).toLocaleDateString(),
                        customerName: shipping.name || 'Customer',
                        customerEmail: shipping.email || shipping.phone || 'No contact info',
                        customerAddress: shipping.street ? `${shipping.street}, ${shipping.city}, ${shipping.zip}` : 'No address provided'
                    };

                    setRecentOrders(prev => [mappedOrder, ...prev].slice(0, 5));
                    showToast(`New order received! Total: ₹${o.total}`);
                })
                .subscribe();
        };

        fetchDashboardData();
        setupRealtime();

        return () => {
            mounted = false;
            if (subscription) {
                supabase.removeChannel(subscription);
            }
        };
    }, []);

    const showToast = (message: string) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message }]);
    };

    const removeToast = (id: number) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    const fetchDashboardData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Fetch Orders for KPIs and Recent List
            const { data: ordersData, error } = await supabase
                .from('orders')
                .select('*')
                .eq('seller_id', user.id)
                .order('created_at', { ascending: false });

            if (ordersData) {
                const totalOrders = ordersData.length;
                const totalSales = ordersData.reduce((acc, order) => acc + (order.total || 0), 0);
                const totalEarnings = totalSales * 0.40; // Mock 40% profit margin

                setStats({
                    sales: totalSales,
                    earnings: totalEarnings,
                    orders: totalOrders
                });

                // Map to UI Order type
                const mappedOrders = ordersData.slice(0, 5).map((o: any) => {
                    const firstItem = o.items && o.items[0] ? o.items[0] : null;

                    let shipping = o.shipping_address;
                    if (typeof shipping === 'string') {
                        try {
                            shipping = JSON.parse(shipping);
                        } catch (e) {
                            console.error("Failed to parse shipping address", e);
                            shipping = {};
                        }
                    }
                    shipping = shipping || {};

                    return {
                        id: o.id,
                        productName: firstItem?.name || `Order #${o.id.slice(0, 8)}`,
                        productImage: firstItem?.image || 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b',
                        price: o.total || 0,
                        status: o.status || 'pending',
                        time: new Date(o.created_at).toLocaleDateString(),
                        customerName: shipping.name || 'Customer',
                        // Prioritize Email if available, otherwise Phone, otherwise fallback
                        customerEmail: shipping.email || shipping.phone || 'No contact info',
                        customerAddress: shipping.street ? `${shipping.street}, ${shipping.city}, ${shipping.zip}` : 'No address provided'
                    };
                });
                setRecentOrders(mappedOrders);

                // Process Chart Data
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const monthlyMap = new Map<string, { earning: number, sales: number }>();

                // Initialize with 0
                months.forEach(m => monthlyMap.set(m, { earning: 0, sales: 0 }));

                const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                const weeklyMap = new Map<string, { earning: number, sales: number }>();
                days.forEach(d => weeklyMap.set(d, { earning: 0, sales: 0 }));

                const now = new Date();

                ordersData.forEach((order: any) => {
                    const date = new Date(order.created_at);
                    const month = months[date.getMonth()];
                    const currentMonth = monthlyMap.get(month) || { earning: 0, sales: 0 };
                    monthlyMap.set(month, { 
                        earning: currentMonth.earning + (order.total || 0),
                        sales: currentMonth.sales + 1
                    });

                    const diffTime = Math.abs(now.getTime() - date.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    if (diffDays <= 7) {
                        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                        const currentDay = weeklyMap.get(dayName) || { earning: 0, sales: 0 };
                        weeklyMap.set(dayName, {
                            earning: currentDay.earning + (order.total || 0),
                            sales: currentDay.sales + 1
                        });
                    }
                });

                setMonthlyData(months.map(name => ({ 
                    name, 
                    value: monthlyMap.get(name)?.earning || 0,
                    sales: monthlyMap.get(name)?.sales || 0
                })));
                setWeeklyData(days.map(name => ({ 
                    name, 
                    value: weeklyMap.get(name)?.earning || 0,
                    sales: weeklyMap.get(name)?.sales || 0
                })));

                // --- Calculate Real Top Selling Products ---
                const productStats: Record<string, { id: string, quantity: number, revenue: number, name: string, image: string }> = {};

                ordersData.forEach((order: any) => {
                    if (order.status === 'cancelled') return;
                    const items = order.items || [];
                    if (Array.isArray(items)) {
                        items.forEach((item: any) => {
                            // Group primarily by Name to merge duplicates with different/missing IDs
                            // Normalize name (trim) to avoid whitespace issues
                            const pKey = item.name ? `name:${item.name.trim()}` : (item.product_id || item.id);

                            // If pKey is missing (should be rare), skip
                            if (!pKey) return;

                            if (!productStats[pKey]) {
                                productStats[pKey] = {
                                    id: pKey, // Use the key as ID for valid grouping
                                    quantity: 0,
                                    revenue: 0,
                                    name: item.name || 'Unknown Product',
                                    image: item.image || 'https://via.placeholder.com/150'
                                };
                            }

                            // Safety parse for quantity and price
                            const qty = parseInt(String(item.quantity || 1), 10);
                            const price = parseFloat(String(item.price || 0));

                            productStats[pKey].quantity += isNaN(qty) ? 1 : qty;
                            productStats[pKey].revenue += (isNaN(price) ? 0 : price) * (isNaN(qty) ? 1 : qty);
                        });
                    }
                });

                // Sort by quantity sold
                const sortedStats = Object.values(productStats).sort((a, b) => b.quantity - a.quantity).slice(0, 5);
                const topIDs = sortedStats.map(s => s.id);

                if (topIDs.length > 0) {
                    const { data: realProducts, error: prodError } = await supabase
                        .from('products')
                        .select('*, product_media(file_url), product_stock(stock_quantity)')
                        // Filter IDs that are actual UUIDs, otherwise supabase errors on "name:FOO"
                        .in('id', topIDs.filter(id => id.length === 36 && !id.startsWith('name:')));

                    // Create a map of fetched products
                    const productMap = new Map((realProducts || []).map((p: any) => [p.id, p]));

                    const mergedTop = sortedStats.map(stat => {
                        // Original ID might have been a name key, but if we found a real product it would be mapped by ID.
                        // Wait, if I group by 'name:Foo', I won't match a product ID 'uuid-1'.
                        // THIS IS A TRADEOFF. If I prioritize Name grouping, I lose the database link unless I resolve the name back to an ID.
                        // But for "Top Selling" stats, the Name is the most user-friendly way to group.

                        // Try to find if any returned product matches the NAME if ID lookup failed (or wasn't possible)
                        // This matches "New Product" from DB with "name:New Product" from stats
                        let fetchedProduct = productMap.get(stat.id);
                        if (!fetchedProduct && stat.id.startsWith('name:')) {
                            const cleanName = stat.id.replace('name:', '');
                            fetchedProduct = (realProducts || []).find((p: any) => p.name.trim() === cleanName);
                        }

                        // Fallback logic if product is deleted/missing in DB but exists in orders
                        if (fetchedProduct) {
                            const stockQty = fetchedProduct.product_stock?.[0]?.stock_quantity ?? 0;
                            return {
                                ...fetchedProduct,
                                image: fetchedProduct.product_media?.[0]?.file_url || fetchedProduct.image || 'https://via.placeholder.com/150',
                                orders: stat.quantity,
                                amount: stat.revenue,
                                stock: stockQty
                            };
                        } else {
                            // Calculate average price for display
                            const avgPrice = stat.quantity > 0 ? (stat.revenue / stat.quantity) : 0;

                            return {
                                id: stat.id,
                                name: stat.name,
                                image: stat.image,
                                price: avgPrice,
                                amount: stat.revenue,
                                orders: stat.quantity,
                                stock: 0,
                                category: 'Legacy',
                                sizes: [],
                                rating: 0,
                                reviews: 0,
                                is_active: true,
                                has_variants: false,
                                created_at: new Date().toISOString(),
                                updated_at: new Date().toISOString()
                            } as Product;
                        }
                    });

                    setTopProducts(mergedTop);
                } else {
                    setTopProducts([]);
                }

                // Fetch Storefront Traffic from store_page_views table
                try {
                    const now = new Date();
                    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
                    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();

                    // Count page views in last 7 days
                    const { count: thisWeekCount, error: twErr } = await supabase
                        .from('store_page_views')
                        .select('*', { count: 'exact', head: true })
                        .eq('seller_id', user.id)
                        .gte('created_at', sevenDaysAgo);

                    if (twErr) console.error('Traffic this week error:', twErr);

                    // Count page views in previous 7 days (for trend)
                    const { count: lastWeekCount, error: lwErr } = await supabase
                        .from('store_page_views')
                        .select('*', { count: 'exact', head: true })
                        .eq('seller_id', user.id)
                        .gte('created_at', fourteenDaysAgo)
                        .lt('created_at', sevenDaysAgo);

                    if (lwErr) console.error('Traffic last week error:', lwErr);

                    const current = thisWeekCount ?? 0;
                    const previous = lastWeekCount ?? 0;
                    const changePct = previous > 0 ? ((current - previous) / previous) * 100 : 0;

                    setTrafficData({
                        visitors_7d: current,
                        change_pct: Math.round(changePct * 10) / 10,
                    });
                } catch (analyticsError) {
                    console.error('Error fetching store traffic:', analyticsError);
                }

            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleTrackOrder = () => {
        if (!selectedOrder) return;
        showToast(`Tracking status sent to ${selectedOrder.customerEmail}`);
    };

    // Helper function to escape HTML entities for XSS prevention
    const escapeHtml = (text: string): string => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    };

    const handleDownloadInvoice = () => {
        if (!selectedOrder) return;

        const invoiceWindow = window.open('', '_blank');
        if (!invoiceWindow) return;

        // Escape user-provided data to prevent XSS
        const safeId = escapeHtml(selectedOrder.id);
        const safeTime = escapeHtml(selectedOrder.time);
        const safeStatus = escapeHtml(selectedOrder.status.toUpperCase());
        const safeCustomerName = escapeHtml(selectedOrder.customerName);
        const safeCustomerEmail = escapeHtml(selectedOrder.customerEmail);
        const safeCustomerAddress = escapeHtml(selectedOrder.customerAddress);
        const safeProductName = escapeHtml(selectedOrder.productName);
        const formattedPrice = selectedOrder.price.toLocaleString('en-IN', { minimumFractionDigits: 2 });

        const invoiceHTML = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Invoice #${safeId}</title>
                <meta name="description" content="Customer invoice document" />
                <meta property="og:title" content="Invoice #${safeId}" />
                <style>
                    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; max-width: 800px; mx-auto; }
                    .header { display: flex; justify-content: space-between; margin-bottom: 40px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
                    .logo { font-size: 24px; font-weight: bold; }
                    .invoice-details { text-align: right; }
                    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
                    .table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
                    .table th { text-align: left; border-bottom: 2px solid #ddd; padding: 10px; }
                    .table td { padding: 10px; border-bottom: 1px solid #eee; }
                    .total { text-align: right; font-size: 20px; font-weight: bold; }
                    @media print { body { padding: 0; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="logo">INVOICE</div>
                    <div class="invoice-details">
                        <p>Order ID: ${safeId}</p>
                        <p>Date: ${safeTime}</p>
                        <p>Status: ${safeStatus}</p>
                    </div>
                </div>
                
                <div class="grid">
                    <div>
                        <strong>To:</strong><br>
                        ${safeCustomerName}<br>
                        ${safeCustomerEmail}<br>
                        ${safeCustomerAddress}
                    </div>
                    <div>
                        <strong>Total Amount:</strong><br>
                        <span style="font-size: 24px">₹${formattedPrice}</span>
                    </div>
                </div>

                <table class="table">
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th>Description</th>
                            <th>Cost</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>${safeProductName}</td>
                            <td>Product Order</td>
                            <td>₹${formattedPrice}</td>
                        </tr>
                    </tbody>
                </table>

                <div class="total">
                    Total: ₹${formattedPrice}
                </div>

                <div style="margin-top: 60px; text-align: center; color: #888; font-size: 12px;">
                    <p>Thank you for your business!</p>
                </div>

                <script>
                    window.onload = function() { window.print(); }
                </script>
            </body>
            </html>
        `;

        const blob = new Blob([invoiceHTML], { type: 'text/html' });
        const blobUrl = URL.createObjectURL(blob);
        invoiceWindow.location.href = blobUrl;

        // Clean up the object URL after a short delay
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    };

    return (
        <div className="flex flex-col xl:flex-row gap-6 animate-[fadeIn_0.5s_ease-out]">
            <ToastContainer toasts={toasts} removeToast={removeToast} />

            {/* Center Column (KPIs + Chart + Table) */}
            <div className="flex-1 min-w-0 flex flex-col gap-6">

                {/* Quick Actions for Small Business */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <button
                        onClick={() => onTabChange?.('products')}
                        className="flex items-center gap-3 p-4 bg-theme-panel rounded-2xl border border-theme-border/50 shadow-soft hover:shadow-glow hover:-translate-y-1 transition-all duration-300 group"
                    >
                        <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                            <Plus size={20} />
                        </div>
                        <div className="text-left">
                            <span className="text-xs text-theme-muted block font-medium">Product</span>
                            <span className="text-sm font-bold text-theme-text">Add New</span>
                        </div>
                    </button>
                    <button
                        onClick={() => onTabChange?.('orders')}
                        className="flex items-center gap-3 p-4 bg-theme-panel rounded-2xl border border-theme-border/50 shadow-soft hover:shadow-glow hover:-translate-y-1 transition-all duration-300 group"
                    >
                        <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                            <FileText size={20} />
                        </div>
                        <div className="text-left">
                            <span className="text-xs text-theme-muted block font-medium">Order</span>
                            <span className="text-sm font-bold text-theme-text">Invoices</span>
                        </div>
                    </button>
                    <button
                        onClick={() => onTabChange?.('reports')}
                        className="flex items-center gap-3 p-4 bg-theme-panel rounded-2xl border border-theme-border/50 shadow-soft hover:shadow-glow hover:-translate-y-1 transition-all duration-300 group"
                    >
                        <div className="w-10 h-10 rounded-xl bg-green-500/10 text-green-500 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                            <BarChart2 size={20} />
                        </div>
                        <div className="text-left">
                            <span className="text-xs text-theme-muted block font-medium">Stats</span>
                            <span className="text-sm font-bold text-theme-text">Full Report</span>
                        </div>
                    </button>
                    <button
                        onClick={() => onTabChange?.('sales')}
                        className="flex items-center gap-3 p-4 bg-theme-panel rounded-2xl border border-theme-border/50 shadow-soft hover:shadow-glow hover:-translate-y-1 transition-all duration-300 group"
                    >
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                            <Tag size={20} />
                        </div>
                        <div className="text-left">
                            <span className="text-xs text-theme-muted block font-medium">Discount</span>
                            <span className="text-sm font-bold text-theme-text">Campaigns</span>
                        </div>
                    </button>
                    {sellerSlug && (
                        <a
                            href={`/store/${sellerSlug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-4 bg-theme-panel rounded-2xl border border-theme-border/50 shadow-soft hover:shadow-glow hover:-translate-y-1 transition-all duration-300 group"
                        >
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                <Eye size={20} />
                            </div>
                            <div className="text-left">
                                <span className="text-xs text-theme-muted block font-medium">Storefront</span>
                                <span className="text-sm font-bold text-theme-text">View Live</span>
                            </div>
                        </a>
                    )}

                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <KPICard
                        title="Total Sales"
                        value={stats.sales}
                        prefix="₹ "
                        icon={Tag}
                        color="blue"
                        trend="up"
                        loading={loading}
                    />
                    <KPICard
                        title="Total Earnings"
                        value={stats.earnings}
                        prefix="₹ "
                        icon={IndianRupee}
                        color="yellow"
                        trend="up"
                        loading={loading}
                    />
                    <KPICard
                        title="Total Orders"
                        value={stats.orders}
                        suffix=" "
                        icon={ShoppingBag}
                        color="primary"
                        trend="down"
                        loading={loading}
                    />
                    <KPICard
                        title="Store Traffic (7D)"
                        value={trafficData?.visitors_7d || 0}
                        suffix=" visits"
                        icon={Eye}
                        color="primary"
                        trend={trafficData ? (trafficData.change_pct >= 0 ? "up" : "down") : undefined}
                        loading={loading}
                    />
                </div>

                {/* Chart */}
                <EarningsChart
                    monthlyData={monthlyData}
                    weeklyData={weeklyData}
                    isDark={theme === 'dark'}
                />

                {/* Product Table */}
                <ProductTable products={topProducts} />
            </div>

            {/* Right Sidebar (Donut + Recent) */}
            <div className="w-full xl:w-[320px] flex-shrink-0 flex flex-col gap-6">


                <RecentOrders orders={recentOrders} onOrderClick={setSelectedOrder} />
            </div>


            {/* Order Details Modal */}
            <Modal
                isOpen={!!selectedOrder}
                onClose={() => setSelectedOrder(null)}
                title="Order Details"
            >
                {selectedOrder && (
                    <div className="flex flex-col gap-6">
                        <div className="flex items-center gap-4">
                            <img src={selectedOrder.productImage} alt={selectedOrder.productName} className="w-20 h-20 rounded-xl object-cover" />
                            <div>
                                <h4 className="font-bold text-theme-text text-lg">{selectedOrder.productName}</h4>
                                <p className="text-theme-muted text-sm">{selectedOrder.time}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-lg bg-theme-bg border border-theme-muted/10">
                                <span className="text-xs text-theme-muted block mb-1">Price</span>
                                <span className="text-lg font-bold text-theme-text">₹{selectedOrder.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <div className="p-4 rounded-lg bg-theme-bg border border-theme-muted/10">
                                <span className="text-xs text-theme-muted block mb-1">Status</span>
                                <span className="text-sm font-bold text-green-500 bg-green-500/10 px-2 py-1 rounded inline-block">Completed</span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <h5 className="font-medium text-theme-text">Customer Information</h5>
                            <div className="text-sm text-theme-muted">
                                <p className="font-semibold text-theme-text">{selectedOrder.customerName}</p>
                                <p>{selectedOrder.customerEmail}</p>
                                <p className="opacity-80">{selectedOrder.customerAddress}</p>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-4">
                            <button
                                onClick={handleTrackOrder}
                                className="flex-1 py-2.5 bg-theme-text text-theme-bg rounded-lg font-medium hover:opacity-90 transition-opacity"
                            >
                                Track Order
                            </button>
                            <button
                                onClick={handleDownloadInvoice}
                                className="flex-1 py-2.5 border border-theme-muted/20 text-theme-text rounded-lg font-medium hover:bg-theme-bg transition-colors"
                            >
                                Download Invoice
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default Dashboard;
