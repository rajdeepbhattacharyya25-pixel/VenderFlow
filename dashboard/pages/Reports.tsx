import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Order } from '../../types';
import Papa from 'papaparse';
import {
    LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell
} from 'recharts';
import { TrendingUp, ShoppingBag, DollarSign, Package, Download, Calendar, Upload, X, ArrowDownRight, ArrowUpRight, BarChart2, Activity, Zap, Shield, AlertTriangle, Award, Trophy, Medal } from 'lucide-react';
import { clsx } from 'clsx';
import AnalyticsGuide from '../components/AnalyticsGuide';
import { AnalyticsAIOracle } from '../components/analytics/AnalyticsAIOracle';
import { MetricCard } from '../components/reports/MetricCard';

// Custom glassmorphic tooltip
const CustomTooltip = ({ active, payload, label, formatter }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="backdrop-blur-xl bg-neutral-900/80 border border-white/10 rounded-xl px-4 py-3 shadow-2xl">
            <p className="text-xs font-medium text-gray-400 mb-1.5">{label}</p>
            {payload.map((entry: any, i: number) => (
                <div key={i} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-sm font-bold text-white">
                        {formatter ? formatter(entry.value, entry.name)?.[0] : entry.value}
                    </span>
                    <span className="text-xs text-gray-400">{formatter ? formatter(entry.value, entry.name)?.[1] : entry.name}</span>
                </div>
            ))}
        </div>
    );
};

// Glass card wrapper
const GlassCard = ({ children, className = '', glowColor = '' }: { children: React.ReactNode, className?: string, glowColor?: string }) => (
    <div className={clsx(
        "relative bg-white/[0.03] dark:bg-white/[0.03] backdrop-blur-sm border border-white/[0.08] rounded-2xl p-5 md:p-6 transition-all duration-300 hover:border-white/[0.15] group",
        glowColor,
        className
    )}>
        {children}
    </div>
);

