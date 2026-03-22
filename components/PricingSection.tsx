import React, { useState, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, MotionValue } from 'framer-motion';
import { Check, Zap, Crown, Shield, BarChart3, TrendingUp, Globe, Mail, MessageSquare, Rocket } from 'lucide-react';
import { useMotionValue, useMotionTemplate } from 'framer-motion';

const PricingRevealWord = ({ word, i, scrollYProgress }: { word: string, i: number, scrollYProgress: MotionValue<number> }) => {
    const start = i * 0.1;
    const end = 0.3 + (i * 0.1);
    const revealAmount = useTransform(scrollYProgress, [start, end], [0, 100]);
    const isRevenue = word === 'Revenue';

    return (
        <div className="relative inline-block overflow-hidden py-1 px-1">
            <span className={`text-2xl sm:text-5xl md:text-6xl font-bold font-orbitron tracking-tighter uppercase m-0 ${isRevenue ? 'text-[#ccff00]' : 'text-white'}`}>
                {word}
            </span>

            {/* The Scrubbable Neon Mask - Wiping Right-to-Left */}
            <motion.div
                style={{
                    clipPath: useTransform(revealAmount, (v: number) => `inset(0 ${v}% 0 0)`),
                }}
                className="absolute inset-0 bg-[#ccff00] z-10 pointer-events-none"
            />

            {/* Trailing Edge Velocity Blur */}
            <motion.div
                style={{
                    right: useTransform(revealAmount, (v: number) => `${v}%`),
                    opacity: useTransform(revealAmount, [0, 5, 95, 100], [0, 1, 1, 0])
                }}
                className="absolute top-0 bottom-0 w-[40px] bg-gradient-to-l from-[#ccff00]/60 to-transparent blur-md z-20 pointer-events-none translate-x-full"
            />
        </div>
    );
};

interface PricingPlan {
    name: string;
    priceMonthly: number;
    priceAnnualEquivalent: number;
    priceAnnualTotal: number;
    commission: string;
    features: { text: string; icon: any }[];
    buttonText: string;
    isPopular?: boolean;
    priority: string;
}

const PricingCard = ({ plan, index, isAnnual }: { plan: PricingPlan; index: number; isAnnual: boolean }) => {
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
            className={`relative flex flex-col h-full p-4 sm:p-7 rounded-2xl bg-[#0a0a0a]/90 backdrop-blur-xl border ${plan.isPopular ? 'border-[#ccff00] shadow-[0_0_40px_rgba(204,255,0,0.12)] z-20' : 'border-white/10'} group transition-all duration-500 hover:translate-y-[-5px]`}
        >
            <motion.div
                className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition duration-300 group-hover:opacity-100 z-10 overflow-hidden"
                style={{
                    background: useMotionTemplate`radial-gradient(250px circle at ${mouseX}px ${mouseY}px, rgba(204,255,0,0.15), transparent 80%)`,
                }}
            />

            {plan.isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-[#ccff00] text-black text-[8px] font-black uppercase tracking-[0.2em] rounded-full shadow-[0_0_20px_rgba(204,255,0,0.4)] z-30 whitespace-nowrap">
                    ⚡ Most Popular
                </div>
            )}

            {/* Name + Price */}
            <div className="mb-3 sm:mb-5 relative z-20">
                <h3 className="text-sm sm:text-xl font-bold font-orbitron uppercase tracking-wide mb-2 text-white/90">{plan.name}</h3>
                <div className="flex items-baseline gap-1">
                    <span className="text-xl sm:text-3xl font-black text-white">₹</span>
                    <AnimatePresence mode="wait">
                        <motion.span
                            key={isAnnual ? 'annual' : 'monthly'}
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 8 }}
                            className="text-2xl sm:text-4xl font-black text-white"
                        >
                            {isAnnual ? plan.priceAnnualEquivalent : plan.priceMonthly}
                        </motion.span>
                    </AnimatePresence>
                    <span className="text-white/40 font-bold uppercase text-[9px] tracking-widest ml-1">/ mo</span>
                </div>
                {isAnnual && plan.priceAnnualTotal > 0 && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[9px] text-[#ccff00] uppercase font-black tracking-widest mt-1">
                        ₹{plan.priceAnnualTotal.toLocaleString()} / Year
                    </motion.p>
                )}
            </div>

            {/* Commission */}
            <div className="flex-grow relative z-20 space-y-3 sm:space-y-4 mb-4">
                <div className="p-2.5 sm:p-3.5 rounded-xl bg-white/[0.04] border border-white/5">
                    <div className="flex justify-between items-center mb-0.5">
                        <span className="text-[8px] sm:text-[10px] uppercase text-white/40 font-black tracking-widest">Commission</span>
                        <span className="text-sm sm:text-lg font-bold text-[#ccff00] font-orbitron">{plan.commission}</span>
                    </div>
                    <div className="text-[8px] sm:text-[10px] uppercase text-white/60 font-medium tracking-wider leading-tight">{plan.priority}</div>
                </div>

                {/* Features */}
                <div className="space-y-1.5 sm:space-y-2.5">
                    {plan.features.map((feature, fIndex) => (
                        <div key={fIndex} className="flex items-start gap-2">
                            <div className="mt-0.5 flex-shrink-0 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-[#ccff00]/10 flex items-center justify-center">
                                <feature.icon size={9} className="text-[#ccff00]" />
                            </div>
                            <span className="text-[10px] sm:text-xs text-white/70 font-light leading-snug">{feature.text}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* CTA */}
            <motion.button
                whileHover={{ scale: 1.02, boxShadow: "0 0 25px rgba(204,255,0,0.4)" }}
                whileTap={{ scale: 0.97 }}
                className={`w-full rounded-xl h-11 sm:h-14 text-[10px] sm:text-xs font-orbitron uppercase tracking-widest transition-all duration-300 flex items-center justify-center font-bold relative z-30 ${plan.isPopular ? 'bg-[#ccff00] text-black shadow-[0_0_20px_rgba(204,255,0,0.3)]' : 'bg-white/5 text-white border border-white/10 hover:bg-white/10'}`}
            >
                {plan.buttonText}
            </motion.button>
        </motion.div>
    );
};

