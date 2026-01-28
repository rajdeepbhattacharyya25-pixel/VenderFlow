import React, { useState, useEffect } from 'react';
import { TopBar } from './components/TopBar';
import { Navbar } from './components/Navbar';
import { BenefitsBar } from './components/BenefitsBar';
import { Hero } from './components/Hero';
import { ProductCard } from './components/ProductCard';
import { Footer } from './components/Footer';
import { IconFilter, IconChevronDown, IconChevronRight } from './components/Icons';
import { products, recommendedProducts, popularProducts } from './data';
import { QuickViewModal } from './components/QuickViewModal';
import { BottomNav } from './components/BottomNav';
import { Product } from './types';
import { Wishlist } from './components/Wishlist';
import { Cart } from './components/Cart';
import { Checkout } from './components/Checkout';
import { Account } from './components/Account';
import { Orders } from './components/Orders';
import { ViewAll } from './components/ViewAll';
import { ScrollableSection } from './components/ScrollableSection';
import { ToastContainer } from './components/Toast';
import { InfoModal } from './components/InfoModal';

type ViewType = 'home' | 'wishlist' | 'cart' | 'checkout' | 'account' | 'orders' | 'viewAll';

// Footer Content Data
const FOOTER_CONTENT = {
  shop: {
    'Women': "Discover our curated selection of women’s apparel — from everyday essentials to elevated pieces for special occasions. Each item includes clear sizing, fabric information, and styling notes to help you find the perfect fit and look.",
    'Men': "Explore thoughtfully designed menswear that blends comfort with timeless style. Browse shirts, trousers, outerwear and accessories, each photographed on real models and described with care so you can shop confidently.",
    'Kids': "A playful, durable range for little ones — soft fabrics, easy-care designs, and sizes for toddlers through teens. Every product lists age/size guidance so you know what will fit and last.",
    'Accessories': "Complete the look with our hand-picked accessories: belts, scarves, hats and bags that pair seamlessly with our core collections. Each accessory page shows dimensions and styling suggestions so you can match with confidence.",
    'New Arrivals': "Be the first to wear our latest drops. This section features brand-new styles and seasonal highlights, with quick links to filtered views so you can shop fresh arrivals by category and price.",
    'Best Sellers': "See what other customers love — our best-selling pieces are tried, tested, and highly rated. Curated from top-performing items, this list helps you find reliable favorites fast."
  },
  support: {
    'Contact Us': "We’re here to help. Reach out via phone, SMS, email, or Instagram for questions about products, orders, or returns — our team responds during business hours and aims to reply within a few hours.",
    'Order Status': "Track the progress of your order here. Enter your order number or log into your account to see the latest status (Processing → Shipped → Delivered) and view the order details and items purchased.",
    'Shipping Policy': "We offer standard and express shipping options depending on your location. Typical delivery times and any shipping fees are shown at checkout; orders are processed within 1–2 business days unless otherwise noted.",
    'Returns & Refunds': "If an item doesn’t work for you, our simple returns policy makes it easy to request a return within the stated return window. Once we receive the item in its original condition, refunds are processed promptly to the original payment method.",
    'Size Guide': "Use our size guide to find your best fit — each product page links to specific measurements and fit notes (slim, regular, relaxed). If you’re between sizes, the guide offers tips to choose the best option."
  },
  legal: {
    'Terms & Conditions': "These terms explain the rules for using FashionStore, placing orders, and interacting with our site. They cover order acceptance, pricing accuracy, and how we handle cancellations or errors so everyone understands their rights and responsibilities.",
    'Privacy Policy': "We collect basic information (name, email, address, phone) to process orders and improve your shopping experience. We do not sell personal data — information is stored securely and used only for order fulfillment, customer service, and approved communications.",
    'Payment Policy': "We accept the payment methods listed at checkout and process payments securely using industry-standard encryption. Payments are charged at the time of order confirmation; if a payment fails, we will notify you and help complete your purchase.",
    'Cookie Policy': "Our site uses cookies to keep you logged in, remember items in your cart, and analyze site performance. You can manage or disable cookies in your browser, but some features (like saved carts) may not work without them."
  }
};

