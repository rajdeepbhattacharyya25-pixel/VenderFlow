export interface NotificationPayload {
    title: string;
    message: string;
    type?: 'info' | 'warning' | 'error' | 'success';
    recipient: string; // email or chat_id
    metadata?: Record<string, any>;
}

export interface NotificationResult {
    success: boolean;
    error?: string;
    provider?: string;
}

export interface IEmailProvider {
    sendEmail(payload: NotificationPayload): Promise<NotificationResult>;
}

export interface ITelegramProvider {
    sendMessage(payload: NotificationPayload): Promise<NotificationResult>;
}
