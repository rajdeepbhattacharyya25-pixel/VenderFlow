import React, { useRef } from 'react';
import { motion, useScroll, useTransform, type MotionValue } from 'framer-motion';
import {
    Play,
    Store,
    ShieldCheck,
    LayoutDashboard,
    CreditCard,
    BarChart3,
    Megaphone,
} from 'lucide-react';
// import BlurText from './react-bits/BlurText';
// import DecryptedText from './react-bits/DecryptedText';
// import { ParticleCard, GlobalSpotlight } from "./MagicBento";

/**
 * 1. DemoVideo Component
 * Features a scroll-triggered zoom-in parallax with glassmorphic borders.
 */
export const DemoVideo = () => {
    const sectionRef = useRef(null);
    const { scrollYProgress } = useScroll({
        target: sectionRef,
        offset: ["start end", "end start"],
    });

    const scale = useTransform(scrollYProgress, [0, 0.4], [0.85, 1]);
    const opacity = useTransform(scrollYProgress, [0, 0.2], [0, 1]);

    return (
        <section ref={sectionRef} className="py-24 px-6 md:px-12 bg-[#050505] flex justify-center overflow-hidden relative z-20">
            <motion.div
                style={{ scale, opacity }}
                className="relative w-full max-w-6xl aspect-video rounded-3xl border-2 border-[#ccff00]/30 overflow-hidden flex items-center justify-center group cursor-pointer shadow-[0_0_100px_rgba(204,255,0,0.08)] hover:shadow-[0_0_120px_rgba(204,255,0,0.15)] transition-shadow duration-700"
            >
                {/* Visible gradient background */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0a] via-[#111] to-[#0a0a0a]" />

                {/* Radial glow behind play button */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(204,255,0,0.08)_0%,_transparent_60%)]" />

                {/* Animated grid pattern */}
                <div
                    className="absolute inset-0 opacity-[0.06]"
                    style={{
                        backgroundImage: `linear-gradient(to right, #ccff00 1px, transparent 1px), linear-gradient(to bottom, #ccff00 1px, transparent 1px)`,
                        backgroundSize: '40px 40px'
                    }}
                />

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-[#ccff00]/[0.03] opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                {/* Center Play Button */}
                <div className="relative z-10 flex flex-col items-center gap-6">
                    <div className="w-20 h-20 md:w-24 md:h-24 bg-[#ccff00] rounded-full flex items-center justify-center text-black shadow-xl shadow-[#ccff00]/30 group-hover:scale-110 group-hover:shadow-[#ccff00]/50 transition-all duration-500 ease-out">
                        <Play fill="currentColor" className="ml-1.5" size={32} />
                    </div>
                    <span className="text-white/60 text-sm md:text-base font-medium uppercase tracking-[0.2em] group-hover:text-white/80 transition-colors duration-500">
                        Watch Demo
                    </span>
                </div>

                {/* Decorative corner accents */}
                <div className="absolute top-6 left-6 w-10 h-10 border-t-2 border-l-2 border-[#ccff00]/40 rounded-tl-xl" />
                <div className="absolute top-6 right-6 w-10 h-10 border-t-2 border-r-2 border-[#ccff00]/40 rounded-tr-xl" />
                <div className="absolute bottom-6 left-6 w-10 h-10 border-b-2 border-l-2 border-[#ccff00]/40 rounded-bl-xl" />
                <div className="absolute bottom-6 right-6 w-10 h-10 border-b-2 border-r-2 border-[#ccff00]/40 rounded-br-xl" />
            </motion.div>
        </section>
    );
};

import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * 2. HowItWorks Component
 * Pinned horizontal/vertical timeline with animated line and text wipe.
 */
export const HowItWorks = () => {
    const containerRef = useRef<HTMLElement>(null);

    useGSAP(() => {
        // Setup original stroke-dasharray for svg lines
        gsap.set(".desktop-line-path", { drawSVG: "0%" }); // fallback if no drawSVG: strokeDasharray: 1000, strokeDashoffset: 1000
        // Wait, drawSVG is a premium plugin. We can use plain CSS strokeDasharray!
        // Desktop line is 100% width, mobile is 100% height. It's much easier to use simple relative DIVs instead of SVGs to avoid guessing lengths.

        const tl = gsap.timeline({
            scrollTrigger: {
                trigger: containerRef.current,
                start: "top top", // Change to top top so it pins immediately
                end: "+=200%", // 2 viewports worth of scroll to complete the animation
                scrub: 1,
                pin: true,
                anticipatePin: 1,
            },
        });

        // 1. Text Reveal (Scrubbable Neon Mask - Wiping Right-to-Left)
        // Initially clipPath hides everything to the left
        tl.fromTo(".how-text-neon-mask", {
            clipPath: "inset(0 100% 0 0)"
        }, {
            clipPath: "inset(0 0% 0 0)",
            duration: 0.4,
            ease: "none"
        }, 0);

        // Trailing Edge Blur
        tl.fromTo(".how-text-blur", {
            right: "100%",
            opacity: 0,
        }, {
            right: "0%",
            opacity: 1,
            duration: 0.4,
            ease: "none"
        }, 0);

        tl.to(".how-text-blur", {
            opacity: 0,
            duration: 0.05,
        }, 0.35);

        // 2. The Line Fills Up
        // Desktop Line
        tl.fromTo(".how-line-desktop-fill", {
            scaleX: 0
        }, {
            scaleX: 1,
            duration: 0.6,
            ease: "none"
        }, 0.4);

        // Mobile Line
        tl.fromTo(".how-line-mobile-fill", {
            scaleY: 0
        }, {
            scaleY: 1,
            duration: 0.6,
            ease: "none",
        }, 0.4);

        // 3. Fade in Steps as the line hits them
        tl.fromTo(".how-step-1", { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.2 }, 0.4);
        tl.fromTo(".how-step-2", { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.2 }, 0.7);
        tl.fromTo(".how-step-3", { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.2 }, 1.0);

    }, { scope: containerRef });

    const steps = [
        {
            icon: Store,
            title: "Apply to Join",
            desc: "Submit your business details. We review every application to ensure network quality."
        },
        {
            icon: ShieldCheck,
            title: "Get Verified",
            desc: "Once approved, our team helps configure your store for optimal performance."
        },
        {
            icon: LayoutDashboard,
            title: "Start Selling",
            desc: "Go live to engaged audiences with native payment and checkout integrations."
        },
    ];

    return (
        <section ref={containerRef} className="py-20 px-6 md:px-12 bg-[#050505] text-white relative z-20 min-h-screen flex flex-col justify-center">

            <div className="max-w-6xl mx-auto w-full flex flex-col items-center text-center mb-16 cursor-default">

                {/* Text Reveal Animation Group */}
                <div className="relative inline-block overflow-hidden py-2 px-2 mb-6">
                    {/* Base Text */}
                    <div className="flex flex-wrap justify-center items-center gap-x-3 gap-y-2">
                        <span className="text-5xl md:text-7xl font-bold font-heading tracking-tighter text-white">
                            How it
                        </span>
                        <span className="text-5xl md:text-7xl font-bold font-playfair italic text-[#ccff00] tracking-tighter">
                            works
                        </span>
                    </div>

                    {/* Masked Neon Overlay */}
                    <div className="how-text-neon-mask absolute inset-0 z-10 pointer-events-none flex flex-wrap justify-center items-center gap-x-3 gap-y-2 py-2 px-2 bg-[#050505]">
                        <span className="text-5xl md:text-7xl font-bold font-heading tracking-tighter text-[#ccff00]">
                            How it
                        </span>
                        <span className="text-5xl md:text-7xl font-bold font-playfair italic text-white tracking-tighter">
                            works
                        </span>
                    </div>

                    {/* Trailing Blur */}
                    <div className="how-text-blur absolute top-0 bottom-0 w-[60px] bg-gradient-to-l from-[#ccff00]/80 to-transparent blur-lg z-20 pointer-events-none translate-x-full" />
                </div>

                <p className="text-zinc-400 text-lg md:text-xl max-w-2xl font-light leading-relaxed">
                    Our onboarding process is designed to filter for quality and set you up for success from day one.
                </p>
            </div>

            <div className="max-w-5xl mx-auto w-full relative pl-12 md:pl-0">

                {/* Connecting Line - Desktop (DIV based) */}
                <div className="hidden md:block absolute top-[40px] left-[15%] right-[15%] h-[2px] bg-[#1f1f1f] z-0">
                    <div className="how-line-desktop-fill absolute top-0 left-0 bottom-0 w-full bg-[#ccff00] origin-left" />
                </div>

                {/* Connecting Line - Mobile (DIV based) */}
                <div className="md:hidden absolute left-[38px] top-10 bottom-10 w-[2px] bg-[#1f1f1f] z-0">
                    <div className="how-line-mobile-fill absolute top-0 left-0 right-0 h-full bg-[#ccff00] origin-top" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-16 md:gap-8 relative z-10 w-full">
                    {steps.map((step, idx) => (
                        <div
                            key={idx}
                            className={`how-step-${idx + 1} relative flex flex-col md:items-center text-left md:text-center w-full`}
                        >
                            {/* Step Circle with Icon */}
                            <div className="relative mb-8 self-start md:self-auto">
                                <div className="w-20 h-20 rounded-full bg-[#111] border border-white/10 flex items-center justify-center relative z-10 shadow-lg">
                                    <step.icon className="text-[#ccff00] w-7 h-7" />
                                </div>
                                {/* Number Badge */}
                                <div className="absolute -top-2 -right-2 w-8 h-8 bg-[#333] text-white rounded-full flex items-center justify-center font-bold text-sm border border-[#111] z-20">
                                    {idx + 1}
                                </div>
                            </div>

                            <h3 className="text-xl font-bold font-heading mb-4 text-white">{step.title}</h3>
                            <p className="text-zinc-400 text-sm leading-relaxed font-light">{step.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

/**
 * Sub-component for individual word reveals to follow Hook Rules
 */
const RevealWord = ({ word, i, scrollYProgress }: { word: string, i: number, scrollYProgress: MotionValue<number> }) => {
    const start = i * 0.20;
    const end = 0.60 + (i * 0.20);
    const revealAmount = useTransform(scrollYProgress, [start, end], [0, 100]);
    const isEcosystem = word === 'Ecosystem';

    return (
        <div className="relative inline-block overflow-hidden py-1 px-1">
            <h2 className={`text-3xl md:text-4xl lg:text-5xl font-bold tracking-tighter leading-tight m-0 ${isEcosystem ? 'text-[#ccff00] font-serif italic' : 'text-white font-heading'}`}>
                {word}
            </h2>

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

/**
 * 3. Ecosystem Component
 * Sticky Stacking interaction for features.
 */
export const Ecosystem = () => {
    const sectionRef = useRef<HTMLElement>(null);
    const { scrollYProgress } = useScroll({
        target: sectionRef,
        offset: ["start 80%", "start 15%"],
    });

    const cards = [
        {
            title: "Branded Digital Store",
            desc: "A standalone storefront designed for your brand identity, optimized for high conversions on all devices.",
            icon: Store,
            bgClassName: "bg-[#111] text-white border-white/10",
            iconContainerClassName: "bg-white/10 border-white/20",
            iconColorClassName: "text-white"
        },
        {
            title: "Secure Payments",
            desc: "Enterprise-grade transaction security with fraud protection and instant payouts built-in.",
            icon: CreditCard,
            bgClassName: "bg-white text-black border-black/10",
            iconContainerClassName: "bg-black/5 border-black/10",
            iconColorClassName: "text-black"
        },
        {
            title: "Growth Analytics",
            desc: "Comprehensive dashboards to track sales, traffic sources, and actionable insights to grow your revenue.",
            icon: BarChart3,
            bgClassName: "bg-[#ccff00] text-black border-[#ccff00]/50",
            iconContainerClassName: "bg-black/10 border-black/20",
            iconColorClassName: "text-black"
        },
        {
            title: "Marketing Tools",
            desc: "Built-in email marketing, discount creation, and social integrations to drive repeat customers.",
            icon: Megaphone,
            bgClassName: "bg-[#111] text-white border-white/10",
            iconContainerClassName: "bg-white/10 border-white/20",
            iconColorClassName: "text-white"
        },
    ];

    return (
        <section ref={sectionRef} className="py-16 mt-40 px-6 md:px-12 bg-[#050505] relative z-20">
            <div className="max-w-4xl mx-auto flex flex-col items-center text-center mb-10 px-4 sticky top-[3vh] z-[5]">
                <div className="mb-4 flex flex-wrap justify-center gap-x-4 gap-y-2">
                    {['Complete', 'Commerce', 'Ecosystem'].map((word, i) => (
                         <RevealWord key={i} word={word} i={i} scrollYProgress={scrollYProgress} />
                    ))}
                </div>
                <p className="text-zinc-400 text-sm md:text-base font-light leading-relaxed max-w-2xl mt-3">
                    Everything you need to run an online business without the technical headache. We handle the complexity, you handle the product.
                </p>
            </div>

            {/* Sticky Stacking Container */}
            <div className="max-w-4xl mx-auto relative z-10">
                <div className="relative">
                    {cards.map((card, idx) => (
                        <React.Fragment key={idx}>
                            <div
                                className={`sticky flex flex-col justify-between rounded-3xl border p-6 md:p-10 shadow-[0_-10px_40px_rgba(0,0,0,0.3)] origin-top ${card.bgClassName}`}
                                style={{
                                    top: `calc(28vh + ${idx * 30}px)`,
                                    minHeight: "280px",
                                    zIndex: idx + 10,
                                }}
                            >
                                <div className="flex justify-between items-start">
                                    <h3
                                        className="text-3xl md:text-4xl lg:text-5xl font-black italic tracking-tighter w-full max-w-[80%]"
                                        style={{
                                            fontFamily: 'Inter, sans-serif',
                                            lineHeight: 1.05
                                        }}
                                    >
                                        {card.title}
                                    </h3>
                                    <div className={`hidden md:flex items-center justify-center w-14 h-14 rounded-full backdrop-blur-sm border ${card.iconContainerClassName}`}>
                                        <card.icon size={24} className={`opacity-80 ${card.iconColorClassName}`} />
                                    </div>
                                </div>

                                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mt-8 md:mt-12">
                                    <p className="text-base md:text-lg font-medium max-w-lg opacity-80 leading-relaxed font-body">
                                        {card.desc}
                                    </p>
                                    <div className={`md:hidden flex items-center justify-center w-16 h-16 rounded-full backdrop-blur-sm border mt-4 ${card.iconContainerClassName}`}>
                                        <card.icon size={28} className={`opacity-80 ${card.iconColorClassName}`} />
                                    </div>
                                </div>
                            </div>
                            {/* Spacer: gives scroll distance for the next card to arrive */}
                            <div className="h-[40vh]" />
                        </React.Fragment>
                    ))}
                </div>
            </div>
        </section>
    );
};

