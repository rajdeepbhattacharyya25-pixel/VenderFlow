import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
    'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? 'https://vendorflow.vercel.app',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    // 1. Get Params
    const url = new URL(req.url);
    const configId = url.searchParams.get('config_id');
    const secretToken = req.headers.get('x-telegram-bot-api-secret-token');

    if (!configId) {
        return new Response("Missing config_id", { status: 400 });
    }

    // 2. Initialize Admin Client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 3. Fetch Config
    const { data: config, error } = await supabase
        .from('seller_telegram_configs')
        .select('*')
        .eq('id', configId)
        .single();

    if (error || !config) {
        return new Response("Config not found", { status: 404 });
    }

    if (config.webhook_secret !== secretToken) {
        return new Response("Unauthorized", { status: 401 });
    }

    try {
        const update = await req.json();

        // 4. Handle Content
        if (update.message) {
            await handleMessage(update.message, config, supabase);
        } else if (update.callback_query) {
            await handleCallbackQuery(update.callback_query, config, supabase);
        }

        return new Response("OK", { status: 200 });

    } catch (err) {
        console.error("Webhook Error:", err);
        return new Response("Error", { status: 500 });
    }
});

async function handleMessage(message: any, config: any, supabase: any) {
    const chatId = message.chat.id;
    const text = message.text || '';

    if (text.startsWith('/')) {
        const command = text.split(' ')[0].toLowerCase();

        switch (command) {
            case '/start':
                await handleStart(message, config, supabase);
                break;
            case '/help':
                await handleHelp(chatId, config.bot_token);
                break;
            case '/login':
                await handleLogin(chatId, config, supabase);
                break;
            case '/orders':
                await handleOrders(chatId, config, supabase);
                break;
            case '/stats':
                await handleStats(chatId, config, supabase, 'today');
                break;
            case '/weekly':
                await handleStats(chatId, config, supabase, 'weekly');
                break;
            case '/top':
                await handleTopProducts(chatId, config, supabase);
                break;
            case '/lowstock':
                await handleLowStock(chatId, config, supabase);
                break;
            case '/support':
                await handleSupport(chatId, text, config, supabase);
                break;
            case '/alerts':
                await handleAlerts(chatId, config, supabase);
                break;
            default:
                if (message.chat.type === 'private') {
                    await sendMessage(config.bot_token, chatId, "❌ Unknown command. Try /help.");
                }
        }
    }
}

async function handleCallbackQuery(callback: any, config: any, supabase: any) {
    const chatId = callback.message.chat.id;
    const data = callback.data;
    const [action, ...args] = data.split(':');

    try {
        if (action === 'confirm_order') {
            const orderId = args[0];
            const { error } = await supabase.from('orders').update({ status: 'confirmed' }).eq('id', orderId).eq('seller_id', config.seller_id);
            if (error) throw error;
            await answerCallbackQuery(config.bot_token, callback.id, "✅ Order Confirmed!");
            await sendMessage(config.bot_token, chatId, `✅ Order <b>#${orderId.slice(0, 8)}</b> has been confirmed.`);
        } 
        else if (action === 'ship_order') {
            const orderId = args[0];
            const { error } = await supabase.from('orders').update({ status: 'shipped' }).eq('id', orderId).eq('seller_id', config.seller_id);
            if (error) throw error;
            await answerCallbackQuery(config.bot_token, callback.id, "📦 Marked as Shipped!");
            await sendMessage(config.bot_token, chatId, `📦 Order <b>#${orderId.slice(0, 8)}</b> is now marked as shipped.`);
        }
        else if (action === 'cancel_order') {
            const orderId = args[0];
            const { error } = await supabase.from('orders').update({ status: 'cancelled' }).eq('id', orderId).eq('seller_id', config.seller_id);
            if (error) throw error;
            await answerCallbackQuery(config.bot_token, callback.id, "❌ Order Cancelled");
            await sendMessage(config.bot_token, chatId, `❌ Order <b>#${orderId.slice(0, 8)}</b> has been cancelled.`);
        }
        else if (action === 'add_stock') {
            const productId = args[0];
            const amount = parseInt(args[1]);
            
            const { error } = await supabase.rpc('increment_product_stock', { 
                p_id: productId, 
                p_amount: amount 
            });

            if (error) throw error;
            
            await answerCallbackQuery(config.bot_token, callback.id, `➕ Added ${amount}!`);
            
            // Fetch new stock for confirmation message
            const { data: stock } = await supabase
                .from('product_stock')
                .select('stock_quantity')
                .eq('product_id', productId)
                .single();

            await sendMessage(config.bot_token, chatId, `✅ Stock updated. New quantity: <b>${stock?.stock_quantity || 'Unknown'}</b>`);
        }
        else if (action === 'toggle_pref') {
            const key = args[0];
            const currentPrefs = config.preferences || {};
            const newValue = !currentPrefs[key];
            const newPrefs = { ...currentPrefs, [key]: newValue };
            
            const { error } = await supabase.from('seller_telegram_configs').update({ preferences: newPrefs }).eq('id', config.id);
            if (error) throw error;
            
            await answerCallbackQuery(config.bot_token, callback.id, "🔄 Preference Updated!");
            await handleAlerts(chatId, { ...config, preferences: newPrefs }, supabase, callback.message.message_id);
        }
    } catch (err) {
        console.error("Callback Error:", err);
        await answerCallbackQuery(config.bot_token, callback.id, "⚠️ Operation failed.");
    }
}

