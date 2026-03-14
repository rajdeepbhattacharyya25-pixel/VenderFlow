import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, XCircle } from 'lucide-react';
import { Footer } from '../../components/Footer';

interface AlternativePageProps {
    competitor: string;
}

const AlternativePage: React.FC<AlternativePageProps> = ({ competitor }) => {
    const navigate = useNavigate();

    // SEO Content customized based on competitor
    const title = `The Best ${competitor} Alternative in 2026 | VendorFlow`;
    const description = `Looking for a better ${competitor} alternative? See why top independent brands are switching to VendorFlow for zero fees, cinematic storefronts, and complete control.`;

    return (
        <div className="min-h-screen bg-[#050505] text-white selection:bg-[#ccff00] selection:text-black font-sans">
            <Helmet>
                <title>{title}</title>
                <meta name="description" content={description} />
                <script type="application/ld+json">
                    {JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "WebPage",
                        "name": title,
                        "description": description,
                        "publisher": {
                            "@type": "Organization",
                            "name": "VendorFlow"
                        }
                    })}
                </script>
            </Helmet>

            {/* Header */}
            <header className="fixed top-0 w-full z-[100] px-4 sm:px-8 py-6 pointer-events-none">
                <div className="max-w-[1600px] mx-auto flex items-center justify-between pointer-events-auto">
                    <Link to="/" className="flex items-center gap-3 group/logo">
                        <img src="/logo.jpg" alt="VendorFlow Logo" className="w-8 h-8 md:w-10 md:h-10 rounded-full object-cover shadow-sm" />
                        <div className="hidden sm:flex items-center gap-1.5">
                            <span className="text-[20px] font-extrabold uppercase text-white" style={{ fontFamily: "'Syne', sans-serif", letterSpacing: '-0.03em' }}>VENDORFLOW</span>
                        </div>
                    </Link>
                    <Link to="/apply" className="px-5 py-2.5 bg-white text-black text-xs font-bold uppercase tracking-wider rounded-full hover:bg-[#ccff00] transition-colors">
                        Get Started
                    </Link>
                </div>
            </header>

            <main className="pt-40 pb-24">
                {/* Hero Section */}
                <section className="relative px-6 max-w-5xl mx-auto mb-32 text-center">
                    <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#ccff00]/10 via-black to-transparent opacity-50"></div>
                    <div className="inline-block px-4 py-1.5 rounded-full border border-[#ccff00]/30 bg-[#ccff00]/10 text-[#ccff00] text-xs font-bold tracking-widest uppercase mb-8">
                        The modern alternative
                    </div>
                    <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter mb-8 bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-white/50 leading-tight">
                        Outgrown <span className="opacity-50 line-through decoration-red-500 decoration-8">{competitor}</span>?<br />
                        <span className="text-[#ccff00]">Welcome to VendorFlow.</span>
                    </h1>
                    <p className="text-xl md:text-2xl text-neutral-400 max-w-3xl mx-auto font-light leading-relaxed mb-12">
                        Stop paying high monthly fees and commission cuts. Build a cinematic, high-converting storefront on the infrastructure designed for the next generation of independent brands.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link to="/apply" className="w-full sm:w-auto px-8 py-4 bg-[#ccff00] text-black font-black uppercase tracking-widest hover:bg-white transition-all rounded-xl text-sm border-2 border-transparent">
                            Start Free Trial
                        </Link>
                        <Link to="/" className="w-full sm:w-auto px-8 py-4 bg-transparent text-white font-bold uppercase tracking-widest hover:bg-white/5 transition-all rounded-xl text-sm border-2 border-white/20">
                            See Features
                        </Link>
                    </div>
                </section>

                {/* Comparison Table */}
                <section className="px-6 max-w-4xl mx-auto mb-32">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-bold tracking-tight">VendorFlow vs {competitor}</h2>
                        <p className="text-neutral-500 mt-4">See why thousands of sellers are making the switch.</p>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-sm">
                        <div className="grid grid-cols-3 border-b border-white/10 bg-white/5 p-6">
                            <div className="font-bold text-sm text-neutral-400 uppercase tracking-widest">Feature</div>
                            <div className="font-black text-lg text-white text-center">VendorFlow</div>
                            <div className="font-bold text-lg text-neutral-500 text-center">{competitor}</div>
                        </div>

                        {[
                            { label: "Transaction Fees", vf: "0%", comp: "Up to 2.9% + 30¢" },
                            { label: "Design Capabilities", vf: "Cinematic, Glassmorphic 3D", comp: "Basic Templates" },
                            { label: "Monthly Cost", vf: "$0 (Free Tier Available)", comp: "$39+ / month" },
                            { label: "Analytics", vf: "Real-time AI Insights", comp: "Basic Dashboard" },
                            { label: "Storefront Performance", vf: "Sub-second Next.js edge", comp: "Legacy Liquid architecture" }
                        ].map((row, i) => (
                            <div key={i} className="grid grid-cols-3 border-b border-white/5 p-6 items-center hover:bg-white/5 transition-colors">
                                <div className="font-medium text-neutral-300">{row.label}</div>
                                <div className="text-[#ccff00] font-bold text-center flex flex-col items-center justify-center gap-2">
                                    <CheckCircle2 className="w-5 h-5 mx-auto" />
                                    <span className="text-sm">{row.vf}</span>
                                </div>
                                <div className="text-neutral-500 text-center flex flex-col items-center justify-center gap-2">
                                    <XCircle className="w-5 h-5 mx-auto opacity-50" />
                                    <span className="text-sm text-neutral-600">{row.comp}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Internal Linking / Topic Cluster */}
                <section className="px-6 max-w-4xl mx-auto text-center border-t border-white/10 pt-24">
                    <h3 className="text-2xl font-bold mb-8">Related Resources</h3>
                    <div className="flex flex-wrap justify-center gap-4">
                        <Link to="/blog/vendorflow-seo-overview" className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:border-[#ccff00]/50 hover:bg-[#ccff00]/10 transition-colors text-sm text-neutral-300">
                            SEO Strategies for E-commerce
                        </Link>
                        <Link to="/about" className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:border-[#ccff00]/50 hover:bg-[#ccff00]/10 transition-colors text-sm text-neutral-300">
                            Why We Built VendorFlow
                        </Link>
                        <Link to="/apply" className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:border-[#ccff00]/50 hover:bg-[#ccff00]/10 transition-colors text-sm text-neutral-300">
                            Apply to Sell
                        </Link>
                    </div>
                </section>
            </main>

            <Footer
                onLinkClick={(section, key) => {
                    navigate('/'); // Simplified for this template
                }}
                branding={{
                    storeName: "VENDORFLOW",
                    description: "The premier infrastructure for ambitious independent brands.",
                    socials: {
                        instagram: "https://www.instagram.com/_rajdeep.007_/",
                        twitter: "https://x.com/_rajdeep007_",
                        linkedin: "https://www.linkedin.com/in/rajdeep-bhattacharyya-497945371/"
                    }
                }}
                categories={[]}
            />
        </div>
    );
};

export default AlternativePage;
