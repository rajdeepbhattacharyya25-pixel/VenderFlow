
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
        if (isTelegram && user) {
            // Store Telegram user for AuthCallback to use if we are currently logging in
            sessionStorage.setItem('telegram_user', JSON.stringify(user));

            const checkAndLinkAccount = async () => {
                const { data: { session } } = await supabase.auth.getSession();

                if (session?.user) {
                    setIsLinking(true);
                    // Check if already linked or needs linking
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('telegram_id')
                        .eq('id', session.user.id)
                        .single();

                    if (profile && (!profile.telegram_id || profile.telegram_id !== user.id)) {
                        console.log("Linking Telegram Account " + user.id + " to user " + session.user.id);

                        const { error } = await supabase
                            .from('profiles')
                            .update({
                                telegram_id: user.id,
                                telegram_username: user.username,
                                telegram_photo_url: user.photo_url
                            })
                            .eq('id', session.user.id);

                        if (error) {
                            console.error("Failed to link Telegram account", error);
                            tg?.showAlert("Failed to link Telegram account. Please try again.");
                        } else {
                            tg?.showAlert("Telegram account successfully linked!");
                        }
                    }
                    setIsLinking(false);
                } else {
                    // Not logged in.
                    // If we are on the login page (root), we might want to show a specific message?
                    // But standard flow is fine. The user will login, triggering AuthCallback.
                }
            };

            checkAndLinkAccount();
        }
    }, [isTelegram, user, tg]);

    if (isLinking) {
        return (
            <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
                <div className="bg-panel p-6 rounded-2xl shadow-xl flex flex-col items-center gap-4 border border-muted/10">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-sm font-medium text-text">Linking Telegram Account...</p>
                </div>
            </div>
        );
    }

    return null; // Renderless component (except when linking)
};

export default TelegramInitializer;
