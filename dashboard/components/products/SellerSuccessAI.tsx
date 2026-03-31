import React, { useState, useEffect } from 'react';
import { Sparkles, TrendingUp, AlertCircle, CheckCircle2, ArrowRight, Loader2, Zap } from 'lucide-react';
import { calculateLocalScore, runDeepAudit, AuditResult } from '../../lib/success-ai';
import { supabase } from '../../../lib/supabase';

interface SellerSuccessAIProps {
    product: {
        name: string;
        description: string;
        category: string | string[];
        images: string[];
        hasVariants: boolean;
        price: number;
        tags?: string[];
    };
    onApplyOptimization: (optimized: AuditResult['optimized']) => void;
}

export const SellerSuccessAI: React.FC<SellerSuccessAIProps> = ({ product, onApplyOptimization }) => {
    const [localScore, setLocalScore] = useState(0);
    const [isAuditing, setIsAuditing] = useState(false);
    const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
    const [sellerId, setSellerId] = useState<string | null>(null);

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) setSellerId(user.id);
        };
        fetchUser();
    }, []);

    useEffect(() => {
        const score = calculateLocalScore({
            name: product.name,
            description: product.description,
            category: product.category,
            hasImages: product.images.length > 0,
            hasVariants: product.hasVariants,
            price: product.price
        });
        setLocalScore(score);
    }, [product]);

    const handleDeepAudit = async () => {
        if (!sellerId) return;
        setIsAuditing(true);
        try {
            const result = await runDeepAudit(sellerId, {
                name: product.name,
                description: product.description,
                category: product.category,
                tags: product.tags || []
            });
            setAuditResult(result);
        } catch (error) {
            console.error(error);
            alert("Deep audit failed. Please try again later.");
        } finally {
            setIsAuditing(false);
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
        if (score >= 50) return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
        return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
    };

    return (
        <div className="space-y-4 animate-[fadeIn_0.3s_ease-out]">
            {/* Score Header */}
            <div className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${getScoreColor(auditResult?.score || localScore)}`}>
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-white/20 backdrop-blur-md">
                        <TrendingUp size={20} />
                    </div>
                    <div>
                        <div className="text-xs font-bold uppercase tracking-wider opacity-70">Listing Success Score</div>
                        <div className="text-2xl font-black">{auditResult?.score || localScore}%</div>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-[10px] font-bold opacity-60 uppercase mb-1">Status</div>
                    <div className="text-xs font-bold">
                        {(auditResult?.score || localScore) >= 80 ? 'Excellent' : (auditResult?.score || localScore) >= 50 ? 'Needs Polish' : 'Critical'}
                    </div>
                </div>
            </div>

            {/* Quick Tips (Local) */}
            {!auditResult && (
                <div className="space-y-2">
                    <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase ml-1">Optimization Tips</div>
                    <div className="grid gap-2">
                        {product.name.length < 10 && (
                            <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700/50 text-xs">
                                <AlertCircle size={14} className="text-amber-500" />
                                <span className="text-gray-600 dark:text-gray-300">Title is too short. Add descriptive keywords.</span>
                            </div>
                        )}
                        {product.description.length < 50 && (
                            <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700/50 text-xs">
                                <AlertCircle size={14} className="text-amber-500" />
                                <span className="text-gray-600 dark:text-gray-300">Add more details in the description.</span>
                            </div>
                        )}
                        {product.images.length === 0 && (
                            <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-100 dark:bg-slate-800 border-2 border-dashed border-rose-500/20 text-xs">
                                <AlertCircle size={14} className="text-rose-500" />
                                <span className="text-rose-600 dark:text-rose-400 font-medium text-amber-500">Add at least one product photo!</span>
                            </div>
                        )}
                        {product.name.length >= 10 && product.description.length >= 50 && product.images.length > 0 && (
                            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-xs">
                                <CheckCircle2 size={14} className="text-emerald-500" />
                                <span className="text-emerald-600 dark:text-emerald-400">Basic foundations look good.</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Deep Audit Button (Pro/Premium) */}
            {!auditResult && (
                <button
                    onClick={handleDeepAudit}
                    disabled={isAuditing}
                    className="w-full flex items-center justify-center gap-2 p-4 bg-gradient-to-br from-emerald-500 to-cyan-600 hover:from-emerald-600 hover:to-cyan-700 text-white rounded-2xl font-bold text-sm shadow-xl shadow-emerald-500/20 transition-all active:scale-95 group overflow-hidden relative"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                    {isAuditing ? (
                        <>
                            <Loader2 size={18} className="animate-spin" />
                            <span>Gemini Analyzing...</span>
                        </>
                    ) : (
                        <>
                            <Sparkles size={18} />
                            <span>Run Deep AI Success Audit</span>
                        </>
                    )}
                </button>
            )}

            {/* AI Results */}
            {auditResult && (
                <div className="space-y-4 animate-[slideUp_0.4s_ease-out]">
                    {auditResult.isUpgradeRequired ? (
                        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-3 text-center">
                            <Zap size={32} className="mx-auto text-amber-500" />
                            <h3 className="font-bold text-amber-600">Upgrade Required</h3>
                            <p className="text-xs text-amber-600/80">Deep AI analysis is a premium feature. Upgrade your plan to unlock deep SEO audits and automated descriptions.</p>
                            <button className="w-full py-2 bg-amber-500 text-white rounded-xl text-sm font-black">Upgrade Now</button>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-2">
                                <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase ml-1">AI Improvement Tips</div>
                                {auditResult.tips.map((tip, i) => (
                                    <div key={i} className="flex items-start gap-2 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-xs">
                                        <ArrowRight size={14} className="text-emerald-500 mt-0.5" />
                                        <span className="text-gray-600 dark:text-gray-300 leading-relaxed">{tip}</span>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={() => onApplyOptimization(auditResult.optimized)}
                                className="w-full flex items-center justify-center gap-2 p-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold text-sm shadow-xl shadow-emerald-500/20 transition-all active:scale-95"
                            >
                                <CheckCircle2 size={18} />
                                <span>Apply AI Optimizations</span>
                            </button>
                            
                            <button
                                onClick={() => setAuditResult(null)}
                                className="w-full text-center text-[10px] font-bold text-gray-400 hover:text-gray-600 uppercase tracking-widest py-2"
                            >
                                Reset Analysis
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};
