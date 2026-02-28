import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { Order } from '../../types';
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { TrendingUp, ShoppingBag, DollarSign, Package, Download, Calendar, Filter } from 'lucide-react';
import { clsx } from 'clsx';

const Reports = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [sellerId, setSellerId] = useState<string | null>(null);
    const [dateRange, setDateRange] = useState<'7days' | '30days' | 'all'>('30days');

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) setSellerId(user.id);
        };
        fetchUser();
    }, []);

    useEffect(() => {
        if (!sellerId) return;

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

        loadOrders();
    }, [sellerId]);

    // Data Aggregation
    const { filteredOrders, metrics, chartData, topProducts } = useMemo(() => {
        const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'packed', 'out_for_delivery'];

        // Filter by Date Range & Status
        const now = new Date();
        const cutoffDate = new Date();
        if (dateRange === '7days') cutoffDate.setDate(now.getDate() - 7);
        if (dateRange === '30days') cutoffDate.setDate(now.getDate() - 30);
        if (dateRange === 'all') cutoffDate.setFullYear(2000); // effectively all

        const relevantOrders = orders.filter(o =>
            validStatuses.includes(o.status) && new Date(o.created_at) >= cutoffDate
        );

        // Metrics
        const totalRevenue = relevantOrders.reduce((sum, o) => sum + o.total, 0);
        const totalOrders = relevantOrders.length;
        const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        let totalItemsSold = 0;
        const productSales: { [id: string]: { name: string, quantity: number, revenue: number, image: string } } = {};

        // Chart Data Prep (days)
        const daysToShow = dateRange === '7days' ? 7 : (dateRange === '30days' ? 30 : 30); // limit to 30 for 'all' to avoid clutter
        const recentCutoff = new Date();
        recentCutoff.setDate(now.getDate() - daysToShow + 1);
        recentCutoff.setHours(0, 0, 0, 0);

        const dailyDataMap: { [dateStr: string]: { date: string, revenue: number, orders: number } } = {};
        for (let i = 0; i < daysToShow; i++) {
            const d = new Date(recentCutoff);
            d.setDate(d.getDate() + i);
            const dateStr = d.toISOString().split('T')[0];
            dailyDataMap[dateStr] = { date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), revenue: 0, orders: 0 };
        }

        // Process Orders
        relevantOrders.forEach(order => {
            // Product Aggregation
            order.items?.forEach(item => {
                totalItemsSold += item.quantity;
                if (!productSales[item.product_id]) {
                    productSales[item.product_id] = { name: item.name, quantity: 0, revenue: 0, image: item.image };
                }
                productSales[item.product_id].quantity += item.quantity;
                productSales[item.product_id].revenue += item.price * item.quantity;
            });

            // Date Aggregation
            const orderDateStr = new Date(order.created_at).toISOString().split('T')[0];
            if (dailyDataMap[orderDateStr]) {
                dailyDataMap[orderDateStr].revenue += order.total;
                dailyDataMap[orderDateStr].orders += 1;
            }
        });

        // Format Top Products
        const sortedProducts = Object.values(productSales)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);

        // Format Chart Data
        const finalChartData = Object.values(dailyDataMap);

        return {
            filteredOrders: relevantOrders,
            metrics: {
                totalRevenue,
                totalOrders,
                averageOrderValue,
                totalItemsSold
            },
            chartData: finalChartData,
            topProducts: sortedProducts
        };
    }, [orders, dateRange]);

    const handleExportCSV = () => {
        if (filteredOrders.length === 0) {
            alert("No data available to export for the selected date range.");
            return;
        }

        // CSV Headers
        const headers = ["Order ID", "Date", "Customer Name", "Customer City", "Items", "Total ($)", "Status"];

        // CSV Rows
        const rows = filteredOrders.map(order => {
            const itemNames = order.items?.map(i => `${i.name} (x${i.quantity})`).join('; ') || 'N/A';
            return [
                order.id,
                new Date(order.created_at).toLocaleDateString(),
                `"${order.shipping_address?.name || 'Unknown'}"`,
                `"${order.shipping_address?.city || 'Unknown'}"`,
                `"${itemNames}"`,
                order.total,
                order.status
            ].join(',');
        });

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `store_analytics_${dateRange}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center p-8">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="p-6 md:p-8 max-w-[1600px] mx-auto animate-[fadeIn_0.5s_ease-out]">
            {/* Header section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-display font-bold text-gray-900 dark:text-white mb-2">Business Analytics</h1>
                    <p className="text-gray-500 dark:text-gray-400">Track your store's performance and generate reports</p>
                </div>

                <div className="flex gap-3">
                    {/* Date Filter */}
                    <div className="bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg flex items-center shadow-sm">
                        <Calendar className="w-4 h-4 ml-3 text-gray-400" />
                        <select
                            value={dateRange}
                            onChange={(e) => setDateRange(e.target.value as any)}
                            className="bg-transparent border-none text-sm font-medium text-gray-700 dark:text-gray-300 py-2 pl-2 pr-8 focus:ring-0 outline-none cursor-pointer"
                        >
                            <option value="7days">Last 7 Days</option>
                            <option value="30days">Last 30 Days</option>
                            <option value="all">All Time</option>
                        </select>
                    </div>

                    {/* Export Button */}
                    <button
                        onClick={handleExportCSV}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        Export CSV
                    </button>
                </div>
            </div>

            {/* Metric Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
                <MetricCard
                    title="Total Revenue"
                    value={`₹${metrics.totalRevenue.toLocaleString()}`}
                    icon={<DollarSign className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />}
                    bgClass="bg-emerald-50 dark:bg-emerald-500/10"
                />
                <MetricCard
                    title="Total Orders"
                    value={metrics.totalOrders.toLocaleString()}
                    icon={<ShoppingBag className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />}
                    bgClass="bg-indigo-50 dark:bg-indigo-500/10"
                />
                <MetricCard
                    title="Average Order Value"
                    value={`₹${Math.round(metrics.averageOrderValue).toLocaleString()}`}
                    icon={<TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />}
                    bgClass="bg-blue-50 dark:bg-blue-500/10"
                />
                <MetricCard
                    title="Items Sold"
                    value={metrics.totalItemsSold.toLocaleString()}
                    icon={<Package className="w-6 h-6 text-amber-600 dark:text-amber-400" />}
                    bgClass="bg-amber-50 dark:bg-amber-500/10"
                />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Revenue Line Chart */}
                <div className="lg:col-span-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Revenue Overview (Last {chartData.length} Days)</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.2} />
                                <XAxis dataKey="date"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 12, fill: '#6B7280' }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 12, fill: '#6B7280' }}
                                    tickFormatter={(value) => `₹${value}`}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    formatter={(value: number) => [`₹${value}`, 'Revenue']}
                                    labelStyle={{ color: '#4B5563', fontWeight: 'bold', marginBottom: '4px' }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="#4F46E5"
                                    strokeWidth={3}
                                    dot={{ r: 4, fill: '#4F46E5', strokeWidth: 2, stroke: '#fff' }}
                                    activeDot={{ r: 6, strokeWidth: 0 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Orders Bar Chart */}
                <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Daily Orders</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.2} />
                                <XAxis dataKey="date" hide />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 12, fill: '#6B7280' }}
                                    allowDecimals={false}
                                />
                                <Tooltip
                                    cursor={{ fill: 'rgba(79, 70, 229, 0.05)' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    formatter={(value: number) => [value, 'Orders']}
                                    labelStyle={{ display: 'none' }}
                                />
                                <Bar dataKey="orders" fill="#6366F1" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Top Products Section */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm mb-8">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Top Performing Products</h3>
                </div>

                {topProducts.length === 0 ? (
                    <div className="text-center py-10 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-dashed border-neutral-200 dark:border-neutral-700">
                        <Package className="w-10 h-10 text-neutral-400 mx-auto mb-3" />
                        <p className="text-neutral-500 dark:text-neutral-400 font-medium">No product sales in the selected period.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-neutral-200 dark:border-neutral-800 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                                    <th className="pb-3 px-4 font-medium">Product</th>
                                    <th className="pb-3 px-4 font-medium text-right">Units Sold</th>
                                    <th className="pb-3 px-4 font-medium text-right">Revenue</th>
                                </tr>
                            </thead>
                            <tbody>
                                {topProducts.map((product, idx) => (
                                    <tr key={idx} className="border-b border-neutral-100 dark:border-neutral-800/50 last:border-0 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded overflow-hidden bg-neutral-100 dark:bg-neutral-800 shrink-0 border border-neutral-200 dark:border-neutral-700">
                                                    {product.image ? (
                                                        <img src={product.image} alt={product.name} className="w-full h-full object-cover mix-blend-multiply dark:mix-blend-normal" />
                                                    ) : (
                                                        <Package className="w-5 h-5 m-auto text-neutral-400" />
                                                    )}
                                                </div>
                                                <span className="font-medium text-sm text-gray-900 dark:text-white truncate max-w-[200px] md:max-w-xs">{product.name}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-right text-sm font-medium text-gray-600 dark:text-gray-300">
                                            {product.quantity}
                                        </td>
                                        <td className="py-3 px-4 text-right text-sm font-bold text-gray-900 dark:text-white">
                                            ₹{product.revenue.toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

        </div>
    );
};

// Helper component for metric cards
const MetricCard = ({ title, value, icon, bgClass }: { title: string, value: string | number, icon: React.ReactNode, bgClass: string }) => (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 md:p-6 shadow-sm hover:shadow-md transition-shadow flex items-start justify-between">
        <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{title}</p>
            <h3 className="text-2xl lg:text-3xl font-display font-bold text-gray-900 dark:text-white">{value}</h3>
        </div>
        <div className={clsx("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", bgClass)}>
            {icon}
        </div>
    </div>
);

export default Reports;
