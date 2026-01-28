
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gqwgvhxcssooxbmwgiwt.supabase.co';
const SUPABASE_ANON_KEY = '[SECRET]';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testOrderFlow() {
    console.log("1. Starting Order Flow Test...");

    // 1. Sign In / Authentication
    const uniqueId = Date.now();
    const email = `test.user.${uniqueId}@gmail.com`;
    const password = 'testpassword123';

    console.log(`2. Attempting Sign Up with ${email}...`);
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: "Test User"
            }
        }
    });

    if (authError) {
        console.error("❌ Sign Up Failed:", authError.message);
        return;
    }

    const user = authData.user;
    if (!user) {
        console.error("❌ No user returned");
        return;
    }
    console.log("✅ User ID:", user.id);

    // 2. Fetch a valid Seller
    console.log("3. Fetching a seller...");
    const { data: sellers, error: sellerError } = await supabase.from('sellers').select('*').limit(1);

    if (sellerError || !sellers || sellers.length === 0) {
        console.error("❌ Failed to fetch sellers:", sellerError?.message || "No sellers found");
        return;
    }

    const seller = sellers[0];
    console.log("✅ Using Seller:", seller.id, seller.store_name);

    // 2.5 Join Store (Membership Check)
    console.log("3.5 Joining Store...");
    const { error: joinError } = await supabase
        .from('store_customers')
        .insert({
            seller_id: seller.id,
            user_id: user.id,
            email: email,
            status: 'active'
        });

    if (joinError) {
        if (joinError.code === '23505') {
            console.log("ℹ️ Already a member (Duplicate Key)");
        } else {
            console.error("❌ Join Store Failed:", joinError.message, joinError.code);
        }
    } else {
        console.log("✅ Joined Store Successfully");
    }

    // 3. Insert Order
    console.log("4. Attempting to Insert Order...");

    const orderPayload = {
        seller_id: seller.id,
        customer_id: user.id,
        total: 1000, // Number
        status: 'pending',
        shipping_address: {
            name: "Test User",
            street: "123 Test St",
            city: "Test City",
            zip: "123456",
            state: "Test State",
            phone: "+1234567890"
        },
        payment_method: 'cod',
        items: [
            {
                product_id: "00000000-0000-0000-0000-000000000000",
                name: "Test Product",
                price: 100,
                quantity: 10,
                size: "M",
                image: "http://example.com/img.jpg"
            }
        ]
    };

    const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert(orderPayload)
        .select()
        .single();

    if (orderError) {
        console.error("❌ Order Insert Failed:", orderError.code, orderError.message);
    } else {
        console.log("✅ Order Insert SUCCESS!");
        console.log("Created Order ID:", orderData.id);
    }
}

testOrderFlow();
