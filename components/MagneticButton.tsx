import React, { useRef, useState } from 'react';
import { m, useMotionValue, useSpring } from 'framer-motion';

import type { HTMLMotionProps } from 'framer-motion';

interface MagneticButtonProps extends HTMLMotionProps<"button"> {
    children: React.ReactNode;
    className?: string;
    pullStrength?: number; // How far the button pulls towards the cursor
}

export function MagneticButton({
    children,
    className = "",
    pullStrength = 15,
    ...props
}: MagneticButtonProps) {
    const ref = useRef<HTMLButtonElement>(null);
    const [isHovered, setIsHovered] = useState(false);

    // Motion values to track the offset
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    // Smooth out the movement with a spring
    const springConfig = { stiffness: 150, damping: 15, mass: 0.1 };
    const smoothX = useSpring(x, springConfig);
    const smoothY = useSpring(y, springConfig);

    const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
        if (!ref.current) return;

        // Get the button's position and dimensions
        const { left, top, width, height } = ref.current.getBoundingClientRect();

        // Calculate distance from center of the button
        const centerX = left + width / 2;
        const centerY = top + height / 2;

        const distanceX = e.clientX - centerX;
        const distanceY = e.clientY - centerY;

        // Apply the offset (scaled by pullStrength)
        x.set(distanceX * (pullStrength / 100));
        y.set(distanceY * (pullStrength / 100));
    };

    const handleMouseLeave = () => {
        setIsHovered(false);
        // Snap back to center
        x.set(0);
        y.set(0);
    };

    const handleMouseEnter = () => {
        setIsHovered(true);
    };

    return (
        <m.button
            ref={ref}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onMouseEnter={handleMouseEnter}
            style={{
                x: smoothX,
                y: smoothY,
            }}
            whileHover={{ scale: 1.05 }} // Still keep the slight scale up
            whileTap={{ scale: 0.95 }}
            // Merge pass-through framer-motion props logically or keep simple
            className={`relative inline-flex transition-colors duration-200 ${className}`}
            {...props}
        >
            {/* Optional: Add a subtle inner glow or highlight when hovered */}
            {isHovered && (
                <m.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 rounded-inherit pointer-events-none mix-blend-overlay"
                    style={{
                        background: 'radial-gradient(circle at center, rgba(255,255,255,0.2) 0%, transparent 70%)'
                    }}
                />
            )}

            {/* Content wrapper needed to keep text centered relative to the moving button */}
            <span className="relative z-10 w-full flex items-center justify-center">
                {children}
            </span>
        </m.button>
    );
}
