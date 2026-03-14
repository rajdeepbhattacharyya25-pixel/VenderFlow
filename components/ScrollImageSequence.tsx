import React, { useEffect, useRef, useState, useMemo } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { ImagePreloader } from '@/lib/imagePreloader';

gsap.registerPlugin(ScrollTrigger);

interface ScrollImageSequenceProps {
    frameCount?: number;
    framePathPrefix?: string;
    framePathSuffix?: string;
    padLength?: number;
    sectionHeightFactor?: number; // Multiple of viewport height, e.g., 5 for 500vh
}

export const ScrollImageSequence: React.FC<ScrollImageSequenceProps> = ({
    frameCount = 192,
    framePathPrefix = '/frames/frame_',
    framePathSuffix = '.jpg',
    padLength = 4,
    sectionHeightFactor = 5,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const currentFrameRef = useRef(1);
    const [isInView, setIsInView] = useState(false);
    const [reducedMotion, setReducedMotion] = useState(false);

    // Initialize preloader
    const preloader = useMemo(() => new ImagePreloader({
        frameCount,
        framePathPrefix,
        framePathSuffix,
        padLength,
        initialBatchSize: 20,
        sparseSkip: 10
    }), [frameCount, framePathPrefix, framePathSuffix, padLength]);

    // Handle accessibility preference
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        setReducedMotion(mediaQuery.matches);

        const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
    }, []);

    // Intersection Observer
    useEffect(() => {
        if (!containerRef.current) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                setIsInView(entry.isIntersecting);
            },
            { threshold: 0 } // Trigger as soon as 1px is visible
        );

        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    // Initialize and load first frames
    useEffect(() => {
        let active = true;

        preloader.initialize().then(() => {
            // Draw first frame when ready
            if (active) {
                drawFrame(1);
            }
        });

        return () => { active = false; };
    }, [preloader]);

    // Scroll logic and Canvas drawing
    const drawFrame = (frameIndex: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Enhance image rendering quality
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        const img = preloader.getFrame(frameIndex);
        if (!img) return; // Wait until loaded

        // Handle high DPI scaling 
        const dpr = window.devicePixelRatio || 1;
        // We assume export images are 960x540. We can just use the canvas drawing size to match the CSS size.
        // However, to keep it crisp, set the internal canvas width/height to the physical pixels
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;

        if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            ctx.scale(dpr, dpr);
        }

        // Clear and draw image (Cover mapping)
        ctx.clearRect(0, 0, width, height);

        const imgScale = Math.max(width / img.width, height / img.height);
        const drawWidth = img.width * imgScale;
        const drawHeight = img.height * imgScale;
        const drawX = (width - drawWidth) / 2;
        const drawY = (height - drawHeight) / 2;

        ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
    };

    useEffect(() => {
        if (!isInView || reducedMotion) return;

        let rAF_ID: number;
        let lastScrollY = window.scrollY;

        const handleScroll = () => {
            if (!containerRef.current) return;

            const rect = containerRef.current.getBoundingClientRect();
            const rectTop = rect.top + window.scrollY;
            const rectBottom = rect.bottom + window.scrollY;

            const windowHeight = window.innerHeight;
            const scrollY = window.scrollY;

            // Ensure we are only calculating when the section is relevant
            if (scrollY + windowHeight >= rectTop && scrollY <= rectBottom) {
                // The sticky section itself takes 100vh. 
                // Active scrollable area is (container height) - 100vh.
                const scrollTravel = containerRef.current.offsetHeight - windowHeight;
                // How far have we scrolled past the top of the container
                const scrolledPast = Math.max(0, scrollY - rectTop);

                // Calculate progress from 0 to 1
                let progress = scrolledPast / scrollTravel;
                progress = Math.max(0, Math.min(1, progress));

                const frameIndex = Math.min(
                    frameCount,
                    Math.max(1, Math.floor(progress * frameCount) + 1)
                );

                if (frameIndex !== currentFrameRef.current) {
                    currentFrameRef.current = frameIndex;
                    drawFrame(frameIndex);
                    preloader.preloadProximity(frameIndex, 8);
                }
            }
        };

        const loop = () => {
            if (window.scrollY !== lastScrollY) {
                lastScrollY = window.scrollY;
                handleScroll();
            }
            rAF_ID = requestAnimationFrame(loop);
        };

        rAF_ID = requestAnimationFrame(loop);
        handleScroll(); // Initial check

        return () => cancelAnimationFrame(rAF_ID);
    }, [isInView, frameCount, reducedMotion, preloader]);

    // GSAP Scroll-triggered zoom/reveal & Light Blowout
    useGSAP(() => {
        if (!containerRef.current) return;

        const tl = gsap.timeline({
            scrollTrigger: {
                trigger: containerRef.current,
                start: "top bottom",
                end: "top top",
                scrub: 1,
            }
        });

        // 1. Scale from 0.8 to 1.0 (The "Cube Reveal")
        tl.fromTo(".sequence-inner-container",
            { scale: 0.8, opacity: 0 },
            { scale: 1.0, opacity: 1, ease: "none" }
        );


    }, { scope: containerRef });

    // Render
    return (
        <section
            ref={containerRef}
            className="relative w-full bg-black"
            style={{ height: `${sectionHeightFactor * 100}vh` }}
            aria-label="Slow motion explosion effect"
        >
            <div className="sequence-inner-container sticky top-0 left-0 w-full h-[100vh] overflow-hidden bg-black flex items-center justify-center transform-origin-center">

                {/* Image Sequence Output */}
                {reducedMotion ? (
                    <img
                        src={`${framePathPrefix}${'1'.padStart(padLength, '0')}${framePathSuffix}`}
                        alt="Explosion static view"
                        className="w-full h-full object-contain bg-black"
                    />
                ) : (
                    <canvas
                        ref={canvasRef}
                        className="w-full h-full max-w-full block"
                        aria-hidden="true"
                        style={{ width: '100vw', height: '100vh', display: 'block' }}
                    />
                )}



            </div>
        </section>
    );
};
