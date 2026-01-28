import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

interface EmailPayload {
    type: 'ORDER_CONFIRMED' | 'PAYMENT_FAILED' | 'STATUS_UPDATE' | 'REFUND_INITIATED' | 'PACKED' | 'OUT_FOR_DELIVERY' | 'ABANDONED_CART' | 'REVIEW_REQUEST' | 'REORDER_REMINDER';
    payload: any;
    recipient_email: string;
    recipient_name?: string;
}

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { type, payload, recipient_email, recipient_name } = await req.json() as EmailPayload;
        const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY');

        if (!BREVO_API_KEY) {
            throw new Error("Missing BREVO_API_KEY environment variable");
        }

        const logoHtml = payload.logo_url
            ? `<div style="text-align: center; margin-bottom: 20px;"><img src="${payload.logo_url}" alt="${payload.store_name}" style="max-height: 50px;" /></div>`
            : '';
        const storeName = payload.store_name || 'Modern Apparel Store';

        let subject = "";
        let htmlContent = "";

        // --- TEMPLATE LOGIC ---
        switch (type) {
            case 'ORDER_CONFIRMED':
                subject = `Order Confirmed #${payload.order_id} 🎉`;
                htmlContent = `
          ${logoHtml}
          <h1>Thank You for Your Order! 🎉</h1>
          <p>Hi <strong>${recipient_name || 'Customer'}</strong>,</p>
          <p>We’re happy to let you know that your order has been successfully confirmed.</p>
          <p><strong>Order ID:</strong> #${payload.order_id}<br>
          <strong>Total Amount:</strong> ${payload.currency || 'INR'} ${payload.total}</p>
          <p>We will notify you as soon as your order is shipped.</p>
          <p>If you have any questions, feel free to reply to this email — we’re always happy to help!</p>
          <br>
          <p>Best regards,<br>
          <strong>${storeName}</strong></p>
        `;
                break;

            case 'PAYMENT_FAILED':
                subject = `Action Required: Payment Failed for Order #${payload.order_id}`;
                htmlContent = `
          ${logoHtml}
          <h1>Payment Failed</h1>
          <p>Hi <strong>${recipient_name || 'Customer'}</strong>,</p>
          <p>We couldn't process the payment for your order <strong>#${payload.order_id}</strong>.</p>
          <p>Reason: ${payload.reason || 'Transaction declined'}</p>
          <p>Please review your payment details and try again.</p>
          <br>
          <p>Best regards,<br>
          <strong>${storeName}</strong></p>
        `;
                break;

            case 'ABANDONED_CART':
                subject = `You left something behind! 🛒`;
                htmlContent = `
          ${logoHtml}
          <h1>Your Cart Misses You</h1>
          <p>Hi <strong>${recipient_name || 'Customer'}</strong>,</p>
          <p>We noticed you left some items in your cart. They are saved for you, but stocks are limited!</p>
          <p><a href="${payload.recovery_link}" style="display:inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Complete Your Order</a></p>
          <br>
          <p>Best regards,<br>
          <strong>${storeName}</strong></p>
        `;
                break;

            case 'REVIEW_REQUEST':
                subject = `How was your order? 🌟`;
                htmlContent = `
          ${logoHtml}
          <h1>We'd Love Your Feedback!</h1>
          <p>Hi <strong>${recipient_name || 'Customer'}</strong>,</p>
          <p>Thank you for shopping with us! We noticed you recently received your order.</p>
          <p>We would love to hear what you think about your new items.</p>
          <p><a href="${payload.review_link}" style="display:inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Leave a Review</a></p>
          <br>
          <p>Best regards,<br>
          <strong>${storeName}</strong></p>
        `;
                break;

            case 'REORDER_REMINDER':
                subject = `Ready to Restock? 🔄`;
                htmlContent = `
          ${logoHtml}
          <h1>Time to Replenish?</h1>
          <p>Hi <strong>${recipient_name || 'Customer'}</strong>,</p>
          <p>It's been a while since your purchase of order <strong>#${payload.order_id}</strong>.</p>
          <p>If you're running low, we're ready to ship your favorites again.</p>
          <p><a href="${payload.reorder_link}" style="display:inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Buy Again</a></p>
          <br>
          <p>Best regards,<br>
          <strong>${storeName}</strong></p>
        `;
                break;

            case 'PACKED':
                subject = `Your Order #${payload.order_id} is Packed! 📦`;
                htmlContent = `
          ${logoHtml}
          <h1>Your Order is Packed!</h1>
          <p>Hi <strong>${recipient_name || 'Customer'}</strong>,</p>
          <p>Great news! We have packed your order <strong>#${payload.order_id}</strong> and it is ready to be handed over to our delivery partner.</p>
          <p>You will receive another email with the tracking number as soon as it ships.</p>
          <br>
          <p>Best regards,<br>
          <strong>${storeName}</strong></p>
        `;
                break;

            case 'OUT_FOR_DELIVERY':
                subject = `Out for Delivery: Order #${payload.order_id} 🚚`;
                htmlContent = `
          ${logoHtml}
          <h1>It's Almost There!</h1>
          <p>Hi <strong>${recipient_name || 'Customer'}</strong>,</p>
          <p>Your order <strong>#${payload.order_id}</strong> is out for delivery today.</p>
          <p>Please keep your phone handy for updates from the courier partner.</p>
          <br>
          <p>Best regards,<br>
          <strong>${storeName}</strong></p>
        `;
                break;

            case 'STATUS_UPDATE':
                subject = `Update on Order #${payload.order_id}: ${payload.status}`;
                htmlContent = `
          ${logoHtml}
          <h1>Order Update</h1>
          <p>Hi <strong>${recipient_name || 'Customer'}</strong>,</p>
          <p>Your order <strong>#${payload.order_id}</strong> is now <strong>${payload.status}</strong>.</p>
          ${payload.tracking_number ? `<p>Tracking Number: ${payload.tracking_number} (${payload.carrier})</p>` : ''}
          <br>
          <p>Best regards,<br>
          <strong>${storeName}</strong></p>
        `;
                break;

            case 'REFUND_INITIATED':
                subject = `Refund Initiated for Order #${payload.order_id}`;
                htmlContent = `
          ${logoHtml}
          <h1>Refund Processed</h1>
          <p>Hi <strong>${recipient_name || 'Customer'}</strong>,</p>
          <p>We have initiated a refund of <strong>${payload.amount}</strong> for order #${payload.order_id}.</p>
          <p>It should appear in your account within 5-7 business days.</p>
          <br>
          <p>Best regards,<br>
          <strong>${storeName}</strong></p>
        `;
                break;

            default:
                throw new Error(`Unknown email type: ${type}`);
        }

        // --- BREVO API CALL ---
        // Sender: "SellerName via MyPlatform" <system@verified-domain.com>
        const PLATFORM_NAME = "MyPlatform"; // Change this to your platform name
        const SYSTEM_SENDER_EMAIL = "noreply@brevosend.com"; // MUST be a verified sender in Brevo

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

        const data = await res.json();

        if (!res.ok) {
            console.error("Brevo API Error:", data);
            return new Response(JSON.stringify({ error: data }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})
