import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Order } from '../../types';
import Papa from 'papaparse';
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { TrendingUp, ShoppingBag, DollarSign, Package, Download, Calendar, Upload, X, ArrowDownRight, ArrowUpRight, BarChart2 } from 'lucide-react';
import { clsx } from 'clsx';

const Reports = () => {
    // Live Data State
    const [orders, setOrders] = useState<Order[]>([]);
    const [dailyMetrics, setDailyMetrics] = useState<any[]>([]);
    const [productMetrics, setProductMetrics] = useState<any[]>([]);

    // CSV Import State
    const [importedOrders, setImportedOrders] = useState<Order[] | null>(null);

    // UI State
    const [loading, setLoading] = useState(true);
    const [sellerId, setSellerId] = useState<string | null>(null);
    const [dateRange, setDateRange] = useState<'7days' | '30days' | 'all' | 'custom'>('30days');
    const [activeTab, setActiveTab] = useState<'overview' | 'revenue' | 'products' | 'trends'>('overview');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [customStartDate, setCustomStartDate] = useState<string>(() => {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        return d.toISOString().split('T')[0];
    });
    const [customEndDate, setCustomEndDate] = useState<string>(() => {
        return new Date().toISOString().split('T')[0];
    });

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) setSellerId(user.id);
        };
        fetchUser();
    }, []);

    useEffect(() => {
        if (!sellerId) return;

        const loadData = async () => {
            setLoading(true);
            try {
                // Fetch raw orders for CSV export
                const { data: ordersData } = await supabase
                    .from('orders')
                    .select('*')
                    .eq('seller_id', sellerId)
                    .order('created_at', { ascending: false });
                if (ordersData) setOrders(ordersData as Order[]);

                // Fetch Level 1: Daily Revenue Metrics (ALL time, we slice in useMemo)
                const { data: dailyData } = await supabase
                    .from('seller_daily_revenue_metrics')
                    .select('*')
                    .eq('seller_id', sellerId)
                    .order('order_date', { ascending: true });
                if (dailyData) setDailyMetrics(dailyData);

                // Fetch Level 2: Product Performance
                const { data: productData } = await supabase
                    .from('seller_product_performance')
                    .select('*')
                    .eq('seller_id', sellerId);
                if (productData) setProductMetrics(productData);

            } catch (error) {
                console.error('Error loading reports data:', error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [sellerId]);

    // Data Aggregation Engine
    const {
        filteredOrders,
        revenueStats,
        chartData,
        topProducts,
        chartTitleRange
    } = useMemo(() => {

        // --- Date Ranges ---
        let pStartDate = new Date();
        pStartDate.setHours(0, 0, 0, 0);
        let pEndDate = new Date();
        pEndDate.setHours(23, 59, 59, 999);

        let pPrevStartDate = new Date();
        pPrevStartDate.setHours(0, 0, 0, 0);
        let pPrevEndDate = new Date();
        pPrevEndDate.setHours(23, 59, 59, 999);

        let titleRange = "Last 30 Days";
        let daysSpan = 30;

        if (dateRange === '7days') {
            daysSpan = 7;
            pStartDate.setDate(new Date().getDate() - 7);
            pPrevStartDate.setDate(new Date().getDate() - 14);
            pPrevEndDate.setDate(new Date().getDate() - 7);
            titleRange = "Last 7 Days";
        } else if (dateRange === '30days') {
            daysSpan = 30;
            pStartDate.setDate(new Date().getDate() - 30);
            pPrevStartDate.setDate(new Date().getDate() - 60);
            pPrevEndDate.setDate(new Date().getDate() - 30);
            titleRange = "Last 30 Days";
        } else if (dateRange === 'all') {
            pStartDate.setFullYear(2000);
            pPrevStartDate.setFullYear(1990);
            pPrevEndDate.setFullYear(1999); // Dummy prev range for 'ALL'
            titleRange = "All Time";
        } else if (dateRange === 'custom') {
            pStartDate = new Date(customStartDate);
            pStartDate.setHours(0, 0, 0, 0);
            pEndDate = new Date(customEndDate);
            pEndDate.setHours(23, 59, 59, 999);
            const diffTime = Math.abs(pEndDate.getTime() - pStartDate.getTime());
            daysSpan = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            pPrevEndDate = new Date(pStartDate);
            pPrevEndDate.setDate(pPrevEndDate.getDate() - 1);
            pPrevStartDate = new Date(pPrevEndDate);
            pPrevStartDate.setDate(pPrevStartDate.getDate() - daysSpan);
            titleRange = `${pStartDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${pEndDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        }

        // MA Helper
        const calculateMA = (dataArray: any[], currentIndex: number, windowSize: number) => {
            if (currentIndex < windowSize - 1) return null;
            let sum = 0;
            for (let i = 0; i < windowSize; i++) {
                sum += dataArray[currentIndex - i].revenue;
            }
            return sum / windowSize;
        };

        // --- Deep Analysis Mode (Frontend Calculation) ---
        if (importedOrders) {
            const validOrders = importedOrders.filter(o => {
                const oDate = new Date(o.created_at);
                return oDate >= pStartDate && oDate <= pEndDate;
            });
            const prevOrders = importedOrders.filter(o => {
                const oDate = new Date(o.created_at);
                return oDate >= pPrevStartDate && oDate <= pPrevEndDate;
            });

            // Current Stats
            let gross = 0; let refunds = 0; let totalOrders = validOrders.length; let refundedOrders = 0;
            const productSales: any = {};
            const dailyDataMap: any = {};

            validOrders.forEach(o => {
                const isRefunded = o.status.toLowerCase() === 'refunded' || o.status.toLowerCase() === 'cancelled';
                if (isRefunded) { refunds += o.total; refundedOrders += 1; }
                else { gross += o.total; }

                const dateStr = new Date(o.created_at).toISOString().split('T')[0];
                if (!dailyDataMap[dateStr]) dailyDataMap[dateStr] = { date: dateStr, revenue: 0, orders: 0 };
                // BUG FIX: Only add non-refunded revenue to the chart
                if (!isRefunded) {
                    dailyDataMap[dateStr].revenue += o.total;
                }
                dailyDataMap[dateStr].orders += 1;

                o.items?.forEach(item => {
                    const pid = item.product_id;
                    if (!productSales[pid]) productSales[pid] = { name: item.name, units: 0, revenue: 0, refunded_units: 0, refund_amount: 0 };
                    if (isRefunded) {
                        productSales[pid].refunded_units += item.quantity;
                        productSales[pid].refund_amount += (item.price * item.quantity);
                    } else {
                        productSales[pid].units += item.quantity;
                        productSales[pid].revenue += (item.price * item.quantity);
                    }
                });
            });

            // Prev Stats
            let prevGross = 0;
            let prevRefunds = 0;
            prevOrders.forEach(o => {
                const isRefunded = o.status.toLowerCase() === 'refunded' || o.status.toLowerCase() === 'cancelled';
                if (isRefunded) prevRefunds += o.total;
                else prevGross += o.total;
            });

            // BUG FIX: Net = Gross - Refunds, not just Gross
            const net = gross - refunds;
            const prevNet = prevGross - prevRefunds;
            const growthRate = prevNet > 0 ? ((net - prevNet) / prevNet) * 100 : 0;

            // BUG FIX: Fill missing days for accurate MA calculation
            const sortedDates = Object.keys(dailyDataMap).sort();
            const filledDailyData: { date: string; revenue: number; orders: number }[] = [];
            if (sortedDates.length > 0) {
                const startD = new Date(sortedDates[0]);
                const endD = new Date(sortedDates[sortedDates.length - 1]);
                for (let d = new Date(startD); d <= endD; d.setDate(d.getDate() + 1)) {
                    const key = d.toISOString().split('T')[0];
                    filledDailyData.push({
                        date: new Date(key).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                        revenue: dailyDataMap[key]?.revenue || 0,
                        orders: dailyDataMap[key]?.orders || 0
                    });
                }
            }

            // Now calculate MA on the filled sequential data
            const finalChart = filledDailyData.map((data, index) => ({
                ...data,
                ma3: calculateMA(filledDailyData, index, 3),
                ma7: calculateMA(filledDailyData, index, 7)
            }));

            return {
                filteredOrders: validOrders,
                revenueStats: {
                    gross, refunds, net: gross - refunds, totalOrders, refundedOrders,
                    refundRate: totalOrders > 0 ? (refundedOrders / totalOrders) * 100 : 0,
                    growthRate, prevNet
                },
                chartData: finalChart,
                topProducts: Object.values(productSales).sort((a: any, b: any) => b.revenue - a.revenue),
                chartTitleRange: titleRange
            };
        }

        // --- Live Data Mode (Backend Aggregation via Data Mart Views) ---
        const validMetrics = dailyMetrics.filter(m => {
            const mDate = new Date(m.order_date);
            return mDate >= pStartDate && mDate <= pEndDate;
        });
        const prevMetrics = dailyMetrics.filter(m => {
            const mDate = new Date(m.order_date);
            return mDate >= pPrevStartDate && mDate <= pPrevEndDate;
        });

        // Current
        let gross = 0; let refunds = 0; let net = 0; let totalOrders = 0; let refundedOrders = 0;
        const initialChartData = validMetrics.map(m => {
            gross += Number(m.gross_revenue) || 0;
            refunds += Number(m.refunded_amount) || 0;
            net += Number(m.net_revenue) || 0;
            totalOrders += Number(m.total_orders) || 0;
            refundedOrders += Number(m.refunded_orders) || 0;

            return {
                date: new Date(m.order_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                revenue: Number(m.net_revenue) || 0,
                orders: Number(m.total_orders) || 0
            };
        });

        // Calculate MA post-generation
        const finalChartData = initialChartData.map((data, index, arr) => ({
            ...data,
            ma3: calculateMA(arr, index, 3),
            ma7: calculateMA(arr, index, 7)
        }));

        // Previous
        let prevNet = 0;
        prevMetrics.forEach(m => { prevNet += Number(m.net_revenue) || 0; });
        const growthRate = prevNet > 0 ? ((net - prevNet) / prevNet) * 100 : 0;

        const productsMapped = productMetrics.map(p => ({
            name: p.product_name, units: Number(p.total_units_sold) || 0,
            revenue: Number(p.gross_revenue) || 0, refunded_units: Number(p.refunded_units) || 0,
            refund_amount: Number(p.refund_amount) || 0
        })).sort((a, b) => b.revenue - a.revenue);

        return {
            filteredOrders: orders,
            revenueStats: {
                gross, refunds, net, totalOrders, refundedOrders,
                refundRate: totalOrders > 0 ? (refundedOrders / totalOrders) * 100 : 0,
                growthRate, prevNet
            },
            chartData: finalChartData,
            topProducts: productsMapped,
            chartTitleRange: titleRange
        };

    }, [orders, dailyMetrics, productMetrics, importedOrders, dateRange, customStartDate, customEndDate]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                try {
                    const parsedData: any[] = results.data;
                    if (parsedData.length === 0) {
                        alert("The uploaded CSV is empty.");
                        return;
                    }

                    const orderGroups: { [orderId: string]: any[] } = {};
                    parsedData.forEach((row, index) => {
                        const orderIdRaw = row['Order_ID'] || row['Order ID'] || row['ID'] || row['Order'] || `imported-${index}`;
                        const orderId = orderIdRaw.toString().trim();
                        if (!orderGroups[orderId]) {
                            orderGroups[orderId] = [];
                        }
                        orderGroups[orderId].push(row);
                    });

                    const reconstructedOrders: Order[] = Object.entries(orderGroups).map(([orderId, rows]) => {
                        let orderTotal = 0;
                        let orderDate = new Date();

                        const dStr = rows[0]['Date'] || rows[0]['Order Date'] || rows[0]['Created At'];
                        if (dStr) {
                            const parsedDate = new Date(dStr);
                            if (isNaN(parsedDate.getTime()) && /^\d+$/.test(dStr.toString())) {
                                orderDate = new Date(parseInt(dStr.toString()));
                            } else if (!isNaN(parsedDate.getTime())) {
                                orderDate = parsedDate;
                            }
                        }

                        const items = rows.map((row) => {
                            const rawQty = row['Quantity'] || row['Qty'] || '1';
                            const qty = parseInt(rawQty.toString().replace(/[^0-9-]+/g, '')) || 1;

                            const rawFinalAmt = row['Final_Amount_INR'] || row['Final Amount INR'] || row['Final_Amount'] || row['Total ($)'] || row['Total'];
                            const finalAmount = parseFloat((rawFinalAmt || '0').toString().replace(/[^0-9.-]+/g, '')) || 0;

                            orderTotal += finalAmount;
                            const productName = (row['Product_Name'] || row['Product Name'] || row['Item'] || row['Product'] || row['Name'] || 'Unknown Product').toString().replace(/^"|"$/g, '').trim();

                            return {
                                product_id: `import-product-${productName}`,
                                name: productName,
                                quantity: Math.max(0, qty),
                                price: qty !== 0 ? (finalAmount / qty) : finalAmount,
                                image: ''
                            };
                        });

                        return {
                            id: orderId,
                            seller_id: 'imported',
                            customer_id: 'imported',
                            status: rows[0]['Order_Status'] || rows[0]['Status'] || 'completed',
                            total: orderTotal,
                            items: items,
                            shipping_address: {
                                name: 'Unknown', city: 'Unknown', line1: '', state: '', postal_code: '', country: ''
                            },
                            created_at: orderDate.toISOString()
                        } as unknown as Order;
                    });

                    setImportedOrders(reconstructedOrders);
                    setDateRange('all');
                } catch (err) {
                    console.error("Failed to parse dummy data structure:", err);
                    alert("Failed to parse CSV formats properly.");
                }
            },
            error: (error) => {
                console.error("PapaParse error:", error);
                alert("Failed to read CSV file.");
            }
        });
    };

    const handleExportCSV = () => {
        const csvContent = "data:text/csv;charset=utf-8,ID,Total,Status\n" + (orders.map(o => `${o.id},${o.total},${o.status}`).join('\n'));
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `store_analytics_${dateRange}.csv`);
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
            {/* Deep Analysis Mode Banner */}
            {importedOrders && (
                <div className="mb-6 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4 flex items-center justify-between shadow-sm animate-[fadeIn_0.3s]">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-800 rounded-lg">
                            <Upload className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-indigo-900 dark:text-indigo-100">Deep Analysis Mode Active</h3>
                            <p className="text-xs text-indigo-700 dark:text-indigo-300">You are viewing data from an imported CSV file. Live backend metrics are paused.</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setImportedOrders(null)}
                        className="flex shrink-0 items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-neutral-800 border border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 text-xs font-semibold rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors"
                    >
                        <X className="w-3.5 h-3.5" />
                        Clear Data
                    </button>
                </div>
            )}

            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-display font-bold text-gray-900 dark:text-white mb-2">Business Analytics</h1>
                    <p className="text-gray-500 dark:text-gray-400">Track performance with Data Mart Intelligence</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg shadow-sm overflow-hidden">
                        <div className="flex items-center pl-3">
                            <Calendar className="w-4 h-4 text-gray-500" />
                        </div>
                        <select
                            value={dateRange}
                            onChange={(e) => setDateRange(e.target.value as any)}
                            className="bg-transparent border-none text-sm font-medium text-gray-700 dark:text-gray-300 focus:ring-0 cursor-pointer py-2 pl-2 pr-8"
                        >
                            <option value="7days">Last 7 Days</option>
                            <option value="30days">Last 30 Days</option>
                            <option value="all">All Time</option>
                            <option value="custom">Custom Range</option>
                        </select>
                    </div>

                    {dateRange === 'custom' && (
                        <div className="flex items-center gap-2 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg shadow-sm px-3 py-1.5">
                            <input
                                type="date"
                                value={customStartDate}
                                onChange={(e) => setCustomStartDate(e.target.value)}
                                className="bg-transparent border-none text-sm text-gray-700 dark:text-gray-300 focus:ring-0 p-0"
                            />
                            <span className="text-gray-400">-</span>
                            <input
                                type="date"
                                value={customEndDate}
                                onChange={(e) => setCustomEndDate(e.target.value)}
                                className="bg-transparent border-none text-sm text-gray-700 dark:text-gray-300 focus:ring-0 p-0"
                            />
                        </div>
                    )}

                    <input type="file" accept=".csv" ref={fileInputRef} onChange={handleFileUpload} className="hidden" title="upload csv" />
                    <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-neutral-700 text-sm font-semibold rounded-lg bg-white dark:bg-neutral-800 dark:text-white">
                        <Upload className="w-4 h-4" /> Import
                    </button>
                    <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg">
                        <Download className="w-4 h-4" /> Export CSV
                    </button>
                </div>
            </div>

            {/* Interactive Tabs */}
            <div className="flex gap-2 border-b border-gray-200 dark:border-neutral-800 mb-8 overflow-x-auto no-scrollbar">
                {[
                    { id: 'overview', label: 'Overview', icon: BarChart2 },
                    { id: 'revenue', label: 'Smart Revenue', icon: DollarSign },
                    { id: 'products', label: 'Product Intel', icon: Package },
                    { id: 'trends', label: 'Trend Intel', icon: TrendingUp }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={clsx(
                            "flex items-center gap-2 px-6 py-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors",
                            activeTab === tab.id
                                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:border-gray-300"
                        )}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* TAB CONTENTS */}

            {activeTab === 'overview' && (
                <div className="animate-[fadeIn_0.3s]">
                    {/* Metric Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
                        <MetricCard
                            title="Net Revenue"
                            value={`₹${revenueStats.net.toLocaleString()}`}
                            icon={<DollarSign className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />}
                            bgClass="bg-emerald-50 dark:bg-emerald-500/10"
                            trend={revenueStats.growthRate}
                        />
                        <MetricCard
                            title="Total Orders"
                            value={revenueStats.totalOrders.toLocaleString()}
                            icon={<ShoppingBag className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />}
                            bgClass="bg-indigo-50 dark:bg-indigo-500/10"
                        />
                        <MetricCard
                            title="Refund Rate"
                            value={`${revenueStats.refundRate.toFixed(1)}%`}
                            icon={revenueStats.refundRate > 5 ? <ArrowUpRight className="w-6 h-6 text-red-600" /> : <ArrowDownRight className="w-6 h-6 text-emerald-600" />}
                            bgClass={revenueStats.refundRate > 5 ? "bg-red-50 dark:bg-red-500/10" : "bg-emerald-50 dark:bg-emerald-500/10"}
                        />
                        {/* New Dedicated Growth Card */}
                        <MetricCard
                            title="Revenue Growth"
                            value={`${revenueStats.growthRate > 0 ? '+' : ''}${revenueStats.growthRate.toFixed(1)}%`}
                            icon={<TrendingUp className={clsx("w-6 h-6", revenueStats.growthRate >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")} />}
                            bgClass={revenueStats.growthRate >= 0 ? "bg-emerald-50 dark:bg-emerald-500/10" : "bg-red-50 dark:bg-red-500/10"}
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                        <div className="lg:col-span-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Net Revenue ({chartTitleRange})</h3>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.2} />
                                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} dy={10} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} tickFormatter={(value) => `₹${value}`} />
                                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(value: number) => [`₹${value?.toFixed(0)}`, 'Revenue']} />
                                        <Line type="monotone" dataKey="revenue" stroke="#4F46E5" strokeWidth={3} dot={{ r: 4, fill: '#4F46E5', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6, strokeWidth: 0 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Daily Orders</h3>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: -20 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.2} />
                                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} dy={10} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} allowDecimals={false} />
                                        <Tooltip cursor={{ fill: 'rgba(79, 70, 229, 0.05)' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(value: number) => [value, 'Orders']} />
                                        <Bar dataKey="orders" fill="#6366F1" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'revenue' && (
                <div className="animate-[fadeIn_0.3s]">
                    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm mb-8">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Smart Revenue Intelligence</h3>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                            <div className="p-4 rounded-xl bg-gray-50 dark:bg-neutral-800">
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Gross Expected</p>
                                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">₹{revenueStats.gross.toLocaleString()}</p>
                            </div>
                            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-500/10">
                                <p className="text-sm font-medium text-red-600 dark:text-red-400">Leaked to Refunds</p>
                                <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-2">-₹{revenueStats.refunds.toLocaleString()}</p>
                            </div>
                            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10">
                                <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Actual Realized Net Revenue</p>
                                <p className="text-3xl font-bold text-emerald-600 mt-2">₹{revenueStats.net.toLocaleString()}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
                            <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-500/10">
                                <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">Total Orders</p>
                                <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-300 mt-2">{revenueStats.totalOrders.toLocaleString()}</p>
                            </div>
                            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-500/10">
                                <p className="text-sm font-medium text-red-600 dark:text-red-400">Refunded Orders</p>
                                <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-2">{revenueStats.refundedOrders}</p>
                            </div>
                            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10">
                                <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Refund Rate</p>
                                <p className="text-3xl font-bold text-amber-600 dark:text-amber-400 mt-2">{revenueStats.refundRate.toFixed(1)}%</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'products' && (
                <div className="animate-[fadeIn_0.3s]">
                    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm mb-8">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Product Intelligence Deep Dive</h3>
                        </div>

                        {topProducts.length === 0 ? (
                            <div className="text-center py-10 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-dashed border-neutral-200 dark:border-neutral-700">
                                <Package className="w-10 h-10 text-neutral-400 mx-auto mb-3" />
                                <p className="text-neutral-500 dark:text-neutral-400 font-medium">No product data available in the selected period.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse min-w-[800px]">
                                    <thead>
                                        <tr className="border-b border-neutral-200 dark:border-neutral-800 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                                            <th className="pb-3 px-4 font-medium">Product Name</th>
                                            <th className="pb-3 px-4 font-medium text-right">Units Sold</th>
                                            <th className="pb-3 px-4 font-medium text-right">Refund %</th>
                                            <th className="pb-3 px-4 font-medium text-right">ASP</th>
                                            <th className="pb-3 px-4 font-medium text-right">Gross Revenue</th>
                                            <th className="pb-3 px-4 font-medium text-right">Contribution %</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {topProducts.map((product: any, idx: number) => {
                                            const totalUnits = product.units + product.refunded_units;
                                            const refundRate = totalUnits > 0 ? (product.refunded_units / totalUnits) * 100 : 0;
                                            const asp = product.units > 0 ? (product.revenue / product.units) : 0;
                                            const contrib = revenueStats.gross > 0 ? (product.revenue / revenueStats.gross) * 100 : 0;

                                            return (
                                                <tr key={idx} className="border-b border-neutral-100 dark:border-neutral-800/50 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                                                    <td className="py-4 px-4 font-medium text-sm text-gray-900 dark:text-white">
                                                        {product.name}
                                                    </td>
                                                    <td className="py-4 px-4 text-right text-sm font-medium text-gray-600 dark:text-gray-300">
                                                        {product.units}
                                                    </td>
                                                    <td className="py-4 px-4 text-right text-sm font-medium">
                                                        <span className={clsx("px-2 py-1 rounded inline-flex font-bold", refundRate > 10 ? "bg-red-100 text-red-700" : "text-gray-600 dark:text-gray-400")}>
                                                            {refundRate.toFixed(1)}%
                                                        </span>
                                                    </td>
                                                    <td className="py-4 px-4 text-right text-sm font-medium text-gray-600 dark:text-gray-300">
                                                        ₹{asp.toFixed(2)}
                                                    </td>
                                                    <td className="py-4 px-4 text-right text-sm font-bold text-gray-900 dark:text-white">
                                                        ₹{product.revenue.toLocaleString()}
                                                    </td>
                                                    <td className="py-4 px-4 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <span className="text-xs text-gray-500">{contrib.toFixed(1)}%</span>
                                                            <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                                <div className="h-full bg-indigo-500" style={{ width: `${contrib}%` }}></div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'trends' && (
                <div className="animate-[fadeIn_0.3s]">
                    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm mb-8">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Trend Intelligence</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Moving Averages reduce daily noise to reveal actual business trajectory.</p>
                            </div>
                        </div>

                        <div className="h-[400px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.2} />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} dy={10} />
                                    <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} tickFormatter={(value) => `₹${value}`} />
                                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(value: number, name: string) => [`₹${(value || 0).toFixed(0)}`, name === 'revenue' ? 'Daily Net' : name === 'ma3' ? '3-Day Moving Avg' : '7-Day Moving Avg']} />
                                    <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />

                                    <Line yAxisId="left" type="monotone" dataKey="revenue" name="Daily Net Revenue" stroke="#cbd5e1" strokeWidth={2} dot={false} activeDot={false} opacity={0.6} />
                                    <Line yAxisId="left" type="monotone" dataKey="ma3" name="3-Day Trend" stroke="#0ea5e9" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                                    <Line yAxisId="left" type="monotone" dataKey="ma7" name="7-Day Meta-Trend" stroke="#8b5cf6" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

// Helper component for metric cards
const MetricCard = ({ title, value, icon, bgClass, trend }: { title: string, value: string | number, icon: React.ReactNode, bgClass: string, trend?: number }) => (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 md:p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-2">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
            <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", bgClass)}>
                {icon}
            </div>
        </div>
        <div className="flex items-end gap-3">
            <h3 className="text-2xl lg:text-3xl font-display font-bold text-gray-900 dark:text-white">{value}</h3>
            {trend !== undefined && (
                <span className={clsx(
                    "text-xs font-semibold px-2 py-0.5 rounded-full mb-1",
                    trend > 0 ? "text-emerald-700 bg-emerald-100 dark:bg-emerald-500/20 dark:text-emerald-400" :
                        trend < 0 ? "text-red-700 bg-red-100 dark:bg-red-500/20 dark:text-red-400" :
                            "text-gray-700 bg-gray-100 dark:bg-gray-800 dark:text-gray-400"
                )}>
                    {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
                </span>
            )}
        </div>
        {trend !== undefined && <p className="text-xs text-gray-400 mt-2">vs previous period</p>}
    </div>
);

export default Reports;