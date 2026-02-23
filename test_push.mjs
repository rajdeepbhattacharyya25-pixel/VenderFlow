import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL") || "https://gqwgvhxcssooxbmwgiwt.supabase.co";
// Need service role key to bypass RLS and insert notification
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
    console.error("Please export SUPABASE_SERVICE_ROLE_KEY environment variable.");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function testPush() {
    console.log("Fetching push subscriptions...");
    const { data: subs, error: subError } = await supabase.from('push_subscriptions').select('*');
    if (subError) {
        console.error("Error fetching subscriptions:", subError);
        return;
    }

    if (!subs || subs.length === 0) {
        console.log("No push subscriptions found in the database. The user has not enabled them yet or they were deleted.");
        return;
    }

    console.log(`Found ${subs.length} subscriptions. Choosing the first one for user: ${subs[0].user_id}`);

    const userId = subs[0].user_id;

    // 1. Insert into notifications table
    console.log("Inserting test notification into 'notifications' table...");
    const { data: notification, error: notifError } = await supabase.from('notifications').insert({
        user_id: userId,
        title: 'Test Notification',
        message: 'This is a test browser notification to verify it works!',
        type: 'info',
        is_read: false,
        link: '/admin'
    }).select().single();

    if (notifError) {
        console.error("Error inserting notification:", notifError);
        return;
    }

    console.log("Notification inserted successfully via database:", notification.id);

    // 2. Also manually trigger the edge function just in case the db webhook isn't setup
    console.log("Triggering 'send-push' edge function directly...");
    try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
            },
            body: JSON.stringify({
                record: notification
            })
        });

        const text = await response.text();
        console.log(`Edge function response: HTTP ${response.status} - ${text}`);
    } catch (e) {
        console.error("Error calling edge function:", e);
    }
}

testPush();
