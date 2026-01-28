
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load env vars manually
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars: Record<string, string> = {};

envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        envVars[key.trim()] = value.trim();
    }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectItems() {
    console.log('🔍 Fetching latest 10 orders to inspect items structure...');

    const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error(error);
        return;
    }

    orders.forEach((o: any) => {
        console.log(`\n==================================================`);
        console.log(`🆔 Order: ${o.id} | Status: ${o.status}`);
        const items = o.items;
        if (Array.isArray(items)) {
            items.forEach((item, idx) => {
                console.log(`   🔸 Item ${idx + 1}:`, JSON.stringify(item));
            });
        } else {
            console.log('   ⚠️ Items is not an array:', items);
        }
    });
}

inspectItems();