const Reports = () => {
    // Live Data State
    const [orders, setOrders] = useState<Order[]>([]);
    const [dailyMetrics, setDailyMetrics] = useState<any[]>([]);
    const [productMetrics, setProductMetrics] = useState<any[]>([]);
    const [inventoryForecast, setInventoryForecast] = useState<any[]>([]);

    // CSV Import State
    const [importedOrders, setImportedOrders] = useState<Order[] | null>(null);

    // UI State
    const [loading, setLoading] = useState(true);
    const [sellerId, setSellerId] = useState<string | null>(null);
    const [dateRange, setDateRange] = useState<'7days' | '30days' | 'all' | 'custom'>('30days');
    const [activeTab, setActiveTab] = useState<'overview' | 'revenue' | 'products' | 'trends' | 'inventory'>('overview');
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

                // Fetch Inventory Forecast (Phase 6 AI Suite)
                const { data: inventoryData } = await supabase
                    .from('inventory_forecast_analysis')
                    .select('*')
                    .eq('seller_id', sellerId);
                if (inventoryData) setInventoryForecast(inventoryData);
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
        const dataToExport = importedOrders || orders;
        if (dataToExport.length === 0) {
            alert("No data available to export.");
            return;
        }

        const headers = ["Order ID", "Date", "Total", "Status", "Items Count"];
        const rows = dataToExport.map(o => [
            o.id,
            new Date(o.created_at).toISOString(),
            o.total,
            o.status,
            o.items?.length || 0
        ]);

        const csvContent = "data:text/csv;charset=utf-8," 
            + [headers, ...rows].map(e => e.join(",")).join("\n");
        
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
        <div className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto animate-[fadeIn_0.5s_ease-out]">
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
                    <h1 className="text-3xl font-heading font-bold text-gray-900 dark:text-white mb-2">Business Analytics</h1>
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
                    <AnalyticsGuide />
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
                    { id: 'trends', label: 'Trend Intel', icon: TrendingUp },
                    { id: 'inventory', label: 'Inventory Foresight', icon: Zap }
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

            {/* AI ORACLE */}
            <AnalyticsAIOracle 
                revenueStats={revenueStats}
                topProducts={topProducts}
                chartData={chartData}
            />

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
                        <div className="lg:col-span-2 bg-white dark:bg-white/[0.03] border border-neutral-200 dark:border-white/[0.08] rounded-2xl p-6 backdrop-blur-sm">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Net Revenue ({chartTitleRange})</h3>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                        <defs>
                                            <linearGradient id="overviewGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.25} />
                                                <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--dashboard-muted)" opacity={0.2} />
                                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--dashboard-muted)' }} dy={10} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--dashboard-muted)' }} tickFormatter={(v) => `₹${v}`} />
                                        <Tooltip content={<CustomTooltip formatter={(v: number) => [`₹${v?.toFixed(0)}`, 'Revenue']} />} />
                                        <Area type="monotone" dataKey="revenue" stroke="#4F46E5" strokeWidth={2.5} fill="url(#overviewGradient)" dot={false} activeDot={{ r: 5, fill: '#4F46E5', strokeWidth: 2, stroke: '#fff' }} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-white/[0.03] border border-neutral-200 dark:border-white/[0.08] rounded-2xl p-6 backdrop-blur-sm">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Daily Orders</h3>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: -20 }}>
                                        <defs>
                                            <linearGradient id="ordersBarGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#6366F1" stopOpacity={1} />
                                                <stop offset="100%" stopColor="#818CF8" stopOpacity={0.6} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--dashboard-muted)" opacity={0.2} />
                                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--dashboard-muted)' }} dy={10} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--dashboard-muted)' }} allowDecimals={false} />
                                        <Tooltip content={<CustomTooltip formatter={(v: number) => [v, 'Orders']} />} cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }} />
                                        <Bar dataKey="orders" fill="url(#ordersBarGradient)" radius={[6, 6, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'revenue' && (() => {
                const healthScore = Math.max(0, Math.min(100, Math.round(100 - revenueStats.refundRate * 5 + (revenueStats.growthRate > 0 ? 15 : -10))));
                return (
                    <div className="animate-[fadeIn_0.3s] space-y-6">
                        {/* Revenue Waterfall Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                            <div className="relative overflow-hidden bg-white dark:bg-white/[0.03] border border-neutral-200 dark:border-indigo-500/20 rounded-2xl p-6 backdrop-blur-sm group hover:border-indigo-500/40 transition-all duration-300">
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent pointer-events-none" />
                                <div className="relative z-10">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center"><DollarSign className="w-4 h-4 text-indigo-400" /></div>
                                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Gross Revenue</p>
                                    </div>
                                    <p className="text-3xl font-bold text-gray-900 dark:text-white mb-3">₹{revenueStats.gross.toLocaleString()}</p>
                                    <div className="h-1 w-full bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-full" style={{ width: '100%' }} /></div>
                                </div>
                            </div>
                            <div className="relative overflow-hidden bg-white dark:bg-white/[0.03] border border-neutral-200 dark:border-red-500/20 rounded-2xl p-6 backdrop-blur-sm group hover:border-red-500/40 transition-all duration-300">
                                <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent pointer-events-none" />
                                <div className="relative z-10">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center"><AlertTriangle className="w-4 h-4 text-red-400" /></div>
                                        <p className="text-sm font-medium text-red-500 dark:text-red-400">Leaked to Refunds</p>
                                    </div>
                                    <p className="text-3xl font-bold text-red-500 dark:text-red-400 mb-3">-₹{revenueStats.refunds.toLocaleString()}</p>
                                    <div className="h-1 w-full bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full" style={{ width: `${revenueStats.gross > 0 ? (revenueStats.refunds / revenueStats.gross * 100) : 0}%` }} /></div>
                                </div>
                            </div>
                            <div className="relative overflow-hidden bg-white dark:bg-white/[0.03] border border-neutral-200 dark:border-emerald-500/20 rounded-2xl p-6 backdrop-blur-sm group hover:border-emerald-500/40 transition-all duration-300">
                                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
                                <div className="relative z-10">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center"><Zap className="w-4 h-4 text-emerald-400" /></div>
                                        <p className="text-sm font-medium text-emerald-500 dark:text-emerald-400">Net Revenue</p>
                                    </div>
                                    <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mb-3">₹{revenueStats.net.toLocaleString()}</p>
                                    <div className="h-1 w-full bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full" style={{ width: `${revenueStats.gross > 0 ? (revenueStats.net / revenueStats.gross * 100) : 0}%` }} /></div>
                                </div>
                            </div>
                        </div>

                        {/* Order Metrics Row */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                            <div className="bg-white dark:bg-white/[0.03] border border-neutral-200 dark:border-white/[0.08] rounded-2xl p-5 backdrop-blur-sm">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Orders</p>
                                        <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">{revenueStats.totalOrders.toLocaleString()}</p>
                                    </div>
                                    <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center"><ShoppingBag className="w-5 h-5 text-indigo-400" /></div>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-white/[0.03] border border-neutral-200 dark:border-white/[0.08] rounded-2xl p-5 backdrop-blur-sm">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Refunded Orders</p>
                                        <p className="text-2xl font-bold text-red-500 dark:text-red-400 mt-1">{revenueStats.refundedOrders}</p>
                                    </div>
                                    <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center"><Package className="w-5 h-5 text-red-400" /></div>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-white/[0.03] border border-neutral-200 dark:border-white/[0.08] rounded-2xl p-5 backdrop-blur-sm">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Refund Rate</p>
                                        <p className="text-2xl font-bold text-amber-500 dark:text-amber-400 mt-1">{revenueStats.refundRate.toFixed(1)}%</p>
                                    </div>
                                    <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center"><Shield className="w-5 h-5 text-amber-400" /></div>
                                </div>
                            </div>
                        </div>

                        {/* Revenue Trend Area Chart */}
                        <div className="bg-white dark:bg-white/[0.03] border border-neutral-200 dark:border-white/[0.08] rounded-2xl p-6 backdrop-blur-sm">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Revenue Trend ({chartTitleRange})</h3>
                            <div className="h-[320px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                        <defs>
                                            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--dashboard-muted)" opacity={0.2} />
                                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--dashboard-muted)' }} dy={10} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--dashboard-muted)' }} tickFormatter={(v) => `₹${v}`} />
                                        <Tooltip content={<CustomTooltip formatter={(v: number) => [`₹${v?.toFixed(0)}`, 'Revenue']} />} />
                                        <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2.5} fill="url(#revenueGradient)" dot={false} activeDot={{ r: 5, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Revenue Health Indicator */}
                        <div className="bg-white dark:bg-white/[0.03] border border-neutral-200 dark:border-white/[0.08] rounded-2xl p-6 backdrop-blur-sm">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Revenue Health</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Based on refund rate, growth trajectory, and order volume</p>
                                </div>
                                <span className={clsx("text-2xl font-bold", healthScore >= 70 ? "text-emerald-500" : healthScore >= 40 ? "text-amber-500" : "text-red-500")}>{healthScore}/100</span>
                            </div>
                            <div className="h-3 w-full bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all duration-700 ease-out"
                                    style={{
                                        width: `${healthScore}%`,
                                        background: `linear-gradient(90deg, #ef4444 0%, #f59e0b 40%, #10b981 70%, #059669 100%)`
                                    }}
                                />
                            </div>
                            <div className="flex justify-between mt-2 text-xs text-gray-400">
                                <span>Critical</span><span>Needs Attention</span><span>Healthy</span><span>Excellent</span>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {activeTab === 'products' && (
                <div className="animate-[fadeIn_0.3s] space-y-6">
                    {topProducts.length === 0 ? (
                        <div className="text-center py-16 bg-white dark:bg-white/[0.03] rounded-2xl border border-neutral-200 dark:border-white/[0.08] border-dashed">
                            <Package className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
                            <p className="text-neutral-500 dark:text-neutral-400 font-medium text-lg">No product data available</p>
                            <p className="text-neutral-400 dark:text-neutral-500 text-sm mt-1">Import data or wait for orders in the selected period.</p>
                        </div>
                    ) : (
                        <>
                            {/* Top 3 Product Spotlight */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                                {topProducts.slice(0, 3).map((product: any, idx: number) => {
                                    const contrib = revenueStats.gross > 0 ? (product.revenue / revenueStats.gross * 100) : 0;
                                    const rankColors = [
                                        { border: 'border-amber-500/30 hover:border-amber-500/50', bg: 'from-amber-500/10', icon: 'text-amber-400', label: '#1' },
                                        { border: 'border-gray-400/30 hover:border-gray-400/50', bg: 'from-gray-400/10', icon: 'text-gray-400', label: '#2' },
                                        { border: 'border-orange-600/30 hover:border-orange-600/50', bg: 'from-orange-600/10', icon: 'text-orange-500', label: '#3' }
                                    ];
                                    const rank = rankColors[idx];
                                    return (
                                        <div key={idx} className={clsx("relative overflow-hidden bg-white dark:bg-white/[0.03] border rounded-2xl p-5 backdrop-blur-sm transition-all duration-300", rank.border)}>
                                            <div className={clsx("absolute inset-0 bg-gradient-to-br to-transparent pointer-events-none", rank.bg)} />
                                            <div className="relative z-10">
                                                <div className="flex items-center justify-between mb-3">
                                                    <span className={clsx("text-xs font-bold px-2.5 py-1 rounded-full bg-white/5 border border-white/10", rank.icon)}>{rank.label}</span>
                                                    <Award className={clsx("w-5 h-5", rank.icon)} />
                                                </div>
                                                <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate mb-2">{product.name}</h4>
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-xs text-gray-400">Units Sold</p>
                                                        <p className="text-lg font-bold text-gray-900 dark:text-white">{product.units.toLocaleString()}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-xs text-gray-400">Contribution</p>
                                                        <p className="text-lg font-bold text-indigo-500 dark:text-indigo-400">{contrib.toFixed(1)}%</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Product Performance Table */}
                            <div className="bg-white dark:bg-white/[0.03] border border-neutral-200 dark:border-white/[0.08] rounded-2xl p-6 backdrop-blur-sm">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Product Performance</h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse min-w-[800px]">
                                        <thead>
                                            <tr className="border-b border-neutral-200 dark:border-white/[0.08] text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                                                <th className="pb-3 px-4 font-medium">Product</th>
                                                <th className="pb-3 px-4 font-medium text-right">Units</th>
                                                <th className="pb-3 px-4 font-medium text-right">Refund %</th>
                                                <th className="pb-3 px-4 font-medium text-right">ASP</th>
                                                <th className="pb-3 px-4 font-medium text-right">Revenue</th>
                                                <th className="pb-3 px-4 font-medium text-right">Share</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {topProducts.map((product: any, idx: number) => {
                                                const totalUnits = product.units + product.refunded_units;
                                                const refundRate = totalUnits > 0 ? (product.refunded_units / totalUnits) * 100 : 0;
                                                const asp = product.units > 0 ? (product.revenue / product.units) : 0;
                                                const contrib = revenueStats.gross > 0 ? (product.revenue / revenueStats.gross) * 100 : 0;
                                                const maxUnits = ((topProducts as any)[0] as any)?.units || 1;

                                                return (
                                                    <tr key={idx} className="border-b border-neutral-100 dark:border-white/[0.04] hover:bg-indigo-50/50 dark:hover:bg-white/[0.02] transition-colors">
                                                        <td className="py-4 px-4">
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-xs font-bold text-theme-muted w-5">{idx + 1}</span>
                                                                <span className="font-medium text-sm text-theme-text">{product.name}</span>
                                                            </div>
                                                        </td>
                                                        <td className="py-4 px-4 text-right">
                                                            <div className="flex items-center justify-end gap-2">
                                                                <span className="text-sm font-medium text-theme-text opacity-80">{product.units.toLocaleString()}</span>
                                                                <div className="w-12 h-1.5 bg-theme-border/20 rounded-full overflow-hidden">
                                                                    <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${(product.units / maxUnits) * 100}%` }} />
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="py-4 px-4 text-right">
                                                            <span className={clsx(
                                                                "text-xs font-bold px-2.5 py-1 rounded-full",
                                                                refundRate > 10 ? "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400" :
                                                                    refundRate > 5 ? "bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400" :
                                                                        "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                                                            )}>
                                                                {refundRate.toFixed(1)}%
                                                            </span>
                                                        </td>
                                                        <td className="py-4 px-4 text-right text-sm font-medium text-gray-600 dark:text-gray-300">₹{asp.toFixed(0)}</td>
                                                        <td className="py-4 px-4 text-right text-sm font-bold text-gray-900 dark:text-white">₹{product.revenue.toLocaleString()}</td>
                                                        <td className="py-4 px-4 text-right">
                                                            <div className="flex items-center justify-end gap-2">
                                                                <span className="text-xs font-semibold text-gray-500">{contrib.toFixed(1)}%</span>
                                                                <div className="w-16 h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                                                                    <div className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full transition-all duration-500" style={{ width: `${contrib}%` }} />
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Revenue Distribution Chart */}
                            <div className="bg-white dark:bg-white/[0.03] border border-neutral-200 dark:border-white/[0.08] rounded-2xl p-6 backdrop-blur-sm">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Revenue Distribution</h3>
                                <div className="h-[300px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={topProducts.slice(0, 8).map((p: any) => ({ name: p.name.length > 20 ? p.name.slice(0, 20) + '…' : p.name, revenue: p.revenue }))} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
                                            <defs>
                                                <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                                                    <stop offset="0%" stopColor="#6366f1" />
                                                    <stop offset="100%" stopColor="#22d3ee" />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--dashboard-muted)" opacity={0.2} />
                                            <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--dashboard-muted)' }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                                            <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--dashboard-muted)' }} width={80} />
                                            <Tooltip content={<CustomTooltip formatter={(v: number) => [`₹${v?.toLocaleString()}`, 'Revenue']} />} />
                                            <Bar dataKey="revenue" fill="url(#barGradient)" radius={[0, 6, 6, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Refund Risk Matrix */}
                            {topProducts.filter((p: any) => {
                                const total = p.units + p.refunded_units;
                                return total > 0 && (p.refunded_units / total) * 100 > 10;
                            }).length > 0 && (
                                    <div className="bg-white dark:bg-white/[0.03] border border-red-500/20 rounded-2xl p-6 backdrop-blur-sm">
                                        <div className="flex items-center gap-3 mb-5">
                                            <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center"><AlertTriangle className="w-4 h-4 text-red-400" /></div>
                                            <div>
                                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Refund Risk Matrix</h3>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">Products with refund rate exceeding 10%</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {topProducts.filter((p: any) => {
                                                const total = p.units + p.refunded_units;
                                                return total > 0 && (p.refunded_units / total) * 100 > 10;
                                            }).map((product: any, idx: number) => {
                                                const total = product.units + product.refunded_units;
                                                const rate = (product.refunded_units / total) * 100;
                                                return (
                                                    <div key={idx} className="p-4 rounded-xl bg-red-50/50 dark:bg-red-500/5 border border-red-200/50 dark:border-red-500/10">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{product.name}</h4>
                                                            <span className="text-xs font-bold text-red-500 bg-red-100 dark:bg-red-500/20 px-2 py-0.5 rounded-full">{rate.toFixed(1)}%</span>
                                                        </div>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">{product.refunded_units} units refunded out of {total} total — ₹{product.refund_amount?.toLocaleString() || 0} lost</p>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                        </>
                    )}
                </div>
            )}

            {activeTab === 'trends' && (() => {
                const lastRevenue = chartData[chartData.length - 1]?.revenue || 0;
                const lastMa3 = chartData[chartData.length - 1]?.ma3 || 0;
                const lastMa7 = chartData[chartData.length - 1]?.ma7 || 0;
                const prevMa7 = chartData[chartData.length - 3]?.ma7 || lastMa7;
                const momentum = lastMa3 > 0 ? ((lastRevenue - lastMa3) / lastMa3 * 100) : 0;
                const weeklyDir = lastMa7 > prevMa7 ? 'Up' : lastMa7 < prevMa7 ? 'Down' : 'Flat';
                const revenueValues = chartData.map((d: any) => d.revenue).filter(Boolean);
                const mean = revenueValues.length > 0 ? revenueValues.reduce((a: number, b: number) => a + b, 0) / revenueValues.length : 0;
                const variance = revenueValues.length > 0 ? revenueValues.reduce((sum: number, v: number) => sum + Math.pow(v - mean, 2), 0) / revenueValues.length : 0;
                const stdDev = Math.sqrt(variance);
                const volatility = mean > 0 ? Math.min(100, Math.round((stdDev / mean) * 100)) : 0;

                return (
                    <div className="animate-[fadeIn_0.3s] space-y-6">
                        {/* Header with Trend Badges */}
                        <div className="bg-white dark:bg-white/[0.03] border border-neutral-200 dark:border-white/[0.08] rounded-2xl p-6 backdrop-blur-sm">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Trend Intelligence</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Moving Averages reduce daily noise to reveal actual business trajectory.</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-gray-400/60" /><span className="text-xs text-gray-400">Daily</span></div>
                                    <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-sky-400" /><span className="text-xs text-gray-400">3-Day MA</span></div>
                                    <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-violet-500" /><span className="text-xs text-gray-400">7-Day MA</span></div>
                                </div>
                            </div>

                            <div className="h-[450px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="trendGradient7" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="trendGradient3" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.1} />
                                                <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--dashboard-muted)" opacity={0.2} />
                                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--dashboard-muted)' }} dy={10} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--dashboard-muted)' }} tickFormatter={(v) => `₹${v}`} />
                                        <Tooltip content={<CustomTooltip formatter={(v: number, name: string) => [`₹${(v || 0).toFixed(0)}`, name === 'revenue' ? 'Daily Net' : name === 'ma3' ? '3-Day MA' : '7-Day MA']} />} />
                                        <Area type="monotone" dataKey="revenue" name="Daily Net Revenue" stroke="#94a3b8" strokeWidth={1.5} fill="none" dot={false} opacity={0.5} />
                                        <Area type="monotone" dataKey="ma3" name="3-Day Trend" stroke="#0ea5e9" strokeWidth={2} fill="url(#trendGradient3)" dot={false} activeDot={{ r: 4, fill: '#0ea5e9', strokeWidth: 2, stroke: '#fff' }} />
                                        <Area type="monotone" dataKey="ma7" name="7-Day Meta-Trend" stroke="#8b5cf6" strokeWidth={3} fill="url(#trendGradient7)" dot={false} activeDot={{ r: 5, fill: '#8b5cf6', strokeWidth: 2, stroke: '#fff' }} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Trend Insight Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                            <div className="bg-white dark:bg-white/[0.03] border border-neutral-200 dark:border-white/[0.08] rounded-2xl p-5 backdrop-blur-sm">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center"><Activity className="w-4 h-4 text-sky-400" /></div>
                                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Short-term Momentum</p>
                                </div>
                                <div className="flex items-end gap-2">
                                    <p className={clsx("text-2xl font-bold", momentum >= 0 ? "text-emerald-500" : "text-red-500")}>{momentum > 0 ? '+' : ''}{momentum.toFixed(1)}%</p>
                                    {momentum >= 0 ? <ArrowUpRight className="w-5 h-5 text-emerald-400 mb-1" /> : <ArrowDownRight className="w-5 h-5 text-red-400 mb-1" />}
                                </div>
                                <p className="text-xs text-gray-400 mt-2">Current vs 3-day average</p>
                            </div>
                            <div className="bg-white dark:bg-white/[0.03] border border-neutral-200 dark:border-white/[0.08] rounded-2xl p-5 backdrop-blur-sm">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center"><TrendingUp className="w-4 h-4 text-violet-400" /></div>
                                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Weekly Trend Direction</p>
                                </div>
                                <p className={clsx("text-2xl font-bold", weeklyDir === 'Up' ? "text-emerald-500" : weeklyDir === 'Down' ? "text-red-500" : "text-gray-400")}>{weeklyDir === 'Up' ? '↗ Upward' : weeklyDir === 'Down' ? '↘ Downward' : '→ Flat'}</p>
                                <p className="text-xs text-gray-400 mt-2">Based on 7-day moving average</p>
                            </div>
                            <div className="bg-white dark:bg-white/[0.03] border border-neutral-200 dark:border-white/[0.08] rounded-2xl p-5 backdrop-blur-sm">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center"><Zap className="w-4 h-4 text-amber-400" /></div>
                                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Volatility Score</p>
                                </div>
                                <div className="flex items-end gap-2">
                                    <p className={clsx("text-2xl font-bold", volatility < 30 ? "text-emerald-500" : volatility < 60 ? "text-amber-500" : "text-red-500")}>{volatility}/100</p>
                                    <span className={clsx("text-xs font-semibold px-2 py-0.5 rounded-full mb-1", volatility < 30 ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" : volatility < 60 ? "bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400" : "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400")}>
                                        {volatility < 30 ? 'Stable' : volatility < 60 ? 'Moderate' : 'High'}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-400 mt-2">Revenue coefficient of variation</p>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {activeTab === 'inventory' && (
                <div className="animate-[fadeIn_0.3s] space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                        <MetricCard
                            title="Total SKUs"
                            value={inventoryForecast.length.toString()}
                            icon={<Package className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />}
                            bgClass="bg-indigo-50 dark:bg-indigo-500/10"
                        />
                        <MetricCard
                            title="Critical Alerts"
                            value={inventoryForecast.filter(i => i.stock_status === 'Critical' || i.stock_status === 'Out of Stock').length.toString()}
                            icon={<AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />}
                            bgClass="bg-red-50 dark:bg-red-500/10"
                        />
                        <MetricCard
                            title="Avg Stockout Window"
                            value={`${Math.round(inventoryForecast.reduce((acc, i) => acc + (i.days_until_stockout || 0), 0) / (inventoryForecast.length || 1))} Days`}
                            icon={<Activity className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />}
                            bgClass="bg-emerald-50 dark:bg-emerald-500/10"
                        />
                        <MetricCard
                            title="Health Score"
                            value={`${Math.round((inventoryForecast.filter(i => i.stock_status === 'Healthy').length / (inventoryForecast.length || 1)) * 100)}%`}
                            icon={<Trophy className="w-6 h-6 text-amber-600 dark:text-amber-400" />}
                            bgClass="bg-amber-50 dark:bg-amber-500/10"
                        />
                    </div>

                    <div className="bg-white dark:bg-white/[0.03] border border-neutral-200 dark:border-white/[0.08] rounded-2xl overflow-hidden backdrop-blur-sm">
                        <div className="p-6 border-b border-neutral-200 dark:border-white/[0.08] flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Predictive Inventory Insights</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">30-day forecast based on recent velocity and seasonality.</p>
                            </div>
                            <div className="px-3 py-1.5 bg-indigo-500/10 rounded-lg flex items-center gap-2">
                                <Zap className="w-4 h-4 text-indigo-400 animate-pulse" />
                                <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">AI Powered</span>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-neutral-50 dark:bg-neutral-900/50">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Product</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-center">Current Stock</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-center">Est. Velocity</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-center">Stockout In</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-100 dark:divide-white/[0.05]">
                                    {inventoryForecast.sort((a,b) => (a.days_until_stockout || 999) - (b.days_until_stockout || 999)).map((item, idx) => (
                                        <tr key={idx} className="hover:bg-neutral-50 dark:hover:bg-white/[0.02] transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-neutral-200 dark:bg-neutral-800 shrink-0">
                                                        {item.image_url && <img src={item.image_url} alt={item.name} className="w-full h-full object-cover rounded-lg" />}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-indigo-500 transition-colors">{item.name}</p>
                                                        <p className="text-xs text-gray-500">Category: {item.category}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="text-sm font-bold text-gray-900 dark:text-white">{item.stock_quantity || 0}</span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="text-sm text-gray-500">{item.avg_daily_velocity?.toFixed(2) || 0} / day</span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex flex-col items-center">
                                                    <span className={clsx(
                                                        "text-sm font-bold",
                                                        (item.days_until_stockout || 0) < 7 ? "text-red-500" : (item.days_until_stockout || 0) < 14 ? "text-amber-500" : "text-emerald-500"
                                                    )}>
                                                        {item.days_until_stockout === 0 ? 'CRITICAL' : `${item.days_until_stockout || 0} Days`}
                                                    </span>
                                                    {item.expected_stockout_date && (
                                                        <span className="text-[10px] text-gray-400">{new Date(item.expected_stockout_date).toLocaleDateString()}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className={clsx(
                                                    "text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full",
                                                    item.stock_status === 'Healthy' ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" :
                                                    item.stock_status === 'Critical' ? "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400" :
                                                    "bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400"
                                                )}>
                                                    {item.stock_status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default Reports;
