import { NotificationPayload, NotificationResult } from "./types.ts";
import { BrevoEmailProvider } from "./brevo.ts";
import { TelegramProvider } from "./telegram.ts";

export class NotificationService {
    private emailProvider: BrevoEmailProvider;
    private telegramProvider: TelegramProvider;
    private supabase: any;

    constructor(supabase: any, brevoApiKey: string, telegramBotToken: string) {
        this.supabase = supabase;
        this.emailProvider = new BrevoEmailProvider(brevoApiKey);
        this.telegramProvider = new TelegramProvider(telegramBotToken);
    }

    async send(sellerId: string, payload: NotificationPayload, channel: 'email' | 'telegram'): Promise<NotificationResult> {
        let result: NotificationResult;

        if (channel === 'email') {
            result = await this.emailProvider.sendEmail(payload);
            await this.logNotification(sellerId, 'email', payload.recipient, result);
        } else {
            result = await this.telegramProvider.sendMessage(payload);
            if (!result.success) {
                // Failover: Queue message for retry
                await this.queueNotification(sellerId, payload);
            }
            await this.logNotification(sellerId, 'telegram', payload.recipient, result);
        }

        return result;
    }

    private async logNotification(sellerId: string, type: string, recipient: string, result: NotificationResult) {
        const table = type === 'email' ? 'email_logs' : 'telegram_message_logs';
        await this.supabase.from(table).insert({
            seller_id: sellerId,
            recipient: type === 'email' ? recipient : undefined,
            message_type: result.success ? 'success' : 'failed',
            status: result.success ? 'sent' : 'error',
            error_message: result.error,
        });
    }

    private async queueNotification(sellerId: string, payload: NotificationPayload) {
        await this.supabase.from('telegram_message_queue').insert({
            seller_id: sellerId,
            payload: payload,
            status: 'pending',
        });
    }
}
