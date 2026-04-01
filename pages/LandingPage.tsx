import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { LoginModal } from '../components/LoginModal';
import { Footer } from '../components/Footer';
import { ContactUsModal } from '../components/ContactUsModal';

// Lazy load heavy visual components
const DemoVideo = React.lazy(() => import('../components/ParallaxSections').then(module => ({ default: module.DemoVideo })));
const Ecosystem = React.lazy(() => import('../components/ParallaxSections').then(module => ({ default: module.Ecosystem })));
const BlurText = React.lazy(() => import('../components/react-bits/BlurText'));
const StarBorder = React.lazy(() => import('../components/react-bits/StarBorder'));
import ClickSpark from '../components/react-bits/ClickSpark';

const LiquidEther = React.lazy(() => import('../components/react-bits/LiquidEther'));
const Shuffle = React.lazy(() => import('../components/react-bits/Shuffle'));
const DecryptedText = React.lazy(() => import('../components/react-bits/DecryptedText'));
const RotatingText = React.lazy(() => import('../components/react-bits/RotatingText'));
const ScrollVelocity = React.lazy(() => import('../components/react-bits/ScrollVelocity'));
const FloatingCollage = React.lazy(() => import('../components/FloatingCollage'));
const FAQ = React.lazy(() => import('../components/FAQ').then(module => ({ default: module.FAQ })));
const PricingSection = React.lazy(() => import('../components/PricingSection').then(module => ({ default: module.PricingSection })));

// Helper: race a promise against a timeout
function withTimeout<T>(promise: Promise<T> | PromiseLike<T>, ms: number, label = 'Operation'): Promise<T> {
    return Promise.race([
        Promise.resolve(promise),
        new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
        ),
    ]);
}

import Lenis from 'lenis';
import SplitText from '../components/SplitText';
import { Events } from '../lib/analytics';
import { MagneticButton } from '../components/InteractiveUI';
import { useTheme } from 'next-themes';
// import { ScrollImageSequence } from '../components/ScrollImageSequence'; // Temporarily disabled

import { motion, useScroll, useTransform, useMotionValueEvent, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger);

