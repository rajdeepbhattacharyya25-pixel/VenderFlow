import React, { useState, useEffect } from 'react';
import { Check, X, User, ShoppingBag, ExternalLink, ShieldAlert } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const AdminApprovalPanel: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'products' | 'kyc'>('products');
    const [pendingProducts, setPendingProducts] = useState<any[]>([]);
    const [pendingKYC, setPendingKYC] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'products') {
                const { data, error } = await supabase
                    .from('products')
                    .select('*, sellers(shop_name)')
                    .eq('status', 'pending');
                if (error) throw error;
                setPendingProducts(data || []);
            } else {
                const { data, error } = await supabase
                    .from('sellers')
                    .select('*')
                    .eq('kyc_status', 'pending');
                if (error) throw error;
                setPendingKYC(data || []);
            }
        } catch (err) {
            console.error('Error fetching approvals:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const handleApproveProduct = async (id: string) => {
        const { error } = await supabase.from('products').update({ status: 'active' }).eq('id', id);
        if (!error) fetchData();
    };

    const handleRejectProduct = async (id: string) => {
        const { error } = await supabase.from('products').update({ status: 'rejected' }).eq('id', id);
        if (!error) fetchData();
    };

    const handleApproveKYC = async (id: string) => {
        const { error } = await supabase.from('sellers').update({ kyc_status: 'approved' }).eq('id', id);
        if (!error) fetchData();
    };

    const handleRejectKYC = async (id: string) => {
        const { error } = await supabase.from('sellers').update({ kyc_status: 'rejected' }).eq('id', id);
        if (!error) fetchData();
    };

    return (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
            <div className="flex border-b border-neutral-800">
                <button
                    onClick={() => setActiveTab('products')}
                    className={`flex-1 px-6 py-4 text-sm font-bold transition-all ${activeTab === 'products' ? 'text-white bg-white/5 border-b-2 border-white' : 'text-neutral-500 hover:text-white'}`}
                >
                    Pending Products ({pendingProducts.length})
                </button>
                <button
                    onClick={() => setActiveTab('kyc')}
                    className={`flex-1 px-6 py-4 text-sm font-bold transition-all ${activeTab === 'kyc' ? 'text-white bg-white/5 border-b-2 border-white' : 'text-neutral-500 hover:text-white'}`}
                >
                    KYC Submissions ({pendingKYC.length})
                </button>
            </div>

            <div className="p-6">
                {loading ? (
                    <div className="py-20 text-center text-neutral-500">Loading pending items...</div>
                ) : activeTab === 'products' ? (
                    <div className="space-y-4">
                        {pendingProducts.length === 0 ? (
                            <div className="py-10 text-center text-neutral-600">No products pending approval.</div>
                        ) : (
                            pendingProducts.map(p => (
                                <div key={p.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 group hover:border-white/10 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-neutral-800 rounded-lg flex items-center justify-center text-neutral-500">
                                            <ShoppingBag size={20} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-white">{p.name}</h4>
                                            <p className="text-xs text-neutral-500">Seller: {p.sellers?.shop_name || 'Unknown'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button aria-label="Approve Product" onClick={() => handleApproveProduct(p.id)} className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg hover:bg-emerald-500/20 transition-all"><Check size={18} /></button>
                                        <button aria-label="Reject Product" onClick={() => handleRejectProduct(p.id)} className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-all"><X size={18} /></button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {pendingKYC.length === 0 ? (
                            <div className="py-10 text-center text-neutral-600">No KYC submissions pending review.</div>
                        ) : (
                            pendingKYC.map(s => (
                                <div key={s.id} className="flex flex-col gap-4 p-5 bg-white/5 rounded-xl border border-white/5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <User className="text-neutral-500" size={18} />
                                            <h4 className="font-bold text-white">{s.shop_name} ({s.email})</h4>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => handleApproveKYC(s.id)} className="px-4 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-bold hover:opacity-90">Approve</button>
                                            <button onClick={() => handleRejectKYC(s.id)} className="px-4 py-1.5 bg-red-500 text-white rounded-lg text-xs font-bold hover:opacity-90">Reject</button>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                                        <div>
                                            <p className="text-[10px] uppercase text-neutral-500 font-bold mb-1">GST Number</p>
                                            <p className="text-sm text-white font-mono">{s.kyc_data?.gst_number || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] uppercase text-neutral-500 font-bold mb-1">PAN Number</p>
                                            <p className="text-sm text-white font-mono">{s.kyc_data?.pan_number || 'N/A'}</p>
                                        </div>
                                    </div>
                                    {s.kyc_data?.document_urls?.length > 0 && (
                                        <div className="flex gap-2">
                                            {s.kyc_data.document_urls.map((url: string, idx: number) => (
                                                <a key={idx} href={url} target="_blank" className="flex items-center gap-1.5 text-[10px] text-blue-400 font-bold hover:underline">
                                                    <ExternalLink size={12} /> View Document {idx + 1}
                                                </a>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminApprovalPanel;
