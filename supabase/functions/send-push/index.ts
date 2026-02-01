
import webpush from 'https://esm.sh/web-push@3.6.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

// Initialize Web Push
const vapidDetails = {
    subject: 'mailto:admin@venderflow.com',
    publicKey: Deno.env.get('VAPID_PUBLIC_KEY')!,
    privateKey: Deno.env.get('VAPID_PRIVATE_KEY')!,
};

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } });
    }

    try {
        const { record } = await req.json();

        if (!record || !record.user_id) {
            return new Response('No record or user_id found', { status: 400 });
        }

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );

        const { data: subscriptions, error } = await supabaseAdmin
            .from('push_subscriptions')
            .select('*')
            .eq('user_id', record.user_id);

        if (error || !subscriptions || subscriptions.length === 0) {
            console.log(`No subscription found for user ${record.user_id}`);
            return new Response('No subscription found', { status: 200 });
        }

        webpush.setVapidDetails(
            vapidDetails.subject,
            vapidDetails.publicKey,
            vapidDetails.privateKey
        );

        const notificationPayload = JSON.stringify({
            title: record.title || 'New Notification',
            message: record.message || 'You have a new update.',
            url: record.link || '/'
        });

        const sendPromises = subscriptions.map((sub) => {
            const pushSubscription = {
                endpoint: sub.endpoint,
                keys: {
                    p256dh: atob(sub.p256dh),
                    auth: atob(sub.auth)
                }
            };

            return webpush.sendNotification(pushSubscription, notificationPayload)
                .catch(async (err) => {
                    if (err.statusCode === 404 || err.statusCode === 410) {
                        console.log('Subscription expired, deleting from DB:', sub.id);
                        await supabaseAdmin.from('push_subscriptions').delete().eq('id', sub.id);
                    } else {
                        console.error('Error sending push:', err);
                    }
                });
        });

        await Promise.all(sendPromises);

        return new Response(JSON.stringify({ success: true, count: subscriptions.length }), {
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('Edge Function Error:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
});
