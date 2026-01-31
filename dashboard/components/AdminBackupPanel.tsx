import React from 'react';
import { Settings, Download, Database, Loader2, Check, AlertCircle } from 'lucide-react';
import { useAdminBackup } from '../../hooks/useAdminBackup';

const AdminBackupPanel: React.FC = () => {
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
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8">
            <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-indigo-500/10 text-indigo-400 rounded-xl flex items-center justify-center">
                    <Database size={24} />
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
    );
};

export default AdminBackupPanel;
