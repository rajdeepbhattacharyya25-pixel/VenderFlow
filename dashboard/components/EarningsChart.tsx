import React, { useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  TooltipProps,
} from 'recharts';
import { ChartDataPoint as ChartData } from '../types';

interface EarningsChartProps {
  monthlyData: ChartData[];
  weeklyData: ChartData[];
  isDark: boolean;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const isEarning = payload[0].dataKey === 'value';
    const val = payload[0].value;
    return (
      <div className="bg-theme-text text-theme-bg px-3 py-1.5 rounded-full text-xs font-medium shadow-xl transform transition-all duration-200 scale-100 opacity-100 flex items-center gap-2">
        <span>{label}</span>
        <span className="w-px h-3 bg-theme-bg/20"></span>
        <span>{isEarning ? `₹${val?.toLocaleString('en-IN')}` : `${val} Orders`}</span>
      </div>
    );
  }
  return null;
};

const EarningsChart: React.FC<EarningsChartProps> = ({ monthlyData, weeklyData, isDark }) => {
  const [timeRange, setTimeRange] = useState('Monthly');
  const [metric, setMetric] = useState<'Earnings' | 'Sales'>('Earnings');

  const currentData = timeRange === 'Monthly' ? monthlyData : weeklyData;

  return (
    <div className="bg-theme-panel rounded-xl p-4 sm:p-6 shadow-sm border border-theme-border/50 h-[300px] sm:h-[400px] flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-sm font-bold text-theme-text">Analytics Overview</h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs">
            <span className={`w-2 h-2 rounded-full ${metric === 'Earnings' ? 'bg-[#A7D129]' : 'bg-[#3b82f6]'}`}></span>
            <span className="text-theme-muted font-medium">{metric}</span>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <select
                value={metric}
                onChange={(e) => setMetric(e.target.value as 'Earnings' | 'Sales')}
                aria-label="Metric filter"
                className="bg-theme-bg text-theme-text text-xs font-medium py-1 px-3 rounded-lg outline-none border border-theme-border focus:border-theme-muted/50 cursor-pointer appearance-none pr-8"
              >
                <option value="Earnings">Earnings</option>
                <option value="Sales">Sales</option>
              </select>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-theme-muted">
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
            </div>
            <div className="relative">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                aria-label="Time range filter"
                className="bg-theme-bg text-theme-text text-xs font-medium py-1 px-3 rounded-lg outline-none border border-theme-border focus:border-theme-muted/50 cursor-pointer appearance-none pr-8"
              >
                <option>Monthly</option>
                <option>Weekly</option>
              </select>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-theme-muted">
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={currentData}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorEarning" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#84cc16" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#84cc16" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--dashboard-muted)" strokeOpacity={0.2} strokeDasharray="3 3" />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'var(--dashboard-muted)', fontSize: 11 }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'var(--dashboard-muted)', fontSize: 11 }}
              tickFormatter={(value) => metric === 'Earnings' ? `${value >= 1000 ? value / 1000 + 'k' : value}` : value}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ stroke: 'var(--dashboard-text)', strokeWidth: 1, strokeDasharray: '4 4' }}
            />
            <Area
              key={timeRange + metric}
              type="monotone"
              dataKey={metric === 'Earnings' ? 'value' : 'sales'}
              stroke={metric === 'Earnings' ? '#84cc16' : '#3b82f6'}
              strokeWidth={3}
              fillOpacity={1}
              fill={metric === 'Earnings' ? 'url(#colorEarning)' : 'url(#colorSales)'}
              animationDuration={1200}
              animationEasing="ease-in-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default EarningsChart;
