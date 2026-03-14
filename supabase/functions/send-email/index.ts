import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7"

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

interface EmailPayload {
    type: 
        | 'ORDER_CONFIRMED' 
        | 'PAYMENT_FAILED' 
        | 'STATUS_UPDATE' 
        | 'REFUND_INITIATED' 
        | 'PACKED' 
        | 'OUT_FOR_DELIVERY' 
        | 'ABANDONED_CART' 
        | 'REVIEW_REQUEST' 
        | 'REORDER_REMINDER'
        | 'EMAIL_VERIFICATION'
        | 'PASSWORD_RESET'
        | 'NEW_LOGIN_ALERT'
        | 'SELLER_KYC_SUBMITTED'
        | 'SELLER_KYC_APPROVED'
        | 'SELLER_KYC_REJECTED'
        | 'ORDER_SHIPPED'
        | 'ORDER_DELIVERED'
        | 'ORDER_CANCELLED'
        | 'DISPUTE_OPENED'
        | 'DISPUTE_RESOLVED'
        | 'SELLER_PAYOUT_SENT'
        | 'PAYOUT_ON_HOLD'
        | 'PROMOTION_AVAILABLE';
    payload: any;
    recipient_email: string;
    recipient_name?: string;
    seller_id?: string; // Optional but recommended for logging
}

