
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
}

interface Session {
    id: string;
    user_id: string;
    ip_address: string;
    device_info: string;
    last_active: string;
    location?: string; // We'll fetch this client-side if not in DB
}

interface SystemStatus {
    database: { status: 'connected' | 'disconnected' | 'checking'; latency: number | null };
    api: { status: 'healthy' | 'degraded' | 'down' | 'checking' };
    realtime: { status: 'live' | 'offline' | 'checking' };
    storage: { status: 'online' | 'offline' | 'checking' };
    region: string;
    provider: string;
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

const Settings = () => {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [show2FAModal, setShow2FAModal] = useState(false);
    const [timeoutVal, setTimeoutVal] = useState<number | ''>(60);
    const [timeoutUnit, setTimeoutUnit] = useState<'minutes' | 'hours' | 'never'>('minutes');
    const [activeTab, setActiveTab] = useState<TabType>('profile');
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
        } catch (err) {
            console.error(err);
        } finally {
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
            case 'profile':
                return (
                    <div className="bg-panel rounded-2xl p-8 border border-border shadow-sm animate-fadeIn">
                        {renderHeader('Business Profile', <Building size={20} />)}

                        <div className="flex gap-10">
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-32 h-32 rounded-2xl overflow-hidden border-2 border-border bg-bg relative group shadow-sm transition-transform hover:scale-[1.02]">
                                    <img
                                        src={settings.logo_url || "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?q=80&w=2070&auto=format&fit=crop"}
                                        alt="Business Logo"
                                        className="w-full h-full object-cover"
                                    />
                                    <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                                        <Edit2 className="text-white" size={20} />
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleLogoUpload}
                                            className="hidden"
                                        />
                                    </label>
                                </div>
                                <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Business Logo</span>
                            </div>

                            <div className="flex-grow grid grid-cols-2 gap-6">
                                <div className="col-span-1">
                                    <label className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-2">Business Name</label>
                                    <input
                                        type="text"
                                        value={settings.store_name}
                                        onChange={(e) => setSettings({ ...settings, store_name: e.target.value })}
                                        className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-text focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-sm font-medium"
                                        placeholder="Enter business name"
                                    />
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-2">Business Type</label>
                                    <input
                                        type="text"
                                        value={settings.business_type}
                                        onChange={(e) => setSettings({ ...settings, business_type: e.target.value })}
                                        className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-text focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-sm font-medium"
                                        placeholder="Retail Store"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-2">Office Address</label>
                                    <div className="relative">
                                        <div className="absolute left-3 top-3.5 text-muted">
                                            <MapPin size={16} />
                                        </div>
                                        <textarea
                                            value={settings.address}
                                            onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                                            rows={2}
                                            className="w-full bg-bg border border-border rounded-xl px-10 py-3 text-text focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-sm font-medium resize-none leading-relaxed"
                                            placeholder="123 Business Park, Suite 405, Mumbai, IN"
                                        />
                                    </div>
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-2">Phone Number</label>
                                    <div className="relative">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">
                                            <Phone size={16} />
                                        </div>
                                        <input
                                            type="text"
                                            value={settings.phone}
                                            onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                                            className="w-full bg-bg border border-border rounded-xl px-10 py-3 text-text focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-sm font-medium"
                                            placeholder="+91 98765-43210"
                                        />
                                    </div>
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-2">GST / Tax ID</label>
                                    <input
                                        type="text"
                                        value={settings.tax_id}
                                        onChange={(e) => setSettings({ ...settings, tax_id: e.target.value })}
                                        className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-text focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-sm font-medium"
                                        placeholder="27AAAAA0000A1Z5"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'security':
                return (
                    <div className="space-y-6 animate-fadeIn">
                        <div className="bg-panel rounded-2xl p-8 border border-border shadow-sm">
                            {renderHeader('Account & Security', <Shield size={20} />)}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="bg-bg/50 p-6 rounded-2xl border border-border">
                                    <div className="flex items-center gap-2 mb-6 text-primary">
                                        <Lock size={18} />
                                        <h4 className="font-bold text-sm">Change Password</h4>
                                    </div>
                                    <div className="space-y-4">
                                        <input
                                            type="password"
                                            placeholder="Current Password"
                                            className="w-full bg-panel border border-border rounded-xl px-4 py-3 text-text focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                                        />
                                        <input
                                            type="password"
                                            placeholder="New Password"
                                            className="w-full bg-panel border border-border rounded-xl px-4 py-3 text-text focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                                        />
                                        <button className="w-full bg-bg border border-border hover:bg-bg/80 text-text font-bold py-3 rounded-xl transition-all text-sm mt-2 shadow-sm">
                                            Update Password
                                        </button>
                                    </div>
                                </div>

                                <div className="bg-bg/50 p-6 rounded-2xl border border-border flex flex-col">
                                    <div className="flex items-center gap-2 mb-4 text-primary">
                                        <Lock size={18} />
                                        <h4 className="font-bold text-sm">Access Policy</h4>
                                    </div>

                                    <div className="space-y-6 flex-1">
                                        {/* Session Timeout Controls */}
                                        <div>
                                            <label className="text-[10px] font-bold text-muted uppercase tracking-wider mb-2 block">SESSION TIMEOUT</label>
                                            <div className="flex items-center gap-2">
                                                <div className="relative flex-1">
                                                    <input
                                                        type="number"
                                                        value={timeoutVal}
                                                        onChange={(e) => setTimeoutVal(e.target.value === '' ? '' : parseInt(e.target.value))}
                                                        disabled={timeoutUnit === 'never'}
                                                        className="w-full bg-bg border border-border rounded-xl px-4 py-2 text-text focus:outline-none focus:border-primary transition-colors pl-10 disabled:opacity-50 disabled:cursor-not-allowed"
                                                        placeholder={timeoutUnit === 'never' ? 'Infinite' : 'Enter duration'}
                                                    />
                                                    <Clock size={16} className="absolute left-3 top-2.5 text-muted" />
                                                </div>

                                                <select
                                                    value={timeoutUnit}
                                                    onChange={(e) => {
                                                        const unit = e.target.value as any;
                                                        setTimeoutUnit(unit);
                                                        // Default values when switching
                                                        if (unit === 'never') setTimeoutVal('');
                                                        if (unit === 'hours' && (timeoutVal === '' || typeof timeoutVal !== 'number')) setTimeoutVal(1);
                                                        if (unit === 'minutes' && (timeoutVal === '' || typeof timeoutVal !== 'number')) setTimeoutVal(60);
                                                    }}
                                                    className="bg-bg border border-border rounded-xl px-4 py-2 text-text text-sm focus:outline-none focus:border-primary transition-colors cursor-pointer hover:bg-bg/80"
                                                >
                                                    <option value="minutes">Minutes</option>
                                                    <option value="hours">Hours</option>
                                                    <option value="never">Never</option>
                                                </select>
                                            </div>
                                            <p className="text-[10px] text-muted mt-2">
                                                {timeoutUnit === 'never'
                                                    ? "Staff will remain logged in indefinitely until they manually logout."
                                                    : `Auto-logout inactive staff after ${timeoutVal || 0} ${timeoutUnit}.`
                                                }
                                            </p>
                                        </div>

                                        {/* 2FA Toggle */}
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between p-3 bg-bg border border-border rounded-xl">
                                                <div className="flex items-center gap-3">
                                                    <Smartphone size={18} className="text-primary" />
                                                    <div>
                                                        <div className="text-sm font-bold text-text">Enforce 2FA</div>
                                                        <div className="text-[10px] text-muted">Require Two-Factor Auth for Staff</div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => setSettings({ ...settings, enforce_2fa: !settings.enforce_2fa })}
                                                    className={`w-10 h-5 rounded-full p-0.5 transition-colors ${settings.enforce_2fa ? 'bg-primary' : 'bg-gray-300'}`}
                                                    aria-label="Toggle 2FA enforcement"
                                                >
                                                    <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${settings.enforce_2fa ? 'translate-x-5' : 'translate-x-0'}`} />
                                                </button>
                                            </div>

                                            {/* 2FA Explanation Box */}
                                            <div className={`p-3 rounded-lg text-xs leading-relaxed border transition-all ${settings.enforce_2fa ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-bg border-border text-muted'}`}>
                                                <div className="flex gap-2">
                                                    <Info size={14} className="flex-shrink-0 mt-0.5" />
                                                    <div>
                                                        <span className="font-bold block mb-1">Policy Effect:</span>
                                                        {settings.enforce_2fa
                                                            ? "All staff accounts will be required to set up 2FA to access this dashboard."
                                                            : "2FA is optional for your staff."
                                                        }
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 bg-green-50 border border-green-100 p-5 rounded-2xl flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-green-500/20 text-green-600 rounded-full flex items-center justify-center">
                                        <CheckCircle2 size={24} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-sm text-green-900">Your Two-Step Verification</h4>
                                        <p className="text-xs text-green-700/80">Secure your personal account with mobile OTP verification.</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShow2FAModal(true)}
                                    className="text-primary font-bold text-sm hover:underline"
                                >
                                    Manage My 2FA
                                </button>
                            </div>

                            {/* Active Sessions List */}
                            <div className="mt-8 bg-panel border border-border rounded-2xl p-8">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                                            <Users size={20} />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold text-text">Session History</h2>
                                            <p className="text-muted text-xs">Detailed history of devices logged into your account</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {/* Bulk Delete Button */}
                                        {selectedSessions.size > 0 && (
                                            <button
                                                onClick={async () => {
                                                    const count = selectedSessions.size;
                                                    if (!confirm(`Revoke ${count} selected session(s)? These devices will be logged out immediately.`)) return;
                                                    setIsRevoking(true);
                                                    try {
                                                        // Delete all selected sessions
                                                        const { error } = await supabase
                                                            .from('user_sessions')
                                                            .delete()
                                                            .in('id', Array.from(selectedSessions));

                                                        if (error) throw error;

                                                        setSelectedSessions(new Set());
                                                        await fetchSessions();
                                                    } catch (e) {
                                                        console.error('Bulk revoke error:', e);
                                                        alert('Failed to revoke some sessions');
                                                    } finally {
                                                        setIsRevoking(false);
                                                    }
                                                }}
                                                disabled={isRevoking}
                                                className="flex items-center gap-2 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
                                            >
                                                {isRevoking ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                                Remove {selectedSessions.size} Selected
                                            </button>
                                        )}
                                        <button
                                            onClick={fetchSessions}
                                            className="p-2 hover:bg-bg rounded-lg text-muted hover:text-primary transition-colors"
                                            title="Refresh List"
                                        >
                                            <RefreshCw size={16} className={loadingSessions ? "animate-spin" : ""} />
                                        </button>
                                    </div>
                                </div>

                                {/* Select All Header */}
                                {sessions.length > 0 && (
                                    <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border">
                                        <input
                                            type="checkbox"
                                            id="select-all-sessions"
                                            checked={
                                                sessions.filter(s => s.id !== localStorage.getItem('current_session_id')).length > 0 &&
                                                sessions.filter(s => s.id !== localStorage.getItem('current_session_id')).every(s => selectedSessions.has(s.id))
                                            }
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    // Select all non-current sessions
                                                    const nonCurrentIds = sessions
                                                        .filter(s => s.id !== localStorage.getItem('current_session_id'))
                                                        .map(s => s.id);
                                                    setSelectedSessions(new Set(nonCurrentIds));
                                                } else {
                                                    setSelectedSessions(new Set());
                                                }
                                            }}
                                            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                                        />
                                        <label htmlFor="select-all-sessions" className="text-xs font-bold text-muted uppercase tracking-wider cursor-pointer">
                                            Select All Devices ({sessions.filter(s => s.id !== localStorage.getItem('current_session_id')).length} removable)
                                        </label>
                                    </div>
                                )}

                                <div className="space-y-3">
                                    {loadingSessions ? (
                                        <div className="text-center py-8 text-muted text-sm">Loading session history...</div>
                                    ) : sessions.length > 0 ? (
                                        sessions.map((session) => {
                                            const isCurrent = session.id === localStorage.getItem('current_session_id'); // Match logic from LoginModal
                                            const ua = session.ua_string || session.device_info || 'Unknown Device';
                                            let icon = <ExternalLink size={16} />;
                                            let os = 'Unknown Device';

                                            if (/Mobile|Android|iPhone/i.test(ua)) icon = <Smartphone size={16} />;
                                            else icon = <ExternalLink size={16} />; // Monitor icon ideally

                                            // Device detection - check mobile OS FIRST since Android UA contains "Linux"
                                            if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iPhone';
                                            else if (ua.includes('Android')) os = 'Android';
                                            else if (ua.includes('Windows')) os = 'Windows PC';
                                            else if (ua.includes('Mac')) os = 'Mac';
                                            else if (ua.includes('CrOS')) os = 'Chromebook';
                                            else if (ua.includes('Linux')) os = 'Linux';

                                            const isSelected = selectedSessions.has(session.id);

                                            return (
                                                <div key={session.id} className={`flex items-center justify-between p-4 border rounded-xl transition-all ${isCurrent ? 'bg-primary/5 border-primary/20' : isSelected ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800' : 'bg-bg border-border hover:border-gray-300 dark:hover:border-gray-600'}`}>
                                                    <div className="flex items-center gap-4">
                                                        {/* Checkbox for non-current sessions */}
                                                        {!isCurrent ? (
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                aria-label={`Select ${os} session for removal`}
                                                                onChange={(e) => {
                                                                    const newSet = new Set(selectedSessions);
                                                                    if (e.target.checked) {
                                                                        newSet.add(session.id);
                                                                    } else {
                                                                        newSet.delete(session.id);
                                                                    }
                                                                    setSelectedSessions(newSet);
                                                                }}
                                                                className="w-4 h-4 rounded border-gray-300 text-red-500 focus:ring-red-500 cursor-pointer"
                                                            />
                                                        ) : (
                                                            <div className="w-4" /> // Spacer for alignment
                                                        )}
                                                        <div className={`p-2 rounded-full border ${isCurrent ? 'bg-green-500/10 border-green-500/20 text-green-600' : 'bg-gray-100 border-gray-200 text-gray-500 dark:bg-neutral-800 dark:border-neutral-700'}`}>
                                                            {icon}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <h4 className="text-sm font-bold text-text">{os}</h4>
                                                                {!isCurrent && <span className="text-[10px] bg-gray-100 dark:bg-neutral-800 text-muted px-1.5 py-0.5 rounded border border-border">{session.ip_address}</span>}
                                                            </div>
                                                            <div className="flex items-center gap-3 text-xs text-muted mt-1">
                                                                <span className="flex items-center gap-1">
                                                                    <MapPin size={10} />
                                                                    {session.location || 'Unknown Location'}
                                                                </span>
                                                                <span className="w-1 h-1 rounded-full bg-muted/50" />
                                                                <span>{new Date(session.last_active).toLocaleString()}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        {isCurrent ? (
                                                            <span className="text-xs px-2 py-1 rounded-full bg-green-500/10 text-green-600 font-bold border border-green-500/20 flex items-center gap-1">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                                                Current Session
                                                            </span>
                                                        ) : (
                                                            <button
                                                                className="text-xs text-red-500 hover:text-red-600 font-bold px-3 py-1.5 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors flex items-center gap-1"
                                                                onClick={async () => {
                                                                    if (!confirm('Revoke this session? Device will be logged out immediately.')) return;
                                                                    await supabase.from('user_sessions').delete().eq('id', session.id);
                                                                    setSelectedSessions(prev => {
                                                                        const newSet = new Set(prev);
                                                                        newSet.delete(session.id);
                                                                        return newSet;
                                                                    });
                                                                    fetchSessions();
                                                                }}
                                                            >
                                                                <LogOut size={12} />
                                                                Revoke
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="text-center py-8 text-muted">
                                            <p>No active sessions found.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'access':
                return (
                    <SharedAccessPanel />
                );

            case 'notifications':
                return (
                    <div className="bg-panel rounded-2xl p-8 border border-border shadow-sm animate-fadeIn">
                        {renderHeader('Notifications', <NotificationIcon size={20} />)}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                            {[
                                { id: 'low_stock', label: 'Low Stock Alerts', desc: 'Get notified when items drop below 5 units.' },
                                { id: 'payment_received', label: 'Payment Received', desc: 'Instant confirmation for every successful sale.' },
                                { id: 'daily_summary', label: 'Daily Sales Summary', desc: 'A snapshot of your shop performance every evening.' },
                                { id: 'overdue_bills', label: 'Overdue Bills', desc: 'Alerts for unpaid vendor invoices.' }
                            ].map((item) => (
                                <div key={item.id} className="flex justify-between items-start">
                                    <div className="max-w-[200px]">
                                        <h4 className="font-bold text-sm text-text mb-1">{item.label}</h4>
                                        <p className="text-xs text-muted leading-relaxed">{item.desc}</p>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="flex flex-col items-center gap-1.5">
                                            <Mail size={14} className="text-muted" />
                                            <input
                                                type="checkbox"
                                                checked={(settings.notifications as any)[`${item.id}_email`]}
                                                onChange={(e) => setSettings({
                                                    ...settings,
                                                    notifications: { ...settings.notifications, [`${item.id}_email`]: e.target.checked }
                                                } as any)}
                                                className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                                            />
                                        </div>
                                        <div className="flex flex-col items-center gap-1.5">
                                            <Smartphone size={14} className="text-muted" />
                                            <div
                                                onClick={() => setSettings({
                                                    ...settings,
                                                    notifications: { ...settings.notifications, [`${item.id}_push`]: !(settings.notifications as any)[`${item.id}_push`] }
                                                } as any)}
                                                className={`w-5 h-5 rounded flex items-center justify-center cursor-pointer transition-colors ${(settings.notifications as any)[`${item.id}_push`] ? 'bg-green-500' : 'bg-gray-200'
                                                    }`}
                                            >
                                                <div className="w-2 h-2 bg-white rounded-full"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-12">
                            <h4 className="font-bold text-lg text-text border-b border-border pb-2 mb-6">Telegram Integration</h4>
                            <TelegramSettings />
                        </div>
                    </div>
                );

            case 'billing':
                return (
                    <div className="bg-panel rounded-2xl p-8 border border-border shadow-sm animate-fadeIn">
                        {renderHeader('Billing & Finance', <BillingIcon size={20} />)}

                        <div className="grid grid-cols-2 gap-8 mb-8">
                            <div>
                                <label className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-2">Base Currency</label>
                                <input
                                    type="text"
                                    value="INR - Indian Rupee (₹)"
                                    disabled
                                    className="w-full bg-bg/50 border border-border rounded-xl px-4 py-3 text-sm font-medium text-muted cursor-not-allowed outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-2">Default Tax (GST) %</label>
                                <input
                                    type="number"
                                    value={settings.tax_percentage}
                                    onChange={(e) => setSettings({ ...settings, tax_percentage: parseInt(e.target.value) })}
                                    className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none"
                                    placeholder="18"
                                />
                            </div>
                        </div>

                        <div className="mb-8">
                            <label className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-2">Bank / UPI Transfer Details</label>
                            <textarea
                                value={settings.bank_details}
                                onChange={(e) => setSettings({ ...settings, bank_details: e.target.value })}
                                rows={3}
                                className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none resize-none leading-relaxed"
                                placeholder="HDFC Bank | A/C: 50200012345678 | IFSC: HDFC0001234\nUPI: shopname@okicici"
                            />
                            <p className="text-[10px] text-muted italic mt-2">This will be printed on all invoices for your customers.</p>
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-2">Invoice Footer Note</label>
                            <textarea
                                value={settings.invoice_footer}
                                onChange={(e) => setSettings({ ...settings, invoice_footer: e.target.value })}
                                rows={2}
                                className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                                placeholder="Thank you for your business! No returns after 7 days."
                            />
                        </div>
                    </div>
                );
            case 'appearance':
                return (
                    <div className="bg-panel rounded-2xl p-8 border border-border shadow-sm animate-fadeIn">
                        {renderHeader('Appearance', <Palette size={20} />)}

                        {/* Preview Environment Banner */}
                        <div className="mb-8 p-6 bg-primary/5 border border-primary/20 rounded-2xl flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="font-bold text-sm text-primary flex items-center gap-2 mb-1">
                                        <Eye size={16} /> Storefront Previews
                                    </h4>
                                    <p className="text-xs text-muted">Generate a temporary preview link to see your storefront with draft products. Max 2 active previews.</p>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <button
                                        onClick={handleCreatePreview}
                                        disabled={previewLoading || activePreviews.length >= 2}
                                        className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
                                    >
                                        {previewLoading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                                        Generate Link
                                    </button>
                                </div>
                            </div>

                            {previewUrl && (
                                <div className="bg-white dark:bg-black/50 p-3 rounded-xl border border-border flex items-center justify-between">
                                    <span className="text-xs font-mono text-muted">{previewUrl}</span>
                                    <a
                                        href={previewUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-primary hover:underline flex items-center gap-1 font-bold"
                                    >
                                        <ExternalLink size={12} /> Open Preview Link
                                    </a>
                                </div>
                            )}

                            {activePreviews.length > 0 && (
                                <div className="mt-4 space-y-2">
                                    <h5 className="font-bold text-xs text-text uppercase tracking-wider mb-2">Active Previews</h5>
                                    {activePreviews.map(preview => (
                                        <div key={preview.id} className="bg-bg p-4 rounded-xl border border-border flex items-center justify-between">
                                            <div>
                                                <div className="text-sm font-medium text-text flex items-center gap-2">
                                                    Preview Link
                                                    {preview.published && <span className="bg-green-500/10 text-green-500 px-2 py-0.5 rounded text-[10px]">Published</span>}
                                                </div>
                                                <div className="text-xs text-muted mt-1">Expires: {new Date(preview.expires_at).toLocaleString()}</div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <a
                                                    href={`/preview/${preview.id}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
                                                    title="View Preview"
                                                >
                                                    <ExternalLink size={16} />
                                                </a>
                                                <button
                                                    onClick={() => handleDeletePreview(preview.id)}
                                                    className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors"
                                                    title="Delete Preview"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="max-w-3xl">
                            <div className="space-y-6 mb-12">
                                <h4 className="font-bold text-lg text-text border-b border-border pb-2">Banner Configuration</h4>

                                <div>
                                    <label className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-2">Banner Image URL</label>
                                    <input
                                        type="text"
                                        value={settings.theme_config?.hero?.image_url || ''}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            theme_config: { ...settings.theme_config!, hero: { ...settings.theme_config?.hero, image_url: e.target.value } }
                                        })}
                                        className="w-full bg-bg border border-border rounded-xl px-4 py-2 text-sm outline-none mb-2"
                                        placeholder="https://..."
                                    />
                                    {settings.theme_config?.hero?.image_url && (
                                        <div className="w-full h-32 rounded-lg overflow-hidden border border-border relative group">
                                            <img src={settings.theme_config.hero.image_url} alt="Storefront Hero Preview" className="w-full h-full object-cover" />
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-2">Badge Text</label>
                                        <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0"></span>
                                            <input
                                                type="text"
                                                value={settings.theme_config?.hero?.badge_text || ''}
                                                onChange={(e) => setSettings({
                                                    ...settings,
                                                    theme_config: { ...settings.theme_config!, hero: { ...settings.theme_config?.hero, badge_text: e.target.value } }
                                                })}
                                                className="w-full bg-bg border border-border rounded-xl px-4 py-2 text-sm outline-none"
                                                placeholder="e.g. New Collection 2025"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-2">Button Text</label>
                                        <input
                                            type="text"
                                            value={settings.theme_config?.hero?.button_text || ''}
                                            onChange={(e) => setSettings({
                                                ...settings,
                                                theme_config: { ...settings.theme_config!, hero: { ...settings.theme_config?.hero, button_text: e.target.value } }
                                            })}
                                            className="w-full bg-bg border border-border rounded-xl px-4 py-2 text-sm outline-none"
                                            placeholder="e.g. Shop Now"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4 pt-2">
                                    <label className="block text-[10px] font-bold text-muted uppercase tracking-wider">Headlines & Description</label>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                        <div>
                                            <input
                                                type="text"
                                                value={settings.theme_config?.hero?.headline_1 || ''}
                                                onChange={(e) => setSettings({
                                                    ...settings,
                                                    theme_config: { ...settings.theme_config!, hero: { ...settings.theme_config?.hero, headline_1: e.target.value } }
                                                })}
                                                className="w-full bg-bg border border-border rounded-xl px-4 py-2 text-sm outline-none font-bold placeholder:font-normal"
                                                placeholder="Top Line (e.g. ELEVATE YOUR)"
                                            />
                                        </div>
                                        <div>
                                            <input
                                                type="text"
                                                value={settings.theme_config?.hero?.headline_2 || ''}
                                                onChange={(e) => setSettings({
                                                    ...settings,
                                                    theme_config: { ...settings.theme_config!, hero: { ...settings.theme_config?.hero, headline_2: e.target.value } }
                                                })}
                                                className="w-full bg-bg border border-border rounded-xl px-4 py-2 text-sm outline-none italic placeholder:not-italic"
                                                placeholder="Middle Line (e.g. everyday)"
                                            />
                                        </div>
                                        <div>
                                            <input
                                                type="text"
                                                value={settings.theme_config?.hero?.headline_3 || ''}
                                                onChange={(e) => setSettings({
                                                    ...settings,
                                                    theme_config: { ...settings.theme_config!, hero: { ...settings.theme_config?.hero, headline_3: e.target.value } }
                                                })}
                                                className="w-full bg-bg border border-border rounded-xl px-4 py-2 text-sm outline-none font-bold placeholder:font-normal"
                                                placeholder="Bottom Line (e.g. STYLE)"
                                            />
                                        </div>
                                    </div>

                                    <textarea
                                        value={settings.theme_config?.hero?.description || ''}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            theme_config: { ...settings.theme_config!, hero: { ...settings.theme_config?.hero, description: e.target.value } }
                                        })}
                                        className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-sm outline-none resize-none h-24"
                                        placeholder="Enter the banner description text..."
                                    />
                                </div>
                            </div>
                            <h4 className="font-bold text-lg text-text border-b border-border pb-2 mb-4">Trust Badges</h4>
                            <div className="space-y-3">
                                {(settings.trust_badges || []).map((badge, idx) => (
                                    <div key={idx} className="group relative bg-white border border-border rounded-xl p-1 transition-all hover:shadow-sm hover:border-primary/50 flex items-center pr-3">
                                        {/* Visual Icon Trigger - Simplified for now to Select but styled */}
                                        <div className="relative w-10 h-10 flex-shrink-0">
                                            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 rounded-lg group-hover:bg-primary/5 transition-colors pointer-events-none">
                                                {badge.icon === 'return' && <RefreshCw size={16} className="text-gray-600 group-hover:text-primary" />}
                                                {badge.icon === 'shield' && <Shield size={16} className="text-gray-600 group-hover:text-primary" />}
                                                {badge.icon === 'truck' && <Truck size={16} className="text-gray-600 group-hover:text-primary" />}
                                                {badge.icon === 'check' && <CheckCircle2 size={16} className="text-gray-600 group-hover:text-primary" />}
                                                {badge.icon === 'star' && <Shield size={16} className="text-gray-600 group-hover:text-primary" />}
                                                {badge.icon === 'heart' && <Activity size={16} className="text-gray-600 group-hover:text-primary" />}
                                                {badge.icon === 'zap' && <Zap size={16} className="text-gray-600 group-hover:text-primary" />}
                                            </div>
                                            <select
                                                value={badge.icon}
                                                onChange={(e) => {
                                                    const newBadges = [...(settings.trust_badges || [])];
                                                    newBadges[idx] = { ...newBadges[idx], icon: e.target.value };
                                                    setSettings({ ...settings, trust_badges: newBadges });
                                                }}
                                                className="w-full h-full opacity-0 cursor-pointer absolute inset-0 title-select"
                                                aria-label="Select Icon"
                                            >
                                                <option value="return">Return Policy</option>
                                                <option value="shield">Secure Payment</option>
                                                <option value="truck">Shipping</option>
                                                <option value="check">Guarantee</option>
                                                <option value="star">Featured</option>
                                                <option value="heart">Trusted</option>
                                                <option value="zap">Fast</option>
                                            </select>
                                        </div>

                                        <div className="h-6 w-px bg-border mx-2"></div>

                                        <input
                                            type="text"
                                            value={badge.text}
                                            onChange={(e) => {
                                                const newBadges = [...(settings.trust_badges || [])];
                                                newBadges[idx] = { ...newBadges[idx], text: e.target.value };
                                                setSettings({ ...settings, trust_badges: newBadges });
                                            }}
                                            className="flex-grow bg-transparent text-sm font-medium text-text placeholder:text-muted/50 outline-none"
                                            placeholder="Enter badge text (e.g., Free Shipping)"
                                        />

                                        <button
                                            onClick={() => {
                                                const newBadges = (settings.trust_badges || []).filter((_, i) => i !== idx);
                                                setSettings({ ...settings, trust_badges: newBadges });
                                            }}
                                            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted/50 hover:bg-red-50 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                                            title="Remove Badge"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}

                                <button
                                    onClick={() => setSettings({
                                        ...settings,
                                        trust_badges: [...(settings.trust_badges || []), { icon: 'check', text: '' }]
                                    })}
                                    className="w-full py-3 border-2 border-dashed border-border rounded-xl text-muted font-bold text-xs uppercase tracking-wider hover:border-primary hover:text-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-2"
                                >
                                    <Plus size={16} /> Add New Badge
                                </button>
                            </div>
                        </div>
                    </div>
                );
            case 'data':
                return (
                    <div className="bg-panel rounded-2xl p-8 border border-border shadow-sm animate-fadeIn">
                        {renderHeader('Data & Backup', <Database size={20} />)}

                        <div className="bg-bg/50 p-6 rounded-2xl border border-border mb-6">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 bg-blue-500/10 text-blue-600 rounded-xl flex items-center justify-center">
                                    <Database size={24} />
                                </div>
                                <div className="flex-grow">
                                    <h4 className="font-bold text-base text-text">Google Drive Backup</h4>
                                    <p className="text-xs text-muted mt-1 leading-relaxed">
                                        Keep your store data safe by owning a physical backup on your personal Google Drive.
                                    </p>
                                </div>
                                {backupStatus === 'success' && (
                                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                                        <Check size={12} /> Active
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center justify-between bg-white dark:bg-neutral-800/50 border border-border rounded-xl p-4">
                                <div>
                                    <span className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-1">Last Succesful Backup</span>
                                    {lastBackupDate ? (
                                        <span className="text-sm font-bold text-text">{new Date(lastBackupDate).toLocaleString()}</span>
                                    ) : (
                                        <span className="text-sm font-medium text-muted italic">Never backed up</span>
                                    )}
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={downloadLocalBackup}
                                        disabled={isBackupRunning}
                                        className="text-xs font-bold bg-white dark:bg-neutral-800 text-text border border-border hover:bg-gray-50 dark:hover:bg-neutral-700 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                                    >
                                        <Download size={14} /> Download
                                    </button>
                                    <button
                                        onClick={connectAndBackup}
                                        disabled={isBackupRunning}
                                        className="text-xs font-bold bg-white dark:bg-neutral-800 text-text border border-border hover:bg-gray-50 dark:hover:bg-neutral-700 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        Connect Drive
                                    </button>
                                    <button
                                        onClick={() => performBackup(true)}
                                        disabled={isBackupRunning}
                                        className="text-xs font-bold bg-primary text-white hover:opacity-90 px-4 py-2 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                                    >
                                        {isBackupRunning ? <Loader2 className="animate-spin w-3 h-3" /> : <RefreshCw size={14} />}
                                        {isBackupRunning ? 'Backing up...' : 'Back Up Now'}
                                    </button>
                                </div>
                            </div>

                            {backupStatus === 'error' && (
                                <p className="text-xs text-red-500 font-medium mt-3 flex items-center gap-2">
                                    <AlertCircle size={14} />
                                    Backup failed. Please ensure you have connected your Drive account.
                                </p>
                            )}
                        </div>

                        <div className="bg-orange-50 border border-orange-100 p-5 rounded-2xl flex items-start gap-4">
                            <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                                <Lock size={18} />
                            </div>
                            <div>
                                <h4 className="font-bold text-sm text-orange-900 mb-1">Data Ownership</h4>
                                <p className="text-xs text-orange-800/80 leading-relaxed">
                                    We believe you should own your data. These backups are saved directly to your personal Google Drive, giving you full control and access to your business records even if you leave our platform.
                                </p>
                            </div>
                        </div>
                    </div>
                );
            case 'status':
                return (
                    <div className="bg-panel rounded-2xl p-8 border border-border shadow-sm animate-fadeIn">
                        {renderHeader('System Status', <Activity size={20} />)}
                        <div className="space-y-6">
                            <div className="bg-bg/50 p-6 rounded-2xl border border-border">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className={`w-10 h-10 ${systemStatus.database.status === 'connected' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'} rounded-full flex items-center justify-center`}>
                                        <Database size={20} />
                                    </div>
                                    <h4 className="font-bold text-sm">Database Connection</h4>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                    <span className={`w-2.5 h-2.5 rounded-full ${systemStatus.database.status === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                                    <span className="text-muted">Status: </span>
                                    <span className={`font-bold ${systemStatus.database.status === 'connected' ? 'text-green-600' : 'text-red-500'}`}>
                                        {systemStatus.database.status === 'checking' ? 'Checking...' :
                                            systemStatus.database.status === 'connected' ? 'Active & Connected' : 'Disconnected'}
                                    </span>
                                </div>
                                {systemStatus.database.latency && (
                                    <div className="mt-2 text-xs text-muted">
                                        Latency: {systemStatus.database.latency}ms
                                    </div>
                                )}
                                <div className="mt-4 pt-4 border-t border-border flex justify-between text-[10px] font-bold text-muted uppercase tracking-wider">
                                    <span>Cloud Provider: {systemStatus.provider}</span>
                                    <span>Region: {systemStatus.region}</span>
                                </div>
                            </div>

                            <div className="bg-bg/50 p-6 rounded-2xl border border-border">
                                <div className="flex items-center gap-3 mb-4 text-orange-500">
                                    <Zap size={20} />
                                    <h4 className="font-bold text-sm">API Infrastructure</h4>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-muted">Edge Functions</span>
                                        <span className={`font-bold ${systemStatus.api.status === 'healthy' ? 'text-green-600' : 'text-red-500'}`}>
                                            {systemStatus.api.status === 'checking' ? '...' :
                                                systemStatus.api.status === 'healthy' ? 'Healthy' : 'Degraded'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-muted">Realtime Channel</span>
                                        <span className={`font-bold ${systemStatus.realtime.status === 'live' ? 'text-green-600' : 'text-red-500'}`}>
                                            {systemStatus.realtime.status === 'checking' ? '...' :
                                                systemStatus.realtime.status === 'live' ? 'Live' : 'Offline'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-muted">Storage Buckets</span>
                                        <span className={`font-bold ${systemStatus.storage.status === 'online' ? 'text-green-600' : 'text-red-500'}`}>
                                            {systemStatus.storage.status === 'checking' ? '...' :
                                                systemStatus.storage.status === 'online' ? 'Online' : 'Offline'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'shipping':
                return (
                    <div className="bg-panel rounded-2xl p-8 border border-border shadow-sm animate-fadeIn">
                        {renderHeader('Shipping & Delivery', <Truck size={20} />)}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                            <div className="bg-bg/50 p-6 rounded-2xl border border-border">
                                <div className="flex items-center gap-3 mb-6 text-primary">
                                    <Truck size={18} />
                                    <h4 className="font-bold text-sm">Shipping Charges</h4>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-2">Standard Shipping Fee (INR)</label>
                                        <div className="relative">
                                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm font-bold">
                                                ₹
                                            </div>
                                            <input
                                                type="number"
                                                value={settings.shipping_fee}
                                                onChange={(e) => setSettings({ ...settings, shipping_fee: parseFloat(e.target.value) || 0 })}
                                                className="w-full bg-panel border border-border rounded-xl px-8 py-3 text-text focus:ring-2 focus:ring-primary/20 outline-none text-sm font-medium"
                                                placeholder="0.00"
                                            />
                                        </div>
                                        <p className="text-[10px] text-muted italic mt-2">Flat rate applied to all orders below the free shipping threshold.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-bg/50 p-6 rounded-2xl border border-border">
                                <div className="flex items-center gap-3 mb-6 text-primary">
                                    <Zap size={18} />
                                    <h4 className="font-bold text-sm">Free Delivery Threshold</h4>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-2">Free Shipping on Orders Over (INR)</label>
                                        <div className="relative">
                                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm font-bold">
                                                ₹
                                            </div>
                                            <input
                                                type="number"
                                                value={settings.free_shipping_threshold}
                                                onChange={(e) => setSettings({ ...settings, free_shipping_threshold: parseFloat(e.target.value) || 0 })}
                                                className="w-full bg-panel border border-border rounded-xl px-8 py-3 text-text focus:ring-2 focus:ring-primary/20 outline-none text-sm font-medium"
                                                placeholder="0.00"
                                            />
                                        </div>
                                        <p className="text-[10px] text-muted italic mt-2">Set to 0 to disable free shipping. Customers get free delivery when order total exceeds this amount.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-primary/5 border border-primary/10 p-6 rounded-2xl flex items-start gap-4">
                            <div className="p-2 bg-primary/20 rounded-lg text-primary">
                                <CheckCircle2 size={20} />
                            </div>
                            <div>
                                <h4 className="font-bold text-sm text-primary mb-1">Storefront Preview</h4>
                                <p className="text-xs text-muted leading-relaxed">
                                    Based on your current settings, an order of ₹1,000 will have a
                                    <span className="font-bold text-text mx-1">
                                        {settings.free_shipping_threshold > 0 && 1000 >= settings.free_shipping_threshold
                                            ? 'Free Shipping'
                                            : `₹${settings.shipping_fee} Shipping Fee`
                                        }
                                    </span>
                                    applied.
                                </p>
                            </div>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="max-w-[1200px] mx-auto space-y-8 animate-fadeIn pb-20">
            {/* Page Header */}
            {/* Page Title & Breadcrumbs Only - Icons and Search are in Global Header */}
            <div className="px-2">
                <h1 className="text-3xl font-display font-black text-gray-900 tracking-tight mb-1">Store Settings</h1>
                <div className="flex items-center gap-2 text-sm text-muted">
                    <Building size={14} />
                    <span>Management Dashboard</span>
                    <ChevronRight size={14} className="opacity-30" />
                    <span className="text-primary font-medium">{navItems.find(i => i.id === activeTab)?.label}</span>
                </div>
            </div>

            <div className="flex gap-8">
                {/* Fixed Navigation Sidebar */}
                <div className="w-72 flex-shrink-0 space-y-6">
                    <div className="bg-panel rounded-3xl p-3 border border-border shadow-soft">
                        <div className="px-4 py-5 mb-2">
                            <h2 className="text-xl font-display font-bold text-text">Settings</h2>
                            <p className="text-xs text-muted mt-1 leading-relaxed">Manage your store and account</p>
                        </div>

                        <div className="space-y-1">
                            {navItems.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveTab(item.id as TabType)}
                                    className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl font-bold text-xs transition-all tracking-wide ${activeTab === item.id
                                        ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]'
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
