import React from 'react';
import { Settings, Download, Database, Loader2, Check, AlertCircle, Bell } from 'lucide-react';
import { useAdminBackup } from '../../hooks/useAdminBackup';

const AdminSettings: React.FC = () => {
    const {
        isBackupRunning,
        backupStatus,
        lastBackupDate,
        performBackup,
        downloadLocalBackup,
        initClient
    } = useAdminBackup();

    React.useEffect(() => {
        initClient();
    }, []);

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <h1 className="text-3xl font-bold text-white tracking-tight mb-8">Platform Settings</h1>

            {/* Data & Backup Section */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 mb-8">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-indigo-500/10 text-indigo-400 rounded-xl flex items-center justify-center">
                        <Settings size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Data & Backup</h2>
                        <p className="text-neutral-400 text-sm mt-1">Manage global platform data and backups</p>
                    </div>
                </div>

                <div className="bg-black/20 border border-neutral-800 rounded-xl p-6">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                        <div>
                            <h3 className="font-bold text-white mb-2">Platform-wide Backup</h3>
                            <p className="text-sm text-neutral-400 max-w-lg mb-2">
                                Save a complete snapshot of all sellers, products, orders, and user data.
                                <br /> <span className="text-indigo-400">Contains sensitive data - Handle with care.</span>
                            </p>
                            {lastBackupDate && (
                                <p className="text-xs text-green-400 mt-2">
                                    Last Backup: {new Date(lastBackupDate).toLocaleString()}
                                </p>
                            )}
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={downloadLocalBackup}
                                disabled={isBackupRunning}
                                className="flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2.5 rounded-lg font-medium text-sm transition-all border border-neutral-700 disabled:opacity-50"
                            >
                                <Download size={16} />
                                Download JSON
                            </button>
                            <button
                                onClick={performBackup}
                                disabled={isBackupRunning}
                                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-lg font-medium text-sm transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                            >
                                {isBackupRunning ? <Loader2 className="animate-spin" size={16} /> : <Database size={16} />}
                                {isBackupRunning ? 'Backing up...' : 'Backup to Drive'}
                            </button>
                        </div>
                    </div>
                    {backupStatus === 'success' && (
                        <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm flex items-center gap-2">
                            <Check size={16} /> Backup completed successfully
                        </div>
                    )}
                    {backupStatus === 'error' && (
                        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm flex items-center gap-2">
                            <AlertCircle size={16} /> Backup failed. Check console for details.
                        </div>
                    )}
                </div>
            </div>

            {/* Notification Preferences */}
            <NotificationPreferences />

            <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-2xl flex flex-col items-center justify-center text-center text-neutral-500 border-dashed">
                <Settings size={48} className="mb-4 opacity-20" />
                <p>More settings coming soon: Commission rates, payment gateways, and system maintenance.</p>
            </div>
        </div>
    );
};

const NotificationPreferences = () => {
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
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 mb-8">
            <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-blue-500/10 text-blue-400 rounded-xl flex items-center justify-center">
                    <Bell size={24} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-white">Notification Preferences</h2>
                    <p className="text-neutral-400 text-sm mt-1">Control which Telegram alerts you receive</p>
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
    <div className="flex items-center justify-between p-4 bg-black/20 border border-neutral-800 rounded-xl hover:border-neutral-700 transition-all">
        <div>
            <h4 className="font-bold text-white text-sm">{label}</h4>
            <p className="text-xs text-neutral-500">{desc}</p>
        </div>
        <button
            onClick={onClick}
            className={`w-12 h-6 rounded-full p-1 transition-colors ${enabled ? 'bg-indigo-600' : 'bg-neutral-700'}`}
        >
            <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${enabled ? 'translate-x-6' : 'translate-x-0'}`} />
        </button>
    </div>
);

export default AdminSettings;
