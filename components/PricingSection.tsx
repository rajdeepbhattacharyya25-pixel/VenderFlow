import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Zap, Crown, Shield, BarChart3, TrendingUp, Globe, Mail, MessageSquare, Rocket } from 'lucide-react';
import { useMotionValue, useMotionTemplate } from 'framer-motion';

interface PricingPlan {
    name: string;
    priceMonthly: number;
    priceAnnualEquivalent: number;
    priceAnnualTotal: number;
    commission: string;
    features: {
        text: string;
        icon: any;
    }[];
    buttonText: string;
    isPopular?: boolean;
    priority: string;
}

const PricingCard = ({ plan, index, isAnnual }: { plan: PricingPlan, index: number, isAnnual: boolean }) => {
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
        const { left, top } = currentTarget.getBoundingClientRect();
        mouseX.set(clientX - left);
        mouseY.set(clientY - top);
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 * index }}
            onMouseMove={handleMouseMove}
            className={`relative flex flex-col h-full p-5 sm:p-7 rounded-xl bg-[#0a0a0a]/90 backdrop-blur-xl border ${plan.isPopular ? 'border-[#ccff00] shadow-[0_0_40px_rgba(204,255,0,0.12)] z-20' : 'border-white/10'} group transition-all duration-500 hover:translate-y-[-5px]`}
        >
            {/* Cursor Spotlight Glow */}
            <motion.div
                className="pointer-events-none absolute -inset-px rounded-xl opacity-0 transition duration-300 group-hover:opacity-100 z-10 overflow-hidden"
                style={{
                    background: useMotionTemplate`
                        radial-gradient(
                            250px circle at ${mouseX}px ${mouseY}px,
                            rgba(204, 255, 0, 0.15),
                            transparent 80%
                        )
                    `,
                }}
            />

            {plan.isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-[#ccff00] text-black text-[9px] font-black uppercase tracking-[0.2em] rounded-full shadow-[0_0_20px_rgba(204,255,0,0.4)] z-30">
                    Most Popular
                </div>
            )}
            
            <div className="mb-6 relative z-20">
                <h3 className="text-xl font-bold font-orbitron uppercase tracking-wide mb-3 text-white/90">{plan.name}</h3>
                <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-white">₹</span>
                    <AnimatePresence mode="wait">
                        <motion.span
                            key={isAnnual ? 'annual' : 'monthly'}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="text-4xl font-black text-white"
                        >
                            {isAnnual ? plan.priceAnnualEquivalent : plan.priceMonthly}
                        </motion.span>
                    </AnimatePresence>
                    <span className="text-white/40 font-bold uppercase text-[10px] tracking-widest ml-1">/ Month</span>
                </div>
                {isAnnual && plan.priceAnnualTotal > 0 && (
                    <motion.p 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-[10px] text-[#ccff00] uppercase font-black tracking-widest mt-2"
                    >
                        ₹{plan.priceAnnualTotal.toLocaleString()} / Year
                    </motion.p>
                )}
            </div>

            <div className="space-y-5 mb-8 flex-grow relative z-20">
                <div className="p-4 rounded-lg bg-white/[0.04] border border-white/5 shadow-inner">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] uppercase text-white/40 font-black tracking-widest">Commission</span>
                        <span className="text-lg font-bold text-[#ccff00] font-orbitron">{plan.commission}</span>
                    </div>
                    <div className="text-[10px] uppercase text-white/60 font-medium tracking-wider leading-tight">{plan.priority}</div>
                </div>

                <div className="space-y-3">
                    {plan.features.map((feature, fIndex) => (
                        <div key={fIndex} className="flex items-start gap-3">
                            <div className="mt-1 flex-shrink-0 w-4 h-4 rounded-full bg-[#ccff00]/10 flex items-center justify-center">
                                <feature.icon size={10} className="text-[#ccff00]" />
                            </div>
                            <span className="text-xs text-white/70 font-light leading-snug">{feature.text}</span>
                        </div>
                    ))}
                </div>
            </div>

            <motion.button 
                whileHover={{ scale: 1.02, boxShadow: "0 0 25px rgba(204,255,0,0.4)" }}
                whileTap={{ scale: 0.98 }}
                className={`w-full rounded-lg h-12 text-xs font-orbitron uppercase tracking-widest transition-all duration-300 flex items-center justify-center font-bold relative z-30 ${plan.isPopular ? 'bg-[#ccff00] text-black shadow-[0_0_20px_rgba(204,255,0,0.3)]' : 'bg-white/5 text-white border border-white/10 hover:bg-white/10'}`}
            >
                {plan.buttonText}
            </motion.button>
        </motion.div>
    );
};

