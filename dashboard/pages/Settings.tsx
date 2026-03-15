
import React, { useState, useEffect } from 'react';
import {
    Save, Building, Mail, Phone, MapPin, Globe, CreditCard, Bell,
    Shield, Palette, Database, Layout, Loader2, Image, Lock,
    Smartphone, QrCode, Download, Edit2, Trash2, CheckCircle2,
    Users, Activity, Zap, CreditCard as BillingIcon, ChevronRight,
    Search, Bell as NotificationIcon, Truck, Plus, RefreshCw, Check, Send, AlertCircle, Info, Clock, LogOut, ExternalLink, Eye
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAutoBackup } from '../../hooks/useAutoBackup';
import { TwoFactorSetup } from '../../components/TwoFactorSetup';
import { TelegramSettings } from '../components/TelegramSettings';
import { SharedAccessPanel } from '../components/SharedAccessPanel';
import { AIContentHelper } from '../components/AIContentHelper';
import { ProfileSettings } from './settings/ProfileSettings';
import { SecuritySettings } from './settings/SecuritySettings';
import { AccessSettings } from './settings/AccessSettings';
import { NotificationsSettings } from './settings/NotificationsSettings';
import { BillingSettings } from './settings/BillingSettings';
import { AppearanceSettings } from './settings/AppearanceSettings';
import { DataSettings } from './settings/DataSettings';
import { SystemStatusSettings } from './settings/SystemStatusSettings';
import { ShippingSettings } from './settings/ShippingSettings';


type TabType = 'profile' | 'security' | 'access' | 'notifications' | 'billing' | 'appearance' | 'shipping' | 'data' | 'status';

interface HeroSettings {
    badge_text: string;
    headline_1: string;
    headline_2: string;
    headline_3: string;
    description: string;
    image_url: string;
    button_text: string;
}

interface StoreSettings {
    id?: number;
    store_name: string;
    business_type: string;
    address: string;
    phone: string;
    currency: string;
    tax_id: string;
    bank_details: string;
    invoice_footer: string;
    tax_percentage: number;
    socials: {
        instagram: string;
        facebook: string;
        twitter: string;
    };
    hero: HeroSettings;
    policies: {
        [key: string]: string;
    };
    trust_badges?: {
        icon: string;
        text: string;
    }[];
    notifications: {
        low_stock_email: boolean;
        low_stock_push: boolean;
        payment_received_email: boolean;
        payment_received_push: boolean;
        daily_summary_email: boolean;
        daily_summary_push: boolean;
        overdue_bills_email: boolean;
        overdue_bills_push: boolean;
    };
    shipping_fee: number;
    free_shipping_threshold: number;
    logo_url?: string;
    theme_config?: {
        hero?: HeroSettings;
    };
    enforce_2fa?: boolean;
}

interface Session {
    id: string;
    user_id: string;
    ip_address: string;
    device_info: string;
    last_active: string;
    location?: string;
    ua_string?: string;
}

interface SystemStatus {
    database: { status: 'connected' | 'disconnected' | 'checking'; latency: number | null };
    api: { status: 'healthy' | 'degraded' | 'down' | 'checking' };
    realtime: { status: 'live' | 'offline' | 'checking' };
    storage: { status: 'online' | 'offline' | 'checking' };
    region: string;
    provider: string;
}

interface ApiUsage {
    provider: string;
    count: number;
    limit: number;
    threshold: number;
}

const DEFAULT_HERO: HeroSettings = {
    badge_text: 'New Collection 2024',
    headline_1: 'Elevate Your',
    headline_2: 'Everyday',
    headline_3: 'Style',
    description: 'Discover a curated selection of premium essentials designed for modern life. Quality comfort meets timeless elegance.',
    image_url: '',
    button_text: 'Shop Collection'
};

