import React from 'react';
import { cn } from '../../../lib/utils';

interface CustomTooltipProps {
    active?: boolean;
    payload?: Array<{
        name: string;
        value: any;
        color?: string;
        payload?: any;
    }>;
    label?: string;
    formatter?: (value: any, name: string) => [string, string];
}

export const CustomTooltip = ({ active, payload, label, formatter }: CustomTooltipProps) => {
    if (!active || !payload?.length) return null;
    
    return (
        <div className="backdrop-blur-xl bg-neutral-900/80 border border-white/10 rounded-xl px-4 py-3 shadow-2xl">
            <p className="text-xs font-medium text-gray-400 mb-1.5">{label}</p>
            {payload.map((entry, i) => {
                const [valueDisplay, nameDisplay] = formatter 
                    ? formatter(entry.value, entry.name) 
                    : [entry.value, entry.name];

                return (
                    <div key={i} className="flex items-center gap-2">
                        {entry.color && (
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                        )}
                        <span className="text-sm font-bold text-white">
                            {valueDisplay}
                        </span>
                        <span className="text-xs text-gray-400">{nameDisplay}</span>
                    </div>
                );
            })}
        </div>
    );
};

interface GlassCardProps {
    children: React.ReactNode;
    className?: string;
    glowColor?: string;
}

export const GlassCard = ({ children, className = '', glowColor = '' }: GlassCardProps) => (
    <div className={cn(
        "relative bg-white/[0.03] dark:bg-white/[0.03] backdrop-blur-sm border border-white/[0.08] rounded-2xl p-5 md:p-6 transition-all duration-300 hover:border-white/[0.15] group",
        glowColor,
        className
    )}>
        {children}
    </div>
);
