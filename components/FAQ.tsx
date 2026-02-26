import React, { useState, useRef } from 'react';
import { m, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { Plus } from 'lucide-react';

import './styles/GlowCard.css';

interface FAQItemProps {
    question: string;
    answer: string;
    isOpen: boolean;
    onClick: () => void;
    index: number;
}

const FAQCard: React.FC<FAQItemProps> = ({ question, answer, isOpen, onClick, index }) => {
    const paddedIndex = (index + 1).toString().padStart(2, '0');
    const cardRef = useRef<HTMLDivElement>(null);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const [isHovered, setIsHovered] = useState(false);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setMousePosition({ x, y });
    };

    return (
        <m.div
            layout
            ref={cardRef}
            onClick={onClick}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
                '--glow-x': `${mousePosition.x}px`,
                '--glow-y': `${mousePosition.y}px`,
                '--glow-opacity': isHovered ? 1 : 0,
                '--glow-color': 'rgba(16, 185, 129, 0.15)',
            } as React.CSSProperties}
            className={`glow-card-container relative cursor-pointer rounded-3xl overflow-hidden transition-all duration-500 shadow-xl border ${isOpen
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-500/20'
                : 'bg-white dark:bg-neutral-900 border-transparent dark:border-neutral-800 text-gray-900 dark:text-white hover:border-emerald-500/30 shadow-black/5 dark:shadow-black/20'
                }`}
        >
            {/* Dynamic Glow Spotlight */}
            <div
                className="glow-card-effect pointer-events-none absolute -inset-px transition-opacity duration-300"
                style={{ zIndex: 0 }}
            />

            <div className="relative z-10">
                <m.div layout className="p-6 md:p-8 flex flex-col md:flex-row md:items-start justify-between gap-4 md:gap-6">
                    <div className="flex items-start gap-4 flex-1">
                        <span className={`text-sm md:text-base font-bold font-display opacity-40 shrink-0 mt-0.5 ${isOpen ? 'text-emerald-100' : 'text-gray-400 dark:text-gray-500'}`}>
                            {paddedIndex}
                        </span>
                        <m.span layout className="font-bold text-[17px] md:text-xl md:leading-snug">
                            {question}
                        </m.span>
                    </div>

                    <m.div
                        animate={{ rotate: isOpen ? 45 : 0 }}
                        transition={{ duration: 0.3, ease: "backOut" }}
                        className={`flex-shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-colors self-end md:self-auto mt-4 md:mt-0 ${isOpen ? 'bg-white/20 text-white' : 'bg-gray-50 dark:bg-neutral-800 text-gray-400 border border-gray-100 dark:border-neutral-700/50'
                            }`}
                    >
                        <Plus className="w-5 h-5" />
                    </m.div>
                </m.div>

                <AnimatePresence initial={false}>
                    {isOpen && (
                        <m.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                        >
                            <div className="px-6 md:px-8 pb-8 md:pb-10 pt-0 ml-0 md:ml-10">
                                <m.p
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.1, duration: 0.4 }}
                                    className={`text-[15px] md:text-[17px] leading-relaxed max-w-3xl ${isOpen ? 'text-emerald-50' : 'text-gray-500 dark:text-gray-400'
                                        }`}
                                >
                                    {answer}
                                </m.p>
                            </div>
                        </m.div>
                    )}
                </AnimatePresence>
            </div>
        </m.div>
    );
};

export const FAQ: React.FC = () => {
    const [openIndex, setOpenIndex] = useState<number | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // We use Framer Motion's useScroll to check progress as the user scrolls.
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start center", "end end"]
    });

    const progressBarWidth = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

    const faqs = [
        {
            question: "What makes VenderFlow different from other platforms?",
            answer: "VenderFlow is strictly curated. We only accept established, high-volume sellers and brands. This allows us to offer premium infrastructure, faster performance, and dedicated support without the noise and slow-downs caused by millions of drop-shipping or hobbyist stores."
        },
        {
            question: "How long does the application and vetting process take?",
            answer: "Our vetting team reviews all applications within 24-48 hours. We look at your current sales volume, brand presentation, and product quality. If approved, you will be assigned a dedicated onboarding specialist who can get your store live in under a week."
        },
        {
            question: "Can I migrate my existing store to VenderFlow?",
            answer: "Yes. Our team handles the heavy lifting of migrating your products, customer data, and order history from major platforms like Shopify, WooCommerce, and Magento. We ensure a seamless transition with zero downtime for your customers."
        },
        {
            question: "What are the fees and transaction costs?",
            answer: "We don't believe in punitive transaction fees. We offer simple, flat-rate, custom pricing tiers based on your processing volume and infrastructure needs. You only pay for the enterprise tools you use—contact sales for a personalized quote."
        },
        {
            question: "Do I own my customer data?",
            answer: "Absolutely. You own 100% of your customer data, marketing lists, and order histories. VenderFlow simply provides the high-performance infrastructure to process and store it securely."
        }
    ];

    return (
        <section ref={containerRef} className="py-24 md:py-32 bg-[#fafafa] dark:bg-neutral-950 border-t border-gray-100 dark:border-neutral-800 relative">
            {/* Minimal Background Accent */}
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none -translate-y-1/2 translate-x-1/3" />

            <div className="max-w-[1000px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10 flex flex-col lg:flex-row gap-12 lg:gap-24 items-start">

                {/* Left Side Header - Sticky */}
                <m.div
                    initial={{ opacity: 0, x: -30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: false, margin: "-100px" }}
                    transition={{ duration: 0.6 }}
                    className="w-full lg:w-[35%] lg:sticky lg:top-32"
                >
                    <span className="inline-block py-1.5 px-3.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-[11px] uppercase font-bold tracking-widest text-emerald-600 dark:text-emerald-400 mb-6 border border-emerald-100 dark:border-emerald-500/20 shadow-sm">FAQ</span>
                    <h2 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white font-display tracking-tight mb-6 leading-[1.1]">
                        Commonly Asked Questions
                    </h2>
                    <p className="text-[15px] md:text-base text-gray-500 dark:text-gray-400 leading-relaxed mb-8">
                        Everything you need to know about migrating and scaling your business on our platform.
                    </p>

                    {/* Animated Scroll Progress Bar */}
                    <div className="hidden lg:block w-full max-w-[280px] h-1.5 bg-gray-200 dark:bg-neutral-800 rounded-full overflow-hidden mt-4">
                        <m.div
                            className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full"
                            style={{ width: progressBarWidth }}
                        />
                    </div>
                </m.div>

                {/* Right Side - Stacked Deck Layout */}
                <div className="w-full lg:w-[65%] flex flex-col relative pb-32">
                    {faqs.map((faq, index) => {
                        return (
                            <m.div
                                key={index}
                                initial={{ opacity: 0, y: 50 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: false, margin: "-100px" }}
                                transition={{
                                    duration: 0.6,
                                    delay: index * 0.1,
                                    ease: [0.22, 1, 0.36, 1]
                                }}
                                className="sticky w-full"
                                style={{
                                    top: `${(index * 24) + 100}px`,
                                    zIndex: index + 1,
                                    marginBottom: index === faqs.length - 1 ? 0 : '16px',
                                }}
                            >
                                <FAQCard
                                    index={index}
                                    question={faq.question}
                                    answer={faq.answer}
                                    isOpen={openIndex === index}
                                    onClick={() => setOpenIndex(openIndex === index ? null : index)}
                                />
                            </m.div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

export default FAQ;
