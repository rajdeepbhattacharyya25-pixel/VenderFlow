import React, { useState, useEffect } from 'react';
import { DollarSign, AlertTriangle, Save, Globe, Lock, ShieldAlert, CreditCard } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

interface PlatformSettings {
    id: string;
    commission_rate: number;
    min_payout_amount: number;
    maintenance_mode: boolean;
    announcement_message: string | null;
    created_at: string;
}

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
            const { error } = await supabase
                .from('platform_settings')
                .update({
                    commission_rate: settings.commission_rate,
                    min_payout_amount: settings.min_payout_amount,
                    maintenance_mode: settings.maintenance_mode,
                    announcement_message: settings.announcement_message
                })
                .eq('id', settings.id);

            if (error) throw error;
            toast.success('Platform settings updated successfully');
        } catch (error) {
            console.error('Error saving settings:', error);
            toast.error('Failed to update settings');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="animate-pulse bg-neutral-900 h-64 rounded-2xl border border-neutral-800"></div>;
    }

    if (!settings) return null;

    return (
        <div className="space-y-6">
            {/* Financial Logic */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-green-500/10 text-green-400 rounded-xl flex items-center justify-center">
                        <DollarSign size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Financials & Business Logic</h2>
                        <p className="text-neutral-400 text-sm mt-1">Control commissions and payouts</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-neutral-400 mb-2">Platform Commission (%)</label>
                        <div className="relative">
                            <input
                                type="number"
                                value={settings.commission_rate}
                                onChange={(e) => setSettings({ ...settings, commission_rate: parseFloat(e.target.value) })}
                                className="w-full bg-black/20 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors pl-10"
                                placeholder="5.0"
                            />
                            <CreditCard size={16} className="absolute left-3 top-3.5 text-neutral-500" />
                        </div>
                        <p className="text-xs text-neutral-500 mt-2">Percentage taken from every successful sale.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-neutral-400 mb-2">Min. Payout Threshold (₹)</label>
                        <div className="relative">
                            <input
                                type="number"
                                value={settings.min_payout_amount}
                                onChange={(e) => setSettings({ ...settings, min_payout_amount: parseFloat(e.target.value) })}
                                className="w-full bg-black/20 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors pl-10"
                                placeholder="500"
                            />
                            <DollarSign size={16} className="absolute left-3 top-3.5 text-neutral-500" />
                        </div>
                        <p className="text-xs text-neutral-500 mt-2">Minimum earnings required for sellers to withdraw.</p>
                    </div>
                </div>
            </div>

            {/* System Health & Maintenance */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-amber-500/10 text-amber-400 rounded-xl flex items-center justify-center">
                        <ShieldAlert size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">System Health & Maintenance</h2>
                        <p className="text-neutral-400 text-sm mt-1">Status controls and global announcements</p>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Maintenance Mode Toggle */}
                    <div className="flex items-center justify-between p-4 bg-black/20 border border-neutral-800 rounded-xl hover:border-neutral-700 transition-all">
                        <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-lg ${settings.maintenance_mode ? 'bg-red-500/20 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                                <Lock size={20} />
                            </div>
                            <div>
                                <h4 className="font-bold text-white">Maintenance Mode</h4>
                                <p className="text-xs text-neutral-500">
                                    {settings.maintenance_mode
                                        ? "Active: Store is locked for customers."
                                        : "Inactive: Store is live and accessible."}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setSettings({ ...settings, maintenance_mode: !settings.maintenance_mode })}
                            className={`w-14 h-7 rounded-full p-1 transition-colors ${settings.maintenance_mode ? 'bg-red-500' : 'bg-neutral-700'}`}
                            aria-label="Toggle maintenance mode"
                        >
                            <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${settings.maintenance_mode ? 'translate-x-7' : 'translate-x-0'}`} />
                        </button>
                    </div>

                    {/* Announcement Banner */}
                    <div>
                        <label className="block text-sm font-medium text-neutral-400 mb-2">Global Announcement Banner</label>
                        <div className="relative">
                            <textarea
                                value={settings.announcement_message || ''}
                                onChange={(e) => setSettings({ ...settings, announcement_message: e.target.value })}
                                className="w-full bg-black/20 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors pl-10 min-h-[80px]"
                                placeholder="e.g., Scheduled maintenance on Sunday at 3 AM..."
                            />
                            <Globe size={16} className="absolute left-3 top-3.5 text-neutral-500" />
                        </div>
                        <p className="text-xs text-neutral-500 mt-2">This message will appear on all seller dashboards if set.</p>
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
