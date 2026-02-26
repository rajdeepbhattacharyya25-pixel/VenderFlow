import React, { Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import SellerGuard from './components/admin/SellerGuard';
import AdminGuard from './components/admin/AdminGuard';
import CustomerAuthGuard from './components/CustomerAuthGuard';
import TelegramInitializer from './components/TelegramInitializer';
import OfflineOverlay from './components/OfflineOverlay';
import ErrorBoundary from './components/ErrorBoundary';
import CookieConsent from './components/CookieConsent';
import { initTelegramApp } from './lib/telegram';
import { capturePage } from './lib/analytics';

import LandingPage from './pages/LandingPage';

// Lazy loaded pages for performance code-splitting
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
const Onboarding = React.lazy(() => import('./pages/Onboarding'));

// Legal Pages
const TermsPage = React.lazy(() => import('./pages/legal/TermsPage'));
const PrivacyPage = React.lazy(() => import('./pages/legal/PrivacyPage'));
const PaymentPage = React.lazy(() => import('./pages/legal/PaymentPage'));
const CookiePage = React.lazy(() => import('./pages/legal/CookiePage'));

// Company Pages
const AboutPage = React.lazy(() => import('./pages/AboutPage'));

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

function App() {
  React.useEffect(() => {
    initTelegramApp();

    // Register Service Worker for Push Notifications
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('Service Worker registered with scope:', registration.scope);
        })
        .catch(error => {
          console.error('Service Worker registration failed:', error);
        });
    }
  }, []);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <RouteChangeTracker />
        <Toaster position="top-right" />
        <OfflineOverlay />
        <CookieConsent />
        <TelegramInitializer />

        <Suspense fallback={<PageLoader />}>
          <div className="relative w-full h-full">
            <Routes>
              <Route path="/auth-callback" element={<AuthCallback />} />
              <Route path="/staff/login" element={<StaffLogin />} />

              {/* Protected Seller Dashboard Routes */}
              <Route element={<SellerGuard />}>
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/dashboard/*" element={<DashboardLayout />} />
              </Route>

              {/* Seller Storefront Routes */}
              <Route path="/store/:sellerSlug/*" element={<SellerStorefront />} />

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

              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;