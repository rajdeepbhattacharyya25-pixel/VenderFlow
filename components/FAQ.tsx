import React, { useState, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, MotionValue } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Plus } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const FAQCard: React.FC<{ 
    question: string, 
    answer: string, 
    isOpen: boolean, 
    onClick: () => void, 
    index: number 
}> = ({ question, answer, isOpen, onClick, index }) => {
    const paddedIndex = (index + 1).toString().padStart(2, '0');
    const cardRef = useRef<HTMLDivElement>(null);
    const [isHovered, setIsHovered] = useState(false);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const rectRef = useRef<DOMRect | null>(null);

    const handleMouseEnter = () => {
        setIsHovered(true);
        if (cardRef.current) {
            rectRef.current = cardRef.current.getBoundingClientRect();
        }
    };

    const handleMouseLeave = () => {
        setIsHovered(false);
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!rectRef.current) return;
        const rect = rectRef.current;
        setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    };

    return (
        <motion.div
            layout
            ref={cardRef}
            onClick={onClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onMouseMove={handleMouseMove}
            className={`relative cursor-pointer rounded-3xl overflow-hidden transition-all duration-500 border group ${isOpen
                ? 'bg-[#111] text-white border-white/20'
                : 'bg-[#0a0a0a] border-white/10 text-white hover:border-white/20'
                }`}
            style={{ boxShadow: '0 4px 20px rgba(204, 255, 0, 0.08), 0 1px 6px rgba(0,0,0,0.5)' }}
        >
            {/* Animated Glowing Border - Acid Green */}
            <motion.div
                className="absolute inset-0 border border-[#CCFF00] z-20 pointer-events-none rounded-3xl"
                initial={{ opacity: 0 }}
                animate={{ opacity: isHovered && !isOpen ? 1 : 0 }}
                transition={{ duration: 0.2 }}
            />

            {/* Cursor-following lime green spotlight */}
            <div
                className="absolute inset-0 z-0 pointer-events-none transition-opacity duration-300 rounded-3xl"
                style={{
                    opacity: isHovered ? 1 : 0,
                    background: `radial-gradient(circle 280px at ${mousePos.x}px ${mousePos.y}px, rgba(204, 255, 0, 0.12), transparent 70%)`
                }}
            />

            {/* Glassmorphic Background Layer */}
            <div className={`absolute inset-0 bg-gradient-to-br from-[#ccff00]/5 to-transparent backdrop-blur-sm z-0 transition-opacity duration-300 pointer-events-none ${isHovered && !isOpen ? 'opacity-100' : 'opacity-0'}`} />

            <div className="relative z-10 w-full">
                <motion.div layout className="p-5 md:p-6 flex flex-row items-center justify-between gap-3 md:gap-4 w-full">
                    <div className="flex items-center gap-3 flex-1">
                        <span className={`text-sm font-bold font-heading opacity-40 shrink-0 ${isOpen ? 'text-[#ccff00]' : 'text-white/40'}`}>
                            {paddedIndex}
                        </span>
                        <motion.span layout className="font-bold text-base md:text-lg md:leading-snug text-white">
                            {question}
                        </motion.span>
                    </div>

                    <motion.div
                        animate={{ rotate: isOpen ? 45 : 0 }}
                        transition={{ duration: 0.3, ease: "backOut" }}
                        className="flex-shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center transition-colors bg-white/5 text-white/70 border border-white/10 hover:bg-white/10 hover:text-white"
                    >
                        <Plus className="w-4 h-4 md:w-5 md:h-5" />
                    </motion.div>
                </motion.div>

                <AnimatePresence initial={false}>
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                        >
                            <div className="px-5 md:px-6 pb-6 pt-0 ml-0 md:ml-8">
                                <motion.p
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.1, duration: 0.4 }}
                                    className="text-sm leading-relaxed max-w-3xl text-white/60"
                                >
                                    {answer}
                                </motion.p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
};

