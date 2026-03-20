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
    Wallet,
    Settings2,
    ArrowRightCircle,
    CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../../lib/supabase';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    thinking?: string;
    key_stats?: string[];
    recommendation?: string;
    explanation_layer?: {
        bullets: string[];
        key_metrics: string[];
        why_summary: string;
    };
    action_url?: string;
}

const OracleHeader: React.FC<{ 
    isSimulating: boolean; 
    onToggleSim: () => void; 
    onClose: () => void 
}> = ({ isSimulating, onToggleSim, onClose }) => (
    <div className="p-6 border-b border-neutral-800/50 flex items-center justify-between bg-neutral-900/40 sticky top-0 backdrop-blur-xl z-20">
        <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all duration-500 ${
                isSimulating 
                    ? 'bg-amber-500/10 border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]' 
                    : 'bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
            }`}>
                <Sparkles className={`w-5 h-5 animate-pulse transition-colors duration-500 ${isSimulating ? 'text-amber-400' : 'text-emerald-400'}`} />
            </div>
            <div>
                <h2 className="text-base font-bold text-white tracking-tight leading-tight">Financial Oracle</h2>
                <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">Cognitive Analysis Mode</p>
            </div>
        </div>
        <div className="flex items-center gap-2">
            <button 
                onClick={onToggleSim}
                className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all duration-300 ${
                    isSimulating 
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
                        : 'hover:bg-neutral-800 text-neutral-400'
                }`}
                title="Scenario Simulation Mode"
            >
                <Settings2 size={18} />
            </button>
            <button 
                onClick={onClose}
                className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-neutral-800 transition-colors text-neutral-400"
                title="Close"
            >
                <X size={18} />
            </button>
        </div>
    </div>
);

