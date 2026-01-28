import React, { useState, useEffect } from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import { adminDb } from '../../../lib/admin-api';

interface ChartData {
    name: string;
    value: number;
}

interface RevenueChartProps {
    className?: string;
}

interface CustomTooltipProps {
    active?: boolean;
    payload?: Array<{ value?: number }>;
    label?: string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white text-neutral-900 px-3 py-2 rounded-lg text-xs font-medium shadow-xl border border-neutral-200">
                <span className="block text-neutral-500 text-[10px] uppercase tracking-wider mb-1">{label}</span>
                <span className="text-sm font-bold">₹{payload[0].value?.toLocaleString('en-IN')}</span>
            </div>
        );
    }
    return null;
};

const RevenueChart: React.FC<RevenueChartProps> = ({ className = '' }) => {
    const [timeRange, setTimeRange] = useState<'monthly' | 'weekly'>('monthly');
    const [loading, setLoading] = useState(true);
    const [monthlyData, setMonthlyData] = useState<ChartData[]>([]);
    const [weeklyData, setWeeklyData] = useState<ChartData[]>([]);

    useEffect(() => {
        fetchChartData();
    }, []);

    const fetchChartData = async () => {
        setLoading(true);
        try {
            const data = await adminDb.getRevenueChartData();
            setMonthlyData(data.monthly);
            setWeeklyData(data.weekly);
        } catch (error) {
            console.error('Error fetching chart data:', error);
        } finally {
            setLoading(false);
        }
    };

    const currentData = timeRange === 'monthly' ? monthlyData : weeklyData;

    return (
        <div className={`bg-neutral-900 border border-neutral-800 rounded-2xl p-6 h-80 flex flex-col ${className}`}>
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white">Revenue Growth</h2>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setTimeRange('weekly')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${timeRange === 'weekly'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                            }`}
                    >
                        Weekly
                    </button>
                    <button
                        onClick={() => setTimeRange('monthly')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${timeRange === 'monthly'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                            }`}
                    >
                        Monthly
                    </button>
                </div>
            </div>

            <div className="flex-1 w-full min-h-0">
                {loading ? (
                    <div className="h-full flex items-center justify-center text-neutral-500">
                        Loading chart data...
                    </div>
                ) : currentData.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-neutral-500">
                        No revenue data available
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                            data={currentData}
                            margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                        >
                            <defs>
                                <linearGradient id="adminColorValue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid
                                vertical={false}
                                stroke="#404040"
                                strokeOpacity={0.3}
                                strokeDasharray="3 3"
                            />
                            <XAxis
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#737373', fontSize: 11 }}
                                dy={10}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#737373', fontSize: 11 }}
                                tickFormatter={(value) => {
                                    if (value >= 100000) return `${(value / 100000).toFixed(0)}L`;
                                    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                                    return value.toString();
                                }}
                            />
                            <Tooltip
                                content={<CustomTooltip />}
                                cursor={{ stroke: '#6366f1', strokeWidth: 1, strokeDasharray: '4 4' }}
                            />
                            <Area
                                key={timeRange}
                                type="monotone"
                                dataKey="value"
                                stroke="#6366f1"
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#adminColorValue)"
                                animationDuration={800}
                                animationEasing="ease-out"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
};

export default RevenueChart;
