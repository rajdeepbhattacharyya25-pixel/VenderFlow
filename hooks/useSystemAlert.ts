/**
 * hooks/useSystemAlert.ts
 *
 * Global error event bus for reporting critical system errors.
 * Any component OR non-React utility (vault.ts, storage.ts, etc.)
 * can call `reportError(...)` to:
 *   1. Show a persistent dismissible banner in the seller dashboard.
 *   2. Fire a Telegram notification to the admin via notify-admin edge function.
 *
 * Debounced: same error code is suppressed for 60s to prevent Telegram spam.
 */

import { useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

// ── Types ──────────────────────────────────────────────────────────────────

export type SystemAlertSeverity = 'error' | 'warning' | 'info';

export interface SystemAlert {
    id: string;
    code: string;
    title: string;
    message: string;
    severity: SystemAlertSeverity;
    context?: Record<string, unknown>;
    timestamp: Date;
}

export type SystemAlertHandler = (alert: SystemAlert) => void;

// ── Error code → human-readable title map ──────────────────────────────────

const ERROR_TITLES: Record<string, string> = {
    IMGBB_FAILURE:       'Image Upload Service Unavailable',
    UPLOAD_FAILURE:      'Upload Failed',
    UPLOAD_PARTIAL:      'Partial Upload — Some Files Failed',
    API_KEY_INVALID:     'Invalid API Key Detected',
    STORAGE_ERROR:       'Storage Error',
    CRYPTO_UNAVAILABLE:  'Secure Hashing Unavailable (HTTP Mode)',
    NETWORK_ERROR:       'Network Request Failed',
};

// ── Debounce registry ──────────────────────────────────────────────────────

const DEBOUNCE_MS = 60_000; // 60 seconds
const _debounceMap = new Map<string, number>(); // code → last fired timestamp

function _isDebounced(code: string): boolean {
    const last = _debounceMap.get(code);
    if (!last) return false;
    return Date.now() - last < DEBOUNCE_MS;
}

function _markFired(code: string): void {
    _debounceMap.set(code, Date.now());
}

// ── Custom Event Name ─────────────────────────────────────────────────────

const ALERT_EVENT = 'vf:system-alert';

// ── reportError — callable from ANYWHERE (React or plain TS) ──────────────

/**
 * Report a critical system error.
 * - Fires a UI event the DashboardLayout listens to (shows banner).
 * - Sends a Telegram notification to the admin (debounced).
 *
 * @param code     Machine-readable error code (e.g., "IMGBB_FAILURE")
 * @param message  Human-readable error description
 * @param context  Optional extra data (seller_id, file_name, etc.)
 * @param severity Default: 'error'
 */
export function reportError(
    code: string,
    message: string,
    context?: Record<string, unknown>,
    severity: SystemAlertSeverity = 'error'
): void {
    const alert: SystemAlert = {
        id:        `${code}-${Date.now()}`,
        code,
        title:     ERROR_TITLES[code] ?? 'System Error',
        message,
        severity,
        context,
        timestamp: new Date(),
    };

    // 1. Fire UI event (non-debounced — always show the banner)
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(ALERT_EVENT, { detail: alert }));
    }

    // 2. Telegram notification (debounced per error code)
    if (!_isDebounced(code)) {
        _markFired(code);
        _notifyAdmin(alert);
    }
}

// ── Admin notification via edge function ──────────────────────────────────

async function _notifyAdmin(alert: SystemAlert): Promise<void> {
    try {
        // Get current seller context (best-effort — don't block on failure)
        const { data: { user } } = await supabase.auth.getUser();

        await supabase.functions.invoke('notify-admin', {
            body: {
                type: 'SYSTEM_ERROR',
                message: alert.message,
                data: {
                    error_code:   alert.code,
                    error_title:  alert.title,
                    severity:     alert.severity,
                    seller_id:    user?.id ?? 'unknown',
                    seller_email: user?.email ?? 'unknown',
                    ...alert.context,
                },
            },
        });
    } catch (e) {
        // Never let the notification system itself crash the app
        console.warn('[SystemAlert] Failed to notify admin:', e);
    }
}

// ── React Hook — used in DashboardLayout to subscribe to alerts ───────────

/**
 * Subscribe to system alerts in a React component.
 * @param onAlert Callback invoked each time a new alert fires.
 */
export function useSystemAlertListener(onAlert: SystemAlertHandler): void {
    const handler = useCallback(
        (e: Event) => {
            const alert = (e as CustomEvent<SystemAlert>).detail;
            onAlert(alert);
        },
        [onAlert]
    );

    useEffect(() => {
        window.addEventListener(ALERT_EVENT, handler);
        return () => window.removeEventListener(ALERT_EVENT, handler);
    }, [handler]);
}
