import React, { useState, useEffect, useRef } from 'react';
import { 
    Sparkles, 
    X, 
    Send, 
    TrendingUp, 
    ShieldCheck, 
    AlertCircle, 
    ChevronRight,
    Loader2,
    PieChart,
    Wallet
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../../lib/supabase';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    key_stats?: string[];
    recommendation?: string;
}

const FinancialOracle: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Initial greeting
    useEffect(() => {
        if (messages.length === 0) {
            setMessages([{
                id: '1',
                role: 'assistant',
                content: "Greetings, I am the VendorFlow Financial Oracle. I have audited the marketplace ledger and am ready to provide cashflow clarity. What would you like to analyze today?",
                key_stats: ["Overall GMV: +12% this week", "Reserves: 3 Pending Releases", "Disputes: 0 Critical"],
                recommendation: "Check the upcoming reserve release for Seller 'Nexus Store'."
            }]);
        }
    }, []);

    // Scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const { data, error } = await supabase.functions.invoke('ai-oracle-brain', {
                body: { query: input }
            });

            if (error) throw error;

            const assistantMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.analysis,
                key_stats: data.key_stats,
                recommendation: data.recommended_action
            };

            setMessages(prev => [...prev, assistantMsg]);
        } catch (error) {
            console.error('Oracle Error:', error);
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: "I encountered a minor fracture in my financial perception. Please try again soon."
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const quickTiles = [
        { label: "Analyze Daily GMV Trends", icon: TrendingUp },
        { label: "Examine Payout Gaps", icon: Wallet },
        { label: "Check Risk Distribution", icon: ShieldCheck }
    ];

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]"
                    />

                    {/* Sidebar */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed top-0 right-0 h-full w-full max-w-[420px] bg-neutral-900 border-l border-neutral-800 z-[70] flex flex-col shadow-2xl"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/50 sticky top-0 backdrop-blur-md">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                                    <Sparkles className="text-indigo-400 w-5 h-5 animate-pulse" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-white tracking-tight">Financial Oracle</h2>
                                    <p className="text-xs text-neutral-500">Intelligent Cashflow Analysis</p>
                                </div>
                            </div>
                            <button 
                                onClick={onClose}
                                className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-neutral-800 transition-colors text-neutral-400"
                                aria-label="Close Financial Oracle"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Chat Context / Messages */}
                        <div 
                            ref={scrollRef}
                            className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-neutral-800"
                        >
                            {messages.map((msg) => (
                                <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                    <div className={`max-w-[85%] p-4 rounded-2xl ${
                                        msg.role === 'user' 
                                            ? 'bg-indigo-600 text-white rounded-tr-none' 
                                            : 'bg-neutral-800 text-neutral-200 rounded-tl-none border border-neutral-700/50'
                                    }`}>
                                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                        
                                        {msg.key_stats && (
                                            <div className="mt-4 grid grid-cols-1 gap-2">
                                                {msg.key_stats.map((stat, i) => (
                                                    <div key={i} className="flex items-center gap-2 text-[11px] font-medium bg-black/30 px-2 py-1.5 rounded-lg text-indigo-300">
                                                        <TrendingUp size={12} />
                                                        {stat}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        
                                        {msg.recommendation && (
                                            <div className="mt-4 pt-3 border-t border-white/10">
                                                <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-neutral-400 mb-1">
                                                    <AlertCircle size={10} />
                                                    Recommended Action
                                                </div>
                                                <p className="text-xs text-indigo-200 font-medium italic">{msg.recommendation}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {isLoading && (
                                <div className="flex items-center gap-3 text-neutral-500 animate-pulse">
                                    <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center">
                                        <Loader2 size={14} className="animate-spin" />
                                    </div>
                                    <span className="text-xs">Consulting the ledger...</span>
                                </div>
                            )}
                        </div>

                        {/* Quick Action Tiles */}
                        {messages.length < 3 && !isLoading && (
                            <div className="px-6 pb-4">
                                <p className="text-[10px] uppercase font-bold text-neutral-500 mb-3 tracking-widest">Suggested Inquiries</p>
                                <div className="grid grid-cols-1 gap-2">
                                    {quickTiles.map((tile, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setInput(tile.label)}
                                            className="flex items-center justify-between p-3 rounded-xl bg-neutral-800/50 border border-neutral-800 hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all text-left text-sm text-neutral-300 group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <tile.icon size={16} className="text-neutral-500 group-hover:text-indigo-400" />
                                                {tile.label}
                                            </div>
                                            <ChevronRight size={14} className="text-neutral-600 group-hover:text-indigo-400 group-hover:translate-x-1 transition-transform" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Input Footer */}
                        <div className="p-6 border-t border-neutral-800 bg-neutral-900 sticky bottom-0">
                            <div className="relative">
                                <input 
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                                    placeholder="Type a financial query..."
                                    className="w-full bg-neutral-800 border-none rounded-2xl py-4 pl-5 pr-14 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-neutral-600"
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!input.trim() || isLoading}
                                    className="absolute right-2 top-2 w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-500 transition-all disabled:opacity-50 disabled:bg-neutral-700"
                                    aria-label="Send query"
                                >
                                    <Send size={18} />
                                </button>
                            </div>
                            <p className="text-[10px] text-center text-neutral-600 mt-4">
                                Data is derived from live Double-Entry Ledger and Risk Assessment scores.
                            </p>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default FinancialOracle;
