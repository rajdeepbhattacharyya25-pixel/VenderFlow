// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gqwgvhxcssooxbmwgiwt.supabase.co';
const supabaseKey = '[SECRET]'; // Fresh anon key

const supabase = createClient(supabaseUrl, supabaseKey);

async function testLogging() {
    console.log("🚀 Triggering test email...");
    
    const payload = {
        type: 'ORDER_CONFIRMED',
        recipient_email: '101backupforphoto@gmail.com',
        recipient_name: 'Test Log User',
        seller_id: '4168bc25-058d-420b-aed1-177ea6f5952a', // valid seller uuid from DB
        payload: {
            order_id: 'LOG-TEST-123',
            total: '10.00',
            currency: 'USD',
            store_name: 'Logging Test Store'
        }
    };

    try {
        const { data: funcData, error: funcError } = await supabase.functions.invoke('send-email', {
            body: payload
        });

        if (funcError) {
            console.error("❌ Function error:", funcError);
        } else {
            console.log("✅ Function response:", funcData);
        }
    } catch (err) {
        console.error("❌ Request failed:", err.message);
    }

    console.log("🕵️ Checking database logs...");
    // Wait a moment for the function to complete its background log update
    await new Promise(r => setTimeout(r, 3000));

    try {
        const { data: logs, error: logError } = await supabase
            .from('email_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1);

        if (logError) {
            console.error("❌ Log fetch error:", logError);
        } else {
            if (logs && logs.length > 0) {
                console.log("📝 Latest Log Entry:", JSON.stringify(logs[0], null, 2));
                if (logs[0].status === 'sent') {
                    console.log("🎉 SUCCESS: Email logged correctly!");
                } else {
                    console.log("⚠️ WARNING: Log entry status is:", logs[0].status);
                    if (logs[0].error_message) {
                        console.log("❌ Error message in log:", logs[0].error_message);
                    }
                }
            } else {
                console.log("❌ No logs found in email_logs table.");
            }
        }
    } catch (err) {
        console.error("❌ DB check failed:", err.message);
    }
}

testLogging();
