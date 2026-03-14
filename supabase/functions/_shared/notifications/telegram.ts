import { NotificationPayload, NotificationResult, ITelegramProvider } from "./types.ts";

export class TelegramProvider implements ITelegramProvider {
    private botToken: string;

    constructor(botToken: string) {
        this.botToken = botToken;
    }

    async sendMessage(payload: NotificationPayload): Promise<NotificationResult> {
        try {
            const response = await fetch(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chat_id: payload.recipient,
                    text: `<b>${payload.title}</b>\n\n${payload.message}`,
                    parse_mode: "HTML",
                }),
            });

            const data = await response.json();
            if (!data.ok) {
                return { success: false, error: data.description || "Failed to send Telegram message", provider: "telegram" };
            }

            return { success: true, provider: "telegram" };
        } catch (error: any) {
            return { success: false, error: error.message, provider: "telegram" };
        }
    }
}
