import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { LoginModal } from '../components/LoginModal';
import VariableProximity from '../components/VariableProximity';
import { Footer } from '../components/Footer';
import { FAQ } from '../components/FAQ';
import { ContactUsModal } from '../components/ContactUsModal';
import { DemoVideo, Ecosystem } from '../components/ParallaxSections';
import BlurText from '../components/react-bits/BlurText';
import Aurora from '../components/react-bits/Aurora';
import ShinyText from '../components/react-bits/ShinyText';
import StarBorder from '../components/react-bits/StarBorder';
import ClickSpark from '../components/react-bits/ClickSpark';
import LiquidEther from '../components/react-bits/LiquidEther';
import Shuffle from '../components/react-bits/Shuffle';
import DecryptedText from '../components/react-bits/DecryptedText';
import RotatingText from '../components/react-bits/RotatingText';
import ScrollVelocity from '../components/react-bits/ScrollVelocity';
import FloatingCollage from '../components/FloatingCollage';
import { CustomCursor } from '../components/CustomCursor';

// Helper: race a promise against a timeout
function withTimeout<T>(promise: Promise<T> | PromiseLike<T>, ms: number, label = 'Operation'): Promise<T> {
    return Promise.race([
        Promise.resolve(promise),
        new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
        ),
    ]);
}

import SplitText from '../components/SplitText';
import { Star, ArrowRight, LayoutTemplate, Store, Activity, BarChart3 } from 'lucide-react';
import { Events } from '../lib/analytics';
import { MagneticButton, StatCard, MagneticLogo } from '../components/InteractiveUI';
import { useTheme } from 'next-themes';
// import { ScrollImageSequence } from '../components/ScrollImageSequence'; // Temporarily disabled

import { motion, useScroll, useTransform } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { PricingSection } from '../components/PricingSection';
import { BottomNav } from '../components/BottomNav';

gsap.registerPlugin(ScrollTrigger);