async function handleAlerts(chatId: number, config: any, supabase: any, editMessageId?: number) {
    const prefs = config.preferences || { orders: true, stock: true, customers: true, daily_summary: true, critical_only: false };
    
    const getLabel = (val: boolean) => val ? "🔔 ON" : "🔕 OFF";
    
    const keyboard = {
        inline_keyboard: [
            [
                { text: `Orders: ${getLabel(prefs.orders)}`, callback_data: 'toggle_pref:orders' },
                { text: `Stock: ${getLabel(prefs.stock)}`, callback_data: 'toggle_pref:stock' }
            ],
            [
                { text: `Customers: ${getLabel(prefs.customers)}`, callback_data: 'toggle_pref:customers' },
                { text: `Daily Summary: ${getLabel(prefs.daily_summary)}`, callback_data: 'toggle_pref:daily_summary' }
            ],
            [
                { text: `Mode: ${prefs.critical_only ? "⚠️ Critical Only" : "📢 All Alerts"}`, callback_data: 'toggle_pref:critical_only' }
            ]
        ]
    };

    const text = "⚙️ <b>Notification Settings</b>\nManage what alerts you receive and how often.";

    if (editMessageId) {
        await editMessage(config.bot_token, chatId, editMessageId, text, keyboard);
    } else {
        await sendMessage(config.bot_token, chatId, text, keyboard);
    }
}

async function answerCallbackQuery(token: string, callbackId: string, text: string) {
    await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: callbackId, text: text })
    });
}

async function editMessage(token: string, chatId: number, messageId: number, text: string, replyMarkup: any) {
    await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            message_id: messageId,
            text: text,
            parse_mode: 'HTML',
            reply_markup: replyMarkup
        })
    });
}

// --- Handlers ---

async function handleStart(message: any, config: any, supabase: any) {
    const chatId = message.chat.id;
    const text = message.text;

    const parts = text.split(' ');

    // Determine the Storefront URL to show in the bot
    const siteUrl = Deno.env.get("PUBLIC_APP_URL") ?? Deno.env.get("SITE_URL") ?? "https://vendorflow.vercel.app";
    const dashboardUrl = `${siteUrl}/dashboard`;

    // We provide the web app option in the welcome message anyway, it's very convenient
    const keyboard = {
        inline_keyboard: [
            [{ text: "🖥️ Open Seller Dashboard", web_app: { url: dashboardUrl } }],
            [{ text: "⚙️ Manage Alerts", callback_data: "show_alerts" }],
            [{ text: "🌐 Open in Browser", url: dashboardUrl }]
        ]
    };

    if (parts.length > 1 && parts[1] === config.id) {
        await supabase
            .from('seller_telegram_configs')
            .update({ chat_id: chatId })
            .eq('id', config.id);

        await sendMessage(config.bot_token, chatId, `✅ <b>Connected Successfully!</b>\n\nYour store <b>${config.bot_username || 'Bot'}</b> is now linked.\nTry /help to see what I can do or open your dashboard below:`, keyboard);
    } else {
        await sendMessage(config.bot_token, chatId, "👋 Welcome to VendorFlow Seller Bot!\n\nPlease use the 'Connect' button in your Seller Dashboard to link this chat, or open the dashboard below to manage your store.", keyboard);
    }
}

