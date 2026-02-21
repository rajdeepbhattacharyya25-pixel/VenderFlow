import React, { useEffect, useState } from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: number;
  prefix?: string;
  suffix?: string;
  icon: LucideIcon;
  trend?: 'up' | 'down';
  color?: 'blue' | 'yellow' | 'purple';
  loading?: boolean;
}

const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  prefix = '',
  suffix = '',
  icon: Icon,
  trend,
  color = 'blue',
  loading = false
}) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (loading) return;

    let startTime: number | null = null;
    const duration = 900;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const percentage = Math.min(progress / duration, 1);
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

  const colorStyles = {
    blue: {
      bg: 'bg-sky-50 dark:bg-sky-900/10',
      iconBg: 'bg-white/60 dark:bg-sky-800/20',
      iconColor: 'text-sky-600 dark:text-sky-400',
      border: 'border-sky-100 dark:border-sky-800/20'
    },
    yellow: {
      bg: 'bg-lime-50 dark:bg-lime-900/10',
      iconBg: 'bg-white/60 dark:bg-lime-800/20',
      iconColor: 'text-lime-700 dark:text-lime-400',
      border: 'border-lime-100 dark:border-lime-800/20'
    },
    purple: {
      bg: 'bg-purple-50 dark:bg-purple-900/10',
      iconBg: 'bg-white/60 dark:bg-purple-800/20',
      iconColor: 'text-purple-600 dark:text-purple-400',
      border: 'border-purple-100 dark:border-purple-800/20'
    }
  };

  const styles = colorStyles[color];

  return (
    <div className={`
      relative overflow-hidden rounded-2xl p-6 transition-all duration-300
      ${styles.bg} border ${styles.border}
      hover:shadow-md hover:-translate-y-1
    `}>
      <div className="flex items-start justify-between relative z-10">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${styles.iconBg} ${styles.iconColor} shadow-sm`}>
              <Icon size={20} strokeWidth={1.5} />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{title}</h3>
          </div>

          <div className="text-[32px] font-display font-bold text-slate-800 dark:text-white tabular-nums leading-none tracking-tight mt-2">
            {loading ? (
              <div className="h-8 w-32 bg-slate-200 dark:bg-slate-700 animate-pulse rounded my-1"></div>
            ) : (
              <>{prefix}{formattedValue}{suffix}</>
            )}
          </div>
        </div>

        <div className="flex items-start">
          {trend === 'up' && <TrendingUp size={20} className="text-emerald-500" />}
          {trend === 'down' && <TrendingDown size={20} className="text-rose-500" />}
        </div>
      </div>
    </div>
  );
};

export default KPICard;