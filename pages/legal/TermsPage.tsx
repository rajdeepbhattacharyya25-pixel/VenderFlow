import React, { useEffect } from 'react';
import { TopBar } from '../../components/TopBar';
import { Footer } from '../../components/Footer';
import { useNavigate } from 'react-router-dom';

export default function TermsPage() {
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
                        <img src="/logo.jpg" alt="VenderFlow" className="h-8 md:h-10 w-auto rounded-lg" />
                        <span className="text-xl md:text-2xl font-bold font-display text-emerald-700 dark:text-emerald-500 tracking-tight">
                            VenderFlow
                        </span>
                    </div>
                </div>
            </header>

            <main className="flex-grow max-w-[800px] mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
                <h1 className="text-4xl md:text-5xl font-bold font-display text-gray-900 dark:text-white mb-8 tracking-tight">
                    Terms & Conditions
                </h1>

                <div className="prose prose-lg dark:prose-invert prose-emerald max-w-none text-gray-600 dark:text-gray-300">
                    <p className="lead text-xl mb-8">
                        Welcome to VenderFlow. By accessing our platform, you agree to be bound by these Terms and Conditions. VenderFlow is a premium, curated ecommerce infrastructure designed exclusively for verified, high-volume merchants and their customers.
                    </p>

                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-12 mb-4">1. Merchant Vetting & Eligibility</h2>
                    <p className="mb-6">
                        VenderFlow is not an open marketplace. We maintain a strict curation process to ensure customer trust and platform integrity. All prospective merchants must undergo a comprehensive business review before being granted selling privileges. We reserve the right to reject or suspend any merchant account that fails to uphold our standards for product quality, shipping timelines, or customer service at our absolute discretion.
                    </p>

                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-12 mb-4">2. Platform Usage & Infrastructure</h2>
                    <p className="mb-6">
                        We provide enterprise-grade infrastructure, secure payment routing, and localized storefronts to approved sellers. You agree not to misuse our infrastructure through automated scraping, denial-of-service attempts, or the hosting of prohibited materials. While we guarantee a 99.9% uptime SLA for verified enterprise accounts, VenderFlow is not liable for indirect losses stemming from temporary service interruptions outside of our immediate control.
                    </p>

                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-12 mb-4">3. Consumer Protection & Liability</h2>
                    <p className="mb-6">
                        While VenderFlow strictly curates its merchant network, transactions are legally bound between the buyer and the respective seller. VenderFlow provides the secure technology layer but assumes no direct liability for product defects, delivery delays, or unfulfilled promises made by individual merchants, unless explicitly stated under VenderFlow Buyer Protection policies.
                    </p>

                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-12 mb-4">4. Intellectual Property</h2>
                    <p className="mb-6">
                        The VenderFlow brand, platform architecture, dashboard UI, and underlying code are the exclusive intellectual property of VenderFlow Inc. Merchants retain full ownership of their storefront data, product imagery, and brand assets uploaded to our servers, granting us a limited license purely to display and promote their products within the VenderFlow ecosystem.
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
                            if (key === 'Contact Us') window.location.href = 'mailto:support@venderflow.com';
                        }
                    }}
                    branding={{
                        storeName: "VenderFlow",
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
