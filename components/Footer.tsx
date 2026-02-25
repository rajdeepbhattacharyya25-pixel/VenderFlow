import React from 'react';
import { IconInstagram, IconTwitter, IconLinkedin, IconCreditCard } from './Icons';

interface FooterProps {
  onLinkClick: (section: 'shop' | 'company' | 'legal', key: string) => void;
  branding?: {
    storeName: string;
    description: string;
    socials?: {
      instagram?: string;
      twitter?: string;
      linkedin?: string;
    };
  };
  categories?: string[];
}

export const Footer: React.FC<FooterProps> = ({ onLinkClick, branding, categories }) => {
  const storeName = branding?.storeName || "FashionStore";
  const description = branding?.description || "Elevating everyday style with premium quality sustainable apparel. Designed for modern life.";

  return (
    <footer className="bg-[#0B1215] dark:bg-[#0B1120] text-white pt-10 md:pt-16 pb-6 md:pb-8 border-t border-gray-800 dark:border-white/5">
      <div className="max-w-[1600px] mx-auto px-4 md:px-8 flex flex-col lg:flex-row justify-between gap-10 lg:gap-12 mb-10 md:mb-16">

        {/* Column 1: Brand */}
        <div className="w-full lg:max-w-xs">
          <h4 className="font-display font-bold text-xl md:text-2xl mb-4 md:mb-6 tracking-tight uppercase">{storeName}</h4>
          <p className="text-xs md:text-sm text-gray-400 leading-relaxed mb-6 font-light">
            {description}
          </p>
          <div className="flex gap-4">
            {branding?.socials?.twitter && (
              <a href={branding.socials.twitter} target="_blank" rel="noopener noreferrer" className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-all hover:scale-110 shadow-sm hover:shadow-white/10" title="Twitter/X">
                <IconTwitter className="w-4 h-4" />
              </a>
            )}
            {branding?.socials?.linkedin && (
              <a href={branding.socials.linkedin} target="_blank" rel="noopener noreferrer" className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-all hover:scale-110 shadow-sm hover:shadow-white/10" title="LinkedIn">
                <IconLinkedin className="w-4 h-4" />
              </a>
            )}
            {branding?.socials?.instagram && (
              <a href={branding.socials.instagram} target="_blank" rel="noopener noreferrer" className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-all hover:scale-110 shadow-sm hover:shadow-white/10" title="Instagram">
                <IconInstagram className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>

        {/* Link Columns Container */}
        <div className="w-full lg:flex-1 grid grid-cols-2 sm:grid-cols-3 gap-8 md:gap-8">
          {/* Column 2: Shop */}
          {categories && categories.length > 0 && (
            <div>
              <h5 className="font-bold text-xs md:text-sm uppercase tracking-wider mb-3 md:mb-5 text-gray-300">Shop</h5>
              <ul className="text-xs md:text-sm text-gray-400">
                {categories.map((category) => (
                  <li key={category}>
                    <button onClick={() => onLinkClick('shop', category)} className="hover:text-white hover:translate-x-1 transition-all inline-block text-left font-light w-full py-2 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-sm">
                      {category}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Column 3: Company */}
          <div>
            <h5 className="font-bold text-xs md:text-sm uppercase tracking-wider mb-3 md:mb-5 text-gray-300">Company</h5>
            <ul className="text-xs md:text-sm text-gray-400">
              <li><button onClick={() => onLinkClick('company', 'About Us')} className="hover:text-white hover:translate-x-1 transition-all inline-block text-left font-light w-full py-2 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-sm">About Us</button></li>
              <li><button onClick={() => onLinkClick('company', 'Contact Us')} className="hover:text-white hover:translate-x-1 transition-all inline-block text-left font-light w-full py-2 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-sm">Contact Us</button></li>
            </ul>
          </div>

          {/* Column 4: Legal */}
          <div className={`${categories && categories.length > 0 ? '' : 'col-span-1'}`}>
            <h5 className="font-bold text-xs md:text-sm uppercase tracking-wider mb-3 md:mb-5 text-gray-300">Legal</h5>
            <ul className="text-xs md:text-sm text-gray-400">
              <li><button onClick={() => onLinkClick('legal', 'Terms & Conditions')} className="hover:text-gray-200 hover:translate-x-1 transition-all inline-block text-left font-light w-full py-2 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-sm">Terms & Conditions</button></li>
              <li><button onClick={() => onLinkClick('legal', 'Privacy Policy')} className="hover:text-gray-200 hover:translate-x-1 transition-all inline-block text-left font-light w-full py-2 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-sm">Privacy Policy</button></li>
              <li><button onClick={() => onLinkClick('legal', 'Payment Policy')} className="hover:text-gray-200 hover:translate-x-1 transition-all inline-block text-left font-light w-full py-2 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-sm">Payment Policy</button></li>
              <li><button onClick={() => onLinkClick('legal', 'Cookie Policy')} className="hover:text-gray-200 hover:translate-x-1 transition-all inline-block text-left font-light w-full py-2 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-sm">Cookie Policy</button></li>
            </ul>
          </div>
        </div>

        {/* Column 5: Newsletter */}
        <div className="w-full lg:max-w-[280px]">
          <h5 className="font-bold text-xs md:text-sm uppercase tracking-wider mb-4 md:mb-6 text-gray-300">Newsletter</h5>
          <p className="text-xs md:text-sm text-gray-400 mb-4 leading-relaxed font-light">
            Join our newsletter for exclusive deals, new arrivals, and special offers.
          </p>
          <div className="relative">
            <input
              type="email"
              placeholder="Enter your email"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-xs md:text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-white/30 transition-colors focus:ring-1 focus:ring-white/30"
            />
            <button className="absolute right-1.5 top-1.5 bottom-1.5 px-3 md:px-4 bg-white dark:bg-emerald-600 text-black dark:text-white text-[10px] md:text-xs font-bold rounded-md hover:bg-gray-200 dark:hover:bg-emerald-500 transition-colors uppercase tracking-wide">
              Join
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="max-w-[1600px] mx-auto px-4 md:px-8 pt-6 md:pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-500">
        <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4 text-center md:text-left font-light">
          <p>© 2026 {storeName}. All rights reserved.</p>
          <span className="hidden md:block w-1 h-1 bg-gray-600 rounded-full"></span>
          <p className="text-[10px] md:text-xs text-gray-400 font-medium lowercase">Secure Payments • Privacy Protected • Trusted Store</p>
        </div>

        {/* Payment Icons */}
        <div className="flex items-center gap-2 opacity-80 hover:opacity-100 transition-opacity">
          <div className="h-5 md:h-6 px-1.5 md:px-2 bg-white rounded flex items-center justify-center border border-gray-700">
            <IconCreditCard className="w-3 h-3 md:w-4 md:h-4 text-gray-800" />
          </div>
          <div className="h-5 md:h-6 px-1.5 md:px-2 bg-white rounded flex items-center justify-center border border-gray-700">
            <span className="text-[8px] md:text-[9px] font-bold text-blue-900 uppercase">VISA</span>
          </div>
          <div className="h-5 md:h-6 px-1.5 md:px-2 bg-white rounded flex items-center justify-center border border-gray-700">
            <span className="text-[8px] md:text-[9px] font-bold text-orange-600">Mastercard</span>
          </div>
          <div className="h-5 md:h-6 px-1.5 md:px-2 bg-white rounded flex items-center justify-center border border-gray-700">
            <span className="text-[8px] md:text-[9px] font-bold text-gray-800 uppercase">UPI</span>
          </div>
        </div>
      </div>
    </footer>
  );
};