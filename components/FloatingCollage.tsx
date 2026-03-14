import React, { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger);

/*
 * Card Deck Storytelling — "VENDORFLOW STORY"
 *
 * Pinned scroll. Active card glows lime green.
 * Previous cards: scale down to 0.6, blur(15px), dim to 5%, stack at top-left.
 */

const cards = [
    {
        src: "/assets/collage/admin dashboard.jpg",
        alt: "Admin Platform Overview",
        browserTitle: "ADMIN_VIEW",
        step: "STEP 01",
        title: "Admin View",
        description: "Platform command center. Real-time telemetry, seller metrics, and system health monitoring.",
        landRotation: -1.5,
    },
    {
        src: "/assets/collage/seller dashboard.png",
        alt: "Seller Business Analytics",
        browserTitle: "SELLER_DASHBOARD",
        step: "STEP 02",
        title: "Seller Dashboard",
        description: "Revenue analytics, order intelligence, and business performance tracking.",
        landRotation: 1.2,
    },
    {
        src: "/assets/collage/storefront.png",
        alt: "Product Storefront",
        browserTitle: "LIVE_STOREFRONT",
        step: "STEP 03",
        title: "Live Storefront",
        description: "Premium product engine with real-time inventory, search, and collection management.",
        landRotation: -2,
    },
    {
        src: "/assets/collage/payment-verified.png",
        alt: "Payment Verified",
        browserTitle: "PAYMENT_GATEWAY",
        step: "STEP 04",
        title: "Payment Gateway",
        description: "Secure settlement pipeline. Encrypted transactions with instant verification.",
        landRotation: 1.8,
    },
];

/* Background Parking (Top-Left Stack) */
const inactiveSlots = [
    { x: "-38vw", y: "-35vh", rotation: -6, scale: 0.6 },
    { x: "-35vw", y: "-30vh", rotation: 4, scale: 0.6 },
    { x: "-32vw", y: "-25vh", rotation: -2, scale: 0.6 },
];

