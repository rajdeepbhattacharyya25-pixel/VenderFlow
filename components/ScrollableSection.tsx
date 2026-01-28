import React, { useRef, useState, useEffect } from 'react';
import { Product } from '../types';
import { ProductCard } from './ProductCard';
import { IconChevronLeft, IconChevronRight } from './Icons';

interface ScrollableSectionProps {
  title: string;
  badge?: string;
  badgeColor?: string;
  products: Product[];
  onViewAll: () => void;
  onQuickView: (product: Product) => void;
  onToggleWishlist: (product: Product) => void;
  isWishlisted: (id: number) => boolean;
  onAddToCart: (product: Product) => void;
  compact?: boolean;
}

export const ScrollableSection: React.FC<ScrollableSectionProps> = ({
  title,
  badge,
  badgeColor = "text-primary",
  products,
  onViewAll,
  onQuickView,
  onToggleWishlist,
  isWishlisted,
  onAddToCart,
  compact = false
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(true);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeftFade(scrollLeft > 10); // 10px buffer
      // Allow a small buffer for float calculation diffs
      setShowRightFade(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', checkScroll);
      // Check initially
      checkScroll();
      // Check on resize
      window.addEventListener('resize', checkScroll);
    }
    return () => {
      if (el) el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [products]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = compact ? 200 : 350; // Adjust scroll amount for compact cards
      scrollRef.current.scrollBy({
        left: direction === 'right' ? scrollAmount : -scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const getMaskStyle = () => {
    const fadeWidth = '40px';
    const stops = [];

    if (showLeftFade) {
      stops.push(`transparent`, `black ${fadeWidth}`);
    } else {
      stops.push(`black 0%`);
    }

    if (showRightFade) {
      stops.push(`black calc(100% - ${fadeWidth})`, `transparent`);
    } else {
      stops.push(`black 100%`);
    }

    const gradient = `linear-gradient(to right, ${stops.join(', ')})`;

    return {
      WebkitMaskImage: gradient,
      maskImage: gradient
    };
  };

  return (
    <div className="relative group">
      <div className="flex items-end justify-between mb-6 px-1">
        <div>
          {badge && (
            <div className="flex items-center gap-2 mb-2">
              {badge === "Just Dropped" && <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>}
              <span className={`text-xs font-bold uppercase tracking-wider ${badgeColor}`}>{badge}</span>
            </div>
          )}
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white font-display transition-colors">{title}</h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => scroll('left')}
            className={`w-10 h-10 rounded-full border border-gray-200 dark:border-gray-700 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 transition-all focus:outline-none hidden md:flex ${!showLeftFade ? 'opacity-50 cursor-not-allowed' : 'opacity-100'}`}
            aria-label="Scroll left"
            disabled={!showLeftFade}
          >
            <IconChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
          <button
            onClick={() => scroll('right')}
            className={`w-10 h-10 rounded-full border border-gray-200 dark:border-gray-700 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 transition-all focus:outline-none hidden md:flex ${!showRightFade ? 'opacity-50 cursor-not-allowed' : 'opacity-100'}`}
            aria-label="Scroll right"
            disabled={!showRightFade}
          >
            <IconChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
          <button
            onClick={onViewAll}
            className="ml-4 flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white hover:text-primary dark:hover:text-primary-light transition-colors group whitespace-nowrap"
          >
            View All <IconChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto hide-scroll pb-8 snap-x snap-mandatory -mx-4 px-4 md:mx-0 md:px-0 transition-all duration-300"
        style={getMaskStyle()}
      >
        {products.map((product) => (
          <div key={product.id} className={`${compact ? 'w-[160px] md:w-[180px] lg:w-[200px]' : 'w-[220px] md:w-[240px] lg:w-[260px]'} flex-none snap-start`}>
            <ProductCard
              product={product}
              onQuickView={onQuickView}
              isWishlisted={isWishlisted(product.id)}
              onToggleWishlist={onToggleWishlist}
              onAddToCart={onAddToCart}
              compact={compact}
            />
          </div>
        ))}
        {/* View All Card at the end */}
        <div className={`${compact ? 'w-[120px]' : 'w-[200px]'} flex-none flex items-center justify-center snap-start`}>
          <button
            onClick={onViewAll}
            className="group flex flex-col items-center gap-3 text-gray-400 dark:text-gray-500 hover:text-primary dark:hover:text-primary-light transition-colors p-8"
          >
            <div className={`${compact ? 'w-12 h-12' : 'w-16 h-16'} rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center group-hover:border-primary group-hover:bg-primary/5 dark:group-hover:bg-primary/20 transition-all`}>
              <IconChevronRight className={`${compact ? 'w-4 h-4' : 'w-6 h-6'}`} />
            </div>
            <span className={`font-medium ${compact ? 'text-xs' : 'text-sm'}`}>View All {title}</span>
          </button>
        </div>
      </div>
    </div>
  );
};