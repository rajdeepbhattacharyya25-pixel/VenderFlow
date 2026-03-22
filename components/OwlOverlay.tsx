import React, { useEffect, useRef, useState } from 'react';
import styles from './OwlOverlay.module.css';

interface OwlOverlayProps {
    targetSelector?: string;
    maxPupilOffset?: number;
    isError?: boolean;
    palette?: {
        body: string;
        accent: string;
    };
}

export const OwlOverlay: React.FC<OwlOverlayProps> = ({
    targetSelector = '.login-panel',
    maxPupilOffset = 8,
    isError = false,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const [isCoveringEyes, setIsCoveringEyes] = useState(false);
    const [isBlinking, setIsBlinking] = useState(false);

    // Random blink logic
    useEffect(() => {
        let timeoutId: number;

        const scheduleBlink = () => {
            // Don't blink while covering eyes
            if (isCoveringEyes) {
                timeoutId = window.setTimeout(scheduleBlink, 1000);
                return;
            }

            const baseTime = 4000;
            const jitter = Math.random() * 3000;
            const nextBlink = baseTime + jitter;

            timeoutId = window.setTimeout(() => {
                setIsBlinking(true);
                // Reset blink after 200ms
                setTimeout(() => setIsBlinking(false), 200);

                // Schedule next blink
                scheduleBlink();
            }, nextBlink);
        };

        scheduleBlink();

        return () => {
            clearTimeout(timeoutId);
        };
    }, [isCoveringEyes]);

    // Track cursor for pupils
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        if (mediaQuery.matches) return; // Disable on reduced motion

        let rafId: number;
        let mouseX = 0;
        let mouseY = 0;
        let isTracking = false;

        const updatePupils = () => {
            if (!svgRef.current || isCoveringEyes) return;

            const eyes = svgRef.current.querySelectorAll(`.${styles.pupil}`) as NodeListOf<SVGGElement>;
            if (eyes.length === 0) return;

            // Find center of the SVG relative to viewport to calculate pupil translation
            const rect = svgRef.current.getBoundingClientRect();
            const svgCenterX = rect.left + rect.width / 2;
            const svgCenterY = rect.top + rect.height / 2;

            // Calculate vector from SVG center to cursor
            const deltaX = mouseX - svgCenterX;
            const deltaY = mouseY - svgCenterY;

            // Normalize vector
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            let translateAmountX = 0;
            let translateAmountY = 0;

            if (distance > 0) {
                // Scale factor that increases until maxPupilOffset but tapers off for long distances gently
                const factor = Math.min(distance / 500, 1);
                translateAmountX = (deltaX / distance) * maxPupilOffset * factor;
                translateAmountY = (deltaY / distance) * maxPupilOffset * factor;
            }

            eyes.forEach(eye => {
                eye.style.transform = `translate(${translateAmountX}px, ${translateAmountY}px)`;
            });

            isTracking = false;
        };

        const handlePointerMove = (e: MouseEvent | TouchEvent) => {
            if ('touches' in e) {
                if (e.touches.length > 0) {
                    mouseX = e.touches[0].clientX;
                    mouseY = e.touches[0].clientY;
                }
            } else {
                mouseX = (e as MouseEvent).clientX;
                mouseY = (e as MouseEvent).clientY;
            }

            if (!isTracking) {
                isTracking = true;
                rafId = requestAnimationFrame(updatePupils);
            }
        };

        window.addEventListener('mousemove', handlePointerMove, { passive: true });
        window.addEventListener('touchmove', handlePointerMove, { passive: true });
        window.addEventListener('touchstart', handlePointerMove, { passive: true });

        // Initial reset
        const resetPupils = () => {
            if (!svgRef.current) return;
            const eyes = svgRef.current.querySelectorAll(`.${styles.pupil}`) as NodeListOf<SVGGElement>;
            eyes.forEach((eye) => {
                eye.style.transform = 'translate(0px, 0px)';
            });
        };

        if (isCoveringEyes) {
            resetPupils();
        }

        return () => {
            window.removeEventListener('mousemove', handlePointerMove);
            window.removeEventListener('touchmove', handlePointerMove);
            window.removeEventListener('touchstart', handlePointerMove);
            cancelAnimationFrame(rafId);
        };
    }, [maxPupilOffset, isCoveringEyes]);

    // Password field tracking logic
    useEffect(() => {
        const handleFocusChange = () => {
            const activeElement = document.activeElement as HTMLInputElement;
            const isPassword = activeElement?.type === 'password' && activeElement.closest(targetSelector);
            
            if (isPassword) {
                setIsCoveringEyes(true);
            } else {
                // Small delay to prevent flickering during focus transitions
                setTimeout(() => {
                    const currentActive = document.activeElement as HTMLInputElement;
                    const stillPassword = currentActive?.type === 'password' && currentActive.closest(targetSelector);
                    if (!stillPassword) {
                        setIsCoveringEyes(false);
                    }
                }, 100);
            }
        };

        // Listen for both focus and input to handle all ways the field can be interacted with
        document.addEventListener('focusin', handleFocusChange);
        document.addEventListener('focusout', handleFocusChange);
        
        // Initial check
        handleFocusChange();

        return () => {
            document.removeEventListener('focusin', handleFocusChange);
            document.removeEventListener('focusout', handleFocusChange);
        };
    }, [targetSelector]);

    return (
        <div
            className={styles.owlOverlayContainer}
            ref={containerRef}
        >
            <svg
                ref={svgRef}
                viewBox="0 0 200 200"
                className={`${styles.owlOverlaySvg} ${isCoveringEyes ? styles.isCoveringEyes : ''} ${isError ? styles.isError : ''}`}
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
            >
                <defs>
                    <clipPath id="left-eye-clip">
                        <circle cx="68" cy="85" r="26" />
                    </clipPath>
                    <clipPath id="right-eye-clip">
                        <circle cx="132" cy="85" r="26" />
                    </clipPath>
                </defs>

                {/* Dark Base Body - Plump, cute oval/pear shape */}
                <path d="M 100 190 
                         C 20 190, 10 120, 20 80
                         C 30 30, 60 25, 100 25
                         C 140 25, 170 30, 180 80
                         C 190 120, 180 190, 100 190 Z"
                    fill="#4A3F56" />

                {/* Light Heart-shaped Face Mask (Barn Owl Style) */}
                <path d="M 100 135
                         C 40 165, 15 110, 25 70
                         C 30 50, 50 40, 70 45
                         C 85 50, 95 65, 100 65
                         C 105 65, 115 50, 130 45
                         C 150 40, 170 50, 175 70
                         C 185 110, 160 165, 100 135 Z"
                    fill="#736485" />

                {/* Cute Rosy Blush */}
                <ellipse cx="55" cy="115" rx="14" ry="7" fill="#FFA6B5" opacity="0.35" transform="rotate(-15 55 115)" />
                <ellipse cx="145" cy="115" rx="14" ry="7" fill="#FFA6B5" opacity="0.35" transform="rotate(15 145 115)" />

                {/* Belly Feathers (Cute little U scallop patterns) */}
                <g fill="none" stroke="#3D3347" strokeWidth="3" strokeLinecap="round">
                    <path d="M 85 145 Q 92.5 152 100 145" />
                    <path d="M 100 145 Q 107.5 152 115 145" />

                    <path d="M 75 160 Q 82.5 167 90 160" />
                    <path d="M 90 160 Q 97.5 167 105 160" />
                    <path d="M 105 160 Q 112.5 167 120 160" />
                </g>

                {/* Cute Little Paws */}
                <g fill="#3D3347">
                    <rect x="65" y="180" width="10" height="15" rx="5" />
                    <rect x="77" y="183" width="10" height="15" rx="5" />
                    <rect x="89" y="180" width="10" height="15" rx="5" />

                    <rect x="101" y="180" width="10" height="15" rx="5" />
                    <rect x="113" y="183" width="10" height="15" rx="5" />
                    <rect x="125" y="180" width="10" height="15" rx="5" />
                </g>

                {/* Soft Organic Ear Tufts */}
                <path d="M 23 25 C 40 55, 60 70, 95 65 C 65 50, 50 35, 23 25 Z" fill="#3D3347" />
                <path d="M 177 25 C 160 55, 140 70, 105 65 C 135 50, 150 35, 177 25 Z" fill="#3D3347" />

                {/* Huge Cute Eye Whites */}
                <circle cx="68" cy="85" r="26" fill="#FFFFFF" />
                <circle cx="132" cy="85" r="26" fill="#FFFFFF" />

                <g className={isBlinking ? styles.isBlinking : ''}>
                    {/* Dark Pupils with Anime-style Sparkles */}
                    <g clipPath="url(#left-eye-clip)">
                        <g className={styles.pupil}>
                            <circle cx="75" cy="88" r="15" fill="#15121A" />
                            {/* Primary large sparkle */}
                            <circle cx="79" cy="82" r="4.5" fill="#FFFFFF" />
                            {/* Secondary tiny sparkle */}
                            <circle cx="68" cy="94" r="2" fill="#FFFFFF" opacity="0.8" />
                        </g>
                    </g>
                    <g clipPath="url(#right-eye-clip)">
                        <g className={styles.pupil}>
                            <circle cx="125" cy="88" r="15" fill="#15121A" />
                            {/* Primary large sparkle */}
                            <circle cx="129" cy="82" r="4.5" fill="#FFFFFF" />
                            {/* Secondary tiny sparkle */}
                            <circle cx="118" cy="94" r="2" fill="#FFFFFF" opacity="0.8" />
                        </g>
                    </g>

                    {/* Lowered Lazy Eyelids Layer Matching the Face Mask */}
                    <g className={styles.eyelid}>
                        <path d="M 39 80 Q 68 85, 96 76 Q 90 55, 68 55 Q 45 55, 39 80 Z" fill="#736485" stroke="#5C4F6B" strokeWidth="2" strokeLinejoin="round" />
                        <path d="M 161 80 Q 132 85, 104 76 Q 110 55, 132 55 Q 155 55, 161 80 Z" fill="#736485" stroke="#5C4F6B" strokeWidth="2" strokeLinejoin="round" />
                    </g>
                </g>

                {/* Tiny Cute Pastel Beak */}
                <path d="M 95 95 L 105 95 L 100 108 Z" fill="#FFB4A2" stroke="#E5989B" strokeWidth="2" strokeLinejoin="round" />

                {/* Inner Covering Wings (Animated) - Large Dark Swipes matching the body tone */}
                <g className={`${styles.wing} ${styles.wingLeft}`}>
                    <path d="M 125 55 C 60 5, -10 95, 25 185 C 60 195, 105 130, 125 55 Z" fill="#4A3F56" stroke="#2E2838" strokeWidth="3" strokeLinejoin="round" />
                    <path d="M 105 80 C 45 35, -25 120, 15 185 C 45 195, 90 145, 105 80 Z" fill="#3D3347" stroke="#2E2838" strokeWidth="3" strokeLinejoin="round" />
                </g>
                <g className={`${styles.wing} ${styles.wingRight}`}>
                    <path d="M 75 55 C 140 5, 210 95, 175 185 C 140 195, 95 130, 75 55 Z" fill="#4A3F56" stroke="#2E2838" strokeWidth="3" strokeLinejoin="round" />
                    <path d="M 95 80 C 155 35, 225 120, 185 185 C 155 195, 110 145, 95 80 Z" fill="#3D3347" stroke="#2E2838" strokeWidth="3" strokeLinejoin="round" />
                </g>
            </svg>
        </div>
    );
};
