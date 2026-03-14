import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar, User, ArrowRight } from 'lucide-react';
import { Footer } from '../../components/Footer';

export interface BlogPostMeta {
    slug: string;
    title: string;
    description: string;
    date: string;
    author: string;
    coverImage: string;
    isFeatured?: boolean;
    category?: string;
}

const BlogIndex: React.FC = () => {
    const navigate = useNavigate();
    const [posts, setPosts] = useState<BlogPostMeta[]>([]);
    const [activeCategory, setActiveCategory] = useState('All');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/blog/index.json')
            .then(res => res.json())
            .then(data => {
                const sorted = data.sort((a: BlogPostMeta, b: BlogPostMeta) =>
                    new Date(b.date).getTime() - new Date(a.date).getTime()
                );
                setPosts(sorted);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const categories = ['All', 'Marketplace Guides', 'Tutorials', 'Tech & Architecture'];
    const filteredPosts = activeCategory === 'All'
        ? posts.filter(p => !p.isFeatured)
        : posts.filter(p => !p.isFeatured && p.category === activeCategory);

    return (
        <div className="min-h-screen bg-[#050505] text-white selection:bg-[#ccff00] selection:text-black">
            <Helmet>
                <title>Blog | VendorFlow</title>
                <meta name="description" content="Insights, updates, and deep dives into the VendorFlow ecosystem." />
            </Helmet>

            {/* Minimalist Header */}
            <header className="fixed top-0 w-full z-[100] px-4 sm:px-8 py-6 pointer-events-none">
                <div className="max-w-[1600px] mx-auto flex items-center justify-between pointer-events-auto">
                    <Link to="/" className="flex items-center gap-3 group/logo">
                        <img src="/logo.jpg" alt="VendorFlow Logo" className="w-8 h-8 md:w-10 md:h-10 rounded-full object-cover shadow-sm" />
                        <div className="hidden sm:flex items-center gap-1.5">
                            <span className="text-[20px] font-extrabold uppercase text-white" style={{ fontFamily: "'Syne', sans-serif", letterSpacing: '-0.03em' }}>VENDORFLOW</span>
                            <span className="text-[#ccff00] text-[16px] font-black leading-none transition-all duration-300 group-hover/logo:drop-shadow-[0_0_8px_#ccff00] translate-y-[-1px]">&#9654;</span>
                        </div>
                    </Link>
                    <Link to="/" className="text-white/70 hover:text-[#ccff00] transition-colors text-sm font-bold">Back to Home</Link>
                </div>
            </header>

            <main className="pt-40 pb-24">
                {/* Cinematic Header */}
                <section className="relative px-6 max-w-7xl mx-auto mb-20 text-center">
                    <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#ccff00]/10 via-black to-transparent opacity-50"></div>
                    <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
                        VendorFlow <span className="text-[#ccff00]">Insights</span>
                    </h1>
                    <p className="text-xl text-neutral-400 max-w-2xl mx-auto font-light">
                        Deep dives, updates, and expert strategies for building scaling digital marketplaces.
                    </p>
                </section>

                {/* Content Clusters */}
                <section className="px-6 max-w-7xl mx-auto">
                    {loading ? (
                        <div className="flex justify-center py-20">
                            <div className="w-8 h-8 rounded-full border-t-2 border-[#ccff00] animate-spin"></div>
                        </div>
                    ) : (
                        <div className="space-y-24">
                            {/* Featured Article - Only show if on 'All' or if a featured post matches the category */}
                            {posts.filter(p => p.isFeatured && (activeCategory === 'All' || p.category === activeCategory)).length > 0 && (
                                <div>
                                    <div className="flex items-center gap-4 mb-8">
                                        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Featured Article</h2>
                                        <div className="flex-1 h-px bg-white/10"></div>
                                    </div>
                                    <div className="grid grid-cols-1">
                                        {posts.filter(p => p.isFeatured && (activeCategory === 'All' || p.category === activeCategory)).slice(0, 1).map((post) => (
                                            <Link
                                                key={post.slug}
                                                to={`/blog/${post.slug}`}
                                                className="group flex flex-col md:flex-row bg-white/5 border border-white/10 rounded-3xl overflow-hidden hover:border-[#ccff00]/50 transition-all duration-500 hover:shadow-[0_0_30px_rgba(204,255,0,0.15)]"
                                            >
                                                <div className="relative w-full md:w-3/5 h-64 md:h-[400px] overflow-hidden">
                                                    <img
                                                        src={post.coverImage}
                                                        alt={post.title}
                                                        className="w-full h-full object-cover transform transition-transform duration-700 group-hover:scale-105"
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-l from-[#050505] via-[#050505]/80 to-transparent"></div>
                                                </div>

                                                <div className="relative flex flex-col flex-1 p-8 md:p-12 justify-center z-10 -mt-20 md:-mt-0 md:-ml-20">
                                                    <div className="inline-block px-3 py-1 bg-[#ccff00] text-black text-[10px] font-black uppercase tracking-widest rounded-full self-start mb-6">
                                                        {post.category || 'Featured'}
                                                    </div>
                                                    <h3 className="text-3xl md:text-4xl font-bold text-white mb-4 group-hover:text-[#ccff00] transition-colors leading-tight">
                                                        {post.title}
                                                    </h3>
                                                    <p className="text-neutral-400 text-base md:text-lg mb-8 font-light leading-relaxed">
                                                        {post.description}
                                                    </p>
                                                    <div className="flex items-center gap-6 text-sm font-mono text-neutral-500 mt-auto">
                                                        <span className="flex items-center gap-2"><Calendar className="w-4 h-4 text-[#ccff00]" />{new Date(post.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                                        <span className="flex items-center gap-2"><User className="w-4 h-4" />{post.author}</span>
                                                    </div>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Articles Grid with Filtering */}
                            <div>
                                <div className="flex items-center flex-wrap gap-4 mb-8">
                                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
                                        {activeCategory === 'All' ? 'Latest Articles' : activeCategory}
                                    </h2>
                                    <div className="flex-1 h-px bg-white/10 hidden sm:block"></div>
                                    <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                                        <span className="text-[10px] text-neutral-500 uppercase tracking-widest hidden md:block">Filter:</span>
                                        {categories.map((cat, i) => (
                                            <React.Fragment key={cat}>
                                                <button
                                                    onClick={() => setActiveCategory(cat)}
                                                    className={`text-[10px] uppercase tracking-widest transition-all duration-300 font-bold ${activeCategory === cat ? 'text-[#ccff00] drop-shadow-[0_0_8px_#ccff00]' : 'text-neutral-500 hover:text-white'}`}
                                                >
                                                    {cat}
                                                </button>
                                                {i < categories.length - 1 && <span className="text-neutral-700 text-[10px]">/</span>}
                                            </React.Fragment>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {filteredPosts.map((post) => (
                                        <Link
                                            key={post.slug}
                                            to={`/blog/${post.slug}`}
                                            className="group flex flex-col bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-[#ccff00]/50 transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(204,255,0,0.1)]"
                                        >
                                            <div className="relative h-60 overflow-hidden">
                                                <img
                                                    src={post.coverImage}
                                                    alt={post.title}
                                                    className="w-full h-full object-cover transform transition-transform duration-700 group-hover:scale-105"
                                                />
                                                <div className="absolute top-4 left-4 inline-block px-2.5 py-1 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-widest rounded-md border border-white/10">
                                                    {post.category || 'Guide'}
                                                </div>
                                                <div className="absolute inset-0 bg-gradient-to-t from-[#050505] to-transparent opacity-80"></div>
                                            </div>

                                            <div className="flex flex-col flex-1 p-6 md:p-8">
                                                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-[#ccff00] transition-colors leading-snug line-clamp-2">
                                                    {post.title}
                                                </h3>

                                                <p className="text-neutral-400 text-sm line-clamp-3 mb-6 flex-1 font-light leading-relaxed">
                                                    {post.description}
                                                </p>

                                                <div className="flex items-center justify-between mt-auto">
                                                    <div className="flex items-center gap-3 text-xs font-mono text-neutral-500">
                                                        <span>{new Date(post.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                                    </div>
                                                    <div className="flex items-center text-sm font-semibold text-[#ccff00] opacity-80 group-hover:opacity-100 transition-opacity">
                                                        Read <ArrowRight className="w-4 h-4 ml-1 transform transition-transform group-hover:translate-x-1" />
                                                    </div>
                                                </div>
                                            </div>
                                        </Link>
                                    ))}

                                    {filteredPosts.length === 0 && (
                                        <div className="col-span-full py-12 text-center border border-dashed border-white/10 rounded-2xl bg-white/5">
                                            <p className="text-neutral-500 font-mono text-sm">More articles in {activeCategory} publishing soon. Stay tuned!</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </section>
            </main>

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
                        if (key === 'Blog') navigate('/blog');
                    }
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

export default BlogIndex;
