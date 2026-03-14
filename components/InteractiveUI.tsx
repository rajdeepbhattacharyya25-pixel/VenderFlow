import React, { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform, useInView, animate } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';

export const MagneticButton = ({ children, className = "", onClick }: { children: React.ReactNode, className?: string, onClick?: () => void }) => {
    const ref = useRef<HTMLButtonElement>(null);
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    const springConfig = { damping: 15, stiffness: 150 };
    const x = useSpring(mouseX, springConfig);
    const y = useSpring(mouseY, springConfig);

    const handleMouseMove = (e: React.MouseEvent) => {
        const rect = ref.current?.getBoundingClientRect();
        if (rect) {
            const distanceX = e.clientX - (rect.left + rect.width / 2);
            const distanceY = e.clientY - (rect.top + rect.height / 2);
            // Magnetic pull limit
            mouseX.set(distanceX * 0.4);
            mouseY.set(distanceY * 0.4);
        }
    };

    const resetPosition = () => {
        mouseX.set(0);
        mouseY.set(0);
    };

    return (
        <motion.button
            ref={ref}
            onMouseMove={handleMouseMove}
            onMouseLeave={resetPosition}
            onClick={onClick}
            style={{ x, y }}
            whileTap={{ scale: 0.95 }}
            className={`relative h-14 sm:h-16 px-6 sm:px-8 flex items-center justify-center bg-[#CCFF00] text-black font-black text-sm sm:text-base uppercase tracking-wider border-0 transition-shadow duration-300 hover:shadow-[0_0_30px_rgba(204,255,0,0.4)] touch-manipulation cursor-pointer overflow-hidden ${className}`}
        >
            <span className="relative z-10 flex items-center gap-2">
                {children}
            </span>
            {/* High-contrast neon orange glow on active/hover */}
            <motion.div
                className="absolute inset-0 bg-[#FF4D00] opacity-0 hover:opacity-100 transition-opacity pointer-events-none duration-300"
                initial={false}
            />
        </motion.button>
    );
};

export const GlassFeatureCard = ({ title, subtitle, icon: Icon, className = "" }: { title: React.ReactNode, subtitle: React.ReactNode, icon: any, className?: string }) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <motion.div
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={`relative w-full bg-[#0a0a0a] border border-white/10 p-8 sm:p-12 flex flex-col justify-end overflow-hidden group cursor-pointer transition-colors ${className}`}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
        >
            {/* Animated Glowing Border - Acid Green */}
            <motion.div
                className="absolute inset-0 border border-[#CCFF00] z-20 pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: isHovered ? 1 : 0 }}
                transition={{ duration: 0.2 }}
            />

            {/* Glassmorphic Background Layer */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#ccff00]/5 to-transparent backdrop-blur-sm z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            {/* Floating Sub-Elements Reveal */}
            <motion.div
                className="absolute top-8 right-8 z-10"
                initial={{ y: 20, opacity: 0, scale: 0.8 }}
                animate={{
                    y: isHovered ? 0 : 20,
                    opacity: isHovered ? 1 : 0,
                    scale: isHovered ? 1 : 0.8
                }}
                transition={{ duration: 0.3 }}
            >
                <div className="bg-[#ccff00] text-black text-[10px] font-black px-2 py-1 uppercase tracking-widest hidden sm:block">
                    SYSTEM_LIVE
                </div>
            </motion.div>

            {/* Main Content */}
            <div className="relative z-10">
                <div className="text-[#CCFF00] mb-8">
                    <Icon size={40} className="group-hover:text-white transition-colors duration-300" strokeWidth={1.5} />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold font-heading uppercase tracking-wide mb-4">
                    {title}
                </h3>
                <p className="text-white/50 leading-relaxed text-sm sm:text-base">
                    {subtitle}
                </p>
            </div>

            {/* Background Parallax Icon */}
            <motion.div
                className="absolute -bottom-10 -right-10 text-white/5 z-0"
                initial={{ rotate: 0, scale: 1 }}
                animate={{
                    rotate: isHovered ? -12 : 0,
                    scale: isHovered ? 1.4 : 1
                }}
                transition={{ duration: 0.6 }}
            >
                <Icon size={200} strokeWidth={1} />
            </motion.div>
        </motion.div>
    );
};

