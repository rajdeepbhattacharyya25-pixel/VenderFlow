import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Fuse from 'fuse.js';
import { supabase } from '../lib/supabase';
import { TopBar } from '../components/TopBar';
import { Navbar } from '../components/Navbar';
import { BenefitsBar } from '../components/BenefitsBar';
import { Hero } from '../components/Hero';
import { Footer } from '../components/Footer';
import { ProductCard } from '../components/ProductCard';
import { QuickViewModal } from '../components/QuickViewModal';
import { BottomNav } from '../components/BottomNav';
import { Product } from '../types';
import { Wishlist } from '../components/Wishlist';
import { Cart } from '../components/Cart';
import { Checkout } from '../components/Checkout';
import { ViewAll } from '../components/ViewAll';
import { ScrollableSection } from '../components/ScrollableSection';
import { Loader2 } from 'lucide-react';

type ViewType = 'home' | 'wishlist' | 'cart' | 'checkout' | 'viewAll';

const PreviewStorefront = () => {
    const { previewId } = useParams<{ previewId: string }>();
    const navigate = useNavigate();

    const [products, setProducts] = useState<Product[]>([]);
    const [storeSettings, setStoreSettings] = useState<any>(null);
    const [previewData, setPreviewData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [currentView, setCurrentView] = useState<ViewType>('home');
    const [cartItems, setCartItems] = useState<{ product: Product, size: string, quantity: number }[]>([]);
    const [checkoutItems, setCheckoutItems] = useState<{ product: Product, size: string, quantity: number }[]>([]);
    const [wishlistIds, setWishlistIds] = useState<string[]>([]);

    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Derived lists
    const [recommendedProducts, setRecommendedProducts] = useState<Product[]>([]);
    const [popularProducts, setPopularProducts] = useState<Product[]>([]);

    const [isDarkMode, setIsDarkMode] = useState(false);

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
                setStoreSettings(data.preview.snapshot || {});

                // Map products
                if (data.products) {
                    const mappedProducts = data.products.map((p: any) => {
                        const hasDiscount = p.discount_price && Number(p.discount_price) > 0;
                        return {
                            ...p,
                            image: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=400', // fallback
                            images: [],
                            media: [], // minimal mapping for preview
                            sizes: ['Standard'],
                            price: hasDiscount ? Number(p.discount_price) : Number(p.price),
                            originalPrice: hasDiscount ? Number(p.price) : undefined
                        };
                    });
                    setProducts(mappedProducts);
                    setRecommendedProducts([...mappedProducts].slice(0, 4));
                    setPopularProducts([...mappedProducts].slice(0, 4));
                }

            } catch (err: any) {
                console.error("Preview load error:", err);
                setError(err.message || "Failed to load preview");
            } finally {
                setIsLoading(false);
            }
        };

        loadPreview();
    }, [previewId]);

    // Theme Styles
    const themeStyles = useMemo(() => {
        if (!storeSettings?.theme_config) return {};
        const { colors, fonts, borderRadius } = storeSettings.theme_config;
        return {
            '--primary': colors.primary,
            '--secondary': colors.secondary,
            '--bg-color': isDarkMode ? '#0a0a0a' : colors.background,
            '--text-color': isDarkMode ? '#ffffff' : colors.text,
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

    const handlePlaceOrder = async (orderedItems: any, address: any, paymentMethod: string, promotionId?: string, discountAmount?: number) => {
        alert(`Success! Since this is a Preview Environment, no real order was placed. ${promotionId ? 'Promo applied!' : ''}`);
        setCartItems([]);
        setCurrentView('home');
        return true;
        // Mock checkout resolution
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
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
    const currentCategoryProducts = products;
    const uniqueCategories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));

    return (
        // eslint-disable-next-line react/forbid-dom-props
        <div style={themeStyles} className="min-h-screen flex flex-col font-body bg-[var(--color-luxury-bg)]">
            <div className="bg-yellow-400 text-black text-center py-2 px-4 shadow-md font-bold text-sm z-50 sticky top-0">
                You are viewing a Preview Environment. Changes made here will not affect live customers. Checkout is disabled.
            </div>

            {currentView !== 'checkout' && <TopBar />}
            {currentView !== 'checkout' && (
                <Navbar
                    onSearch={() => { }}
                    onNavigate={(v) => setCurrentView(v as ViewType)}
                    onCategoryClick={() => { }}
                    wishlistCount={wishlistIds.length}
                    cartCount={cartItems.reduce((acc, i) => acc + i.quantity, 0)}
                    isDarkMode={isDarkMode}
                    toggleDarkMode={() => setIsDarkMode(!isDarkMode)}
                    user={null}
                    onLogin={() => { }}
                    categories={uniqueCategories}
                    isAdmin={false}
                    storeLogo={storeSettings?.logo_url || "/logo.jpg"}
                    customTheme={{
                        primaryColor: storeSettings?.theme_config?.colors?.primary,
                        backgroundColor: storeSettings?.theme_config?.colors?.background,
                        textColor: storeSettings?.theme_config?.colors?.text
                    }}
                />
            )}

            <main className="flex-grow">
                {currentView === 'home' && (
                    <>
                        <Hero onShopCollection={() => setCurrentView('viewAll')} previewSettings={storeSettings} />
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
                        onRemove={(pid, sz) => setCartItems(prev => prev.filter(i => !(i.product.id === pid && i.size === sz)))}
                        onUpdateQuantity={(pid, sz, d) => { /* simple quantity logic */ }}
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
                        products={products}
                        title="All Preview Products"
                        subtitle=""
                        onQuickView={(p) => { setSelectedProduct(p); setIsModalOpen(true); }}
                        onToggleWishlist={() => { }}
                        isWishlisted={() => false}
                        onAddToCart={addToCart}
                    />
                )}
            </main>

            {isModalOpen && selectedProduct && (
                <QuickViewModal product={selectedProduct} onClose={() => setIsModalOpen(false)} onAddToCart={addToCart} />
            )}
        </div>
    );
};

export default PreviewStorefront;
