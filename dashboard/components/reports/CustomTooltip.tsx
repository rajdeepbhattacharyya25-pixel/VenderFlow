import React from 'react';

export const CustomTooltip = ({ active, payload, label, formatter }: any) => {
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
