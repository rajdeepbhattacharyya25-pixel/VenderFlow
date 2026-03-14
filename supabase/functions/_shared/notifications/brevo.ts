import { NotificationPayload, NotificationResult, IEmailProvider } from "./types.ts";

export class BrevoEmailProvider implements IEmailProvider {
    private apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    async sendEmail(payload: NotificationPayload): Promise<NotificationResult> {
        try {
            const response = await fetch("https://api.brevo.com/v3/smtp/email", {
                method: "POST",
                headers: {
                    "accept": "application/json",
                    "api-key": this.apiKey,
                    "content-type": "application/json",
                },
                body: JSON.stringify({
                    sender: { name: "VendorFlow", email: "support@vendorflow.com" },
                    to: [{ email: payload.recipient }],
                    subject: payload.title,
                    htmlContent: `<html><body><h1>${payload.title}</h1><p>${payload.message}</p></body></html>`,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                return { success: false, error: errorData.message || "Failed to send email via Brevo", provider: "brevo" };
            }

            return { success: true, provider: "brevo" };
        } catch (error: any) {
            return { success: false, error: error.message, provider: "brevo" };
        }
    }
}
