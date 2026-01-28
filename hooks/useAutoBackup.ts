import { useEffect, useState } from 'react';
import { initGoogleClient, signInToGoogle, uploadFileToDrive } from '../lib/google-drive';
import { supabase } from '../lib/supabase';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;

export const useAutoBackup = (enableAuto = true) => {
    const [isBackupRunning, setIsBackupRunning] = useState(false);
    const [backupStatus, setBackupStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [lastBackupDate, setLastBackupDate] = useState<string | null>(null);

    useEffect(() => {
        const savedDate = localStorage.getItem('last_drive_backup');
        if (savedDate) {
            setLastBackupDate(savedDate);
        }

        // Initialize GAPI client on mount
        if (GOOGLE_CLIENT_ID && GOOGLE_API_KEY) {
            initGoogleClient({
                clientId: GOOGLE_CLIENT_ID,
                apiKey: GOOGLE_API_KEY,
            }).catch(err => console.error("Failed to init Google Client", err));
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

        return {
            date: new Date().toISOString(),
            seller_id: user.id,
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

            // 1. Fetch Data
            const backupData = await generateBackupData();

            // 2. Auth & Upload
            // Ensure signed in (might trigger popup if first time)
            // For auto-backup to work silently, user must have authorized previously.
            // If not authorized, this will throw or prompt.
            // We'll wrap in try/catch to not annoy user if silent auth fails.

            const fileName = `store_backup_${new Date().toISOString().split('T')[0]}.json`;
            await uploadFileToDrive(backupData, fileName);

            // 3. Success
            const now = new Date().toISOString();
            localStorage.setItem('last_drive_backup', now);
            setLastBackupDate(now);
            setBackupStatus('success');
            console.log("Backup successful");

        } catch (error) {
            console.error("Backup failed", error);
            setBackupStatus('error');
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

    const connectAndBackup = async () => {
        try {
            await signInToGoogle();
            await performBackup(true);
        } catch (err) {
            console.error("Connect failed", err);
        }
    };

    return { isBackupRunning, backupStatus, lastBackupDate, connectAndBackup, performBackup, downloadLocalBackup };
};
