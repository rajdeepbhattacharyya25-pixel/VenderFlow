import React from 'react';
import { IconReturn, IconShield, IconTruck, IconCheck, IconStar, IconHeart, IconZap } from './Icons';

interface BenefitsBarProps {
  badges?: {
    icon: string;
    text: string;
  }[];
}

export const BenefitsBar: React.FC<BenefitsBarProps> = ({ badges }) => {
  const iconMap: { [key: string]: any } = {
    return: <div className="w-8 h-8 rounded-full bg-green-50 dark:bg-green-900/30 flex items-center justify-center text-green-700 dark:text-green-400"><IconReturn className="w-4 h-4" /></div>,
    shield: <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400"><IconShield className="w-4 h-4" /></div>,
    truck: <div className="w-8 h-8 rounded-full bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400"><IconTruck className="w-4 h-4" /></div>,
    check: <div className="w-8 h-8 rounded-full bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400"><IconCheck className="w-4 h-4" /></div>,
    star: <div className="w-8 h-8 rounded-full bg-yellow-50 dark:bg-yellow-900/30 flex items-center justify-center text-yellow-600 dark:text-yellow-400"><IconStar className="w-4 h-4" /></div>,
    heart: <div className="w-8 h-8 rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400"><IconHeart className="w-4 h-4" /></div>,
    zap: <div className="w-8 h-8 rounded-full bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400"><IconZap className="w-4 h-4" /></div>,
  };

  const defaultBadges = [
    { icon: 'return', text: 'Free Returns within 30 days' },
    { icon: 'shield', text: 'Secure SSL Payments' },
    { icon: 'truck', text: 'Free Express Shipping over ₹5,000' },
    { icon: 'check', text: 'Authenticity Guaranteed' }
  ];

  const displayBadges = badges && badges.length > 0 ? badges : defaultBadges;

  return (
    <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 hidden md:block transition-colors">
      <div className="max-w-7xl mx-auto px-8 py-3 flex justify-between items-center gap-8 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
        {displayBadges.map((badge, idx) => (
          <div key={idx} className="flex items-center gap-3">
            {iconMap[badge.icon] || iconMap['star']}
            <span>{badge.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
};