const OracleAssistantMessage: React.FC<{ msg: Message }> = ({ msg }) => {
    const [showThinking, setShowThinking] = useState(false);

    return (
        <div className="flex flex-col items-start w-full">
            <div className="max-w-[95%] w-full p-6 rounded-2xl bg-neutral-900/60 text-neutral-200 rounded-tl-none border border-neutral-800/50 shadow-2xl backdrop-blur-sm relative overflow-hidden group">
                {/* Accent Glow */}
                <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.3)]" />
                
                <div className="flex items-center gap-2 mb-4">
                    <CheckCircle2 size={12} className="text-emerald-500" />
                    <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">Oracle Analysis</span>
                </div>

                {msg.thinking && (
                    <div className="mb-4">
                        <button 
                            onClick={() => setShowThinking(!showThinking)}
                            className="flex items-center gap-2 text-[10px] text-neutral-500 uppercase font-bold hover:text-neutral-400 transition-colors"
                        >
                            {showThinking ? 'Hide Logical Steps' : 'View Internal Reasoning'}
                            <ChevronRight size={10} className={`transition-transform ${showThinking ? 'rotate-90' : ''}`} />
                        </button>
                        <AnimatePresence>
                            {showThinking && (
                                <motion.div 
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden mt-2 bg-black/20 p-3 rounded-lg border border-white/5"
                                >
                                    <p className="text-[11px] text-neutral-500 italic leading-relaxed font-mono">
                                        {msg.thinking}
                                    </p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}

                <p className="text-sm leading-relaxed whitespace-pre-wrap font-medium">{msg.content}</p>
                
                {msg.explanation_layer && (
                    <div className="mt-6 space-y-4 pt-4 border-t border-white/5">
                        <div>
                            <p className="text-[10px] uppercase font-bold text-neutral-500 mb-3 tracking-widest flex items-center gap-2">
                                <PieChart size={12} className="text-emerald-500" />
                                Strategic Explanation
                            </p>
                            <ul className="grid grid-cols-1 gap-2.5">
                                {msg.explanation_layer.bullets.map((bullet, i) => (
                                    <li key={i} className="text-xs text-neutral-300 flex items-start gap-3">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/60 mt-1.5 flex-shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                                        {bullet}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 pt-2">
                            {msg.explanation_layer.key_metrics.map((metric, i) => (
                                <div key={i} className="px-3 py-1.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-[10px] font-bold text-emerald-400 shadow-sm">
                                    {metric}
                                </div>
                            ))}
                        </div>

                        <div className="bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-xl relative group">
                            <div className="absolute top-2 right-3 opacity-20 group-hover:opacity-40 transition-opacity">
                                <Sparkles size={14} className="text-emerald-500" />
                            </div>
                            <p className="text-[11px] text-emerald-200/90 leading-relaxed italic font-medium">
                                "{msg.explanation_layer.why_summary}"
                            </p>
                        </div>
                    </div>
                )}

                {msg.key_stats && (
                    <div className="mt-6 grid grid-cols-1 gap-2">
                        {msg.key_stats.map((stat, i) => (
                            <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/5 hover:border-emerald-500/30 transition-colors group/stat">
                                <div className="flex items-center gap-3">
                                    <TrendingUp size={14} className="text-emerald-500" />
                                    <span className="text-xs text-neutral-300 font-medium">{stat}</span>
                                </div>
                                <ChevronRight size={12} className="text-neutral-600 group-hover/stat:translate-x-1 transition-transform" />
                            </div>
                        ))}
                    </div>
                )}
                
                {msg.recommendation && (
                    <div className="mt-8 pt-6 border-t border-white/10 relative">
                        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-bold text-neutral-500 mb-3">
                            <AlertCircle size={12} className="text-emerald-500" />
                            Recommended Action
                        </div>
                        <div className="space-y-4">
                            <p className="text-sm text-emerald-50 font-bold leading-snug">{msg.recommendation}</p>
                            {msg.action_url && (
                                <a 
                                    href={msg.action_url}
                                    className="flex items-center justify-center gap-2 text-xs text-white bg-emerald-600 py-3 rounded-xl font-bold hover:bg-emerald-500 transition-all shadow-[0_4px_20px_rgba(16,185,129,0.2)] hover:shadow-[0_4px_25px_rgba(16,185,129,0.3)] active:scale-95 group"
                                >
                                    Execute Strategic Decision
                                    <ArrowRightCircle size={16} className="group-hover:translate-x-1 transition-transform" />
                                </a>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const FinancialOracle: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSimulating, setIsSimulating] = useState(false);
    const [simSettings, setSimSettings] = useState({
        reserve_rate: 0.10,
        payout_delay_days: 7
    });
    const scrollRef = useRef<HTMLDivElement>(null);

    // Initial greeting
    useEffect(() => {
        if (messages.length === 0) {
            setMessages([{
                id: '1',
                role: 'assistant',
                content: "Greetings, I am the VendorFlow Financial Oracle. I have audited the marketplace ledger and am ready to provide cashflow clarity. What would you like to analyze today?",
                key_stats: ["Overall GMV: +12% this week", "Reserves: 3 Pending Releases", "Disputes: 0 Critical"],
                recommendation: "Check the upcoming reserve release for Seller 'Nexus Store'.",
                explanation_layer: {
                    bullets: ["Ledger shows healthy inflow", "Minor dispute overhead in high-risk zones"],
                    key_metrics: ["GMV: ₹45,200", "Risk: 14%"],
                    why_summary: "High liquidity allows for minor reserve adjustments."
                }
            }]);
        }
    }, [messages.length]);

    // Scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages.length, isLoading]);

    const handleSend = async (overrideInput?: string) => {
        const queryText = overrideInput || input;
        if (!queryText.trim() || isLoading) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: queryText
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const { data, error } = await supabase.functions.invoke('ai-oracle-brain', {
                body: { 
                    query: queryText,
                    scenario_overrides: isSimulating ? simSettings : null
                }
            });

            if (error) throw error;

            const assistantMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                thinking: data.thinking,
                content: data.analysis,
                key_stats: data.key_stats,
                recommendation: data.recommended_action,
                explanation_layer: data.explanation_layer,
                action_url: data.action_url
            };

            setMessages(prev => [...prev, assistantMsg]);
        } catch (error: unknown) {
            console.error('Oracle Error:', error);
            const errMsg = error instanceof Error ? error.message : "Possible JSON Parse Error or Network Issue";
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: "I encountered a minor fracture in my financial perception: " + errMsg
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
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
                    />

                    {/* Main Container */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        className="fixed top-0 right-0 h-full w-full sm:max-w-[480px] bg-neutral-900/90 border-l border-neutral-800/50 z-[70] flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.5)] backdrop-blur-2xl"
                    >
                        <OracleHeader 
                            isSimulating={isSimulating}
                            onToggleSim={() => setIsSimulating(!isSimulating)}
                            onClose={onClose}
                        />

                        {/* Simulation Bar */}
                        <AnimatePresence>
                            {isSimulating && (
                                <motion.div 
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="bg-amber-500/5 border-b border-amber-500/20 overflow-hidden"
                                >
                                    <div className="p-6 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Settings2 size={12} className="text-amber-500" />
                                                <span className="text-[10px] font-bold text-amber-500 uppercase tracking-[0.2em]">Simulation Overrides</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <div className="h-1 w-1 rounded-full bg-amber-500 animate-pulse" />
                                                <span className="text-[9px] text-amber-500/60 font-medium uppercase">Active</span>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider">Reserve Rate</label>
                                                <div className="flex gap-2">
                                                    {[0.05, 0.10, 0.15].map(rate => (
                                                        <button 
                                                            key={rate}
                                                            onClick={() => setSimSettings(s => ({ ...s, reserve_rate: rate }))}
                                                            className={`flex-1 py-2 rounded-lg text-[10px] font-bold border transition-all ${
                                                                simSettings.reserve_rate === rate 
                                                                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.2)]' 
                                                                    : 'bg-neutral-800 border-neutral-700 text-neutral-500 hover:border-neutral-600'
                                                            }`}
                                                        >
                                                            {rate * 100}%
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider">Payout Delay</label>
                                                <div className="flex gap-2">
                                                    {[3, 7, 14].map(days => (
                                                        <button 
                                                            key={days}
                                                            onClick={() => setSimSettings(s => ({ ...s, payout_delay_days: days }))}
                                                            className={`flex-1 py-2 rounded-lg text-[10px] font-bold border transition-all ${
                                                                simSettings.payout_delay_days === days 
                                                                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.2)]' 
                                                                    : 'bg-neutral-800 border-neutral-700 text-neutral-500 hover:border-neutral-600'
                                                            }`}
                                                        >
                                                            T+{days}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Chat Context / Messages */}
                        <div 
                            ref={scrollRef}
                            className="flex-1 overflow-y-auto p-6 space-y-10 scroll-smooth"
                        >
                            {messages.map((msg) => (
                                <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start animate-in fade-in slide-in-from-bottom-4 duration-500'}`}>
                                    {msg.role === 'user' ? (
                                        <div className="max-w-[85%] p-4 rounded-2xl bg-emerald-600/90 text-white rounded-tr-none shadow-lg backdrop-blur-sm border border-emerald-500/30">
                                            <p className="text-sm leading-relaxed font-medium">{msg.content}</p>
                                        </div>
                                    ) : (
                                        <OracleAssistantMessage msg={msg} />
                                    )}
                                </div>
                            ))}

                            {isLoading && (
                                <div className="flex items-center gap-4 text-neutral-500">
                                    <div className="w-10 h-10 rounded-xl bg-neutral-800/50 flex items-center justify-center border border-neutral-800 animate-pulse">
                                        <Loader2 size={16} className="animate-spin text-emerald-500" />
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-500/80">Cognitive Hub</span>
                                        <p className="text-xs text-neutral-400">Verifying Ledger Integrity...</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Quick Action Tiles */}
                        {messages.length < 3 && !isLoading && (
                            <div className="px-6 pb-6 mt-auto">
                                <p className="text-[10px] uppercase font-bold text-neutral-500 mb-4 tracking-[0.2em]">Strategic Shortcuts</p>
                                <div className="grid grid-cols-1 gap-2.5">
                                    {quickTiles.map((tile, i) => (
                                        <button
                                            key={i}
                                            onClick={() => handleSend(tile.label)}
                                            className="flex items-center justify-between p-4 rounded-2xl bg-neutral-800/30 border border-neutral-800/50 hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all duration-300 text-left text-sm text-neutral-300 group shadow-sm"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="p-2 rounded-lg bg-neutral-800 transition-colors group-hover:bg-emerald-500/10">
                                                    <tile.icon size={18} className="text-neutral-500 group-hover:text-emerald-400 transition-colors" />
                                                </div>
                                                <span className="font-semibold">{tile.label}</span>
                                            </div>
                                            <ChevronRight size={14} className="text-neutral-700 group-hover:text-emerald-400 group-hover:translate-x-1 transition-transform" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Input Footer */}
                        <div className="p-6 border-t border-neutral-800/50 bg-neutral-900/60 backdrop-blur-xl sticky bottom-0 z-20">
                            <div className="relative group">
                                <input 
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                                    placeholder={isSimulating ? "Simulate financial scenario..." : "Query the Oracle..."}
                                    className={`w-full bg-neutral-800/50 border border-neutral-800 rounded-2xl py-5 pl-6 pr-16 text-sm text-white transition-all duration-300 placeholder:text-neutral-600 shadow-inner ${
                                        isSimulating 
                                            ? 'focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50' 
                                            : 'focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50'
                                    }`}
                                />
                                <button
                                    onClick={() => handleSend()}
                                    disabled={!input.trim() || isLoading}
                                    className={`absolute right-2.5 top-2.5 w-11 h-11 rounded-xl text-white flex items-center justify-center transition-all duration-300 disabled:opacity-50 disabled:grayscale ${
                                        isSimulating 
                                            ? 'bg-amber-600 hover:bg-amber-500 shadow-[0_4px_15px_rgba(245,158,11,0.3)]' 
                                            : 'bg-emerald-600 hover:bg-emerald-500 shadow-[0_4px_15px_rgba(16,185,129,0.3)]'
                                    }`}
                                    aria-label="Send query"
                                >
                                    <Send size={20} className="ml-1" />
                                </button>
                            </div>
                            <div className="flex items-center justify-between mt-5">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                    <p className="text-[9px] text-neutral-500 uppercase font-black tracking-widest">
                                        LDGR-V4 VERIFIED
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-white/5 border border-white/5">
                                    <ShieldCheck size={10} className="text-emerald-500" />
                                    <span className="text-[9px] text-neutral-400 font-bold uppercase tracking-widest">Secure Ledger Node</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default FinancialOracle;