export default function LandingPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const [loginMode, setLoginMode] = useState<'customer' | 'seller'>('customer');
    const [isContactModalOpen, setIsContactModalOpen] = useState(false);
    const [showEffect, setShowEffect] = useState(false);
    const [showMobileSticky, setShowMobileSticky] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const { setTheme } = useTheme();
    const containerRef = useRef<HTMLDivElement>(null);
    const scrollSentinelRef = useRef<HTMLDivElement>(null);

    // Initial Mobile Detection
    useEffect(() => {
        const checkMobile = () => {
            const mobile = window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            setIsMobile(mobile);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Preload critical collage images for seamless scroll transitions
    useEffect(() => {
        const collageImages = [
            "/assets/collage/admin dashboard.webp",
            "/assets/collage/seller dashboard.webp",
            "/assets/collage/storefront.webp",
            "/assets/collage/payment-verified.webp",
        ];
        collageImages.forEach((src) => {
            const img = new Image();
            img.src = src;
        });
    }, []);

    // Delay heavy visual effects to prioritize LCP
    useEffect(() => {
        const delay = isMobile ? 500 : 1200; 
        const timer = setTimeout(() => setShowEffect(true), delay);
        return () => clearTimeout(timer);
    }, [isMobile]);

    // Local Lenis initialization
    useEffect(() => {
        // Disable Lenis on touch devices/mobile for native performance
        if (isMobile) return;

        const lenis = new Lenis({
            duration: 1.2,
            easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            smoothWheel: true,
        });

        const raf = (time: number) => {
            lenis.raf(time);
            requestAnimationFrame(raf);
        };
        requestAnimationFrame(raf);

        lenis.on('scroll', ScrollTrigger.update);

        return () => {
            lenis.destroy();
        };
    }, [isMobile]);

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
        Events.heroCTAClicked({ section: 'hero', type: 'apply' });
        navigate('/apply');
    };

    useMotionValueEvent(scrollYProgress, "change", (latest) => {
        if (latest > 0.05 && !showMobileSticky) setShowMobileSticky(true);
        else if (latest <= 0.05 && showMobileSticky) setShowMobileSticky(false);
    });

    const handleLogin = async (mode: 'customer' | 'seller' = 'customer') => {
        Events.heroCTAClicked({ section: 'nav', type: 'login', mode });
        if (user) {
            try {
                // Short timeout: don't block the user for more than 1.5s
                const profilePromise = supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .maybeSingle();

                const { data: profile } = await withTimeout(profilePromise, 1500, 'fetch-profile') as { data: { role: string } | null };

                if (profile?.role === 'admin') {
                    navigate('/admin');
                } else {
                    navigate('/dashboard');
                }
            } catch (err) {
                console.warn('handleLogin redirecting with fallback (timeout or error):', err);
                // Graceful fallback: go to dashboard anyway if we have a user
                navigate('/dashboard');
            }
        } else {
            setLoginMode(mode);
            setIsLoginModalOpen(true);
        }
    };

    useGSAP(() => {
        const tl = gsap.timeline({
            scrollTrigger: {
                trigger: ".hero-section",
                start: "top top",
                end: "+=150%",
                scrub: isMobile ? 0.5 : 1.2, // Reduced scrub for snappier mobile response
                pin: true,
            }
        });

        // 1. Text splits apart
        tl.to(".hero-text-top", { y: -150, opacity: 0, duration: 1 }, 0)
            .to(".hero-text-bottom", { y: 150, opacity: 0, duration: 1 }, 0)
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
        const features = gsap.utils.toArray('.feature-card') as HTMLElement[];
        features.forEach((feature) => {
            gsap.fromTo(feature,
                { y: 100, opacity: 0 },
                {
                    y: 0, opacity: 1,
                    scrollTrigger: {
                        trigger: feature,
                        start: "top 85%",
                        end: "top 50%",
                        scrub: isMobile ? false : 1 // Faster feedback
                    }
                }
            );
        });

    }, { scope: containerRef });

    return (
        <Suspense fallback={null}>
            <LoginModal
                isOpen={isLoginModalOpen}
                onClose={() => setIsLoginModalOpen(false)}
                initialMode={loginMode}
            />
            <Suspense fallback={<div className="h-20" />}>
                <ContactUsModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} />
            </Suspense>

            {/* Mobile Sticky CTA Bar */}
            <AnimatePresence>
                {showMobileSticky && (
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="fixed bottom-0 left-0 right-0 z-[999] bg-[#050505]/90 backdrop-blur-md border-t border-white/10 p-3 sm:hidden flex justify-around items-center gap-3"
                    >
                        <motion.div whileTap={{ scale: 0.95 }} className="flex-1">
                            <MagneticButton onClick={handleApplyToSell} className="w-full h-12 !p-0 overflow-hidden !bg-transparent rounded-full">
                                <Suspense fallback={<div className="bg-[#ccff00]/20 w-full h-full rounded-full" />}>
                                    <StarBorder
                                        as="div"
                                        color="#ccff00"
                                        speed="4s"
                                        thickness={2}
                                        className="w-full h-full !rounded-full"
                                        innerClassName="w-full h-full p-[2px] pointer-events-none"
                                    >
                                        <div className="bg-[#070707] w-full h-full rounded-full flex items-center justify-center border border-white/5 shadow-inner">
                                            <motion.span
                                                animate={{ opacity: [0.5, 1, 0.5], scale: [0.98, 1.02, 0.98] }}
                                                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                                                className="mr-2 w-2 h-2 rounded-full bg-[#ccff00] shadow-[0_0_10px_#ccff00]"
                                            />
                                            <span className="font-bold text-white tracking-widest text-sm relative z-10">APPLY</span>
                                        </div>
                                    </StarBorder>
                                </Suspense>
                            </MagneticButton>
                        </motion.div>
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleLogin('customer')}
                            className="flex-1 h-12 bg-transparent border border-white/20 text-white font-bold uppercase tracking-wider text-sm rounded-full hover:border-white transition-colors touch-manipulation"
                        >
                            {user ? "Dashboard" : "Login"}
                        </motion.button>
                    </motion.div>
                )}
            </AnimatePresence>

            <ClickSpark sparkColor='#ccff00' sparkSize={10} sparkRadius={15} sparkCount={8} duration={400} disabled={isMobile}>
                <div ref={containerRef} className="bg-[#050505] min-h-screen text-white font-body overflow-x-clip selection:bg-[#ccff00] selection:text-black">
                    {/* Fixed Anchor Logo */}
                    <div
                        className="fixed top-4 left-4 sm:top-8 sm:left-8 z-[9999] flex items-center gap-2 sm:gap-3 cursor-pointer group/logo"
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    >
                        <img src="/logo.jpg" alt="VendorFlow Logo" className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full object-cover shadow-sm" />
                        <div className="flex items-center gap-1 sm:gap-1.5">
                            <span
                                className="text-[13px] sm:text-[18px] md:text-[20px] font-extrabold uppercase text-white"
                                style={{
                                    fontFamily: "'Syne', sans-serif",
                                    letterSpacing: '-0.03em',
                                }}
                            >
                                VENDORFLOW
                            </span>
                            <span
                                className="inline-block text-[#ccff00] text-[10px] sm:text-[14px] md:text-[16px] font-black leading-none transition-all duration-300 group-hover/logo:drop-shadow-[0_0_8px_#ccff00] translate-y-[-1px]"
                                style={{ fontFamily: "'Syne', sans-serif" }}
                            >
                                &#9654;
                            </span>
                        </div>
                    </div>

                    {/* Minimalist Nav (Actions only on right) */}
                    <header className="fixed top-0 w-full z-[100] px-3 sm:px-8 py-4 sm:py-6 pointer-events-none">
                        <div className="max-w-[1600px] mx-auto flex items-center justify-end pointer-events-auto">
                            <div className="flex gap-3 sm:gap-6 items-center">
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

                                <motion.button
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handleLogin(user ? 'customer' : 'seller')}
                                    className="nav-item text-xs sm:text-base font-bold cursor-pointer text-white/70 hover:text-[#ccff00] transition-colors flex items-center justify-center gap-1.5 sm:gap-2 p-2 sm:p-2 -mr-2 sm:mr-0 min-h-[40px] sm:min-h-[44px]"
                                    title={user ? "Go to Dashboard" : "Seller Login"}
                                >
                                    <Suspense fallback={<span>{user ? "Dashboard" : "Seller Login"}</span>}>
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
                                    </Suspense>
                                    {user && <div className="w-1.5 h-1.5 bg-[#ccff00] rounded-full animate-pulse shadow-[0_0_8px_#ccff00]" />}
                                </motion.button>

                                {/* Hide Apply on mobile header - it's in BottomNav or Hero */}
                                <div className="hidden sm:block">
                                    <MagneticButton onClick={handleApplyToSell} className="nav-item !h-10 !p-0 overflow-hidden w-[96px] !bg-transparent rounded-[22px]">
                                        <Suspense fallback={<div className="bg-[#ccff00]/20 w-full h-full rounded-[22px]" />}>
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
                                        </Suspense>
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

                        <div className="relative z-10 flex flex-col items-center justify-center text-center px-4 w-full h-[100svh] pt-20 pb-10 sm:h-auto sm:pt-0 sm:pb-0">
                            <div className="hero-element scan-pulse-container border border-white/10 bg-white/5 backdrop-blur-sm px-4 py-1.5 mt-4 sm:mt-0 mb-6 sm:mb-8 rounded-full shadow-[0_0_20px_rgba(204,255,0,0.1)]">
                                <div className="scan-pulse-beam" />
                                <Suspense fallback={<span className="text-white/40 text-[11px] uppercase tracking-[0.2em]">The Ultimate Commerce OS</span>}>
                                    {!isMobile ? (
                                        <DecryptedText
                                            text="The Ultimate Commerce OS"
                                            speed={80}
                                            maxIterations={20}
                                            animateOn="view"
                                            className="text-[11px] uppercase tracking-[0.2em] text-[#ccff00] font-bold digital-glow"
                                            encryptedClassName="text-white/40"
                                        />
                                    ) : (
                                        <span className="text-[11px] uppercase tracking-[0.2em] text-[#ccff00] font-bold digital-glow">The Ultimate Commerce OS</span>
                                    )}
                                </Suspense>
                            </div>

                            <h1 className="hero-element font-heading font-bold text-[10.5vw] sm:text-7xl md:text-8xl lg:text-[120px] leading-[0.9] tracking-tighter uppercase mb-4 sm:mb-6 flex flex-col">
                                {!isMobile ? (
                                    <>
                                        <SplitText
                                            text="SCALE WITHOUT"
                                            className="hero-text-top block text-white/90"
                                            delay={50}
                                            duration={1.25}
                                            tag="span"
                                            onLetterAnimationComplete={() => { }}
                                        />
                                        <SplitText
                                            text="COMPROMISE"
                                            className="hero-text-bottom block text-[#ccff00]"
                                            delay={70}
                                            duration={1.4}
                                            tag="span"
                                            onLetterAnimationComplete={() => { }}
                                        />
                                    </>
                                ) : (
                                    <>
                                        <span className="hero-text-top block text-white/90">SCALE WITHOUT</span>
                                        <span className="hero-text-bottom block text-[#ccff00]">COMPROMISE</span>
                                    </>
                                )}
                            </h1>

                            <p className="hero-element hero-subtitle text-[15px] sm:text-xl md:text-2xl text-white/50 max-w-2xl font-light px-2">
                                Real infrastructure for high-volume merchants.
                                No bloated plugins. Just raw speed and analytics.
                            </p>

                            <div className="hero-element mt-6 sm:hidden w-full px-4">
                                <motion.div whileTap={{ scale: 0.95 }}>
                                    <MagneticButton onClick={handleApplyToSell} className="mx-auto w-[220px] h-14 sm:h-16 !p-0 overflow-hidden !bg-transparent rounded-full">
                                        <Suspense fallback={<div className="bg-[#ccff00]/20 w-full h-full rounded-full" />}>
                                            <StarBorder
                                                as="div"
                                                color="#ccff00"
                                                speed="4s"
                                                thickness={2}
                                                className="w-full h-full !rounded-full"
                                                innerClassName="w-full h-full p-[2px] pointer-events-none"
                                            >
                                                <div className="bg-[#070707] w-full h-full rounded-full flex items-center justify-center border border-white/5 shadow-inner">
                                                    <motion.span
                                                        animate={{ opacity: [0.5, 1, 0.5], scale: [0.98, 1.02, 0.98] }}
                                                        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                                                        className="mr-2 w-2 h-2 rounded-full bg-[#ccff00] shadow-[0_0_10px_#ccff00]"
                                                    />
                                                    <span className="font-bold text-white tracking-widest text-sm relative z-10">START SCALING</span>
                                                </div>
                                            </StarBorder>
                                        </Suspense>
                                    </MagneticButton>
                                </motion.div>
                            </div>
                        </div>

                    </section>


                    {/* Floating Collage Section */}
                    <Suspense fallback={<div className="h-[80vh] bg-[#050505]" />}>
                        <FloatingCollage />
                    </Suspense>

                    {/* Phase 3 Parallax Sections */}
                    <Suspense fallback={<div className="h-screen" />}>
                        {/* -mt-[85vh] introduces a 15vh gap after FloatingCollage unpins to prevent tight transitions */}
                        {/* min-h-screen ensures bg-[#050505] fully covers the 100vh overlap so no marquee bleeds through */}
                        <div className="-mt-[85vh] relative z-20 bg-[#050505] min-h-screen">
                            <DemoVideo isMobile={isMobile} />
                        </div>
                    </Suspense>
                    <Suspense fallback={<div className="h-[80vh] bg-[#050505]" />}>
                        <Ecosystem isMobile={isMobile} />
                    </Suspense>

                    {/* Smooth Color Transition: Ecosystem grey → Cube black */}
                    <div className="relative w-full h-[60vh] z-20 -mb-[10vh]"
                        style={{
                            background: 'linear-gradient(to bottom, #050505 0%, #030303 40%, #010101 70%, #000000 100%)',
                        }}
                    >
                        <div ref={scrollSentinelRef} aria-hidden="true" className="absolute bottom-0 h-1 w-full" />
                    </div>

                    {/* Transition to FAQ — clean edge, no neon bleed */}

                    {/* The FAQ section slides up as a solid curtain over the blown-out canvas */}
                    <div className="relative z-30 w-full bg-[#050505]">
                        <Suspense fallback={<div className="h-screen" />}>
                            <FAQ />
                        </Suspense>
                    </div>

                    {/* Subscriptions / Pricing Section */}
                    <div className="relative z-30 w-full bg-[#050505]">
                        <Suspense fallback={<div className="h-screen" />}>
                            <PricingSection />
                        </Suspense>
                    </div>

                    {/* Mobile-Optimized CTA */}
                    <section className="py-16 sm:py-24 px-4 border-t border-white/10 relative overflow-hidden group">
                        <div className="absolute inset-0 z-0 transition-opacity duration-1000 pointer-events-none">
                            <div className="w-full h-full relative pointer-events-auto opacity-80 block">
                                <Suspense fallback={<div className="w-full h-full bg-[#ccff00]/5" />}>
                                    {showEffect && (
                                        <LiquidEther
                                            colors={['#ccff00', '#00ff88', '#88ff44']}
                                            mouseForce={isMobile ? 5 : 8}
                                            cursorSize={isMobile ? 80 : 130}
                                            isViscous
                                            viscous={isMobile ? 35 : 50}
                                            iterationsViscous={isMobile ? 16 : 32}
                                            iterationsPoisson={isMobile ? 16 : 32}
                                            dt={0.014}
                                            resolution={isMobile ? 0.35 : 0.5}
                                            isBounce={false}
                                            autoDemo
                                            autoSpeed={isMobile ? 0.08 : 0.15}
                                            autoIntensity={isMobile ? 0.5 : 0.7}
                                            takeoverDuration={0.4}
                                            autoResumeDelay={2000}
                                            autoRampDuration={2.5}
                                        />
                                    )}
                                </Suspense>
                            </div>
                        </div>
                        <div className="max-w-4xl mx-auto text-center relative z-10 flex flex-col items-center">
                            <div className="text-3xl sm:text-5xl md:text-6xl font-heading font-bold uppercase leading-[0.9] tracking-tighter mb-6 flex items-center justify-center gap-3">
                                <Suspense fallback={<span>Ready To</span>}>
                                    {!isMobile ? (
                                        <BlurText text="Ready To" delay={50} direction="bottom" />
                                    ) : (
                                        <span>Ready To</span>
                                    )}
                                </Suspense>
                                <Suspense fallback={<span className="text-[#ccff00] italic">Scale?</span>}>
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
                                </Suspense>
                            </div>
                            <p className="text-white/50 mb-8 max-w-xl mx-auto text-base sm:text-lg font-light">
                                Join the curated network of high-volume merchants. Elevate your brand today.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto px-4 sm:px-0">
                                <button onClick={handleApplyToSell} className="w-full sm:w-[240px] h-[48px] sm:h-16 !p-0 overflow-hidden !bg-transparent rounded-[16px] sm:rounded-[20px] focus:outline-none focus:ring-2 focus:ring-[#ccff00] touch-manipulation">
                                    <Suspense fallback={<div className="bg-[#ccff00]/20 w-full h-full rounded-[16px] sm:rounded-[20px]" />}>
                                        <StarBorder
                                            as="div"
                                            color="#ccff00"
                                            speed="4s"
                                            thickness={2}
                                            className="w-full h-full"
                                            innerClassName="w-full h-full p-[6px] pointer-events-none"
                                        >
                                            <div className="bg-[#070707] w-full h-full rounded-[14px] sm:rounded-[18px] flex items-center justify-center border border-white/5 shadow-inner">
                                                <motion.span
                                                    animate={{ opacity: [0.5, 1, 0.5], scale: [0.98, 1.02, 0.98] }}
                                                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                                                    className="text-[#ccff00] text-base sm:text-xl font-black uppercase tracking-wider text-center w-full"
                                                >
                                                    Apply to Sell
                                                </motion.span>
                                            </div>
                                        </StarBorder>
                                    </Suspense>
                                </button>
                                <button onClick={() => setIsContactModalOpen(true)} className="w-full sm:w-[240px] h-[48px] sm:h-16 rounded-[16px] sm:rounded-none bg-transparent border border-white/20 text-white font-bold uppercase tracking-wider text-xs sm:text-sm hover:border-white transition-colors touch-manipulation">
                                    Contact Sales
                                </button>
                            </div>

                            <button
                                onClick={() => handleLogin('seller')}
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
                                If you are a seller, <Suspense fallback={<span>login here</span>}>
                                    <Shuffle
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
                                </Suspense>
                            </button>
                        </div>
                    </section>

                    {/* Pre-Footer CTA Band */}
                    <section className="py-6 sm:py-8 border-t border-[#ccff00]/10 relative overflow-hidden">
                        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#ccff00]/30 to-transparent" />
                        <Suspense fallback={<div className="h-10 w-full" />}>
                            <ScrollVelocity
                                texts={['Your Brand. Your Rules. Your Revenue. ✦', 'Apply Now ✦ Start Selling ✦ Go Global ✦']}
                                velocity={80}
                                className="text-[#ccff00]/20 font-heading font-bold uppercase tracking-tighter"
                                numCopies={4}
                                damping={50}
                                stiffness={400}
                            />
                        </Suspense>
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

                    {/* Removed duplicate LoginModal instance to fix INP issues */}

                    {/* Mobile Sticky CTA Bar */}
                    <AnimatePresence>
                        {showMobileSticky && (
                            <motion.div
                                initial={{ y: 100, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: 100, opacity: 0 }}
                                transition={{ duration: 0.3, ease: "easeOut" }}
                                className="fixed bottom-0 left-0 w-full z-[90] p-4 sm:hidden bg-[#050505]/70 backdrop-blur-xl border-t border-white/10 flex items-center justify-between gap-4 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]"
                            >
                                <motion.button
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handleLogin('customer')}
                                    className="text-white/70 font-bold text-sm px-4 py-3 min-w-[80px]"
                                >
                                    Login
                                </motion.button>
                                <motion.button
                                    whileTap={{ scale: 0.95 }}
                                    onClick={handleApplyToSell}
                                    className="flex-1 bg-[#ccff00] text-black font-bold py-3 px-6 rounded-full text-sm flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(204,255,0,0.15)]"
                                >
                                    START SCALING
                                    <span className="text-[10px] leading-none mb-[2px]">▶</span>
                                </motion.button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </ClickSpark>
        </Suspense>
    );
}