export const StatCard = ({ value, label, prefix = "", suffix = "", sublabel = "", icon: Icon, className = "" }: { value: number, label: string, prefix?: string, suffix?: string, sublabel?: string, icon?: any, className?: string }) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const isInView = useInView(cardRef, { once: true, margin: "-100px" });

    // Count-up logic
    const count = useMotionValue(0);
    const rounded = useTransform(count, (latest) => Math.round(latest * 10) / 10);
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        if (isInView) {
            const controls = animate(count, value, { duration: 2, ease: "easeOut" });
            return controls.stop;
        }
    }, [isInView, value, count]);

    useEffect(() => {
        return rounded.onChange((v) => setDisplayValue(v));
    }, [rounded]);

    // 3D Tilt Logic
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const rotateX = useTransform(y, [-100, 100], [10, -10]);
    const rotateY = useTransform(x, [-100, 100], [-10, 10]);

    const handleMouse = (e: React.MouseEvent) => {
        const rect = cardRef.current?.getBoundingClientRect();
        if (rect) {
            x.set(e.clientX - (rect.left + rect.width / 2));
            y.set(e.clientY - (rect.top + rect.height / 2));
        }
    };

    return (
        <motion.div
            ref={cardRef}
            onMouseMove={handleMouse}
            onMouseLeave={() => { x.set(0); y.set(0); }}
            style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
            className={`relative bg-[#111] border border-white/10 p-4 shadow-xl shadow-black/50 group cursor-crosshair transition-colors hover:border-[#ccff00]/50 ${className}`}
        >
            <motion.div
                style={{ translateZ: 50 }}
                className="relative z-10 w-full text-left"
            >
                <div className="flex items-center gap-3 mb-2">
                    {Icon && <Icon className="w-5 h-5 text-[#ccff00]" />}
                    <span className="text-xs uppercase text-white/60 tracking-wider">{label}</span>
                </div>
                <div className="text-2xl sm:text-4xl font-heading font-bold text-white tracking-tighter">
                    {prefix}{displayValue}{suffix}
                </div>
                {sublabel && (
                    <div className="text-xs text-[#00ff88] mt-1">{sublabel}</div>
                )}
            </motion.div>

            {/* Hover Animated Glow */}
            <motion.div
                className="absolute inset-0 bg-[#CCFF00]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
            />
            {/* Animated background accent */}
            <motion.div
                className="absolute bottom-0 left-0 h-[2px] bg-[#CCFF00]"
                initial={{ width: 0 }}
                animate={{ width: isInView ? "100%" : 0 }}
                transition={{ duration: 1.5, ease: "circOut" }}
            />
        </motion.div>
    );
};

export const MagneticLogo = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });

    const handleMouse = (e: React.MouseEvent<HTMLDivElement>) => {
        const { clientX, clientY } = e;
        const rect = ref.current?.getBoundingClientRect();
        if (rect) {
            const middleX = clientX - (rect.left + rect.width / 2);
            const middleY = clientY - (rect.top + rect.height / 2);
            setPosition({ x: middleX * 0.15, y: middleY * 0.15 });
        }
    };

    const reset = () => {
        setPosition({ x: 0, y: 0 });
    };

    const { x, y } = position;

    return (
        <motion.div
            style={{ position: "relative" }}
            ref={ref}
            onMouseMove={handleMouse}
            onMouseLeave={reset}
            animate={{ x, y }}
            transition={{ type: "spring", stiffness: 350, damping: 5, mass: 0.5 }}
            className={`cursor-pointer ${className}`}
        >
            <motion.div
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
                {children}
            </motion.div>
        </motion.div>
    );
};
