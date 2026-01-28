import React from 'react';
import { IconFacebook, IconInstagram, IconEmail, IconCreditCard } from './Icons';

interface FooterProps {
  onLinkClick: (section: 'shop' | 'support' | 'legal', key: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onLinkClick }) => {
  return (
    <footer className="bg-[#0B1215] text-white pt-16 pb-8 mt-20 border-t border-gray-800">
      <div className="max-w-[1600px] mx-auto px-6 md:px-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-16">
        
        {/* Column 1: Brand */}
        <div className="lg:col-span-1">
          <h4 className="font-display font-bold text-2xl mb-6 tracking-tight">FashionStore</h4>
          <p className="text-sm text-gray-400 leading-relaxed mb-6">
            Elevating everyday style with premium quality sustainable apparel. Designed for modern life.
          </p>
          <div className="flex gap-4">
            <button className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-all hover:scale-110 shadow-sm hover:shadow-white/10">
              <IconFacebook className="w-4 h-4" />
            </button>
            <button className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-all hover:scale-110 shadow-sm hover:shadow-white/10">
              <IconInstagram className="w-4 h-4" />
            </button>
            <button className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-all hover:scale-110 shadow-sm hover:shadow-white/10">
              <IconEmail className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Column 2: Shop */}
        <div>
          <h5 className="font-bold text-sm uppercase tracking-wider mb-6 text-gray-300">Shop</h5>
          <ul className="text-sm text-gray-400 space-y-4">
            <li><button onClick={() => onLinkClick('shop', 'Women')} className="hover:text-white hover:translate-x-1 transition-all inline-block text-left">Women's Collection</button></li>
            <li><button onClick={() => onLinkClick('shop', 'Men')} className="hover:text-white hover:translate-x-1 transition-all inline-block text-left">Men's Collection</button></li>
            <li><button onClick={() => onLinkClick('shop', 'Kids')} className="hover:text-white hover:translate-x-1 transition-all inline-block text-left">Kids' Collection</button></li>
            <li><button onClick={() => onLinkClick('shop', 'Accessories')} className="hover:text-white hover:translate-x-1 transition-all inline-block text-left">Accessories</button></li>
            <li><button onClick={() => onLinkClick('shop', 'New Arrivals')} className="hover:text-white hover:translate-x-1 transition-all inline-block text-left">New Arrivals</button></li>
            <li><button onClick={() => onLinkClick('shop', 'Best Sellers')} className="hover:text-white hover:translate-x-1 transition-all inline-block text-primary-light font-medium text-left">Best Sellers</button></li>
          </ul>
        </div>
        
        {/* Column 3: Support */}
        <div>
          <h5 className="font-bold text-sm uppercase tracking-wider mb-6 text-gray-300">Support</h5>
          <ul className="text-sm text-gray-400 space-y-4">
            <li><button onClick={() => onLinkClick('support', 'Contact Us')} className="hover:text-white hover:translate-x-1 transition-all inline-block text-left">Contact Us</button></li>
            <li><button onClick={() => onLinkClick('support', 'Order Status')} className="hover:text-white hover:translate-x-1 transition-all inline-block text-left">Order Status</button></li>
            <li><button onClick={() => onLinkClick('support', 'Shipping Policy')} className="hover:text-white hover:translate-x-1 transition-all inline-block text-left">Shipping Policy</button></li>
            <li><button onClick={() => onLinkClick('support', 'Returns & Refunds')} className="hover:text-white hover:translate-x-1 transition-all inline-block text-left">Returns & Refunds</button></li>
            <li><button onClick={() => onLinkClick('support', 'Size Guide')} className="hover:text-white hover:translate-x-1 transition-all inline-block text-left">Size Guide</button></li>
          </ul>
        </div>

        {/* Column 4: Legal */}
        <div>
          <h5 className="font-bold text-sm uppercase tracking-wider mb-6 text-gray-300">Legal</h5>
          <ul className="text-sm text-gray-400 space-y-4">
            <li><button onClick={() => onLinkClick('legal', 'Terms & Conditions')} className="hover:text-gray-200 hover:translate-x-1 transition-all inline-block text-left">Terms & Conditions</button></li>
            <li><button onClick={() => onLinkClick('legal', 'Privacy Policy')} className="hover:text-gray-200 hover:translate-x-1 transition-all inline-block text-left">Privacy Policy</button></li>
            <li><button onClick={() => onLinkClick('legal', 'Payment Policy')} className="hover:text-gray-200 hover:translate-x-1 transition-all inline-block text-left">Payment Policy</button></li>
            <li><button onClick={() => onLinkClick('legal', 'Cookie Policy')} className="hover:text-gray-200 hover:translate-x-1 transition-all inline-block text-left">Cookie Policy</button></li>
          </ul>
        </div>
        
        {/* Column 5: Newsletter */}
        <div className="lg:col-span-1">
          <h5 className="font-bold text-sm uppercase tracking-wider mb-6 text-gray-300">Newsletter</h5>
          <p className="text-sm text-gray-400 mb-4 leading-relaxed">
            Join our newsletter for exclusive deals, new arrivals, and special offers.
          </p>
          <div className="relative">
            <input 
              type="email" 
              placeholder="Enter your email" 
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-white/30 transition-colors focus:ring-1 focus:ring-white/30"
            />
            <button className="absolute right-1.5 top-1.5 bottom-1.5 px-4 bg-white text-black text-xs font-bold rounded-md hover:bg-gray-200 transition-colors uppercase tracking-wide">
              Join
            </button>
          </div>
        </div>
      </div>
      
      {/* Bottom Bar */}
      <div className="max-w-[1600px] mx-auto px-6 md:px-8 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-500">
        <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4 text-center md:text-left">
          <p>© 2024 FashionStore. All rights reserved.</p>
          <span className="hidden md:block w-1 h-1 bg-gray-600 rounded-full"></span>
          <p className="text-gray-400 font-medium">Secure Payments • Privacy Protected • Trusted Store</p>
        </div>
        
        {/* Payment Icons */}
        <div className="flex items-center gap-2 opacity-80 hover:opacity-100 transition-opacity">
          <div className="h-6 px-2 bg-white rounded flex items-center justify-center border border-gray-700">
            <IconCreditCard className="w-4 h-4 text-gray-800" />
          </div>
           <div className="h-6 px-2 bg-white rounded flex items-center justify-center border border-gray-700">
            <span className="text-[9px] font-bold text-blue-900">VISA</span>
          </div>
          <div className="h-6 px-2 bg-white rounded flex items-center justify-center border border-gray-700">
            <span className="text-[9px] font-bold text-orange-600">Mastercard</span>
          </div>
          <div className="h-6 px-2 bg-white rounded flex items-center justify-center border border-gray-700">
            <span className="text-[9px] font-bold text-gray-800">UPI</span>
          </div>
        </div>
      </div>
    </footer>
  );
};