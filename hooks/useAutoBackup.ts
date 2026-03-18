import { useEffect, useState } from 'react';
import { initGoogleClient, signInToGoogle, uploadFileToDrive } from '../lib/google-drive';
import { supabase } from '../lib/supabase';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;

export const useAutoBackup = (enableAuto = true) => {
    const [isBackupRunning, setIsBackupRunning] = useState(false);
    const [backupStatus, setBackupStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [backupProgress, setBackupProgress] = useState(0);
    const [backupMessage, setBackupMessage] = useState<string | null>(null);
    const [lastBackupDate, setLastBackupDate] = useState<string | null>(null);

    useEffect(() => {
        const savedDate = localStorage.getItem('last_drive_backup');
        if (savedDate) {
            setLastBackupDate(savedDate);
        }

        // Initialize GAPI client on mount - only if credentials are present
        if (GOOGLE_CLIENT_ID && GOOGLE_API_KEY) {
            initGoogleClient({
                clientId: GOOGLE_CLIENT_ID,
                apiKey: GOOGLE_API_KEY,
            }).catch(err => {
                // Silently handle init failures in local dev unless they are critical
                if (import.meta.env.DEV) {
                    console.log("Google Client initialization skipped or failed (local dev)");
                } else {
                    console.error("Failed to init Google Client", err);
                }
            });
        }

        if (enableAuto) {
            performBackup();
        }
    }, []);

    const generateBackupData = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("No user logged in");

        const { data: products } = await supabase.from('products').select('*').eq('seller_id', user.id);
        const { data: orders } = await supabase.from('orders').select('*').eq('seller_id', user.id);
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        // const { data: categories } = await supabase.from('categories').select('*'); // Removed: Table does not exist in public schema

        return {
            date: new Date().toISOString(),
            seller_id: user.id,
            profile,
            products,
            orders
        };
    };

    const performBackup = async (manual = false) => {
        if (!GOOGLE_CLIENT_ID || !GOOGLE_API_KEY) {
            console.warn("Google Drive credentials missing");
            return;
        }

        // Check 24h cooldown unless manual
        const lastRun = localStorage.getItem('last_drive_backup');
        if (!manual && lastRun) {
            const hoursSince = (Date.now() - new Date(lastRun).getTime()) / 1000 / 60 / 60;
            if (hoursSince < 24) {
                console.log("Backup skipped: executed recently");
                return;
            }
        }

        try {
            setIsBackupRunning(true);
            setBackupStatus('idle');
            setBackupProgress(10);
            setBackupMessage("Gathering store data...");

            // 1. Fetch Data
            const backupData = await generateBackupData();
            setBackupProgress(40);
            setBackupMessage("Preparing upload...");

            // 2. Auth & Upload
            // Ensure signed in (might trigger popup if first time)
            // For auto-backup to work silently, user must have authorized previously.
            // If not authorized, this will throw or prompt.
            // We'll wrap in try/catch to not annoy user if silent auth fails.

            const fileName = `store_backup_${new Date().toISOString().split('T')[0]}.json`;
            setBackupProgress(60);
            setBackupMessage("Uploading to Google Drive...");
            
            await uploadFileToDrive(backupData, fileName);
            setBackupProgress(90);
            setBackupMessage("Finalizing...");

            // 3. Success
            const now = new Date().toISOString();
            localStorage.setItem('last_drive_backup', now);
            setLastBackupDate(now);
            setBackupStatus('success');
            setBackupProgress(100);
            setBackupMessage("Backup completed successfully!");
            console.log("Backup successful");

            // Reset status message after delay
            setTimeout(() => {
                setBackupProgress(0);
                setBackupMessage(null);
            }, 5000);

        } catch (error) {
            console.error("Backup failed", error);
            setBackupStatus('error');
            setBackupMessage(error instanceof Error ? error.message : "Backup failed. Please check your connection.");
            setBackupProgress(0);
            // If error is "User not signed in", we might want to prompt them in the UI
            // but strictly for AUTO backup, we fail silently.
        } finally {
            setIsBackupRunning(false);
        }
    };

    const downloadLocalBackup = async () => {
        try {
            setIsBackupRunning(true);
            const backupData = await generateBackupData();
            const fileName = `store_backup_${new Date().toISOString().split('T')[0]}.json`;

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
            alert("Failed to generate backup file");
        } finally {
            setIsBackupRunning(false);
        }
    };

    const downloadCSVBackup = async () => {
        try {
            const { jsonToCSV } = await import('../dashboard/lib/vault-utils');
            setIsBackupRunning(true);
            const backupData = await generateBackupData();
            
            // For CSV, we'll download products as primary focus
            const csv = jsonToCSV(backupData.products || []);
            const fileName = `store_products_export_${new Date().toISOString().split('T')[0]}.csv`;

            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("CSV download failed", error);
            alert("Failed to generate CSV export");
        } finally {
            setIsBackupRunning(false);
        }
    };

    const connectAndBackup = async () => {
        try {
            await signInToGoogle();
            await performBackup(true);
        } catch (err) {
            console.error("Connect failed", err);
            alert("Failed to connect to Google Drive. Please check your browser's popup blocker or console for details.");
        }
    };

    return { 
        isBackupRunning, 
        backupStatus, 
        backupProgress,
        backupMessage,
        lastBackupDate, 
        connectAndBackup, 
        performBackup, 
        downloadLocalBackup, 
        downloadCSVBackup 
    };
};
