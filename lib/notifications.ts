import { supabase } from './supabase';

type NotificationType = 'BACKUP_SUCCESS' | 'BACKUP_FAILED' | 'NEW_MESSAGE' | 'SYSTEM_ALERT';

interface NotificationPayload {
    type: NotificationType;
    message: string;
    data?: any;
}

export const notifyAdmin = async (payload: NotificationPayload) => {
    try {
        console.log("🔔 Sending Telegram Notification:", payload.type);

        const { data, error } = await supabase.functions.invoke('notify-admin', {
            body: payload
        });

        if (error) throw error;
        console.log("✅ Notification Sent");
        return true;
    } catch (error) {
        console.error("❌ Failed to send notification:", error);
        // Don't block the app flow if notification fails
        return false;
    }
};


