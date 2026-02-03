import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Orders from './pages/Orders';
import Sales from './pages/Sales';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Support from './pages/Support';
import { Theme } from './types';



import { supabase } from '../lib/supabase';
import { useAutoBackup } from '../hooks/useAutoBackup';

import { AlertCircle, Megaphone, X } from 'lucide-react';

function App() {
  useAutoBackup(true); // Enable auto-backup on dashboard load

  const [theme, setTheme] = useState<Theme>('light');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [sellerSlug, setSellerSlug] = useState<string | null>(null);
  const [businessLogo, setBusinessLogo] = useState<string | null>(null);
  const [isSuspended, setIsSuspended] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [announcement, setAnnouncement] = useState<{ id: string; title: string; content: string; type: string } | null>(null);
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false); // New state for maintenance mode

  useEffect(() => {
    const fetchSellerStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // 1. Check Platform Settings First
        const { data: settings } = await supabase
          .from('platform_settings')
          .select('*')
          .single();

        // 2. Announcements
        if (settings?.announcement_message) {
          setAnnouncement({
            id: 'global',
            title: 'Global Announcement',
            content: settings.announcement_message,
            type: 'info'
          });
        }

        if (settings?.maintenance_mode) {
          setMaintenanceMode(true);
        }

        const { data } = await supabase
          .from('sellers')
          .select('slug, store_name, status')
          .eq('id', user.id)
          .single();

        if (data) {
          setSellerSlug(data.slug);

          if (data.status === 'suspended') {
            setIsSuspended(true);
          }

          if (data.store_name) {
            document.title = `${data.store_name} Dashboard`;
          }

          // Fetch store settings for business logo
          try {
            const { data: storeSettings } = await supabase
              .from('store_settings')
              .select('logo_url')
              .eq('seller_id', user.id)
              .maybeSingle();

            if (storeSettings?.logo_url) {
              setBusinessLogo(storeSettings.logo_url);
            }
          } catch (error) {
            console.error('Error fetching store settings:', error);
          }

          // Fetch Latest Announcement
          try {
            const { data: announcementData } = await supabase
              .from('announcements')
              .select('*')
              .or(`target_type.eq.platform,and(target_type.eq.seller,target_id.eq.${user.id})`)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            if (announcementData) {
              setAnnouncement(announcementData as any);
            }
          } catch (error) {
            console.error('Error fetching announcements:', error);
          }
        }
      }
    };
    fetchSellerStatus();
  }, []);

  // Theme Handling
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Responsive Handler
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 640;
      const tablet = window.innerWidth <= 1024;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarCollapsed(true);
      } else if (tablet) {
        setSidebarCollapsed(true);
      } else {
        setSidebarCollapsed(false);
      }
    };

    handleResize(); // Init
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard theme={theme} onTabChange={setActiveTab} sellerSlug={sellerSlug} />;
      case 'products':
        return <Products searchTerm={searchTerm} />;
      case 'orders':
        return <Orders searchTerm={searchTerm} />;
      case 'sales':
        return <Sales />;
      case 'reports':
        return <Reports />;
      case 'settings':
        return <Settings />;
      case 'support':
        return <Support />;
      default:
        return <Dashboard theme={theme} onTabChange={setActiveTab} sellerSlug={sellerSlug} />;
    }
  };

  if (maintenanceMode) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-4">
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl animate-in fade-in zoom-in-95 duration-300">
          <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={40} className="text-amber-500" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">System Maintenance</h1>
          <p className="text-neutral-400 mb-6">
            The platform is currently undergoing scheduled maintenance. Please check back later.
          </p>
          <div className="bg-neutral-800/50 rounded-xl p-4 text-sm text-neutral-300 border border-neutral-700">
            <p className="font-medium text-white mb-1">Check Telegram</p>
            Check our Telegram channel for real-time status updates.
          </div>
        </div>
      </div>
    );
  }

  if (isSuspended) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-4">
        <div className="bg-neutral-900 border border-red-500/20 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl shadow-red-900/20 animate-in fade-in zoom-in-95 duration-300">
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={40} className="text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Account Suspended</h1>
          <p className="text-neutral-400 mb-6">
            Your storefront has been suspended due to a violation of our terms or administrative action.
          </p>
          <div className="bg-neutral-800/50 rounded-xl p-4 mb-6 text-sm text-neutral-300 border border-neutral-700">
            <p className="font-medium text-white mb-1">Action Required</p>
            Please contact <span className="text-indigo-400 font-bold">Rajdeep Admin</span> to resolve this issue and restore your store access.
          </div>
          <a
            href="mailto:support@rajdeep.admin" // Mock email or link
            className="block w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-colors"
          >
            Contact Support
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg transition-colors duration-300 font-sans selection:bg-chart-line selection:text-white pb-20 sm:pb-0">

      {/* Left Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        isMobile={isMobile}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        sellerSlug={sellerSlug}
        businessLogo={businessLogo}
        onSidebarClose={() => setSidebarCollapsed(true)}
      />

      {/* Main Content Area */}
      <div
        className={`transition-all duration-300 ease-in-out
            ${isMobile ? 'ml-0' : sidebarCollapsed ? 'ml-[72px]' : 'ml-[240px]'}
        `}
      >
        <Header
          theme={theme}
          toggleTheme={toggleTheme}
          isMobile={isMobile}
          onMenuClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
        />

        <main className="p-6 lg:px-10 pt-8">
          {announcement && (
            <div className={`mb-6 p-4 rounded-xl border flex items-start gap-3 animate-in slide-in-from-top-2 ${announcement.type === 'warning' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
              announcement.type === 'update' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' :
                'bg-indigo-500/10 border-indigo-500/20 text-indigo-500'
              }`}>
              <Megaphone size={20} className="mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-bold text-sm">{announcement.title}</h3>
                <p className="text-sm opacity-90 mt-1">{announcement.content}</p>
              </div>
              <button
                onClick={() => setAnnouncement(null)}
                className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {renderContent()}
        </main>
      </div>
    </div>
  );
}

export default App;
