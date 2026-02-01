import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AuthCallback from './pages/AuthCallback';
import StaffLogin from './pages/StaffLogin';
import Storefront from './pages/Storefront';
import SellerStorefront from './pages/SellerStorefront';
import DashboardLayout from './dashboard/DashboardLayout';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import SellersList from './pages/admin/SellersList';
import SellerDetail from './pages/admin/SellerDetail';
import SellerGuard from './components/admin/SellerGuard';
import AdminGuard from './components/admin/AdminGuard';
import CustomerAuthGuard from './components/CustomerAuthGuard';
import AdminProducts from './pages/admin/AdminProducts';
import AdminOrders from './pages/admin/AdminOrders';
import AdminInvites from './pages/admin/AdminInvites';
import AdminLogs from './pages/admin/AdminLogs';
import AdminSettings from './pages/admin/AdminSettings';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import OrdersPage from './pages/OrdersPage';
import AccountPage from './pages/AccountPage';
import { initTelegramApp } from './lib/telegram';
import TelegramInitializer from './components/TelegramInitializer';
import OfflineOverlay from './components/OfflineOverlay';

import NotFound from './pages/NotFound';

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
    <BrowserRouter>
      <OfflineOverlay />
      <TelegramInitializer />
      <Routes>
        <Route path="/auth-callback" element={<AuthCallback />} />
        <Route path="/staff/login" element={<StaffLogin />} />

        {/* Protected Seller Dashboard Routes */}
        <Route element={<SellerGuard />}>
          <Route path="/dashboard/*" element={<DashboardLayout />} />
        </Route>

        {/* Seller Storefront Routes */}
        <Route path="/store/:sellerSlug/*" element={<SellerStorefront />} />

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
            <Route path="sellers" element={<SellersList />} />
            <Route path="seller/:sellerId" element={<SellerDetail />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="invites" element={<AdminInvites />} />
            <Route path="logs" element={<AdminLogs />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
        </Route>

        <Route path="/" element={<Storefront />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;