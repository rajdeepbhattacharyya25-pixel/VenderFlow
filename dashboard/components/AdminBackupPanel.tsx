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
        initClient,
        backupHistory
    } = useAdminBackup();

    React.useEffect(() => {
        initClient();
    }, []);

    return (
        <div className="space-y-6">
            <div className="bg-theme-panel border border-theme-border rounded-2xl p-8">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-indigo-500/10 text-indigo-500 rounded-xl flex items-center justify-center">
                        <Database size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-theme-text">Data & Backup</h2>
                        <p className="text-theme-muted text-sm mt-1">Manage global platform data and backups</p>
                    </div>
                </div>

                <div className="bg-theme-bg border border-theme-border rounded-xl p-6">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                        <div>
                            <h3 className="font-bold text-theme-text mb-2">Platform-wide Backup</h3>
                            <p className="text-sm text-theme-muted max-w-lg mb-2">
                                Save a complete snapshot of all sellers, products, orders, and user data.
                                <br /> <span className="text-indigo-400">Contains sensitive data - Handle with care.</span>
                            </p>
                            {lastBackupDate && (
                                <p className="text-xs text-green-500 mt-2">
                                    Last Global Sync: {new Date(lastBackupDate).toLocaleString()}
                                </p>
                            )}
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={downloadLocalBackup}
                                disabled={isBackupRunning}
                                className="flex items-center gap-2 bg-theme-panel hover:bg-theme-bg text-theme-text px-4 py-2.5 rounded-lg font-medium text-sm transition-all border border-theme-border disabled:opacity-50"
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
                </div>
            </div>

            {/* Backup History Table */}
            <div className="bg-theme-panel border border-theme-border rounded-2xl overflow-hidden">
                <div className="px-8 py-6 border-b border-theme-border">
                    <h3 className="text-lg font-bold text-theme-text">Recent History</h3>
                    <p className="text-theme-muted text-sm mt-1">Last 10 platform-wide backup operations</p>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-theme-bg/50 text-theme-muted text-xs uppercase tracking-wider">
                                <th className="px-8 py-4 font-bold">Date</th>
                                <th className="px-6 py-4 font-bold">Status</th>
                                <th className="px-6 py-4 font-bold">File</th>
                                <th className="px-6 py-4 font-bold text-right">Size</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-theme-border/50">
                            {backupHistory.length > 0 ? (
                                backupHistory.map((backup) => (
                                    <tr key={backup.id} className="hover:bg-theme-bg/30 transition-colors">
                                        <td className="px-8 py-4 whitespace-nowrap">
                                            <p className="text-sm text-theme-text">
                                                {new Date(backup.created_at).toLocaleDateString()}
                                            </p>
                                            <p className="text-xs text-theme-muted">
                                                {new Date(backup.created_at).toLocaleTimeString()}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                                                backup.status === 'success' 
                                                ? 'bg-green-500/10 text-green-500' 
                                                : 'bg-red-500/10 text-red-500'
                                            }`}>
                                                {backup.status === 'success' ? <Check size={12} /> : <AlertCircle size={12} />}
                                                {backup.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm text-theme-text font-mono truncate max-w-[200px]" title={backup.filename}>
                                                {backup.filename}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm text-theme-muted">
                                            {backup.size_bytes ? (backup.size_bytes / 1024 / 1024).toFixed(2) + ' MB' : '--'}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="px-8 py-12 text-center text-theme-muted italic">
                                        No backup history found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminBackupPanel;
