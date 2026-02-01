
import React, { useState, useEffect } from 'react';
import { Tag, ShoppingBag, Plus, FileText, BarChart2, AlertTriangle, ArrowRight, Eye, IndianRupee } from 'lucide-react';
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

    useEffect(() => {
        fetchDashboardData();
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
                const monthlyMap = new Map<string, number>();

                // Initialize with 0
                months.forEach(m => monthlyMap.set(m, 0));

                const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                const weeklyMap = new Map<string, number>();
                days.forEach(d => weeklyMap.set(d, 0));

                const now = new Date();

                ordersData.forEach((order: any) => {
                    const date = new Date(order.created_at);
                    const month = months[date.getMonth()];
                    monthlyMap.set(month, (monthlyMap.get(month) || 0) + (order.total || 0));

                    const diffTime = Math.abs(now.getTime() - date.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    if (diffDays <= 7) {
                        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                        weeklyMap.set(dayName, (weeklyMap.get(dayName) || 0) + (order.total || 0));
                    }
                });

                setMonthlyData(months.map(name => ({ name, value: monthlyMap.get(name) || 0 })));
                setWeeklyData(days.map(name => ({ name, value: weeklyMap.get(name) || 0 })));

                // --- Calculate Real Top Selling Products ---
                const productStats: Record<string, { id: string, quantity: number, revenue: number, name: string, image: string }> = {};

                ordersData.forEach((order: any) => {
                    if (order.status === 'cancelled') return;
                    const items = order.items || [];
                    if (Array.isArray(items)) {
                        items.forEach((item: any) => {
                            // Group primarily by Name to merge duplicates with different/missing IDs
                            // Normalize name (trim) to avoid whitespace issues
                            let pKey = item.name ? `name:${item.name.trim()}` : (item.product_id || item.id);

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

        // Using document.open/write/close is acceptable here since the invoice
        // is rendered in a new window and all user data is escaped
        invoiceWindow.document.open();
        invoiceWindow.document.write(invoiceHTML);
        invoiceWindow.document.close();
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
                        className="flex items-center gap-3 p-4 bg-panel rounded-2xl border border-muted/10 hover:border-chart-line transition-all group shadow-sm"
                    >
                        <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Plus size={20} />
                        </div>
                        <div className="text-left">
                            <span className="text-xs text-muted block">Product</span>
                            <span className="text-sm font-bold text-text">Add New</span>
                        </div>
                    </button>
                    <button
                        onClick={() => onTabChange?.('orders')}
                        className="flex items-center gap-3 p-4 bg-panel rounded-2xl border border-muted/10 hover:border-text transition-all group shadow-sm"
                    >
                        <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <FileText size={20} />
                        </div>
                        <div className="text-left">
                            <span className="text-xs text-muted block">Order</span>
                            <span className="text-sm font-bold text-text">Invoices</span>
                        </div>
                    </button>
                    <button
                        onClick={() => onTabChange?.('reports')}
                        className="flex items-center gap-3 p-4 bg-panel rounded-2xl border border-muted/10 hover:border-chart-line transition-all group shadow-sm"
                    >
                        <div className="w-10 h-10 rounded-xl bg-green-500/10 text-green-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <BarChart2 size={20} />
                        </div>
                        <div className="text-left">
                            <span className="text-xs text-muted block">Stats</span>
                            <span className="text-sm font-bold text-text">Full Report</span>
                        </div>
                    </button>
                    <button
                        onClick={() => onTabChange?.('sales')}
                        className="flex items-center gap-3 p-4 bg-panel rounded-2xl border border-muted/10 hover:border-text transition-all group shadow-sm"
                    >
                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Tag size={20} />
                        </div>
                        <div className="text-left">
                            <span className="text-xs text-muted block">Discount</span>
                            <span className="text-sm font-bold text-text">Campaigns</span>
                        </div>
                    </button>
                    {sellerSlug && (
                        <a
                            href={`/store/${sellerSlug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-4 bg-panel rounded-2xl border border-muted/10 hover:border-chart-line transition-all group shadow-sm"
                        >
                            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Eye size={20} />
                            </div>
                            <div className="text-left">
                                <span className="text-xs text-muted block">Storefront</span>
                                <span className="text-sm font-bold text-text">View Live</span>
                            </div>
                        </a>
                    )}
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    <KPICard
                        title="Total Sales"
                        value={stats.sales}
                        prefix="₹ "
                        icon={Tag}
                        accentColorClass="bg-accent-1"
                        trend="up"
                        loading={loading}
                    />
                    <KPICard
                        title="Total Earnings"
                        value={stats.earnings}
                        prefix="₹ "
                        icon={IndianRupee}
                        accentColorClass="bg-accent-2"
                        trend="up"
                        loading={loading}
                    />
                    <KPICard
                        title="Total Orders"
                        value={stats.orders}
                        suffix=" "
                        icon={ShoppingBag}
                        accentColorClass="bg-accent-3"
                        trend="down"
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
                {/* Low Stock Alert - Perfect for Small Business Inventory Management */}
                <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-500/20 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center gap-3 text-red-600 dark:text-red-400 mb-4">
                        <AlertTriangle size={20} />
                        <h4 className="font-bold text-sm uppercase tracking-wider">Inventory Alert</h4>
                    </div>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-muted font-medium">Cotton T-Shirt (L)</span>
                            <span className="text-xs font-bold text-red-600 px-2 py-0.5 bg-red-100 dark:bg-red-900/40 rounded-full">2 Left</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-muted font-medium">Denim Jeans (32)</span>
                            <span className="text-xs font-bold text-red-600 px-2 py-0.5 bg-red-100 dark:bg-red-900/40 rounded-full">4 Left</span>
                        </div>
                    </div>
                    <button className="w-full mt-4 flex items-center justify-center gap-2 py-2 text-xs font-bold text-red-600 dark:text-red-400 hover:underline">
                        RESTOCK NOW <ArrowRight size={12} />
                    </button>
                </div>


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
                                <h4 className="font-bold text-text text-lg">{selectedOrder.productName}</h4>
                                <p className="text-muted text-sm">{selectedOrder.time}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-lg bg-bg border border-muted/10">
                                <span className="text-xs text-muted block mb-1">Price</span>
                                <span className="text-lg font-bold text-text">₹{selectedOrder.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <div className="p-4 rounded-lg bg-bg border border-muted/10">
                                <span className="text-xs text-muted block mb-1">Status</span>
                                <span className="text-sm font-bold text-green-500 bg-green-500/10 px-2 py-1 rounded inline-block">Completed</span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <h5 className="font-medium text-text">Customer Information</h5>
                            <div className="text-sm text-muted">
                                <p className="font-semibold text-text">{selectedOrder.customerName}</p>
                                <p>{selectedOrder.customerEmail}</p>
                                <p className="opacity-80">{selectedOrder.customerAddress}</p>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-4">
                            <button
                                onClick={handleTrackOrder}
                                className="flex-1 py-2.5 bg-text text-bg rounded-lg font-medium hover:opacity-90 transition-opacity"
                            >
                                Track Order
                            </button>
                            <button
                                onClick={handleDownloadInvoice}
                                className="flex-1 py-2.5 border border-muted/20 text-text rounded-lg font-medium hover:bg-bg transition-colors"
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
