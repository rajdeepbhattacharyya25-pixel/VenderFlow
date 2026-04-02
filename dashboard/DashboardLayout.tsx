import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Orders from './pages/Orders';
import Sales from './pages/Sales';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Support from './pages/Support';
import Promotions from './pages/Promotions';
import Billing from './pages/Billing';
import AuditLogs from './pages/AuditLogs';
import { Theme } from './types';

import { supabase } from '../lib/supabase';
import { useAutoBackup } from '../hooks/useAutoBackup';
import { useSystemAlertListener, SystemAlert } from '../hooks/useSystemAlert';

import { AlertCircle, Megaphone, X, Database, ShieldAlert, AlertTriangle } from 'lucide-react';
import { Events } from '../lib/analytics';
import ErrorBoundary from '@/components/ErrorBoundary';

function App() {
  const { isBackupRunning, backupProgress, backupMessage, backupStatus } = useAutoBackup(true); // Enable auto-backup on dashboard load

  const [theme, setTheme] = useState<Theme>('light');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Initialize activeTab from URL search params
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('tab') || 'dashboard';
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [systemAlerts, setSystemAlerts] = useState<SystemAlert[]>([]);

  // Listen for global system errors (from vault.ts, storage.ts, etc.)
  const handleSystemAlert = useCallback((alert: SystemAlert) => {
    setSystemAlerts(prev => {
      // Avoid duplicates: same code shown within 5s = replace, not append
      const existingIndex = prev.findIndex(a => a.code === alert.code);
      if (existingIndex !== -1) {
        const updated = [...prev];
        updated[existingIndex] = alert;
        return updated;
      }
      return [alert, ...prev];
    });
  }, []);

  useSystemAlertListener(handleSystemAlert);

  const dismissAlert = useCallback((id: string) => {
    setSystemAlerts(prev => prev.filter(a => a.id !== id));
  }, []);
  
  // Sync activeTab with URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('tab') !== activeTab) {
      params.set('tab', activeTab);
      const newUrl = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState({ tab: activeTab }, '', newUrl);
    }
  }, [activeTab]);
  const [sellerSlug, setSellerSlug] = useState<string | null>(null);
  const [businessLogo, setBusinessLogo] = useState<string | null>(null);
  const [isSuspended, setIsSuspended] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [announcement, setAnnouncement] = useState<{ id: string; title: string; content: string; type: string } | null>(null);
  const [storeName, setStoreName] = useState<string | null>(null);

  useEffect(() => {
    const fetchSellerStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // 1. Check Platform Settings First
        const { data: settings } = await supabase
          .from('platform_settings')
          .select('*')
          .maybeSingle();

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

          // Fetch store settings for business logo AND store name
          try {
            const { data: storeSettings } = await supabase
              .from('store_settings')
              .select('logo_url, store_name')
              .eq('seller_id', user.id)
              .maybeSingle();

            if (storeSettings?.logo_url) {
              setBusinessLogo(storeSettings.logo_url);
            }

            const displayName = storeSettings?.store_name || data.store_name;
            setStoreName(displayName);

            if (displayName) {
              document.title = `${displayName} Dashboard`;
            }
          } catch (error) {
            console.error('Error fetching store settings:', error);
            setStoreName(data.store_name);
            if (data.store_name) {
              document.title = `${data.store_name} Dashboard`;
            }
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
              setAnnouncement(announcementData as { id: string; title: string; content: string; type: string });
            }
          } catch (error) {
            console.error('Error fetching announcements:', error);
          }
        }
      }
    };
    fetchSellerStatus();
    
    // Analytics Tracking
    const trackDashboardVisit = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        Events.dashboardOpened({
          vendor_id: user.id,
          section: activeTab
        });
      }
    };
    trackDashboardVisit();
  }, [activeTab]);

  // Theme Handling
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Dynamic Favicon
  useEffect(() => {
    if (businessLogo) {
      const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (link) {
        link.href = businessLogo;
      } else {
        const newLink = document.createElement('link');
        newLink.rel = 'icon';
        newLink.href = businessLogo;
        document.head.appendChild(newLink);
      }
    }

    return () => {
      const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (link) {
        link.href = '/logo.jpg';
      }
    };
  }, [businessLogo]);

  // Responsive Handler
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
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

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard theme={theme} onTabChange={setActiveTab} sellerSlug={sellerSlug} />;
      case 'products':
        return <Products {...{ searchTerm }} />;
      case 'orders':
        return <Orders searchTerm={searchTerm} />;
      case 'sales':
        return <Sales />;
      case 'reports':
        return <Reports />;
      case 'settings':
        return <Settings />;
      case 'promotions':
        return <Promotions />;
      case 'support':
        return <Support />;
      case 'billing':
        return <Billing />;
      case 'logs':
        return <AuditLogs />;
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
          <h2 className="text-2xl font-bold text-white mb-2">System Maintenance</h2>
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
          <h2 className="text-2xl font-bold text-white mb-2">Account Suspended</h2>
          <p className="text-neutral-400 mb-6">
            Your storefront has been suspended due to a violation of our terms or administrative action.
          </p>
          <div className="bg-neutral-800/50 rounded-xl p-4 mb-6 text-sm text-neutral-300 border border-neutral-700">
            <p className="font-medium text-white mb-1">Action Required</p>
            Please contact <span className="text-emerald-400 font-bold">Admin</span> to resolve this issue and restore your store access.
          </div>
          <a
            href="mailto:support@vendorflow.admin"
            className="block w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-colors"
          >
            Contact Support
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-root min-h-screen bg-theme-bg transition-colors duration-300 font-sans selection:bg-emerald-500 selection:text-white pb-20 md:pb-0">

      {/* Left Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        isMobile={isMobile}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        sellerSlug={sellerSlug}
        businessLogo={businessLogo}
        onSidebarClose={() => setSidebarCollapsed(true)}
        storeName={storeName}
      />

      {/* Main Content Area */}
      <div
        className={`transition-all duration-300 ease-in-out
            ${isMobile ? 'ml-0' : sidebarCollapsed ? 'ml-[180px]' : 'ml-[260px]'}
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
          businessLogo={businessLogo}
          storeName={storeName}
          sellerSlug={sellerSlug}
        />
        <main className="p-4 sm:p-6 lg:px-10 pt-6 sm:pt-8">
          {/* ── System Error Alerts (stays until manually dismissed) ── */}
          {systemAlerts.length > 0 && (
            <div className="flex flex-col gap-3 mb-6">
              {systemAlerts.map(alert => (
                <div
                  key={alert.id}
                  className="flex items-start gap-3 p-4 rounded-xl border bg-red-500/10 border-red-500/25 shadow-sm animate-in slide-in-from-top-2 duration-300"
                >
                  <div className="w-9 h-9 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <AlertTriangle size={18} className="text-red-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-bold text-sm text-red-500">{alert.title}</h3>
                      <span className="text-[10px] font-mono text-red-400/60 bg-red-500/10 px-1.5 py-0.5 rounded">{alert.code}</span>
                    </div>
                    <p className="text-sm text-theme-text opacity-80">{alert.message}</p>
                    <p className="text-[11px] text-red-400/50 mt-1">
                      {alert.timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} — Admin has been notified via Telegram
                    </p>
                  </div>
                  <button
                    onClick={() => dismissAlert(alert.id)}
                    title="Dismiss error"
                    aria-label="Dismiss error"
                    className="p-1.5 hover:bg-red-500/10 rounded-lg transition-colors flex-shrink-0 text-red-400"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
          {announcement && (
            <div className={`mb-6 p-4 rounded-xl border flex items-start gap-3 animate-in slide-in-from-top-2 shadow-sm ${announcement.type === 'warning' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
               announcement.type === 'update' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' :
                 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
              }`}>
              <Megaphone size={20} className="mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-bold text-sm">{announcement.title}</h3>
                <p className="text-sm opacity-90 mt-1">{announcement.content}</p>
              </div>
              <button
                onClick={() => setAnnouncement(null)}
                title="Close Announcement"
                className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors"
                aria-label="Close Announcement"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Global Backup Notification */}
          {(isBackupRunning || backupMessage) && (
            <div className={`mb-6 p-5 rounded-2xl border backdrop-blur-sm animate-in slide-in-from-top-4 fade-in duration-500 shadow-lg ${
                backupStatus === 'error' ? 'bg-red-500/10 border-red-500/20 shadow-red-500/5' :
                backupStatus === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 shadow-emerald-500/5' :
                'bg-emerald-500/10 border-emerald-500/20 shadow-emerald-500/5'
            }`}>
              <div className="flex flex-col md:flex-row items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    backupStatus === 'error' ? 'bg-red-500/20 text-red-500' :
                    backupStatus === 'success' ? 'bg-emerald-500/20 text-emerald-500' :
                    'bg-emerald-500/20 text-emerald-500 animate-pulse'
                }`}>
                  <Database size={24} />
                </div>
                
                <div className="flex-1 text-center md:text-left">
                  <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                    <h3 className={`font-bold ${
                        backupStatus === 'error' ? 'text-red-500' :
                        backupStatus === 'success' ? 'text-emerald-500' :
                        'text-emerald-500'
                    }`}>
                        {backupStatus === 'error' ? 'Backup Failed' : 
                         backupStatus === 'success' ? 'Backup Successful' : 
                         'Auto-Backup in Progress'}
                    </h3>
                    {isBackupRunning && (
                        <div className="flex gap-1">
                          <span className="w-1 h-1 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                          <span className="w-1 h-1 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                          <span className="w-1 h-1 bg-emerald-500 rounded-full animate-bounce"></span>
                        </div>
                    )}
                  </div>
                  <p className="text-sm text-theme-text opacity-90 font-medium">
                    {backupMessage || "Synchronizing your data accurately..."}
                  </p>
                  {isBackupRunning && (
                      <div className="flex items-center gap-2 mt-2 text-[11px] font-bold text-red-500 uppercase tracking-widest bg-red-500/5 px-3 py-1.5 rounded-lg border border-red-500/10 w-fit mx-auto md:mx-0">
                        <ShieldAlert size={14} />
                        PLEASE DO NOT CLOSE OR REFRESH THIS WINDOW
                      </div>
                  )}
                </div>

                <div className="flex flex-col items-center md:items-end gap-2 w-full md:w-48">
                  <div className={`flex justify-between w-full text-[10px] font-bold uppercase tracking-wider mb-1 px-1 ${
                      backupStatus === 'error' ? 'text-red-500' :
                      backupStatus === 'success' ? 'text-emerald-500' :
                      'text-emerald-500'
                  }`}>
                    <span>{backupStatus === 'success' ? 'Completed' : 'Progress'}</span>
                    <span>{backupProgress}%</span>
                  </div>
                  <div className={`h-2 w-full rounded-full overflow-hidden border ${
                      backupStatus === 'error' ? 'bg-red-500/10 border-red-500/10' :
                      backupStatus === 'success' ? 'bg-emerald-500/10 border-emerald-500/10' :
                      'bg-emerald-500/10 border-emerald-500/10'
                  }`}>
                    <div 
                      className={`h-full transition-all duration-700 ease-out rounded-full shadow-sm ${
                          backupStatus === 'error' ? 'bg-red-500' :
                          backupStatus === 'success' ? 'bg-emerald-500' :
                          'bg-emerald-500'
                      }`}
                      style={{ width: `${backupProgress}%` } as React.CSSProperties}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          <ErrorBoundary 
            title="Dashboard Component Error" 
            message="This section of the dashboard failed to load. The error has been reported to the admin."
          >
            {renderContent()}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}

export default App;
