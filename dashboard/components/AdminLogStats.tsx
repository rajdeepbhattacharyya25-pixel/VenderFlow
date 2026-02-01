import React from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend
} from 'recharts';
import { Activity, PieChart as PieIcon } from 'lucide-react';

interface AuditLog {
    id: string;
    action: string;
    created_at: string;
}

interface AdminLogStatsProps {
    logs: AuditLog[];
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const AdminLogStats: React.FC<AdminLogStatsProps> = ({ logs }) => {
    const [dateRange, setDateRange] = React.useState<'7d' | '30d' | 'custom'>('7d');
    const [customStart, setCustomStart] = React.useState('');
    const [customEnd, setCustomEnd] = React.useState('');

    // Process data for Activity Chart
    const getActivityData = () => {
        let days = 7;
        let start = new Date();
        start.setHours(0, 0, 0, 0);

        if (dateRange === '30d') {
            days = 30;
            start.setDate(start.getDate() - 29);
        } else if (dateRange === 'custom' && customStart && customEnd) {
            const s = new Date(customStart);
            const e = new Date(customEnd);
            const diffTime = Math.abs(e.getTime() - s.getTime());
            days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            start = s;
        } else {
            // Default 7d
            start.setDate(start.getDate() - 6);
        }

        const dateArray = Array.from({ length: days }, (_, i) => {
            const d = new Date(start);
            d.setDate(d.getDate() + i);
            return d.toISOString().split('T')[0];
        });

        return dateArray.map(date => {
            // Filter logs for this specific date (ignoring time)
            const count = logs.filter(log => log.created_at.startsWith(date)).length;
            return {
                date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                count
            };
        });
    };

    // Process data for Action Distribution
    const getActionData = () => {
        const counts: Record<string, number> = {};
        logs.forEach(log => {
            const action = log.action.split('_')[0]; // Group by prefix (e.g., "seller" from "seller_suspended")
            counts[action] = (counts[action] || 0) + 1;
        });

        return Object.entries(counts)
            .map(([name, value]) => ({
                name: name.charAt(0).toUpperCase() + name.slice(1),
                value
            }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5); // Top 5 categories
    };

    const activityData = getActivityData();
    const actionData = getActionData();

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Activity Chart */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-500/10 text-indigo-400 rounded-xl flex items-center justify-center">
                            <Activity size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-white">Activity Volume</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <select
                                    value={dateRange}
                                    onChange={(e) => setDateRange(e.target.value as any)}
                                    className="bg-neutral-800 border-none text-xs text-neutral-400 rounded-lg py-1 pl-2 pr-6 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                                >
                                    <option value="7d">Last 7 Days</option>
                                    <option value="30d">Last 30 Days</option>
                                    <option value="custom">Custom Range</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {dateRange === 'custom' && (
                        <div className="flex items-center gap-2 bg-neutral-800 p-1.5 rounded-lg border border-neutral-700">
                            <input
                                type="date"
                                value={customStart}
                                onChange={(e) => setCustomStart(e.target.value)}
                                className="bg-transparent text-xs text-white border-none focus:ring-0 p-0 w-24"
                            />
                            <span className="text-neutral-500">-</span>
                            <input
                                type="date"
                                value={customEnd}
                                onChange={(e) => setCustomEnd(e.target.value)}
                                className="bg-transparent text-xs text-white border-none focus:ring-0 p-0 w-24"
                            />
                        </div>
                    )}
                </div>
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={activityData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                            <XAxis
                                dataKey="date"
                                stroke="#737373"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                stroke="#737373"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                allowDecimals={false}
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#171717', border: '1px solid #262626', borderRadius: '8px', color: '#fff' }}
                                itemStyle={{ color: '#fff' }}
                                cursor={{ fill: '#262626' }}
                            />
                            <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Distribution Chart */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center">
                        <PieIcon size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-white">Action Types</h3>
                        <p className="text-xs text-neutral-400">Distribution by category</p>
                    </div>
                </div>
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={actionData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {actionData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ backgroundColor: '#171717', border: '1px solid #262626', borderRadius: '8px', color: '#fff' }}
                                itemStyle={{ color: '#fff' }}
                            />
                            <Legend
                                verticalAlign="bottom"
                                height={36}
                                iconType="circle"
                                formatter={(value) => <span className="text-sm text-neutral-400 ml-1">{value}</span>}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default AdminLogStats;
