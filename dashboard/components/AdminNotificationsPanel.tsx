import React, { useEffect, useState } from 'react';
import { Bell, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const AdminNotificationsPanel: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [prefs, setPrefs] = useState({
        backup_success: true,
        backup_failed: true,
        new_message: true,
        system_alert: true
    });

    useEffect(() => {
        fetchPrefs();
    }, []);

    const fetchPrefs = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('profiles')
                .select('notification_preferences')
                .eq('id', user.id)
                .single();

            if (error) throw error;

            if (data?.notification_preferences) {
                setPrefs(data.notification_preferences);
            }
        } catch (err) {
            console.error('Error fetching admin prefs:', err);
        } finally {
            setLoading(false);
        }
    };

    const toggle = async (key: keyof typeof prefs) => {
        const newPrefs = { ...prefs, [key]: !prefs[key] };
        
        // Optimistic update
        setPrefs(newPrefs);
        setSaving(true);
        setSaved(false);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error } = await supabase
                .from('profiles')
                .update({ notification_preferences: newPrefs })
                .eq('id', user.id);

            if (error) throw error;
            
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (err) {
            console.error('Error saving admin prefs:', err);
            // Revert on error
            setPrefs(prefs);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-theme-panel border border-theme-border rounded-2xl p-8 flex items-center justify-center min-h-[300px]">
                <Loader2 className="animate-spin text-theme-muted" size={32} />
            </div>
        );
    }

    return (
        <div className="bg-theme-panel border border-theme-border rounded-2xl p-8 relative overflow-hidden">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-xl flex items-center justify-center">
                        <Bell size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-theme-text">Notification Preferences</h2>
                        <p className="text-theme-muted text-sm mt-1">Control which Telegram alerts you receive</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    {saving && <Loader2 className="animate-spin text-blue-500" size={16} />}
                    {saved && (
                        <div className="flex items-center gap-1 text-emerald-500 text-xs font-bold animate-in fade-in slide-in-from-right-2">
                            <CheckCircle2 size={14} />
                            <span>Synced to Cloud</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-4">
                <ToggleRow
                    label="Backup Success"
                    desc="Receive a message when a manual or auto backup finishes successfully."
                    enabled={prefs.backup_success}
                    onClick={() => toggle('backup_success')}
                    disabled={saving}
                />
                <ToggleRow
                    label="Backup Failure"
                    desc="Get a critical alert if the backup process fails."
                    enabled={prefs.backup_failed}
                    onClick={() => toggle('backup_failed')}
                    disabled={saving}
                />
                <ToggleRow
                    label="New Support Messages"
                    desc="Get notified immediately when a seller contacts support."
                    enabled={prefs.new_message}
                    onClick={() => toggle('new_message')}
                    disabled={saving}
                />
                <ToggleRow
                    label="System Alerts"
                    desc="Critical infrastructure warnings (Storage full, API errors, etc)."
                    enabled={prefs.system_alert}
                    onClick={() => toggle('system_alert')}
                    disabled={saving}
                />
            </div>
        </div>
    );
};

const ToggleRow = ({ label, desc, enabled, onClick, disabled }: { label: string, desc: string, enabled: boolean, onClick: () => void, disabled?: boolean }) => (
    <div className={`flex items-center justify-between p-4 bg-theme-bg border border-theme-border rounded-xl transition-all ${disabled ? 'opacity-50 grayscale' : 'hover:border-blue-500/30'}`}>
        <div>
            <h4 className="font-bold text-theme-text text-sm">{label}</h4>
            <p className="text-xs text-theme-muted">{desc}</p>
        </div>
        <button
            onClick={onClick}
            disabled={disabled}
            className={`w-12 h-6 rounded-full p-1 transition-colors relative ${enabled ? 'bg-emerald-600' : 'bg-theme-muted'}`}
            aria-label={`Toggle ${label}`}
        >
            <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200 ${enabled ? 'translate-x-6' : 'translate-x-0'}`} />
        </button>
    </div>
);

export default AdminNotificationsPanel;
