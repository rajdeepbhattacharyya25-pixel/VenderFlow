import React, { useEffect } from 'react';
import { TopBar } from '../components/TopBar';
import { Footer } from '../components/Footer';
import { useNavigate } from 'react-router-dom';

export default function AboutPage() {
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

            <main className="flex-grow max-w-[1000px] mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
                <div className="text-center mb-16">
                    <h1 className="text-4xl md:text-6xl font-bold font-display text-gray-900 dark:text-white mb-6 tracking-tight">
                        About VenderFlow
                    </h1>
                    <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed">
                        The fully-managed, curated infrastructure empowering ambitious independent brands to scale without friction.
                    </p>
                </div>

                <div className="prose prose-lg dark:prose-invert prose-emerald max-w-none space-y-16">

                    {/* Mission Section */}
                    <section className="bg-slate-50 dark:bg-neutral-900/50 p-8 md:p-12 rounded-3xl border border-gray-100 dark:border-white/5">
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-0 mb-6">Our Mission</h2>
                        <p className="text-gray-600 dark:text-gray-300">
                            VenderFlow was built with a singular focus: to elevate the standard of independent e-commerce. We observed that talented creators and premium brands often struggled with the disjointed, fragmented tools required to run a high-volume storefront. VenderFlow unites inventory, storefront design, secure payments, and profound analytics into one cohesive, enterprise-grade platform. We handle the infrastructure so our merchants can focus on what they do best: creating exceptional products.
                        </p>
                    </section>

                    {/* How It Works: Sellers */}
                    <section>
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 border-b border-gray-200 dark:border-neutral-800 pb-4">For Sellers: The VenderFlow Advantage</h2>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mt-8">
                            <div className="bg-white dark:bg-neutral-900 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5">
                                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center mb-6">
                                    <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Customizable Storefronts</h3>
                                <p className="text-gray-600 dark:text-gray-400 text-sm">
                                    Launch a breathtaking storefront instantly. Need a specific look? Sellers can request custom theme or UI changes according to their needs—the first customization is completely free, with subsequent changes available for a standard fee.
                                </p>
                            </div>
                            <div className="bg-white dark:bg-neutral-900 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5">
                                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center mb-6">
                                    <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Deep Analytics & Insights</h3>
                                <p className="text-gray-600 dark:text-gray-400 text-sm">
                                    In your dashboard, you get proper, detailed analytics of your storefront and your products. Manage inventory, track global shipments, and process orders from a unified, powerful interface.
                                </p>
                            </div>
                            <div className="bg-white dark:bg-neutral-900 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5">
                                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center mb-6">
                                    <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Team Expansion</h3>
                                <p className="text-gray-600 dark:text-gray-400 text-sm">
                                    Scale your workload. Sellers can easily expand their dashboard access with partners or employees. Your data is fortified by strict Role-Based Access Controls (RBAC), end-to-end encryption, and audit logs.
                                </p>
                            </div>
                            <div className="bg-white dark:bg-neutral-900 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5">
                                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center mb-6">
                                    <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Telegram Integration</h3>
                                <p className="text-gray-600 dark:text-gray-400 text-sm">
                                    Sellers get instant notifications about their system directly in the Telegram app. You also can get basic data of your storefront on command without even having to open the web app.
                                </p>
                            </div>
                            <div className="bg-white dark:bg-neutral-900 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5">
                                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center mb-6">
                                    <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Enterprise Security</h3>
                                <p className="text-gray-600 dark:text-gray-400 text-sm">
                                    Your data, and your customers' data, is fortified by stringent security measures, ensuring complete privacy, uptime reliability, and continuous threat monitoring against any malicious activity.
                                </p>
                            </div>
                            <div className="bg-white dark:bg-neutral-900 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5">
                                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center mb-6">
                                    <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Secure, Global Payouts</h3>
                                <p className="text-gray-600 dark:text-gray-400 text-sm">
                                    Powered by industry-leading financial infrastructure, VenderFlow automatically settles your funds securely while mitigating fraud risk natively.
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* How It Works: Customers */}
                    <section>
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 border-b border-gray-200 dark:border-neutral-800 pb-4">For Customers: A Premium Experience</h2>
                        <div className="space-y-6">
                            <div className="flex gap-6 items-start">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold">1</div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white m-0 mb-2">Curated Trust</h3>
                                    <p className="text-gray-600 dark:text-gray-400 m-0">VenderFlow strictly vets every merchant on our platform. When you buy from a VenderFlow-hosted storefront, you are buying from a verified, legitimate brand.</p>
                                </div>
                            </div>
                            <div className="flex gap-6 items-start">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold">2</div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white m-0 mb-2">Frictionless Checkout</h3>
                                    <p className="text-gray-600 dark:text-gray-400 m-0">Say goodbye to clunky, multi-page checkouts. VenderFlow's system is optimized for speed, supporting mobile wallets and saving your preferences securely for next time.</p>
                                </div>
                            </div>
                            <div className="flex gap-6 items-start">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold">3</div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white m-0 mb-2">Transparent Support</h3>
                                    <p className="text-gray-600 dark:text-gray-400 m-0">Track your orders visually, communicate directly with merchants, and leverage the VenderFlow infrastructure to ensure a smooth, reliable consumer experience.</p>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            </main>

            <div className="bg-[#1a202c]">
                <Footer
                    onLinkClick={(section, key) => {
                        if (section === 'legal') {
                            switch (key) {
                                case 'terms': navigate('/terms'); break;
                                case 'privacy': navigate('/privacy-policy'); break;
                                case 'payment': navigate('/payment-policy'); break;
                                case 'cookie': navigate('/cookie-policy'); break;
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
