
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

async function debugOrders() {
    console.log('🔍 Inspecting High Value Orders...');

    // Fetch all orders to scan locally (easier than complex SQL filters on JSONB)
    const { data: orders, error } = await supabase
        .from('orders')
        .select('*');

    if (error) {
        console.error(error);
        return;
    }

    // Filter for orders containing "New Product"
    const suspectOrders = orders.filter((o: any) => {
        const items = o.items || [];
        return Array.isArray(items) && items.some((i: any) => i.name?.includes('New Product'));
    });

    console.log(`Found ${suspectOrders.length} orders with 'New Product'.`);

    // Log the first 5 only to avoid spam
    suspectOrders.slice(0, 5).forEach((o: any) => {
        console.log(`\n🆔 Order ID: ${o.id}`);
        console.log(`💰 Total: ${o.total}`);
        console.log(`🚦 Status: ${o.status}`);
        console.log(`📦 Itms:`, JSON.stringify(o.items, null, 2));
    });
}

debugOrders();
