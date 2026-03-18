import React from 'react';
import { Database, Download, Check, AlertCircle, Loader2, RefreshCw, Lock } from 'lucide-react';
import { useAutoBackup } from '../../../hooks/useAutoBackup';

export const DataSettings = ({ renderHeader }: any) => {
    const { 
        lastBackupDate, 
        connectAndBackup, 
        performBackup, 
        isBackupRunning, 
        backupStatus, 
        backupProgress, 
        backupMessage, 
        downloadLocalBackup 
    } = useAutoBackup(false);

    return (
        <div className="bg-panel rounded-2xl p-4 md:p-6 lg:p-8 border border-border shadow-sm animate-fadeIn">
            {renderHeader('Data & Backup', <Database size={20} />)}

            <div className="bg-bg/50 p-6 rounded-2xl border border-border mb-6">
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-blue-500/10 text-blue-600 rounded-xl flex items-center justify-center">
                        <Database size={24} />
                    </div>
                    <div className="flex-grow">
                        <h4 className="font-bold text-base text-text">Google Drive Backup</h4>
                        <p className="text-xs text-muted mt-1 leading-relaxed">
                            Keep your store data safe by owning a physical backup on your personal Google Drive.
                        </p>
                    </div>
                    { (backupStatus === 'success' || (backupStatus === 'idle' && localStorage.getItem('gdrive_connected') === 'true')) && (
                        <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                            <Check size={12} /> Active
                        </span>
                    )}
                </div>

                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white dark:bg-neutral-800/50 border border-border rounded-xl p-4">
                    <div>
                        <span className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-1">Last Succesful Backup</span>
                        {lastBackupDate ? (
                            <span className="text-sm font-bold text-text">{new Date(lastBackupDate).toLocaleString()}</span>
                        ) : (
                            <span className="text-sm font-medium text-muted italic">Never backed up</span>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={downloadLocalBackup}
                            disabled={isBackupRunning}
                            className="text-xs font-bold bg-white dark:bg-neutral-800 text-text border border-border hover:bg-gray-50 dark:hover:bg-neutral-700 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            <Download size={14} /> Download
                        </button>
                        <button
                            onClick={connectAndBackup}
                            disabled={isBackupRunning}
                            className="text-xs font-bold bg-white dark:bg-neutral-800 text-text border border-border hover:bg-gray-50 dark:hover:bg-neutral-700 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                        >
                            {(backupStatus === 'success' || (backupStatus === 'idle' && localStorage.getItem('gdrive_connected') === 'true')) ? 'Connected' : 'Connect Drive'}
                        </button>
                        <button
                            onClick={() => performBackup(true)}
                            disabled={isBackupRunning}
                            className="text-xs font-bold bg-primary text-primary-foreground hover:opacity-90 px-4 py-2 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                            {isBackupRunning ? <Loader2 className="animate-spin w-3 h-3" /> : <RefreshCw size={14} />}
                            {isBackupRunning ? 'Backing up...' : 'Back Up Now'}
                        </button>
                    </div>
                </div>

                {/* Progress Bar & Status Messages */}
                {(isBackupRunning || backupMessage) && (
                    <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="flex items-center justify-between mb-2">
                            <span className={`text-[11px] font-bold flex items-center gap-2 ${
                                backupStatus === 'error' ? 'text-red-500' : 
                                backupStatus === 'success' ? 'text-green-500' : 'text-primary'
                            }`}>
                                {backupStatus === 'error' ? <AlertCircle size={14} /> : 
                                 backupStatus === 'success' ? <Check size={14} /> : 
                                 <Loader2 size={14} className="animate-spin" />}
                                {backupMessage}
                            </span>
                            {isBackupRunning && (
                                <span className="text-[10px] font-bold text-muted">{backupProgress}%</span>
                            )}
                        </div>
                        <div className="h-1.5 w-full bg-bg/50 rounded-full overflow-hidden border border-border">
                            <div 
                                className={`h-full transition-all duration-500 ease-out rounded-full ${
                                    backupStatus === 'error' ? 'bg-red-500' : 
                                    backupStatus === 'success' ? 'bg-green-500' : 'bg-primary'
                                }`}
                                style={{ width: `${backupProgress}%` }}
                            />
                        </div>
                    </div>
                )}

                {backupStatus === 'error' && (
                    <p className="text-xs text-red-500 font-medium mt-3 flex items-center gap-2">
                        <AlertCircle size={14} />
                        Backup failed. Please ensure you have connected your Drive account.
                    </p>
                )}
            </div>

            <div className="bg-orange-50 border border-orange-100 p-5 rounded-2xl flex items-start gap-4">
                <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                    <Lock size={18} />
                </div>
                <div>
                    <h4 className="font-bold text-sm text-orange-900 mb-1">Data Ownership</h4>
                    <p className="text-xs text-orange-800/80 leading-relaxed">
                        We believe you should own your data. These backups are saved directly to your personal Google Drive, giving you full control and access to your business records even if you leave our platform.
                    </p>
                </div>
            </div>
        </div>
    );
};