const FAQWord: React.FC<{ word: string, index: number, revealScroll: MotionValue<number> }> = ({ word, index, revealScroll }) => {
    const start = index * 0.02;
    const end = 0.04 + (index * 0.02);
    const revealAmount = useTransform(revealScroll, [start, end], [0, 100]);

    return (
        <div className="relative inline-block overflow-hidden py-1">
            <h2 className="text-[38px] sm:text-4xl md:text-5xl lg:text-6xl font-black text-white font-heading tracking-tighter leading-tight uppercase m-0">
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

export const FAQ: React.FC = () => {
    const [openIndex, setOpenIndex] = useState<number | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const cardAreaRef = useRef<HTMLDivElement>(null);

    // Track card area for progress bar
    const { scrollYProgress } = useScroll({
        target: cardAreaRef,
        offset: ["start end", "end 0.55"]
    });

    // Heading reveal trigger
    const { scrollYProgress: revealScroll } = useScroll({
        target: containerRef,
        offset: ["start 0.2", "end 0.2"]
    });

    const progressBarWidth = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

    const faqs = [
        {
            question: "What makes VendorFlow different from other platforms?",
            answer: "VendorFlow is strictly curated. We only accept established, high-volume sellers and brands. This allows us to offer premium infrastructure, faster performance, and dedicated support without the noise and slow-downs caused by millions of drop-shipping or hobbyist stores."
        },
        {
            question: "How long does the application and vetting process take?",
            answer: "Our vetting team reviews all applications within 24-48 hours. We look at your current sales volume, brand presentation, and product quality. If approved, you will be assigned a dedicated onboarding specialist who can get your store live in under a week."
        },
        {
            question: "Can I migrate my existing store to VendorFlow?",
            answer: "Yes. Our team handles the heavy lifting of migrating your products, customer data, and order history from major platforms like Shopify, WooCommerce, and Magento. We ensure a seamless transition with zero downtime for your customers."
        },
        {
            question: "What are the fees and transaction costs?",
            answer: "We don't believe in punitive transaction fees. We offer simple, flat-rate, custom pricing tiers based on your processing volume and infrastructure needs. You only pay for the enterprise tools you use—contact sales for a personalized quote."
        },
        {
            question: "Do I own my customer data?",
            answer: "Absolutely. You own 100% of your customer data, marketing lists, and order histories. VendorFlow simply provides the high-performance infrastructure to process and store it securely."
        }
    ];

    return (
        <section ref={containerRef} className="py-16 md:py-24 bg-[#050505] relative z-30">
            <div className="max-w-[1200px] mx-auto px-4 sm:px-6 relative z-10 flex flex-col lg:flex-row gap-8 lg:gap-16 items-start">

                {/* Left Side Header - Sticky & Vertically Centered */}
                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    className="w-full lg:w-[45%] lg:sticky lg:top-[20vh] py-12 lg:py-0"
                >
                    <span className="inline-block self-start py-1 px-4 rounded-full bg-[#ccff00]/10 text-xs uppercase font-bold tracking-widest text-[#ccff00] mb-8 border border-[#ccff00]/20">
                        FAQ System
                    </span>

                    <div className="flex flex-col gap-1 mb-10">
                        {['Commonly', 'Asked', 'Questions'].map((word, i) => (
                            <FAQWord key={i} word={word} index={i} revealScroll={revealScroll} />
                        ))}
                    </div>

                    <p className="text-sm md:text-lg text-white/50 leading-relaxed max-w-sm font-light border-l-4 border-[#ccff00] pl-6 py-2 italic">
                        Everything you need to know about migrating and scaling your business on our platform.
                    </p>

                    {/* Visual Progress Indicator */}
                    <div className="hidden lg:block w-full max-w-[300px] h-[2px] bg-white/10 overflow-hidden mt-12 rounded-full">
                        <motion.div
                            className="h-full bg-[#ccff00] shadow-[0_0_15px_#ccff00]"
                            style={{ width: progressBarWidth }}
                        />
                    </div>
                </motion.div>

                {/* Right Side - Stacked Deck Layout */}
                <div className="w-full lg:w-[60%] relative">
                    <div className="relative">
                        {/* Initial spacer */}
                        <div className="h-[60vh]" />
                        {/* Card area */}
                        <div ref={cardAreaRef}>
                            {faqs.map((faq, index) => (
                                <React.Fragment key={index}>
                                    <motion.div
                                        className="sticky"
                                        style={{ top: `calc(45vh + ${index * 6}px)`, zIndex: index + 1 }}
                                        initial={{ opacity: 0, y: 40 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true, amount: 0.15 }}
                                        transition={{ duration: 0.5, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
                                    >
                                        <FAQCard
                                            index={index}
                                            question={faq.question}
                                            answer={faq.answer}
                                            isOpen={openIndex === index}
                                            onClick={() => setOpenIndex(openIndex === index ? null : index)}
                                        />
                                    </motion.div>
                                    {/* Spacer after each card except the last one */}
                                    {index < faqs.length - 1 && <div className="h-[50vh]" />}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default FAQ;
