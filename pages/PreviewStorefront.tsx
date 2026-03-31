import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Navbar } from '../components/Navbar';
import { TopBar } from '../components/TopBar';
import { Hero } from '../components/Hero';
import { QuickViewModal } from '../components/QuickViewModal';
import { Product, StoreSettings, ThemeConfig, Address, ProductMedia } from '../types';
import { Cart } from '../components/Cart';
import { Checkout } from '../components/Checkout';
import { ViewAll } from '../components/ViewAll';
import { Footer } from '../components/Footer';
import { ScrollableSection } from '../components/ScrollableSection';
import { Loader2 } from 'lucide-react';

type ViewType = 'home' | 'wishlist' | 'cart' | 'checkout' | 'viewAll';

const PreviewStorefront = () => {
    const { previewId } = useParams<{ previewId: string }>();
    const navigate = useNavigate();

    const [products, setProducts] = useState<Product[]>([]);
    const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
    const [previewData, setPreviewData] = useState<Record<string, unknown> | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [currentView, setCurrentView] = useState<ViewType>('home');
    const [cartItems, setCartItems] = useState<{ product: Product, size: string, quantity: number }[]>([]);
    const [checkoutItems, setCheckoutItems] = useState<{ product: Product, size: string, quantity: number }[]>([]);
    const [wishlistIds] = useState<string[]>([]);

    const [isDarkMode, setIsDarkMode] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Categories derived list (Stable with useMemo, moved above early returns)
    const uniqueCategories = useMemo(() => {
        const cats = products.flatMap(p => {
            if (Array.isArray(p.category)) return p.category;
            if (typeof p.category === 'string') return [p.category];
            return [];
        });
        const uniqueLower = Array.from(new Set(cats.map(c => c.toLowerCase())));
        return uniqueLower.map(c => c.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')).sort();
    }, [products]);

    useEffect(() => {
        const loadPreview = async () => {
            try {
                if (!previewId) throw new Error("Preview ID missing");

                const { data, error: fetchErr } = await supabase.functions.invoke(`manage-previews/${previewId}`, {
                    method: 'GET'
                });

                if (fetchErr) throw fetchErr;
                if (data?.error) throw new Error(data.error);

                setPreviewData(data.preview);
                // The snapshot takes precedence for theme
                setStoreSettings(data.preview.snapshot as StoreSettings || {} as StoreSettings);

                // Map products - check both top-level and snapshot-embedded products
                const rawProductsData = data.products || (data.preview?.snapshot as { products?: any[] })?.products || [];
                
                if (rawProductsData && rawProductsData.length > 0) {
                    interface RawProduct extends Omit<Product, 'image' | 'images' | 'category' | 'sizes' | 'rating' | 'reviews'> {

                        image?: string;
                        images?: string[] | string;
                        category?: string | string[];
                        categories?: string | string[];
                        rating?: number | string;
                        reviews?: number | string;
                        product_media?: ProductMedia[];
                        product_variants?: { variant_name: string }[];
                    }

                    const mappedProducts = (rawProductsData as RawProduct[]).map((p): Product => {
                        const hasDiscount = p.discount_price && Number(p.discount_price) > 0;
                        const media = p.product_media || [];
                        const primaryMedia = media.find(m => m.is_primary && m.media_type !== 'video');
                        const firstImageMedia = media.find(m => m.media_type !== 'video');
                        const primaryImageUrl = primaryMedia?.file_url ?? firstImageMedia?.file_url ?? p.image ?? 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=400';
                        const images = media.filter(m => m.media_type !== 'video').map(m => m.file_url);
                        
                        // Robust category handling: ensure it's always an array of strings
                        let productCategory: string[] = [];
                        const rawCategory = p.category || p.categories;
                        if (Array.isArray(rawCategory)) {
                            productCategory = rawCategory;
                        } else if (typeof rawCategory === 'string' && rawCategory.length > 0) {
                            productCategory = [rawCategory];
                        }

                        return {
                            ...p,
                            image: primaryImageUrl,
                            images,
                            media,
                            sizes: p.product_variants?.map(v => v.variant_name) || ['Standard'],
                            category: productCategory,
                            rating: Number(p.rating) || 0,
                            reviews: Number(p.reviews) || 0,
                            price: hasDiscount ? Number(p.discount_price) : Number(p.price),
                            original_price: hasDiscount ? Number(p.price) : undefined
                        } as Product;
                    });

                    setProducts(mappedProducts);
                }


            } catch (err) {
                const error = err as Error;
                console.error("Preview load error:", error);
                setError(error.message || "Failed to load preview");
            } finally {
                setIsLoading(false);
            }
        };

        loadPreview();

        // Real-time synchronization for changes to this preview and seller's live updates
        if (previewId) {
            const channel = supabase
                .channel(`preview_sync_${previewId}`)
                .on('postgres_changes', {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'previews',
                    filter: `id=eq.${previewId}`
                }, (payload) => {
                    const newPayload = payload as { new: Record<string, unknown> };
                    if (newPayload.new) {
                        setPreviewData(newPayload.new);
                        setStoreSettings((newPayload.new.snapshot as StoreSettings) || {} as StoreSettings);
                    }
                })
                .on('broadcast', { event: 'appearance_update' }, ({ payload }) => {
                    if (payload?.settings) {
                        // For previews, we update the local snapshot temporarily
                        setStoreSettings(prev => ({ ...prev, ...payload.settings }));
                    }
                })
                .on('broadcast', { event: 'product_update' }, () => {
                    // Refresh preview data (which includes products) when a product change is broadcast
                    loadPreview();
                })
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [previewId]);

    const displayName = useMemo(() => storeSettings?.store_name || "FashionStore", [storeSettings?.store_name]);

    useEffect(() => {
        if (displayName) {
            document.title = `[Preview] ${displayName}`;
        }
    }, [displayName]);

    const themeStyles = useMemo(() => {
        const config = (storeSettings?.theme_config as ThemeConfig) || {} as ThemeConfig;
        const colors = config.colors || { primary: '#047857', secondary: '#F3F4F6', background: '#FFFFFF', text: '#1F2937' };
        const fonts = config.fonts || { heading: 'Inter', body: 'Inter' };
        const borderRadius = config.borderRadius || '0.625rem';
        
        return {
            '--primary': colors.primary,
            '--secondary': colors.secondary,
            '--background': isDarkMode ? '#0a0a0a' : colors.background,
            '--foreground': isDarkMode ? '#ffffff' : colors.text,
            '--heading-font': fonts.heading,
            '--body-font': fonts.body,
            '--radius': borderRadius,
        } as React.CSSProperties;
    }, [storeSettings, isDarkMode]);

    const addToCart = (product: Product, size: string = 'Standard') => {
        setCartItems(prev => {
            const existing = prev.find(item => item.product.id === product.id && item.size === size);
            if (existing) {
                return prev.map(item =>
                    item.product.id === product.id && item.size === size
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            return [...prev, { product, size, quantity: 1 }];
        });
        alert(`Added ${product.name} to preview bag`);
    };

    const handleCheckout = (selectedItems: { product: Product, size: string, quantity: number }[]) => {
        setCheckoutItems(selectedItems);
        setCurrentView('checkout');
    };

    const handleCategoryClick = (category: string) => {
        setSelectedCategory(category);
        setCurrentView('viewAll');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handlePlaceOrder = async (orderedItems: { product: Product, size: string, quantity: number }[], address: Address, paymentMethod: string, promotionId?: string, _discountAmount?: number) => {
        alert(`Success! Since this is a Preview Environment, no real order was placed. ${promotionId ? 'Promo applied!' : ''}`);
        setCartItems([]);
        setCurrentView('home');
        return true;
        // Mock checkout resolution
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
            </div>
        );
    }

    if (error || !previewData) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
                <h1 className="text-2xl font-bold mb-2">Preview Unavailable</h1>
                <p className="text-gray-600 mb-6">{error || "This preview has expired or doesn't exist."}</p>
                <button onClick={() => navigate('/')} className="px-6 py-2 bg-black text-white rounded">Go Home</button>
            </div>
        );
    }

    // ViewAll state

    const handleFooterLinkClick = (section: string, key: string) => {
        if (section === 'shop') {
            handleCategoryClick(key);
        } else {
            alert(`Footer link clicked: ${section} > ${key}. This is a preview environment.`);
        }
    };

    return (
        <div style={themeStyles} className="min-h-screen flex flex-col font-body bg-[var(--color-luxury-bg)]">
            <div className="bg-yellow-400 text-black text-center py-2 px-4 shadow-md font-bold text-sm z-50 sticky top-0">
                You are viewing a Preview Environment. Changes made here will not affect live customers. Checkout is disabled.
            </div>

            {currentView !== 'checkout' && <TopBar />}
            {currentView !== 'checkout' && (
                <Navbar
                    onSearch={() => { }}
                    onNavigate={(v) => {
                        if (v === 'home') setSelectedCategory(null);
                        setCurrentView(v as ViewType);
                    }}
                    onCategoryClick={handleCategoryClick}
                    wishlistCount={wishlistIds.length}
                    cartCount={cartItems.reduce((acc, i) => acc + i.quantity, 0)}
                    isDarkMode={isDarkMode}
                    toggleDarkMode={() => setIsDarkMode(!isDarkMode)}
                    user={null}
                    onLogin={() => { }}
                    categories={uniqueCategories}
                    isAdmin={false}
                    storeName={displayName}
                />
            )}

            <main className="flex-grow">
                {currentView === 'home' && (
                    <>
                        <Hero 
                            onShopCollection={() => setCurrentView('viewAll')} 
                            settings={(storeSettings as StoreSettings | null)?.theme_config?.hero || (storeSettings as StoreSettings | null)?.hero}
                        />
                        <div className="max-w-[1600px] mx-auto px-4 space-y-16 mb-20">
                            <ScrollableSection
                                title="Preview Selection"
                                products={products}
                                onViewAll={() => setCurrentView('viewAll')}
                                onQuickView={(p) => { setSelectedProduct(p); setIsModalOpen(true); }}
                                onToggleWishlist={() => { }}
                                isWishlisted={() => false}
                                onAddToCart={addToCart}
                            />
                        </div>
                    </>
                )}
                {currentView === 'cart' && (
                    <Cart
                        items={cartItems}
                        wishlistProducts={[]}
                        onRemove={(_pid, _sz) => setCartItems(prev => prev.filter(i => !(i.product.id === _pid && i.size === _sz)))}
                        onUpdateQuantity={(_pid, _sz, _d) => { /* simple quantity logic */ }}
                        onNavigateHome={() => setCurrentView('home')}
                        onNavigateWishlist={() => setCurrentView('wishlist')}
                        onMoveToWishlist={() => { }}
                        onAddToCart={addToCart}
                        onCheckout={handleCheckout}
                    />
                )}
                {currentView === 'checkout' && (
                    <Checkout
                        items={checkoutItems}
                        onPlaceOrder={handlePlaceOrder}
                        onNavigateCart={() => setCurrentView('cart')}
                        onNavigateHome={() => setCurrentView('home')}
                        isMockPreview={true} // special prop for preview mode bypassing real payment
                    />
                )}
                {currentView === 'viewAll' && (
                    <ViewAll
                        products={selectedCategory ? products.filter(p => {
                            const cats = Array.isArray(p.category) ? p.category : (typeof p.category === 'string' ? [p.category] : []);
                            return cats.some(c => typeof c === 'string' && c.toLowerCase() === selectedCategory.toLowerCase());
                        }) : products}
                        allCategories={uniqueCategories}
                        title={selectedCategory || "All Preview Products"}
                        subtitle={selectedCategory ? `Browsing our ${selectedCategory} collection` : ""}
                        onQuickView={(p) => { setSelectedProduct(p); setIsModalOpen(true); }}
                        onToggleWishlist={() => { }}
                        isWishlisted={() => false}
                        onAddToCart={addToCart}
                    />
                )}
            </main>

            {currentView !== 'checkout' && (
                <Footer
                    onLinkClick={handleFooterLinkClick}
                    branding={{
                        storeName: displayName,
                        logoUrl: storeSettings?.logo_url as string,
                        description: (storeSettings?.theme_config as ThemeConfig)?.hero?.description || (storeSettings as unknown as StoreSettings)?.hero?.description || "Elevating everyday style with premium quality sustainable apparel.",
                        socials: (storeSettings as unknown as StoreSettings)?.socials
                    }}
                    categories={uniqueCategories}
                />
            )}

            {isModalOpen && selectedProduct && (
                <QuickViewModal
                    product={selectedProduct}
                    isOpen={isModalOpen}
                    isWishlisted={false}
                    onToggleWishlist={() => {}}
                    onClose={() => setIsModalOpen(false)}
                    onAddToCart={addToCart}
                />
            )}
        </div>
    );
};

export default PreviewStorefront;
