
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

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyTopProducts() {
    console.log('🔍 Verifying Top Products Calculation...');

    // 1. Fetch Orders
    const { data: orders, error } = await supabase
        .from('orders')
        .select('*');

    if (error) {
        console.error('Error fetching orders:', error);
        return;
    }

    console.log(`📦 Analyzed ${orders.length} total orders.`);

    // 2. Aggregate Data (Mirroring Dashboard Logic)
    const productStats: Record<string, { id: string, name: string, quantity: number, revenue: number }> = {};

    orders.forEach((order: any) => {
        if (order.status === 'cancelled') return; // Exclude cancelled

        const items = order.items || [];
        if (Array.isArray(items)) {
            items.forEach((item: any) => {
                if (!item.product_id) return;

                if (!productStats[item.product_id]) {
                    productStats[item.product_id] = {
                        id: item.product_id,
                        name: item.name || 'Unknown Product',
                        quantity: 0,
                        revenue: 0
                    };
                }

                const qty = item.quantity || 1;
                const price = item.price || 0;

                productStats[item.product_id].quantity += qty;
                productStats[item.product_id].revenue += price * qty;
            });
        }
    });

    // 3. Sort and Top 5
    const topProducts = Object.values(productStats)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);

    // 4. Output Results
    console.log('\n🏆 EXPECTED DASHBOARD OUTPUT (Top 5 by Volume):');
    console.log('---------------------------------------------------------------------------------');
    console.log(pad('Product Name', 30) + pad('Orders (Qty)', 15) + pad('Revenue (Amount)', 20));
    console.log('---------------------------------------------------------------------------------');

    topProducts.forEach(p => {
        console.log(
            pad(p.name.substring(0, 28), 30) +
            pad(p.quantity.toString(), 15) +
            pad('₹' + p.revenue.toLocaleString(), 20)
        );
    });
    console.log('---------------------------------------------------------------------------------');
}

function pad(str: string, length: number) {
    return str.padEnd(length, ' ');
}

verifyTopProducts();
