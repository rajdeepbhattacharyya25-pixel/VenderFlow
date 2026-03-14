import React, { useEffect } from 'react';
import { TopBar } from '../../components/TopBar';
import { Footer } from '../../components/Footer';
import { useNavigate } from 'react-router-dom';

export default function PaymentPage() {
    const navigate = useNavigate();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="min-h-screen flex flex-col font-body bg-white dark:bg-neutral-950 transition-colors duration-500 relative">
            <TopBar />

            <header className="sticky top-0 z-50 bg-slate-50/90 dark:bg-neutral-900/90 backdrop-blur-md border-b border-gray-200 dark:border-neutral-800 transition-all">
                <div className="max-w-[1600px] mx-auto px-4 md:px-8 h-16 md:h-20 flex items-center justify-between">
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
                        <img src="/logo.jpg" alt="VendorFlow" className="h-8 md:h-10 w-auto rounded-lg" />
                        <span className="text-xl md:text-2xl font-bold font-heading text-emerald-700 dark:text-emerald-500 tracking-tight">
                            VendorFlow
                        </span>
                    </div>
                </div>
            </header>

            <main className="flex-grow max-w-[800px] mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
                <h1 className="text-4xl md:text-5xl font-bold font-heading text-gray-900 dark:text-white mb-8 tracking-tight">
                    Payment Policy
                </h1>

                <div className="prose prose-lg dark:prose-invert prose-emerald max-w-none text-gray-600 dark:text-gray-300">
                    <p className="lead text-xl mb-8">
                        VendorFlow enables a pristine, secure, and rapid settlement ecosystem for our verified tier of online merchants, ensuring frictionless commerce globally.
                    </p>

                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-12 mb-4">1. Supported Payment Rails</h2>
                    <p className="mb-6">
                        We process consumer transactions primarily through Stripe Connect, enabling end customers to safely pay using Visa, Mastercard, American Express, Apple Pay, Google Pay, and localized protocols (such as UPI for distinct geographic clusters). All payment gateway connections are fundamentally encrypted end-to-end. VendorFlow never sees or stores full credit card strings on its servers.
                    </p>

                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-12 mb-4">2. Fast Verification & Settlement</h2>
                    <p className="mb-6">
                        Because our merchants are thoroughly vetted during the application phase, we negotiate accelerated rolling reserves and direct deposit timelines. Transactions clear directly into native, linked bank accounts automatically holding the standard T-2 to T-3 window, dramatically improving operational liquidity for D2C scaling efforts over generic market options.
                    </p>

                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-12 mb-4">3. Fraud Prevention & Chargebacks</h2>
                    <p className="mb-6">
                        Our internal security array features ML-based predictive modeling to halt fraudulent consumer transactions before they impact scaling businesses. In the event of chargeback disputes, VendorFlow actively aids merchants in compiling definitive delivery and communication logs, defending merchant revenue fiercely while eliminating bad-actor buyers gracefully.
                    </p>

                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-12 mb-4">4. Clear Commission Structure</h2>
                    <p className="mb-6">
                        We firmly reject the typical "chaotic bazaar" fee models of hidden percentage scaling. VendorFlow explicitly lists hardware connection fees and fixed enterprise margin rates directly inside the admin dashboard, completely devoid of hidden post-processing 'surprise' charges.
                    </p>

                    <p className="text-sm mt-12 text-gray-500">Last Updated: February 2026</p>
                </div>
            </main>

            <div className="bg-[#1a202c]">
                <Footer
                    onLinkClick={(section, key) => {
                        if (section === 'legal') {
                            switch (key) {
                                case 'Terms & Conditions': navigate('/terms'); break;
                                case 'Privacy Policy': navigate('/privacy-policy'); break;
                                case 'Payment Policy': navigate('/payment-policy'); break;
                                case 'Cookie Policy': navigate('/cookie-policy'); break;
                            }
                        } else if (section === 'company') {
                            if (key === 'About Us') navigate('/about');
                            if (key === 'Contact Us') window.location.href = 'mailto:support@vendorflow.com';
                        }
                    }}
                    branding={{
                        storeName: "VendorFlow",
                        description: "The premier platform for ambitious independent brands and creators.",
                        socials: {
                            instagram: "https://www.instagram.com/_rajdeep.007_/",
                            twitter: "https://x.com/_rajdeep007_",
                            linkedin: "https://www.linkedin.com/in/rajdeep-bhattacharyya-497945371/"
                        }
                    }}
                    categories={[]}
                />
            </div>
        </div>
    );
}
