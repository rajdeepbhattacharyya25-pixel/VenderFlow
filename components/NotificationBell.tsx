import React, { useEffect, useState } from 'react';
import { IconBell, IconX } from './Icons';
import { supabase, secureInvoke } from '../lib/supabase';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { AlertItem, AlertAction } from './AlertItem';

interface Notification {
    id: string;
    title: string;
    message: string;
    created_at: string;
    read: boolean;
    link?: string;
    metadata?: {
        alert_id?: string;
        action_type?: string;
        action_payload?: any;
        severity?: 'info' | 'warning' | 'critical' | 'emergency';
    };
}

export const NotificationBell: React.FC = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const { isSubscribed, subscribeToPush, loading } = usePushNotifications();

    useEffect(() => {
        fetchNotifications();

        // Realtime subscription
        const channel = supabase
            .channel('notifications_header')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                },
                (payload) => {
                    const newNotification = payload.new as Notification;
                    setNotifications((prev) => [newNotification, ...prev]);
                    if (!newNotification.read) {
                        setUnreadCount((prev) => prev + 1);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchNotifications = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(10);

        if (data) {
            setNotifications(data);
            setUnreadCount(data.filter((n) => !n.read).length);
        }
    };

    const markAsRead = async (id: string) => {
        try {
            const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id);
            if (error) throw error;
            
            setNotifications((prev) =>
                prev.map((n) => (n.id === id ? { ...n, read: true } : n))
            );
            setUnreadCount((prev) => Math.max(0, prev - 1));
        } catch (err) {
            console.error("Failed to mark notification as read:", err);
        }
    };

    const handleActionClick = async (action: AlertAction) => {
        console.log("🚀 Executing Action:", action);
        
        switch (action.type) {
            case 'RETRY_BACKUP':
                // logic for retrying backup
                break;
            case 'RECONNECT_GOOGLE_DRIVE':
                window.location.href = '/dashboard/settings?tab=integrations';
                break;
            case 'FIX_PRODUCT_SYNC':
                window.location.href = `/dashboard/products/${action.payload.product_id}`;
                break;
            case 'UPGRADE_PLAN':
                window.location.href = action.payload?.redirect || '/dashboard?tab=billing';
                break;
            case 'LINK_RAZORPAY':
                window.location.href = action.payload?.redirect || '/dashboard?tab=settings';
                break;
            default:
                if (action.payload?.url) {
                    window.location.href = action.payload.url;
                }
        }
        setIsOpen(false);
    };

    const markAllAsRead = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false);
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        setUnreadCount(0);
    };

    const handleTestPush = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            await secureInvoke('send-push', {
                body: {
                    record: {
                        user_id: user.id,
                        title: 'Test Notification',
                        message: 'Browser notifications are working perfectly!'
                    }
                }
            });
        } catch (err) {
            console.error('Failed to trigger test push:', err);
        }
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative hover:text-primary transition-transform hover:scale-110 p-1"
                aria-label="Toggle notifications"
            >
                <IconBell className="w-5 h-5 text-gray-700 dark:text-gray-200" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full animate-pulse">
                        {unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-surface-dark rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                        {/* Header */}
                        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50 backdrop-blur-sm">
                            <h3 className="font-bold text-gray-800 dark:text-white text-sm">Notifications</h3>
                            <div className="flex gap-2">
                                {unreadCount > 0 && (
                                    <button
                                        onClick={markAllAsRead}
                                        className="text-xs text-primary hover:text-primary-dark font-medium transition-colors"
                                    >
                                        Mark all read
                                    </button>
                                )}
                                <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600" aria-label="Close notifications">
                                    <IconX className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* List */}
                        <div className="max-h-[400px] overflow-y-auto">
                            {notifications.length === 0 ? (
                                <div className="p-8 text-center text-gray-400 flex flex-col items-center gap-2">
                                    <IconBell className="w-8 h-8 opacity-20" />
                                    <p className="text-sm">No notifications yet</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-50 dark:divide-gray-800">
                                    {notifications.map((notification) => (
                                        <AlertItem
                                            key={notification.id}
                                            id={notification.id}
                                            title={notification.title}
                                            message={notification.message}
                                            created_at={notification.created_at}
                                            read={notification.read}
                                            severity={notification.metadata?.severity}
                                            action={notification.metadata?.action_type ? {
                                                type: notification.metadata.action_type,
                                                payload: notification.metadata.action_payload
                                            } : null}
                                            onMarkAsRead={markAsRead}
                                            onActionClick={handleActionClick}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer - Push Opt-in */}
                        <div className="p-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
                            {!isSubscribed ? (
                                <button
                                    onClick={subscribeToPush}
                                    disabled={loading}
                                    className="w-full py-2 px-3 bg-gray-900 dark:bg-white dark:text-black text-white rounded-lg text-xs font-bold shadow-sm hover:shadow active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                    <IconBell className="w-3 h-3" />
                                    {loading ? 'Enabling...' : 'Enable Push Notifications'}
                                </button>
                            ) : (
                                <div className="flex gap-2 w-full">
                                    <div className="flex-1 py-2 px-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-lg text-xs font-bold flex items-center justify-center gap-2 cursor-default">
                                        Notifications Active
                                    </div>
                                    <button
                                        onClick={handleTestPush}
                                        title="Send Test Notification"
                                        className="px-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg text-xs font-bold transition-all flex items-center justify-center"
                                    >
                                        Test
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