async function handleHelp(chatId: number, token: string) {
    const msg = `
🤖 <b>VendorFlow Seller Command Center</b>

Use these commands to manage your store directly from Telegram:

📊 <b>Monitoring</b>
<b>/stats</b> - View today's sales and order count
<b>/weekly</b> - Weekly performance summary (Revenue & Orders)
<b>/top</b> - Your top 5 selling products
<b>/lowstock</b> - List all products with &lt;10 units remaining

📦 <b>Orders & Inventory</b>
<b>/orders</b> - List your 5 most recent orders
<b>/login</b> - Get a secure magic link for dashboard access
<b>1-Click Actions</b>: When you receive a new order or low stock alert, use the buttons below the message to <b>Confirm</b>, <b>Ship</b>, or <b>Restock</b> instantly.

⚙️ <b>Settings</b>
<b>/alerts</b> - Open the notification preferences menu. Toggle alerts for orders, stock, and daily summaries.
<b>/support [msg]</b> - Send a message to our support team

<i>Need more? Open your full dashboard via the button in /start.</i>
`;
    await sendMessage(token, chatId, msg);
}

async function handleOrders(chatId: number, config: any, supabase: any) {
    const { data: orders, error } = await supabase
        .from('orders')
        .select('id, total, status, created_at, shipping_address')
        .eq('seller_id', config.seller_id)
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error("Orders Error:", error);
        await sendMessage(config.bot_token, chatId, "⚠️ Failed to fetch orders.");
        return;
    }

    if (!orders || orders.length === 0) {
        await sendMessage(config.bot_token, chatId, "📦 No orders found yet.");
        return;
    }

    let msg = "📦 <b>Recent Orders</b>\n\n";
    orders.forEach((o: any) => {
        const date = new Date(o.created_at).toLocaleDateString();
        const statusEmoji = o.status === 'confirmed' ? '✅' : o.status === 'pending' ? '⏳' : o.status === 'shipped' ? '📦' : '🏁';

        let name = 'Customer';
        if (o.shipping_address) {
            const sa = typeof o.shipping_address === 'string' ? JSON.parse(o.shipping_address) : o.shipping_address;
            name = sa.fullName || sa.name || 'Customer';
        }
        name = name.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

        msg += `${statusEmoji} <b>₹${o.total}</b> - ${name}\n<i>${date}</i> (#${o.id.slice(0, 8)})\n\n`;
    });

    await sendMessage(config.bot_token, chatId, msg);
}

async function handleStats(chatId: number, config: any, supabase: any, range: 'today' | 'weekly') {
    const now = new Date();
    let startDate;

    if (range === 'today') {
        startDate = new Date(now.setHours(0, 0, 0, 0)).toISOString();
    } else {
        const day = now.getDay();
        const diff = now.getDate() - day + (day == 0 ? -6 : 1);
        startDate = new Date(now.setDate(diff)).toISOString();
    }

    const { data: orders, error } = await supabase
        .from('orders')
        .select('total')
        .eq('seller_id', config.seller_id)
        .gte('created_at', startDate);

    if (error) {
        await sendMessage(config.bot_token, chatId, "⚠️ Failed to fetch stats.");
        return;
    }

    const count = orders.length;
    const revenue = orders.reduce((sum: number, o: any) => sum + (Number(o.total) || 0), 0);

    const title = range === 'today' ? "Today's Stats" : "Weekly Stats";
    await sendMessage(config.bot_token, chatId, `📊 <b>${title}</b>\n\n💰 Revenue: <b>$${revenue.toFixed(2)}</b>\n📦 Orders: <b>${count}</b>`);
}

async function handleTopProducts(chatId: number, config: any, supabase: any) {
    const { data: products, error } = await supabase
        .from('products')
        .select('name, price, is_active')
        .eq('seller_id', config.seller_id)
        .limit(5);

    if (error || !products) {
        await sendMessage(config.bot_token, chatId, "⚠️ Could not fetch products.");
        return;
    }

    let msg = "🏆 <b>Your Products (Snapshot)</b>\n\n";
    products.forEach((p: any) => {
        const safeName = p.name.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        msg += `🔹 <b>${safeName}</b> - $${p.price}\n`;
    });

    await sendMessage(config.bot_token, chatId, msg);
}

