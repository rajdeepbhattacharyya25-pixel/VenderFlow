import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Info, AlertTriangle, AlertCircle, ShoppingBag, User } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { adminDb, Notification } from '../../../lib/admin-api';
import { usePushNotifications } from '../../../hooks/usePushNotifications';

const NotificationCenter: React.FC = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const { isSubscribed, subscribeToPush, loading: pushLoading } = usePushNotifications();

    useEffect(() => {
        fetchNotifications();

        // Subscription for real-time updates
        const subscription = supabase
            .channel('admin-notifications')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications'
                },
                (payload) => {
                    // Check if notification is for us (global or specific user)
                    // Since we can't easily check user_id match in generic handler without auth context, 
                    // we'll just refresh. Ideally check payload.new.user_id
                    fetchNotifications();
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const data = await adminDb.getNotifications(20);
            setNotifications(data);
            setUnreadCount(data.filter(n => !n.is_read).length);
        } catch (error) {
            console.error('Error loading notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAsRead = async (id: string) => {
        // Optimistic update
        setNotifications(prev => prev.map(n =>
            n.id === id ? { ...n, is_read: true } : n
        ));
        setUnreadCount(prev => Math.max(0, prev - 1));

        await adminDb.markNotificationAsRead(id);
    };

    const handleMarkAllRead = async () => {
        // Optimistic update
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);

        await adminDb.markAllNotificationsRead();
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'warning': return <AlertTriangle size={16} className="text-amber-500" />;
            case 'error': return <AlertCircle size={16} className="text-red-500" />;
            case 'success': return <Check size={16} className="text-emerald-500" />;
            case 'order': return <ShoppingBag size={16} className="text-indigo-500" />;
            case 'seller': return <User size={16} className="text-blue-500" />;
            default: return <Info size={16} className="text-neutral-400" />;
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 hover:bg-neutral-800 rounded-lg relative text-neutral-400 transition-colors"
                title="View notifications"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-neutral-900 animate-pulse"></span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/50 backdrop-blur-sm">
                        <h3 className="font-semibold text-white text-sm">Notifications</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllRead}
                                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                            >
                                Mark all read
                            </button>
                        )}
                    </div>

                    <div className="max-h-[400px] overflow-y-auto">
                        {loading && notifications.length === 0 ? (
                            <div className="p-8 text-center text-neutral-500 text-sm">
                                Loading...
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="p-8 text-center text-neutral-500">
                                <Bell className="w-8 h-8 mx-auto mb-3 opacity-20" />
                                <p className="text-sm">No notifications yet</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-neutral-800">
                                {notifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        className={`p-4 hover:bg-neutral-800/50 transition-colors relative group ${!notification.is_read ? 'bg-indigo-500/5' : ''}`}
                                    >
                                        <div className="flex gap-3">
                                            <div className="mt-0.5 flex-shrink-0">
                                                {getIcon(notification.type)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm font-medium mb-0.5 ${!notification.is_read ? 'text-white' : 'text-neutral-300'}`}>
                                                    {notification.title}
                                                </p>
                                                <p className="text-xs text-neutral-500 leading-relaxed mb-1.5">
                                                    {notification.message}
                                                </p>
                                                <p className="text-[10px] text-neutral-600">
                                                    {new Date(notification.created_at).toLocaleString()}
                                                </p>
                                            </div>
                                            {!notification.is_read && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleMarkAsRead(notification.id);
                                                    }}
                                                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-neutral-700 rounded-full transition-all self-start text-neutral-400 hover:text-indigo-400"
                                                    title="Mark as read"
                                                >
                                                    <Check size={14} />
                                                </button>
                                            )}
                                        </div>
                                        {notification.link && (
                                            <a
                                                href={notification.link}
                                                className="absolute inset-0 z-0"
                                                onClick={() => !notification.is_read && handleMarkAsRead(notification.id)}
                                            >
                                                <span className="sr-only">View details</span>
                                            </a>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer - Push Opt-in */}
                    {!isSubscribed && (
                        <div className="p-3 bg-neutral-800/50 border-t border-neutral-700">
                            <button
                                onClick={subscribeToPush}
                                disabled={pushLoading}
                                className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow-sm hover:shadow active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                <Bell size={14} />
                                {pushLoading ? 'Enabling...' : 'Enable Browser Notifications'}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default NotificationCenter;