const corsHeaders = {
    'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? 'https://vendorflow.vercel.app',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    // Initialize Supabase Client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Manual Auth Check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
        return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    const isServiceRole = authHeader.includes(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '___');
    
    let logId = "";

    try {
        const { type, payload, recipient_email, recipient_name, seller_id } = await req.json() as EmailPayload;
        const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY');

        if (!BREVO_API_KEY) {
            throw new Error("Missing BREVO_API_KEY environment variable");
        }

        const logoHtml = payload.logo_url
            ? `<div style="text-align: center; margin-bottom: 20px;"><img src="${payload.logo_url}" alt="${payload.store_name}" style="max-height: 50px;" /></div>`
            : '';
        const storeName = payload.store_name || 'VendorFlow';
        const customerName = recipient_name || payload.customer_name || 'Customer';

        let subject = "";
        let htmlContent = "";

        const createEmailTemplate = (title: string, content: string, cta?: { text: string, link: string }) => `
            <div style="font-family: 'Inter', system-ui, sans-serif; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
                ${logoHtml}
                <div style="text-align: center;">
                    <h2 style="color: #000; margin-bottom: 16px;">${title}</h2>
                </div>
                <div style="line-height: 1.6; color: #4b5563;">
                    <p>Hi <strong>${customerName}</strong>,</p>
                    ${content}
                </div>
                ${cta ? `
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${cta.link}" style="display:inline-block; background: #000; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600;">${cta.text}</a>
                </div>
                ` : ''}
                <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #f3f4f6; font-size: 14px; text-align: center; color: #9ca3af;">
                    <p>Sent by <strong>${storeName}</strong> via VendorFlow</p>
                    <p>Support: ${payload.support_email || 'support@vendorflow.com'}</p>
                    <p><a href="#" style="color: #9ca3af; text-decoration: underline;">Unsubscribe</a></p>
                </div>
            </div>
        `;

        // --- TEMPLATE LOGIC ---
        switch (type) {
            case 'ORDER_CONFIRMED':
                subject = `Your Order #${payload.order_id} Has Been Confirmed 🎉`;
                htmlContent = createEmailTemplate(
                    "Order Confirmed!",
                    `
                    <p>Thank you for your order! We're happy to confirm that your purchase has been successfully placed.</p>
                    <div style="background: #f9fafb; padding: 16px; border-radius: 6px; margin: 16px 0;">
                        <strong>Order Details:</strong><br>
                        Order ID: #${payload.order_id}<br>
                        Total Amount: ${payload.currency || '$'} ${payload.order_total || payload.total}
                    </div>
                    <p>Our team is now preparing your order. You’ll receive another update as soon as it is packed and ready for shipment.</p>
                    <p>If you have any questions, feel free to reply to this email.</p>
                    `
                );
                break;

            case 'PAYMENT_FAILED':
                subject = `Payment Failed for Order #${payload.order_id} — Please Retry`;
                htmlContent = createEmailTemplate(
                    "Payment Failed",
                    `
                    <p>Unfortunately, we were unable to process the payment for your order <strong>#${payload.order_id}</strong>.</p>
                    <p><strong>Reason:</strong> ${payload.reason || 'Transaction declined'}</p>
                    <p>Your order has not been completed yet. You can try again using a different payment method or retry the payment from your order page.</p>
                    `,
                    { text: "Complete Your Order", link: payload.retry_link || payload.payment_url || '#' }
                );
                break;

            case 'ORDER_PACKED':
                subject = `Good News! Your Order #${payload.order_id} Has Been Packed 📦`;
                htmlContent = createEmailTemplate(
                    "Your Order is Packed!",
                    `
                    <p>Great news! Your order <strong>#${payload.order_id}</strong> has been packed and is ready to be shipped.</p>
                    <p>Our delivery partner will soon collect the package and begin the shipping process. You will receive tracking details once the shipment is dispatched.</p>
                    <p>Thank you for choosing ${storeName}.</p>
                    `
                );
                break;

            case 'ORDER_SHIPPED':
                subject = `Your Order #${payload.order_id} Has Been Shipped`;
                htmlContent = createEmailTemplate(
                    "Your Order is on the Way!",
                    `
                    <p>Great news! Your order <strong>#${payload.order_id}</strong> has been shipped and is on its way.</p>
                    <div style="background: #f9fafb; padding: 16px; border-radius: 6px; margin: 16px 0;">
                        <strong>Shipment Details:</strong><br>
                        Courier: ${payload.courier_name || 'Our delivery partner'}<br>
                        Tracking Number: ${payload.tracking_id || payload.tracking_number || 'Available soon'}
                    </div>
                    `,
                    { text: "Track Order", link: payload.tracking_link || '#' }
                );
                break;

            case 'OUT_FOR_DELIVERY':
                subject = `Your Order #${payload.order_id} Is Out for Delivery 🚚`;
                htmlContent = createEmailTemplate(
                    "Out for Delivery Today",
                    `
                    <p>Your order <strong>#${payload.order_id}</strong> is out for delivery today.</p>
                    <p>Our delivery partner will attempt to deliver the package shortly. Please keep your phone available in case the courier needs to contact you.</p>
                    <p>We hope you enjoy your purchase!</p>
                    `
                );
                break;

            case 'ORDER_DELIVERED':
                subject = `Order #${payload.order_id} Delivered Successfully`;
                htmlContent = createEmailTemplate(
                    "Order Delivered!",
                    `
                    <p>Great news! Your order <strong>#${payload.order_id}</strong> has been successfully delivered.</p>
                    <p>We hope you enjoy your purchase! If you have a moment, we'd love to hear your feedback.</p>
                    `,
                    { text: "Leave a Review", link: payload.review_link || '#' }
                );
                break;

            case 'ORDER_CANCELLED':
                subject = `Your Order #${payload.order_id} Has Been Cancelled`;
                htmlContent = createEmailTemplate(
                    "Order Cancelled",
                    `
                    <p>Your order <strong>#${payload.order_id}</strong> has been cancelled.</p>
                    <p>If the payment was already processed, the refund will be initiated shortly. If you did not request this cancellation, please contact our support team.</p>
                    `
                );
                break;

            case 'STATUS_UPDATE':
                subject = `Order Update: #${payload.order_id} — ${payload.status}`;
                htmlContent = createEmailTemplate(
                    "Order Update",
                    `
                    <p>Here is an update on your order <strong>#${payload.order_id}</strong>.</p>
                    <p><strong>Current Status:</strong> ${payload.status}</p>
                    ${payload.tracking_info ? `<p><strong>Tracking Details:</strong> ${payload.tracking_info}</p>` : ''}
                    `,
                    { text: "Track Order", link: payload.tracking_link || '#' }
                );
                break;

            case 'REFUND_INITIATED':
                subject = `Refund Initiated for Order #${payload.order_id}`;
                htmlContent = createEmailTemplate(
                    "Refund Initiated",
                    `
                    <p>Your refund request for order <strong>#${payload.order_id}</strong> has been successfully processed.</p>
                    <p><strong>Refund Amount:</strong> ${payload.currency || '$'} ${payload.amount}</p>
                    <p>The amount will be credited back to your original payment method within 5–7 business days depending on your bank or payment provider.</p>
                    `
                );
                break;

            case 'ABANDONED_CART':
                subject = `Your Cart Is Waiting for You 🛒`;
                htmlContent = createEmailTemplate(
                    "Your Cart Is Waiting",
                    `
                    <p>You recently added some items to your cart but didn’t complete the checkout.</p>
                    <p>Your selected items are still available, but they may sell out soon. Continue your purchase below before they're gone.</p>
                    `,
                    { text: "Return to Cart", link: payload.recovery_link || payload.cart_url || '#' }
                );
                break;

            case 'REVIEW_REQUEST':
                subject = `How Was Your Order? Share Your Experience ⭐`;
                htmlContent = createEmailTemplate(
                    "Share Your Feedback",
                    `
                    <p>We hope you're enjoying your recent purchase from us!</p>
                    <p>Your feedback helps other customers make better decisions and helps sellers improve their products. Please take a moment to share your experience.</p>
                    `,
                    { text: "Write a Review", link: payload.review_link || '#' }
                );
                break;

            case 'REORDER_REMINDER':
                subject = `Need It Again? Reorder in One Click 🔄`;
                htmlContent = createEmailTemplate(
                    "Ready to Restock?",
                    `
                    <p>It looks like it's been a while since your last purchase (Order #${payload.order_id}).</p>
                    <p>If you're running low, you can quickly reorder the same items with just one click.</p>
                    `,
                    { text: "Reorder Now", link: payload.reorder_link || '#' }
                );
                break;

            case 'EMAIL_VERIFICATION':
                subject = `Verify Your Email Address`;
                htmlContent = createEmailTemplate(
                    "Welcome to VendorFlow!",
                    `
                    <p>Please verify your email address to activate your account and start your journey with us.</p>
                    `,
                    { text: "Verify Email", link: payload.verification_link || '#' }
                );
                break;

            case 'PASSWORD_RESET':
                subject = `Reset Your VendorFlow Password`;
                htmlContent = createEmailTemplate(
                    "Password Reset Request",
                    `
                    <p>We received a request to reset your password. You can create a new password using the link below:</p>
                    `,
                    { text: "Reset Password", link: payload.reset_link || '#' }
                );
                break;

            case 'NEW_LOGIN_ALERT':
                subject = `New Login Detected`;
                htmlContent = createEmailTemplate(
                    "Security Alert: New Login",
                    `
                    <p>We detected a new login to your VendorFlow account.</p>
                    <div style="background: #fff5f5; padding: 16px; border-radius: 6px; margin: 16px 0; border: 1px solid #feb2b2;">
                        <strong>Device:</strong> ${payload.device || 'Unknown Device'}<br>
                        <strong>Location:</strong> ${payload.location || 'Unknown Location'}<br>
                        <strong>Time:</strong> ${payload.time || new Date().toLocaleString()}
                    </div>
                    <p>If this was you, no action is required. If you do not recognize this activity, please reset your password immediately.</p>
                    `,
                    { text: "Reset Password", link: payload.reset_link || '#' }
                );
                break;

            case 'SELLER_KYC_SUBMITTED':
                subject = `Your Seller Verification Is Under Review`;
                htmlContent = createEmailTemplate(
                    "Verification in Progress",
                    `
                    <p>Thank you for submitting your seller verification documents.</p>
                    <p>Our team is currently reviewing your KYC details. This process usually takes 24–48 hours. You will receive another email once your account is approved.</p>
                    `
                );
                break;

            case 'SELLER_KYC_APPROVED':
                subject = `Your Seller Account Has Been Approved 🎉`;
                htmlContent = createEmailTemplate(
                    "You're Verified!",
                    `
                    <p>Great news! Your seller verification has been approved. You can now start listing products and receiving orders on VendorFlow.</p>
                    `,
                    { text: "Go to Dashboard", link: payload.dashboard_link || '#' }
                );
                break;

            case 'SELLER_KYC_REJECTED':
                subject = `Seller Verification Update`;
                htmlContent = createEmailTemplate(
                    "Verification Update",
                    `
                    <p>Unfortunately, we could not approve your seller verification at this time.</p>
                    <p><strong>Reason:</strong> ${payload.reason || 'Missing or invalid documents'}</p>
                    <p>You can resubmit your documents from your seller dashboard.</p>
                    `,
                    { text: "Resubmit Documents", link: payload.kyc_link || '#' }
                );
                break;

            case 'DISPUTE_OPENED':
                subject = `A Dispute Has Been Opened for Order #${payload.order_id}`;
                htmlContent = createEmailTemplate(
                    "Dispute Opened",
                    `
                    <p>A dispute has been opened regarding order <strong>#${payload.order_id}</strong>.</p>
                    <p>Our support team will review the issue and work with both parties to resolve it as quickly as possible. You may be contacted if additional information is required.</p>
                    `
                );
                break;

            case 'DISPUTE_RESOLVED':
                subject = `Dispute Resolved for Order #${payload.order_id}`;
                htmlContent = createEmailTemplate(
                    "Dispute Resolved",
                    `
                    <p>The dispute for order <strong>#${payload.order_id}</strong> has been resolved.</p>
                    <p><strong>Outcome:</strong> ${payload.resolution_details || payload.outcome || 'Resolved'}</p>
                    <p>If a refund was issued, it will appear in your account within 5–7 business days.</p>
                    `
                );
                break;

            case 'SELLER_PAYOUT_SENT':
                subject = `Your Payout Has Been Processed`;
                htmlContent = createEmailTemplate(
                    "Payout Successful",
                    `
                    <p>Great news! Your payout has been successfully processed.</p>
                    <div style="background: #f9fafb; padding: 16px; border-radius: 6px; margin: 16px 0;">
                        <strong>Payout Details:</strong><br>
                        Amount: ${payload.currency || '$'} ${payload.amount}<br>
                        Transfer ID: ${payload.transfer_id || 'N/A'}
                    </div>
                    <p>The amount should appear in your bank account shortly.</p>
                    `
                );
                break;

            case 'PAYOUT_ON_HOLD':
                subject = `Payout Temporarily On Hold`;
                htmlContent = createEmailTemplate(
                    "Payout Status Update",
                    `
                    <p>Your payout is currently on hold due to an active dispute or review.</p>
                    <p>Once the issue is resolved, the payout will be released automatically. We appreciate your patience.</p>
                    `
                );
                break;

            case 'PROMOTION_AVAILABLE':
                subject = `Special Offer Just for You 🎉`;
                htmlContent = createEmailTemplate(
                    "Exclusive Offer",
                    `
                    <p>We have a special promotion available for you!</p>
                    <p>${payload.promotion_details || 'Explore our latest collections and enjoy great savings.'}</p>
                    `,
                    { text: "Shop Now", link: payload.shop_link || '#' }
                );
                break;

            default:

                throw new Error(`Unknown email type: ${type}`);
        }

        // --- PRE-LOG ATTEMPT ---
        console.log(`Debug: Supabase URL exists: ${!!supabaseUrl}`);
        console.log(`Debug: Service Key exists: ${!!supabaseServiceKey}`);

        const { data: logEntry, error: logError } = await supabase
            .from('email_logs')
            .insert({
                seller_id: seller_id,
                recipient: recipient_email,
                type: type,
                subject: subject,
                status: 'pending',
                metadata: { ...payload, recipient_name }
            })
            .select()
            .single();
        
        if (logError) {
            console.error("Debug: Logging Insert Error:", logError);
        } else {
            console.log("Debug: Logging Insert Success, ID:", logEntry?.id);
        }
        
        if (logEntry) logId = logEntry.id;

        // --- BREVO API CALL ---
        const PLATFORM_NAME = "VendorFlow";
        const SYSTEM_SENDER_EMAIL = "rd.bhatt.official@gmail.com";

        const body = {
            sender: {
                name: `${storeName} via ${PLATFORM_NAME}`,
                email: SYSTEM_SENDER_EMAIL
            },
            to: [{ email: recipient_email, name: recipient_name }],
            subject: subject,
            htmlContent: htmlContent
        };

        const res = await fetch(BREVO_API_URL, {
            method: "POST",
            headers: {
                "api-key": BREVO_API_KEY,
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify(body)
        });

        // Log API Usage
        await supabase
            .from('api_usage_logs')
            .insert({
                provider: 'brevo',
                endpoint: 'v3/smtp/email',
                status_code: res.status
            });

        const data = await res.json();

        if (!res.ok) {
            console.error("Brevo API Error:", data);
            
            // Log Error
            if (logId) {
                await supabase
                    .from('email_logs')
                    .update({ 
                        status: 'failed', 
                        error_message: JSON.stringify(data.message || data) 
                    })
                    .eq('id', logId);
            }

            return new Response(JSON.stringify({ error: data }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Log Success
        if (logId) {
            await supabase
                .from('email_logs')
                .update({ 
                    status: 'sent', 
                    message_id: data.messageId 
                })
                .eq('id', logId);

            // Specific logging for Recovery Hub
            if (type === 'ABANDONED_CART' && payload.customer_id) {
                await supabase
                    .from('cart_recovery_logs')
                    .insert({
                        customer_id: payload.customer_id,
                        seller_id: seller_id,
                        sent_at: new Date().toISOString()
                    });
            }
        }

        return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error) {
        console.error("Function Error:", error);
        
        // Final fallback log if possible
        if (logId) {
            await supabase
                .from('email_logs')
                .update({ status: 'error', error_message: error.message })
                .eq('id', logId);
        }

        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})
