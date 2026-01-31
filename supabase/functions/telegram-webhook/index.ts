import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID");
const SYSTEM_ADMIN_ID = TELEGRAM_CHAT_ID ? parseInt(TELEGRAM_CHAT_ID) : null;

// Initialize Supabase Client
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
    console.log(`[Webhook] Request received: ${req.method} ${req.url}`);

    if (req.method === "POST") {
        try {
            if (!TELEGRAM_BOT_TOKEN) {
                console.error("[Webhook] Missing TELEGRAM_BOT_TOKEN");
                throw new Error("Missing Bot Token");
            }

            const update = await req.json();
            console.log("[Webhook] Update received:", JSON.stringify(update, null, 2));

            // We only care about messages
            if (!update.message) return new Response("OK", { status: 200 });

            const chatId = update.message.chat.id;
            const text = update.message.text;

            const user = update.message.from;
            const replyTo = update.message.reply_to_message;

            // Security Check: Only allow authorized admin

            // Security Check: Only allow authorized admin
            if (SYSTEM_ADMIN_ID && chatId !== SYSTEM_ADMIN_ID) {
                await sendMessage(chatId, "⛔ Unauthorized access.");
                return new Response("Unauthorized", { status: 200 });
            }

            // 1. Handle Commands
            if (text?.startsWith("/")) {
                // Normalize command: remove user mentions (@botname) and trailing spaces, take first word
                const command = text.trim().split(/\s+/)[0].split('@')[0];
                const args = text.trim().split(/\s+/).slice(1).join(' ');

                if (command === "/start") {
                    let siteUrl = Deno.env.get("SITE_URL") ?? 'https://e-commerce-landing-page-eight-self.vercel.app';

                    // Telegram requires HTTPS. Fallback to production if localhost is detected.
                    if (siteUrl.includes('localhost') || siteUrl.startsWith('http://')) {
                        siteUrl = 'https://e-commerce-landing-page-eight-self.vercel.app';
                    }

                    const webAppUrl = `${siteUrl}/admin`;

                    // 1. Send Inline Button (Immediate Action)
                    const keyboard = {
                        inline_keyboard: [
                            [{ text: "🖥️ Open Admin Panel", web_app: { url: webAppUrl } }]
                        ]
                    };
                    await sendMessage(chatId, "👋 Welcome Admin! \n\nClick the button below to open your dashboard inside Telegram:", 'Markdown', keyboard);

                    // 2. Set Persistent Menu Button (Long-term Convenience)
                    await setMenuButton(chatId, webAppUrl);
                }
                else if (command === "/stats") {
                    await handleStats(chatId);
                }
                else if (command === "/backup") {
                    await handleBackup(chatId);
                }
                else if (command === "/login") {
                    await handleLogin(chatId, args); // Pass args correctly
                }
                else if (command === "/check_admin") {
                    await handleCheckAdmin(chatId, args);
                }
                else if (command === "/list_users") {
                    await handleListUsers(chatId);
                }
                else if (command === "/set_admin") {
                    await handleSetAdmin(chatId, args);
                }
                else if (command === "/set_password") {
                    await handleSetPassword(chatId, args);
                }
                else if (command === "/broadcast" || command === "/msg") {
                    await handleDirectMessage(chatId, args);
                }
                else if (command === "/health" || command === "/storage") {
                    await handleHealth(chatId);
                }
                else if (command === "/help") {
                    const helpText = `
🤖 Admin Bot Commands

/stats - View live system statistics
/backup - Download system backup
/health - Check system health
/storage - View storage usage
/login (email) - Get magic login link
/check_admin (email) - Check admin status
/broadcast (message) - Send notification to all
/help - Show this list

ℹ️ How to Reply:
Simply reply to any "New Message" notification to send a response back.
`;
                    await sendMessage(chatId, helpText, null);
                }
                else {
                    await sendMessage(chatId, `❓ Unknown command: ${command}`);
                }
            }
            // 2. Handle Replies (Support)
            else if (replyTo && replyTo.text) {
                await handleReply(chatId, text, replyTo.text);
            }
            // 3. Handle documents/files (optional extension)
            else if (update.message.document) {
                await sendMessage(chatId, "📂 File received, but I don't know what to do with it yet.");
            }

            return new Response("OK", { status: 200 });

        } catch (err) {
            console.error("[Webhook] UNCAUGHT ERROR:", err);
            return new Response(JSON.stringify({ error: err.message }), { status: 500 });
        }
    }

    return new Response("Method not allowed", { status: 405 });
});

