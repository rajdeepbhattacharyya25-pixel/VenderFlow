import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { IconInstagram, IconTwitter, IconLinkedin } from './Icons';

interface FooterProps {
  onLinkClick: (section: 'shop' | 'company' | 'legal', key: string) => void;
  branding?: {
    storeName: string;
    logoUrl?: string;
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
  const [email, setEmail] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsSubscribing(true);
    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          type: 'info',
          title: 'New Newsletter Signup',
          message: `Subscriber: ${email}`,
          is_read: false
        });

      if (error) throw error;
      toast.success('Welcome to the inner circle! 🥂', { style: { background: '#333', color: '#fff' } });
      setEmail('');
    } catch (err) {
      console.error('Newsletter error:', err);
      toast.error('Something went wrong, please try again.');
    } finally {
      setIsSubscribing(false);
    }
  };

  const description = branding?.description || "Elevating everyday style with premium quality sustainable apparel. Designed for modern life.";

  return (
    <footer className="bg-[#0B1215] dark:bg-[#06080A] text-white pt-6 pb-2 border-t border-white/5 relative overflow-hidden">
      {/* Decorative background accent for 320px */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] pointer-events-none" />
      
      <div className="max-w-[1600px] mx-auto px-6 md:px-8 flex flex-col lg:flex-row justify-between gap-8 lg:gap-16 mb-4 md:mb-6">

        {/* Column 1: Brand */}
        <div className="w-full lg:max-w-xs transition-all duration-500 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex flex-col gap-2 mb-3">
            <div className="flex items-center gap-3">
              {branding?.logoUrl ? (
                <img 
                  src={branding.logoUrl} 
                  alt={storeName} 
                  className="w-12 h-12 rounded-2xl object-cover shadow-2xl bg-neutral-800 border border-white/10 p-0.5" 
                />
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-xl border border-white/20">
                  <span className="text-white font-black text-xl select-none">
                    {storeName?.[0]?.toUpperCase() || 'S'}
                  </span>
                </div>
              )}
              <h4 className="font-heading font-black text-3xl tracking-tighter uppercase m-0 bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-gray-500">
                {storeName}
              </h4>
            </div>
          </div>
          <p className="text-sm text-gray-400 leading-relaxed mb-2 font-medium">
            {description}
          </p>
          <div className="flex gap-4">
            {[
              { icon: IconTwitter, link: branding?.socials?.twitter, label: 'Twitter' },
              { icon: IconLinkedin, link: branding?.socials?.linkedin, label: 'LinkedIn' },
              { icon: IconInstagram, link: branding?.socials?.instagram, label: 'Instagram' }
            ].map((social, i) => social.link && (
              <a 
                key={i}
                href={social.link} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="w-11 h-11 rounded-xl bg-white/5 hover:bg-emerald-500 hover:text-black flex items-center justify-center text-white transition-all hover:scale-110 border border-white/5"
                title={social.label}
              >
                <social.icon className="w-5 h-5" />
              </a>
            ))}
          </div>
        </div>

        {/* Link Columns Container */}
        <div className="w-full lg:flex-1 grid grid-cols-1 sm:grid-cols-3 gap-10 md:gap-8">
          {/* Column 2: Shop */}
          {categories && categories.length > 0 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 delay-100">
              <h5 className="font-black text-[10px] uppercase tracking-[0.2em] mb-2 text-emerald-500 px-1">Discover Shop</h5>
              <ul className="flex flex-col gap-1">
                {categories.map((category) => (
                  <li key={category}>
                    <button 
                      onClick={() => onLinkClick('shop', category)} 
                      className="text-gray-400 hover:text-white hover:translate-x-1 transition-all text-left font-bold text-base w-full py-1.5 outline-none flex items-center gap-2 group"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/0 group-hover:bg-emerald-500 transition-all" />
                      {category}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Column 3: Company */}
          <div className="animate-in fade-in slide-in-from-bottom-4 delay-200">
            <h5 className="font-black text-[10px] uppercase tracking-[0.2em] mb-2 text-emerald-500 px-1">About Company</h5>
            <ul className="flex flex-col gap-1">
              {['About Us', 'Contact Us', 'Blog'].map(item => (
                <li key={item}>
                  <button onClick={() => onLinkClick('company', item)} className="text-gray-400 hover:text-white hover:translate-x-1 transition-all text-left font-bold text-base w-full py-1 outline-none flex items-center gap-2 group">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/0 group-hover:bg-emerald-500 transition-all" />
                    {item}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Legal */}
          <div className="animate-in fade-in slide-in-from-bottom-4 delay-300">
            <h5 className="font-black text-[10px] uppercase tracking-[0.2em] mb-2 text-emerald-500 px-1">Information</h5>
            <ul className="flex flex-col gap-1">
              {['Terms & Conditions', 'Privacy Policy', 'Payment Policy'].map(item => (
                <li key={item}>
                  <button onClick={() => onLinkClick('legal', item)} className="text-gray-400 hover:text-white hover:translate-x-1 transition-all text-left font-bold text-base w-full py-1 outline-none flex items-center gap-2 group">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/0 group-hover:bg-emerald-500 transition-all" />
                    {item}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Column 5: Newsletter */}
        <div className="w-full lg:max-w-[320px] animate-in fade-in slide-in-from-bottom-4 delay-400">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700" />
            <h5 className="font-black text-[10px] uppercase tracking-[0.2em] mb-2 text-emerald-500">Stay Updated</h5>
            <p className="text-sm text-gray-400 mb-4 leading-relaxed font-medium">
              Join for exclusive deals and special offers.
            </p>
            <form onSubmit={handleSubscribe} className="flex flex-col gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Your email address"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-emerald-500/50 transition-colors focus:ring-1 focus:ring-emerald-500/20 font-bold"
              />
              <button disabled={isSubscribing} className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl transition-all uppercase tracking-widest shadow-lg shadow-emerald-600/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                {isSubscribing ? 'Joining...' : 'Join Community'}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="max-w-[1600px] mx-auto px-6 md:px-8 border-t border-white/5 pt-3 pb-6 md:pb-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex flex-col md:flex-row items-center gap-4 text-center md:text-left">
            <p className="text-xs text-gray-500 font-bold">© 2026 {storeName}. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <span className="text-[10px] text-gray-600 font-black uppercase tracking-widest px-3 py-1 bg-white/5 rounded-full">Secure Payments</span>
              <span className="text-[10px] text-gray-600 font-black uppercase tracking-widest px-3 py-1 bg-white/5 rounded-full">Privacy Protected</span>
            </div>
          </div>

          {/* Payment Icons */}
          <div className="flex items-center gap-3 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all">
            {['VISA', 'Mastercard', 'UPI', 'PayPal'].map(p => (
              <div key={p} className="h-8 px-3 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center">
                <span className="text-[9px] font-black text-white tracking-tighter">{p}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};
