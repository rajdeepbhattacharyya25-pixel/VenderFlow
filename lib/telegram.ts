
import { useEffect, useState, useMemo, useCallback } from 'react';

// Telegram Web App SDK Types
// Reference: https://core.telegram.org/bots/webapps#initializing-mini-apps

declare global {
    interface Window {
        Telegram?: {
            WebApp: TelegramWebApp;
        };
    }
}

interface TelegramWebApp {
    initData: string;
    initDataUnsafe: TelegramWebAppsInitData;
    version: string;
    platform: string;
    colorScheme: 'light' | 'dark';
    themeParams: TelegramThemeParams;
    isExpanded: boolean;
    viewportHeight: number;
    viewportStableHeight: number;
    headerColor: string;
    backgroundColor: string;
    isClosingConfirmationEnabled: boolean;
    BackButton: {
        isVisible: boolean;
        onClick: (callback: () => void) => void;
        offClick: (callback: () => void) => void;
        show: () => void;
        hide: () => void;
    };
    MainButton: {
        text: string;
        color: string;
        textColor: string;
        isVisible: boolean;
        isActive: boolean;
        isProgressVisible: boolean;
        setText: (text: string) => void;
        onClick: (callback: () => void) => void;
        offClick: (callback: () => void) => void;
        show: () => void;
        hide: () => void;
        enable: () => void;
        disable: () => void;
        showProgress: (leaveActive: boolean) => void;
        hideProgress: () => void;
        setParams: (params: any) => void;
    };
    HapticFeedback: {
        impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
        notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
        selectionChanged: () => void;
    };
    ready: () => void;
    expand: () => void;
    close: () => void;
    enableClosingConfirmation: () => void;
    disableClosingConfirmation: () => void;
    onEvent: (eventType: string, eventHandler: () => void) => void;
    offEvent: (eventType: string, eventHandler: () => void) => void;
    sendData: (data: string) => void;
    openLink: (url: string, options?: { try_instant_view?: boolean }) => void;
    openTelegramLink: (url: string) => void;
    openInvoice: (url: string, callback?: (status: string) => void) => void;
    showPopup: (params: any, callback?: (id?: string) => void) => void;
    showAlert: (message: string, callback?: () => void) => void;
    showConfirm: (message: string, callback?: (ok: boolean) => void) => void;
}

interface TelegramWebAppsInitData {
    query_id?: string;
    user?: TelegramUser;
    receiver?: TelegramUser;
    chat?: TelegramChat;
    start_param?: string;
    can_send_after?: number;
    auth_date: number;
    hash: string;
}

interface TelegramUser {
    id: number;
    is_bot?: boolean;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
    is_premium?: boolean;
    added_to_attachment_menu?: boolean;
    allows_write_to_pm?: boolean;
    photo_url?: string;
}

interface TelegramChat {
    id: number;
    type: 'group' | 'supergroup' | 'channel';
    title: string;
    username?: string;
    photo_url?: string;
}

interface TelegramThemeParams {
    bg_color?: string;
    text_color?: string;
    hint_color?: string;
    link_color?: string;
    button_color?: string;
    button_text_color?: string;
    secondary_bg_color?: string;
}

// Helpers

export const isTelegramWebApp = (): boolean => {
    return typeof window !== 'undefined' && !!window.Telegram?.WebApp?.initData;
};

export const getTelegramWebApp = (): TelegramWebApp | undefined => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
        return window.Telegram.WebApp;
    }
    return undefined;
};

/**
 * Initializes the Telegram Web App
 */
export const initTelegramApp = () => {
    const tg = getTelegramWebApp();
    if (tg) {
        tg.ready();
        tg.expand();
    }
};

/**
 * Hook to use Telegram Web App features
 */
export const useTelegram = () => {
    const [tg, setTg] = useState<TelegramWebApp | null>(null);
    const [user, setUser] = useState<TelegramUser | null>(null);

    useEffect(() => {
        const app = getTelegramWebApp();
        if (app) {
            setTg(app);
            setUser(app.initDataUnsafe.user || null);
        }
    }, []);

    const onClose = useCallback(() => tg?.close(), [tg]);

    const toggleClosingConfirmation = useCallback((enable: boolean) => {
        if (!tg) return;
        if (enable) {
            tg.enableClosingConfirmation();
        } else {
            tg.disableClosingConfirmation();
        }
    }, [tg]);

    return useMemo(() => ({
        tg,
        user,
        onClose,
        toggleClosingConfirmation,
        isTelegram: !!tg,
        themeParams: tg?.themeParams,
        platform: tg?.platform
    }), [tg, user, onClose, toggleClosingConfirmation]);
};
