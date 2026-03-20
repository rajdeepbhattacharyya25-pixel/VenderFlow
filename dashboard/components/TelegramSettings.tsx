import React, { useState, useEffect } from 'react';
import { Send, CheckCircle2, AlertCircle, Loader2, Copy, ExternalLink, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export const TelegramSettings = () => {
    const [loading, setLoading] = useState(true);
    const [connecting, setConnecting] = useState(false);
    const [config, setConfig] = useState<any>(null);
    const [botToken, setBotToken] = useState('');
    const [error, setError] = useState('');
    const [step, setStep] = useState<'input' | 'verify' | 'connected'>('input');
    const [customAppUrl, setCustomAppUrl] = useState('');

    useEffect(() => {
        fetchConfig();
    }, []);

    // Auto-poll for connection status when we are waiting for user to start the bot
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (step === 'verify') {
            interval = setInterval(fetchConfig, 3000); // Check every 3 seconds
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [step]);

    const fetchConfig = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('seller_telegram_configs')
                .select('*')
                .eq('seller_id', user.id)
                .maybeSingle();

            if (data) {
                setConfig(data);
                if (data.chat_id) {
                    setStep('connected');
                } else {
                    setStep('verify'); // Token saved but chat_id missing (pending start)
                }
            } else {
                setStep('input');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleConnect = async () => {
        if (!botToken) {
            setError("Please enter a Bot Token");
            return;
        }

        setConnecting(true);
        setError('');

        try {
            // Get current session
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();

            if (sessionError || !session) {
                console.error("Session missing:", sessionError);
                setError("Authentication failed. Please refresh the page and try again.");
                return;
            }

            console.log("Connecting with token...", botToken.substring(0, 10) + "...");

            // Call Edge Function
            const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/telegram-seller-manager`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    action: 'connect_bot',
                    bot_token: botToken
                })
            });

            const result = await res.json();

            if (!res.ok) {
                console.error("API Error:", result);
                throw new Error(result.error || `Connection failed (${res.status})`);
            }

            // Success
            await fetchConfig(); // Reload config
            setStep('verify');

        } catch (err: any) {
            console.error(err);
            setError(err.message || "Something went wrong connection to the server");
        } finally {
            setConnecting(false);
        }
    };

    const handleTestNotification = async () => {
        try {
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (sessionError || !session) {
                alert("Please login again.");
                return;
            }

            const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/telegram-seller-manager`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    action: 'test_notification'
                })
            });

            const result = await res.json();
            if (!res.ok) throw new Error(result.error);

            alert("Test notification sent! Check your Telegram.");

        } catch (err: any) {
            console.error(err);
            alert("Failed to send test: " + err.message);
        }
    };

    const handleSyncMenu = async () => {
        setConnecting(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                alert("Session expired. Please login again.");
                return;
            }

            const tokenToUse = botToken || config?.bot_token;
            if (!tokenToUse) {
                if (confirm("Bot token not found in secure storage. Do you want to re-enter it?")) {
                    setStep('input');
                }
                return;
            }

            const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/telegram-seller-manager`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    action: 'connect_bot',
                    bot_token: tokenToUse,
                    app_url: customAppUrl || undefined
                })
            });

            const result = await res.json();
            if (!res.ok) throw new Error(result.error);

            alert("Menu Button, Webhook & Commands Synced!");
            await fetchConfig();
        } catch (error: any) {
            console.error(error);
            alert("Sync failed: " + error.message);
        } finally {
            setConnecting(false);
        }
    };

    const renderHeader = (title: string, icon: React.ReactNode) => (
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-theme-border">
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-600">
                {icon}
            </div>
            <h3 className="font-bold text-lg text-theme-text">{title}</h3>
        </div>
    );

    return (
        <div className="bg-theme-panel rounded-2xl p-8 border border-theme-border shadow-sm animate-fadeIn">
            {renderHeader('Telegram Bot Configuration', <Send size={20} />)}

            <div className="max-w-2xl">
                {/* Status Cards */}
                {step === 'connected' && (
                    <>
                        <div className="bg-green-50 border border-green-100 rounded-xl p-6 mb-8">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white shadow-sm">
                                    <CheckCircle2 size={24} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-lg text-green-900">Bot Active</h4>
                                    <p className="text-green-700">
                                        Connected as <span className="font-bold">@{config?.bot_username}</span>
                                    </p>
                                </div>
                            </div>
                            <div className="mt-4 pt-4 border-t border-green-100 flex gap-4">
                                <button
                                    onClick={() => window.open(`https://t.me/${config?.bot_username}`, '_blank')}
                                    className="text-sm font-bold text-green-700 hover:underline flex items-center gap-1"
                                >
                                    Open Bot <ExternalLink size={14} />
                                </button>
                                <button
                                    onClick={handleTestNotification}
                                    className="text-sm font-bold text-green-700 hover:underline"
                                >
                                    Test Notification
                                </button>
                                <button
                                    onClick={handleSyncMenu}
                                    disabled={connecting}
                                    className="text-sm font-bold text-blue-600 hover:underline flex items-center gap-1"
                                >
                                    {connecting ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                                    Sync Menu Btn
                                </button>
                                <button
                                    onClick={() => setStep('input')}
                                    className="text-sm font-bold text-theme-muted hover:text-theme-text hover:underline ml-auto"
                                >
                                    Reconfigure
                                </button>
                            </div>
                        </div>

                        {/* Notification Preferences */}
                        <div className="bg-theme-bg/30 border border-theme-border rounded-xl p-6 mb-8">
                            <h4 className="font-bold text-theme-text mb-4">Notification Preferences</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {[
                                    { key: 'orders', label: 'New Order Alerts' },
                                    { key: 'stock', label: 'Low Stock Warnings' },
                                    { key: 'customers', label: 'New Customer Alerts' },
                                    { key: 'daily_summary', label: 'Daily Performance Reports' }
                                ].map(({ key, label }) => (
                                    <label key={key} className="flex items-center justify-between p-3 bg-theme-panel rounded-lg border border-theme-border cursor-pointer hover:border-emerald-500/50 transition-colors">
                                        <span className="text-sm font-medium text-theme-text">{label}</span>
                                        <input
                                            type="checkbox"
                                            checked={config.preferences?.[key] !== false}
                                            onChange={async (e) => {
                                                const newPrefs = { ...config.preferences, [key]: e.target.checked };
                                                setConfig({ ...config, preferences: newPrefs });
                                                await supabase.from('seller_telegram_configs').update({ preferences: newPrefs }).eq('id', config.id);
                                            }}
                                            className="w-4 h-4 rounded border-theme-border text-emerald-600 focus:ring-emerald-500"
                                        />
                                    </label>
                                ))}
                            </div>
                            
                            <div className="mt-6 pt-6 border-t border-theme-border">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={config.preferences?.critical_only === true}
                                        onChange={async (e) => {
                                            const newPrefs = { ...config.preferences, critical_only: e.target.checked };
                                            setConfig({ ...config, preferences: newPrefs });
                                            await supabase.from('seller_telegram_configs').update({ preferences: newPrefs }).eq('id', config.id);
                                        }}
                                        className="w-4 h-4 rounded border-theme-border text-amber-600 focus:ring-amber-500"
                                    />
                                    <div>
                                        <span className="text-sm font-bold text-theme-text block">⚠️ Critical Alerts Only</span>
                                        <span className="text-xs text-theme-muted">Only receive warnings and errors (e.g. low stock)</span>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </>
                )}

                <div className="mb-4">
                    <p className="text-xs font-semibold text-theme-muted mb-1">OPTIONAL: Localhost / Tunnel URL</p>
                    <input
                        type="url"
                        placeholder="e.g. https://crazy-cat-42.loca.lt"
                        value={customAppUrl}
                        onChange={(e) => setCustomAppUrl(e.target.value)}
                        className="w-full text-sm border border-theme-border rounded-lg bg-theme-bg text-theme-text placeholder:text-theme-muted/50 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                    />
                    <p className="text-[10px] text-theme-muted/70 mt-1">If using localhost, paste your ngrok/localtunnel URL here before clicking 'Sync Menu Btn'.</p>
                </div>

                {step === 'verify' && (
                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-6 mb-8">
                        <div className="flex items-start gap-4">
                            <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
                                <AlertCircle size={20} />
                            </div>
                            <div>
                                <h4 className="font-bold text-lg text-amber-900 mb-2">One Last Step!</h4>
                                <p className="text-sm text-amber-800 mb-4 leading-relaxed">
                                    We've registered your bot, but we need to link your chat.
                                    Please click the button below to open Telegram and tap <strong>Start</strong>.
                                </p>

                                <a
                                    href={`https://t.me/${config?.bot_username}?start=${config?.id}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-2 bg-amber-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-amber-600 transition-colors shadow-sm"
                                >
                                    <Send size={18} />
                                    Connect in Telegram
                                </a>

                                <div className="mt-4 flex items-center gap-2 text-xs text-amber-700/70">
                                    <Loader2 size={12} className="animate-spin" />
                                    Waiting for you to start the bot...
                                    <button onClick={fetchConfig} className="ml-2 font-bold underline hover:text-amber-800">
                                        Check Status
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {step === 'input' && (
                    <div className="space-y-6">
                        <div className="bg-blue-50 border border-blue-100 p-6 rounded-xl">
                            <h4 className="font-bold text-blue-900 mb-2">How to get a Token?</h4>
                            <ol className="list-decimal list-inside text-sm text-blue-800/80 space-y-2">
                                <li>Open <strong>@BotFather</strong> in Telegram</li>
                                <li>Send command <code>/newbot</code></li>
                                <li>Follow instructions to correct a name and username</li>
                                <li>Copy the <strong>HTTP API Token</strong> provided</li>
                            </ol>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-theme-muted uppercase tracking-wider mb-2">
                                Bot Token
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={botToken}
                                    onChange={(e) => setBotToken(e.target.value)}
                                    placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                                    className="w-full bg-theme-bg border border-theme-border rounded-xl px-4 py-3 text-theme-text font-mono text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                                />
                                {botToken && (
                                    <button
                                        onClick={() => setBotToken('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-muted hover:text-theme-text"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 text-red-500 text-sm font-medium bg-red-50 p-3 rounded-lg border border-red-100">
                                <AlertCircle size={16} />
                                {error}
                            </div>
                        )}

                        <button
                            onClick={handleConnect}
                            disabled={connecting || !botToken}
                            className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-blue-200 flex items-center justify-center gap-2"
                        >
                            {connecting ? <Loader2 className="animate-spin" /> : <RefreshCw size={18} />}
                            {connecting ? 'Verifying Token...' : 'Connect Bot'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
