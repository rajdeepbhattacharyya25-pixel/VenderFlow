import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import { ArrowLeft, Calendar, User, Clock, Share2 } from 'lucide-react';
import { Footer } from '../../components/Footer';

// Lightweight frontmatter parser to replace gray-matter and avoid Node.js Buffer polyfill issues in Vite
function parseFrontmatter(text: string) {
    const match = text.match(/^\s*---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
    if (!match) return { data: {}, content: text };

    const yaml = match[1];
    const content = match[2];

    const data: Record<string, string> = {};
    yaml.split(/\r?\n/).forEach(line => {
        const colonIdx = line.indexOf(':');
        if (colonIdx > -1) {
            const key = line.slice(0, colonIdx).trim();
            let value = line.slice(colonIdx + 1).trim();
            if (value.startsWith('"') && value.endsWith('"')) {
                value = value.slice(1, -1);
            } else if (value.startsWith("'") && value.endsWith("'")) {
                value = value.slice(1, -1);
            }
            data[key] = value;
        }
    });

    return { data, content };
}

// Extract headings for the sticky TOC
function extractHeadings(content: string) {
    const headings: { id: string, text: string, level: number }[] = [];
    const lines = content.split('\n');
    lines.forEach(line => {
        // Match H2 and H3 only
        const match = line.trim().match(/^(#{2,3})\s+(.+)$/);
        if (match) {
            const level = match[1].length;
            const text = match[2].trim();
            // Basic slugifier (rehype-slug compatible for standard ascii)
            const id = text.toLowerCase()
                .replace(/[^\w\s-]/g, '')
                .replace(/[\s_-]+/g, '-')
                .replace(/^-+|-+$/g, '');
            // Ignore the actual 'Table of contents' header from being in the TOC
            if (text.toLowerCase() !== 'table of contents') {
                headings.push({ id, text, level });
            }
        }
    });
    return headings;
}

interface PostData {
    content: string;
    data: {
        title?: string;
        description?: string;
        date?: string;
        author?: string;
        coverImage?: string;
    };
}

const BlogPost: React.FC = () => {
    const navigate = useNavigate();
    const { slug } = useParams<{ slug: string }>();
    const [post, setPost] = useState<PostData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (!slug) return;

        setLoading(true);
        fetch(`/blog/posts/${slug}.md`)
            .then(res => {
                if (!res.ok) throw new Error('Not found');
                return res.text();
            })
            .then(text => {
                const { data, content } = parseFrontmatter(text);
                setPost({ data, content });
            })
            .catch(err => {
                console.error(err);
                setError(true);
            })
            .finally(() => setLoading(false));
    }, [slug]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#050505] flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-t-2 border-[#ccff00] animate-spin"></div>
            </div>
        );
    }

    if (error || !post) {
        return (
            <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-white px-6">
                <h1 className="text-4xl font-bold mb-4">Post Not Found</h1>
                <p className="text-neutral-400 mb-8">The article you are looking for does not exist.</p>
                <Link to="/blog" className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl font-medium transition">
                    Back to Blog
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#050505] text-white selection:bg-[#ccff00] selection:text-black">
            <Helmet>
                <title>{post.data.title ? `${post.data.title}` : 'Blog | VendorFlow'}</title>
                {post.data.description && <meta name="description" content={post.data.description} />}
                <link rel="canonical" href={`https://vendorflow.com/blog/${slug}`} />
                <meta property="og:title" content={post.data.title || "VendorFlow Blog"} />
                <meta property="og:description" content={post.data.description || ""} />
                <meta property="og:image" content={post.data.coverImage || ""} />
                <script type="application/ld+json">
                    {JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "BlogPosting",
                        "headline": post.data.title || "",
                        "description": post.data.description || "",
                        "image": post.data.coverImage || "",
                        "author": {
                            "@type": "Organization",
                            "name": post.data.author || "VendorFlow Team"
                        },
                        "publisher": {
                            "@type": "Organization",
                            "name": "VendorFlow",
                            "logo": {
                                "@type": "ImageObject",
                                "url": "https://vendorflow.com/logo.jpg"
                            }
                        },
                        "datePublished": post.data.date ? new Date(post.data.date).toISOString() : new Date().toISOString(),
                        "mainEntityOfPage": {
                            "@type": "WebPage",
                            "@id": `https://vendorflow.com/blog/${slug}`
                        }
                    })}
                </script>
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
                    <Link to="/blog" className="text-white/70 hover:text-[#ccff00] transition-colors text-sm font-bold flex items-center gap-2">
                        <ArrowLeft className="w-4 h-4" /> All Articles
                    </Link>
                </div>
            </header>

            <main className="max-w-[1200px] mx-auto px-6 pb-24 pt-32 lg:pt-40">
                {/* Hero Section */}
                <section className="mb-16">
                    <div className="flex flex-wrap gap-3 mb-6">
                        <span className="bg-[#ccff00]/10 text-[#ccff00] px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border border-[#ccff00]/20">
                            Marketplace Guide
                        </span>
                        <span className="bg-white/5 text-neutral-300 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider glass">
                            <Clock className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
                            {Math.max(1, Math.ceil(post.content.split(' ').length / 200))} min read
                        </span>
                    </div>

                    <h1 className="font-display text-5xl md:text-7xl font-bold leading-[1.05] mb-8 tracking-tighter max-w-4xl text-white">
                        {post.data.title}
                    </h1>

                    <div className="flex items-center gap-6 mb-12 text-neutral-400 border-b border-white/10 pb-10">
                        {post.data.author && (
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-white/5 glass flex items-center justify-center text-[#ccff00]">
                                    <User className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-slate-200 font-bold mb-0.5 text-base">{post.data.author}</p>
                                    <p className="text-sm flex items-center gap-1.5">
                                        <Calendar className="w-3.5 h-3.5" />
                                        {post.data.date ? new Date(post.data.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Today'}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Cover Image */}
                    {post.data.coverImage && (
                        <div className="w-full aspect-[21/9] rounded-3xl overflow-hidden glass relative shadow-2xl">
                            <img src={post.data.coverImage} alt={post.data.title} className="w-full h-full object-cover opacity-90" />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#050505]/90 via-[#050505]/20 to-transparent"></div>
                        </div>
                    )}
                </section>

                <div className="flex flex-col lg:flex-row gap-16">
                    {/* Main Article Content */}
                    <article className="lg:w-[70%] flex-1 min-w-0">
                        <div className="prose prose-invert prose-lg max-w-none 
                prose-headings:font-bold prose-headings:tracking-tight 
                prose-h2:text-3xl prose-h2:mt-16 prose-h2:mb-6 prose-h2:border-b prose-h2:border-white/10 prose-h2:pb-4
                prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-4
                prose-p:text-neutral-300 prose-p:leading-relaxed prose-p:mb-6 prose-p:font-light
                prose-a:text-[#ccff00] prose-a:no-underline hover:prose-a:underline
                prose-strong:text-white
                prose-ul:text-neutral-300 prose-li:my-2 prose-ul:font-light
                prose-blockquote:border-l-[#ccff00] prose-blockquote:bg-[#ccff00]/5 prose-blockquote:py-2 prose-blockquote:px-6 prose-blockquote:rounded-r-lg prose-blockquote:not-italic prose-blockquote:text-neutral-300
                prose-code:text-[#ccff00] prose-code:bg-white/5 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none
                prose-hr:border-white/10 prose-hr:my-12
                ">
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                rehypePlugins={[rehypeSlug]}
                            >
                                {post.content}
                            </ReactMarkdown>
                        </div>

                        {/* Footer actions */}
                        <div className="mt-20 pt-8 border-t border-white/10 flex items-center justify-between">
                            <div className="flex flex-wrap items-center gap-4">
                                <span className="text-sm text-neutral-500 uppercase tracking-widest font-bold">Share:</span>
                                <button
                                    onClick={() => {
                                        window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(post.data.title || '')}`, '_blank');
                                    }}
                                    className="px-4 py-2 bg-white/5 hover:bg-[#1DA1F2]/20 hover:text-[#1DA1F2] hover:border-[#1DA1F2]/50 text-white rounded-lg border border-white/10 transition-all text-sm font-medium"
                                >
                                    Twitter
                                </button>
                                <button
                                    onClick={() => {
                                        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`, '_blank');
                                    }}
                                    className="px-4 py-2 bg-white/5 hover:bg-[#0A66C2]/20 hover:text-[#0A66C2] hover:border-[#0A66C2]/50 text-white rounded-lg border border-white/10 transition-all text-sm font-medium"
                                >
                                    LinkedIn
                                </button>
                            </div>
                        </div>
                    </article>

                    {/* Sidebar (Sticky TOC & CTA) */}
                    <aside className="hidden lg:block lg:w-[30%] flex-shrink-0">
                        <div className="sticky top-28 space-y-8">
                            {/* Table of Contents */}
                            <nav className="glass border-white/10 rounded-2xl p-8 shadow-2xl">
                                <h4 className="font-display font-bold text-white text-lg mb-6 flex items-center gap-2">
                                    <span className="text-[#ccff00]">≡</span> Contents
                                </h4>
                                <ul className="space-y-4">
                                    {extractHeadings(post.content).map((heading, idx) => (
                                        <li key={idx}>
                                            <a
                                                href={`#${heading.id}`}
                                                className={`flex items-center gap-3 transition-all group ${heading.level === 3 ? 'ml-6' : ''} text-neutral-400 hover:text-white`}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    document.getElementById(heading.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                                    window.history.pushState(null, '', `#${heading.id}`);
                                                }}
                                            >
                                                <div className="h-[1px] w-4 bg-white/20 group-hover:bg-[#ccff00] transition-colors"></div>
                                                <span className="text-sm font-medium">{heading.text}</span>
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </nav>

                            {/* CTA Widget */}
                            <div className="relative overflow-hidden rounded-2xl p-8 neon-gradient glass border-[#ccff00]/20 shadow-2xl">
                                <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#ccff00]/20 blur-3xl rounded-full"></div>
                                <h4 className="font-display font-bold text-2xl text-white mb-4 relative z-10">Launch Your Marketplace</h4>
                                <p className="text-slate-300 text-sm mb-6 relative z-10">Start building your multi-vendor empire today with VendorFlow.</p>
                                <Link to="/apply" className="block w-full bg-[#ccff00] text-black text-center py-3 rounded-xl font-bold font-display hover:scale-[1.02] transition-transform relative z-10">
                                    Create a Store
                                </Link>
                            </div>
                        </div>
                    </aside>
                </div>
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

export default BlogPost;