// --- Helper Functions ---

async function sendMessage(chatId: number, text: string, parseMode: string | null = 'Markdown', replyMarkup: any = null) {
    const body: any = {
        chat_id: chatId,
        text,
        disable_web_page_preview: true
    };

    if (parseMode) {
        body.parse_mode = parseMode;
    }

    if (replyMarkup) {
        body.reply_markup = replyMarkup;
    }

    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const errData = await res.json();
        console.error("Telegram API Error:", errData);
    }
}

async function setMenuButton(chatId: number, webAppUrl: string) {
    try {
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setChatMenuButton`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: chatId,
                menu_button: {
                    type: "web_app",
                    text: "Admin Panel",
                    web_app: {
                        url: webAppUrl
                    }
                }
            }),
        });
    } catch (err) {
        console.error("Failed to set menu button:", err);
    }
}

async function handleDirectMessage(chatId: number, commandArgs: string) {
    // Format: /msg email@domain.com Message content here...
    const firstSpaceIndex = commandArgs.indexOf(' ');

    if (firstSpaceIndex === -1) {
        await sendMessage(chatId, "⚠️ Usage: /msg [email] [message]\nExample: /msg seller@store.com Hello there!");
        return;
    }

    const email = commandArgs.substring(0, firstSpaceIndex).trim();
    const messageContent = commandArgs.substring(firstSpaceIndex + 1).trim();

    if (!messageContent) {
        await sendMessage(chatId, "⚠️ Message content is empty.");
        return;
    }

    await sendMessage(chatId, `🔍 searching for seller with email: ${email}...`);

    // 1. Find User by Email (requires Service Role)
    // Note: Supabase Admin API 'listUsers' is not exposed in v2 client easily without auth.admin...
    // simpler approach: we might not be able to search auth.users directly easily.
    // Alternative: Search 'profiles' if we synced email there, or 'sellers' if we synced email there.
    // Let's try searching 'sellers' by contact_person (fuzzy) or just iterate? 
    // Wait, the best way for now given constraints: Check 'profiles' table if it has 'email'.
    // If not, we can't easily map email -> id without an 'RPC' function or using the auth admin api properly.

    // Let's assume we can use supabase.auth.admin.listUsers() if we import it? 
    // No, createClient keys are service role.

    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();

    if (userError) {
        await sendMessage(chatId, "❌ Failed to fetch user list.");
        return;
    }

    const targetUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase());

    if (!targetUser) {
        await sendMessage(chatId, `❌ No user found with email: ${email}`);
        return;
    }

    // 2. Check if they are a seller
    const { data: sellerProfile } = await supabase.from('sellers').select('id, store_name').eq('id', targetUser.id).single();

    if (!sellerProfile) {
        // Just generic message to user?
        // Or strictly sellers only?
        await sendMessage(chatId, "⚠️ User found, but they are not a registered Seller.");
        return;
    }

    // 3. Create Ticket
    const { data: ticket, error: ticketError } = await supabase.from('support_tickets').insert({
        seller_id: sellerProfile.id,
        subject: 'Message from Admin',
        status: 'open'
    }).select().single();

    if (ticketError) {
        await sendMessage(chatId, `❌ Failed to create ticket: ${ticketError.message}`);
        return;
    }

    // 4. Send Message (as Admin)
    // Get Admin ID (reuse logic)
    const { data: adminProfile } = await supabase.from('profiles').select('id').eq('role', 'admin').limit(1).single();
    const adminId = adminProfile?.id || targetUser.id; // Fallback weird but ok

    const { error: msgError } = await supabase.from('support_messages').insert({
        ticket_id: ticket.id,
        sender_id: adminId,
        sender_role: 'admin',
        content: messageContent
    });

    if (msgError) {
        await sendMessage(chatId, `❌ Ticket created but message failed: ${msgError.message}`);
    } else {
        await sendMessage(chatId, `✅ Message sent to **${sellerProfile.store_name}**!\n\nTicket ID: \`${ticket.id}\`\n(You can reply to this message to continue the conversation)`);

        // Mock a notification to ourselves so we can reply?
        // Actually, let's also send a log back to chat with the Ticket ID embedded so the admin can reply later easily?
        // Done above.
    }
}

