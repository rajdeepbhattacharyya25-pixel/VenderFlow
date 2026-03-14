import React, { useState } from 'react';
import { Sparkles, TrendingUp, TrendingDown, Target, Zap, Loader2, MessageSquare, ChevronRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface OracleInsight {
    title: string;
    action: string;
    impact: 'high' | 'medium' | 'low';
}

interface OracleResult {
    summary: string;
    strengths: string[];
    weaknesses: string[];
    recommendations: OracleInsight[];
    isUpgradeRequired?: boolean;
    error?: string;
}

interface AnalyticsAIOracleProps {
    revenueStats: any;
    topProducts: any[];
    chartData: any[];
}

export const AnalyticsAIOracle: React.FC<AnalyticsAIOracleProps> = ({ revenueStats, topProducts, chartData }) => {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [result, setResult] = useState<OracleResult | null>(null);

    const runOracle = async () => {
        setIsAnalyzing(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            const { data, error } = await supabase.functions.invoke('seller-analytics-oracle', {
                body: { 
                    sellerId: user.id,
                    analyticsData: { revenueStats, topProducts, chartData }
                },
            });

            if (error) throw error;
            setResult(data);
        } catch (error) {
            console.error(error);
            alert("Oracle analysis failed. Please try again later.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const getImpactColor = (impact: string) => {
        switch (impact) {
            case 'high': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
            case 'medium': return 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20';
            default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
        }
    };

    return (
        <div className="bg-white dark:bg-white/[0.03] backdrop-blur-md border border-indigo-500/20 rounded-2xl overflow-hidden shadow-2xl shadow-indigo-500/10 mb-8 transition-all hover:border-indigo-500/40">
            <div className="p-6 md:p-8">
                {!result && !isAnalyzing ? (
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-6">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center relative shadow-lg shadow-indigo-500/20">
                                <Sparkles className="w-8 h-8 text-white animate-pulse" />
                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full border-2 border-white dark:border-neutral-900" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-gray-900 dark:text-white mb-1">Consult the Analytics Oracle</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Get AI-powered business intelligence summaries and growth suggestions.</p>
                            </div>
                        </div>
                        <button
                            onClick={runOracle}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all active:scale-95 whitespace-nowrap"
                        >
                            <Zap className="w-4 h-4" />
                            Run Oracle Audit
                        </button>
                    </div>
                ) : isAnalyzing ? (
                    <div className="flex flex-col items-center justify-center py-12 space-y-4">
                        <div className="relative">
                            <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
                            <Sparkles className="w-4 h-4 text-amber-400 absolute top-0 right-0 animate-bounce" />
                        </div>
                        <div className="text-center">
                            <p className="text-lg font-black text-gray-900 dark:text-white">Oracle is analyzing your data...</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 uppercase tracking-widest font-bold">Scanning Trends • Checking Refunds • Strategying</p>
                        </div>
                    </div>
                ) : result?.isUpgradeRequired ? (
                    <div className="p-6 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-4 text-center md:text-left">
                            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                                <AlertCircle className="w-6 h-6 text-amber-500" />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900 dark:text-white">Premium Feature</h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400">The Analytics Oracle is exclusively for Pro & Premium plan subscribers.</p>
                            </div>
                        </div>
                        <button className="bg-amber-500 text-white px-6 py-2.5 rounded-xl font-black text-sm uppercase tracking-wider shadow-lg shadow-amber-500/20 transition-all hover:scale-105 active:scale-95 whitespace-nowrap">
                            Upgrade Now
                        </button>
                    </div>
                ) : (
                    <div className="space-y-8 animate-[fadeIn_0.5s_ease-out]">
                        {/* Summary */}
                        <div className="flex flex-col md:flex-row gap-6 items-start">
                             <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0">
                                <MessageSquare className="w-6 h-6 text-indigo-500" />
                            </div>
                            <div className="flex-1">
                                <h4 className="text-xs font-black text-indigo-500 uppercase tracking-[0.2em] mb-2">The Oracle's Verdict</h4>
                                <p className="text-xl font-bold text-gray-900 dark:text-white italic leading-relaxed">
                                    "{result?.summary}"
                                </p>
                            </div>
                            <button 
                                onClick={() => setResult(null)}
                                className="text-[10px] font-black text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 uppercase tracking-widest transition-colors py-2"
                            >
                                Re-Audit
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Strengths */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-emerald-500 mb-1">
                                    <TrendingUp className="w-4 h-4" />
                                    <h5 className="text-xs font-black uppercase tracking-widest">Business Strengths</h5>
                                </div>
                                {result?.strengths.map((s, i) => (
                                    <div key={i} className="flex gap-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-sm font-medium text-gray-700 dark:text-gray-300">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                        {s}
                                    </div>
                                ))}
                            </div>

                            {/* Weaknesses/Risks */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-rose-500 mb-1">
                                    <TrendingDown className="w-4 h-4" />
                                    <h5 className="text-xs font-black uppercase tracking-widest">Risks & Leaks</h5>
                                </div>
                                {result?.weaknesses.map((w, i) => (
                                    <div key={i} className="flex gap-3 p-3 rounded-xl bg-rose-500/5 border border-rose-500/10 text-sm font-medium text-gray-700 dark:text-gray-300">
                                        <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                                        {w}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Recommendations */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-indigo-500 mb-1">
                                <Target className="w-4 h-4" />
                                <h5 className="text-xs font-black uppercase tracking-widest">Oracle Growth Map</h5>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {result?.recommendations.map((rec, i) => (
                                    <div key={i} className="group p-5 rounded-2xl bg-gray-50/50 dark:bg-neutral-800/50 border border-gray-100 dark:border-white/[0.05] hover:border-indigo-500/30 transition-all hover:scale-[1.02] cursor-default">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${getImpactColor(rec.impact)}`}>
                                                {rec.impact} Impact
                                            </span>
                                            <ChevronRight className="w-3 h-3 text-gray-400 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                                        </div>
                                        <h6 className="font-bold text-gray-900 dark:text-white mb-2">{rec.title}</h6>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{rec.action}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