async function handleLowStock(chatId: number, config: any, supabase: any) {
    const { data: lowStockItems, error: lsError } = await supabase
        .from('products')
        .select('name, product_stock!inner(stock_quantity)')
        .eq('seller_id', config.seller_id)
        .lt('product_stock.stock_quantity', 10)
        .limit(10);

    if (lsError) {
        console.error(lsError);
        await sendMessage(config.bot_token, chatId, "⚠️ Error checking stock.");
        return;
    }

    if (!lowStockItems || lowStockItems.length === 0) {
        await sendMessage(config.bot_token, chatId, "✅ Inventory looks good! No low stock items.");
        return;
    }

    let msg = "⚠️ <b>Low Stock Alert (&lt;10)</b>\n\n";
    lowStockItems.forEach((p: any) => {
        const qty = Array.isArray(p.product_stock) ? p.product_stock[0]?.stock_quantity : p.product_stock?.stock_quantity;
        const safeName = p.name.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        msg += `📦 <b>${safeName}</b>: ${qty} remaining\n`;
    });

    await sendMessage(config.bot_token, chatId, msg);
}

async function handleSupport(chatId: number, text: string, config: any, supabase: any) {
    const parts = text.split(' ');
    parts.shift();
    const ticketMessage = parts.join(' ');

    if (!ticketMessage) {
        await sendMessage(config.bot_token, chatId, "📝 <b>Usage:</b> <code>/support I cannot print my labels</code>");
        return;
    }

    const { error } = await supabase
        .from('support_tickets')
        .insert({
            seller_id: config.seller_id,
            subject: `[Telegram] ${ticketMessage.substring(0, 200)}`,
            status: 'open',
        });

    if (error) {
        console.error(error);
        await sendMessage(config.bot_token, chatId, "⚠️ Failed to create ticket.");
    } else {
        await sendMessage(config.bot_token, chatId, "✅ Support ticket created! We will contact you shortly.");

        // Notify Admin via the separate Edge Function
        try {
            const { data: userData } = await supabase.auth.admin.getUserById(config.seller_id);
            const userEmail = userData?.user?.email || 'Unknown Seller';

            const NOTIFY_URL = "https://gqwgvhxcssooxbmwgiwt.supabase.co/functions/v1/notify-admin";
            console.log("[NotifyAdmin] Calling:", NOTIFY_URL);

            const response = await fetch(NOTIFY_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    type: "NEW_MESSAGE",
                    message: ticketMessage,
                    data: {
                        email: userEmail,
                        subject: `[Telegram] New Ticket from ${config.bot_username || userEmail}`,
                        ticket_id: "New"
                    }
                })
            });

            const responseText = await response.text();
            console.log("[NotifyAdmin] Response Status:", response.status);
            console.log("[NotifyAdmin] Response Body:", responseText);

        } catch (notifyError) {
            console.error("Failed to notify admin:", notifyError);
        }
    }
}

async function handleLogin(chatId: number, config: any, supabase: any) {
    if (!config.seller_id) return;

    // 1. Get Site URL from Env
    const siteUrl = Deno.env.get("SITE_URL");
    console.log("[Login] Using SITE_URL:", siteUrl); // Debug Log

    if (!siteUrl) {
        await sendMessage(config.bot_token, chatId, "❌ System Error: `SITE_URL` is not set in backend.");
        return;
    }

    const { data: user } = await supabase.auth.admin.getUserById(config.seller_id);
    if (user && user.user) {
        const { data: linkData } = await supabase.auth.admin.generateLink({
            type: 'magiclink',
            email: user.user.email,
            options: {
                redirectTo: `${siteUrl.replace(/\/$/, '')}/dashboard` // Ensure no double slash
            }
        });
        const link = linkData?.properties?.action_link;

        if (link) {
            await sendMessage(config.bot_token, chatId, `🔐 <b>Dashboard Access</b>\n\n<a href="${link}">Click here to login</a>\n\n<i>Note: This link expires in 1 hour.</i>`);
        } else {
            await sendMessage(config.bot_token, chatId, "❌ Failed to generate link.");
        }
    } else {
        await sendMessage(config.bot_token, chatId, "❌ User not found.");
    }
}

async function sendMessage(token: string, chatId: number, text: string, replyMarkup: any = null) {
    try {
        const body: any = {
            chat_id: chatId,
            text: text,
            parse_mode: 'HTML', // Use HTML for robustness
            disable_web_page_preview: true
        };

        if (replyMarkup) {
            body.reply_markup = replyMarkup;
        }

        const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            const data = await res.json();
            console.error("Telegram API Error:", data);

            // Fallback: If parse error, send plain text
            if (data.error_code === 400 && (data.description.includes('parse') || data.description.includes('entities'))) {
                body.text = "⚠️ Format Error: " + text.replace(/<[^>]*>/g, ""); // Strip tags and send plain
                delete body.parse_mode;
                await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
            }
        }
    } catch (err) {
        console.error("Fetch Error:", err);
    }
}