export default function LandingPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const [isContactModalOpen, setIsContactModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('home');
    const { setTheme } = useTheme();
    const containerRef = useRef<HTMLDivElement>(null);
    const scrollSentinelRef = useRef<HTMLDivElement>(null);

    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end end"]
    });

    // Force Dark Theme for Cinematic Feel
    useEffect(() => {
        setTheme('dark');
    }, [setTheme]);

    // Analytics Sentinel
    useEffect(() => {
        const sentinel = scrollSentinelRef.current;
        if (!sentinel) return;
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                Events.landingScrolled50();
                observer.disconnect();
            }
        }, { threshold: 0.1 });
        observer.observe(sentinel);
        return () => observer.disconnect();
    }, []);

    const handleApplyToSell = () => {
        Events.heroCTAClicked({ location: 'hero', variant: 'apply_to_sell' });
        navigate('/apply');
    };

    const handleLogin = async () => {
        if (user) {
            try {
                const profilePromise = supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .maybeSingle()
                    .then(res => res);

                const { data: profile } = await withTimeout(profilePromise, 5000, 'fetch-profile') as any;

                if (profile?.role === 'admin') {
                    navigate('/admin');
                } else {
                    navigate('/dashboard');
                }
            } catch (err) {
                console.warn('handleLogin redirecting with fallback:', err);
                navigate('/dashboard');
            }
        } else {
            setIsLoginModalOpen(true);
        }
    };

    const handleNavigate = (view: string) => {
        setActiveTab(view);
        if (view === 'cart') navigate('/cart');
        if (view === 'account') handleLogin();
        // For 'home', 'wishlist', 'viewAll', we can scroll or show a message
        if (view === 'home') window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    useGSAP(() => {
        const tl = gsap.timeline({
            scrollTrigger: {
                trigger: ".hero-section",
                start: "top top",
                end: "+=150%",
                scrub: 2,
                pin: true,
            }
        });

        // 1. Text splits apart
        tl.to(".hero-text-top", { y: -100, opacity: 0, duration: 1 }, 0)
            .to(".hero-text-bottom", { y: 100, opacity: 0, duration: 1 }, 0)
            .to(".hero-subtitle", { opacity: 0, scale: 0.8, duration: 0.5 }, 0);

        // 2. (Removed parallax-cards animation here as it's been replaced by FloatingCollage)

        // Stagger intro
        gsap.fromTo(".nav-item",
            { y: -20, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.8, stagger: 0.1, ease: "power3.out" }
        );

        gsap.fromTo(".hero-element",
            { y: 50, opacity: 0 },
            { y: 0, opacity: 1, duration: 1, stagger: 0.2, ease: "power4.out", delay: 0.2 }
        );

        // Features Parallax
        const features = gsap.utils.toArray('.feature-card');
        features.forEach((feature: any, i) => {
            gsap.fromTo(feature,
                { y: 100, opacity: 0 },
                {
                    y: 0, opacity: 1,
                    scrollTrigger: {
                        trigger: feature,
                        start: "top 85%",
                        end: "top 50%",
                        scrub: 1.5
                    }
                }
            );
        });

    }, { scope: containerRef });

    return (
        <ClickSpark sparkColor='#ccff00' sparkSize={10} sparkRadius={15} sparkCount={8} duration={400}>
            <div ref={containerRef} className="bg-[#050505] min-h-screen text-white font-body overflow-x-clip selection:bg-[#ccff00] selection:text-black">
                <CustomCursor />
                {/* Optimized Noise Texture Overlay - 3.5% Opacity Matte Look */}
                <div
                    className="fixed inset-0 pointer-events-none opacity-[0.035] z-[60] contrast-[1.1]"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 250 250' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                        backgroundSize: '250px 250px'
                    }}
                />
                <ContactUsModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} />

                {/* Fixed Anchor Logo */}
                <div
                    className="fixed top-8 left-8 z-[9999] flex items-center gap-3 cursor-pointer group/logo"
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                >
                    <img src="/logo.jpg" alt="VendorFlow Logo" className="w-8 h-8 md:w-10 md:h-10 rounded-full object-cover shadow-sm" />
                    <div className="flex items-center gap-1.5 hidden sm:flex">
                        <span
                            className="text-[20px] font-extrabold uppercase text-white"
                            style={{
                                fontFamily: "'Syne', sans-serif",
                                letterSpacing: '-0.03em',
                            }}
                        >
                            VENDORFLOW
                        </span>
                        <span
                            className="inline-block text-[#ccff00] text-[16px] font-black leading-none transition-all duration-300 group-hover/logo:drop-shadow-[0_0_8px_#ccff00] translate-y-[-1px]"
                            style={{ fontFamily: "'Syne', sans-serif" }}
                        >
                            &#9654;
                        </span>
                    </div>
                </div>

                {/* Minimalist Nav (Actions only on right) */}
                <header className="fixed top-0 w-full z-[100] px-4 sm:px-8 py-6 pointer-events-none">
                    <div className="max-w-[1600px] mx-auto flex items-center justify-end pointer-events-auto">
                        <div className="flex gap-4 sm:gap-6 items-center">
                            {/* Desktop only secondary links */}
                            <button
                                onClick={() => {
                                    const pricing = document.getElementById('pricing');
                                    pricing?.scrollIntoView({ behavior: 'smooth' });
                                }}
                                className="hidden sm:block text-sm font-bold text-white/50 hover:text-[#ccff00] transition-colors"
                            >
                                Pricing
                            </button>
                            
                            <button
                                onClick={handleLogin}
                                className="nav-item text-sm sm:text-base font-bold cursor-pointer text-white/70 hover:text-[#ccff00] transition-colors flex items-center gap-2"
                                title={user ? "Go to Dashboard" : "Seller Login"}
                            >
                                <Shuffle
                                    text={user ? "Dashboard" : "Seller Login"}
                                    shuffleDirection="right"
                                    duration={0.3}
                                    animationMode="none"
                                    shuffleTimes={1}
                                    ease="power3.out"
                                    stagger={0.04}
                                    threshold={0.1}
                                    triggerOnce={false}
                                    triggerOnHover={true}
                                    respectReducedMotion={true}
                                    loop={false}
                                    loopDelay={0}
                                    className="m-0 p-0 inline-block pointer-events-none"
                                    tag="span"
                                />
                                {user && <div className="w-1.5 h-1.5 bg-[#ccff00] rounded-full animate-pulse shadow-[0_0_8px_#ccff00]" />}
                            </button>
                            
                            {/* Hide Apply on mobile header - it's in BottomNav or Hero */}
                            <div className="hidden sm:block">
                                <MagneticButton onClick={handleApplyToSell} className="nav-item !h-10 !p-0 overflow-hidden w-[96px] !bg-transparent rounded-[22px]">
                                    <StarBorder
                                        as="div"
                                        color="#ccff00"
                                        speed="4s"
                                        thickness={2}
                                        className="w-full h-full"
                                        innerClassName="w-full h-full p-[4px] pointer-events-none"
                                    >
                                        <div className="bg-[#070707] w-full h-full rounded-[18px] flex items-center justify-center border border-white/5 shadow-inner">
                                            <motion.span
                                                animate={{ opacity: [0.5, 1, 0.5], scale: [0.97, 1.02, 0.97] }}
                                                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                                                className="text-[#ccff00] text-[15px] font-black uppercase tracking-wider"
                                            >
                                                Apply
                                            </motion.span>
                                        </div>
                                    </StarBorder>
                                </MagneticButton>
                            </div>
                        </div>
                    </div>
                </header>

                {/* GSAP Pinned Hero Section */}
                <section className="hero-section h-screen w-full relative flex items-center justify-center overflow-hidden">
                    {/* Background Grid */}
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>

                    {/* Floating Orbs for Parallax Depth */}
                    <motion.div
                        style={{ y: useTransform(scrollYProgress, [0, 1], [0, 300]) }}
                        className="absolute top-10 left-[5%] w-[30vw] h-[30vw] min-w-[300px] min-h-[300px] bg-[#ccff00]/[0.03] rounded-full blur-[100px] pointer-events-none z-0"
                    />
                    <motion.div
                        style={{ y: useTransform(scrollYProgress, [0, 1], [0, -400]) }}
                        className="absolute bottom-[-20%] right-[10%] w-[40vw] h-[40vw] min-w-[400px] min-h-[400px] bg-[#00ff88]/[0.02] rounded-full blur-[120px] pointer-events-none z-0"
                    />

                    <div className="relative z-10 flex flex-col items-center justify-center text-center px-4 w-full">
                        <div className="hero-element scan-pulse-container border border-white/10 bg-white/5 backdrop-blur-sm px-4 py-1.5 mb-8 rounded-full shadow-[0_0_20px_rgba(204,255,0,0.1)]">
                            <div className="scan-pulse-beam" />
                            <DecryptedText
                                text="The Ultimate Commerce OS"
                                speed={80}
                                maxIterations={20}
                                animateOn="view"
                                className="text-[11px] uppercase tracking-[0.2em] text-[#ccff00] font-bold digital-glow"
                                encryptedClassName="text-white/40"
                            />
                        </div>

                        <h1 className="hero-element font-orbitron font-bold text-5xl sm:text-7xl md:text-8xl lg:text-[120px] leading-[0.9] tracking-tighter uppercase mb-6 flex flex-col">
                            <SplitText
                                text="Scale Without"
                                className="hero-text-top block text-white/90"
                                delay={40}
                                duration={1.2}
                                tag="span"
                                onLetterAnimationComplete={() => { }}
                            />
                            <SplitText
                                text="Compromise"
                                className="hero-text-bottom block text-[#ccff00]"
                                delay={40}
                                duration={1.2}
                                tag="span"
                                onLetterAnimationComplete={() => { }}
                            />
                        </h1>

                        <p className="hero-element hero-subtitle text-lg sm:text-xl md:text-2xl text-white/50 max-w-2xl font-light">
                            Real infrastructure for high-volume merchants.
                            No bloated plugins. Just raw speed and analytics.
                        </p>

                        <div className="hero-element mt-12 sm:hidden w-full px-4">
                            <MagneticButton onClick={handleApplyToSell} className="mx-auto w-[220px] h-14 sm:h-16 !p-0 overflow-hidden !bg-transparent rounded-[24px]">
                                <StarBorder
                                    as="div"
                                    color="#ccff00"
                                    speed="4s"
                                    thickness={2}
                                    className="w-full h-full"
                                    innerClassName="w-full h-full p-[6px] pointer-events-none"
                                >
                                    <div className="bg-[#070707] w-full h-full rounded-[20px] flex items-center justify-center border border-white/5 shadow-inner">
                                        <motion.span
                                            animate={{ opacity: [0.5, 1, 0.5], scale: [0.98, 1.02, 0.98] }}
                                            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                                            className="text-[#ccff00] text-lg sm:text-xl font-black uppercase tracking-wider"
                                        >
                                            Start Scaling
                                        </motion.span>
                                    </div>
                                </StarBorder>
                            </MagneticButton>
                        </div>
                    </div>

                </section>

                {/* Floating Collage Section */}
                <FloatingCollage />

                {/* Phase 3 Parallax Sections */}
                <DemoVideo />
                <Ecosystem />

                {/* Smooth Color Transition: Ecosystem grey → Cube black */}
                <div className="relative w-full h-[60vh] z-20 -mb-[10vh]"
                    style={{
                        background: 'linear-gradient(to bottom, #050505 0%, #030303 40%, #010101 70%, #000000 100%)',
                    }}
                >
                    <div ref={scrollSentinelRef} aria-hidden="true" className="absolute bottom-0 h-1 w-full" />
                </div>

                {/* Scroll-Driven Image Sequence Animation — Temporarily Disabled */}
                {/* <div className="relative z-20 bg-black">
                    <ScrollImageSequence
                        frameCount={192}
                        framePathPrefix="/assets/frames/ezgif-frame-"
                        framePathSuffix=".jpg"
                        padLength={3}
                        sectionHeightFactor={5}
                    />
                </div> */}



                {/* Transition to FAQ — clean edge, no neon bleed */}

                {/* The FAQ section slides up as a solid curtain over the blown-out canvas */}
                <div className="relative z-30 w-full bg-[#050505]">
                    <FAQ />
                </div>

                {/* Subscriptions / Pricing Section */}
                <div className="relative z-30 w-full bg-[#050505]">
                    <PricingSection />
                </div>

                {/* Mobile-Optimized CTA */}
                <section className="py-12 sm:py-24 px-4 border-t border-white/10 relative overflow-hidden group">
                    <div className="absolute inset-0 z-0 transition-opacity duration-1000 pointer-events-none">
                        <div className="w-full h-full relative pointer-events-auto opacity-80 hidden sm:block">
                            <LiquidEther
                                colors={['#ccff00', '#00ff88', '#88ff44']}
                                mouseForce={13}
                                cursorSize={55}
                                isViscous
                                viscous={24}
                                iterationsViscous={24}
                                iterationsPoisson={22}
                                dt={0.02}
                                resolution={0.5}
                                isBounce={false}
                                autoDemo
                                autoSpeed={0.45}
                                autoIntensity={1.6}
                                takeoverDuration={0.3}
                                autoResumeDelay={1200}
                                autoRampDuration={0.8}
                            />
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-b from-[#ccff00]/5 to-transparent sm:hidden" />
                    </div>
                    <div className="max-w-4xl mx-auto text-center relative z-10 flex flex-col items-center">
                        <div className="text-3xl sm:text-5xl md:text-6xl font-heading font-bold uppercase leading-[0.9] tracking-tighter mb-6 flex items-center justify-center gap-3">
                            <BlurText text="Ready To" delay={50} direction="bottom" />
                            <RotatingText
                                texts={['Scale?', 'Grow?', 'Expand?', 'Thrive?']}
                                mainClassName="text-[#ccff00] italic overflow-hidden py-3 pr-4"
                                staggerFrom="last"
                                staggerDuration={0.025}
                                rotationInterval={2500}
                                transition={{ type: 'spring', damping: 30, stiffness: 200 }}
                                initial={{ y: '100%', opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: '-120%', opacity: 0 }}
                            />
                        </div>
                        <p className="text-white/50 mb-8 max-w-xl mx-auto text-base sm:text-lg font-light">
                            Everything you need to sell online. Elevate your brand today.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto px-4 sm:px-0">
                            <button onClick={handleApplyToSell} className="w-full sm:w-[240px] h-16 !p-0 overflow-hidden !bg-transparent rounded-[24px] hover:scale-[1.02] transition-transform duration-300">
                                <StarBorder
                                    as="div"
                                    color="#ccff00"
                                    speed="4s"
                                    thickness={2}
                                    className="w-full h-full"
                                    innerClassName="w-full h-full p-[6px] pointer-events-none"
                                >
                                    <div className="bg-[#070707] w-full h-full rounded-[20px] flex items-center justify-center border border-white/5 shadow-inner">
                                        <motion.span
                                            animate={{ opacity: [0.5, 1, 0.5], scale: [0.98, 1.02, 0.98] }}
                                            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                                            className="text-[#ccff00] text-lg sm:text-xl font-black uppercase tracking-wider text-center w-full"
                                        >
                                            Apply to Sell
                                        </motion.span>
                                    </div>
                                </StarBorder>
                            </button>
                            <button onClick={() => setIsContactModalOpen(true)} className="w-full sm:w-[240px] h-16 bg-transparent border border-white/20 text-white font-bold uppercase tracking-wider text-sm hover:border-white transition-colors touch-manipulation">
                                Contact Sales
                            </button>
                        </div>

                        <button
                            onClick={handleLogin}
                            className="mt-6 text-base cursor-pointer group/login text-white/40 hover:text-[#ccff00] transition-colors"
                            onMouseEnter={(e) => {
                                const spans = e.currentTarget.querySelectorAll('.shuffle-parent > span > span');
                                if (spans.length > 0) gsap.to(spans, { color: '#ccff00', stagger: 0.04, duration: 0.3, ease: 'power2.out', overwrite: true });
                            }}
                            onMouseLeave={(e) => {
                                const spans = e.currentTarget.querySelectorAll('.shuffle-parent > span > span');
                                if (spans.length > 0) gsap.to(spans, { color: 'rgba(255, 255, 255, 0.4)', stagger: 0.04, duration: 0.3, ease: 'power2.out', overwrite: true });
                            }}
                        >
                            If you are a seller, <Shuffle
                                text="login here"
                                shuffleDirection="right"
                                duration={0.3}
                                animationMode="none"
                                shuffleTimes={1}
                                ease="power3.out"
                                stagger={0.04}
                                threshold={0}
                                rootMargin="200px"
                                triggerOnce={false}
                                triggerOnHover={true}
                                respectReducedMotion={true}
                                loop={false}
                                loopDelay={0}
                                className="m-0 p-0 inline-block border-b border-white/40 group-hover/login:border-[#ccff00] transition-colors duration-[400ms] pointer-events-none pb-0.5"
                                tag="span"
                            />
                        </button>
                    </div>
                </section>

                {/* Pre-Footer CTA Band */}
                <section className="py-6 sm:py-8 border-t border-[#ccff00]/10 relative overflow-hidden">
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#ccff00]/30 to-transparent" />
                    <ScrollVelocity
                        texts={['Your Brand. Your Rules. Your Revenue. ✦', 'Apply Now ✦ Start Selling ✦ Go Global ✦']}
                        velocity={80}
                        className="text-[#ccff00]/20 font-heading font-bold uppercase tracking-tighter"
                        numCopies={4}
                        damping={50}
                        stiffness={400}
                    />
                </section>

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
                            if (key === 'Contact Us') window.location.href = 'mailto:support@vendorflow.com';
                            if (key === 'Blog') navigate('/blog');
                        }
                    }}
                    branding={{
                        storeName: "VENDORFLOW",
                        description: "The premier infrastructure for ambitious independent brands.",
                        socials: {
                            instagram: "https://www.instagram.com/_rajdeep.007_/",
                            twitter: "https://x.com/_rajdeep007_",
                            linkedin: "https://www.linkedin.com/in/rajdeep-bhattacharyya-497945371/"
                        }
                    }}
                    categories={[]}
                />

                <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} initialMode="seller" />

                <BottomNav 
                    onNavigate={handleNavigate} 
                    cartCount={0} 
                    activeTab={activeTab}
                />
            </div>
        </ClickSpark>
    );
}
