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

    useEffect(() => {
        fetchConfig();
    }, []);

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
            // Call Edge Function
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/telegram-seller-manager`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({
                    action: 'connect_bot',
                    bot_token: botToken
                })
            });

            const result = await res.json();

            if (!res.ok) {
                throw new Error(result.error || 'Failed to connect bot');
            }

            // Success
            await fetchConfig(); // Reload config
            setStep('verify');

        } catch (err: any) {
            console.error(err);
            setError(err.message || "Something went wrong");
        } finally {
            setConnecting(false);
        }
    };

    if (loading) return <div className="p-8"><Loader2 className="animate-spin text-primary" /></div>;

    const renderHeader = (title: string, icon: React.ReactNode) => (
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                {icon}
            </div>
            <h3 className="font-bold text-lg text-gray-900">{title}</h3>
        </div>
    );

    return (
        <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm animate-fadeIn">
            {renderHeader('Telegram Bot Configuration', <Send size={20} />)}

            <div className="max-w-2xl">
                {/* Status Cards */}
                {step === 'connected' && (
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
                            <button className="text-sm font-bold text-green-700 hover:underline">
                                Test Notification
                            </button>
                        </div>
                    </div>
                )}

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
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                Bot Token
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={botToken}
                                    onChange={(e) => setBotToken(e.target.value)}
                                    placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 font-mono text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                />
                                {botToken && (
                                    <button
                                        onClick={() => setBotToken('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
