
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gqwgvhxcssooxbmwgiwt.supabase.co';
const supabaseKey = '[SECRET]';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verify() {
    console.log("Verifying Products Schema...");

    try {
        // Fetch one product
        const { data: products, error } = await supabase
            .from('products')
            .select('id')
            .limit(1);

        if (error) {
            console.error("Error fetching products:", error.message);
        } else if (products && products.length > 0) {
            const id = products[0].id;
            console.log(`Sample Product ID: ${id}`);
            console.log(`Type of ID: ${typeof id}`);

            // Check if it looks like UUID
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
            console.log(`Is UUID format: ${isUuid}`);
        } else {
            console.log("No products found.");
        }

    } catch (e) { console.error(e); }
}

verify();
