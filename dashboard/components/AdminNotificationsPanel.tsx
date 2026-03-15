import React from 'react';
import { Bell } from 'lucide-react';

const AdminNotificationsPanel: React.FC = () => {
    const [prefs, setPrefs] = React.useState({
        backup_success: true,
        backup_failed: true,
        new_message: true,
        system_alert: true
    });

    React.useEffect(() => {
        const saved = localStorage.getItem('admin_notification_prefs');
        if (saved) setPrefs(JSON.parse(saved));
    }, []);

    const toggle = (key: keyof typeof prefs) => {
        const newPrefs = { ...prefs, [key]: !prefs[key] };
        setPrefs(newPrefs);
        localStorage.setItem('admin_notification_prefs', JSON.stringify(newPrefs));
    };

    return (
        <div className="bg-theme-panel border border-theme-border rounded-2xl p-8">
            <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-xl flex items-center justify-center">
                    <Bell size={24} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-theme-text">Notification Preferences</h2>
                    <p className="text-theme-muted text-sm mt-1">Control which Telegram alerts you receive</p>
                </div>
            </div>

            <div className="space-y-4">
                <ToggleRow
                    label="Backup Success"
                    desc="Receive a message when a manual or auto backup finishes successfully."
                    enabled={prefs.backup_success}
                    onClick={() => toggle('backup_success')}
                />
                <ToggleRow
                    label="Backup Failure"
                    desc="Get a critical alert if the backup process fails."
                    enabled={prefs.backup_failed}
                    onClick={() => toggle('backup_failed')}
                />
                <ToggleRow
                    label="New Support Messages"
                    desc="Get notified immediately when a seller contacts support."
                    enabled={prefs.new_message}
                    onClick={() => toggle('new_message')}
                />
                <ToggleRow
                    label="System Alerts"
                    desc="Critical infrastructure warnings (Storage full, API errors, etc)."
                    enabled={prefs.system_alert}
                    onClick={() => toggle('system_alert')}
                />
            </div>
        </div>
    );
};

const ToggleRow = ({ label, desc, enabled, onClick }: { label: string, desc: string, enabled: boolean, onClick: () => void }) => (
    <div className="flex items-center justify-between p-4 bg-theme-bg border border-theme-border rounded-xl hover:border-theme-border transition-all">
        <div>
            <h4 className="font-bold text-theme-text text-sm">{label}</h4>
            <p className="text-xs text-theme-muted">{desc}</p>
        </div>
        <button
            onClick={onClick}
            className={`w-12 h-6 rounded-full p-1 transition-colors ${enabled ? 'bg-indigo-600' : 'bg-theme-muted'}`}
            aria-label={`Toggle ${label}`}
        >
            <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${enabled ? 'translate-x-6' : 'translate-x-0'}`} />
        </button>
    </div>
);

export default AdminNotificationsPanel;
