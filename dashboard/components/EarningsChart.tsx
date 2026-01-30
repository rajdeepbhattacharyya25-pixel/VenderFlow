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
import { ChartData } from '../types';

interface EarningsChartProps {
  monthlyData: ChartData[];
  weeklyData: ChartData[];
  isDark: boolean;
}

const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-text text-bg px-3 py-1.5 rounded-full text-xs font-medium shadow-xl transform transition-all duration-200 scale-100 opacity-100 flex items-center gap-2">
        <span>{label}</span>
        <span className="w-px h-3 bg-bg/20"></span>
        <span>₹{payload[0].value?.toLocaleString('en-IN')}</span>
      </div>
    );
  }
  return null;
};

const EarningsChart: React.FC<EarningsChartProps> = ({ monthlyData, weeklyData, isDark }) => {
  const [timeRange, setTimeRange] = useState('Monthly');

  const currentData = timeRange === 'Monthly' ? monthlyData : weeklyData;

  return (
    <div className="bg-panel rounded-xl p-4 sm:p-6 shadow-sm border border-muted/10 h-[300px] sm:h-[400px] flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-sm font-bold text-text">Earning Analytics</h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full bg-[#A7D129]"></span>
            <span className="text-muted font-medium">Earning</span>
          </div>
          <div className="relative">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="bg-bg text-text text-xs font-medium py-1 px-3 rounded-lg outline-none border border-muted/20 focus:border-muted cursor-pointer appearance-none pr-8"
            >
              <option>Monthly</option>
              <option>Weekly</option>
            </select>
            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
              <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
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
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--chart-line)" stopOpacity={0.2} />
                <stop offset="95%" stopColor="var(--chart-line)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--muted)" strokeOpacity={0.1} strokeDasharray="3 3" />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'var(--muted)', fontSize: 11 }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'var(--muted)', fontSize: 11 }}
              tickFormatter={(value) => `${value >= 1000 ? value / 1000 + 'k' : value}`}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ stroke: 'var(--text)', strokeWidth: 1, strokeDasharray: '4 4' }}
            />
            <Area
              key={timeRange} // Force re-render animation when range changes
              type="monotone"
              dataKey="value"
              stroke="var(--chart-line)"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorValue)"
              animationDuration={1200}
              animationEasing="cubic-bezier(0.25, 0.1, 0.25, 1)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default EarningsChart;