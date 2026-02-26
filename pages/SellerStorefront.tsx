import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Fuse from 'fuse.js';
import { TopBar } from '../components/TopBar';
import { Navbar } from '../components/Navbar';
import { BenefitsBar } from '../components/BenefitsBar';
import { Hero } from '../components/Hero';
import { Footer } from '../components/Footer';
import { QuickViewModal } from '../components/QuickViewModal';
import { BottomNav } from '../components/BottomNav';
import { Product } from '../types';
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
import { supabase } from '../lib/supabase';
import { Seller, loadSellerBySlug, setCurrentSeller, isSellerAccessible, checkStoreMembership, joinStore } from '../lib/seller';
import { canAddToCart, setCartSeller, getCartSeller, clearCart, getCartItems, saveCartItems } from '../lib/cart';
import { Store, AlertTriangle, ArrowLeft, AlertCircle } from 'lucide-react';
import { clearStoreSession, StoreCustomer, getCurrentStoreCustomer, establishStoreSession } from '../lib/storeAuth';
import { LoginModal } from '../components/LoginModal';
import StoreRegister from './StoreRegister';

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
    const [storeSettings, setStoreSettings] = useState<any>(null);
    useEffect(() => {
        if (storeSettings) console.log("Debugging Store Settings:", storeSettings);
    }, [storeSettings]);
    const [isLoading, setIsLoading] = useState(true);
    const [maintenanceMode, setMaintenanceMode] = useState(false); // Add Maintenance State

    useEffect(() => {
        const checkMaintenance = async () => {
            const { data: settings } = await supabase
                .from('platform_settings')
                .select('maintenance_mode')
                .single();

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

    // Load cart items when seller is available
    useEffect(() => {
        if (seller && !isCartLoaded) {
            const saved = getCartItems();
            console.log("Loading cart for seller:", seller.id, "Saved:", saved);

            if (saved && saved.length > 0) {
                // Check if cart belongs to this seller or if we should allow migration/clearing
                // For now, strict check:
                if (saved[0].sellerId === seller.id) {
                    const loadedItems = saved.map(item => ({
                        product: {
                            id: item.productId,
                            name: item.name,
                            price: item.price,
                            image: item.image || '',
                            seller_id: item.sellerId,
                            sizes: [item.size],
                            category: 'Unknown',
                            rating: 0,
                            reviews: 0
                        } as Product,
                        size: item.size,
                        quantity: item.quantity
                    }));
                    setCartItems(loadedItems);
                }
            }
            setIsCartLoaded(true);
        }
    }, [seller, isCartLoaded]);

    // Persist cart items to localStorage
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
                if (isPreviewMode) {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user && user.id === seller.id) {
                        isAuthorizedSeller = true;
                        setCanViewDrafts(true);
                    }
                }

                // Load products for this seller
                let productQuery = supabase
                    .from('products')
                    .select('*, product_media(file_url, is_primary), product_variants(*)')
                    .eq('seller_id', seller.id);

                // Only allow viewing drafts if it's the authenticated seller in preview mode
                if (!isAuthorizedSeller) {
                    productQuery = productQuery.eq('is_active', true);
                }

                const { data: productsData } = await productQuery;

                const mappedProducts = (productsData || []).map((p: any) => {
                    const images = p.product_media?.map((m: any) => m.file_url) || [];
                    const sizes = p.product_variants?.length > 0
                        ? p.product_variants.map((v: any) => v.variant_name)
                        : ['Standard'];
                    const hasDiscount = p.discount_price && Number(p.discount_price) > 0;
                    return {
                        ...p,
                        seller_id: seller.id,
                        image: images.length > 0 ? images[0] : 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=400',
                        images: images,
                        variants: p.product_variants || [],
                        sizes: sizes,
                        rating: p.rating || 4.5,
                        reviews: p.reviews || 0,
                        price: hasDiscount ? Number(p.discount_price) : Number(p.price),
                        originalPrice: hasDiscount ? Number(p.price) : undefined
                    };
                });

                setProducts(mappedProducts);
                setRecommendedProducts([...mappedProducts].sort(() => 0.5 - Math.random()).slice(0, 4));
                setPopularProducts([...mappedProducts].sort(() => 0.5 - Math.random()).slice(0, 4));

                // Load store settings
                const { data: settingsData } = await supabase
                    .from('store_settings')
                    .select('*')
                    .eq('seller_id', seller.id)
                    .maybeSingle();

                if (settingsData) {
                    setStoreSettings(settingsData);
                }
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
                    setStoreSettings(payload.new);
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
            .subscribe();

        return () => {
            supabase.removeChannel(settingsChannel);
        };
    }, [seller]);

    // Apply Theme Styles
    const themeStyles = useMemo(() => {
        if (!storeSettings?.theme_config) return {};
        const { colors, fonts, borderRadius } = storeSettings.theme_config;

        // In dark mode, we largely override the user's custom text/bg colors to ensure readability
        // unless we want to support "custom dark themes" later.
        // For now, force standard dark mode colors which are handled by Tailwind's dark: classes
        // but we still pass fonts and radius.

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

    // Update document title when storeSettings loads (prioritizes dashboard settings)
    useEffect(() => {
        const displayName = storeSettings?.store_name || seller?.store_name;
        if (displayName) {
            document.title = `${displayName} - Modern Apparel`;
        }
    }, [storeSettings?.store_name, seller?.store_name]);

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
                // If user is authenticated with Supabase, try to establish store session
                // This handles both existing customers and auto-joining if implemented server-side
                // Current implementation of establishStoreSession will verify user and set cookie if customer exists

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
                            const { data: newCustomer, error: joinError } = await supabase
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
    }, [seller, storeCustomer]);

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
                                    first_name: firstName || prev.metadata?.first_name
                                }
                            }) : null);
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
    }, [storeCustomer?.id]);

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
        const cats = products.map(p => p.category).filter((c): c is string => !!c);
        const uniqueLower: string[] = Array.from(new Set(cats.map(c => c.toLowerCase())));
        return uniqueLower.map(c => c.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '));
    }, [products]);

    const showToast = (message: string) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message }]);
    };

    const removeToast = (id: number) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    const handleJoinStore = async () => {
        if (!seller) return;

        // If not logged in, redirect to store login
        if (!storeCustomer) {
            setCurrentView('storeLogin');
            return;
        }

        const { success, error } = await joinStore(seller.id);
        if (success) {
            setIsMember(true);
            setShowJoinModal(false);
            showToast(`Welcome to ${seller.store_name}!`);

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

    const handleLogin = () => {
        setIsLoginModalOpen(true);
    };

    const handleSearch = (query: string) => {
        if (!query.trim()) {
            return;
        }

        const fuse = new Fuse(products, {
            keys: ['name', 'description'],
            threshold: 0.4,
            includeScore: true,
            ignoreLocation: true
        });

        const filtered = fuse.search(query).map(result => result.item);
        setProducts(filtered);
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
    const { wishlistIds, toggleWishlist: syncToggle } = useWishlist(storeCustomer);

    const toggleWishlist = async (product: Product) => {
        const isAdding = await syncToggle(product);
        showToast(isAdding ? 'Added to your wishlist' : 'Removed from wishlist');
    };

    const addToCart = (product: Product, size: string = 'Standard') => {
        if (!seller) return;

        // Check cart lock
        const { allowed, currentSellerId } = canAddToCart(seller.id);

        if (!allowed) {
            // Show conflict modal
            setPendingCartItem({ product, size });
            setShowCartConflictModal(true);
            return;
        }

        // Check membership - allow adding if member, otherwise prompt join
        if (!isMember) {
            setPendingAction(() => () => {
                // Determine logic: 
                // Option A: Just add to cart after join.
                // Option B: Re-call addToCart logic (but be careful of recursion/state).
                // Simplest: Duplicate the add logic here or cleaner:

                // Let's just do the add logic here directly to ensure it happens
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
        setCartSeller(seller.id);

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

    const handlePlaceOrder = async (orderedItems: { product: Product, size: string, quantity: number }[], address: any, paymentMethod: string, promotionId?: string, discountAmount?: number): Promise<boolean> => {
        try {
            console.log("Placing order...", { orderedItems, address, paymentMethod, promotionId, discountAmount });

            // 1. Get User
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                // If using store session but no supabase session (rare but possible with custom auth), try to use storeCustomer
                // But for RLS we need a real user. 
                // For now, assume Supabase Check or fallback.
                alert("Please sign in to place an order.");
                setIsLoginModalOpen(true);
                return false;
            }

            // 2. Validate Membership (Optional strictness, but good for consistency)
            // if (!isMember) ... (Already handled by UI likely, but safety check ok)

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

        } catch (err: any) {
            console.error("Handle Place Order Exception:", err);
            alert(`System Error: ${err.message}`);
            return false;
        }
    };



    const isWishlisted = (productId: string) => wishlistIds.includes(productId);

    const wishlistedProducts = products.filter(p => wishlistIds.includes(p.id));

    const cartTotalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

    // Theme Layout Config
    const showHero = storeSettings?.theme_config?.layout?.show_hero !== false; // Default true
    const showFeatured = storeSettings?.theme_config?.layout?.show_featured !== false; // Default true
    const showReviews = storeSettings?.theme_config?.layout?.show_reviews !== false; // Default true

    const handleNavigate = (view: ViewType) => {
        // If not logged in, redirect to login
        if ((view === 'account' || view === 'orders') && !storeCustomer) {
            handleNavigate('storeLogin');
            return;
        }

        // Update URL to match view
        if (view === 'home') {
            navigate(`/store/${sellerSlug}`);
        } else if (view === 'storeLogin') {
            navigate(`/store/${sellerSlug}/`);
            setIsLoginModalOpen(true);
        } else if (view === 'storeRegister') {
            navigate(`/store/${sellerSlug}/register`);
        } else {
            navigate(`/store/${sellerSlug}/${view}`);
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
        const filtered = products.filter(p => p.category?.toLowerCase() === category.toLowerCase());
        handleOpenCollection(category, filtered);
    };

    const handleFooterLinkClick = (section: 'shop' | 'support' | 'legal', key: string) => {
        if (section === 'shop') {
            if (key === 'New Arrivals') {
                handleOpenCollection(key, products);
            } else if (key === 'Best Sellers') {
                handleOpenCollection(key, popularProducts);
            } else {
                // Filter by category (case-insensitive)
                const filtered = products.filter(p => p.category?.toLowerCase() === key.toLowerCase());
                handleOpenCollection(key, filtered);
            }
        } else {
            const contentMap = section === 'support' ? FOOTER_CONTENT.support : FOOTER_CONTENT.legal;
            const content = contentMap[key as keyof typeof contentMap] || "";
            setInfoModalData({ title: key, content });
            setIsInfoModalOpen(true);
        }
    };

    // Loading state
    if (sellerLoading) {
        return (
            <div className="min-h-screen bg-white dark:bg-neutral-950 flex flex-col items-center justify-center p-4">
                <Store className="w-16 h-16 text-indigo-500 animate-pulse mb-4" />
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
                    className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors"
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
                                <h1 className="text-2xl md:text-3xl font-display font-semibold text-gray-900 dark:text-gray-50 min-h-[1.5em] flex items-center justify-center gap-2">
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
                                    onShopCollection={() => handleOpenCollection("All Products", products)}
                                    settings={storeSettings?.theme_config?.hero || storeSettings?.hero}
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
                                        onViewAll={() => handleOpenCollection("New Arrivals", products)}
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
                                        <h2 className="text-3xl md:text-4xl font-display font-semibold text-white mb-3 tracking-tight">
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
                                                onClick={() => handleOpenCollection("New Arrivals", products)}
                                                className="px-6 py-3 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-full text-sm font-semibold text-gray-800 dark:text-gray-200 hover:bg-emerald-50 hover:border-emerald-400 hover:text-emerald-700 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-400 dark:hover:border-emerald-600 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                                            >
                                                ✨ New Arrivals
                                            </button>
                                        </div>

                                        <div className="text-center mt-8">
                                            <button
                                                onClick={() => handleOpenCollection("All Products", products)}
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
                    <h1 className="text-2xl font-bold text-white mb-2 font-display">Store Maintenance</h1>
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
                                handleOpenCollection("All Products", products);
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
                        storeName={storeSettings?.store_name || seller.store_name}
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
                        storeName: storeSettings?.store_name || seller?.store_name || "FashionStore",
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
                            handleOpenCollection("All Products", products);
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
                        <Store className="w-12 h-12 text-indigo-500 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-center text-neutral-900 dark:text-white mb-2">
                            Join {seller.store_name}
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
                                className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors"
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
                                className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors"
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
