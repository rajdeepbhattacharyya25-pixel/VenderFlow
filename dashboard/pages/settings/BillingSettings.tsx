import React from 'react';
import { CreditCard as BillingIcon, Clock, CheckCircle2 } from 'lucide-react';

export const BillingSettings = ({ settings, setSettings, renderHeader, handleLogoUpload, saving, setSaving, show2FAModal, setShow2FAModal, timeoutVal, setTimeoutVal, timeoutUnit, setTimeoutUnit, systemStatus, apiUsage, loadingApiUsage, sessions, loadingSessions, selectedSessions, setSelectedSessions, isRevoking, handleRevokeSession, handleRevokeSelected, formatUaString, getDeviceIcon, DEFAULT_THEME_CONFIG, activePreviews, previewLoading, setPreviewLoading, fetchPreviews }: any) => {
    return (
        <div className="bg-panel rounded-2xl p-4 md:p-6 lg:p-8 border border-border shadow-sm animate-fadeIn">
                        {renderHeader('Billing & Finance', <BillingIcon size={20} />)}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
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
                                    className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-sm font-medium text-text focus:ring-2 focus:ring-primary/20 outline-none"
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
                                className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-sm font-medium text-text focus:ring-2 focus:ring-primary/20 outline-none resize-none leading-relaxed"
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
                                className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-sm font-medium text-text focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                                placeholder="Thank you for your business! No returns after 7 days."
                            />
                        </div>
                    </div>
                
    );
};