async function handleStats(chatId: number) {
    // Fetch counts
    const { count: sellerCount } = await supabase.from('sellers').select('*', { count: 'exact', head: true });
    const { count: orderCount } = await supabase.from('orders').select('*', { count: 'exact', head: true });

    // Calculate total revenue (approximate if large DB, but fine for now)
    const { data: orders } = await supabase.from('orders').select('total_amount');
    const totalRevenue = orders?.reduce((sum, order) => sum + (Number(order.total_amount) || 0), 0) || 0;

    const report = `
📊 *System Statistics*

👥 *Sellers*: ${sellerCount || 0}
📦 *Orders*: ${orderCount || 0}
💰 *Total Revenue*: ₹${totalRevenue.toLocaleString()}

_Generated on ${new Date().toLocaleString()}_
    `;
    await sendMessage(chatId, report);
}

async function handleBackup(chatId: number) {
    await sendMessage(chatId, "⏳ Generating backup... please wait.");

    // Fetch all critical data
    const { data: sellers } = await supabase.from('sellers').select('*');
    const { data: products } = await supabase.from('products').select('*');
    const { data: orders } = await supabase.from('orders').select('*');
    const { data: messages } = await supabase.from('support_messages').select('*');

    const backupData = {
        timestamp: new Date().toISOString(),
        sellers,
        products,
        orders,
        messages
    };

    const jsonString = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const formData = new FormData();
    formData.append('chat_id', String(chatId));
    formData.append('document', blob, `backup_${new Date().toISOString().split('T')[0]}.json`);
    formData.append('caption', '✅ System Backup (Sellers, Products, Orders, Messages)');

    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`, {
        method: "POST",
        body: formData
    });

    if (!res.ok) {
        await sendMessage(chatId, "❌ Backup upload failed.");
    }
}

async function handleReply(chatId: number, content: string, originalText: string) {
    // Extract Ticket ID
    // Look for "🎫 Ticket ID: <uuid>"
    const match = originalText.match(/🎫 Ticket ID: ([a-f0-9-]+)/);

    if (!match) {
        await sendMessage(chatId, "⚠️ Could not find Ticket ID in the message you replied to.");
        return;
    }

    const ticketId = match[1];

    // Get Admin User ID (Service Role can insert as anyone, but we should try to be 'Admin')
    // We'll use a fixed ID or look up the admin profile. For now, use the first admin found or a placeholder UUID if strict FK not required for sender_id (it is required).
    // Better: Fetch the Admin Profile ID.
    const { data: adminProfile } = await supabase.from('profiles').select('id').eq('role', 'admin').limit(1).single();

    if (!adminProfile) {
        await sendMessage(chatId, "❌ No Admin profile found in database to map to.");
        return;
    }

    // Insert Message
    const { error } = await supabase.from('support_messages').insert({
        ticket_id: ticketId,
        sender_id: adminProfile.id,
        sender_role: 'admin',
        content: content
    });

    if (error) {
        console.error("Reply Error", error);
        await sendMessage(chatId, `❌ Failed to send reply: ${error.message}`);
    } else {
        await sendMessage(chatId, "✅ Reply sent to seller.");
    }
}

async function handleHealth(chatId: number) {
    await sendMessage(chatId, "🚑 Checking system health & storage...");

    // 1. Get DB Metrics (RPC)
    const { data, error } = await supabase.rpc('get_system_metrics');

    if (error) {
        console.error("Health RPC Error", error);
        await sendMessage(chatId, `❌ Health check failed: ${error.message}`);
        return;
    }

    const { status, database_size, top_tables } = data as any;

    // 2. Get File Storage Metrics (Estimate)
    const { count: productCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });

    const { count: imageCount } = await supabase
        .from('product_media')
        .select('*', { count: 'exact', head: true });

    // Calculation (Same as Admin Dashboard)
    // 5KB per product, 500KB per image
    const estimatedMB = (((productCount || 0) * 5) + ((imageCount || 0) * 500)) / 1024;
    const STORAGE_LIMIT_MB = 8 * 1024; // 8GB
    const percentage = ((estimatedMB / STORAGE_LIMIT_MB) * 100).toFixed(1);

    let tableInfo = "";
    if (Array.isArray(top_tables)) {
        tableInfo = top_tables.map((t: any) => `• ${t.name}: ${t.rows} rows`).join('\n');
    }

    const metrics = `
🚑 *System Health & Storage Report*

✅ Status: ${status}

🗄️ *Database (Text/Data)*
Size: ${database_size}

🖼️ *File Storage (Images/Media)*
Est. Usage: ${estimatedMB.toFixed(2)} MB
Capacity: ${percentage}% of 8GB
• Images: ${imageCount || 0}
• Products: ${productCount || 0}

📊 *Top Tables by Rows:*
${tableInfo}

_Checked at ${new Date().toLocaleTimeString()}_
    `;

    await sendMessage(chatId, metrics);
}

async function handleLogin(chatId: number, commandArgs: string) {
    const emailArg = commandArgs.split(' ')[1];

    await sendMessage(chatId, "🔐 Generating secure login link...");

    let adminEmail = emailArg;

    if (!adminEmail) {
        // If no email provided, try to find the FIRST admin in the system as a fallback
        // This is useful if there's only one admin.
        const { data: adminProfiles, error: profileError } = await supabase
            .from('profiles')
            .select('id')
            .eq('role', 'admin')
            .limit(1);

        if (adminProfiles && adminProfiles.length > 0) {
            const adminId = adminProfiles[0].id;
            const { data: { users } } = await supabase.auth.admin.listUsers();
            const foundUser = users.find(u => u.id === adminId);
            if (foundUser) {
                adminEmail = foundUser.email;
            }
        }
    }

    if (!adminEmail) {
        await sendMessage(chatId, "❌ Could not auto-detect an Admin. \n\nPlease use: `/login [your_email]`");
        return;
    }

    // 2. Generate Link (Base - we will append redirect manually to ensure encoding is correct)
    const { data, error } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: adminEmail
    });

    if (error) {
        console.error("Link Gen Error", error);
        await sendMessage(chatId, `❌ Failed to generate link: ${error.message}`);
        return;
    }

    const baseLink = data?.properties?.action_link;

    if (!baseLink) {
        await sendMessage(chatId, "❌ Link generated but URL is missing.");
        return;
    }

    // Manually construct the redirect - force it to point to auth-callback
    // Manually construct the redirect - force it to point to auth-callback
    const SITE_URL = Deno.env.get("SITE_URL") ?? 'https://e-commerce-landing-page-eight-self.vercel.app';
    const redirectUrl = `${SITE_URL}/auth-callback`;
    let magicLink = baseLink;

    if (magicLink.includes('redirect_to=')) {
        // Replace the default Site URL redirect with our callback URL
        magicLink = magicLink.replace(/redirect_to=[^&]+/, `redirect_to=${encodeURIComponent(redirectUrl)}`);
    } else {
        // Append if not present
        magicLink = `${magicLink}&redirect_to=${encodeURIComponent(redirectUrl)}`;
    }

    // 3. Send Link
    await sendMessage(chatId, `
🔐 *Admin Access Granted*

Click the link below to sign in:

[Login to Dashboard](${magicLink})

[Backup Link (No Redirect)](${baseLink})

⚠️ _This link expires in 60 minutes and can only be used once._
`);
}

async function handleCheckAdmin(chatId: number, commandArgs: string) {
    const email = commandArgs.split(' ')[1];
    if (!email) {
        await sendMessage(chatId, "⚠️ Usage: /check_admin [email]");
        return;
    }

    await sendMessage(chatId, `🔍 Checking admin status for: ${email}...`);

    // 1. Check Auth User
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();

    if (userError) {
        await sendMessage(chatId, `❌ Auth List Error: ${userError.message} `);
        return;
    }

    const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase());

    if (!user) {
        await sendMessage(chatId, "❌ User NOT FOUND in auth.users");
        return;
    }

    let report = `✅ User found in Auth!\nID: \`${user.id}\`\n\n`;

    // 2. Check Profile
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (profileError) {
        report += `❌ Profile Error: ${profileError.message} (Code: ${profileError.code})\n`;
    } else {
        if (!profile) {
            report += `❌ Profile NOT FOUND for this ID.\n`;
        } else {
            report += `✅ Profile Exists!\nRole: **${profile.role}**\nFull Name: ${profile.full_name}\n`;
            if (profile.role !== 'admin') {
                report += `⚠️ WARNING: Role is '${profile.role}', expected 'admin'.\n`;
            }
        }
    }

    await sendMessage(chatId, report);
}

