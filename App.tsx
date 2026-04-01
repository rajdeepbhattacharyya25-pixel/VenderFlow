import React, { Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate, useParams } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import SellerGuard from './components/admin/SellerGuard';
import AdminGuard from './components/admin/AdminGuard';
import CustomerAuthGuard from './components/CustomerAuthGuard';
import TelegramInitializer from './components/TelegramInitializer';
import OfflineOverlay from './components/OfflineOverlay';
import ErrorBoundary from './components/ErrorBoundary';
import CookieConsent from './components/CookieConsent';
import { initTelegramApp } from './lib/telegram';
import { capturePage, initPostHog, identify, optOut } from './lib/analytics';
import { supabase } from './lib/supabase';

const LandingPage = React.lazy(() => import('./pages/LandingPage'));
const AuthCallback = React.lazy(() => import('./pages/AuthCallback'));
const StaffLogin = React.lazy(() => import('./pages/StaffLogin'));
const SellerStorefront = React.lazy(() => import('./pages/SellerStorefront'));
const PreviewStorefront = React.lazy(() => import('./pages/PreviewStorefront'));
const DashboardLayout = React.lazy(() => import('./dashboard/DashboardLayout'));
const AdminLayout = React.lazy(() => import('./pages/admin/AdminLayout'));
const AdminDashboard = React.lazy(() => import('./pages/admin/AdminDashboard'));
const SellersList = React.lazy(() => import('./pages/admin/SellersList'));
const SellerDetail = React.lazy(() => import('./pages/admin/SellerDetail'));
const AdminProducts = React.lazy(() => import('./pages/admin/AdminProducts'));
const AdminOrders = React.lazy(() => import('./pages/admin/AdminOrders'));
const AdminInvites = React.lazy(() => import('./pages/admin/AdminInvites'));
const AdminLogs = React.lazy(() => import('./pages/admin/AdminLogs'));
const AdminSettings = React.lazy(() => import('./pages/admin/AdminSettings'));
const CartPage = React.lazy(() => import('./pages/CartPage'));
const CheckoutPage = React.lazy(() => import('./pages/CheckoutPage'));
const OrdersPage = React.lazy(() => import('./pages/OrdersPage'));
const AccountPage = React.lazy(() => import('./pages/AccountPage'));
const NotFound = React.lazy(() => import('./pages/NotFound'));
const AdminAnalytics = React.lazy(() => import('@/pages/admin/AdminAnalytics'));
const ApplyToSell = React.lazy(() => import('./pages/ApplyToSell'));
const SellerApplications = React.lazy(() => import('./pages/admin/SellerApplications'));
const AdminPayoutControls = React.lazy(() => import('./pages/admin/AdminPayoutControls'));
const AdminDisputes = React.lazy(() => import('./pages/admin/AdminDisputes'));
const Onboarding = React.lazy(() => import('@/pages/Onboarding'));
const NotificationHub = React.lazy(() => import('@/pages/admin/NotificationHub'));


// Legal Pages
const TermsPage = React.lazy(() => import('./pages/legal/TermsPage'));
const PrivacyPage = React.lazy(() => import('./pages/legal/PrivacyPage'));
const PaymentPage = React.lazy(() => import('./pages/legal/PaymentPage'));
const CookiePage = React.lazy(() => import('./pages/legal/CookiePage'));

// Company Pages
const AboutPage = React.lazy(() => import('./pages/AboutPage'));

// Blog Pages
const BlogIndex = React.lazy(() => import('./pages/blog/BlogIndex'));
const BlogPost = React.lazy(() => import('./pages/blog/BlogPost'));

// Alternative Pages (SEO)
const AlternativePage = React.lazy(() => import('./pages/alternatives/AlternativePage'));

// Fires capturePage() on every route change (consent-gated inside capturePage)
function RouteChangeTracker() {
  const location = useLocation();
  useEffect(() => {
    capturePage();
  }, [location.pathname]);
  return null;
}

// Loading Fallback Component
const PageLoader = () => (
  <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
  </div>
);

// Redirect component for legacy /store/:sellerSlug path
const NavigateToRootStore = () => {
  const { sellerSlug, '*': rest } = useParams();
  return <Navigate to={`/${sellerSlug}${rest ? `/${rest}` : ''}`} replace />;
};

