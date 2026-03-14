import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './CustomCursor.css';

export const CustomCursor = () => {
    const cursorRef = useRef<HTMLDivElement>(null);
    const mousePos = useRef({ x: -100, y: -100 });
    const delayedPos = useRef({ x: -100, y: -100 });
    const rafId = useRef<number | null>(null);

    const [isHovering, setIsHovering] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const [isTouchDevice, setIsTouchDevice] = useState(false);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isVisible) setIsVisible(true);
        mousePos.current = { x: e.clientX, y: e.clientY };
    }, [isVisible]);

    const handleMouseOver = useCallback((e: MouseEvent) => {
        const target = e.target as HTMLElement;
        const pointerTarget = target?.closest?.('a, button, input, textarea, select, [role="button"], .cursor-pointer');
        setIsHovering(!!pointerTarget);
    }, []);

    useEffect(() => {
        // More robust detection for touch-only devices
        const checkPointer = () => {
            const hasFinePointer = window.matchMedia('(pointer: fine)').matches;
            const hasMouse = window.matchMedia('(hover: hover)').matches;
            setIsTouchDevice(!hasFinePointer || !hasMouse);
        };

        checkPointer();
        
        // Listen for changes (e.g., hybrid devices or DevTools simulation)
        const mediaQuery = window.matchMedia('(pointer: fine)');
        const handleChange = () => checkPointer();
        
        try {
            mediaQuery.addEventListener('change', handleChange);
        } catch (e) {
            // Fallback for older browsers
            mediaQuery.addListener(handleChange);
        }

        if (isTouchDevice) return;

        window.addEventListener('mousemove', handleMouseMove, { passive: true });
        window.addEventListener('mouseover', handleMouseOver, { passive: true });

        const html = document.documentElement;
        html.classList.add('custom-cursor-active');

        // High-performance animation loop
        const animate = () => {
            const lerpFactor = 0.25;
            
            delayedPos.current.x += (mousePos.current.x - delayedPos.current.x) * lerpFactor;
            delayedPos.current.y += (mousePos.current.y - delayedPos.current.y) * lerpFactor;

            if (cursorRef.current) {
                cursorRef.current.style.setProperty('--cursor-x', `${delayedPos.current.x}px`);
                cursorRef.current.style.setProperty('--cursor-y', `${delayedPos.current.y}px`);
            }

            rafId.current = requestAnimationFrame(animate);
        };

        rafId.current = requestAnimationFrame(animate);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseover', handleMouseOver);
            try {
                mediaQuery.removeEventListener('change', handleChange);
            } catch (e) {
                mediaQuery.removeListener(handleChange);
            }
            html.classList.remove('custom-cursor-active');
            if (rafId.current) cancelAnimationFrame(rafId.current);
        };
    }, [isTouchDevice, handleMouseMove, handleMouseOver]);

    if (isTouchDevice) {
        // Clean up class if we're on touch
        document.documentElement.classList.remove('custom-cursor-active');
        return null;
    }

    return (
        <AnimatePresence>
            {isVisible && (
                <div
                    ref={cursorRef}
                    className="fixed top-0 left-0 pointer-events-none z-[99999] custom-cursor-container"
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ 
                            opacity: 1, 
                            scale: isHovering ? 1.2 : 1,
                            rotate: isHovering ? -15 : 0
                        }}
                        exit={{ opacity: 0, scale: 0 }}
                        transition={{
                            type: 'spring',
                            damping: 25,
                            stiffness: 300,
                        }}
                        className="custom-cursor-motion-wrapper"
                    >
                        <svg
                            width="32"
                            height="32"
                            viewBox="0 0 32 32"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="custom-cursor-svg"
                        >
                            <defs>
                                <linearGradient id="cursorGradient" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                                    <stop stopColor="#e0ff1a" />
                                    <stop offset="0.6" stopColor="#ccff00" />
                                    <stop offset="1" stopColor="#b3ff00" />
                                </linearGradient>
                            </defs>

                            <path
                                d="M 5,2 C 4.5,2 4,2.5 4,3 L 4,24 C 4,24.8 4.8,25.2 5.5,24.5 L 12,18 L 19.5,18 C 20.2,18 20.6,17.2 20,16.5 L 6,2.5 C 5.8,2.2 5.4,2 5,2 Z"
                                fill="url(#cursorGradient)"
                                stroke="#ffffff"
                                strokeWidth="1.5"
                                strokeLinejoin="round"
                                strokeLinecap="round"
                            />
                        </svg>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

