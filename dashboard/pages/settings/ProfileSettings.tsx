import React from 'react';
import { Building, Edit2, MapPin, Phone } from 'lucide-react';
import { AIContentHelper } from '../../components/AIContentHelper';

export const ProfileSettings = ({ settings, setSettings, renderHeader, handleLogoUpload, saving, setSaving, show2FAModal, setShow2FAModal, timeoutVal, setTimeoutVal, timeoutUnit, setTimeoutUnit, systemStatus, apiUsage, loadingApiUsage, sessions, loadingSessions, selectedSessions, setSelectedSessions, isRevoking, handleRevokeSession, handleRevokeSelected, formatUaString, getDeviceIcon, DEFAULT_THEME_CONFIG, activePreviews, previewLoading, setPreviewLoading, fetchPreviews }: any) => {
    return (
        <div className="bg-panel rounded-2xl p-4 md:p-6 lg:p-8 border border-border shadow-sm animate-fadeIn">
                        {renderHeader('Business Profile', <Building size={20} />)}

                        <div className="flex flex-col md:flex-row gap-8 md:gap-10">
                            <div className="flex-shrink-0 flex flex-col gap-4 items-center">
                                <span className="text-[10px] font-bold text-muted uppercase tracking-wider text-center w-full">Business Logo</span>
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
                                            aria-label="Upload business logo"
                                        />
                                    </label>
                                </div>
                            </div>

                            <div className="flex-grow grid grid-cols-1 sm:grid-cols-2 gap-6">
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
                                    <div className="relative">
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="block text-[10px] font-bold text-muted uppercase tracking-wider">Business Type</label>
                                            <AIContentHelper
                                                type="store"
                                                context={{
                                                    keywords: settings.store_name,
                                                    businessType: settings.business_type
                                                }}
                                                onApply={(data) => {
                                                    setSettings({
                                                        ...settings,
                                                        business_type: data.categories[0] || settings.business_type,
                                                        hero: {
                                                            ...settings.hero,
                                                            description: data.storeDescription
                                                        }
                                                    });
                                                }}
                                            />
                                        </div>
                                        <input
                                            type="text"
                                            value={settings.business_type}
                                            onChange={(e) => setSettings({ ...settings, business_type: e.target.value })}
                                            className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-text focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-sm font-medium"
                                            placeholder="Retail Store"
                                        />
                                    </div>
                                </div>
                                <div className="col-span-1 sm:col-span-2">
                                    <label className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-2">Office Address</label>
                                    <div className="relative">
                                        <div className="absolute left-3 top-3.5 text-muted">
                                            <MapPin size={16} />
                                        </div>
                                        <textarea
                                            value={settings.address}
                                            onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                                            rows={2}
                                            className="w-full bg-bg border border-border rounded-xl pl-10 pr-4 py-3 text-text focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-sm font-medium resize-none leading-relaxed"
                                            placeholder="123 Business Park, Suite 405, Mumbai, IN"
                                        />
                                    </div>
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-2">Phone Number</label>
                                    <div className="relative">
                                        <div className="absolute left-3 top-3.5 text-muted">
                                            <Phone size={16} />
                                        </div>
                                        <input
                                            type="text"
                                            value={settings.phone}
                                            onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                                            className="w-full bg-bg border border-border rounded-xl pl-10 pr-4 py-3 text-text focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-sm font-medium"
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
};
