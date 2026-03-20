import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const PUBLIC_VAPID_KEY = 'BPLDWgW6EYvB03NAS_NUXG4JYsG6X2j3nbq5E3OKv99wIGAJipuAGpN4y11qL_LnHHePwZbgg4mkPwAtovfElRw';

export function usePushNotifications() {
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Check if user is already subscribed
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            navigator.serviceWorker.ready.then((registration) => {
                registration.pushManager.getSubscription().then((subscription) => {
                    setIsSubscribed(!!subscription);
                });
            });
        }
    }, []);

    const subscribeToPush = async () => {
        setLoading(true);
        try {
            if (!('serviceWorker' in navigator)) {
                throw new Error('Service workers are not supported in this browser');
            }

            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                throw new Error('Notification permission denied');
            }

            const registration = await navigator.serviceWorker.ready;

            // Subscribe to Push Manager
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY),
            });

            // Get current user
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                throw new Error('You must be logged in to enable notifications');
            }

            // Send to Supabase
            const { error } = await supabase.from('push_subscriptions').insert({
                user_id: user.id,
                endpoint: subscription.endpoint,
                p256dh: btoa(String.fromCharCode.apply(null, new Uint8Array(subscription.getKey('p256dh')!) as unknown as number[])),
                auth: btoa(String.fromCharCode.apply(null, new Uint8Array(subscription.getKey('auth')!) as unknown as number[])),
            });

            if (error && error.code !== '23505') { // Ignore unique violation
                throw error;
            }

            setIsSubscribed(true);
            toast.success('Notifications enabled!');
        } catch (error: any) {
            console.error('Push subscription error:', error);
            toast.error('Failed to enable notifications: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return { isSubscribed, subscribeToPush, loading };
}

// Utility to convert VAPID key
function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}
