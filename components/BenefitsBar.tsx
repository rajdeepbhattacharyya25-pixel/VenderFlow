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
    return: <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-green-700"><IconReturn className="w-4 h-4" /></div>,
    shield: <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600"><IconShield className="w-4 h-4" /></div>,
    truck: <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center text-orange-600"><IconTruck className="w-4 h-4" /></div>,
    check: <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-purple-600"><IconCheck className="w-4 h-4" /></div>,
    star: <div className="w-8 h-8 rounded-full bg-yellow-50 flex items-center justify-center text-yellow-600"><IconStar className="w-4 h-4" /></div>,
    heart: <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-red-600"><IconHeart className="w-4 h-4" /></div>,
    zap: <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-600"><IconZap className="w-4 h-4" /></div>,
  };

  const defaultBadges = [
    { icon: 'return', text: 'Free Returns within 30 days' },
    { icon: 'shield', text: 'Secure SSL Payments' },
    { icon: 'truck', text: 'Free Express Shipping over ₹5,000' },
    { icon: 'check', text: 'Authenticity Guaranteed' }
  ];

  const displayBadges = badges && badges.length > 0 ? badges : defaultBadges;

  return (
    <div className="bg-white border-b border-gray-100 hidden md:block">
      <div className="max-w-7xl mx-auto px-8 py-3 flex justify-between items-center gap-8 text-xs font-medium text-gray-500 uppercase tracking-wide">
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