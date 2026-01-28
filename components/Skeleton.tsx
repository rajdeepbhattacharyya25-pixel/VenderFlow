import React from 'react';
import { clsx } from 'clsx';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'rectangular' | 'circular' | 'product-card';
  width?: string | number;
  height?: string | number;
  lines?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  variant = 'rectangular',
  width,
  height,
  lines = 1
}) => {
  const baseClasses = 'animate-pulse bg-gray-200 dark:bg-gray-700 rounded';

  if (variant === 'product-card') {
    return (
      <div className={clsx('flex flex-col h-full', className)}>
        {/* Image skeleton */}
        <div className="relative bg-gray-200 dark:bg-gray-700 rounded-2xl overflow-hidden mb-4 aspect-[3/4]">
          <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 animate-pulse" />
        </div>

        {/* Content skeleton */}
        <div className="flex flex-col gap-2 px-1 flex-grow">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 animate-pulse" />
          <div className="flex items-center gap-1 mt-auto pt-1">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="w-3 h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              ))}
            </div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-8 animate-pulse ml-1" />
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'text') {
    return (
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={clsx(
              baseClasses,
              'h-4',
              index === lines - 1 && lines > 1 ? 'w-3/4' : 'w-full',
              className
            )}
            style={{
              width: width ? (typeof width === 'number' ? `${width}px` : width) : undefined,
              height: height ? (typeof height === 'number' ? `${height}px` : height) : undefined
            }}
          />
        ))}
      </div>
    );
  }

  const shapeClasses = {
    rectangular: '',
    circular: 'rounded-full'
  };

  return (
    <div
      className={clsx(baseClasses, shapeClasses[variant], className)}
      style={{
        width: width ? (typeof width === 'number' ? `${width}px` : width) : undefined,
        height: height ? (typeof height === 'number' ? `${height}px` : height) : undefined
      }}
    />
  );
};

// Specialized skeleton for hero section
export const HeroSkeleton: React.FC = () => (
  <div className="mx-auto max-w-[1600px] px-4 md:px-6 pt-4 mb-12">
    <div className="relative bg-gray-200 dark:bg-gray-700 rounded-3xl overflow-hidden shadow-sm animate-pulse">
      <div className="grid md:grid-cols-2 min-h-[500px] lg:min-h-[600px] items-center">
        {/* Content skeleton */}
        <div className="p-8 md:p-16 lg:p-24 flex flex-col justify-center items-start order-2 md:order-1 relative z-10 space-y-6">
          <Skeleton variant="rectangular" width="120px" height="8px" className="rounded-full" />
          <div className="space-y-4">
            <Skeleton variant="rectangular" width="300px" height="48px" />
            <Skeleton variant="rectangular" width="250px" height="48px" />
          </div>
          <Skeleton variant="rectangular" width="400px" height="16px" />
          <div className="flex gap-4">
            <Skeleton variant="rectangular" width="140px" height="48px" className="rounded-full" />
            <Skeleton variant="rectangular" width="120px" height="48px" className="rounded-full" />
          </div>
        </div>

        {/* Image skeleton */}
        <div className="relative h-[300px] md:h-full w-full order-1 md:order-2">
          <Skeleton variant="rectangular" className="w-full h-full" />
        </div>
      </div>
    </div>
  </div>
);

// Specialized skeleton for scrollable section
export const ScrollableSectionSkeleton: React.FC<{ compact?: boolean }> = ({ compact = false }) => (
  <div className="relative group">
    <div className="flex items-end justify-between mb-6 px-1">
      <div className="space-y-2">
        <Skeleton variant="rectangular" width="100px" height="8px" className="rounded-full" />
        <Skeleton variant="rectangular" width="200px" height="32px" />
      </div>
      <Skeleton variant="rectangular" width="100px" height="40px" className="rounded-full" />
    </div>

    <div className="flex gap-4 overflow-hidden">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className={compact ? 'w-[160px] md:w-[180px] lg:w-[200px]' : 'w-[260px] md:w-[280px] lg:w-[300px]'}>
          <Skeleton variant="product-card" />
        </div>
      ))}
    </div>
  </div>
);