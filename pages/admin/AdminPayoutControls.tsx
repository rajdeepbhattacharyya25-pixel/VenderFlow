import React, { useState, useEffect } from 'react';
import { 
    ShieldAlert, 
    RefreshCw, 
    Power, 
    AlertTriangle, 
    UserX, 
    UserCheck, 
    History, 
    ChevronRight,
    Search,
    Lock,
    Unlock,
    Info,
    CheckCircle,
    X
} from 'lucide-react';
import { adminDb } from '../../lib/admin-api';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';

interface HighRiskSeller {
    id: string;
    seller_id: string;
    payout_status: string;
    auto_gate_reason: string;
    manual_hold_reason: string;
    updated_at: string;
    sellers: { store_name: string; slug: string };
    seller_risk_scores: { risk_score: number; risk_level: string }[];
}

interface AuditLog {
    id: string;
    action: string;
    reason: string;
    created_at: string;
    profiles: { full_name: string };
}

const AdminPayoutControls: React.FC = () => {
    const [payoutsEnabled, setPayoutsEnabled] = useState<boolean | null>(null);
    const [highRiskSellers, setHighRiskSellers] = useState<HighRiskSeller[]>([]);
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    
    // Safety Modals
    const [confirmModal, setConfirmModal] = useState<{
        type: 'global' | 'seller';
        targetId?: string;
        targetName?: string;
        action: 'hold' | 'release' | 'enable' | 'disable';
    } | null>(null);
    const [actionReason, setActionReason] = useState('');

    const fetchData = async () => {
        setLoading(true);
        try {
            const [config, sellers, logs] = await Promise.all([
                adminDb.getSystemConfig(),
                adminDb.getHighRiskSellers(),
                adminDb.getAdminAuditLogs(10)
            ]);
            setPayoutsEnabled(config.payouts_enabled);
            setHighRiskSellers(sellers as unknown as HighRiskSeller[]);
            setAuditLogs(logs as unknown as AuditLog[]);
        } catch (error) {
            console.error('Error fetching controls:', error);
            toast.error('Failed to sync safety data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleGlobalToggle = async () => {
        if (payoutsEnabled === null) return;
        setIsUpdating(true);
        try {
            await adminDb.updateGlobalPayoutToggle(!payoutsEnabled);
            toast.success(`Global payouts ${!payoutsEnabled ? 'enabled' : 'disabled'}`);
            setConfirmModal(null);
            setActionReason('');
            fetchData();
        } catch (error) {
            toast.error('Toggle failed');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleSellerAction = async () => {
        if (!confirmModal?.targetId || !actionReason.trim()) return;
        setIsUpdating(true);
        try {
            const newStatus = confirmModal.action === 'hold' ? 'held_manual' : 'active';
            await adminDb.updateSellerPayoutStatus(confirmModal.targetId, newStatus as any, actionReason);
            toast.success(`Seller status updated`);
            setConfirmModal(null);
            setActionReason('');
            fetchData();
        } catch (error) {
            toast.error('Action failed');
        } finally {
            setIsUpdating(false);
        }
    };

    const getRiskColor = (score: number) => {
        if (score >= 80) return 'text-red-500';
        if (score >= 50) return 'text-amber-500';
        return 'text-emerald-500';
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 bg-[#0B0F19] min-h-screen text-neutral-100 p-2 md:p-4">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-1 flex items-center gap-3">
                        <ShieldAlert className="text-red-500" />
                        Payout Control Center
                    </h1>
                    <p className="text-neutral-500 text-xs md:text-sm font-mono uppercase tracking-widest flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
                        High-Risk Monitoring & Emergency Controls
                    </p>
                </div>
                <button
                    onClick={fetchData}
                    title="Sync Data"
                    className="p-2 hover:bg-white/5 rounded-md border border-white/10 transition-colors"
                >
                    <RefreshCw size={18} className={`text-neutral-400 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Global Kill Switch */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-[#111827] border border-red-500/20 rounded-md p-6 relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-red-500/50 to-transparent"></div>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-sm font-bold font-mono tracking-widest uppercase text-red-500">Emergency Stop</h2>
                            <Power size={16} className={payoutsEnabled ? 'text-emerald-500' : 'text-red-500'} />
                        </div>
                        
                        <div className="space-y-4">
                            <p className="text-xs text-neutral-400 font-mono leading-relaxed">
                                This switch controls ALL automated payouts across the entire platform. 
                                Disabling this will block all scheduled Razorpay transfers.
                            </p>
                            
                            <div className="bg-black/40 p-4 rounded border border-white/5 flex items-center justify-between">
                                <span className="font-mono text-xs font-bold uppercase">System Status</span>
                                <span className={`font-mono text-xs font-bold uppercase ${payoutsEnabled ? 'text-emerald-500' : 'text-red-500 animate-pulse'}`}>
                                    {payoutsEnabled ? 'Online & Fluid' : 'PAUSED / LOCKED'}
                                </span>
                            </div>

                            <button
                                onClick={() => setConfirmModal({
                                    type: 'global',
                                    action: payoutsEnabled ? 'disable' : 'enable'
                                })}
                                className={`w-full py-4 rounded-md font-mono text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 border ${
                                    payoutsEnabled 
                                    ? 'bg-red-600/10 border-red-500 text-red-500 hover:bg-red-600/20' 
                                    : 'bg-emerald-600/10 border-emerald-500 text-emerald-400 hover:bg-emerald-600/20'
                                } shadow-[0_0_20px_rgba(0,0,0,0.3)]`}
                            >
                                {payoutsEnabled ? <Lock size={14} /> : <Unlock size={14} />}
                                {payoutsEnabled ? 'Kill Payout Logic' : 'Enable Transfers'}
                            </button>
                        </div>
                    </div>

                    {/* Audit Logs Quick View */}
                    <div className="bg-[#111827] border border-white/5 rounded-md p-5">
                        <h3 className="text-xs font-bold text-neutral-400 font-mono uppercase tracking-widest mb-4 border-b border-white/5 pb-2 flex items-center gap-2">
                            <History size={14} /> Safety Audit Logs
                        </h3>
                        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {auditLogs.map((log) => (
                                <div key={log.id} className="text-[10px] font-mono border-l border-white/10 pl-3">
                                    <p className="text-neutral-500 mb-1">{format(new Date(log.created_at), 'MMM dd HH:mm')}</p>
                                    <p className="text-white font-bold">{log.action.replace(/_/g, ' ')}</p>
                                    <p className="text-neutral-400 italic">"{log.reason}"</p>
                                    <p className="text-indigo-400 mt-1">By: {log.profiles?.full_name || 'Admin'}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* High-Risk Sellers List */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="bg-[#111827] border border-white/5 rounded-md overflow-hidden h-full flex flex-col">
                        <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5">
                            <h2 className="text-sm font-bold font-mono tracking-widest uppercase text-white">Merchant Gating Queue</h2>
                            <div className="flex items-center gap-2 bg-black/40 rounded px-3 py-1 border border-white/5">
                                <Search size={14} className="text-neutral-500" />
                                <input 
                                    type="text" 
                                    placeholder="Filter by slug..." 
                                    className="bg-transparent border-none text-[10px] font-mono text-white placeholder-neutral-700 outline-none w-32"
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto">
                            <table className="w-full text-left font-mono text-[11px]">
                                <thead>
                                    <tr className="bg-black/20 text-neutral-500 border-b border-white/5 uppercase">
                                        <th className="p-4">Merchant</th>
                                        <th className="p-4">Risk Node</th>
                                        <th className="p-4">Gate State</th>
                                        <th className="p-4">Last Activity</th>
                                        <th className="p-4 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {highRiskSellers.map((seller) => (
                                        <tr key={seller.id} className="hover:bg-white/5 transition-colors group">
                                            <td className="p-4">
                                                <div className="font-bold text-white group-hover:text-indigo-400">{seller.sellers.store_name}</div>
                                                <div className="text-[9px] text-neutral-600">{seller.sellers.slug}</div>
                                            </td>
                                            <td className="p-4">
                                                <div className={`font-bold ${getRiskColor(seller.seller_risk_scores[0]?.risk_score || 0)}`}>
                                                    {seller.seller_risk_scores[0]?.risk_score || 0}%
                                                </div>
                                                <div className="text-[9px] text-neutral-600 uppercase tracking-tighter">
                                                    {seller.seller_risk_scores[0]?.risk_level || 'LOW'}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2 py-0.5 rounded-sm border inline-block ${
                                                    seller.payout_status === 'active' 
                                                    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' 
                                                    : seller.payout_status === 'held_manual'
                                                    ? 'text-red-400 bg-red-500/10 border-red-500/20'
                                                    : 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                                                } text-[9px] font-bold uppercase`}>
                                                    {seller.payout_status.replace(/_/g, ' ')}
                                                </span>
                                            </td>
                                            <td className="p-4 text-neutral-500">
                                                {format(new Date(seller.updated_at), 'MM/dd HH:mm')}
                                            </td>
                                            <td className="p-4 text-right">
                                                <button 
                                                    onClick={() => setConfirmModal({
                                                        type: 'seller',
                                                        targetId: seller.seller_id,
                                                        targetName: seller.sellers.store_name,
                                                        action: seller.payout_status === 'active' ? 'hold' : 'release'
                                                    })}
                                                    className={`px-3 py-1 rounded-sm border ${
                                                        seller.payout_status === 'active'
                                                        ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
                                                        : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                                                    } text-[9px] font-bold uppercase transition-all`}
                                                >
                                                    {seller.payout_status === 'active' ? 'Enforce Hold' : 'Release Gate'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* Confirmation Modal */}
            {confirmModal && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-[#0B0F19] border border-red-500/30 shadow-[0_0_50px_rgba(239,68,68,0.1)] rounded-md w-full md:max-w-md p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
                            <AlertTriangle className="text-red-500" size={24} />
                            <h2 className="text-lg font-mono font-bold text-white tracking-widest uppercase">Security Confirmation</h2>
                        </div>

                        <div className="space-y-4 mb-8">
                            <p className="text-sm font-mono text-neutral-300 leading-relaxed">
                                {confirmModal.type === 'global' ? (
                                    <>You are about to <span className="text-red-500 font-bold">{confirmModal.action.toUpperCase()}</span> global payouts for the entire platform.</>
                                ) : (
                                    <>You are <span className="text-indigo-400 font-bold">{confirmModal.action === 'hold' ? 'HOLDING' : 'RELEASING'}</span> payouts for <span className="text-white font-bold">{confirmModal.targetName}</span>.</>
                                )}
                            </p>

                            <div>
                                <label className="block text-[9px] font-mono uppercase tracking-widest text-neutral-500 mb-2">Mandatory Reason Memo</label>
                                <textarea 
                                    autoFocus
                                    value={actionReason}
                                    onChange={(e) => setActionReason(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-sm p-3 text-xs font-mono text-white focus:outline-none focus:border-red-500/50 h-24 transition-colors"
                                    placeholder="Enter authorization justification..."
                                />
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setConfirmModal(null);
                                    setActionReason('');
                                }}
                                className="flex-1 py-3 bg-[#111827] border border-white/10 hover:border-white/20 text-white font-mono text-[10px] uppercase tracking-widest rounded-sm transition-colors"
                            >
                                Abort
                            </button>
                            <button
                                onClick={confirmModal.type === 'global' ? handleGlobalToggle : handleSellerAction}
                                disabled={isUpdating || !actionReason.trim()}
                                className="flex-1 py-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:bg-neutral-800 text-white font-mono text-[10px] uppercase tracking-widest rounded-sm transition-all shadow-[0_0_20px_rgba(239,68,68,0.2)]"
                            >
                                {isUpdating ? 'Authorizing...' : 'Confirm Action'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPayoutControls;