export const PricingSection = () => {
    const [isAnnual, setIsAnnual] = useState(false);

    const plans: PricingPlan[] = [
        {
            name: "Free",
            priceMonthly: 0,
            priceAnnualEquivalent: 0,
            priceAnnualTotal: 0,
            commission: "10%",
            priority: "Standard (T+7 reserve release)",
            features: [
                { text: "10 Products limit", icon: Check },
                { text: "200 Telegram Messages/mo", icon: MessageSquare },
                { text: "50 Email Notifications/mo", icon: Mail },
                { text: "Razorpay Integration", icon: Shield }
            ],
            buttonText: "Start Selling",
        },
        {
            name: "Pro",
            priceMonthly: 999,
            priceAnnualEquivalent: 799,
            priceAnnualTotal: 9590,
            commission: "5%",
            priority: "High Priority",
            isPopular: true,
            features: [
                { text: "Unlimited Products", icon: Check },
                { text: "5000 Telegram Messages/mo", icon: MessageSquare },
                { text: "Unlimited Email Notifications", icon: Mail },
                { text: "Advanced Analytics Dashboard", icon: BarChart3 },
                { text: "Basic Sales Insights", icon: TrendingUp },
                { text: "Faster Support", icon: Zap }
            ],
            buttonText: "Go Pro",
        },
        {
            name: "Premium",
            priceMonthly: 2499,
            priceAnnualEquivalent: 1999,
            priceAnnualTotal: 23990,
            commission: "2%",
            priority: "Immediate Priority",
            features: [
                { text: "Unlimited Products", icon: Check },
                { text: "50000 Telegram Messages/mo", icon: MessageSquare },
                { text: "Unlimited Email Notifications", icon: Mail },
                { text: "Advanced Seller Analytics", icon: BarChart3 },
                { text: "Sales Forecasting", icon: TrendingUp },
                { text: "Custom Domain Support", icon: Globe },
                { text: "Priority Support", icon: Crown },
                { text: "Early Access to Features", icon: Rocket }
            ],
            buttonText: "Go Premium",
        }
    ];

    return (
        <section id="pricing" className="py-16 px-4 relative overflow-hidden bg-[#050505] min-h-[90vh] flex items-center">
            {/* Background Grid Accent */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
            
            <div className="max-w-7xl mx-auto relative z-10 w-full">
                <div className="text-center mb-12">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="inline-block px-4 py-1.5 mb-6 rounded-full border border-[#ccff00]/20 bg-[#ccff00]/5 backdrop-blur-sm"
                    >
                        <span className="text-[10px] uppercase tracking-[0.2em] text-[#ccff00] font-bold font-orbitron">Pricing Plans</span>
                    </motion.div>
                    
                    <motion.h2 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-4xl sm:text-6xl font-bold font-orbitron uppercase tracking-tighter mb-8 px-4"
                    >
                        Scale Your <span className="text-[#ccff00]">Revenue</span>
                    </motion.h2>

                    {/* Billing Toggle */}
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        className="flex items-center justify-center gap-6 mb-12"
                    >
                        <span className={`text-sm font-bold uppercase tracking-wider transition-colors ${!isAnnual ? 'text-[#ccff00]' : 'text-white/40'}`}>Monthly</span>
                        <button 
                            onClick={() => setIsAnnual(!isAnnual)}
                            aria-label={`Switch to ${isAnnual ? 'monthly' : 'annual'} billing`}
                            title={`Switch to ${isAnnual ? 'monthly' : 'annual'} billing`}
                            className="relative w-14 h-7 rounded-full bg-white/5 border border-white/10 p-1 transition-colors hover:border-[#ccff00]/50"
                        >
                            <motion.div 
                                animate={{ x: isAnnual ? 28 : 0 }}
                                className="w-5 h-5 rounded-full bg-[#ccff00] shadow-[0_0_10px_#ccff00]"
                            />
                        </button>
                        <div className="flex items-center gap-2">
                            <span className={`text-sm font-bold uppercase tracking-wider transition-colors ${isAnnual ? 'text-[#ccff00]' : 'text-white/40'}`}>Annual</span>
                            <span className="px-2 py-0.5 rounded-full bg-[#ccff00]/10 border border-[#ccff00]/20 text-[#ccff00] text-[10px] font-black uppercase tracking-widest">
                                Save 20%
                            </span>
                        </div>
                    </motion.div>
                </div>

                <div className="flex md:grid md:grid-cols-3 gap-4 max-w-6xl mx-auto overflow-x-auto pb-8 px-4 scroll-smooth snap-x snap-mandatory no-scrollbar md:overflow-visible md:pb-0 md:px-0">
                    {plans.map((plan, index) => (
                        <div key={plan.name} className="min-w-[80vw] md:min-w-0 snap-center shrink-0 md:shrink md:flex">
                            <PricingCard plan={plan} index={index} isAnnual={isAnnual} />
                        </div>
                    ))}
                </div>
            </div>

            {/* Accent Orbs */}
            <div className="absolute top-1/4 -left-1/4 w-[50vw] h-[50vw] bg-[#ccff00]/[0.02] rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-1/4 -right-1/4 w-[50vw] h-[50vw] bg-[#ccff00]/[0.01] rounded-full blur-[120px] pointer-events-none" />
        </section>
    );
};