export const PricingSection = () => {
    const [isAnnual, setIsAnnual] = useState(false);
    const [activeCard, setActiveCard] = useState(0);
    const scrollRef = useRef<HTMLDivElement>(null);
    const headerRef = useRef<HTMLDivElement>(null);

    const { scrollYProgress: revealScroll } = useScroll({
        target: headerRef,
        offset: ["start 0.5", "start 0.2"]
    });

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
                { text: "50,000 Telegram Messages/mo", icon: MessageSquare },
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

    const handleScroll = () => {
        if (!scrollRef.current) return;
        const { scrollLeft, scrollWidth } = scrollRef.current;
        const cardWidth = scrollWidth / plans.length;
        setActiveCard(Math.min(Math.round(scrollLeft / cardWidth), plans.length - 1));
    };

    return (
        <section id="pricing" className="pt-[80vh] pb-6 sm:py-20 relative overflow-hidden bg-[#050505]">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

            <div className="max-w-7xl mx-auto relative z-10 w-full">
                {/* Header — compact on mobile */}
                <div className="text-center mb-4 sm:mb-12 px-4">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="inline-block px-3 py-1 mb-2 sm:mb-4 rounded-full border border-[#ccff00]/20 bg-[#ccff00]/5 backdrop-blur-sm"
                    >
                        <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.2em] text-[#ccff00] font-bold font-orbitron">Pricing Plans</span>
                    </motion.div>

                    <div ref={headerRef} className="mb-3 sm:mb-6 flex flex-wrap items-baseline justify-center gap-x-3 gap-y-0">
                        {['Scale', 'Your', 'Revenue'].map((word, i) => (
                            <PricingRevealWord key={i} word={word} i={i} scrollYProgress={revealScroll} />
                        ))}
                    </div>

                    {/* Billing Toggle — pill style */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        className="inline-flex items-center p-1 rounded-full bg-white/5 border border-white/10 gap-1"
                    >
                        <button
                            onClick={() => setIsAnnual(false)}
                            className={`px-4 py-1.5 sm:py-2.5 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-all duration-300 min-h-[36px] sm:min-h-[44px] ${!isAnnual ? 'bg-[#ccff00] text-black shadow-[0_0_15px_rgba(204,255,0,0.3)]' : 'text-white/50'}`}
                        >
                            Monthly
                        </button>
                        <button
                            onClick={() => setIsAnnual(true)}
                            className={`px-4 py-1.5 sm:py-2.5 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-all duration-300 min-h-[36px] sm:min-h-[44px] flex items-center gap-1.5 ${isAnnual ? 'bg-[#ccff00] text-black shadow-[0_0_15px_rgba(204,255,0,0.3)]' : 'text-white/50'}`}
                        >
                            Annual
                            <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase ${isAnnual ? 'bg-black/20 text-black' : 'bg-[#ccff00]/10 border border-[#ccff00]/20 text-[#ccff00]'}`}>
                                -20%
                            </span>
                        </button>
                    </motion.div>
                </div>

                {/* Cards */}
                <div
                    ref={scrollRef}
                    onScroll={handleScroll}
                    className="flex md:grid md:grid-cols-3 gap-3 sm:gap-4 max-w-6xl mx-auto overflow-x-auto pb-4 sm:pb-0 px-4 sm:px-6 scroll-smooth snap-x snap-mandatory md:overflow-visible"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {plans.map((plan, index) => (
                        <div key={plan.name} className="min-w-[72vw] sm:min-w-[55vw] md:min-w-0 snap-center shrink-0 md:shrink md:flex">
                            <PricingCard plan={plan} index={index} isAnnual={isAnnual} />
                        </div>
                    ))}
                </div>

                {/* Dot indicators — mobile only */}
                <div className="flex md:hidden items-center justify-center gap-2 mt-4">
                    {plans.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => {
                                if (!scrollRef.current) return;
                                const cardWidth = scrollRef.current.scrollWidth / plans.length;
                                scrollRef.current.scrollTo({ left: cardWidth * i, behavior: 'smooth' });
                                setActiveCard(i);
                            }}
                            aria-label={`View ${plans[i].name} plan`}
                            className={`transition-all duration-300 rounded-full ${activeCard === i ? 'w-5 h-1.5 bg-[#ccff00] shadow-[0_0_6px_#ccff00]' : 'w-1.5 h-1.5 bg-white/20'}`}
                        />
                    ))}
                </div>
            </div>

            {/* Accent Orbs */}
            <div className="absolute top-1/4 -left-1/4 w-[50vw] h-[50vw] bg-[#ccff00]/[0.02] rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-1/4 -right-1/4 w-[50vw] h-[50vw] bg-[#ccff00]/[0.01] rounded-full blur-[120px] pointer-events-none" />
        </section>
    );
};
