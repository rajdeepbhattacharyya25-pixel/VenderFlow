import React, { useState, useEffect } from 'react';
import { IndianRupee, Save, Globe, Lock, ShieldAlert, CreditCard, Cpu } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

import { PlatformSettings } from '../../types';

const PlatformConfigPanel: React.FC = () => {
    const [settings, setSettings] = useState<PlatformSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [aiHealth, setAiHealth] = useState<{ provider: string, status: 'ok' | 'degraded' | 'critical', usage: number }[]>([]);

    useEffect(() => {
        fetchSettings();
        fetchAIHealth();
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
        } finally {
            setLoading(false);
        }
    };

    const fetchAIHealth = async () => {
        try {
            const last24Hours = new Date();
            last24Hours.setHours(last24Hours.getHours() - 24);

            const providers = ['groq', 'gemini', 'openrouter'];
            const healthData = [];

            const { data: limits } = await supabase.from('api_limits_config').select('*');

            for (const p of providers) {
                const { data: logs } = await supabase
                    .from('api_usage_logs')
                    .select('status_code')
                    .eq('provider', p)
                    .gte('created_at', last24Hours.toISOString());

                const limit = limits?.find(l => l.provider === p)?.monthly_limit || 1000;
                const count = logs?.length || 0;
                const successes = logs?.filter(l => l.status_code >= 200 && l.status_code < 300).length || 0;
                const successRate = count > 0 ? (successes / count) * 100 : 100;

                let status: 'ok' | 'degraded' | 'critical' = 'ok';
                if (successRate < 70 || count > limit) status = 'critical';
                else if (successRate < 90 || count > limit * 0.8) status = 'degraded';

                healthData.push({ provider: p, status, usage: Math.round((count / limit) * 100) });
            }
            setAiHealth(healthData);
        } catch (e) {
            console.error("AI Health Fetch Error:", e);
        }
    };

    const handleSave = async () => {
        if (!settings) return;

        try {
            setSaving(true);

            const { data: preUpdateSettings } = await supabase
                .from('platform_settings')
                .select('maintenance_mode, announcement_message')
                .eq('id', settings.id)
                .single();

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

            if (preUpdateSettings) {
                if (preUpdateSettings.maintenance_mode !== settings.maintenance_mode) {
                    await supabase.functions.invoke('notify-all-sellers', {
                        body: {
                            type: 'MAINTENANCE',
                            status: settings.maintenance_mode,
                            message: settings.announcement_message
                        }
                    });
                }

                if (settings.announcement_message && settings.announcement_message !== preUpdateSettings.announcement_message) {
                    if (preUpdateSettings.maintenance_mode === settings.maintenance_mode) {
                        await supabase.functions.invoke('notify-all-sellers', {
                            body: {
                                type: 'ANNOUNCEMENT',
                                message: settings.announcement_message
                            }
                        });
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
            {/* AI Health Summary */}
            <div className="bg-theme-panel border border-theme-border rounded-2xl p-8">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center">
                        <Cpu size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-theme-text uppercase tracking-tight">AI Infrastructure Health</h2>
                        <p className="text-theme-muted text-sm mt-1">Real-time status of connected AI providers</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {aiHealth.map((ai) => (
                        <div key={ai.provider} className="p-4 bg-theme-bg border border-theme-border rounded-xl flex items-center justify-between">
                            <div className="space-y-1">
                                <span className="text-[10px] text-theme-muted uppercase font-bold tracking-widest">{ai.provider}</span>
                                <div className="flex items-center gap-2">
                                    <div className={`h-2 w-2 rounded-full ${
                                        ai.status === 'ok' ? 'bg-emerald-500' : 
                                        ai.status === 'degraded' ? 'bg-amber-500' : 'bg-red-500'
                                    }`} />
                                    <span className={`text-xs font-black uppercase ${
                                        ai.status === 'ok' ? 'text-emerald-400' : 
                                        ai.status === 'degraded' ? 'text-amber-400' : 'text-red-400'
                                    }`}>
                                        {ai.status}
                                    </span>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-[10px] text-theme-muted uppercase block">Usage</span>
                                <span className="text-sm font-mono text-theme-text">{ai.usage}%</span>
                            </div>
                        </div>
                    ))}
                    {aiHealth.length === 0 && (
                        <div className="col-span-3 text-center py-4 text-theme-muted text-xs italic">
                            Initializing monitors...
                        </div>
                    )}
                </div>
            </div>

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
                                className="w-full bg-theme-bg border border-theme-border rounded-xl px-4 py-3 text-theme-text focus:outline-none focus:border-emerald-500 transition-colors pl-10"
                                placeholder="5.0"
                            />
                            <CreditCard size={16} className="absolute left-3 top-3.5 text-theme-muted" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-theme-muted mb-2">Min. Payout Threshold (₹)</label>
                        <div className="relative">
                            <input
                                type="number"
                                value={settings.min_payout_amount}
                                onChange={(e) => setSettings({ ...settings, min_payout_amount: parseFloat(e.target.value) })}
                                className="w-full bg-theme-bg border border-theme-border rounded-xl px-4 py-3 text-theme-text focus:outline-none focus:border-emerald-500 transition-colors pl-10"
                                placeholder="500"
                            />
                            <IndianRupee size={16} className="absolute left-3 top-3.5 text-theme-muted" />
                        </div>
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
                    <div className="flex items-center justify-between p-4 bg-theme-bg border border-theme-border rounded-xl hover:border-theme-border transition-all">
                        <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-lg ${settings.maintenance_mode ? 'bg-red-500/20 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                                <Lock size={20} />
                            </div>
                            <div>
                                <h4 className="font-bold text-theme-text">Maintenance Mode</h4>
                                <p className="text-xs text-theme-muted">
                                    {settings.maintenance_mode ? "Active: Store is locked." : "Inactive: Store is live."}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setSettings({ ...settings, maintenance_mode: !settings.maintenance_mode })}
                            className={`w-14 h-7 rounded-full p-1 transition-colors ${settings.maintenance_mode ? 'bg-red-500' : 'bg-theme-muted'}`}
                        >
                            <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${settings.maintenance_mode ? 'translate-x-7' : 'translate-x-0'}`} />
                        </button>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-theme-muted mb-2">Global Announcement Banner</label>
                        <div className="relative">
                            <textarea
                                value={settings.announcement_message || ''}
                                onChange={(e) => setSettings({ ...settings, announcement_message: e.target.value })}
                                className="w-full bg-theme-bg border border-theme-border rounded-xl px-4 py-3 text-theme-text focus:outline-none focus:border-emerald-500 transition-colors pl-10 min-h-[80px]"
                                placeholder="e.g., Scheduled maintenance..."
                            />
                            <Globe size={16} className="absolute left-3 top-3.5 text-theme-muted" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-end">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
                >
                    <Save size={18} />
                    {saving ? 'Saving Changes...' : 'Save Configuration'}
                </button>
            </div>
        </div>
    );
};

export default PlatformConfigPanel;
