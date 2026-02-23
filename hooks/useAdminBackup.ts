import { useState } from 'react';
import { initGoogleClient, signInToGoogle, uploadFileToDrive } from '../lib/google-drive';
import { supabase } from '../lib/supabase';
import { notifyAdmin } from '../lib/notifications';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;

export const useAdminBackup = () => {
    const [isBackupRunning, setIsBackupRunning] = useState(false);
    const [backupStatus, setBackupStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [lastBackupDate, setLastBackupDate] = useState<string | null>(null);

    const generateAdminBackupData = async () => {
        // Admin fetches ALL data
        const { data: sellers } = await supabase.from('sellers').select('*');
        const { data: products } = await supabase.from('products').select('*');
        const { data: orders } = await supabase.from('orders').select('*');
        const { data: users } = await supabase.from('profiles').select('*'); // If profiles exist

        return {
            backup_type: 'ADMIN_PLATFORM_FULL',
            date: new Date().toISOString(),
            sellers,
            products,
            orders,
            users
        };
    };

    const performBackup = async () => {
        if (!GOOGLE_CLIENT_ID || !GOOGLE_API_KEY) {
            console.warn("Google Drive credentials missing");
            alert("Google Drive credentials missing in environment variables");
            return;
        }

        try {
            setIsBackupRunning(true);
            setBackupStatus('idle');

            // Ensure signed in
            await signInToGoogle();

            const backupData = await generateAdminBackupData();
            const fileName = `admin_platform_backup_${new Date().toISOString().split('T')[0]}.json`;

            await uploadFileToDrive(backupData, fileName);

            setLastBackupDate(new Date().toISOString());
            setLastBackupDate(new Date().toISOString());
            setBackupStatus('success');
            console.log("Admin Backup successful");

            // Notify Admin via Telegram
            notifyAdmin({
                type: 'BACKUP_SUCCESS',
                message: 'Admin Platform Backup completed successfully.',
                data: {
                    backup_type: 'ADMIN_PLATFORM_FULL',
                    user_email: 'admin@platform.com' // You could fetch real user email here
                }
            });

        } catch (error) {
            console.error("Admin Backup failed", error);
            setBackupStatus('error');
            alert("Backup failed: " + (error as Error).message);

            // Notify Failure
            notifyAdmin({
                type: 'BACKUP_FAILED',
                message: (error as Error).message,
                data: { user_email: 'admin' }
            });

        } finally {
            setIsBackupRunning(false);
        }
    };

    const downloadLocalBackup = async () => {
        try {
            setIsBackupRunning(true);
            const backupData = await generateAdminBackupData();
            const fileName = `admin_platform_backup_${new Date().toISOString().split('T')[0]}.json`;

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

    const initClient = () => {
        if (GOOGLE_CLIENT_ID && GOOGLE_API_KEY) {
            initGoogleClient({
                clientId: GOOGLE_CLIENT_ID,
                apiKey: GOOGLE_API_KEY,
            }).catch(err => console.error("Failed to init Google Client", err));
        }
    }

    return {
        isBackupRunning,
        backupStatus,
        lastBackupDate,
        performBackup,
        downloadLocalBackup,
        initClient
    };
};
