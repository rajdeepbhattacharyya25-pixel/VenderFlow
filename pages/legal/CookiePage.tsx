import React, { useEffect } from 'react';
import { TopBar } from '../../components/TopBar';
import { Footer } from '../../components/Footer';
import { useNavigate } from 'react-router-dom';

export default function CookiePage() {
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
                    Cookie Policy
                </h1>

                <div className="prose prose-lg dark:prose-invert prose-emerald max-w-none text-gray-600 dark:text-gray-300">
                    <p className="lead text-xl mb-8">
                        VendorFlow employs a lightweight and transparent methodology regarding cookies. We exclusively authorize cookie architecture to facilitate vital storefront session logic and optimize raw structural performance.
                    </p>

                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-12 mb-4">1. Non-Intrusive by Default</h2>
                    <p className="mb-6">
                        We actively resist using intrusive third-party cross-site trackers. Modern consumer expectations demand a swift and quiet commerce experience devoid of excessive cookie banners. Our core mechanism only mandates cookies fundamentally required to parse your shopping cart between pages securely.
                    </p>

                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-12 mb-4">2. Essential Cookies</h2>
                    <p className="mb-6">
                        These cookies are the absolute scaffolding of the system. They power the authentication modules mapping you safely to your dashboard, manage active shopping carts against sudden disconnects, and strictly monitor security parameters like cross-site request forgery prevention blocks algorithms.
                    </p>

                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-12 mb-4">3. Aggregated Performance Pixels</h2>
                    <p className="mb-6">
                        Through our internal analytics suite (handled via specialized PostHog pipelines), we trace silent, anonymized performance metrics. This enables VendorFlow merchants to analyze aggregated bounce rates or funnel completion velocities without exploiting individual personal digital identities.
                    </p>

                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-12 mb-4">4. Managing Your Preferences</h2>
                    <p className="mb-6">
                        You preserve full agency over your digital footprint. Most modern browsers allow aggressive filtering or wholesale clearing of VendorFlow cookie footprints on exit. Understand, however, that disabling functional cookies will unequivocally destabilize active cart reservations resulting in degraded purchase intent capabilities.
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
