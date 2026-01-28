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
  const badgeText = settings?.badge_text || "New Collection 2024";
  const headline1 = settings?.headline_1 || "Elevate Your";
  const headline2 = settings?.headline_2 || "Everyday";
  const headline3 = settings?.headline_3 || "Style";
  const description = settings?.description || "Discover a curated selection of premium essentials designed for modern life. Quality comfort meets timeless elegance.";
  const imageUrl = settings?.image_url || "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=2070&auto=format&fit=crop";
  const buttonText = settings?.button_text || "Shop Collection";

  return (
    <div className="mx-auto max-w-[1600px] px-4 md:px-6 pt-4 mb-12">
      <div className="relative bg-[#F4F5F0] dark:bg-surface-dark rounded-3xl overflow-hidden shadow-sm transition-colors duration-300">
        <div className="grid md:grid-cols-2 min-h-[400px] lg:min-h-[500px] items-center">

          {/* Content */}
          <div className="p-6 md:p-12 lg:p-16 flex flex-col justify-center items-start order-2 md:order-1 relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 mb-6 shadow-sm transition-colors">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
              <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-primary dark:text-gray-200">{badgeText}</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold text-gray-900 dark:text-white leading-[1.1] mb-6 font-display transition-colors text-left uppercase">
              {headline1} <br />
              <span className="italic font-light text-gray-700 dark:text-gray-300 lowercase">{headline2}</span> {headline3}
            </h1>

            <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md text-base md:text-lg leading-relaxed font-light transition-colors">
              {description}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <button
                onClick={onShopCollection}
                className="bg-primary hover:bg-gray-900 dark:bg-white dark:text-black dark:hover:bg-gray-200 text-white font-medium py-4 px-8 rounded-full transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1 text-center w-full sm:w-auto"
              >
                {buttonText}
              </button>
            </div>
          </div>

          {/* Image */}
          <div className="relative h-[300px] md:h-full w-full order-1 md:order-2 overflow-hidden group">
            <img
              src={imageUrl}
              alt="Fashion Hero"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent md:hidden"></div>
          </div>
        </div>
      </div>
    </div>
  );
};