export function FloatingCollage() {
    const containerRef = useRef<HTMLDivElement>(null);
    const textRef = useRef<HTMLDivElement>(null);
    const marqueeRow1Ref = useRef<HTMLDivElement>(null);
    const marqueeRow2Ref = useRef<HTMLDivElement>(null);
    const scrollIndicatorRef = useRef<HTMLDivElement>(null);

    useGSAP(() => {
        const mm = gsap.matchMedia();

        mm.add("(min-width: 768px)", () => {
            /* ═══ MARQUEE: Continuous crawl ═══ */
            const crawl1 = gsap.to(marqueeRow1Ref.current, {
                xPercent: -50,
                duration: 120, // Base crawl
                ease: 'none',
                repeat: -1,
            });
            const crawl2 = gsap.fromTo(marqueeRow2Ref.current, {
                xPercent: -50,
            }, {
                xPercent: 0,
                duration: 120,
                ease: 'none',
                repeat: -1,
            });

            /* ═══ Scroll Indicator Pulsing ═══ */
            gsap.to(scrollIndicatorRef.current, {
                opacity: 0.8,
                duration: 1.5,
                yoyo: true,
                repeat: -1,
                ease: "sine.inOut"
            });

            /* ═══ MARQUEE: Velocity-sync via ScrollTrigger (Flywheel) ═══ */
            ScrollTrigger.create({
                trigger: containerRef.current,
                start: 'top top',
                end: '+=500%',
                onUpdate: (self) => {
                    const velocity = Math.abs(self.getVelocity()) / 1000;
                    const newSpeed = Math.max(1, 1 + velocity * 3);
                    gsap.to([crawl1, crawl2], {
                        timeScale: newSpeed,
                        duration: 2.5,
                        ease: 'power3.out',
                        overwrite: true,
                    });
                },
            });

            const tl = gsap.timeline({
                scrollTrigger: {
                    trigger: containerRef.current,
                    start: "top top",
                    end: "+=500%",
                    scrub: 1.5,
                    pin: true,
                    anticipatePin: 1,
                },
            });

            /* Background text parallax */
            tl.to(textRef.current, {
                y: "-15vh",
                ease: "none",
                duration: 3.5,
            }, 0);

            const INACTIVE_FILTER = "blur(15px) brightness(0.4)";
            const INACTIVE_OPACITY = 0.05;
            const ENTER_EASE = "power4.out";
            const LEAVE_EASE = "expo.out";

            /* ═══ STEP 01 ═══ */
            tl.fromTo(".deck-card-0", {
                y: "50vh", opacity: 0,
                rotation: 10, scale: 0.8,
            }, {
                y: "0", opacity: 1,
                rotation: cards[0].landRotation, scale: 1.1,
                duration: 0.8, ease: ENTER_EASE,
            }, 0.1);

            tl.fromTo(".deck-caption-0", {
                clipPath: "inset(0 100% 0 0)", opacity: 0,
            }, {
                clipPath: "inset(0 0% 0 0)", opacity: 1,
                duration: 0.4, ease: "steps(10)",
            }, 0.3);

            /* ═══ STEP 02 ═══ */
            const step2Start = 1.2;
            tl.to(".deck-card-0", {
                x: inactiveSlots[0].x, y: inactiveSlots[0].y,
                scale: inactiveSlots[0].scale, rotation: inactiveSlots[0].rotation,
                opacity: INACTIVE_OPACITY, filter: INACTIVE_FILTER,
                duration: 0.8, ease: LEAVE_EASE,
            }, step2Start);
            tl.to(".deck-caption-0", { opacity: 0, duration: 0.2 }, step2Start);

            tl.fromTo(".deck-card-1", {
                y: "50vh", opacity: 0,
                rotation: -10, scale: 0.8,
            }, {
                y: "0", opacity: 1,
                rotation: cards[1].landRotation, scale: 1.1,
                duration: 0.8, ease: ENTER_EASE,
            }, step2Start + 0.15);

            tl.fromTo(".deck-caption-1", {
                clipPath: "inset(0 100% 0 0)", opacity: 0,
            }, {
                clipPath: "inset(0 0% 0 0)", opacity: 1,
                duration: 0.4, ease: "steps(10)",
            }, step2Start + 0.3);

            /* ═══ STEP 03 ═══ */
            const step3Start = 2.2;
            tl.to(".deck-card-0", {
                x: inactiveSlots[1].x, y: inactiveSlots[1].y,
                scale: inactiveSlots[1].scale, rotation: inactiveSlots[1].rotation,
                duration: 0.8, ease: LEAVE_EASE,
            }, step3Start);
            tl.to(".deck-card-1", {
                x: inactiveSlots[0].x, y: inactiveSlots[0].y,
                scale: inactiveSlots[0].scale, rotation: inactiveSlots[0].rotation,
                opacity: INACTIVE_OPACITY, filter: INACTIVE_FILTER,
                duration: 0.8, ease: LEAVE_EASE,
            }, step3Start);
            tl.to(".deck-caption-1", { opacity: 0, duration: 0.2 }, step3Start);

            tl.fromTo(".deck-card-2", {
                y: "50vh", opacity: 0,
                rotation: 12, scale: 0.8,
            }, {
                y: "0", opacity: 1,
                rotation: cards[2].landRotation, scale: 1.1,
                duration: 0.8, ease: ENTER_EASE,
            }, step3Start + 0.15);

            tl.fromTo(".deck-caption-2", {
                clipPath: "inset(0 100% 0 0)", opacity: 0,
            }, {
                clipPath: "inset(0 0% 0 0)", opacity: 1,
                duration: 0.4, ease: "steps(10)",
            }, step3Start + 0.3);

            /* ═══ STEP 04 ═══ */
            const step4Start = 3.2;
            tl.to(".deck-card-0", {
                x: inactiveSlots[2].x, y: inactiveSlots[2].y,
                scale: inactiveSlots[2].scale, rotation: inactiveSlots[2].rotation,
                duration: 0.8, ease: LEAVE_EASE,
            }, step4Start);
            tl.to(".deck-card-1", {
                x: inactiveSlots[1].x, y: inactiveSlots[1].y,
                scale: inactiveSlots[1].scale, rotation: inactiveSlots[1].rotation,
                duration: 0.8, ease: LEAVE_EASE,
            }, step4Start);
            tl.to(".deck-card-2", {
                x: inactiveSlots[0].x, y: inactiveSlots[0].y,
                scale: inactiveSlots[0].scale, rotation: inactiveSlots[0].rotation,
                opacity: INACTIVE_OPACITY, filter: INACTIVE_FILTER,
                duration: 0.8, ease: LEAVE_EASE,
            }, step4Start);
            tl.to(".deck-caption-2", { opacity: 0, duration: 0.2 }, step4Start);

            tl.fromTo(".deck-card-3", {
                y: "50vh", opacity: 0,
                rotation: -8, scale: 0.8,
            }, {
                y: "0", opacity: 1,
                rotation: cards[3].landRotation, scale: 1.1,
                duration: 0.8, ease: ENTER_EASE,
            }, step4Start + 0.15);

            tl.fromTo(".deck-caption-3", {
                clipPath: "inset(0 100% 0 0)", opacity: 0,
            }, {
                clipPath: "inset(0 0% 0 0)", opacity: 1,
                duration: 0.4, ease: "steps(10)",
            }, step4Start + 0.3);

            /* ═══ EXIT ═══ */
            const exitStart = 4.2;
            [0, 1, 2, 3].forEach(i => {
                tl.to(`.deck-card-${i}`, { opacity: 0, duration: 0.4, ease: LEAVE_EASE }, exitStart);
            });
            tl.to(".deck-caption-3", { opacity: 0, duration: 0.3 }, exitStart);
            tl.to(textRef.current, { opacity: 0, duration: 0.4 }, exitStart);
            tl.to(".marquee-row", { opacity: 0, duration: 0.4 }, exitStart);
            tl.to(".scroll-indicator", { opacity: 0, duration: 0.3 }, exitStart);
        });

        mm.add("(max-width: 767px)", () => {
            // Mobile: Simple fade-in for cards, no pinning
            cards.forEach((_, i) => {
                gsap.fromTo(`.deck-card-${i}`, {
                    opacity: 0, y: 50
                }, {
                    opacity: 1, y: 0,
                    scrollTrigger: {
                        trigger: `.deck-card-${i}`,
                        start: "top 80%",
                        end: "top 20%",
                        toggleActions: "play none none reverse"
                    }
                });
            });
            
            // Hide pinning elements on mobile
            gsap.set([".marquee-row", ".scroll-indicator"], { display: 'none' });
        });

        return () => mm.revert();

    }, { scope: containerRef });

    return (
        <section
            ref={containerRef}
            className="relative w-full h-screen overflow-hidden bg-[#050505] flex items-center justify-center mb-[-100vh]"
            style={{
                /* BOTTOM LAYER: Black background with grid */
                backgroundImage: 'radial-gradient(rgba(204,255,0,0.1) 1px, transparent 1px)',
                backgroundSize: '24px 24px',
            }}
        >
            {/* MIDDLE LAYER 1: VENDORFLOW Ghost Marquee */}
            <div
                className="absolute inset-0 z-[2] pointer-events-none overflow-hidden flex flex-col items-start justify-center"
                style={{
                    /* Masking: Radial gradient so text is sharp in center but invisible at edges */
                    WebkitMaskImage: 'radial-gradient(ellipse 60% 50% at center, black 30%, transparent 80%)',
                    maskImage: 'radial-gradient(ellipse 60% 50% at center, black 30%, transparent 80%)'
                }}
            >
                {/* Positioned vertically in center (approx directly behind cards) */}
                <div
                    ref={marqueeRow1Ref}
                    className="marquee-row pointer-events-none select-none whitespace-nowrap will-change-transform mix-blend-overlay"
                >
                    {Array.from({ length: 8 }).map((_, i) => (
                        <span
                            key={i}
                            className="uppercase text-[12vw]"
                            style={{
                                fontFamily: "'Syne', sans-serif",
                                fontWeight: 800,
                                letterSpacing: '-0.05em',
                                marginRight: '10vw',
                                display: 'inline-block',
                                /* Alternating [Solid] - [Outline] - [Solid] */
                                ...(i % 2 !== 0
                                    ? { color: 'rgba(255, 255, 255, 0.04)', WebkitTextStroke: '1px rgba(204, 255, 0, 0.15)' }
                                    : { color: 'rgba(255, 255, 255, 0.08)', WebkitTextStroke: 'none' }
                                )
                            }}
                        >
                            VENDORFLOW
                        </span>
                    ))}
                </div>
                <div
                    ref={marqueeRow2Ref}
                    className="marquee-row pointer-events-none select-none whitespace-nowrap will-change-transform mix-blend-overlay"
                >
                    {Array.from({ length: 8 }).map((_, i) => (
                        <span
                            key={i}
                            className="uppercase text-[12vw]"
                            style={{
                                fontFamily: "'Syne', sans-serif",
                                fontWeight: 800,
                                letterSpacing: '-0.05em',
                                marginRight: '10vw',
                                display: 'inline-block',
                                /* Alternating [Solid] - [Outline] - [Solid] for row 2 (offset) */
                                ...(i % 2 === 0
                                    ? { color: 'rgba(255, 255, 255, 0.04)', WebkitTextStroke: '1px rgba(204, 255, 0, 0.15)' }
                                    : { color: 'rgba(255, 255, 255, 0.08)', WebkitTextStroke: 'none' }
                                )
                            }}
                        >
                            VENDORFLOW
                        </span>
                    ))}
                </div>
            </div>

            {/* BOTTOM LAYER 2: COMMERCE ENGINE Vertical Parallax Background */}
            <div
                ref={textRef}
                className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-[1] select-none will-change-transform mix-blend-overlay"
            >
                <div className="flex translate-x-[-2vw]">
                    <span
                        className="font-heading font-black text-[15vw] leading-[0.85] uppercase tracking-tighter"
                        style={{ color: 'transparent', WebkitTextStroke: '1px rgba(255, 255, 255, 0.03)' }}
                    >
                        COMMERCE
                    </span>
                </div>
                <div className="flex translate-x-[4vw]">
                    <span
                        className="font-heading font-black text-[15vw] leading-[0.85] uppercase tracking-tighter"
                        style={{ color: 'transparent', WebkitTextStroke: '1px rgba(255, 255, 255, 0.03)' }}
                    >
                        ENGINE
                    </span>
                </div>
            </div>

            {/* TOP LAYER: Active Dashboard Windows */}
            <div className="absolute inset-0 z-[3] flex items-center justify-center">
                {cards.map((card, i) => (
                    <div
                        key={i}
                        className={`deck-card-${i} absolute flex items-center gap-6 md:gap-10 transform-gpu will-change-transform`}
                        style={{ opacity: 0 }}
                    >
                        {/* Browser Window active scale handled by GSAP (1.1x) */}
                        <div className="w-[85vw] sm:w-[65vw] md:w-[50vw] lg:w-[45vw] max-w-[780px] aspect-[16/10] rounded-xl sm:rounded-2xl overflow-hidden border border-white/[0.06] bg-[#0a0a0a] shadow-[0_0_80px_rgba(204,255,0,0.1),_0_60px_120px_rgba(0,0,0,1)]">
                            {/* Browser Chrome */}
                            <div className="w-full h-7 sm:h-9 bg-[#0e0e0e] border-b border-white/[0.04] flex items-center px-3 sm:px-4 gap-[6px]">
                                <div className="w-[7px] h-[7px] rounded-full bg-[#ccff00]/30"></div>
                                <div className="w-[7px] h-[7px] rounded-full bg-[#ccff00]/60"></div>
                                <div className="w-[7px] h-[7px] rounded-full bg-[#ccff00]"></div>
                                <div className="flex-1 mx-3">
                                    <div className="bg-white/[0.04] rounded-md h-4 sm:h-5 max-w-[160px] flex items-center px-2">
                                        <span className="text-[8px] sm:text-[9px] text-white/20 tracking-widest truncate" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                                            {card.browserTitle}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Image Content */}
                            <div className="w-full h-[calc(100%-1.75rem)] sm:h-[calc(100%-2.25rem)] relative bg-[#080808]">
                                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20 z-10 pointer-events-none"></div>
                                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#ccff00]/20 to-transparent z-10"></div>
                                <img
                                    src={card.src}
                                    alt={card.alt}
                                    loading="lazy"
                                    className="w-full h-full object-cover filter contrast-[1.1] brightness-[0.88] saturate-[0.9]"
                                />
                            </div>
                        </div>

                        {/* Caption Block — HUD style, glitches in */}
                        <div
                            className={`deck-caption-${i} hidden md:flex flex-col gap-3 max-w-[220px] lg:max-w-[260px] text-white`}
                        >
                            {/* Step Label with Blinking HUD dot */}
                            <div className="flex items-center gap-2">
                                <div className="w-[6px] h-[6px] rounded-full bg-[#ccff00] animate-pulse shadow-[0_0_8px_#ccff00]"></div>
                                <div className="w-4 h-[1px] bg-[#ccff00]/50"></div>
                                <span className="text-[11px] sm:text-xs font-semibold text-[#ccff00] tracking-[0.2em] uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                                    {card.step}
                                </span>
                            </div>

                            {/* Title */}
                            <h3 className="text-lg lg:text-xl font-bold text-white/90 tracking-tight leading-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                                {card.title}
                            </h3>

                            {/* Description */}
                            <p className="text-[12px] text-white/40 leading-relaxed tracking-wide filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                                {card.description}
                            </p>

                            {/* Fake Technical HUD Data */}
                            <div className="pt-2">
                                <span className="text-[10px] text-[#ccff00]/60 uppercase tracking-widest whitespace-nowrap" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                                    LATENCY: 14ms | LOAD: OPTIMAL | SEQ_00{i + 1}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Scroll Indicator */}
            <div
                ref={scrollIndicatorRef}
                className="scroll-indicator absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 opacity-40"
            >
                <p className="text-[9px] uppercase tracking-[0.4em] text-white/40" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    Scroll to navigate
                </p>
                <div className="w-[1px] h-6 bg-gradient-to-b from-[#ccff00]/60 to-transparent"></div>
            </div>

            {/* Disclaimer */}
            <p
                className="absolute bottom-3 right-4 z-20 text-[9px] text-white/30 max-w-[360px] text-right"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
                Disclaimer: The images used here are for illustrative purposes only and may not reflect the actual system.
            </p>
        </section>
    );
}

export default FloatingCollage;
