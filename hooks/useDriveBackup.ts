import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface BackupJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message: string | null;
  file_name: string | null;
  file_size_bytes: number | null;
  backup_type: string;
  drive_file_id: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export function useDriveBackup(sellerId: string | undefined) {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [history, setHistory] = useState<BackupJob[]>([]);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  useEffect(() => {
    if (!sellerId) return;

    const fetchStatus = async () => {
      setIsLoading(true);
      try {
        // Check if integration exists
        const { data: intData } = await supabase
          .from('seller_integrations')
          .select('id')
          .eq('seller_id', sellerId)
          .eq('provider', 'google_drive')
          .single();

        setIsConnected(!!intData);

        // Fetch backup history
        const { data: jobs } = await supabase
          .from('backup_jobs')
          .select('*')
          .eq('seller_id', sellerId)
          .order('created_at', { ascending: false });

        setHistory(jobs || []);
        
        // Find if any job is currently pending or processing
        const active = jobs?.find(j => j.status === 'pending' || j.status === 'processing');
        if (active) {
            setActiveJobId(active.id);
        }
      } catch (err) {
        console.error("Failed to load backup status:", err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchStatus();

    // Setup realtime subscription
    const subscription = supabase
      .channel('public:backup_jobs')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'backup_jobs',
        filter: `seller_id=eq.${sellerId}`
      }, (payload) => {
          setHistory(prev => {
             const newEl = payload.new as BackupJob;
             const existingIdx = prev.findIndex(p => p.id === newEl.id);
             if (existingIdx > -1) {
                 const newArr = [...prev];
                 newArr[existingIdx] = newEl;
                 
                 // if the updated job finished, clear activeJobId
                 if (newEl.id === activeJobId && (newEl.status === 'completed' || newEl.status === 'failed')) {
                     setActiveJobId(null);
                 }
                 
                 return newArr.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
             } else {
                 return [newEl, ...prev].sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
             }
          });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };

  }, [sellerId, activeJobId]);

  const connectGoogleDrive = () => {
      // In a real app we'd fetch this from env
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      const redirectUri = window.location.origin + '/settings/drive-callback'; // Custom route mapped pointing to the function
      
      const scope = "https://www.googleapis.com/auth/drive.file";
      const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent`;
      
      window.location.href = oauthUrl;
  };

  const startBackup = async (retentionOptOut: boolean = false) => {
     if (!sellerId) return;
     
     // 1. Create a pending job
     const { data: job, error: jobErr } = await supabase.from('backup_jobs').insert({
         seller_id: sellerId,
         status: 'pending'
     }).select().single();

     if (jobErr) {
         console.error("Failed to create job", jobErr);
         return;
     }

     setActiveJobId(job.id);

     // 2. Trigger async background function
     supabase.functions.invoke('process-backup', {
         body: { seller_id: sellerId, job_id: job.id, retention_opt_out: retentionOptOut }
     }).catch(err => {
         console.error("Failed to invoke backup processor", err);
     });
  };

  const downloadLocalBackup = useCallback(async () => {
      try {
          if (!sellerId) return;
          setIsLoading(true);
          const { data: products } = await supabase.from('products').select('*').eq('seller_id', sellerId);
          const { data: orders } = await supabase.from('orders').select('*').eq('seller_id', sellerId);
          
          const backupData = {
              date: new Date().toISOString(),
              seller_id: sellerId,
              products,
              orders
          };
          
          const fileName = `backup_${sellerId}_${new Date().toISOString().split('T')[0]}.json`;
          const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
      } catch (error) {
          console.error("Local download failed", error);
      } finally {
          setIsLoading(false);
      }
  }, [sellerId]);

  return {
    isConnected,
    isLoading,
    history,
    startBackup,
    connectGoogleDrive,
    downloadLocalBackup,
    activeJobId
  };
}
