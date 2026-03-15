import React from 'react';
import { Truck, MapPin, Zap, CheckCircle2 } from 'lucide-react';

export const ShippingSettings = ({ settings, setSettings, renderHeader, handleLogoUpload, saving, setSaving, show2FAModal, setShow2FAModal, timeoutVal, setTimeoutVal, timeoutUnit, setTimeoutUnit, systemStatus, apiUsage, loadingApiUsage, sessions, loadingSessions, selectedSessions, setSelectedSessions, isRevoking, handleRevokeSession, handleRevokeSelected, formatUaString, getDeviceIcon, DEFAULT_THEME_CONFIG, activePreviews, previewLoading, setPreviewLoading, fetchPreviews }: any) => {
    return (
        <div className="bg-panel rounded-2xl p-4 md:p-6 lg:p-8 border border-border shadow-sm animate-fadeIn">
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
};
