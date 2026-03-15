import React, { useState, useEffect } from 'react';
import { IndianRupee, AlertTriangle, Save, Globe, Lock, ShieldAlert, CreditCard } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

import { PlatformSettings } from '../../types';

const PlatformConfigPanel: React.FC = () => {
    const [settings, setSettings] = useState<PlatformSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('platform_settings')
                .select('*')
                .limit(1)
                .single();

            if (error) throw error;
            setSettings(data);
        } catch (error) {
            console.error('Error fetching settings:', error);
            // Don't show toast on 406 (empty table handled by migration, but just in case)
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!settings) return;

        try {
            setSaving(true);

            // 1. Fetch current DB state (pre-update) to check for changes
            const { data: preUpdateSettings } = await supabase
                .from('platform_settings')
                .select('maintenance_mode, announcement_message')
                .eq('id', settings.id)
                .single();

            // 2. Perform Update
            const { error: updateError } = await supabase
                .from('platform_settings')
                .update({
                    commission_rate: settings.commission_rate,
                    min_payout_amount: settings.min_payout_amount,
                    maintenance_mode: settings.maintenance_mode,
                    announcement_message: settings.announcement_message
                })
                .eq('id', settings.id);

            if (updateError) throw updateError;

            toast.success('Platform settings updated successfully');

            // 3. Trigger Notifications if changed
            if (preUpdateSettings) {
                // Maintenance Mode Change
                if (preUpdateSettings.maintenance_mode !== settings.maintenance_mode) {
                    await supabase.functions.invoke('notify-all-sellers', {
                        body: {
                            type: 'MAINTENANCE',
                            status: settings.maintenance_mode,
                            message: settings.announcement_message // Optional context
                        }
                    });
                    toast.success('Maintenance notification sent to sellers');
                }

                // Announcement Change (only if it's not empty and different)
                if (settings.announcement_message && settings.announcement_message !== preUpdateSettings.announcement_message) {
                    // Only send if it's NOT maintenance mode change (to avoid double notifs if both changed)
                    if (preUpdateSettings.maintenance_mode === settings.maintenance_mode) {
                        await supabase.functions.invoke('notify-all-sellers', {
                            body: {
                                type: 'ANNOUNCEMENT',
                                message: settings.announcement_message
                            }
                        });
                        toast.success('Announcement broadcasted to sellers');
                    }
                }
            }

        } catch (error) {
            console.error('Error saving settings:', error);
            toast.error('Failed to update settings');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="animate-pulse bg-theme-panel h-64 rounded-2xl border border-theme-border"></div>;
    }

    if (!settings) return null;

    return (
        <div className="space-y-6">
            {/* Financial Logic */}
            <div className="bg-theme-panel border border-theme-border rounded-2xl p-8">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-green-500/10 text-green-500 rounded-xl flex items-center justify-center">
                        <IndianRupee size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-theme-text">Financials & Business Logic</h2>
                        <p className="text-theme-muted text-sm mt-1">Control commissions and payouts</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-theme-muted mb-2">Platform Commission (%)</label>
                        <div className="relative">
                            <input
                                type="number"
                                value={settings.commission_rate}
                                onChange={(e) => setSettings({ ...settings, commission_rate: parseFloat(e.target.value) })}
                                className="w-full bg-theme-bg border border-theme-border rounded-xl px-4 py-3 text-theme-text focus:outline-none focus:border-indigo-500 transition-colors pl-10"
                                placeholder="5.0"
                            />
                            <CreditCard size={16} className="absolute left-3 top-3.5 text-theme-muted" />
                        </div>
                        <p className="text-xs text-theme-muted mt-2">Percentage taken from every successful sale.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-theme-muted mb-2">Min. Payout Threshold (₹)</label>
                        <div className="relative">
                            <input
                                type="number"
                                value={settings.min_payout_amount}
                                onChange={(e) => setSettings({ ...settings, min_payout_amount: parseFloat(e.target.value) })}
                                className="w-full bg-theme-bg border border-theme-border rounded-xl px-4 py-3 text-theme-text focus:outline-none focus:border-indigo-500 transition-colors pl-10"
                                placeholder="500"
                            />
                            <IndianRupee size={16} className="absolute left-3 top-3.5 text-theme-muted" />
                        </div>
                        <p className="text-xs text-theme-muted mt-2">Minimum earnings required for sellers to withdraw.</p>
                    </div>
                </div>
            </div>

            {/* System Health & Maintenance */}
            <div className="bg-theme-panel border border-theme-border rounded-2xl p-8">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-xl flex items-center justify-center">
                        <ShieldAlert size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-theme-text">System Health & Maintenance</h2>
                        <p className="text-theme-muted text-sm mt-1">Status controls and global announcements</p>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Maintenance Mode Toggle */}
                    <div className="flex items-center justify-between p-4 bg-theme-bg border border-theme-border rounded-xl hover:border-theme-border transition-all">
                        <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-lg ${settings.maintenance_mode ? 'bg-red-500/20 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                                <Lock size={20} />
                            </div>
                            <div>
                                <h4 className="font-bold text-theme-text">Maintenance Mode</h4>
                                <p className="text-xs text-theme-muted">
                                    {settings.maintenance_mode
                                        ? "Active: Store is locked for customers."
                                        : "Inactive: Store is live and accessible."}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setSettings({ ...settings, maintenance_mode: !settings.maintenance_mode })}
                            className={`w-14 h-7 rounded-full p-1 transition-colors ${settings.maintenance_mode ? 'bg-red-500' : 'bg-theme-muted'}`}
                            aria-label="Toggle maintenance mode"
                        >
                            <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${settings.maintenance_mode ? 'translate-x-7' : 'translate-x-0'}`} />
                        </button>
                    </div>

                    {/* Announcement Banner */}
                    <div>
                        <label className="block text-sm font-medium text-theme-muted mb-2">Global Announcement Banner</label>
                        <div className="relative">
                            <textarea
                                value={settings.announcement_message || ''}
                                onChange={(e) => setSettings({ ...settings, announcement_message: e.target.value })}
                                className="w-full bg-theme-bg border border-theme-border rounded-xl px-4 py-3 text-theme-text focus:outline-none focus:border-indigo-500 transition-colors pl-10 min-h-[80px]"
                                placeholder="e.g., Scheduled maintenance on Sunday at 3 AM..."
                            />
                            <Globe size={16} className="absolute left-3 top-3.5 text-theme-muted" />
                        </div>
                        <p className="text-xs text-theme-muted mt-2">This message will appear on all seller dashboards if set.</p>
                    </div>
                </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
                >
                    <Save size={18} />
                    {saving ? 'Saving Changes...' : 'Save Configuration'}
                </button>
            </div>
        </div>
    );
};

export default PlatformConfigPanel;
