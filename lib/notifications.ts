import { supabase, secureInvoke } from './supabase';

type NotificationType = 'BACKUP_SUCCESS' | 'BACKUP_FAILED' | 'NEW_MESSAGE' | 'SYSTEM_ALERT' | 'NEW_SELLER_APPLICATION';

interface NotificationPayload {
    type: NotificationType;
    message: string;
    data?: unknown;
}

export const notifyAdmin = async (payload: NotificationPayload) => {
    try {
        console.log("🔔 Sending Telegram Notification:", payload.type);

        const { error } = await secureInvoke('notify-admin', {
            body: payload,
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
  metadata?: Record<string, unknown>;
  action?: {
    type: string;
    payload: Record<string, unknown>;
  } | null;
}

interface SentryInterface {
  addBreadcrumb: (breadcrumb: Record<string, unknown>) => void;
  captureException: (error: unknown, context?: Record<string, unknown>) => void;
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
    // 1. Sentry Integration: Add breadcrumb for visibility
    const Sentry = (window as unknown as { Sentry: SentryInterface }).Sentry;
    if (Sentry) {
      Sentry.addBreadcrumb({
        category: 'auth',
        message: `System Alert: ${title}`,
        level: severity === 'critical' || severity === 'emergency' ? 'error' : 'info',
        data: { type, severity, seller_id, ...metadata }
      });

      // Capture exception for warning and above
      if (severity === 'critical' || severity === 'emergency' || severity === 'warning') {
        Sentry.captureException(new Error(`[${severity.toUpperCase()}] ${title}: ${message}`), {
          tags: { alert_type: type, severity },
          extra: { metadata, seller_id, title }
        });
      }
    }

    // 2. Generate fingerprint: ensure reliable deduplication
    // Stable identifier derived from structured metadata if available
    const fingerprintParts = [
      type,
      seller_id || 'system',
      metadata.operation_type || 'generic',
      metadata.resource_id || 'none',
      metadata.error_code || 'none'
    ];
    const fingerprint = fingerprintParts.join(':');

    const breadcrumbs = typeof window !== 'undefined' ? {
        href: window.location.href,
        userAgent: navigator.userAgent,
        referrer: document.referrer,
        timestamp: new Date().toISOString(),
    } : {};
    
    // 3. Call the create_system_alert RPC
    // This RPC handles severity-based throttling and DB trigger for dispatcher
    const { data, error } = await supabase.rpc('create_system_alert', {
      p_alert_type: type,
      p_severity: severity,
      p_title: title,
      p_message: message,
      p_seller_id: seller_id,
      p_metadata: { ...metadata, ...breadcrumbs },
      p_fingerprint: fingerprint,
      p_action_type: action?.type,
      p_action_payload: action?.payload
    });

    if (error) {
      console.error("❌ Failed to create system alert (RPC):", error);
      
      if (Sentry) {
        Sentry.captureException(error, {
          tags: { context: 'logAlert_rpc_failure' },
          extra: { p_title: title, p_message: message }
        });
      }

      // FALLBACK: If RPC fails, try standard notifyAdmin for critical issues
      if (severity === 'critical') {
        const { error: fallbackError } = await secureInvoke('notify-admin', {
          body: {
            type: 'SYSTEM_ALERT',
            message: `[FALLBACK ALERT] ${message}`,
            data: { severity, title, type, seller_id, metadata: { ...metadata }, error }
          }
        });
        if (fallbackError) console.error("❌ Fallback notifyAdmin failed:", fallbackError);
      }
      return { data: null, error };
    }

    console.log(`✅ System Alert Processed [${severity}]: ${title}`);
    return { data, error: null };
  } catch (err: unknown) {
    console.error("❌ Unexpected error logging alert:", err);
    const Sentry = (window as unknown as { Sentry: SentryInterface }).Sentry;
    if (Sentry) Sentry.captureException(err);
    return { data: null, error: err };
  }
};