function App() {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [wishlistIds, setWishlistIds] = useState<number[]>([]);
  const [currentView, setCurrentView] = useState<ViewType>('home');
  const [cartItems, setCartItems] = useState<{product: Product, size: string, quantity: number}[]>([]);
  const [checkoutItems, setCheckoutItems] = useState<{product: Product, size: string, quantity: number}[]>([]);
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<number[]>([]);
  const [toasts, setToasts] = useState<{id: number, message: string}[]>([]);
  
  // Info Modal State
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [infoModalData, setInfoModalData] = useState({ title: '', content: '' });

  // Dark Mode State
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      // Default to light mode (false) unless explicitly saved as 'dark'
      return localStorage.getItem('theme') === 'dark';
    }
    return false;
  });

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
  
  // State for ViewAll collection
  const [currentCategoryTitle, setCurrentCategoryTitle] = useState("All Products");
  const [currentCategorySubtitle, setCurrentCategorySubtitle] = useState("");
  const [currentCategoryProducts, setCurrentCategoryProducts] = useState<Product[]>([]);

  // Helper to find items by ID (combining all lists)
  const allProducts = [...products, ...recommendedProducts, ...popularProducts];
  
  // Derived recently viewed products
  const recentlyViewedProducts = recentlyViewedIds
    .map(id => allProducts.find(p => p.id === id))
    .filter((p): p is Product => p !== undefined);

  // Initial load for "All Products" if needed, though we set it dynamically now
  
  const showToast = (message: string) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message }]);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const handleQuickView = (product: Product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
    
    // Add to recently viewed
    setRecentlyViewedIds(prev => {
      const filtered = prev.filter(id => id !== product.id);
      return [product.id, ...filtered].slice(0, 10);
    });
  };

  const closeQuickView = () => {
    setIsModalOpen(false);
    setTimeout(() => setSelectedProduct(null), 300);
  };

  const toggleWishlist = (product: Product) => {
    const isAdding = !wishlistIds.includes(product.id);
    setWishlistIds(prev => 
      prev.includes(product.id) 
        ? prev.filter(id => id !== product.id)
        : [...prev, product.id]
    );
    showToast(isAdding ? 'Added to your wishlist' : 'Removed from wishlist');
  };

  const addToCart = (product: Product, size: string = product.sizes[0]) => {
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

  const removeFromCart = (productId: number, size: string) => {
    setCartItems(prev => prev.filter(item => !(item.product.id === productId && item.size === size)));
    showToast('Removed item from bag');
  };

  const moveToWishlist = (product: Product, size: string) => {
    // 1. Remove from cart
    setCartItems(prev => prev.filter(item => !(item.product.id === product.id && item.size === size)));
    
    // 2. Add to wishlist if not already there
    if (!wishlistIds.includes(product.id)) {
      setWishlistIds(prev => [...prev, product.id]);
    }
    
    showToast('Saved to wishlist');
  };

  const updateCartQuantity = (productId: number, size: string, delta: number) => {
    setCartItems(prev => prev.map(item => {
      if (item.product.id === productId && item.size === size) {
        return { ...item, quantity: Math.max(1, item.quantity + delta) };
      }
      return item;
    }));
  };

  const handleCheckout = (selectedItems: {product: Product, size: string, quantity: number}[]) => {
    setCheckoutItems(selectedItems);
    handleNavigate('checkout');
  };

  const handlePlaceOrder = (orderedItems: {product: Product, size: string, quantity: number}[]) => {
    // Remove ordered items from main cart
    setCartItems(prev => {
      const orderedKeys = new Set(orderedItems.map(i => `${i.product.id}-${i.size}`));
      return prev.filter(item => !orderedKeys.has(`${item.product.id}-${item.size}`));
    });
    showToast('Order placed successfully!');
    // Cart update happens, Checkout component handles success screen
  };

  const isWishlisted = (productId: number) => wishlistIds.includes(productId);

  const wishlistedProducts = allProducts.filter(p => wishlistIds.includes(p.id));
  const uniqueWishlistedProducts = Array.from(new Map(wishlistedProducts.map(item => [item.id, item])).values());
  const cartTotalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const handleNavigate = (view: ViewType) => {
    setCurrentView(view);
    window.scrollTo(0, 0);
  };

  const handleOpenCollection = (title: string, items: Product[], subtitle: string = "") => {
    setCurrentCategoryTitle(title);
    setCurrentCategorySubtitle(subtitle);
    setCurrentCategoryProducts(items);
    handleNavigate('viewAll');
  };

  const handleShopCollection = () => {
    handleOpenCollection("New Collection 2024", allProducts, "Browse all styles from our latest drop");
  };

  // Default to all products if ViewAll is clicked from nav without specific collection
  const handleNavViewAll = () => {
    handleOpenCollection("All Products", allProducts);
  };

  const handleCategoryClick = (category: string) => {
    const filtered = allProducts.filter(p => p.category === category);
    handleOpenCollection(category, filtered);
  };

  // Footer Link Logic
  const handleFooterLinkClick = (section: 'shop' | 'support' | 'legal', key: string) => {
    if (section === 'shop') {
      const description = FOOTER_CONTENT.shop[key as keyof typeof FOOTER_CONTENT.shop];
      
      let productsToShow = allProducts;
      let title = key;

      if (key === 'New Arrivals') {
        productsToShow = products;
      } else if (key === 'Best Sellers') {
        productsToShow = popularProducts;
      } else if (['Women', 'Men', 'Kids', 'Accessories'].includes(key)) {
        // Since original logic passed "Women", "Men", etc., we need to match that.
        // But the key from footer is "Women's Collection", "Men's Collection".
        // Let's strip " Collection" if present to match the category data
        const categoryKey = key.replace("'s Collection", "").replace("'s Collection", ""); // Handle "Women's Collection" -> "Women"
        // Actually, let's map it simpler:
        const catMap: Record<string, string> = {
          'Women\'s Collection': 'Women', // Note: data.ts uses "Women"
          'Men\'s Collection': 'Men',
          'Kids\' Collection': 'Kids',
          'Accessories': 'Accessories'
        };
        
        // If it's in the map, use the mapped category, otherwise pass the key
        // Note: New Arrivals and Best Sellers are handled above.
        const category = catMap[key] || key;
        productsToShow = allProducts.filter(p => p.category === category);
        title = key; // Keep the full title "Women's Collection" for display
      }
      
      handleOpenCollection(title, productsToShow, description);
    } else {
      // Support or Legal - Open Modal
      const contentMap = section === 'support' ? FOOTER_CONTENT.support : FOOTER_CONTENT.legal;
      const content = contentMap[key as keyof typeof contentMap] || "";
      
      setInfoModalData({
        title: key,
        content: content
      });
      setIsInfoModalOpen(true);
    }
  };

  const renderContent = () => {
    switch (currentView) {
      case 'checkout':
        return (
          <Checkout 
            items={checkoutItems}
            onPlaceOrder={handlePlaceOrder}
            onNavigateCart={() => handleNavigate('cart')}
            onNavigateHome={() => handleNavigate('home')}
          />
        );
      case 'wishlist':
        return (
          <Wishlist 
            products={uniqueWishlistedProducts} 
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
            wishlistProducts={uniqueWishlistedProducts}
            onRemove={removeFromCart} 
            onUpdateQuantity={updateCartQuantity}
            onNavigateHome={() => handleNavigate('home')}
            onNavigateWishlist={() => handleNavigate('wishlist')}
            onMoveToWishlist={moveToWishlist}
            onAddToCart={addToCart}
            onCheckout={handleCheckout}
          />
        );
      case 'account':
        return (
          <Account 
            onNavigate={handleNavigate} 
            showToast={showToast}
            onLogout={() => {
              showToast("Signed out successfully");
              handleNavigate('home');
            }}
          />
        );
      case 'orders':
        return (
          <Orders 
            onNavigate={handleNavigate}
            onAddToCart={addToCart}
            showToast={showToast}
          />
        );
      case 'viewAll':
        return (
          <ViewAll 
            products={currentCategoryProducts.length > 0 ? currentCategoryProducts : allProducts} 
            title={currentCategoryTitle}
            subtitle={currentCategorySubtitle}
            onQuickView={handleQuickView}
            onToggleWishlist={toggleWishlist}
            isWishlisted={isWishlisted}
            onAddToCart={(p) => addToCart(p)}
          />
        );
      case 'home':
      default:
        return (
          <>
            <Hero onShopCollection={handleShopCollection} />
            <div className="max-w-[1600px] mx-auto px-4 md:px-8 space-y-16 mb-20">
              
              {/* New Arrivals Section */}
              <section>
                <ScrollableSection
                  title="New Arrivals"
                  badge="Just Dropped"
                  badgeColor="text-primary dark:text-primary-light"
                  products={products}
                  onViewAll={() => handleOpenCollection("New Arrivals", products)}
                  onQuickView={handleQuickView}
                  onToggleWishlist={toggleWishlist}
                  isWishlisted={isWishlisted}
                  onAddToCart={(p) => addToCart(p)}
                />
              </section>

              {/* Recommended Section */}
              <section className="bg-[#F9F7F2] dark:bg-surface-dark/50 -mx-4 md:-mx-8 px-4 md:px-8 py-12 rounded-3xl md:rounded-[3rem] transition-colors">
                <ScrollableSection
                  title="Recommended"
                  badge="Curated For You"
                  badgeColor="text-accent"
                  products={recommendedProducts}
                  onViewAll={() => handleOpenCollection("Recommended for You", recommendedProducts)}
                  onQuickView={handleQuickView}
                  onToggleWishlist={toggleWishlist}
                  isWishlisted={isWishlisted}
                  onAddToCart={(p) => addToCart(p)}
                />
              </section>

              {/* Popular Section */}
              <section>
                <ScrollableSection
                  title="Most Popular"
                  badge="Trending Now"
                  badgeColor="text-red-500"
                  products={popularProducts}
                  onViewAll={() => handleOpenCollection("Most Popular", popularProducts)}
                  onQuickView={handleQuickView}
                  onToggleWishlist={toggleWishlist}
                  isWishlisted={isWishlisted}
                  onAddToCart={(p) => addToCart(p)}
                />
              </section>

              {/* Recently Viewed Section */}
              {recentlyViewedProducts.length > 0 && (
                <section className="border-t border-gray-100 dark:border-gray-800 pt-16 transition-colors">
                   <ScrollableSection
                      title="Recently Viewed"
                      products={recentlyViewedProducts}
                      onViewAll={() => handleOpenCollection("Recently Viewed", recentlyViewedProducts)}
                      onQuickView={handleQuickView}
                      onToggleWishlist={toggleWishlist}
                      isWishlisted={isWishlisted}
                      onAddToCart={(p) => addToCart(p)}
                      compact={true}
                   />
                </section>
              )}

              {/* Discovery Section */}
              <section className="py-24 border-t border-gray-100 dark:border-gray-800 transition-colors">
                  <div className="relative overflow-hidden rounded-[3rem] p-10 md:p-20 text-center shadow-sm transition-all duration-500 hover:shadow-md bg-white dark:bg-surface-dark">
                    
                    {/* Background Gradients with Cross-Fade */}
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 opacity-100 dark:opacity-0 transition-opacity duration-500 ease-in-out"></div>
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/30 via-purple-950/30 to-pink-950/30 opacity-0 dark:opacity-100 transition-opacity duration-500 ease-in-out"></div>

                    {/* Decorative Elements */}
                    <div className="absolute top-0 left-0 w-64 h-64 bg-blue-200/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-500"></div>
                    <div className="absolute bottom-0 right-0 w-64 h-64 bg-rose-200/20 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none transition-colors duration-500"></div>

                    <h2 className="text-3xl md:text-5xl font-display font-bold text-gray-900 dark:text-white mb-6 relative z-10 transition-colors">
                      Still Looking for Something You’ll Love?
                    </h2>
                    <p className="text-gray-600 dark:text-gray-300 mb-12 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed relative z-10 transition-colors">
                      Explore our most popular categories and discover your next favorite.
                    </p>
                    
                    <div className="flex flex-wrap justify-center gap-4 md:gap-6 max-w-5xl mx-auto relative z-10">
                        <button 
                          onClick={() => handleCategoryClick("Women")}
                          className="flex-grow md:flex-grow-0 px-8 py-5 bg-white dark:bg-surface-dark border-2 border-rose-100 dark:border-rose-900/30 rounded-2xl text-lg font-bold text-gray-900 dark:text-white hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:border-rose-200 hover:scale-105 transition-all shadow-sm hover:shadow-rose-100 dark:hover:shadow-none min-w-[200px] group"
                        >
                          <span className="block text-rose-500 text-xs font-bold uppercase tracking-wider mb-1 group-hover:text-rose-600">Shop</span>
                          Women’s Collection
                        </button>
                        <button 
                           onClick={() => handleCategoryClick("Men")}
                           className="flex-grow md:flex-grow-0 px-8 py-5 bg-white dark:bg-surface-dark border-2 border-blue-100 dark:border-blue-900/30 rounded-2xl text-lg font-bold text-gray-900 dark:text-white hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-200 hover:scale-105 transition-all shadow-sm hover:shadow-blue-100 dark:hover:shadow-none min-w-[200px] group"
                        >
                          <span className="block text-blue-500 text-xs font-bold uppercase tracking-wider mb-1 group-hover:text-blue-600">Shop</span>
                          Men’s Collection
                        </button>
                        <button 
                           onClick={() => handleCategoryClick("Kids")}
                           className="flex-grow md:flex-grow-0 px-8 py-5 bg-white dark:bg-surface-dark border-2 border-yellow-100 dark:border-yellow-900/30 rounded-2xl text-lg font-bold text-gray-900 dark:text-white hover:bg-yellow-50 dark:hover:bg-yellow-900/20 hover:border-yellow-200 hover:scale-105 transition-all shadow-sm hover:shadow-yellow-100 dark:hover:shadow-none min-w-[200px] group"
                        >
                          <span className="block text-yellow-500 text-xs font-bold uppercase tracking-wider mb-1 group-hover:text-yellow-600">Shop</span>
                          Kids’ Collection
                        </button>
                        <button 
                           onClick={() => handleOpenCollection("Most Popular", popularProducts)}
                           className="flex-grow md:flex-grow-0 px-8 py-5 bg-white dark:bg-surface-dark border-2 border-purple-100 dark:border-purple-900/30 rounded-2xl text-lg font-bold text-gray-900 dark:text-white hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:border-purple-200 hover:scale-105 transition-all shadow-sm hover:shadow-purple-100 dark:hover:shadow-none min-w-[200px] group"
                        >
                          <span className="block text-purple-500 text-xs font-bold uppercase tracking-wider mb-1 group-hover:text-purple-600">View</span>
                          Best Sellers
                        </button>
                        <button 
                           onClick={() => handleOpenCollection("New Arrivals", products)}
                           className="flex-grow md:flex-grow-0 px-8 py-5 bg-white dark:bg-surface-dark border-2 border-teal-100 dark:border-teal-900/30 rounded-2xl text-lg font-bold text-gray-900 dark:text-white hover:bg-teal-50 dark:hover:bg-teal-900/20 hover:border-teal-200 hover:scale-105 transition-all shadow-sm hover:shadow-teal-100 dark:hover:shadow-none min-w-[200px] group"
                        >
                          <span className="block text-teal-500 text-xs font-bold uppercase tracking-wider mb-1 group-hover:text-teal-600">View</span>
                          New Arrivals
                        </button>
                    </div>
                  </div>
              </section>

            </div>
          </>
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-body pb-[80px] md:pb-0 bg-white dark:bg-background-dark transition-colors duration-300">
      {currentView !== 'checkout' && <TopBar />}
      {currentView !== 'checkout' && (
        <Navbar 
          onNavigate={(view) => {
            if (view === 'viewAll') {
              handleNavViewAll();
            } else {
              handleNavigate(view);
            }
          }} 
          onCategoryClick={handleCategoryClick}
          wishlistCount={wishlistIds.length} 
          cartCount={cartTotalItems} 
          isDarkMode={isDarkMode}
          toggleDarkMode={toggleDarkMode}
        />
      )}
      {currentView !== 'checkout' && <BenefitsBar />}
      
      <main className="flex-grow">
        {renderContent()}
      </main>

      {currentView !== 'checkout' && <Footer onLinkClick={handleFooterLinkClick} />}
      {currentView !== 'checkout' && (
        <BottomNav onNavigate={(view) => {
           if (view === 'viewAll') {
              handleNavViewAll();
           } else {
              handleNavigate(view);
           }
        }} cartCount={cartTotalItems} />
      )}
      
      <QuickViewModal 
        product={selectedProduct} 
        isOpen={isModalOpen} 
        onClose={closeQuickView}
        isWishlisted={selectedProduct ? isWishlisted(selectedProduct.id) : false}
        onToggleWishlist={toggleWishlist}
        onAddToCart={addToCart}
      />
      
      <InfoModal 
        isOpen={isInfoModalOpen}
        onClose={() => setIsInfoModalOpen(false)}
        title={infoModalData.title}
        content={infoModalData.content}
      />

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}

export default App;