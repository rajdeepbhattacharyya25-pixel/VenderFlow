import React, { useEffect, useState } from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: number;
  prefix?: string;
  suffix?: string;
  icon: LucideIcon;
  trend?: 'up' | 'down';
  color?: 'blue' | 'yellow' | 'indigo';
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
    indigo: {
      bg: 'bg-indigo-50 dark:bg-indigo-900/10',
      iconBg: 'bg-white/60 dark:bg-indigo-800/20',
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      border: 'border-indigo-100 dark:border-indigo-800/20'
    }
  };

  const styles = colorStyles[color];

  return (
    <div className={`
      relative overflow-hidden rounded-xl p-3 lg:p-4 transition-all duration-300
      ${styles.bg} border ${styles.border}
      hover:shadow-sm hover:-translate-y-0.5
    `}>
      <div className="flex items-start justify-between relative z-10">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <div className={`p-1 rounded-md ${styles.iconBg} ${styles.iconColor} shadow-sm`}>
              <Icon size={14} strokeWidth={2} />
            </div>
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{title}</h3>
          </div>

          <div className="text-xl font-display font-bold text-slate-800 dark:text-white tabular-nums leading-tight tracking-tight mt-0.5">
            {loading ? (
              <div className="h-6 w-24 bg-slate-200 dark:bg-slate-700 animate-pulse rounded my-0.5"></div>
            ) : (
              <>{prefix}{formattedValue}{suffix}</>
            )}
          </div>
        </div>

        <div className="flex items-start">
          {trend === 'up' && <TrendingUp size={16} strokeWidth={2.5} className="text-emerald-500" />}
          {trend === 'down' && <TrendingDown size={16} strokeWidth={2.5} className="text-rose-500" />}
        </div>
      </div>
    </div>
  );
};

export default KPICard;