const DEFAULT_THEME_CONFIG = {
    colors: { primary: '#4F46E5', secondary: '#10B981', background: '#FFFFFF', text: '#111827' },
    fonts: { heading: 'Inter', body: 'Inter' },
    borderRadius: '0.75rem',
    layout: { show_reviews: true, show_featured: true, show_hero: true },
    hero: { title: 'Welcome', subtitle: 'Discover amazing products', image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80', overlayOpacity: 0.5 }
};

const SETTINGS_DRAFT_KEY = 'vf_settings_draft';
const SETTINGS_TAB_KEY = 'vf_settings_active_tab';

const Settings = () => {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [show2FAModal, setShow2FAModal] = useState(false);
    const [timeoutVal, setTimeoutVal] = useState<number | ''>(60);
    const [timeoutUnit, setTimeoutUnit] = useState<'minutes' | 'hours' | 'never'>('minutes');
    const [activeTab, setActiveTab] = useState<TabType>(
        () => (localStorage.getItem(SETTINGS_TAB_KEY) as TabType | null) || 'profile'
    );
    const [showDraftBanner, setShowDraftBanner] = useState(false);
    const isInitialLoad = React.useRef(true);
    const [settings, setSettings] = useState<StoreSettings>({
        store_name: '',
        business_type: 'Retail Store',
        address: '',
        phone: '',
        currency: 'INR',
        tax_id: '',
        bank_details: '',
        invoice_footer: '',
        tax_percentage: 18,
        socials: {
            instagram: '',
            facebook: '',
            twitter: ''
        },
        hero: DEFAULT_HERO,
        policies: {},
        notifications: {
            low_stock_email: false,
            low_stock_push: true,
            payment_received_email: false,
            payment_received_push: true,
            daily_summary_email: false,
            daily_summary_push: true,
            overdue_bills_email: false,
            overdue_bills_push: true,
        },
        shipping_fee: 0,
        free_shipping_threshold: 0,
        trust_badges: [
            { icon: 'return', text: 'Free Returns within 30 days' },
            { icon: 'shield', text: 'Secure SSL Payments' },
            { icon: 'truck', text: 'Free Express Shipping over ₹5,000' },
            { icon: 'check', text: 'Authenticity Guaranteed' }
        ],
        logo_url: ''
    });

    // System Status State
    const [systemStatus, setSystemStatus] = useState<SystemStatus>({
        database: { status: 'checking', latency: null },
        api: { status: 'checking' },
        realtime: { status: 'checking' },
        storage: { status: 'checking' },
        region: 'us-east-1',
        provider: 'Supabase'
    });

    const [apiUsage, setApiUsage] = useState<ApiUsage[]>([]);
    const [loadingApiUsage, setLoadingApiUsage] = useState(false);

    const [sessions, setSessions] = useState<Session[]>([]);
    const [loadingSessions, setLoadingSessions] = useState(false);
    const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set());
    const [isRevoking, setIsRevoking] = useState(false);

    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [activePreviews, setActivePreviews] = useState<any[]>([]);

    const fetchPreviews = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-previews/vendor`, {
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setActivePreviews(data);
            }
        } catch (error) {
            console.error('Error fetching previews', error);
        }
    };

    const handleDeletePreview = async (id: string) => {
        if (!confirm('Are you sure you want to delete this preview?')) return;
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-previews/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            if (res.ok) {
                fetchPreviews();
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to delete preview');
            }
        } catch (error) {
            console.error('Error deleting preview', error);
        }
    };

    const handleCreatePreview = async () => {
        setPreviewLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("No active session");

            const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-previews`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ action: 'create' })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create preview');
            }

            const data = await response.json();
            setPreviewUrl(`${window.location.origin}/preview/${data.preview.id}`);
            fetchPreviews();
        } catch (error: any) {
            console.error('Error creating preview:', error);
            alert(`Error creating preview: ${error.message}`);
        } finally {
            setPreviewLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'security') {
            fetchSessions();
        } else if (activeTab === 'appearance') {
            fetchPreviews();
        }
    }, [activeTab]);

    const fetchSessions = async () => {
        setLoadingSessions(true);
        const { data } = await supabase
            .from('user_sessions')
            .select('*')
            .order('last_active', { ascending: false });

        if (data) {
            // Enrich with location (mock or fetch)
            // For now, we'll just set them. In a real app, we'd batch fetch locations.
            const enriched = await Promise.all(data.map(async (s) => {
                let location = 'Unknown Location';
                try {
                    if (s.ip_address && s.ip_address !== '127.0.0.1' && s.ip_address !== 'localhost') {
                        const res = await fetch(`https://ipapi.co/${s.ip_address}/json/`);
                        const json = await res.json();
                        if (json.city) location = `${json.city}, ${json.country_name}`;
                    } else {
                        location = 'Localhost';
                    }
                } catch (e) { console.error('Loc fetch error', e); }
                return { ...s, location };
            }));
            setSessions(enriched);
        }
        setLoadingSessions(false);
    };

    // Check system status when status tab is active
    useEffect(() => {
        if (activeTab === 'status') {
            checkSystemStatus();
            const interval = setInterval(checkSystemStatus, 30000); // Check every 30s
            return () => clearInterval(interval);
        }
    }, [activeTab]);

    const checkSystemStatus = async () => {
        setSystemStatus(prev => ({ ...prev, database: { ...prev.database, status: 'checking' } }));

        // 1. Check Database
        const startDb = performance.now();
        const { error: dbError } = await supabase.from('store_settings').select('count').limit(1).maybeSingle();
        const dbLatency = Math.round(performance.now() - startDb);

        // 2. Check API (Edge Functions)
        // We call a function, even if it returns 403/401 it means infrastructure is UP
        const { error: fnError } = await supabase.functions.invoke('seller-status');
        // If error is network error, then down. If error is 4xx/5xx from function logic, it's UP but maybe logic error.
        // Supabase client 'error' usually means invocation failed (network) or function threw error.
        // We'll treat 'Response' as healthy infrastructure.

        // 3. Check Storage
        const { error: storageError } = await supabase.storage.listBuckets();

        // Update Static Statuses immediately
        setSystemStatus(prev => ({
            ...prev,
            database: { status: dbError ? 'disconnected' : 'connected', latency: dbLatency },
            api: { status: fnError && fnError.message === 'Failed to send request' ? 'down' : 'healthy' }, // Rough check
            storage: { status: storageError ? 'offline' : 'online' },
            realtime: { status: 'checking' }
        }));

        // 4. Check Realtime
        const channelId = `health-${Date.now()}`;
        const channel = supabase.channel(channelId);
        channel.subscribe((status, err) => {
            if (status === 'SUBSCRIBED') {
                setSystemStatus(prev => ({ ...prev, realtime: { status: 'live' } }));
                supabase.removeChannel(channel);
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
                console.warn(`Realtime Health Check Failed: ${status}`, err);
                setSystemStatus(prev => ({ ...prev, realtime: { status: 'offline' } }));
                supabase.removeChannel(channel);
            }
        });

        // 5. Check API Usage
        fetchApiUsage();
    };

    const fetchApiUsage = async () => {
        setLoadingApiUsage(true);
        try {
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);

            // Fetch limits config
            const { data: configs, error: configErr } = await supabase
                .from('api_limits_config')
                .select('*');

            if (configErr) throw configErr;

            // Fetch usage counts for each provider
            const usageData = await Promise.all((configs || []).map(async (config) => {
                const { count, error: countErr } = await supabase
                    .from('api_usage_logs')
                    .select('*', { count: 'exact', head: true })
                    .eq('provider', config.provider)
                    .gte('created_at', startOfMonth.toISOString());

                return {
                    provider: config.provider,
                    count: count || 0,
                    limit: config.monthly_limit,
                    threshold: config.alert_threshold_pct
                };
            }));

            setApiUsage(usageData);
        } catch (error) {
            console.error('Error fetching API usage:', error);
        } finally {
            setLoadingApiUsage(false);
        }
    };

    const { lastBackupDate, connectAndBackup, performBackup, isBackupRunning, backupStatus, downloadLocalBackup } = useAutoBackup(false);

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        const file = e.target.files[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `logos/${fileName}`;

        try {
            setSaving(true);
            const { error: uploadError } = await supabase.storage
                .from('store-assets')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('store-assets')
                .getPublicUrl(filePath);

            setSettings(prev => ({ ...prev, logo_url: publicUrl }));
        } catch (error) {
            console.error('Error uploading logo:', error);
            alert('Failed to upload logo.');
        } finally {
            setSaving(false);
        }
    };

    const formatUaString = (ua: string) => {
        if (!ua) return 'Unknown Device';
        const mobile = /Mobile|Android|iPhone/i.test(ua);
        const browser = /Chrome/i.test(ua) ? 'Chrome' : /Firefox/i.test(ua) ? 'Firefox' : /Safari/i.test(ua) ? 'Safari' : 'Browser';
        return `${mobile ? 'Mobile' : 'Desktop'} · ${browser}`;
    };

    const getDeviceIcon = (ua?: string) => {
        if (!ua) return 'desktop';
        return /Mobile|Android|iPhone/i.test(ua) ? 'mobile' : 'desktop';
    };

    const handleRevokeSession = async (sessionId: string) => {
        setIsRevoking(true);
        try {
            await supabase.from('user_sessions').delete().eq('id', sessionId);
            await fetchSessions();
        } catch (error) {
            console.error('Error revoking session:', error);
        } finally {
            setIsRevoking(false);
        }
    };

    const handleRevokeSelected = async () => {
        if (selectedSessions.size === 0) return;
        setIsRevoking(true);
        try {
            await supabase.from('user_sessions').delete().in('id', Array.from(selectedSessions));
            setSelectedSessions(new Set());
            await fetchSessions();
        } catch (error) {
            console.error('Error revoking sessions:', error);
        } finally {
            setIsRevoking(false);
        }
    };

    // Persist active tab
    useEffect(() => {
        localStorage.setItem(SETTINGS_TAB_KEY, activeTab);
    }, [activeTab]);

    // Auto-save draft on settings change (debounced, skips initial load)
    useEffect(() => {
        if (isInitialLoad.current) return;
        const timer = setTimeout(() => {
            localStorage.setItem(SETTINGS_DRAFT_KEY, JSON.stringify({ settings, savedAt: Date.now() }));
        }, 500);
        return () => clearTimeout(timer);
    }, [settings]);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('store_settings')
                .select('*')
                .eq('seller_id', user.id)
                .maybeSingle();

            if (error) {
                console.error('Error fetching settings:', error);
            }

            if (data) {
                setSettings({
                    ...data,
                    business_type: data.business_type || 'Retail Store',
                    currency: data.currency || 'INR',
                    socials: data.socials || { instagram: '', facebook: '', twitter: '' },
                    hero: data.hero || DEFAULT_HERO,
                    policies: data.policies || {},
                    notifications: data.notifications || {
                        low_stock_email: false,
                        low_stock_push: true,
                        payment_received_email: false,
                        payment_received_push: true,
                        daily_summary_email: false,
                        daily_summary_push: true,
                        overdue_bills_email: false,
                        overdue_bills_push: true,
                    },
                    tax_percentage: data.tax_percentage || 18,
                    bank_details: data.bank_details || '',
                    invoice_footer: data.invoice_footer || '',
                    shipping_fee: data.shipping_fee || 0,
                    free_shipping_threshold: data.free_shipping_threshold || 0,
                    theme_config: data.theme_config || DEFAULT_THEME_CONFIG,
                    trust_badges: data.trust_badges || [
                        { icon: 'return', text: 'Free Returns within 30 days' },
                        { icon: 'shield', text: 'Secure SSL Payments' },
                        { icon: 'truck', text: 'Free Express Shipping over ₹5,000' },
                        { icon: 'check', text: 'Authenticity Guaranteed' }
                    ],
                    logo_url: data.logo_url || '',
                    session_timeout_minutes: data.session_timeout_minutes || 60,
                    enforce_2fa: data.enforce_2fa || false
                });

                // Sync local timeout state
                const mins = data.session_timeout_minutes;
                if (!mins || mins <= 0) {
                    setTimeoutUnit('never');
                    setTimeoutVal('');
                } else if (mins % 60 === 0) {
                    setTimeoutUnit('hours');
                    setTimeoutVal(mins / 60);
                } else {
                    setTimeoutUnit('minutes');
                    setTimeoutVal(mins);
                }
            }
            // After DB fetch, check if a newer draft exists
            const raw = localStorage.getItem(SETTINGS_DRAFT_KEY);
            if (raw) {
                try {
                    const draft = JSON.parse(raw);
                    // Show banner if draft was saved within last 24 hours
                    if (draft.savedAt && Date.now() - draft.savedAt < 24 * 60 * 60 * 1000) {
                        setShowDraftBanner(true);
                    } else {
                        localStorage.removeItem(SETTINGS_DRAFT_KEY);
                    }
                } catch { localStorage.removeItem(SETTINGS_DRAFT_KEY); }
            }
        } catch (err) {
            console.error(err);
        } finally {
            isInitialLoad.current = false;
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // Calculate minutes based on unit
            let finalMinutes = 0;
            if (timeoutUnit === 'never') {
                finalMinutes = -1; // -1 represents 'Never'
            } else if (timeoutUnit === 'hours') {
                finalMinutes = (typeof timeoutVal === 'number' ? timeoutVal : 0) * 60;
            } else {
                finalMinutes = typeof timeoutVal === 'number' ? timeoutVal : 60;
            }

            const payload = {
                seller_id: user.id,
                store_name: settings.store_name,
                business_type: settings.business_type,
                address: settings.address,
                phone: settings.phone,
                currency: settings.currency,
                tax_id: settings.tax_id,
                socials: settings.socials,
                hero: settings.hero,
                policies: settings.policies,
                notifications: settings.notifications,
                bank_details: settings.bank_details,
                invoice_footer: settings.invoice_footer,
                tax_percentage: settings.tax_percentage,
                shipping_fee: settings.shipping_fee,
                free_shipping_threshold: settings.free_shipping_threshold,

                theme_config: settings.theme_config,
                trust_badges: settings.trust_badges,
                logo_url: settings.logo_url,
                session_timeout_minutes: finalMinutes,
                enforce_2fa: settings.enforce_2fa
            };

            let result;
            if (settings.id) {
                result = await supabase
                    .from('store_settings')
                    .update(payload)
                    .eq('id', settings.id);
            } else {
                result = await supabase
                    .from('store_settings')
                    .insert([payload]);
            }

            if (result.error) throw result.error;

            localStorage.removeItem(SETTINGS_DRAFT_KEY);
            setShowDraftBanner(false);
            await fetchSettings();
            alert('Settings saved successfully!');
        } catch (error) {
            console.error('Error saving settings:', error);
            alert('Failed to save settings.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-primary" size={32} /></div>;
    }

    const navItems = [
        { id: 'profile', label: 'Business Profile', icon: Building },
        { id: 'security', label: 'Account & Security', icon: Shield },
        { id: 'access', label: 'Shared Access', icon: Users },
        { id: 'notifications', label: 'Notifications', icon: NotificationIcon },
        { id: 'billing', label: 'Billing & Finance', icon: BillingIcon },
        { id: 'shipping', label: 'Shipping & Delivery', icon: Truck },
        { id: 'appearance', label: 'Appearance', icon: Palette },
        { id: 'data', label: 'Data & Backup', icon: Database },
        { id: 'status', label: 'System Status', icon: Activity },
    ];

    const renderHeader = (title: string, icon: React.ReactNode) => (
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                    {icon}
                </div>
                <h3 className="font-bold text-lg text-text">{title}</h3>
            </div>
            <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-xl hover:opacity-90 transition-all font-medium disabled:opacity-50 text-sm shadow-sm"
            >
                {saving ? <Loader2 className="animate-spin w-4 h-4" /> : <Save size={16} />}
                {saving ? 'Saving...' : 'Save Changes'}
            </button>
        </div>
    );

    const renderTabContent = () => {
        
        switch (activeTab) {
            case 'profile': return <ProfileSettings settings={settings} setSettings={setSettings} renderHeader={renderHeader} handleLogoUpload={handleLogoUpload} saving={saving} setSaving={setSaving} show2FAModal={show2FAModal} setShow2FAModal={setShow2FAModal} timeoutVal={timeoutVal} setTimeoutVal={setTimeoutVal} timeoutUnit={timeoutUnit} setTimeoutUnit={setTimeoutUnit} systemStatus={systemStatus} apiUsage={apiUsage} loadingApiUsage={loadingApiUsage} sessions={sessions} loadingSessions={loadingSessions} selectedSessions={selectedSessions} setSelectedSessions={setSelectedSessions} isRevoking={isRevoking} handleRevokeSession={handleRevokeSession} handleRevokeSelected={handleRevokeSelected} formatUaString={formatUaString} getDeviceIcon={getDeviceIcon} DEFAULT_THEME_CONFIG={DEFAULT_THEME_CONFIG} activePreviews={activePreviews} previewLoading={previewLoading} setPreviewLoading={setPreviewLoading} fetchPreviews={fetchPreviews} />;
            case 'security': return <SecuritySettings settings={settings} setSettings={setSettings} renderHeader={renderHeader} handleLogoUpload={handleLogoUpload} saving={saving} setSaving={setSaving} show2FAModal={show2FAModal} setShow2FAModal={setShow2FAModal} timeoutVal={timeoutVal} setTimeoutVal={setTimeoutVal} timeoutUnit={timeoutUnit} setTimeoutUnit={setTimeoutUnit} systemStatus={systemStatus} apiUsage={apiUsage} loadingApiUsage={loadingApiUsage} sessions={sessions} loadingSessions={loadingSessions} selectedSessions={selectedSessions} setSelectedSessions={setSelectedSessions} isRevoking={isRevoking} setIsRevoking={setIsRevoking} fetchSessions={fetchSessions} handleRevokeSession={handleRevokeSession} handleRevokeSelected={handleRevokeSelected} formatUaString={formatUaString} getDeviceIcon={getDeviceIcon} DEFAULT_THEME_CONFIG={DEFAULT_THEME_CONFIG} activePreviews={activePreviews} previewLoading={previewLoading} setPreviewLoading={setPreviewLoading} fetchPreviews={fetchPreviews} />;
            case 'access': return <AccessSettings settings={settings} setSettings={setSettings} renderHeader={renderHeader} handleLogoUpload={handleLogoUpload} saving={saving} setSaving={setSaving} show2FAModal={show2FAModal} setShow2FAModal={setShow2FAModal} timeoutVal={timeoutVal} setTimeoutVal={setTimeoutVal} timeoutUnit={timeoutUnit} setTimeoutUnit={setTimeoutUnit} systemStatus={systemStatus} apiUsage={apiUsage} loadingApiUsage={loadingApiUsage} sessions={sessions} loadingSessions={loadingSessions} selectedSessions={selectedSessions} setSelectedSessions={setSelectedSessions} isRevoking={isRevoking} handleRevokeSession={handleRevokeSession} handleRevokeSelected={handleRevokeSelected} formatUaString={formatUaString} getDeviceIcon={getDeviceIcon} DEFAULT_THEME_CONFIG={DEFAULT_THEME_CONFIG} activePreviews={activePreviews} previewLoading={previewLoading} setPreviewLoading={setPreviewLoading} fetchPreviews={fetchPreviews} />;
            case 'notifications': return <NotificationsSettings settings={settings} setSettings={setSettings} renderHeader={renderHeader} handleLogoUpload={handleLogoUpload} saving={saving} setSaving={setSaving} show2FAModal={show2FAModal} setShow2FAModal={setShow2FAModal} timeoutVal={timeoutVal} setTimeoutVal={setTimeoutVal} timeoutUnit={timeoutUnit} setTimeoutUnit={setTimeoutUnit} systemStatus={systemStatus} apiUsage={apiUsage} loadingApiUsage={loadingApiUsage} sessions={sessions} loadingSessions={loadingSessions} selectedSessions={selectedSessions} setSelectedSessions={setSelectedSessions} isRevoking={isRevoking} handleRevokeSession={handleRevokeSession} handleRevokeSelected={handleRevokeSelected} formatUaString={formatUaString} getDeviceIcon={getDeviceIcon} DEFAULT_THEME_CONFIG={DEFAULT_THEME_CONFIG} activePreviews={activePreviews} previewLoading={previewLoading} setPreviewLoading={setPreviewLoading} fetchPreviews={fetchPreviews} />;
            case 'billing': return <BillingSettings settings={settings} setSettings={setSettings} renderHeader={renderHeader} handleLogoUpload={handleLogoUpload} saving={saving} setSaving={setSaving} show2FAModal={show2FAModal} setShow2FAModal={setShow2FAModal} timeoutVal={timeoutVal} setTimeoutVal={setTimeoutVal} timeoutUnit={timeoutUnit} setTimeoutUnit={setTimeoutUnit} systemStatus={systemStatus} apiUsage={apiUsage} loadingApiUsage={loadingApiUsage} sessions={sessions} loadingSessions={loadingSessions} selectedSessions={selectedSessions} setSelectedSessions={setSelectedSessions} isRevoking={isRevoking} handleRevokeSession={handleRevokeSession} handleRevokeSelected={handleRevokeSelected} formatUaString={formatUaString} getDeviceIcon={getDeviceIcon} DEFAULT_THEME_CONFIG={DEFAULT_THEME_CONFIG} activePreviews={activePreviews} previewLoading={previewLoading} setPreviewLoading={setPreviewLoading} fetchPreviews={fetchPreviews} />;
            case 'appearance': return <AppearanceSettings settings={settings} setSettings={setSettings} renderHeader={renderHeader} handleLogoUpload={handleLogoUpload} saving={saving} setSaving={setSaving} show2FAModal={show2FAModal} setShow2FAModal={setShow2FAModal} timeoutVal={timeoutVal} setTimeoutVal={setTimeoutVal} timeoutUnit={timeoutUnit} setTimeoutUnit={setTimeoutUnit} systemStatus={systemStatus} apiUsage={apiUsage} loadingApiUsage={loadingApiUsage} sessions={sessions} loadingSessions={loadingSessions} selectedSessions={selectedSessions} setSelectedSessions={setSelectedSessions} isRevoking={isRevoking} handleRevokeSession={handleRevokeSession} handleRevokeSelected={handleRevokeSelected} formatUaString={formatUaString} getDeviceIcon={getDeviceIcon} DEFAULT_THEME_CONFIG={DEFAULT_THEME_CONFIG} activePreviews={activePreviews} previewLoading={previewLoading} setPreviewLoading={setPreviewLoading} fetchPreviews={fetchPreviews} handleCreatePreview={handleCreatePreview} previewUrl={previewUrl} handleDeletePreview={handleDeletePreview} />;
            case 'data': return <DataSettings settings={settings} setSettings={setSettings} renderHeader={renderHeader} handleLogoUpload={handleLogoUpload} saving={saving} setSaving={setSaving} show2FAModal={show2FAModal} setShow2FAModal={setShow2FAModal} timeoutVal={timeoutVal} setTimeoutVal={setTimeoutVal} timeoutUnit={timeoutUnit} setTimeoutUnit={setTimeoutUnit} systemStatus={systemStatus} apiUsage={apiUsage} loadingApiUsage={loadingApiUsage} sessions={sessions} loadingSessions={loadingSessions} selectedSessions={selectedSessions} setSelectedSessions={setSelectedSessions} isRevoking={isRevoking} handleRevokeSession={handleRevokeSession} handleRevokeSelected={handleRevokeSelected} formatUaString={formatUaString} getDeviceIcon={getDeviceIcon} DEFAULT_THEME_CONFIG={DEFAULT_THEME_CONFIG} activePreviews={activePreviews} previewLoading={previewLoading} setPreviewLoading={setPreviewLoading} fetchPreviews={fetchPreviews} backupStatus={backupStatus} lastBackupDate={lastBackupDate} isBackupRunning={isBackupRunning} downloadLocalBackup={downloadLocalBackup} connectAndBackup={connectAndBackup} performBackup={performBackup} />;
            case 'status': return <SystemStatusSettings settings={settings} setSettings={setSettings} renderHeader={renderHeader} handleLogoUpload={handleLogoUpload} saving={saving} setSaving={setSaving} show2FAModal={show2FAModal} setShow2FAModal={setShow2FAModal} timeoutVal={timeoutVal} setTimeoutVal={setTimeoutVal} timeoutUnit={timeoutUnit} setTimeoutUnit={setTimeoutUnit} systemStatus={systemStatus} apiUsage={apiUsage} loadingApiUsage={loadingApiUsage} sessions={sessions} loadingSessions={loadingSessions} selectedSessions={selectedSessions} setSelectedSessions={setSelectedSessions} isRevoking={isRevoking} handleRevokeSession={handleRevokeSession} handleRevokeSelected={handleRevokeSelected} formatUaString={formatUaString} getDeviceIcon={getDeviceIcon} DEFAULT_THEME_CONFIG={DEFAULT_THEME_CONFIG} activePreviews={activePreviews} previewLoading={previewLoading} setPreviewLoading={setPreviewLoading} fetchPreviews={fetchPreviews} fetchApiUsage={fetchApiUsage} />;
            case 'shipping': return <ShippingSettings settings={settings} setSettings={setSettings} renderHeader={renderHeader} handleLogoUpload={handleLogoUpload} saving={saving} setSaving={setSaving} show2FAModal={show2FAModal} setShow2FAModal={setShow2FAModal} timeoutVal={timeoutVal} setTimeoutVal={setTimeoutVal} timeoutUnit={timeoutUnit} setTimeoutUnit={setTimeoutUnit} systemStatus={systemStatus} apiUsage={apiUsage} loadingApiUsage={loadingApiUsage} sessions={sessions} loadingSessions={loadingSessions} selectedSessions={selectedSessions} setSelectedSessions={setSelectedSessions} isRevoking={isRevoking} handleRevokeSession={handleRevokeSession} handleRevokeSelected={handleRevokeSelected} formatUaString={formatUaString} getDeviceIcon={getDeviceIcon} DEFAULT_THEME_CONFIG={DEFAULT_THEME_CONFIG} activePreviews={activePreviews} previewLoading={previewLoading} setPreviewLoading={setPreviewLoading} fetchPreviews={fetchPreviews} />;
            default: return null;
        }
    };

    return (
        <div className="max-w-[1200px] mx-auto space-y-8 animate-fadeIn pb-20">
            {/* Page Header */}
            <div className="px-2">
                <h1 className="text-3xl font-heading font-black text-text tracking-tight mb-1">Store Settings</h1>
                <div className="flex items-center gap-2 text-sm text-muted">
                    <Building size={14} />
                    <span>Management Dashboard</span>
                    <ChevronRight size={14} className="opacity-30" />
                    <span className="text-primary font-medium">{navItems.find(i => i.id === activeTab)?.label}</span>
                </div>
            </div>

            {/* Unsaved Draft Restore Banner */}
            {showDraftBanner && (
                <div className="flex items-center justify-between gap-4 px-5 py-3.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 rounded-2xl text-sm shadow-sm animate-fadeIn">
                    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-medium">
                        <span className="text-base">📝</span>
                        You have unsaved changes from a previous session.
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                            onClick={() => {
                                const raw = localStorage.getItem(SETTINGS_DRAFT_KEY);
                                if (!raw) return;
                                try {
                                    const draft = JSON.parse(raw);
                                    if (draft.settings) {
                                        isInitialLoad.current = true;
                                        setSettings(draft.settings);
                                        setTimeout(() => { isInitialLoad.current = false; }, 100);
                                    }
                                } catch { /* ignore */ }
                                setShowDraftBanner(false);
                            }}
                            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs transition-colors"
                        >
                            Restore
                        </button>
                        <button
                            onClick={() => {
                                localStorage.removeItem(SETTINGS_DRAFT_KEY);
                                setShowDraftBanner(false);
                            }}
                            className="px-3 py-1.5 bg-transparent hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-400 font-medium rounded-lg text-xs transition-colors border border-amber-300 dark:border-amber-700"
                        >
                            Discard
                        </button>
                    </div>
                </div>
            )}

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Fixed Navigation Sidebar */}
                <div className="w-full lg:w-72 flex-shrink-0 space-y-6">
                    <div className="bg-panel rounded-3xl p-3 border border-border shadow-soft">
                        <div className="px-4 py-5 mb-2">
                            <h2 className="text-xl font-heading font-bold text-text">Settings</h2>
                            <p className="text-xs text-muted mt-1 leading-relaxed">Manage your store and account</p>
                        </div>

                        <div className="space-y-1">
                            {navItems.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveTab(item.id as TabType)}
                                    className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl font-bold text-xs transition-all tracking-wide ${activeTab === item.id
                                        ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.02]'
                                        : 'text-muted hover:bg-bg hover:text-text'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <item.icon size={18} />
                                        {item.label}
                                    </div>
                                    {activeTab === item.id && <ChevronRight size={14} className="opacity-80" />}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Dynamic Main Content Form */}
                <div className="flex-grow min-w-0">
                    {renderTabContent()}
                </div>
            </div>

            {show2FAModal && (
                <TwoFactorSetup
                    onClose={() => setShow2FAModal(false)}
                    onComplete={() => {
                        setShow2FAModal(false);
                    }}
                />
            )}
        </div>
    );
};

export default Settings;
