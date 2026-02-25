import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LoginModal } from '../components/LoginModal';
import { TopBar } from '../components/TopBar';
import { Footer } from '../components/Footer';
import { ContactUsModal } from '../components/ContactUsModal';
import { MagneticButton } from '../components/MagneticButton';
import { GlowCard } from '../components/GlowCard';
import { FAQ } from '../components/FAQ';
import { Star, CreditCard, LayoutTemplate, PlayCircle, Store, ShoppingBag, ShieldCheck, Zap, ArrowRight, CheckCircle2, ChevronRight, Sun, Moon } from 'lucide-react';
import { Events } from '../lib/analytics';
import { capturePage } from '../lib/analytics';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useTheme } from 'next-themes';

export default function LandingPage() {
    const navigate = useNavigate();
    const { user, role } = useAuth();
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const [isContactModalOpen, setIsContactModalOpen] = useState(false);

    const { resolvedTheme, setTheme } = useTheme();
    const scrollSentinelRef = useRef<HTMLDivElement>(null);

    // Track landing_scrolled_50pct via IntersectionObserver
    useEffect(() => {
        const sentinel = scrollSentinelRef.current;
        if (!sentinel) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    Events.landingScrolled50();
                    observer.disconnect();
                }
            },
            { threshold: 0.1 }
        );
        observer.observe(sentinel);
        return () => observer.disconnect();
    }, []);

    const handleApplyToSell = () => {
        Events.heroCTAClicked({ location: 'hero', variant: 'apply_to_sell' });
        navigate('/apply');
    };

    const handleLogin = () => {
        if (user) {
            navigate('/dashboard');
        } else {
            setIsLoginModalOpen(true);
        }
    };

    const { scrollYProgress } = useScroll();

    // Parallax Effects
    const heroY = useTransform(scrollYProgress, [0, 0.2], [0, 100]);
    const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);
    const glowY = useTransform(scrollYProgress, [0, 0.3], [0, -150]);

    // Browser Image Parallax inside its container
    const browserRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress: browserScrollY } = useScroll({
        target: browserRef,
        offset: ["start end", "end start"]
    });
    const imageY = useTransform(browserScrollY, [0, 1], ["0%", "15%"]);

    // Animation Variants
    const fadeUpVariant = {
        hidden: { opacity: 0, y: 30 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }
    };

    const staggerContainer = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.15
            }
        }
    };

    return (
        <div className="min-h-screen flex flex-col font-body bg-white dark:bg-neutral-950 transition-colors duration-500 relative">
            <TopBar />

            <ContactUsModal
                isOpen={isContactModalOpen}
                onClose={() => setIsContactModalOpen(false)}
            />

            {/* Minimal SaaS Header */}
            <header className="sticky top-0 z-50 bg-slate-50/90 dark:bg-neutral-900/90 backdrop-blur-md border-b border-gray-200 dark:border-neutral-800 transition-all">
                <div className="max-w-[1600px] mx-auto px-4 md:px-8 h-16 md:h-20 flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-[100px] sm:min-w-0">
                        <img src="/logo.jpg" alt="VenderFlow" className="h-8 md:h-10 w-auto rounded-lg shrink-0" fetchPriority="high" />
                        <span className="text-lg sm:text-xl md:text-2xl font-bold font-display text-emerald-700 dark:text-emerald-500 tracking-tight truncate">
                            VenderFlow
                        </span>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                        {/* Theme Toggle */}
                        <button
                            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                            className="p-2 sm:p-2.5 text-gray-500 hover:text-emerald-600 dark:text-gray-400 dark:hover:text-emerald-400 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800"
                            aria-label="Toggle dark mode"
                        >
                            {resolvedTheme === 'dark' ? <Sun className="w-4 h-4 sm:w-5 sm:h-5" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5" />}
                        </button>

                        <button
                            onClick={handleLogin}
                            className="px-2 sm:px-4 py-3 md:py-2 text-[13px] sm:text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                        >
                            <span className="hidden sm:inline">{user ? 'Go to Dashboard' : 'Seller Login'}</span>
                            <span className="sm:hidden">{user ? 'Dashboard' : 'Login'}</span>
                        </button>
                        <button
                            onClick={handleApplyToSell}
                            className="px-3 sm:px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-[13px] sm:text-sm shadow-sm hover:shadow-md transition-all active:scale-95 flex items-center gap-1.5 sm:gap-2"
                        >
                            <span className="hidden sm:inline">Apply to Sell</span>
                            <span className="sm:hidden">Apply</span>
                            <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </button>
                    </div>
                </div>
            </header>

            <main className="flex-grow">
                {/* Hero Section */}
                <section className="relative pt-10 md:pt-16 pb-6 md:pb-12 overflow-hidden bg-[#fafafa] dark:bg-neutral-900">
                    <motion.div
                        style={{ y: heroY, opacity: heroOpacity }}
                        className="max-w-[1000px] mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center"
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 mb-8 max-w-fit mx-auto transition-transform hover:scale-105 shadow-sm"
                        >
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">VenderFlow 2.0 is Here</span>
                        </motion.div>

                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                            className="text-4xl md:text-[64px] lg:text-[72px] font-bold text-gray-900 dark:text-white tracking-tight mb-6 font-display leading-[1.05] max-w-4xl"
                        >
                            Join a curated network of <br className="hidden md:block" />
                            <span className="text-emerald-500">
                                high-performing online stores.
                            </span>
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
                            className="mt-4 text-lg md:text-xl text-gray-500 dark:text-gray-400 max-w-2xl mx-auto font-body leading-relaxed"
                        >
                            Real infrastructure, real support, and proven systems for serious businesses ready to scale without the noise.
                        </motion.p>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.7, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
                            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-lg mx-auto"
                        >
                            <MagneticButton
                                onClick={handleApplyToSell}
                                className="w-full sm:w-auto px-8 py-[14px] bg-emerald-600 text-white rounded-md font-semibold hover:bg-emerald-700 shadow-sm"
                            >
                                <span className="flex items-center justify-center gap-2">
                                    <span>Apply to Sell</span>
                                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                                </span>
                            </MagneticButton>

                            <MagneticButton
                                pullStrength={10}
                                onClick={() => setIsContactModalOpen(true)}
                                className="w-full sm:w-auto px-8 py-[14px] bg-white dark:bg-transparent text-gray-700 dark:text-gray-200 font-semibold rounded-md border border-gray-300 dark:border-neutral-700 hover:border-gray-400 dark:hover:border-neutral-600 hover:bg-gray-50 dark:hover:bg-neutral-800 shadow-sm"
                            >
                                Contact Sales
                            </MagneticButton>
                        </motion.div>

                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 1, delay: 0.6 }}
                            className="mt-4 text-[13px] text-gray-500 dark:text-gray-400"
                        >
                            Applications reviewed within 24-48 hours.
                        </motion.p>

                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 1, delay: 0.7 }}
                            className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 w-full text-[13px] font-medium text-emerald-700/80 dark:text-emerald-400/80"
                        >
                            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Curated sellers only</span>
                            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Dedicated onboarding</span>
                            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Enterprise infrastructure</span>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 1, delay: 1 }}
                            className="mt-10 md:mt-16 flex flex-col items-center justify-center pb-6 md:pb-8 border-b-0 border-gray-200 dark:border-neutral-800 w-full relative"
                        >
                            <span className="text-[10px] uppercase font-bold tracking-widest text-gray-400 dark:text-gray-500 mb-2">See how it works below</span>
                            <ArrowRight className="w-4 h-4 rotate-90 text-gray-400 dark:text-gray-500 animate-bounce" />
                        </motion.div>
                    </motion.div>
                </section>

                <section className="py-8 md:py-12 bg-white dark:bg-neutral-950 border-y border-gray-100 dark:border-neutral-800 overflow-hidden">
                    <div className="max-w-[1000px] mx-auto px-4 sm:px-6 lg:px-8">
                        <motion.div
                            variants={staggerContainer}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: false, margin: "-50px" }}
                            className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-16 divide-y md:divide-y-0 md:divide-x divide-gray-200 dark:divide-neutral-800 w-full text-center md:text-left"
                        >
                            {/* Trust Markers */}
                            <motion.div variants={fadeUpVariant} className="flex items-center justify-center md:justify-start gap-4 py-6 md:py-0 w-full md:w-auto">
                                <span className="text-4xl md:text-5xl font-display font-medium text-gray-900 dark:text-white tracking-tight">150<span className="text-emerald-500 font-bold">+</span></span>
                                <div className="flex flex-col text-left">
                                    <span className="text-sm font-bold text-gray-900 dark:text-white">Active Businesses</span>
                                    <span className="text-[11px] text-gray-500">Trust VenderFlow</span>
                                </div>
                            </motion.div>

                            <motion.div variants={fadeUpVariant} className="flex items-center justify-center md:justify-start gap-4 py-6 md:py-0 pl-0 md:pl-16 w-full md:w-auto">
                                <span className="text-4xl md:text-5xl font-display font-medium text-gray-900 dark:text-white tracking-tight">99.9<span className="text-emerald-500 font-bold">%</span></span>
                                <div className="flex flex-col text-left">
                                    <span className="text-sm font-bold text-gray-900 dark:text-white">Uptime Guarantee</span>
                                    <span className="text-[11px] text-gray-500">Enterprise grade</span>
                                </div>
                            </motion.div>

                            <motion.div variants={fadeUpVariant} className="flex items-center justify-center md:justify-start gap-4 py-6 md:py-0 pl-0 md:pl-16 w-full md:w-auto">
                                <span className="text-4xl md:text-5xl font-display font-medium text-gray-900 dark:text-white tracking-tight">$50M<span className="text-emerald-500 font-bold">+</span></span>
                                <div className="flex flex-col text-left">
                                    <span className="text-sm font-bold text-gray-900 dark:text-white">Processed</span>
                                    <span className="text-[11px] text-gray-500">Through our platform</span>
                                </div>
                            </motion.div>
                        </motion.div>
                    </div>
                </section>
                {/* Scroll Sentinel — marks ~50% of page for analytics */}
                <div ref={scrollSentinelRef} aria-hidden="true" />

                {/* Hero Visual / Demo Section */}
                <section className="py-10 md:py-16 bg-[#fafafa] dark:bg-neutral-900 relative overflow-hidden" ref={browserRef}>
                    <div className="max-w-[1000px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                        {/* Background blurry glow */}
                        <motion.div
                            style={{ y: glowY }}
                            className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] h-[90%] bg-emerald-100 dark:bg-emerald-900/40 rounded-full blur-[120px] pointer-events-none"
                        />

                        <motion.div
                            initial={{ opacity: 0, y: 50, scale: 0.95 }}
                            whileInView={{ opacity: 1, y: 0, scale: 1 }}
                            viewport={{ once: false, margin: "-100px" }}
                            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                            className="relative rounded-xl overflow-hidden shadow-2xl border border-gray-200/60 bg-white group"
                        >
                            {/* Browser Chrome Header */}
                            <div className="h-10 bg-[#fdfdfd] dark:bg-neutral-900 border-b border-gray-100 dark:border-neutral-800 flex items-center px-4 gap-2">
                                <div className="flex gap-2">
                                    <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
                                    <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
                                    <div className="w-3 h-3 rounded-full bg-[#27c93f]"></div>
                                </div>
                                <div className="mx-auto flex items-center justify-center gap-2 text-[11px] text-gray-400 bg-gray-50 dark:bg-neutral-800 px-4 py-1 rounded-md min-w-[200px]">
                                    <ShieldCheck className="w-3 h-3" />
                                    dashboard.venderflow.com
                                </div>
                            </div>
                            {/* Product Screenshot / Video Placeholder */}
                            <div className="relative aspect-[16/9] bg-slate-900 flex items-center justify-center overflow-hidden">
                                <motion.img
                                    style={{ y: imageY, scale: 1.1 }}
                                    src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2426&auto=format&fit=crop"
                                    className="absolute inset-0 w-full h-[120%] object-cover opacity-50 blur-[2px]"
                                    alt="Store Dashboard Preview"
                                    loading="lazy"
                                    decoding="async"
                                />
                                {/* Large circle vignette effect to match the screenshot */}
                                <div className="absolute inset-0 bg-gradient-radial from-transparent to-black/80"></div>
                                <div className="absolute inset-0 bg-[#0f172a]/60"></div>

                                {/* Overlay Content */}
                                <div className="absolute inset-0 flex flex-col items-center justify-center opacity-90 transition-all duration-300">
                                    <span className="text-[#aeb1b6] text-xl font-body mb-2 tracking-wide font-light">See the platform in action</span>
                                    <h3 className="text-white text-3xl md:text-5xl font-bold font-display tracking-tight text-center drop-shadow-md decoration-white px-4">Watch how high-volume sellers manage<br className="hidden sm:block" />operations. <span className="text-white/40">Scalable backend...</span></h3>

                                    <button
                                        aria-label="Play demo video"
                                        onClick={() => Events.demoPlayed()}
                                        className="mt-8 w-16 h-16 bg-emerald-500 hover:bg-emerald-400 rounded-full flex items-center justify-center text-white shadow-lg transition-colors focus:outline-none focus:ring-4 focus:ring-emerald-500/50">
                                        <PlayCircle className="w-8 h-8 ml-1" aria-hidden="true" />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </section>

                {/* Who this is for Section */}
                <section className="py-14 md:py-28 bg-[#fafafa] dark:bg-neutral-900 border-t border-gray-100 overflow-hidden">
                    <div className="max-w-[1000px] mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="grid md:grid-cols-2 gap-10 md:gap-12 items-center">
                            <motion.div
                                initial={{ opacity: 0, x: -30 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: false, margin: "-100px" }}
                                transition={{ duration: 0.6 }}
                            >
                                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white font-display mb-4 md:mb-6 tracking-tight">Is VenderFlow right for <br /><span className="italic text-emerald-500 font-light">your business?</span></h2>
                                <p className="text-gray-500 dark:text-gray-400 mb-6 md:mb-8 max-w-[400px] leading-relaxed">We are not a hobbyist platform. We restrict access to ambitious businesses serious about growth, brand integrity, and customer experience.</p>
                                <motion.ul
                                    variants={staggerContainer}
                                    initial="hidden"
                                    whileInView="visible"
                                    viewport={{ once: false }}
                                    className="space-y-6"
                                >
                                    <motion.li variants={fadeUpVariant} className="flex items-start gap-4">
                                        <div className="w-6 h-6 rounded-sm bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0 mt-0.5">
                                            <Store className="w-3.5 h-3.5 text-emerald-600" />
                                        </div>
                                        <div>
                                            <h4 className="text-base md:text-[15px] font-bold text-gray-900 dark:text-white">Established Local Retailers</h4>
                                            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Modernize your local presence with a robust digital storefront that mirrors your in-store quality.</p>
                                        </div>
                                    </motion.li>
                                    <motion.li variants={fadeUpVariant} className="flex items-start gap-4">
                                        <div className="w-6 h-6 rounded-sm bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0 mt-0.5">
                                            <ArrowRight className="w-3.5 h-3.5 text-emerald-600 -rotate-45" />
                                        </div>
                                        <div>
                                            <h4 className="text-base md:text-[15px] font-bold text-gray-900 dark:text-white">Scaling D2C Brands</h4>
                                            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Take your existing momentum to the next level with enterprise-grade tools and analytics.</p>
                                        </div>
                                    </motion.li>
                                    <motion.li variants={fadeUpVariant} className="flex items-start gap-4">
                                        <div className="w-6 h-6 rounded-sm bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0 mt-0.5">
                                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                        </div>
                                        <div>
                                            <h4 className="text-base md:text-[15px] font-bold text-gray-900 dark:text-white">Verified Merchants Only</h4>
                                            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Strictly no unvetted dropshippers or low-quality goods. We maintain a premium ecosystem.</p>
                                        </div>
                                    </motion.li>
                                </motion.ul>
                            </motion.div>
                            <motion.div
                                initial={{ opacity: 0, x: 30 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: false, margin: "-100px" }}
                                transition={{ duration: 0.6, delay: 0.2 }}
                                className="relative hidden md:flex items-center justify-center group"
                            >
                                <div className="rounded-2xl overflow-hidden shadow-2xl transition-transform duration-700 group-hover:scale-[1.02] bg-[#325a54]/5 border border-[#325a54]/20 p-2 max-w-[426px]">
                                    <img src="/avatar.png" alt="Merchant Testimonial" className="w-full h-auto rounded-xl object-contain drop-shadow-md [image-rendering:-webkit-optimize-contrast]" loading="lazy" decoding="async" />
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </section>

                {/* 3-Step How It Works Section */}
                <section className="py-14 md:py-28 bg-[#fafafa] dark:bg-neutral-900">
                    <div className="max-w-[1000px] mx-auto px-4 sm:px-6 lg:px-8">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: false, margin: "-100px" }}
                            transition={{ duration: 0.6 }}
                            className="text-center mb-12 md:mb-20"
                        >
                            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white font-display">How it works</h2>
                            <p className="mt-3 md:mt-4 text-[15px] text-gray-500 dark:text-gray-400 max-w-lg mx-auto leading-relaxed">Our onboarding process is designed to filter for quality and set you up for success from day one.</p>
                        </motion.div>

                        <div className="relative">
                            {/* Connecting Line Backdrop */}
                            <div className="hidden md:block absolute top-[30%] left-[15%] right-[15%] h-[1px] bg-gray-200 dark:bg-neutral-700">
                                <div className="absolute top-0 left-0 h-full bg-emerald-400 w-[50%] animate-[pulse_3s_ease-in-out_infinite]"></div>
                            </div>

                            <motion.div
                                variants={staggerContainer}
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: false, margin: "-50px" }}
                                className="grid md:grid-cols-3 gap-8 md:gap-12 text-center relative z-10 w-full"
                            >
                                {/* Step 1 */}
                                <motion.div variants={fadeUpVariant} className="flex flex-col items-center">
                                    <div className="w-[84px] h-[84px] bg-white dark:bg-neutral-800 rounded-full border border-gray-100 dark:border-neutral-700 flex flex-col items-center justify-center mb-6 shadow-sm relative shrink-0 transition-transform duration-300 hover:-translate-y-1">
                                        <div className="absolute -top-2 right-1 w-6 h-6 bg-[#1a202c] dark:bg-neutral-700 text-white rounded-full flex items-center justify-center font-bold text-xs shadow-sm transform translate-x-1/2" aria-hidden="true">1</div>
                                        <Store className="w-6 h-6 text-emerald-600 mb-1" aria-hidden="true" />
                                    </div>
                                    <h3 className="text-lg md:text-[17px] font-bold text-gray-900 dark:text-white mb-2">Apply to Join</h3>
                                    <p className="text-gray-500 dark:text-gray-400 text-sm md:text-[13px] leading-relaxed px-4">Submit your business details. We review every application to ensure network quality.</p>
                                </motion.div>

                                {/* Step 2 */}
                                <motion.div variants={fadeUpVariant} className="flex flex-col items-center">
                                    <div className="w-[84px] h-[84px] bg-white dark:bg-neutral-800 rounded-full border border-gray-100 dark:border-neutral-700 flex items-center justify-center mb-6 shadow-sm relative shrink-0 transition-transform duration-300 hover:-translate-y-1">
                                        <div className="absolute -top-2 right-1 w-6 h-6 bg-[#1a202c] dark:bg-neutral-700 text-white rounded-full flex items-center justify-center font-bold text-xs shadow-sm transform translate-x-1/2" aria-hidden="true">2</div>
                                        <ShieldCheck className="w-6 h-6 text-emerald-600" aria-hidden="true" />
                                    </div>
                                    <h3 className="text-lg md:text-[17px] font-bold text-gray-900 dark:text-white mb-2">Get Verified</h3>
                                    <p className="text-gray-500 dark:text-gray-400 text-sm md:text-[13px] leading-relaxed px-4">Once approved, our team helps configure your store for optimal performance.</p>
                                </motion.div>

                                {/* Step 3 */}
                                <motion.div variants={fadeUpVariant} className="flex flex-col items-center">
                                    <div className="w-[84px] h-[84px] bg-white dark:bg-neutral-800 rounded-full border border-gray-100 dark:border-neutral-700 flex items-center justify-center mb-6 shadow-sm relative shrink-0 transition-transform duration-300 hover:-translate-y-1">
                                        <div className="absolute -top-2 right-1 w-6 h-6 bg-[#1a202c] dark:bg-neutral-700 text-white rounded-full flex items-center justify-center font-bold text-xs shadow-sm transform translate-x-1/2" aria-hidden="true">3</div>
                                        <LayoutTemplate className="w-6 h-6 text-emerald-600" aria-hidden="true" />
                                    </div>
                                    <h3 className="text-lg md:text-[17px] font-bold text-gray-900 dark:text-white mb-2">Start Selling</h3>
                                    <p className="text-gray-500 dark:text-gray-400 text-sm md:text-[13px] leading-relaxed px-4">Go live to engaged audiences with native payment and checkout integrations.</p>
                                </motion.div>
                            </motion.div>
                        </div>
                    </div>
                </section>

                {/* What You Get Section */}
                <section className="py-16 md:py-24 bg-white dark:bg-neutral-950">
                    <div className="max-w-[1000px] mx-auto px-4 sm:px-6 lg:px-8">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: false, margin: "-100px" }}
                            transition={{ duration: 0.6 }}
                            className="text-center mb-10 md:mb-16"
                        >
                            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white font-display">Complete Commerce Ecosystem</h2>
                            <p className="mt-3 md:mt-4 text-[15px] text-gray-500 dark:text-gray-400 max-w-lg mx-auto leading-relaxed">Everything you need to run an online business without the technical headache. We handle the complexity, you handle the product.</p>
                        </motion.div>

                        <motion.div
                            variants={staggerContainer}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: false, margin: "-50px" }}
                            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
                        >
                            <GlowCard >
                                <motion.div variants={fadeUpVariant} className="h-full">
                                    <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/40 rounded flex items-center justify-center mb-6 md:mb-8">
                                        <Store className="w-4 h-4 text-emerald-700" />
                                    </div>
                                    <h3 className="text-lg md:text-[17px] font-bold text-gray-900 dark:text-white mb-2">Branded Digital Store</h3>
                                    <p className="text-gray-600 dark:text-gray-400 text-sm md:text-[13px] leading-relaxed">A standalone storefront designed for your brand identity, optimized for high conversions on all devices.</p>
                                </motion.div>
                            </GlowCard>

                            <GlowCard >
                                <motion.div variants={fadeUpVariant} className="h-full">
                                    <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/40 rounded flex items-center justify-center mb-6 md:mb-8">
                                        <ShieldCheck className="w-4 h-4 text-emerald-700" />
                                    </div>
                                    <h3 className="text-lg md:text-[17px] font-bold text-gray-900 dark:text-white mb-2">Secure Payments</h3>
                                    <p className="text-gray-600 dark:text-gray-400 text-sm md:text-[13px] leading-relaxed">Enterprise-grade transaction security with fraud protection and instant payouts built-in.</p>
                                </motion.div>
                            </GlowCard>

                            <GlowCard >
                                <motion.div variants={fadeUpVariant} className="h-full">
                                    <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/40 rounded flex items-center justify-center mb-6 md:mb-8">
                                        <LayoutTemplate className="w-4 h-4 text-emerald-700" />
                                    </div>
                                    <h3 className="text-lg md:text-[17px] font-bold text-gray-900 dark:text-white mb-2">Priority Support</h3>
                                    <p className="text-gray-600 dark:text-gray-400 text-sm md:text-[13px] leading-relaxed">Skip the chatbots. Get direct access to dedicated specialists who understand your business context.</p>
                                </motion.div>
                            </GlowCard>

                            <GlowCard >
                                <motion.div variants={fadeUpVariant} className="h-full">
                                    <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/40 rounded flex items-center justify-center mb-6 md:mb-8">
                                        <Zap className="w-4 h-4 text-emerald-700" />
                                    </div>
                                    <h3 className="text-lg md:text-[17px] font-bold text-gray-900 dark:text-white mb-2">Growth Analytics</h3>
                                    <p className="text-gray-600 dark:text-gray-400 text-sm md:text-[13px] leading-relaxed">Comprehensive dashboards to track sales, traffic sources, and actionable insights to grow your revenue.</p>
                                </motion.div>
                            </GlowCard>

                            <GlowCard >
                                <motion.div variants={fadeUpVariant} className="h-full">
                                    <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/40 rounded flex items-center justify-center mb-6 md:mb-8">
                                        <Store className="w-4 h-4 text-emerald-700" />
                                    </div>
                                    <h3 className="text-lg md:text-[17px] font-bold text-gray-900 dark:text-white mb-2">Cloud Infrastructure</h3>
                                    <p className="text-gray-600 dark:text-gray-400 text-sm md:text-[13px] leading-relaxed">Never worry about server limits or downtime. Our platform scales automatically to meet demand.</p>
                                </motion.div>
                            </GlowCard>

                            <GlowCard >
                                <motion.div variants={fadeUpVariant} className="h-full">
                                    <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/40 rounded flex items-center justify-center mb-6 md:mb-8">
                                        <Zap className="w-4 h-4 text-emerald-700" />
                                    </div>
                                    <h3 className="text-lg md:text-[17px] font-bold text-gray-900 dark:text-white mb-2">Marketing Tools</h3>
                                    <p className="text-gray-600 dark:text-gray-400 text-sm md:text-[13px] leading-relaxed">Built-in email marketing, discount creation, and social integrations to drive repeat customers.</p>
                                </motion.div>
                            </GlowCard>
                        </motion.div>
                    </div>
                </section>

                {/* FAQ Section */}
                <FAQ />

                {/* Final CTA Section */}
                <section className="py-16 md:py-24 relative overflow-hidden bg-[#1a202c] border-t border-[#2d3748]">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: false, margin: "-100px" }}
                        transition={{ duration: 0.8 }}
                        className="max-w-[800px] mx-auto px-4 sm:px-6 lg:px-8 text-center text-white"
                    >
                        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold font-display mb-4 md:mb-6 tracking-tight">Ready to upgrade your infrastructure?</h2>
                        <p className="text-[15px] sm:text-[17px] text-gray-400 mb-8 md:mb-10 max-w-2xl mx-auto leading-relaxed">
                            Stop fighting with plugins and piece-meal solutions. Build on a platform designed for volume.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <MagneticButton
                                onClick={handleApplyToSell}
                                className="w-full sm:w-auto px-8 py-4 sm:px-12 sm:py-5 bg-emerald-500 text-white rounded font-bold hover:bg-emerald-400 shadow-lg"
                            >
                                Apply to Sell
                            </MagneticButton>
                            <MagneticButton
                                pullStrength={10}
                                onClick={() => setIsContactModalOpen(true)}
                                className="w-full sm:w-auto px-8 py-4 sm:px-12 sm:py-5 bg-transparent text-white border border-gray-600 rounded font-bold hover:bg-white/5"
                            >
                                Contact Sales
                            </MagneticButton>
                        </div>
                    </motion.div>
                </section>
            </main>

            <div className="bg-[#1a202c]">
                <Footer
                    onLinkClick={(section, key) => {
                        if (section === 'legal') {
                            switch (key) {
                                case 'Terms & Conditions': navigate('/terms'); break;
                                case 'Privacy Policy': navigate('/privacy-policy'); break;
                                case 'Payment Policy': navigate('/payment-policy'); break;
                                case 'Cookie Policy': navigate('/cookie-policy'); break;
                            }
                        } else if (section === 'company') {
                            if (key === 'About Us') navigate('/about');
                            if (key === 'Contact Us') window.location.href = 'mailto:support@venderflow.com';
                        }
                    }}
                    branding={{
                        storeName: "VenderFlow",
                        description: "The premier platform for ambitious independent brands and creators.",
                        socials: {
                            instagram: "https://www.instagram.com/_rajdeep.007_/",
                            twitter: "https://x.com/_rajdeep007_",
                            linkedin: "https://www.linkedin.com/in/rajdeep-bhattacharyya-497945371/"
                        }
                    }}
                    categories={[]}
                />
            </div>

            <LoginModal
                isOpen={isLoginModalOpen}
                onClose={() => setIsLoginModalOpen(false)}
                mode="seller"
            />
        </div>
    );
}