function App() {
  React.useEffect(() => {
    // Health Check & Runtime Diagnostics
    const checkHealth = () => {
        const status = {
            supabase_url: !!import.meta.env.VITE_SUPABASE_URL,
            supabase_key: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
            posthog_key: !!import.meta.env.VITE_POSTHOG_API_KEY,
            mode: import.meta.env.MODE,
            prod: import.meta.env.PROD
        };

        // Aggressive logging for production debugging
        console.log("[Health] Environment Status:", status);

        if (!status.supabase_url || !status.supabase_key) {
            console.error("[Health] CRITICAL: Supabase environment variables are missing! The app will not function correctly.");
        }
        
        // Verify if supabase client is actually proxied or crashed
        try {
            // Accessing a property on the proxy to trigger initialization check
            const isAuthAvailable = !!supabase.auth;
            console.log("[Health] Supabase Client check:", isAuthAvailable ? "Connected" : "Not connected");
        } catch (err) {
            console.error("[Health] Supabase Client is broken:", (err as Error).message);
        }
    };

    checkHealth();

    // Initialize Analytics
    const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_API_KEY || import.meta.env.VITE_NEXT_PUBLIC_POSTHOG_KEY;
    const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com';

    if (POSTHOG_KEY && (POSTHOG_KEY as string).startsWith('phc_')) {
      initPostHog(POSTHOG_KEY as string, POSTHOG_HOST as string);
    } else if (POSTHOG_KEY) {
      console.warn('[App] PostHog key found but appears invalid (must start with phc_). Skipping initialization.');
    }

    // Subscribe to Auth changes to identify users
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        // Run asynchronously without holding the auth lock
        void (async () => {
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', session.user.id)
              .maybeSingle();

            identify(session.user.id, {
              email: session.user.email ? 'REDACTED' : undefined,
              role: profile?.role || 'vendor',
              plan: 'free' // Default for analytics if not fetched from sellers
            });
          } catch (e) {
            const error = e as Error;
            console.error("Profile identification failed:", error.message);
          }
        })();
      } else if (event === 'SIGNED_OUT') {
        optOut(); // Or posthog.reset() to clear anonymous ID linkage
      }
    });

    // initTelegramApp();

    // Register Service Worker for Push Notifications
    if ('serviceWorker' in navigator && import.meta.env.DEV) {
      navigator.serviceWorker.register('/sw.js')
        .catch(error => {
          console.error('Service Worker registration failed:', error);
        });
    }

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <RouteChangeTracker />
        <Toaster position="top-right" />
        <OfflineOverlay />
        <CookieConsent />
{/* <TelegramInitializer /> */}

        <Suspense fallback={<PageLoader />}>
          <div className="relative w-full h-full">
            <Routes>
              <Route path="/auth-callback" element={<AuthCallback />} />
              <Route path="/staff/login" element={<StaffLogin />} />

              {/* Legacy Storefront Redirects */}
              <Route path="/store/:sellerSlug/*" element={<NavigateToRootStore />} />

              {/* Protected Seller Dashboard Routes */}
              <Route element={<SellerGuard />}>
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/dashboard/*" element={<DashboardLayout />} />
              </Route>


              {/* Preview Environment Route */}
              <Route path="/preview/:previewId/*" element={<PreviewStorefront />} />

              {/* Public Cart Page */}
              <Route path="/cart" element={<CartPage />} />

              {/* Protected Customer Routes */}
              <Route element={<CustomerAuthGuard />}>
                <Route path="/checkout" element={<CheckoutPage />} />
                <Route path="/orders" element={<OrdersPage />} />
                <Route path="/account" element={<AccountPage />} />
              </Route>

              {/* Admin Routes */}
              <Route element={<AdminGuard />}>
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<AdminDashboard />} />
                  <Route path="applications" element={<SellerApplications />} />
                  <Route path="sellers" element={<SellersList />} />
                  <Route path="seller/:sellerId" element={<SellerDetail />} />
                  <Route path="products" element={<AdminProducts />} />
                  <Route path="orders" element={<AdminOrders />} />
                  <Route path="invites" element={<AdminInvites />} />
                  <Route path="logs" element={<AdminLogs />} />
                  <Route path="settings" element={<AdminSettings />} />
                  <Route path="analytics" element={<AdminAnalytics />} />
                  <Route path="notifications" element={<NotificationHub />} />
                  <Route path="payouts" element={<AdminPayoutControls />} />
                  <Route path="disputes" element={<AdminDisputes />} />
                </Route>
              </Route>

              <Route path="/" element={<LandingPage />} />
              <Route path="/apply" element={<ApplyToSell />} />
              {/* Legal Pages */}
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/privacy-policy" element={<PrivacyPage />} />
              <Route path="/payment-policy" element={<PaymentPage />} />
              <Route path="/cookie-policy" element={<CookiePage />} />

              {/* Company Pages */}
              <Route path="/about" element={<AboutPage />} />

              {/* Blog Pages */}
              <Route path="/blog" element={<BlogIndex />} />
              <Route path="/blog/:slug" element={<BlogPost />} />

              {/* Alternative Pages (SEO) */}
              <Route path="/shopify-alternative" element={<AlternativePage competitor="Shopify" />} />
              <Route path="/woocommerce-alternative" element={<AlternativePage competitor="WooCommerce" />} />
              <Route path="/amazon-seller-alternative" element={<AlternativePage competitor="Amazon" />} />

              {/* Seller Storefront Routes (Moved to bottom to avoid conflicts) */}
              <Route path="/:sellerSlug/*" element={<SellerStorefront />} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;