import React, { useEffect, useState } from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: number;
  prefix?: string;
  suffix?: string;
  icon: LucideIcon;
  trend?: 'up' | 'down';
  accentColorClass: string;
  loading?: boolean;
}

const KPICard: React.FC<KPICardProps> = ({ title, value, prefix = '', suffix = '', icon: Icon, trend, accentColorClass, loading = false }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (loading) return; // Don't animate if loading

    let startTime: number | null = null;
    const duration = 900; // ms

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const percentage = Math.min(progress / duration, 1);

      // easeOutCubic
      const ease = 1 - Math.pow(1 - percentage, 3);

      setDisplayValue(value * ease);

      if (progress < duration) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value, loading]);

  const formattedValue = displayValue.toLocaleString(undefined, {
    minimumFractionDigits: value % 1 !== 0 ? 2 : 0,
    maximumFractionDigits: 2,
  });

  return (
    <div className={`card-hover relative overflow-hidden rounded-xl p-5 ${accentColorClass} transition-colors duration-300 dark:border dark:border-white/5`}>
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 mb-2">
            {/* Dark mode icon bg changed to white/10 for visibility on colored backgrounds */}
            <div className="p-1.5 rounded-lg bg-white/40 dark:bg-white/10 backdrop-blur-sm text-text">
              <Icon size={16} />
            </div>
            <h3 className="text-[13px] font-semibold uppercase tracking-wide text-text opacity-70">{title}</h3>
          </div>
          <div className="text-[28px] lg:text-[32px] font-bold text-text tabular-nums leading-none">
            {loading ? (
              <div className="h-8 w-32 bg-black/10 dark:bg-white/10 animate-pulse rounded my-1"></div>
            ) : (
              <>{prefix}{formattedValue}{suffix}</>
            )}
          </div>
        </div>

        <div className="flex items-end h-full pt-6">
          {trend === 'up' && <TrendingUp size={20} className="text-text opacity-50" />}
          {trend === 'down' && <TrendingDown size={20} className="text-text opacity-50" />}
        </div>
      </div>
    </div>
  );
};

export default KPICard;