import React, { useEffect, useState, useRef } from 'react';
import { useTelegram } from '../lib/telegram';
import { supabase } from '../lib/supabase';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const TelegramInitializer: React.FC = () => {
    const { tg, isTelegram } = useTelegram();
    const [isLinking, setIsLinking] = useState(false);
    const location = useLocation();
    const hasInitialized = useRef(false);

    useEffect(() => {
        if (isTelegram && tg?.initData && !hasInitialized.current) {
            hasInitialized.current = true;
            
            sessionStorage.setItem('telegram_init_data', tg.initData);

            const checkAndLinkAccount = async () => {
                const { data: { session } } = await supabase.auth.getSession();

                if (session?.user) {
                    setIsLinking(true);
                    try {
                        const { data, error } = await supabase.functions.invoke('link-telegram', {
                            body: { initData: tg.initData }
                        });
                        if (error) throw error;
                        if (data?.success) {
                            console.log("Telegram account linked successfully");
                        }
                    } catch (error) {
                        console.error("Failed to link Telegram account:", error);
                    } finally {
                        setIsLinking(false);
                    }
                } else if (!location.pathname.includes('/auth-callback')) {
                    setIsLinking(true);
                    try {
                        const { data, error } = await supabase.functions.invoke('link-telegram', {
                            body: { initData: tg.initData, mode: 'login' }
                        });
                        if (!error && data?.success && data?.url) {
                            window.location.href = data.url;
                            return;
                        }
                    } catch (err) {
                        console.error("Auto-login failed:", err);
                    }
                    setIsLinking(false);
                }
            };

            checkAndLinkAccount();
        }
    }, [isTelegram, tg, location.pathname]);

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

    return null;
};

export default TelegramInitializer;
