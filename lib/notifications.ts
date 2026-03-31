import { supabase } from './supabase';

type NotificationType = 'BACKUP_SUCCESS' | 'BACKUP_FAILED' | 'NEW_MESSAGE' | 'SYSTEM_ALERT' | 'NEW_SELLER_APPLICATION';

interface NotificationPayload {
    type: NotificationType;
    message: string;
    data?: any;
}

export const notifyAdmin = async (payload: NotificationPayload) => {
    try {
        console.log("🔔 Sending Telegram Notification:", payload.type);

        const { data, error } = await supabase.functions.invoke('notify-admin', {
            body: payload
        });

        if (error) throw error;
        console.log("✅ Notification Sent");
        return true;
    } catch (error) {
        console.error("❌ Failed to send notification:", error);
        // Don't block the app flow if notification fails
        return false;
    }
};

export type Severity = 'info' | 'warning' | 'critical' | 'emergency';

export interface LogAlertParams {
  type: string;
  severity: Severity;
  title: string;
  message: string;
  seller_id?: string | null;
  metadata?: Record<string, any>;
  action?: {
    type: string;
    payload: Record<string, any>;
  } | null;
}

/**
 * Centrally log a system alert with severity-based throttling and automatic dispatching.
 * This is the primary entry point for business-level error management.
 */
export const logAlert = async ({
  type,
  severity,
  title,
  message,
  seller_id,
  metadata = {},
  action = null
}: LogAlertParams) => {
  try {
    // 1. Generate fingerprint: ensure reliable deduplication
    // Stable identifier derived from structured metadata if available
    const fingerprintParts = [
      type,
      seller_id || 'system',
      metadata.operation_type || 'generic',
      metadata.resource_id || 'none',
      metadata.error_code || 'none'
    ];
    const fingerprint = fingerprintParts.join(':');

    // 2. Call the create_system_alert RPC
    // This RPC handles severity-based throttling and DB trigger for dispatcher
    const { data, error } = await supabase.rpc('create_system_alert', {
      p_alert_type: type,
      p_severity: severity,
      p_title: title,
      p_message: message,
      p_seller_id: seller_id,
      p_metadata: metadata,
      p_fingerprint: fingerprint,
      p_action_type: action?.type,
      p_action_payload: action?.payload
    });

    if (error) {
      console.error("❌ Failed to create system alert (RPC):", error);
      
      // FALLBACK: If RPC fails, try standard notifyAdmin for critical issues
      if (severity === 'critical') {
        const { data: fallbackData, error: fallbackError } = await supabase.functions.invoke('notify-admin', {
          body: {
            type: 'SYSTEM_ALERT',
            message: `[FALLBACK ALERT] ${message}`,
            data: { severity, title, type, seller_id, metadata, error }
          }
        });
        if (fallbackError) console.error("❌ Fallback notifyAdmin failed:", fallbackError);
      }
      return { data: null, error };
    }

    console.log(`✅ System Alert Processed [${severity}]: ${title}`);
    return { data, error: null };
  } catch (err: any) {
    console.error("❌ Unexpected error logging alert:", err);
    return { data: null, error: err };
  }
};


