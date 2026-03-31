import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Fuse from 'fuse.js';
import { TopBar } from '../components/TopBar';
import { Navbar } from '../components/Navbar';
import { CompleteTheLook } from '../components/CompleteTheLook';
import { BenefitsBar } from '../components/BenefitsBar';
import { Hero } from '../components/Hero';
import { Footer } from '../components/Footer';
import { QuickViewModal } from '../components/QuickViewModal';
import { BottomNav } from '../components/BottomNav';
import { Product, StoreSettings, ProductMedia, Address } from '../types';
import { Wishlist } from '../components/Wishlist';
import { Cart } from '../components/Cart';
import { Checkout } from '../components/Checkout';
import { Account } from '../components/Account';
import { Orders } from '../components/Orders';
import { ViewAll } from '../components/ViewAll';
import { ScrollableSection } from '../components/ScrollableSection';
import { ToastContainer } from '../components/Toast';
import { InfoModal } from '../components/InfoModal';
import { HeroSkeleton, ScrollableSectionSkeleton } from '../components/Skeleton';
import { Seller, loadSellerBySlug, setCurrentSeller, isSellerAccessible, joinStore } from '../lib/seller';
import { canAddToCart, setCartSeller, clearCart, getCartItems, saveCartItems } from '../lib/cart';
import { Store, AlertCircle, AlertTriangle, ArrowLeft } from 'lucide-react';
import { clearStoreSession, StoreCustomer, getCurrentStoreCustomer, establishStoreSession } from '../lib/storeAuth';
import { LoginModal } from '../components/LoginModal';
import StoreRegister from './StoreRegister';
import { supabase } from '../lib/supabase';

import { useCartSync } from '../hooks/useCartSync';
import { useWishlist } from '../hooks/useWishlist';

type ViewType = 'home' | 'wishlist' | 'cart' | 'checkout' | 'account' | 'orders' | 'viewAll' | 'storeLogin' | 'storeRegister';

// Footer Content Data
const FOOTER_CONTENT = {
    shop: {
        'Women': "Discover our curated selection of women's apparel.",
        'Men': "Explore thoughtfully designed menswear.",
        'Kids': "A playful, durable range for little ones.",
        'Accessories': "Complete the look with hand-picked accessories.",
        'New Arrivals': "Be the first to wear our latest drops.",
        'Best Sellers': "See what other customers love."
    },
    support: {
        'Contact Us': "We're here to help.",
        'Order Status': "Track the progress of your order.",
        'Shipping Policy': "We offer standard and express shipping.",
        'Returns & Refunds': "Simple returns policy.",
        'Size Guide': "Find your best fit."
    },
    legal: {
        'Terms & Conditions': "Rules for using our store.",
        'Privacy Policy': "How we handle your data.",
        'Payment Policy': "Accepted payment methods.",
        'Cookie Policy': "How we use cookies."
    }
};


// Basic Typewriter Component
const Typewriter = ({ text, delay = 50 }: { text: string, delay?: number }) => {
    const [currentText, setCurrentText] = useState('');
    const [currentIndex, setCurrentIndex] = useState(0);

    // Reset animation when text changes (e.g. name update)
    useEffect(() => {
        setCurrentText('');
        setCurrentIndex(0);
    }, [text]);

    useEffect(() => {
        if (currentIndex < text.length) {
            const timeout = setTimeout(() => {
                setCurrentText(prev => prev + text[currentIndex]);
                setCurrentIndex(prev => prev + 1);
            }, delay);
            return () => clearTimeout(timeout);
        }
    }, [currentIndex, delay, text]);

    return <span>{currentText}</span>;
};

