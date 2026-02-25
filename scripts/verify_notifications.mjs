import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials. Use node --env-file=.env.local to run this script.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyNotifications() {
    console.log('🔍 Starting Seller Application Notification Verification...');

    const mockFormData = {
        name: 'Test Applicant ' + Date.now(),
        phone: '+15551234567',
        email: `test_applicant_${Date.now()}@example.com`,
        business_name: 'Test Business ' + Date.now(),
        category: 'fashion',
        city: 'Test City',
        is_selling_online: true,
        monthly_sales_range: '1k-5k',
        instagram: 'https://instagram.com/testbusiness',
        message: 'This is a test application to verify notifications.'
    };

    console.log('\n📝 1. Simulating Form Submission (Database Insert)...');

    // 1. Insert into seller_applications
    const { error: insertError } = await supabase
        .from('seller_applications')
        .insert(mockFormData);

    if (insertError) {
        console.error('❌ Failed to insert mock application:', insertError);
        return;
    }

    console.log('✅ Mock application inserted successfully:', mockFormData.business_name);

    // Wait a brief moment for trigger to process
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('\n🔔 2. Verifying Dashboard Notification (Database Trigger)...');

    // 2. Check notifications table
    const { data: notifications, error: notifError } = await supabase
        .from('notifications')
        .select('*')
        .eq('type', 'seller')
        .like('message', `%${mockFormData.business_name}%`)
        .order('created_at', { ascending: false })
        .limit(1);

    if (notifError) {
        console.error('❌ Failed to fetch notifications:', notifError);
    } else if (notifications && notifications.length > 0) {
        console.log('✅ Dashboard notification created successfully!');
        console.log('   Title:', notifications[0].title);
        console.log('   Message:', notifications[0].message);
    } else {
        console.log('❌ Dashboard notification was NOT found. The database trigger might have failed.');
    }

    console.log('\n📱 3. Verifying Telegram Notification (Edge Function)...');

    // 3. Invoke Edge Function
    const { data: edgeData, error: edgeError } = await supabase.functions.invoke('notify-admin', {
        body: {
            type: 'NEW_SELLER_APPLICATION',
            message: `New application: ${mockFormData.business_name}`,
            data: mockFormData
        }
    });

    if (edgeError) {
        console.error('❌ Edge Function failed:', edgeError);
    } else {
        console.log('✅ Edge Function invoked successfully!');
        console.log('   Response:', edgeData);
    }

    console.log('\n🎉 Verification Complete!');
}

verifyNotifications();
