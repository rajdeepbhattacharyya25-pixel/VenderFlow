import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

interface ShortcutHandlers {
    onCommandPalette?: () => void;
    onShowHelp?: () => void;
}

/**
 * Custom hook for keyboard shortcuts in admin panel
 * 
 * Shortcuts:
 * - Ctrl+K / Cmd+K: Open command palette
 * - R then D: Go to Dashboard
 * - R then S: Go to Sellers
 * - R then O: Go to Orders
 * - R then I: Go to Invites
 * - R then L: Go to Logs
 * - ?: Show shortcuts help
 */
export function useKeyboardShortcuts(handlers: ShortcutHandlers = {}) {
    const navigate = useNavigate();

    // Track "r" prefix for navigation shortcuts
    let rPending = false;
    let rTimeout: NodeJS.Timeout | null = null;

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        // Ignore if user is typing in an input/textarea
        const target = e.target as HTMLElement;
        if (
            target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable
        ) {
            return;
        }

        // Ctrl+K or Cmd+K: Command Palette
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            handlers.onCommandPalette?.();
            return;
        }

        // ?: Show help
        if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            handlers.onShowHelp?.();
            return;
        }

        // R + key navigation shortcuts
        if (e.key.toLowerCase() === 'r' && !e.ctrlKey && !e.metaKey && !rPending) {
            rPending = true;
            // Reset after 1 second
            rTimeout = setTimeout(() => {
                rPending = false;
            }, 1000);
            return;
        }

        if (rPending) {
            rPending = false;
            if (rTimeout) clearTimeout(rTimeout);

            switch (e.key.toLowerCase()) {
                case 'd':
                    e.preventDefault();
                    navigate('/admin');
                    break;
                case 's':
                    e.preventDefault();
                    navigate('/admin/sellers');
                    break;
                case 'o':
                    e.preventDefault();
                    navigate('/admin/orders');
                    break;
                case 'i':
                    e.preventDefault();
                    navigate('/admin/invites');
                    break;
                case 'l':
                    e.preventDefault();
                    navigate('/admin/logs');
                    break;
                case 'p':
                    e.preventDefault();
                    navigate('/admin/products');
                    break;
            }
        }
    }, [navigate, handlers]);

    useEffect(() => {
        // Need to use a ref-like pattern to avoid stale closure
        let rPendingLocal = false;
        let rTimeoutLocal: NodeJS.Timeout | null = null;

        const handler = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (
                target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.isContentEditable
            ) {
                return;
            }

            // Ctrl+K or Cmd+K
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                handlers.onCommandPalette?.();
                return;
            }

            // ?
            if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                handlers.onShowHelp?.();
                return;
            }

            // R prefix
            if (e.key.toLowerCase() === 'r' && !e.ctrlKey && !e.metaKey && !rPendingLocal) {
                rPendingLocal = true;
                rTimeoutLocal = setTimeout(() => {
                    rPendingLocal = false;
                }, 1000);
                return;
            }

            if (rPendingLocal) {
                rPendingLocal = false;
                if (rTimeoutLocal) clearTimeout(rTimeoutLocal);

                const routes: Record<string, string> = {
                    'd': '/admin',
                    's': '/admin/sellers',
                    'o': '/admin/orders',
                    'i': '/admin/invites',
                    'l': '/admin/logs',
                    'p': '/admin/products',
                };

                const route = routes[e.key.toLowerCase()];
                if (route) {
                    e.preventDefault();
                    navigate(route);
                }
            }
        };

        window.addEventListener('keydown', handler);
        return () => {
            window.removeEventListener('keydown', handler);
            if (rTimeoutLocal) clearTimeout(rTimeoutLocal);
        };
    }, [navigate, handlers]);
}

export default useKeyboardShortcuts;
