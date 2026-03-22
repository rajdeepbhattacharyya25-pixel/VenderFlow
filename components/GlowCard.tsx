import React, { useRef, useState } from 'react';
import { m } from 'framer-motion';

import './styles/GlowCard.css';

interface GlowCardProps {
    children: React.ReactNode;
    className?: string;
    glowColor?: string;
}

export function GlowCard({
    children,
    className = '',
    glowColor = 'rgba(16, 185, 129, 0.15)', // Default to emerald glow
}: GlowCardProps) {
    const cardRef = useRef<HTMLDivElement>(null);
    const rectRef = useRef<DOMRect | null>(null);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const [isHovered, setIsHovered] = useState(false);

    const handleMouseEnter = () => {
        setIsHovered(true);
        if (cardRef.current) {
            rectRef.current = cardRef.current.getBoundingClientRect();
        }
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!rectRef.current) {
            if (cardRef.current) rectRef.current = cardRef.current.getBoundingClientRect();
            else return;
        }

        const rect = rectRef.current;
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        setMousePosition({ x, y });
    };

    return (
        <m.div
            ref={cardRef}
            onMouseMove={handleMouseMove}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={() => { setIsHovered(false); rectRef.current = null; }}
            whileHover={{ y: -8, transition: { duration: 0.2 } }}
            style={{
                '--glow-x': `${mousePosition.x}px`,
                '--glow-y': `${mousePosition.y}px`,
                '--glow-opacity': isHovered ? 1 : 0,
                '--glow-color': glowColor,
            } as React.CSSProperties}
            className={`glow-card-container relative overflow-hidden rounded-xl bg-[#f2f0ec] dark:bg-neutral-900 border border-transparent dark:border-neutral-800 transition-colors duration-300 ${className}`}
        >
            {/* Dynamic Glow Spotlight */}
            <div
                className="glow-card-effect pointer-events-none absolute -inset-px transition-opacity duration-300"
            />

            {/* Content wrapper with a subtle background to let the border glow show if we changed inset */}
            <div className="relative z-10 h-full w-full p-6 md:p-8">
                {children}
            </div>
        </m.div>
    );
}
