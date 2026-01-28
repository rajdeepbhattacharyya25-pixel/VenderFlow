import React from 'react';
import { IconReturn, IconShield, IconTruck, IconCheck } from './Icons';

export const BenefitsBar: React.FC = () => {
  return (
    <div className="bg-white border-b border-gray-100 hidden md:block">
      <div className="max-w-7xl mx-auto px-8 py-3 flex justify-between items-center gap-8 text-xs font-medium text-gray-500 uppercase tracking-wide">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-green-700">
             <IconReturn className="w-4 h-4" />
          </div>
          <span>Free Returns within 30 days</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
             <IconShield className="w-4 h-4" />
          </div>
          <span>Secure SSL Payments</span>
        </div>
        <div className="flex items-center gap-3">
           <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center text-orange-600">
             <IconTruck className="w-4 h-4" />
          </div>
          <span>Free Express Shipping over ₹5,000</span>
        </div>
        <div className="flex items-center gap-3">
           <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
             <IconCheck className="w-4 h-4" />
          </div>
          <span>Authenticity Guaranteed</span>
        </div>
      </div>
    </div>
  );
};