import React, { useState, useEffect } from 'react';
import { 
    Gavel, 
    Filter, 
    Search, 
    RefreshCw, 
    AlertCircle, 
    ChevronRight, 
    MessageSquare, 
    CheckCircle2, 
    Clock, 
    ShieldAlert,
    ExternalLink,
    X,
    ChevronLeft,
    Sparkles,
    BrainCircuit
} from 'lucide-react';
import { adminDb } from '../../lib/admin-api';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';

interface Dispute {
    id: string;
    razorpay_dispute_id: string;
    razorpay_payment_id: string;
    amount: number;
    currency: string;
    reason: string;
    status: string;
    seller_id: string;
    sellers: { store_name: string };
    admin_notes: string;
    created_at: string;
    updated_at: string;
}

interface AIAnalysis {
    summary: string;
    evidence: string;
    suggested_resolution: string;
}

const AdminDisputes: React.FC = () => {
    const [disputes, setDisputes] = useState<Dispute[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [adminNote, setAdminNote] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);

    const fetchDisputes = async () => {
        setLoading(true);
        try {
            const data = await adminDb.getDisputes({ status: statusFilter });
            setDisputes(data as unknown as Dispute[]);
        } catch (error) {
            console.error('Error fetching disputes:', error);
            toast.error('Failed to load disputes');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDisputes();
    }, [statusFilter]);

    const handleUpdateDispute = async (status?: string) => {
        if (!selectedDispute) return;
        setIsUpdating(true);
        try {
            await adminDb.updateDispute(selectedDispute.id, {
                status: status || selectedDispute.status,
                admin_notes: adminNote
            });
            toast.success('Dispute updated');
            fetchDisputes();
            setSelectedDispute(prev => prev ? { ...prev, status: status || prev.status, admin_notes: adminNote } : null);
        } catch (error) {
            console.error('Error updating dispute:', error);
            toast.error('Update failed');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleAIAnalysis = async () => {
        if (!selectedDispute) return;
        setIsAnalyzing(true);
        setAiAnalysis(null);
        try {
            const result = await adminDb.analyzeDispute(selectedDispute.id);
            setAiAnalysis(result);
            
            // Prepend AI suggestion to notes if it's not already there
            const aiPrefix = `[AI SUGGESTION - ${format(new Date(), 'MMM dd')}]: `;
            if (!adminNote.includes(aiPrefix)) {
                setAdminNote(prev => `${aiPrefix}${result.suggested_resolution}\n\n${prev}`);
            }
            
            toast.success('AI Analysis complete');
        } catch (error) {
            console.error('Error in AI analysis:', error);
            toast.error('AI Analysis failed');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'open': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
            case 'resolved': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
            case 'lost': return 'text-red-400 bg-red-500/10 border-red-500/20';
            case 'under_review': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
            default: return 'text-neutral-400 bg-neutral-500/10 border-neutral-500/20';
        }
    };

    const formatCurrency = (amount: number, currency: string) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: currency,
        }).format(amount / 100);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 bg-[#0B0F19] min-h-screen text-neutral-100 p-2 md:p-4">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-1 flex items-center gap-3">
                        <Gavel className="text-emerald-500" />
                        Dispute Management
                    </h1>
                    <p className="text-neutral-500 text-xs md:text-sm font-mono uppercase tracking-widest flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                        Monitoring Chargebacks & Financial Safety
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchDisputes}
                        title="Refresh Disputes"
                        className="p-2 hover:bg-white/5 rounded-md border border-white/10 transition-colors"
                    >
                        <RefreshCw size={18} className={`text-neutral-400 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <div className="flex bg-[#111827] border border-white/10 rounded-md p-1">
                        {['all', 'open', 'under_review', 'resolved'].map((s) => (
                            <button
                                key={s}
                                onClick={() => setStatusFilter(s)}
                                className={`px-3 py-1 text-[10px] font-mono uppercase rounded-sm transition-all ${
                                    statusFilter === s 
                                    ? 'bg-emerald-600/20 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]' 
                                    : 'text-neutral-500 hover:text-neutral-300'
                                }`}
                            >
                                {s.replace('_', ' ')}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* List Container */}
                <div className="lg:col-span-2 space-y-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-20 bg-[#111827] border border-white/5 rounded-md">
                            <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
                        </div>
                    ) : disputes.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 bg-[#111827] border border-white/5 rounded-md text-neutral-500">
                            <CheckCircle2 size={48} className="text-emerald-500/20 mb-4" />
                            <p className="font-mono text-sm uppercase">No active disputes founded</p>
                        </div>
                    ) : (
                        <div className="bg-[#111827] border border-white/5 rounded-md overflow-hidden">
                            <table className="w-full text-left font-mono text-xs">
                                <thead>
                                    <tr className="bg-white/5 text-neutral-400 border-b border-white/5">
                                        <th className="p-4 uppercase tracking-widest font-bold">Dispute ID</th>
                                        <th className="p-4 uppercase tracking-widest font-bold">Seller</th>
                                        <th className="p-4 uppercase tracking-widest font-bold">Amount</th>
                                        <th className="p-4 uppercase tracking-widest font-bold">Status</th>
                                        <th className="p-4 uppercase tracking-widest font-bold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {disputes.map((d) => (
                                        <tr 
                                            key={d.id} 
                                            onClick={() => {
                                                setSelectedDispute(d);
                                                setAiAnalysis(null);
                                                setAdminNote(d.admin_notes || '');
                                            }}
                                            className={`hover:bg-emerald-500/5 cursor-pointer transition-colors ${selectedDispute?.id === d.id ? 'bg-emerald-500/10 border-l-2 border-emerald-500' : ''}`}
                                        >
                                            <td className="p-4">
                                                <div className="font-bold text-white truncate w-32">{d.razorpay_dispute_id}</div>
                                                <div className="text-[10px] text-neutral-500">{format(new Date(d.created_at), 'MM/dd HH:mm')}</div>
                                            </td>
                                            <td className="p-4">
                                                <div className="text-emerald-400 font-bold">{d.sellers.store_name}</div>
                                            </td>
                                            <td className="p-4">
                                                <div className="text-white font-bold">{formatCurrency(d.amount, d.currency)}</div>
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2 py-0.5 rounded-sm border ${getStatusColor(d.status)} text-[9px] font-bold uppercase`}>
                                                    {d.status.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right">
                                                <button className="text-emerald-400 hover:text-emerald-300" title="View Details">
                                                    <ChevronRight size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Detail View */}
                <div className="space-y-6">
                    {selectedDispute ? (
                        <div className="bg-[#111827] border border-white/5 rounded-md p-6 sticky top-24 animate-in slide-in-from-right-4 duration-300">
                            <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-4">
                                <h2 className="text-sm font-bold font-mono tracking-widest uppercase text-emerald-400">Management Panel</h2>
                                <button onClick={() => setSelectedDispute(null)} title="Close Panel" className="text-neutral-500 hover:text-white">
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="space-y-6">
                                {/* Dispute HUD */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-black/20 p-3 rounded-md border border-white/5">
                                        <p className="text-[9px] text-neutral-500 uppercase font-mono mb-1">Impact</p>
                                        <p className="text-lg font-bold text-white font-mono">{formatCurrency(selectedDispute.amount, selectedDispute.currency)}</p>
                                    </div>
                                    <div className="bg-black/20 p-3 rounded-md border border-white/5">
                                        <p className="text-[9px] text-neutral-500 uppercase font-mono mb-1">State</p>
                                            <span className={`px-2 py-0.5 rounded-sm border ${getStatusColor(selectedDispute.status)} text-[9px] font-bold uppercase block w-fit mt-1`} title="Current Status">
                                            {selectedDispute.status.replace('_', ' ')}
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-start gap-3">
                                        <Clock size={14} className="text-neutral-500 mt-1" />
                                        <div>
                                            <p className="text-[10px] text-neutral-500 uppercase font-mono">Created On</p>
                                            <p className="text-xs text-neutral-300 font-mono">{format(new Date(selectedDispute.created_at), 'PPP p')}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <ShieldAlert size={14} className="text-neutral-500 mt-1" />
                                        <div className="flex-1">
                                            <p className="text-[10px] text-neutral-500 uppercase font-mono">Reason Code</p>
                                            <p className="text-xs text-neutral-300 font-mono italic">"{selectedDispute.reason}"</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <ExternalLink size={14} className="text-neutral-500 mt-1" />
                                        <div className="flex-1">
                                            <p className="text-[10px] text-neutral-500 uppercase font-mono">Razorpay Payment</p>
                                            <code className="text-xs text-emerald-400 font-mono block truncate">{selectedDispute.razorpay_payment_id}</code>
                                        </div>
                                    </div>
                                </div>

                                {/* AI Intelligence HUD */}
                                <div className="pt-4 border-t border-white/5 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-emerald-400">
                                            <BrainCircuit size={16} />
                                            <h3 className="text-xs font-bold font-mono tracking-widest uppercase">AI Intelligence</h3>
                                        </div>
                                        <button
                                            onClick={handleAIAnalysis}
                                            disabled={isAnalyzing}
                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-sm border transition-all text-[9px] font-mono font-bold uppercase ${
                                                isAnalyzing 
                                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                                                : 'bg-emerald-600 hover:bg-emerald-500 border-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                                            }`}
                                        >
                                            {isAnalyzing ? <RefreshCw size={10} className="animate-spin" /> : <Sparkles size={10} />}
                                            {isAnalyzing ? 'Analyzing...' : 'Analyze with AI'}
                                        </button>
                                    </div>

                                    {aiAnalysis && (
                                        <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-sm p-3 space-y-3 animate-in fade-in zoom-in-95 duration-300">
                                            <div>
                                                <p className="text-[9px] text-emerald-400 uppercase font-mono mb-1 font-bold">Summary</p>
                                                <p className="text-xs text-neutral-300 font-mono leading-relaxed">{aiAnalysis.summary}</p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] text-emerald-400 uppercase font-mono mb-1 font-bold">Evidence Found</p>
                                                <p className="text-xs text-neutral-300 font-mono leading-relaxed">{aiAnalysis.evidence}</p>
                                            </div>
                                            <div className="p-2 bg-emerald-500/10 border-l-2 border-emerald-500">
                                                <p className="text-[9px] text-emerald-400 uppercase font-mono mb-1 font-bold">Proposed Resolution</p>
                                                <p className="text-xs text-white font-mono font-bold">{aiAnalysis.suggested_resolution}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="pt-4 border-t border-white/5">
                                    <label className="block text-[10px] font-mono uppercase tracking-widest text-emerald-400 mb-2">Admin Intelligence Update</label>
                                    <textarea 
                                        value={adminNote}
                                        onChange={(e) => setAdminNote(e.target.value)}
                                        className="w-full bg-black/40 border border-white/10 rounded-sm p-3 text-xs font-mono text-neutral-200 focus:outline-none focus:border-emerald-500 h-24 transition-colors"
                                        placeholder="Enter investigation notes..."
                                    />
                                    <div className="grid grid-cols-2 gap-2 mt-4">
                                        <button 
                                            onClick={() => handleUpdateDispute('under_review')}
                                            disabled={isUpdating}
                                            className="px-3 py-2 bg-[#1a2333] hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-md text-[10px] font-mono uppercase transition-all"
                                        >
                                            Mark Review
                                        </button>
                                        <button 
                                            onClick={() => handleUpdateDispute('resolved')}
                                            disabled={isUpdating}
                                            className="px-3 py-2 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-md text-[10px] font-mono uppercase transition-all"
                                        >
                                            Resolve
                                        </button>
                                        <button 
                                            onClick={() => handleUpdateDispute('lost')}
                                            disabled={isUpdating}
                                            className="px-3 py-2 bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/30 rounded-md text-[10px] font-mono uppercase col-span-2 transition-all"
                                        >
                                            Mark as Lost (Refunded)
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-[#111827] border border-dashed border-white/10 rounded-md p-10 flex flex-col items-center justify-center text-center">
                            <Gavel size={32} className="text-neutral-700 mb-4" />
                            <p className="text-xs text-neutral-500 font-mono uppercase tracking-widest">Select a transmission for deep analysis</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminDisputes;