const SellerStorefront = () => {
    const { sellerSlug } = useParams<{ sellerSlug: string }>();
    const navigate = useNavigate();

    // Seller state
    const [seller, setSeller] = useState<Seller | null>(null);
    const [sellerLoading, setSellerLoading] = useState(true);
    const [sellerError, setSellerError] = useState<string | null>(null);
    // Data state
    const [products, setProducts] = useState<Product[]>([]);
    const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [maintenanceMode, setMaintenanceMode] = useState(false);
    const [allProducts, setAllProducts] = useState<Product[]>([]);

    useEffect(() => {
        const checkMaintenance = async () => {
            const { data: settings } = await supabase
                .from('public_platform_settings')
                .select('maintenance_mode')
                .maybeSingle();

            console.log("Seller Storefront Maintenance Check:", settings);
            if (settings?.maintenance_mode) {
                setMaintenanceMode(true);
            }
        };
        checkMaintenance();

        // Subscription for dynamic updates
        const channel = supabase.channel('maintenance_mode_seller')
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'platform_settings'
            }, (payload) => {
                if (payload.new && typeof payload.new.maintenance_mode !== 'undefined') {
                    setMaintenanceMode(payload.new.maintenance_mode);
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const [storeCustomer, setStoreCustomer] = useState<StoreCustomer | null>(null);
    const [isNameHydrating, setIsNameHydrating] = useState(true); // Prevent flash of "Friend"

    // Derived lists
    const [recommendedProducts, setRecommendedProducts] = useState<Product[]>([]);
    const [popularProducts, setPopularProducts] = useState<Product[]>([]);

    const location = useLocation();

    // Preview Mode Setup
    const searchParams = new URLSearchParams(location.search);
    const isPreviewMode = searchParams.get('preview') === 'true';
    const [canViewDrafts, setCanViewDrafts] = useState(false);

    // UI state
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    // wishlistIds managed by hook now

    // Initialize view from URL path
    const [currentView, setCurrentView] = useState<ViewType>(() => {
        const path = window.location.pathname;
        if (path.endsWith('/account')) return 'account';
        if (path.endsWith('/orders')) return 'orders';
        if (path.endsWith('/cart')) return 'cart';
        if (path.endsWith('/wishlist')) return 'wishlist';
        if (path.endsWith('/checkout')) return 'checkout';
        return 'home';
    });
    const [cartItems, setCartItems] = useState<{ product: Product, size: string, quantity: number }[]>([]);
    const [isCartLoaded, setIsCartLoaded] = useState(false);

    // Load cart items when seller is available and products are loaded
    useEffect(() => {
        if (seller && !isCartLoaded && !isLoading && allProducts.length > 0) {
            const saved = getCartItems();
            console.log("Loading cart for seller:", seller.id, "Saved:", saved);

            if (saved && saved.length > 0) {
                // Check if cart belongs to this seller
                if (saved[0].sellerId === seller.id) {
                    // Filter out items that are no longer published/accessible
                    const validSaved = saved.filter(item => 
                        allProducts.some(p => p.id === item.productId)
                    );

                    const loadedItems = validSaved.map(item => {
                        const fullProduct = allProducts.find(p => p.id === item.productId);
                        return {
                            product: fullProduct || { id: item.productId, name: item.name, price: item.price, image: item.image, seller_id: item.sellerId } as Product,
                            size: item.size,
                            quantity: item.quantity
                        };
                    });

                    setCartItems(loadedItems);
                    
                    // If some items were filtered out, update localStorage
                    if (validSaved.length !== saved.length) {
                        const flatItems = validSaved.map(item => ({
                            productId: item.productId,
                            sellerId: item.sellerId,
                            name: item.name,
                            price: item.price,
                            size: item.size,
                            quantity: item.quantity,
                            image: item.image
                        }));
                        saveCartItems(flatItems);
                    }
                }
            }
            setIsCartLoaded(true);
        } else if (seller && !isCartLoaded && !isLoading && allProducts.length === 0) {
            // No products available, just mark cart as loaded
            setIsCartLoaded(true);
        }
    }, [seller, isCartLoaded, isLoading, allProducts]);

    // Persist cart items to localStorage
    useEffect(() => {
        if (!isCartLoaded || !seller) return;

        const flatItems = cartItems.map(item => ({
            productId: item.product.id,
            sellerId: item.product.seller_id || seller.id,
            name: item.product.name,
            price: item.product.price,
            size: item.size,
            quantity: item.quantity,
            image: item.product.image
        }));
        saveCartItems(flatItems);
    }, [cartItems, seller, isCartLoaded]);

    const [checkoutItems, setCheckoutItems] = useState<{ product: Product, size: string, quantity: number }[]>([]);
    const [toasts, setToasts] = useState<{ id: number, message: string }[]>([]);
    
    const removeToast = (id: number) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    const showToast = (message: string) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message }]);
        setTimeout(() => removeToast(id), 3000);
    };

    // Store Membership State
    const [isMember, setIsMember] = useState<boolean>(false);
    const [showJoinModal, setShowJoinModal] = useState(false);
    const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

    // Info Modal
    const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
    const [infoModalData, setInfoModalData] = useState({ title: '', content: '' });

    // Cart conflict modal
    const [showCartConflictModal, setShowCartConflictModal] = useState(false);
    const [pendingCartItem, setPendingCartItem] = useState<{ product: Product, size: string } | null>(null);

    // Dark Mode
    const [isDarkMode, setIsDarkMode] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('theme') === 'dark';
        }
        return false;
    });

    // ViewAll state
    const [currentCategoryTitle, setCurrentCategoryTitle] = useState("All Products");
    const [currentCategorySubtitle, setCurrentCategorySubtitle] = useState("");
    const [currentCategoryProducts, setCurrentCategoryProducts] = useState<Product[]>([]);

    // Load seller by slug
    useEffect(() => {
        const loadSeller = async () => {
            if (!sellerSlug) {
                setSellerError('No store specified');
                setSellerLoading(false);
                return;
            }

            // Immediate session check if we have the slug (non-blocking)
            getCurrentStoreCustomer(sellerSlug)
                .then(customer => {
                    if (customer) setStoreCustomer(customer);
                })
                .catch(console.error);

            try {
                const sellerData = await loadSellerBySlug(sellerSlug);

                if (!sellerData) {
                    setSellerError('Store not found');
                    setSellerLoading(false);
                    return;
                }

                if (!isSellerAccessible(sellerData)) {
                    setSellerError('This store is currently unavailable');
                    setSellerLoading(false);
                    return;
                }

                setSeller(sellerData);
                setCurrentSeller(sellerData.id);
            } catch (error) {
                console.error('Error loading seller:', error);
                setSellerError('Failed to load store');
            } finally {
                setSellerLoading(false);
            }
        };

        loadSeller();
    }, [sellerSlug]);

    // Load products and settings for this seller
    useEffect(() => {
        if (!seller) return;

        const loadData = async () => {
            try {
                // Check for store-scoped customer session (non-blocking)
                if (seller?.slug) {
                    getCurrentStoreCustomer(seller.slug)
                        .then(customer => {
                            if (customer) setStoreCustomer(customer);
                        })
                        .catch(console.error);
                }

                // Check seller auth for preview mode
                let isAuthorizedSeller = false;
                const { data: { user }, error } = await supabase.auth.getUser();
                if (error) {
                    supabase.auth.signOut();
                }
                if (isPreviewMode && user && user.id === seller.id) {
                    isAuthorizedSeller = true;
                    setCanViewDrafts(true);
                }

                // Load products for this seller
                let productQuery = supabase
                    .from('products')
                    .select('*, product_media(file_url, is_primary, sort_order, media_type), product_variants(*)')
                    .eq('seller_id', seller.id);

                // Only allow viewing drafts if it's the authenticated seller in preview mode
                if (!isAuthorizedSeller) {
                    productQuery = productQuery.eq('is_active', true);
                }

                const { data: productsData } = await productQuery;

                // Strip demo/ghost products regardless of auth state.
                // Deduplicate by id — prevents the same product appearing twice
                // if the seller accidentally created duplicates.
                const seenIds = new Set<string>();
                const cleanProducts = (productsData || []).filter((p: Product) => {
                    if (seenIds.has(p.id)) return false;
                    seenIds.add(p.id);

                    const name = (p.name || '').toLowerCase().trim();
                    const hasNoMedia = !p.product_media?.length && !p.image && (!p.images || p.images.length === 0);
                    const isDraftName = !name || name === 'new product' || name === 'demo' || name === 'test' || name === 'demo product' || name.includes('demo');
                    
                    const isGhostProduct = (
                        isDraftName &&
                        Number(p.price) <= 0 &&
                        hasNoMedia
                    );

                    return !isGhostProduct;
                });

                const mappedProducts = cleanProducts.map((p: Product) => {
                    // Sort media: primary first, then by sort_order
                    const rawMedia: ProductMedia[] = p.product_media || [];
                    const sortedMedia = [...rawMedia].sort((a, b) => {
                        if (a.is_primary && !b.is_primary) return -1;
                        if (!a.is_primary && b.is_primary) return 1;
                        return (a.sort_order ?? 0) - (b.sort_order ?? 0);
                    });

                    const primaryMedia = sortedMedia.find(m => m.is_primary && m.media_type !== 'video');
                    const firstImageMedia = sortedMedia.find(m => m.media_type !== 'video');

                    // Fallback order: Primary from product_media -> First from product_media -> p.image -> p.images[0] -> placeholder
                    const primaryImageUrl = primaryMedia?.file_url ??
                        firstImageMedia?.file_url ??
                        p.image ??
                        (Array.isArray(p.images) && p.images[0]) ??
                        'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=400';

                    // Use product_media if available, otherwise fallback to legacy images array
                    const images = sortedMedia.length > 0
                        ? sortedMedia.filter((m: { media_type: string; file_url: string }) => m.media_type !== 'video').map((m: { file_url: string }) => m.file_url)
                        : (Array.isArray(p.images) && p.images.length > 0 ? p.images : (p.image ? [p.image] : []));

                    const sizes = (p.product_variants || []).length > 0
                        ? p.product_variants!.map((v: { variant_name: string }) => v.variant_name)
                        : ['Standard'];

                    const hasDiscount = p.discount_price && Number(p.discount_price) > 0;
                    return {
                        ...p,
                        seller_id: seller.id,
                        image: primaryImageUrl,
                        images: images,
                        variants: p.product_variants || [],
                        sizes: sizes,
                        category: (() => {
                            // Support both 'category' and 'categories' fields
                            const raw = p.category || (p as any).categories || (p as any).product_categories;
                            
                            // 1. If it's already an array, use it
                            if (Array.isArray(raw)) return raw.filter(Boolean);
                            
                            // 2. If it's a string, check if it's a JSON-encoded array (e.g. '["cat1", "cat2"]')
                            if (typeof raw === 'string' && raw.trim().startsWith('[')) {
                                try {
                                    const parsed = JSON.parse(raw);
                                    if (Array.isArray(parsed)) return parsed.filter(Boolean);
                                } catch (e) {
                                    // Not valid JSON, fall through to single string handling
                                }
                            }
                            
                            // 3. Fallback to single non-empty string
                            if (typeof raw === 'string' && raw.trim().length > 0) return [raw.trim()];
                            
                            return [];
                        })(),
                        rating: p.rating || 4.5,
                        reviews: p.reviews || 0,
                        price: hasDiscount ? Number(p.discount_price) : Number(p.price),
                        original_price: hasDiscount ? Number(p.price) : undefined
                    };
                });

                setAllProducts(mappedProducts);
                setProducts(mappedProducts);

                // Load store settings
                const { data: settingsData } = await supabase
                    .from('store_settings')
                    .select('*')
                    .eq('seller_id', seller.id)
                    .maybeSingle();

                if (settingsData) {
                    setStoreSettings(settingsData);
                }

                // Set recommended and popular products
                setRecommendedProducts(mappedProducts.filter(p => p.featured).slice(0, 8));
                setPopularProducts(mappedProducts.filter(p => p.is_bestseller).slice(0, 8));
            } catch (error) {
                console.error('Error loading store data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();

        // Real-time subscription for settings and products
        const settingsChannel = supabase.channel(`store_sync_${seller.id}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'store_settings',
                filter: `seller_id=eq.${seller.id}`
            }, (payload) => {
                if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
                    setStoreSettings(payload.new as StoreSettings);
                }
            })
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'products',
                filter: `seller_id=eq.${seller.id}`
            }, () => {
                // Refresh products when anything changes
                loadData();
            })
            .on('broadcast', { event: 'appearance_update' }, ({ payload }) => {
                if (payload?.settings) {
                    setStoreSettings(prev => ({ ...prev, ...payload.settings }));
                }
            })
            .on('broadcast', { event: 'product_update' }, () => {
                // Refresh product data when a product change is broadcast
                loadData();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(settingsChannel);
        };
    }, [seller, isPreviewMode]);

    // Track storefront page view (for seller dashboard Store Traffic KPI)
    useEffect(() => {
        if (!seller || isPreviewMode) return;

        // Session-based dedup: only log once per browser session per store
        const sessionKey = `pv_${seller.id}`;
        if (sessionStorage.getItem(sessionKey)) return;
        sessionStorage.setItem(sessionKey, '1');

        // Generate a simple anonymous visitor id from sessionStorage
        let visitorId = sessionStorage.getItem('vf_vid');
        if (!visitorId) {
            visitorId = crypto.randomUUID();
            sessionStorage.setItem('vf_vid', visitorId);
        }

        supabase
            .from('store_page_views')
            .insert({
                seller_id: seller.id,
                visitor_id: visitorId,
                page_path: window.location.pathname,
                referrer: document.referrer || null,
                user_agent: navigator.userAgent
            })
            .then(({ error }) => {
                if (error) console.error('Page view tracking error:', error);
            });
    }, [seller, isPreviewMode]);

    // Apply Theme Styles
    const themeStyles: React.CSSProperties = useMemo(() => {
        if (!storeSettings?.theme_config) return {};
        const { colors, fonts, borderRadius } = storeSettings.theme_config;

        const isOldDefault = (font?: string) => {
            if (!font) return true;
            const normalized = font.toLowerCase().replace(/['"]/g, '').trim();
            const defaults = ['space grotesk', 'spacegrotesk', 'default', 'inter', 'sans-serif', 'system-ui', 'arial', 'helvetica'];
            return defaults.includes(normalized);
        };

        return {
            '--primary': colors.primary,
            '--secondary': colors.secondary,
            '--background': isDarkMode ? '#0a0a0a' : colors.background,
            '--foreground': isDarkMode ? '#ffffff' : colors.text,
            '--font-heading': !isOldDefault(fonts.heading) ? fonts.heading : "'Playfair Display', serif",
            '--font-body': fonts.body || "'Inter', sans-serif",
            '--radius': borderRadius,
        } as React.CSSProperties;
    }, [storeSettings, isDarkMode]);

    // Update document title when storeSettings loads (prioritizes dashboard settings)
    const displayName = useMemo(() => storeSettings?.store_name || seller?.store_name || 'Store', [storeSettings?.store_name, seller?.store_name]);

    useEffect(() => {
        if (displayName) {
            document.title = displayName;
        }
    }, [displayName]);

    // Dynamic Favicon - Update to seller's logo
    useEffect(() => {
        const logoUrl = storeSettings?.logo_url;
        if (logoUrl) {
            const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
            if (link) {
                link.href = logoUrl;
            } else {
                const newLink = document.createElement('link');
                newLink.rel = 'icon';
                newLink.href = logoUrl;
                document.head.appendChild(newLink);
            }
        }

        // Cleanup: restore default favicon when leaving store
        return () => {
            const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
            if (link) {
                link.href = '/logo.jpg';
            }
        };
    }, [storeSettings?.logo_url]);



    // Check membership status - for store-scoped auth, customers are always members if logged in
    useEffect(() => {
        if (!seller || !storeCustomer) {
            setIsMember(false);
            return;
        }
        // Store customers are automatically members of the store they registered with
        setIsMember(true);
    }, [seller, storeCustomer]);

    // Self-healing session: If Supabase user exists but no store session, try to reconcile
    useEffect(() => {
        if (!seller || storeCustomer) return;

        const syncSession = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user && user.email) {
                try {
                    // Check if customer exists first to decide on auto-joining
                    const { data: customer } = await supabase
                        .from('store_customers')
                        .select('id')
                        .eq('seller_id', seller.id)
                        .or(`email.eq.${user.email?.toLowerCase()},user_id.eq.${user.id}`)
                        .maybeSingle();

                    if (customer) {
                        const { success, customer: sessionCustomer } = await establishStoreSession(seller.id, seller.slug);
                        if (success && sessionCustomer) {
                            setStoreCustomer(sessionCustomer as StoreCustomer);
                        }
                    } else {
                        // AUTO-JOIN: Authenticated user but not a store customer yet.
                        // Automatically register/link them to this store.
                        try {
                            const { data: newCustomer } = await supabase
                                .from('store_customers')
                                .insert({
                                    seller_id: seller.id,
                                    user_id: user.id,
                                    email: user.email?.toLowerCase(),
                                    display_name: user.user_metadata?.full_name || user.email?.split('@')[0],
                                    status: 'active',
                                    avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture
                                })
                                .select()
                                .single();

                            if (newCustomer) {
                                // Now establish session with the new customer record
                                const { success, customer: sessionCustomer } = await establishStoreSession(seller.id, seller.slug);
                                if (success && sessionCustomer) {
                                    setStoreCustomer(sessionCustomer as StoreCustomer);
                                    showToast('Welcome! You have joined this store.');
                                }
                            }
                        } catch (err) {
                            console.error("Auto-join error:", err);
                        }
                    }
                } catch (err) {
                    console.error("Session sync error:", err);
                }
            }
        };

        syncSession();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [seller?.id, seller?.slug, storeCustomer?.id, storeCustomer]);

    // Hydrate customer name if missing
    useEffect(() => {
        if (storeCustomer) {
            // Check if we suspect missing data
            if (!storeCustomer.display_name || storeCustomer.display_name === storeCustomer.email?.split('@')[0] || !storeCustomer.metadata?.first_name) {
                setIsNameHydrating(true);
                supabase.auth.getUser().then(({ data: { user } }) => {
                    if (user?.user_metadata) {
                        const meta = user.user_metadata;
                        const parts = [];
                        if (meta.given_name) parts.push(meta.given_name);
                        if (meta.family_name) parts.push(meta.family_name);

                        let realName = parts.length > 0 ? parts.join(' ') : (meta.full_name || meta.name || "");

                        // Fallback to email handle if name is missing
                        if (!realName && user.email) {
                            realName = user.email.split('@')[0];
                        }

                        const firstName = meta.given_name || realName.split(' ')[0];

                        if (realName || firstName) {
                            setStoreCustomer(prev => prev ? ({
                                ...prev,
                                display_name: realName || prev.display_name,
                                metadata: {
                                    ...prev.metadata,
                                    first_name: firstName || (prev.metadata as Record<string, unknown>)?.first_name as string
                                }
                            } as StoreCustomer) : null);
                        }
                    }
                }).finally(() => {
                    // Add small artificial delay to ensure smooth transition if it was too fast
                    setTimeout(() => setIsNameHydrating(false), 500);
                });
            } else {
                // Data looks good, no need to hydrate
                setIsNameHydrating(false);
            }
        } else {
            setIsNameHydrating(false);
        }
    }, [storeCustomer]);

    // Sync currentView with URL path changes
    useEffect(() => {
        const path = location.pathname;
        const view = path.split('/').pop() as ViewType;

        const validViews: ViewType[] = ['account', 'orders', 'cart', 'wishlist', 'checkout', 'home'];
        if (view && validViews.includes(view)) {
            setCurrentView(view);
        } else if (path.endsWith(sellerSlug || '')) {
            setCurrentView('home');
        }
    }, [location.pathname, sellerSlug]);

    // Dark mode effect
    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [isDarkMode]);

    const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

    const uniqueCategories = useMemo(() => {
        // Use allProducts preferrentially, fall back to products if allProducts is empty but products isn't
        const source = allProducts.length > 0 ? allProducts : (products.length > 0 ? products : []);
        
        const cats = source.flatMap(p => {
            const raw = p.category;
            // The mapping logic in loadData already ensures this is an array or empty, 
            // but we'll be extra careful here.
            if (Array.isArray(raw)) return raw;
            if (typeof raw === 'string' && (raw as string).trim().length > 0) return [(raw as string).trim()];
            return [];
        }).filter(Boolean);
        
        const uniqueLower: string[] = Array.from(new Set(cats.map(c => String(c).toLowerCase().trim())));
        const result = uniqueLower
            .filter(c => c.length > 0)
            .map(c => c.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '));
            
        return result;
    }, [allProducts, products]);

    const handleJoinStore = async () => {
        if (!seller || !storeCustomer) return;

        const { success } = await joinStore(seller.id);
        if (success) {
            setIsMember(true);
            setShowJoinModal(false);
            showToast(`Welcome to ${displayName}!`);

            // Execute pending action if any
            if (pendingAction) {
                pendingAction();
                setPendingAction(null);
            }
        } else {
            showToast('Failed to join store. Please try again.');
        }
    };

    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

    const handleSearch = async (query: string) => {
        if (!query.trim()) {
            setProducts(allProducts);
            return;
        }

        // setIsSearching logic removed as it's not being used for now
        try {
            const { data: searchResults } = await supabase.rpc('search_products', {
                query_text: query,
                seller_id_val: seller?.id
            });

            if (searchResults && searchResults.length > 0) {
                handleOpenCollection("Search Results", searchResults, `Found matching items for "${query}"`);
            } else {
                // Fallback to Fuse.js
                const fuse = new Fuse(allProducts, {
                    keys: ['name', 'description', 'category'],
                    threshold: 0.4,
                });
                const filtered = fuse.search(query).map(result => result.item);
                handleOpenCollection("Search Results", filtered);
            }
        } catch (err) {
            console.error("Search failed:", err);
        } finally {
            // setIsSearching logic removed
        }
    };

    const handleQuickView = (product: Product) => {
        setSelectedProduct(product);
        setIsModalOpen(true);
    };

    const closeQuickView = () => {
        setIsModalOpen(false);
        setTimeout(() => setSelectedProduct(null), 300);
    };

    // Hooks for Persistence
    useCartSync(storeCustomer);
    const { wishlistIds, toggleWishlist: syncToggle } = useWishlist(storeCustomer, sellerSlug);

    const toggleWishlist = async (product: Product) => {
        const isAdding = await syncToggle(product);
        showToast(isAdding ? 'Added to your wishlist' : 'Removed from wishlist');
    };

    const addToCart = (product: Product, size: string = 'Standard') => {
        if (!seller) return;

        // Check cart lock
        const { allowed } = canAddToCart(seller.id);

        if (!allowed) {
            // Show conflict modal
            setPendingCartItem({ product, size });
            setShowCartConflictModal(true);
            return;
        }

        // Check membership - allow adding if member, otherwise prompt join
        if (!isMember) {
            setPendingAction(() => () => {
                setCartSeller(seller.id);
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
                showToast(`Added ${product.name} to bag`);
            });
            setShowJoinModal(true);
            return;
        }

        // Lock cart to this seller
        setCartSeller(seller.id);

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
                showToast(`Added ${product.name} to bag`);
    };

    const handleClearCartAndAdd = () => {
        if (!pendingCartItem || !seller) return;

        clearCart();
        setCartItems([]);
        const { product, size } = pendingCartItem;
        setCartItems([{ product, size, quantity: 1 }]);
        showToast(`Cart cleared. Added ${product.name} to bag`);

        setShowCartConflictModal(false);
        setPendingCartItem(null);
    };

    const removeFromCart = (productId: string, size: string) => {
        setCartItems(prev => prev.filter(item => !(item.product.id === productId && item.size === size)));
        showToast('Removed item from bag');
    };

    const moveToWishlist = (product: Product, size: string) => {
        setCartItems(prev => prev.filter(item => !(item.product.id === product.id && item.size === size)));
        if (!wishlistIds.includes(product.id)) {
            toggleWishlist(product);
        } else {
            showToast('Saved to wishlist');
        }
    };

    const updateCartQuantity = (productId: string, size: string, delta: number) => {
        setCartItems(prev => prev.map(item => {
            if (item.product.id === productId && item.size === size) {
                return { ...item, quantity: Math.max(1, item.quantity + delta) };
            }
            return item;
        }));
    };

    const handleCheckout = async (selectedItems: { product: Product, size: string, quantity: number }[]) => {
        // Check if user is authenticated
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            // Store checkout items and show login modal
            setCheckoutItems(selectedItems);
            setIsLoginModalOpen(true);
            return;
        }

        setCheckoutItems(selectedItems);
        handleNavigate('checkout');
    };

    const handlePlaceOrder = async (orderedItems: { product: Product, size: string, quantity: number }[], address: Address, paymentMethod: string, promotionId?: string, discountAmount?: number): Promise<boolean> => {
        try {
            // 1. Get User
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                alert("Please sign in to place an order.");
                setIsLoginModalOpen(true);
                return false;
            }

            // 3. Calculate Totals
            const subtotal = orderedItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
            const discountedSubtotal = Math.max(0, subtotal - (discountAmount || 0));
            const shippingFee = storeSettings?.shipping_fee ?? 199;
            const freeThreshold = storeSettings?.free_shipping_threshold ?? 2500;
            const shippingCost = (freeThreshold > 0 && discountedSubtotal >= freeThreshold) ? 0 : shippingFee;
            const tax = discountedSubtotal * (storeSettings?.tax_percentage || 0.12);
            const total = discountedSubtotal + shippingCost + tax;

            // 4. Insert Order
            const { data: order, error } = await supabase
                .from('orders')
                .insert({
                    seller_id: seller.id,
                    customer_id: user.id,
                    total: total,
                    status: 'pending',
                    shipping_address: address, // Correct column
                    payment_method: paymentMethod,
                    promotion_id: promotionId,
                    discount_amount: discountAmount || 0,
                    items: orderedItems.map(item => ({
                        product_id: item.product.id,
                        name: item.product.name,
                        price: item.product.price,
                        size: item.size,
                        quantity: item.quantity,
                        image: item.product.image,
                    })),
                })
                .select()
                .single();

            if (error) {
                console.error("Supabase Order Error:", error);
                alert(`Order Error: ${error.message} - Prop: ${error.details}`);
                return false;
            }

            // 4.1 Record Promo Usage
            if (promotionId) {
                const customerEmail = user.email || storeCustomer?.email || 'guest@example.com';
                try {
                    await supabase.from('promotion_usages').insert({
                        promotion_id: promotionId,
                        order_id: order.id,
                        customer_email: customerEmail
                    });
                    await supabase.rpc('increment_promotion_uses', { promo_id: promotionId });
                } catch (err) {
                    console.error("Failed to record promo usage:", err);
                }
            }

            console.log("Order placed:", order);

            // 5. Clear Cart (Local + Storage)
            setCartItems(prev => {
                const orderedKeys = new Set(orderedItems.map(i => `${i.product.id}-${i.size}`));
                const remaining = prev.filter(item => !orderedKeys.has(`${item.product.id}-${item.size}`));

                // Update persistent storage
                const flatItems = remaining.map(item => ({
                    productId: item.product.id,
                    sellerId: item.product.seller_id || seller.id,
                    name: item.product.name,
                    price: item.product.price,
                    size: item.size,
                    quantity: item.quantity,
                    image: item.product.image
                }));
                saveCartItems(flatItems);

                return remaining;
            });

            showToast('Order placed successfully!');
            return true;

        } catch (err) {
            const error = err as Error;
            console.error("Handle Place Order Exception:", error);
            alert(`System Error: ${error.message}`);
            return false;
        }
    };

    const isWishlisted = (productId: string) => wishlistIds.includes(productId);

    const wishlistedProducts = products.filter(p => wishlistIds.includes(p.id));

    const cartTotalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

    // Theme Layout Config
    const showHero = storeSettings?.theme_config?.layout?.show_hero !== false; // Default true

    const handleNavigate = (view: ViewType) => {
        // If not logged in, redirect to login
        if ((view === 'account' || view === 'orders') && !storeCustomer) {
            handleNavigate('storeLogin');
            return;
        }

        const currentSearch = location.search;

        // Update URL to match view while preserving search parameters (like ?preview=true)
        if (view === 'home') {
            navigate(`/${sellerSlug}${currentSearch}`);
        } else if (view === 'storeLogin') {
            navigate(`/${sellerSlug}/${currentSearch}`);
            setIsLoginModalOpen(true);
        } else if (view === 'storeRegister') {
            navigate(`/${sellerSlug}/register${currentSearch}`);
        } else {
            navigate(`/${sellerSlug}/${view}${currentSearch}`);
        }

        setCurrentView(view);
        window.scrollTo(0, 0);
    };

    const handleOpenCollection = (title: string, items: Product[], subtitle: string = "") => {
        setCurrentCategoryTitle(title);
        setCurrentCategorySubtitle(subtitle);
        setCurrentCategoryProducts(items);
        handleNavigate('viewAll');
    };

    const handleCategoryClick = (category: string) => {
        const filtered = allProducts.filter(p => Array.isArray(p.category) ? p.category.some(c => c.toLowerCase() === category.toLowerCase()) : p.category === category);
        handleOpenCollection(category, filtered);
    };

    const handleFooterLinkClick = (section: 'shop' | 'company' | 'legal', key: string) => {
        if (section === 'shop') {
            if (key === 'New Arrivals') {
                handleOpenCollection(key, allProducts);
            } else if (key === 'Best Sellers') {
                handleOpenCollection(key, popularProducts);
            } else {
                // Filter by category from master list (case-insensitive)
                const filtered = allProducts.filter(p => Array.isArray(p.category) ? p.category.some(c => c.toLowerCase() === key.toLowerCase()) : p.category === key);
                handleOpenCollection(key, filtered);
            }
        } else {
            const contentMap = section === 'company' ? FOOTER_CONTENT.support : FOOTER_CONTENT.legal;
            const content = contentMap[key as keyof typeof contentMap] || "";
            setInfoModalData({ title: key, content });
            setIsInfoModalOpen(true);
        }
    };

    // Loading state
    if (sellerLoading) {
        return (
            <div className="min-h-screen bg-white dark:bg-neutral-950 flex flex-col items-center justify-center p-4">
                <Store className="w-16 h-16 text-emerald-500 animate-pulse mb-4" />
                <p className="text-neutral-500">Loading store...</p>
            </div>
        );
    }

    // Error state
    if (sellerError || !seller) {
        return (
            <div className="min-h-screen bg-white dark:bg-neutral-950 flex flex-col items-center justify-center p-4">
                <AlertTriangle className="w-16 h-16 text-amber-500 mb-4" />
                <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">
                    {sellerError || 'Store not found'}
                </h1>
                <p className="text-neutral-500 mb-6">
                    The store you're looking for doesn't exist or is currently unavailable.
                </p>
                <button
                    onClick={() => navigate('/')}
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors"
                >
                    <ArrowLeft size={18} />
                    Go to Homepage
                </button>
            </div>
        );
    }

    const renderContent = () => {
        switch (currentView) {
            case 'checkout':
                return (
                    <Checkout
                        items={checkoutItems}
                        shippingFee={storeSettings?.shipping_fee}
                        freeShippingThreshold={storeSettings?.free_shipping_threshold}
                        onPlaceOrder={handlePlaceOrder}
                        onNavigateCart={() => handleNavigate('cart')}
                        onNavigateHome={() => handleNavigate('home')}
                        storeCustomer={storeCustomer}
                    />
                );
            case 'wishlist':
                return (
                    <Wishlist
                        products={wishlistedProducts}
                        onQuickView={handleQuickView}
                        onToggleWishlist={toggleWishlist}
                        onNavigateHome={() => handleNavigate('home')}
                        onAddToCart={addToCart}
                    />
                );
            case 'cart':
                return (
                    <>
                        <Cart
                            items={cartItems}
                            wishlistProducts={wishlistedProducts}
                            onRemove={removeFromCart}
                            onUpdateQuantity={updateCartQuantity}
                            onNavigateHome={() => handleNavigate('home')}
                            onNavigateWishlist={() => handleNavigate('wishlist')}
                            onMoveToWishlist={moveToWishlist}
                            onAddToCart={addToCart}
                            onCheckout={handleCheckout}
                        />
                        <div className="max-w-7xl mx-auto px-4 md:px-8 -mt-20 mb-20">
                            <CompleteTheLook 
                                cartItems={cartItems}
                                allProducts={allProducts}
                                onAddToCart={addToCart}
                                onQuickView={handleQuickView}
                            />
                        </div>
                    </>
                );
            case 'storeLogin':
                // Redirect to home and show login modal
                handleNavigate('home');
                setIsLoginModalOpen(true);
                return null;
            case 'storeRegister':
                return seller ? (
                    <StoreRegister
                        seller={seller}
                        onSuccess={async () => {
                            const session = await getCurrentStoreCustomer(seller.slug);
                            setStoreCustomer(session);
                            handleNavigate('home');
                        }}
                    />
                ) : null;
            case 'account':
                return (
                    <Account
                        onNavigate={handleNavigate}
                        showToast={showToast}
                        storeCustomer={storeCustomer}
                        onLogout={async () => {
                            if (seller) {
                                clearStoreSession(seller.slug);
                                setStoreCustomer(null);
                                await supabase.auth.signOut();
                            }
                            showToast("Signed out successfully");
                            handleNavigate('home');
                        }}
                    />
                );
            case 'orders':
                return seller ? (
                    <Orders
                        onNavigate={handleNavigate}
                        onAddToCart={addToCart}
                        showToast={showToast}
                        sellerId={seller.id}
                        storeCustomer={storeCustomer}
                    />
                ) : null;
            case 'viewAll':
                return (
                    <ViewAll
                        products={currentCategoryProducts.length > 0 ? currentCategoryProducts : products}
                        allCategories={uniqueCategories}
                        title={currentCategoryTitle}
                        subtitle={currentCategorySubtitle}
                        onQuickView={handleQuickView}
                        onToggleWishlist={toggleWishlist}
                        isWishlisted={isWishlisted}
                        onAddToCart={(p) => addToCart(p)}
                    />
                );
            case 'home':
                return (
                    <>
                        {storeCustomer && (
                            <div className="w-full text-center py-6 bg-gradient-to-r from-emerald-50 via-white to-emerald-50 dark:from-neutral-900 dark:via-neutral-900 dark:to-neutral-900 border-b border-emerald-100 dark:border-white/10 transition-colors">
                                <h1 className="text-2xl md:text-3xl font-heading font-semibold text-gray-900 dark:text-gray-50 min-h-[1.5em] flex items-center justify-center gap-2">
                                    {isNameHydrating ? (
                                        <span className="animate-pulse">Welcome...</span>
                                    ) : (
                                        <>
                                            <span className="text-emerald-600 dark:text-emerald-400">👋</span>
                                            <Typewriter
                                                text={`Welcome to our little corner, ${storeCustomer.metadata?.first_name || storeCustomer.display_name?.split(' ')[0] || storeCustomer.email?.split('@')[0] || 'there'}!!`}
                                                delay={20}
                                            />
                                        </>
                                    )}
                                </h1>
                            </div>
                        )}
                        {
                            isLoading ? (
                                <HeroSkeleton />
                            ) : showHero && (
                                <Hero
                                    onShopCollection={() => handleOpenCollection("All Products", allProducts)}
                                    settings={(storeSettings as StoreSettings | null)?.theme_config?.hero || (storeSettings as StoreSettings | null)?.hero}
                                />
                            )
                        }
                        <div className="max-w-[1600px] mx-auto px-4 md:px-8 space-y-16 mb-20" style={themeStyles}>
                            <section>
                                {isLoading ? (
                                    <ScrollableSectionSkeleton />
                                ) : (
                                    <ScrollableSection
                                        title="New Arrivals"
                                        badge="Just Dropped"
                                        badgeColor="text-primary"
                                        products={products}
                                        onViewAll={() => handleOpenCollection("New Arrivals", allProducts)}
                                        onQuickView={handleQuickView}
                                        onToggleWishlist={toggleWishlist}
                                        isWishlisted={isWishlisted}
                                        onAddToCart={(p) => addToCart(p)}
                                    />
                                )}
                            </section>

                            {recommendedProducts.length > 0 && (
                                <section className="bg-gray-50 dark:bg-neutral-900/50 -mx-4 md:-mx-8 px-4 md:px-8 py-16 rounded-[2.5rem] transition-colors">
                                    {isLoading ? (
                                        <ScrollableSectionSkeleton />
                                    ) : (
                                        <ScrollableSection
                                            title="Recommendations"
                                            badge="Curated For You"
                                            badgeColor="text-amber-600"
                                            products={recommendedProducts}
                                            onViewAll={() => handleOpenCollection("Recommended", recommendedProducts)}
                                            onQuickView={handleQuickView}
                                            onToggleWishlist={toggleWishlist}
                                            isWishlisted={isWishlisted}
                                            onAddToCart={(p) => addToCart(p)}
                                            backgroundVariant="gradient"
                                        />
                                    )}
                                </section>
                            )}

                            {popularProducts.length > 0 && (
                                <section className="bg-white dark:bg-white/5 -mx-4 md:-mx-8 px-4 md:px-8 py-12 rounded-3xl border-t border-b border-neutral-100 dark:border-white/10 transition-colors">
                                    {isLoading ? (
                                        <ScrollableSectionSkeleton />
                                    ) : (
                                        <ScrollableSection
                                            title="Most Popular"
                                            badge="Trending Now"
                                            badgeColor="text-amber-500"
                                            products={popularProducts}
                                            onViewAll={() => handleOpenCollection("Most Popular", popularProducts)}
                                            onQuickView={handleQuickView}
                                            onToggleWishlist={toggleWishlist}
                                            isWishlisted={isWishlisted}
                                            onAddToCart={(p) => addToCart(p)}
                                            backgroundVariant="default"
                                        />
                                    )}
                                </section>
                            )}

                            <section className="py-16 px-4">
                                <div className="relative overflow-hidden rounded-3xl mx-auto max-w-6xl border border-gray-200 dark:border-neutral-800 transition-colors">
                                    {/* Header with gradient */}
                                    <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 dark:from-emerald-800 dark:to-emerald-900 px-8 md:px-16 pt-12 pb-10 text-center">
                                        <h2 className="text-3xl md:text-4xl font-heading font-semibold text-white mb-3 tracking-tight">
                                            Explore Our Collections
                                        </h2>
                                        <p className="text-emerald-100 dark:text-emerald-200 text-base md:text-lg max-w-lg mx-auto leading-relaxed">
                                            Browse by category to find exactly what you're looking for
                                        </p>
                                    </div>

                                    {/* Category pills */}
                                    <div className="bg-gray-50 dark:bg-neutral-900 px-8 md:px-16 py-10">
                                        <div className="flex flex-wrap justify-center gap-3 w-full max-w-4xl mx-auto">
                                            {uniqueCategories.map((category) => (
                                                <button
                                                    key={category}
                                                    onClick={() => handleCategoryClick(category)}
                                                    className="px-6 py-3 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-full text-sm font-semibold text-gray-800 dark:text-gray-200 hover:bg-emerald-50 hover:border-emerald-400 hover:text-emerald-700 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-400 dark:hover:border-emerald-600 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                                                >
                                                    {category}
                                                </button>
                                            ))}
                                            <button
                                                onClick={() => handleOpenCollection("Most Popular", popularProducts)}
                                                className="px-6 py-3 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-full text-sm font-semibold text-gray-800 dark:text-gray-200 hover:bg-emerald-50 hover:border-emerald-400 hover:text-emerald-700 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-400 dark:hover:border-emerald-600 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                                            >
                                                🔥 Best Sellers
                                            </button>
                                            <button
                                                onClick={() => handleOpenCollection("New Arrivals", allProducts)}
                                                className="px-6 py-3 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-full text-sm font-semibold text-gray-800 dark:text-gray-200 hover:bg-emerald-50 hover:border-emerald-400 hover:text-emerald-700 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-400 dark:hover:border-emerald-600 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                                            >
                                                ✨ New Arrivals
                                            </button>
                                        </div>

                                        <div className="text-center mt-8">
                                            <button
                                                onClick={() => handleOpenCollection("All Products", allProducts)}
                                                className="inline-flex items-center gap-2 px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white rounded-full font-semibold text-sm shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/30 transition-all duration-200 hover:-translate-y-0.5"
                                            >
                                                View All Products
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>
                    </>
                );
        }
    };

    if (maintenanceMode) {
        return (
            <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-4 font-body">
                <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl animate-in fade-in zoom-in-95 duration-300">
                    <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertCircle size={40} className="text-amber-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2 font-heading">Store Maintenance</h1>
                    <p className="text-neutral-400 mb-6">
                        This store is currently unavailable due to platform maintenance. Please check back soon.
                    </p>
                    <div className="bg-neutral-800/50 rounded-xl p-4 text-sm text-neutral-300 border border-neutral-700">
                        <p className="font-medium text-white mb-1">Status Updates</p>
                        We apologize for the inconvenience.
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col font-body pb-[80px] md:pb-0 bg-white dark:bg-neutral-950 transition-colors duration-300 overflow-x-hidden" style={themeStyles}>
            {/* Preview Mode Indicator */}
            {isPreviewMode && canViewDrafts && (
                <div className="w-full bg-amber-500 text-amber-950 text-xs sm:text-sm font-bold py-1.5 px-4 flex items-center justify-center gap-2 z-[60] sticky top-0 shadow-sm shadow-amber-500/20">
                    <span className="animate-pulse">⚡</span>
                    Preview Mode — Not Live (Only visible to you)
                </div>
            )}
            <QuickViewModal
                product={selectedProduct}
                isOpen={isModalOpen}
                onClose={closeQuickView}
                isWishlisted={selectedProduct ? isWishlisted(selectedProduct.id) : false}
                onToggleWishlist={toggleWishlist}
                onAddToCart={addToCart}
            />
            {currentView !== 'checkout' && <TopBar />}
            {currentView !== 'checkout' && (
                <div className={isModalOpen ? "relative z-0" : "relative z-50"}>
                    <Navbar
                        onNavigate={(view) => {
                            if (view === 'viewAll') {
                                handleOpenCollection("All Products", allProducts);
                            } else {
                                handleNavigate(view);
                            }
                        }}
                        onCategoryClick={handleCategoryClick}
                        onSearch={handleSearch}
                        wishlistCount={wishlistIds.length}
                        cartCount={cartTotalItems}
                        isDarkMode={isDarkMode}
                        toggleDarkMode={toggleDarkMode}
                        onLogin={() => handleNavigate('storeLogin')}
                        user={storeCustomer}
                        storeName={displayName}
                        storeLogo={storeSettings?.logo_url}
                        categories={uniqueCategories}
                        products={products}
                        onProductSelect={(product) => handleQuickView(product)}
                    />
                </div>
            )}
            {currentView !== 'checkout' && <BenefitsBar badges={storeSettings?.trust_badges} />}

            <main className="flex-grow">
                {renderContent()}
            </main>

            {currentView !== 'checkout' && (
                <Footer
                    onLinkClick={handleFooterLinkClick}
                    branding={{
                        storeName: displayName,
                        logoUrl: storeSettings?.logo_url,
                        description: storeSettings?.hero?.description || "Elevating everyday style with premium quality sustainable apparel. Designed for modern life.",
                        socials: storeSettings?.socials
                    }}
                    categories={uniqueCategories}
                />
            )}

            {currentView !== 'checkout' && (
                <BottomNav
                    onNavigate={(view) => {
                        if (view === 'viewAll') {
                            handleOpenCollection("All Products", allProducts);
                        } else {
                            handleNavigate(view);
                        }
                    }}
                    cartCount={cartTotalItems}
                    wishlistCount={wishlistIds.length}
                    activeTab={currentView}
                />
            )}


            <InfoModal
                isOpen={isInfoModalOpen}
                onClose={() => setIsInfoModalOpen(false)}
                title={infoModalData.title}
                content={infoModalData.content}
            />

            {/* Join Store Modal */}
            {showJoinModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-neutral-900 rounded-2xl p-6 max-w-md w-full shadow-2xl">
                        <Store className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-center text-neutral-900 dark:text-white mb-2">
                            Join {displayName}
                        </h3>
                        <p className="text-neutral-600 dark:text-neutral-400 text-center mb-6">
                            To shop at this store, you need to join as a customer. This helps us provide you with the best service.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowJoinModal(false);
                                    setPendingAction(null);
                                }}
                                className="flex-1 px-4 py-3 border border-neutral-300 dark:border-neutral-700 rounded-xl font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleJoinStore}
                                className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors"
                            >
                                Join Store
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Cart Conflict Modal */}
            {showCartConflictModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-neutral-900 rounded-2xl p-6 max-w-md w-full shadow-2xl">
                        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-center text-neutral-900 dark:text-white mb-2">
                            Different Store
                        </h3>
                        <p className="text-neutral-600 dark:text-neutral-400 text-center mb-6">
                            Your cart contains items from another store. Would you like to clear your cart and add this item?
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowCartConflictModal(false);
                                    setPendingCartItem(null);
                                }}
                                className="flex-1 px-4 py-3 border border-neutral-300 dark:border-neutral-700 rounded-xl font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleClearCartAndAdd}
                                className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors"
                            >
                                Clear & Add
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <LoginModal
                isOpen={isLoginModalOpen}
                onClose={() => setIsLoginModalOpen(false)}
                initialMode="customer"
                sellerId={seller.id}
                sellerSlug={seller.slug}
            />

            <ToastContainer toasts={toasts} removeToast={removeToast} />
        </div>
    );
};

export default SellerStorefront;
