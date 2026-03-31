import { CheckCircle, XCircle, Clock, AlertTriangle, ExternalLink, Download } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { BackupJob } from "@/hooks/useDriveBackup";

interface BackupHistoryListProps {
  history: BackupJob[];
  loading?: boolean;
  onDownloadFallback?: () => void;
}

export function BackupHistoryList({ history, loading, onDownloadFallback }: BackupHistoryListProps) {
  if (loading) {
    return <div className="animate-pulse space-y-4">
       {[...Array(3)].map((_, i) => (
         <div key={i} className="h-16 bg-muted/20 rounded-lg"></div>
       ))}
    </div>;
  }

  if (history.length === 0) {
    return <div className="text-center py-6 text-muted-foreground text-sm">No backups found.</div>;
  }

  return (
    <div className="space-y-4">
      {history.map((job) => (
        <div key={job.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-muted/10 rounded-lg border border-border/50 gap-4">
           {/* Details */}
           <div className="flex items-start gap-3">
              <div className="mt-0.5">
                  {job.status === 'completed' && <CheckCircle className="h-5 w-5 text-green-500" />}
                  {job.status === 'failed' && <XCircle className="h-5 w-5 text-destructive" />}
                  {(job.status === 'pending' || job.status === 'processing') && <Clock className="h-5 w-5 text-yellow-500 animate-pulse" />}
              </div>
              <div>
                  <div className="font-medium text-sm flex items-center gap-2">
                     {job.file_name || "Preparing backup..."}
                     {job.status === 'failed' && job.error_message === '401 Unauthorized' && (
                         <span className="flex items-center text-xs text-destructive gap-1 px-1.5 py-0.5 bg-destructive/10 rounded">
                             <AlertTriangle className="h-3 w-3" /> Reconnect Required
                         </span>
                     )}
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1 mt-1">
                      {job.completed_at ? (
                          <p>Completed {formatDistanceToNow(new Date(job.completed_at), { addSuffix: true })} • {format(new Date(job.completed_at), "PPpp")}</p>
                      ) : (
                          <p>Started {formatDistanceToNow(new Date(job.started_at || job.created_at), { addSuffix: true })}</p>
                      )}
                      
                      {job.file_size_bytes && <p>Size: {(job.file_size_bytes / 1024 / 1024).toFixed(2)} MB</p>}
                      {job.status === 'failed' && job.error_message !== '401 Unauthorized' && <p className="text-destructive mt-1">Error: {job.error_message}</p>}
                  </div>
              </div>
           </div>

           {/* Actions */}
           <div className="flex gap-2 min-w-max">
               {job.status === 'completed' && job.drive_file_id && (
                  <a href={`https://drive.google.com/file/d/${job.drive_file_id}/view`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 rounded-md transition-colors">
                     View in Drive
                     <ExternalLink className="h-3.5 w-3.5" />
                  </a>
               )}
               {job.status === 'completed' && !job.drive_file_id && (
                  <button onClick={onDownloadFallback} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-muted text-foreground hover:bg-muted/80 rounded-md transition-colors">
                      <Download className="h-3.5 w-3.5" />
                      Fallback Download
                  </button>
               )}
           </div>
        </div>
      ))}
    </div>
  );
}
