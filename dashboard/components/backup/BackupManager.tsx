import { useState } from "react";
import { useDriveBackup } from "@/hooks/useDriveBackup";
import { BackupHistoryList } from "./BackupHistoryList";
import { HardDrive, AlertTriangle, ShieldCheck } from "lucide-react";

interface BackupManagerProps {
  sellerId: string | undefined;
}

export function BackupManager({ sellerId }: BackupManagerProps) {
  const { isConnected, isLoading, history, startBackup, connectGoogleDrive, activeJobId, downloadLocalBackup } = useDriveBackup(sellerId);
  const [retentionOptOut, setRetentionOptOut] = useState(false);

  if (isLoading) {
    return <div className="animate-pulse space-y-4">
       <div className="h-6 w-32 bg-muted/20 rounded-lg"></div>
       <div className="h-24 bg-muted/20 rounded-lg"></div>
    </div>;
  }

  const requiresReconnect = history.find(j => j.status === 'failed' && j.error_message === '401 Unauthorized');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b pb-4 gap-4">
         <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
                <HardDrive className="h-5 w-5" /> Google Drive Backup
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
                Backup your complete store data. One file is generated for automated system restore, while a clean, human-readable ZIP is saved directly to your Drive for your records.
            </p>
         </div>

         {!isConnected || requiresReconnect ? (
             <button
               onClick={connectGoogleDrive}
               className="flex items-center gap-2 bg-[#4285F4] hover:bg-[#3367D6] text-white px-4 py-2 rounded-md font-medium text-sm transition-colors shadow-sm"
             >
                <img src="https://upload.wikimedia.org/wikipedia/commons/d/da/Google_Drive_logo.png" alt="Google Drive" className="w-4 h-4" />
                {requiresReconnect ? "Reconnect Drive" : "Connect Google Drive"}
             </button>
         ) : (
             <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full text-sm font-medium border border-emerald-200">
               <ShieldCheck className="h-4 w-4" /> 
               Connected
             </div>
         )}
      </div>

      {isConnected && !requiresReconnect && (
         <div className="bg-card p-4 rounded-xl border shadow-sm space-y-4">
             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                 <div>
                     <h3 className="font-medium text-foreground">Manual Backup</h3>
                     <p className="text-sm text-muted-foreground">Trigger an immediate backup to your Drive. This runs in the background.</p>
                 </div>
                 <button 
                   onClick={() => startBackup(retentionOptOut)} 
                   disabled={!!activeJobId}
                   className="whitespace-nowrap bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md font-medium text-sm transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                     {activeJobId ? "Backup in Progress..." : "Backup to Google Drive"}
                 </button>
             </div>

             <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                 <input 
                    type="checkbox" 
                    id="retentionOptOut" 
                    checked={retentionOptOut} 
                    onChange={(e) => setRetentionOptOut(e.target.checked)} 
                    className="h-4 w-4 rounded border-gray-300"
                 />
                 <label htmlFor="retentionOptOut" className="text-sm text-muted-foreground select-none">
                    Keep all backups (By default, we retain only your 5 most recent automated backups to save Drive space)
                 </label>
             </div>
         </div>
      )}

      {requiresReconnect && (
         <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-lg flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
            <div>
               <h4 className="font-semibold text-sm">Google Drive Reauthorization Required</h4>
               <p className="text-sm mt-1">Your Google Drive authorization has expired or was revoked. We cannot run backups until you reconnect.</p>
            </div>
         </div>
      )}

      <div className="mt-8 space-y-4">
         <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Backup History</h3>
         <BackupHistoryList history={history} loading={isLoading} onDownloadFallback={downloadLocalBackup} />
      </div>
    </div>
  );
}
