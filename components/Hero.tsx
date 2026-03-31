import React from 'react';

interface HeroProps {
  onShopCollection: () => void;
  settings?: {
    badge_text?: string;
    headline_1?: string;
    headline_2?: string;
    headline_3?: string;
    description?: string;
    image_url?: string;
    button_text?: string;
  };
}

export const Hero: React.FC<HeroProps> = ({ onShopCollection, settings }) => {
  const {
    badge_text = "New Collection 2024",
    headline_1 = "Elevate Your",
    headline_2: raw_headline_2 = "Everyday",
    headline_3 = "Style",
    description = "Discover a curated selection of premium essentials designed for modern life. Quality comfort meets timeless elegance.",
    image_url = "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=2070&auto=format&fit=crop",
    button_text = "Shop Collection"
  } = settings || {};

  // Force "Everyday" if headline_2 is explicitly empty or missing
  const headline_2 = raw_headline_2 && raw_headline_2.trim() !== "" ? raw_headline_2 : "Everyday";

  return (
    <div className="mx-auto max-w-[1600px] px-0 md:px-6 pt-0 md:pt-4 mb-4 md:mb-12">
      <div className="relative bg-white dark:bg-neutral-950 md:rounded-3xl overflow-hidden transition-colors duration-300 md:border md:border-border/50">
        <div className="grid md:grid-cols-2 min-h-[500px] md:min-h-[500px] lg:min-h-[600px] items-stretch">

          {/* Content Layer (Top-centered for 320px) */}
          <div className="p-6 md:p-16 lg:p-24 flex flex-col justify-end md:justify-center items-start order-2 md:order-1 relative z-20">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20 mb-4 shadow-sm animate-in fade-in slide-in-from-left-4 duration-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400">{badge_text}</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold text-gray-900 dark:text-white leading-[0.95] mb-4 md:mb-6 font-heading tracking-[-0.05em] transition-colors animate-in fade-in slide-in-from-left-6 duration-700 delay-100">
              {headline_1} <br />
              <span className="text-emerald-600 dark:text-emerald-500 italic">{headline_2}</span> {headline_3}
            </h1>

            <p className="text-gray-500 dark:text-gray-400 mb-6 md:mb-8 max-w-md text-base md:text-lg leading-tight font-medium transition-colors whitespace-pre-line animate-in fade-in slide-in-from-left-8 duration-700 delay-200">
              {description}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
              <button
                onClick={onShopCollection}
                className="bg-brand-primary dark:bg-[#0E4B35] hover:bg-[#051C14] text-white font-bold py-4 px-10 rounded-full transition-all shadow-[0_20px_40px_-15px_rgba(9,50,35,0.3)] hover:shadow-[0_25px_50px_-12px_rgba(9,50,35,0.4)] transform active:scale-95 hover:-translate-y-1 text-center w-full sm:w-auto text-sm md:text-base border border-brand-primary/20 uppercase tracking-widest"
                style={{ minHeight: '56px', WebkitTapHighlightColor: 'transparent' }}
              >
                {button_text}
              </button>
            </div>
          </div>

          {/* Image Space with Gradient Mask */}
          <div className="relative h-[380px] md:h-auto w-full order-1 md:order-2 overflow-hidden z-10">
            <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-white dark:from-neutral-950 to-transparent z-20 md:hidden" />
            <img
              src={image_url}
              alt={headline_1}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 animate-float"
            />
            <div className="absolute inset-0 bg-emerald-950/10 mix-blend-multiply transition-opacity group-hover:opacity-0" />
            
            {/* Design accents for 320px */}
            <div className="absolute top-8 right-8 w-12 h-12 border-t-2 border-r-2 border-emerald-500/40 z-20 md:hidden animate-pulse" />
            <div className="absolute bottom-12 left-8 w-12 h-12 border-b-2 border-l-2 border-emerald-500/40 z-20 md:hidden animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
};
