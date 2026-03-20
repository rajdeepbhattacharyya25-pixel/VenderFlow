import React, { useEffect, useState } from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: number;
  prefix?: string;
  suffix?: string;
  icon: LucideIcon;
  trend?: 'up' | 'down';
  color?: 'blue' | 'yellow' | 'primary';
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
      bg: 'bg-theme-accent-1 dark:bg-theme-accent-1/10',
      iconBg: 'bg-white/60 dark:bg-white/5',
      iconColor: 'text-sky-600 dark:text-sky-400',
      border: 'border-theme-border/50'
    },
    yellow: {
      bg: 'bg-theme-accent-2 dark:bg-theme-accent-2/10',
      iconBg: 'bg-white/60 dark:bg-white/5',
      iconColor: 'text-lime-700 dark:text-lime-400',
      border: 'border-theme-border/50'
    },
    primary: {
      bg: 'bg-theme-accent-3 dark:bg-theme-accent-3/10',
      iconBg: 'bg-white/60 dark:bg-white/5',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      border: 'border-theme-border/50'
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
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-theme-muted">{title}</h3>
          </div>

          <div className="text-xl font-heading font-bold text-theme-text tabular-nums leading-tight tracking-tight mt-0.5">
            {loading ? (
              <div className="h-6 w-24 bg-theme-bg animate-pulse rounded my-0.5"></div>
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