async function handleListUsers(chatId: number) {
    await sendMessage(chatId, "🔍 Fetching all users...");

    const { data: { users }, error } = await supabase.auth.admin.listUsers();

    if (error) {
        await sendMessage(chatId, `❌ Error: ${error.message}`);
        return;
    }

    if (!users || users.length === 0) {
        await sendMessage(chatId, "⚠️ No users found in the system.");
        return;
    }

    let msg = `👥 *Registered Users (${users.length})*\n\n`;
    users.slice(0, 15).forEach(u => {
        msg += `• \`${u.email}\` (Last Sign-in: ${u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString() : 'Never'})\n`;
    });

    if (users.length > 15) {
        msg += `\n...and ${users.length - 15} more.`;
    }

    await sendMessage(chatId, msg);
}

async function handleSetAdmin(chatId: number, commandArgs: string) {
    const email = commandArgs.split(' ')[1];
    if (!email) {
        await sendMessage(chatId, "⚠️ Usage: /set_admin [email]");
        return;
    }

    await sendMessage(chatId, `⚙️ Elevating ${email} to Admin...`);

    // 1. Find Auth User
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
    if (userError) {
        await sendMessage(chatId, `❌ Auht Error: ${userError.message}`);
        return;
    }

    const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    if (!user) {
        await sendMessage(chatId, `❌ User not found in Auth. Please register first.`);
        return;
    }

    // 2. Update Profile
    const { error: updateError } = await supabase
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', user.id);

    if (updateError) {
        console.error("Update Profile Error:", updateError);
        await sendMessage(chatId, "❌ Failed to update profile. Please check system logs.");
        return;
    }

    await sendMessage(chatId, `✅ SUCCESS! \nUser \`${email}\` is now an Admin.\n\nTry /login again.`);
}

async function handleSetPassword(chatId: number, commandArgs: string) {
    const parts = commandArgs.split(' ');
    const email = parts[1];
    const newPassword = parts[2];

    if (!email || !newPassword) {
        await sendMessage(chatId, "⚠️ Usage: /set_password [email] [new_password]");
        return;
    }

    await sendMessage(chatId, `🔐 Setting password for ${email}...`);

    // 1. Find Auth User
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
    if (userError) {
        await sendMessage(chatId, `❌ Auth Error: ${userError.message}`);
        return;
    }

    const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    if (!user) {
        await sendMessage(chatId, `❌ User not found. Please register first.`);
        return;
    }

    // 2. Update Password
    const { error: updateError } = await supabase.auth.admin.updateUserById(
        user.id,
        { password: newPassword }
    );

    if (updateError) {
        console.error("Set Password Error:", updateError);
        await sendMessage(chatId, "❌ Failed to set password. Please check system logs.");
        return;
    }

    await sendMessage(chatId, `✅ SUCCESS! \nPassword set for \`${email}\`.\nYou can now login manually.`);
}
