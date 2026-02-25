
import React, { useEffect, useState } from 'react';
import { useTelegram } from '../lib/telegram';
import { supabase } from '../lib/supabase';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const TelegramInitializer: React.FC = () => {
    const { tg, user, isTelegram } = useTelegram();
    const [isLinking, setIsLinking] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (isTelegram && tg?.initData) {
            // Store raw initData for AuthCallback (secure verification)
            // We use the raw string which contains the hash for backend verification
            sessionStorage.setItem('telegram_init_data', tg.initData);

            const checkAndLinkAccount = async () => {
                const { data: { session } } = await supabase.auth.getSession();

                if (session?.user) {
                    setIsLinking(true);

                    // Call the secure backend function to link account
                    try {
                        const { data, error } = await supabase.functions.invoke('link-telegram', {
                            body: { initData: tg.initData }
                        });

                        if (error) throw error;

                        if (data?.success) {
                            console.log("Telegram account linked successfully via backend verification");
                        }
                    } catch (error) {
                        console.error("Failed to link Telegram account securely:", error);
                    } finally {
                        setIsLinking(false);
                    }
                } else if (!location.pathname.includes('/auth-callback')) {
                    // Not logged in. Attempt auto-login via Telegram Web App!
                    setIsLinking(true);
                    try {
                        const { data, error } = await supabase.functions.invoke('link-telegram', {
                            body: { initData: tg.initData, mode: 'login' }
                        });

                        // Error here usually means account is not linked, which is fine, they just proceed as guest.
                        if (!error && data?.success && data?.url) {
                            console.log("Auto-login successful, redirecting...");
                            window.location.href = data.url;
                            return; // Do not set isLinking to false to avoid flash of unauthenticated content
                        }
                    } catch (err) {
                        console.error("Auto-login via Telegram failed:", err);
                    }
                    setIsLinking(false);
                }
            };

            checkAndLinkAccount();
        }
    }, [isTelegram, tg]);

    if (isLinking) {
        return (
            <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
                <div className="bg-panel p-6 rounded-2xl shadow-xl flex flex-col items-center gap-4 border border-muted/10">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-sm font-medium text-text">Securely Authenticating...</p>
                </div>
            </div>
        );
    }

    return null; // Renderless component (except when linking)
};

export default TelegramInitializer;
