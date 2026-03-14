import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Sector, Tooltip } from 'recharts';
import { DonutData } from '../types';
import { MoreHorizontal } from 'lucide-react';

interface DonutChartProps {
  data: DonutData[];
}

const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent } = props;
  return (
    <g>
      <text x={cx} y={cy} dy={-10} textAnchor="middle" fill="var(--text)" className="text-2xl font-bold">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
       <text x={cx} y={cy} dy={15} textAnchor="middle" fill="var(--muted)" className="text-xs">
        {payload.name === 'Online orders' ? 'Online' : 'In-Store'}
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        cornerRadius={6}
      />
    </g>
  );
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-panel border border-muted/20 shadow-xl px-4 py-2 rounded-lg text-xs font-medium z-50 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: data.payload.color }}></div>
            <span className="text-muted">{data.name}</span>
        </div>
        <div className="text-base font-bold text-text pl-4">
            {data.value}%
        </div>
      </div>
    );
  }
  return null;
};

const DonutChartSection: React.FC<DonutChartProps> = ({ data }) => {
  const [activeIndex, setActiveIndex] = useState(0);

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  return (
    <div className="bg-panel rounded-xl p-6 shadow-sm border border-muted/10 mb-6 relative">
       <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-bold text-text">Mode of Order</h3>
        <button className="text-muted hover:text-text transition-colors"><MoreHorizontal size={18}/></button>
      </div>

      <div className="h-[220px] w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              activeIndex={activeIndex}
              activeShape={renderActiveShape}
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
              onMouseEnter={onPieEnter}
              stroke="none"
              cornerRadius={6}
              paddingAngle={2}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="flex justify-center gap-6 mt-4">
        {data.map((entry, index) => (
            <div key={index} className="flex items-center gap-2">
                <div 
                    className="w-3 h-3 rounded-sm transition-transform duration-200" 
                    style={{ backgroundColor: entry.color, transform: activeIndex === index ? 'scale(1.2)' : 'scale(1)' }}
                ></div>
                <span className={`text-xs font-medium ${activeIndex === index ? 'text-text' : 'text-muted'}`}>{entry.name}</span>
            </div>
        ))}
      </div>
    </div>
  );
};

export default DonutChartSection;
