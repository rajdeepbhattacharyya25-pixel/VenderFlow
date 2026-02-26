import React, { useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

interface FAQItemProps {
    question: string;
    answer: string;
    isOpen: boolean;
    onClick: () => void;
}

const FAQItem: React.FC<FAQItemProps> = ({ question, answer, isOpen, onClick }) => {
    return (
        <div className="border border-gray-100 dark:border-neutral-800 rounded-2xl overflow-hidden bg-white dark:bg-neutral-900/50 hover:border-emerald-500/30 dark:hover:border-emerald-500/30 transition-colors shadow-sm">
            <button
                onClick={onClick}
                className="w-full flex items-center justify-between px-6 py-5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
                <span className="font-bold text-gray-900 dark:text-white text-base md:text-[17px] pr-4">
                    {question}
                </span>
                <m.div
                    initial={false}
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-50 dark:bg-neutral-800 flex items-center justify-center text-gray-500 dark:text-gray-400"
                >
                    <ChevronDown className="w-4 h-4" />
                </m.div>
            </button>

            <AnimatePresence initial={false}>
                {isOpen && (
                    <m.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
                    >
                        <div className="px-6 pb-6 pt-0">
                            <p className="text-gray-500 dark:text-gray-400 text-[15px] leading-relaxed">
                                {answer}
                            </p>
                        </div>
                    </m.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export const FAQ: React.FC = () => {
    const [openIndex, setOpenIndex] = useState<number | null>(0);

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
        <section className="py-20 md:py-32 bg-white dark:bg-neutral-950 border-t border-gray-100 dark:border-neutral-800 overflow-hidden relative">
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />

            <div className="max-w-[800px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <m.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16"
                >
                    <span className="text-[11px] uppercase font-bold tracking-widest text-emerald-600 dark:text-emerald-500 mb-3 block">Answers</span>
                    <h2 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white font-display tracking-tight">
                        Common Questions
                    </h2>
                    <p className="mt-4 text-[15px] md:text-base text-gray-500 dark:text-gray-400 max-w-lg mx-auto leading-relaxed">
                        Everything you need to know about migrating and scaling your business on our platform.
                    </p>
                </m.div>

                <m.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-50px" }}
                    variants={{
                        hidden: { opacity: 0 },
                        visible: {
                            opacity: 1,
                            transition: {
                                staggerChildren: 0.1
                            }
                        }
                    }}
                    className="space-y-4"
                >
                    {faqs.map((faq, index) => (
                        <m.div
                            key={index}
                            variants={{
                                hidden: { opacity: 0, y: 20 },
                                visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } }
                            }}
                        >
                            <FAQItem
                                question={faq.question}
                                answer={faq.answer}
                                isOpen={openIndex === index}
                                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                            />
                        </m.div>
                    ))}
                </m.div>
            </div>
        </section>
    );
};

export default FAQ;
