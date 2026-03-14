import React from 'react';
import { Mail, MessageCircle, Phone, X } from 'lucide-react';

interface ContactUsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ContactUsModal({ isOpen, onClose }: ContactUsModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 rounded-full transition-colors"
                    aria-label="Close contact modal"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="p-8">
                    <div className="flex justify-center mb-6">
                        <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center transform -rotate-3 border border-emerald-200 dark:border-emerald-800">
                            <MessageCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                        </div>
                    </div>

                    <h2 className="text-2xl font-bold font-heading text-center text-neutral-900 dark:text-white mb-2">
                        Get in Touch
                    </h2>
                    <p className="text-center text-neutral-500 dark:text-neutral-400 mb-8">
                        Have questions about selling on VendorFlow? Our team is here to help you get started.
                    </p>

                    <div className="space-y-4">
                        <a
                            href="https://wa.me/1234567890"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-4 p-4 rounded-xl border border-neutral-100 dark:border-neutral-800 hover:border-emerald-500/30 dark:hover:border-emerald-500/30 bg-neutral-50 dark:bg-neutral-800/50 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-all group"
                        >
                            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <MessageCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-neutral-900 dark:text-white">WhatsApp</h3>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400">+1 (234) 567-890</p>
                            </div>
                        </a>

                        <a
                            href="mailto:support@vendorflow.com"
                            className="flex items-center gap-4 p-4 rounded-xl border border-neutral-100 dark:border-neutral-800 hover:border-blue-500/30 dark:hover:border-blue-500/30 bg-neutral-50 dark:bg-neutral-800/50 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-all group"
                        >
                            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-neutral-900 dark:text-white">Email Us</h3>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400">support@vendorflow.com</p>
                            </div>
                        </a>

                        <a
                            href="tel:+1234567890"
                            className="flex items-center gap-4 p-4 rounded-xl border border-neutral-100 dark:border-neutral-800 hover:border-amber-500/30 dark:hover:border-amber-500/30 bg-neutral-50 dark:bg-neutral-800/50 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-all group"
                        >
                            <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Phone className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-neutral-900 dark:text-white">Call Sales</h3>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400">+1 (234) 567-890</p>
                            </div>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
