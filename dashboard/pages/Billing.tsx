import React, { useState, useEffect } from 'react';
import {
    CreditCard, Shield, Zap, Check, AlertCircle,
    ArrowUpCircle, Info, FileText, Send, Mail
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Seller } from '../../lib/seller';

const Billing: React.FC = () => {
    const [seller, setSeller] = useState<Seller | null>(null);
    const [loading, setLoading] = useState(true);
    const [submittingKYC, setSubmittingKYC] = useState(false);
    const [upgrading, setUpgrading] = useState<string | null>(null);
    const [kycForm, setKycForm] = useState({
        gst_number: '',
        pan_number: ''
    });

    const [wallet, setWallet] = useState<{ available_balance: number; reserve_balance: number; negative_balance: number } | null>(null);
    const [connectingRazorpay, setConnectingRazorpay] = useState(false);
    const [razorpayAccountId, setRazorpayAccountId] = useState('');

    useEffect(() => {
        const loadSellerData = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: sellerData } = await supabase
                .from('sellers')
                .select('*')
                .eq('id', user.id)
                .single();

            if (sellerData) {
                setSeller(sellerData as Seller);
                setRazorpayAccountId(sellerData.razorpay_account_id || '');
            }

            const { data: walletData } = await supabase
                .from('seller_wallets')
                .select('*')
                .eq('seller_id', user.id)
                .single();

            if (walletData) setWallet(walletData);

            setLoading(false);
        };

        loadSellerData();
    }, []);

    const handleRazorpayConnect = async (e: React.FormEvent) => {
        e.preventDefault();
        setConnectingRazorpay(true);
        try {
            const { error } = await supabase
                .from('sellers')
                .update({
                    razorpay_account_id: razorpayAccountId,
                    payout_status: 'active'
                })
                .eq('id', seller?.id);

            if (error) throw error;
            setSeller(prev => prev ? { ...prev, razorpay_account_id: razorpayAccountId, payout_status: 'active' } : null);
            alert('Razorpay account linked successfully!');
        } catch (err) {
            console.error(err);
            alert('Error linking account');
        } finally {
            setConnectingRazorpay(false);
        }
    };

    const handleAutomatedAccountCreation = async () => {
        setConnectingRazorpay(true);
        try {
            const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-payout-account`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
                }
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error);

            setSeller(prev => prev ? { ...prev, razorpay_account_id: data.razorpay_account_id, payout_status: 'active' } : null);
            setRazorpayAccountId(data.razorpay_account_id);
            alert('Razorpay Payout Account created and linked automatically!');
        } catch (err: any) {
            console.error(err);
            alert(err.message || 'Error creating automated account. Please try manual linking.');
        } finally {
            setConnectingRazorpay(false);
        }
    };

    const handleKYCSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmittingKYC(true);
        try {
            const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/submit-kyc`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
                },
                body: JSON.stringify(kycForm)
            });

            if (!response.ok) throw new Error('Failed to submit KYC');

            setSeller(prev => prev ? { ...prev, kyc_status: 'pending' } : null);
            alert('KYC submitted successfully for review!');
        } catch (err) {
            console.error(err);
            alert('Error submitting KYC. Please try again.');
        } finally {
            setSubmittingKYC(false);
        }
    };

    const handleUpgrade = async (plan: string) => {
        setUpgrading(plan);
        try {
            const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/subscribe-to-plan`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
                },
                body: JSON.stringify({ plan_name: plan })
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error);

            // Razorpay Checkout Integration
            const options = {
                key: data.key_id,
                subscription_id: data.subscription_id,
                name: 'VendorFlow',
                description: `${plan.toUpperCase()} Plan Subscription`,
                handler: function (response: any) {
                    alert('Payment Successful! Your plan will update shortly.');
                    window.location.reload();
                },
                prefill: {
                    email: (await supabase.auth.getUser()).data.user?.email
                },
                theme: {
                    color: '#6366f1'
                }
            };

            const rzp = new (window as any).Razorpay(options);
            rzp.open();
        } catch (err: any) {
            console.error(err);
            alert(err.message || 'Error initiating upgrade');
        } finally {
            setUpgrading(null);
        }
    };

    if (loading) return <div className="p-10 text-center text-neutral-500">Loading billing details...</div>;

    const plans = [
        { name: 'free', price: '₹0', features: ['200 Telegram Msgs', '50 Emails', '10% Commission'], color: 'neutral' },
        { name: 'pro', price: '₹999/mo', features: ['5000 Telegram Msgs', 'Unlimited Email', '5% Commission'], color: 'indigo' },
        { name: 'premium', price: '₹2499/mo', features: ['Unlimited Everything', '2% Commission', 'Priority Support'], color: 'amber' }
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Billing & Payouts</h1>
                <p className="text-neutral-500 text-sm mt-1">Manage your earnings, subscription, and payout account.</p>
            </div>

            {/* Earnings Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-emerald-500/10 rounded-xl">
                            <ArrowUpCircle className="text-emerald-500" size={20} />
                        </div>
                        <span className="text-[10px] uppercase font-black text-neutral-500 tracking-widest">Available</span>
                    </div>
                    <div className="text-3xl font-black text-white tracking-tighter">₹{wallet?.available_balance || '0.00'}</div>
                    <p className="text-[10px] text-neutral-500 mt-2 font-medium">Ready for next payout</p>
                </div>

                <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-amber-500/10 rounded-xl">
                            <Shield className="text-amber-500" size={20} />
                        </div>
                        <span className="text-[10px] uppercase font-black text-neutral-500 tracking-widest">Reserve</span>
                    </div>
                    <div className="text-3xl font-black text-white tracking-tighter text-amber-500/80">₹{wallet?.reserve_balance || '0.00'}</div>
                    <p className="text-[10px] text-neutral-500 mt-2 font-medium">Held for 7 days for refunds</p>
                </div>

                <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-rose-500/10 rounded-xl">
                            <AlertCircle className="text-rose-500" size={20} />
                        </div>
                        <span className="text-[10px] uppercase font-black text-neutral-500 tracking-widest">Negative</span>
                    </div>
                    <div className="text-3xl font-black text-rose-500 tracking-tighter">₹{wallet?.negative_balance || '0.00'}</div>
                    <p className="text-[10px] text-neutral-500 mt-2 font-medium">Outstanding refund liability</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {/* Current Plan Card */}
                    <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Zap size={120} />
                        </div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-indigo-500/10 rounded-xl">
                                    <Zap className="text-indigo-500" size={24} />
                                </div>
                                <h2 className="text-xl font-bold text-white">Current Subscription</h2>
                            </div>

                            <div className="flex items-baseline gap-2 mb-8">
                                <span className="text-4xl font-black text-white uppercase tracking-tighter">{seller?.plan}</span>
                                <span className="text-neutral-500 text-sm font-medium">Plan</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-white/5">
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2 text-neutral-400 text-xs font-bold uppercase tracking-wider">
                                            <Send size={14} /> Telegram Messages
                                        </div>
                                        <span className="text-white font-bold text-sm">{seller?.telegram_message_quota_remaining}</span>
                                    </div>
                                    <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-indigo-500 rounded-full transition-all duration-1000"
                                            style={{ width: `${Math.min(100, (seller?.telegram_message_quota_remaining || 0) / 50)}%` }}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2 text-neutral-400 text-xs font-bold uppercase tracking-wider">
                                            <Mail size={14} /> Email Notifications
                                        </div>
                                        <span className="text-white font-bold text-sm">{seller?.email_quota_remaining}</span>
                                    </div>
                                    <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
                                            style={{ width: `${Math.min(100, (seller?.email_quota_remaining || 0) / 20)}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Plans Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {plans.map(p => (
                            <div key={p.name} className={`bg-neutral-900 border border-neutral-800 rounded-2xl p-6 flex flex-col ${seller?.plan === p.name ? 'ring-2 ring-indigo-500 border-transparent shadow-lg shadow-indigo-500/10' : ''}`}>
                                <div className="mb-4">
                                    <h3 className="text-xs font-black uppercase tracking-widest text-neutral-500 mb-1">{p.name}</h3>
                                    <div className="text-2xl font-black text-white tracking-tighter">{p.price}</div>
                                </div>
                                <ul className="space-y-2 mb-6 flex-1">
                                    {p.features.map((f, i) => (
                                        <li key={i} className="flex items-center gap-2 text-xs text-neutral-400 font-medium">
                                            <Check size={12} className="text-emerald-500 flex-shrink-0" />
                                            {f}
                                        </li>
                                    ))}
                                </ul>
                                <button
                                    onClick={() => handleUpgrade(p.name)}
                                    disabled={seller?.plan === p.name || upgrading === p.name}
                                    className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all ${seller?.plan === p.name
                                        ? 'bg-neutral-800 text-neutral-500 cursor-default'
                                        : upgrading === p.name
                                            ? 'bg-indigo-500/50 text-white cursor-wait'
                                            : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20'
                                        }`}
                                >
                                    {seller?.plan === p.name ? 'Current' : upgrading === p.name ? 'Processing...' : 'Upgrade Now'}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-indigo-500/10 rounded-xl">
                                <CreditCard className="text-indigo-500" size={20} />
                            </div>
                            <h2 className="text-lg font-bold text-white">Payout Account</h2>
                        </div>

                        {seller?.razorpay_account_id ? (
                            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center justify-between">
                                <div>
                                    <h4 className="text-emerald-500 font-bold text-sm">Linked to Razorpay</h4>
                                    <p className="text-[10px] text-neutral-400 font-mono mt-0.5">{seller.razorpay_account_id}</p>
                                </div>
                                <Check className="text-emerald-500" size={20} />
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <p className="text-[10px] text-neutral-400 font-medium leading-relaxed">
                                    Create your Razorpay Payout account instantly using your profile details, or manually link an existing account.
                                </p>
                                
                                <button
                                    onClick={handleAutomatedAccountCreation}
                                    disabled={connectingRazorpay}
                                    className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold text-xs hover:bg-indigo-700 transition-colors disabled:opacity-50 ring-2 ring-indigo-500/20"
                                >
                                    {connectingRazorpay ? 'Creating Account...' : 'One-Click Payout Setup'}
                                </button>

                                <div className="relative py-2">
                                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-neutral-800" /></div>
                                    <div className="relative flex justify-center text-[10px] uppercase"><span className="bg-neutral-900 px-2 text-neutral-600 font-bold">OR Manual Link</span></div>
                                </div>

                                <form onSubmit={handleRazorpayConnect} className="space-y-3">
                                    <input
                                        type="text"
                                        required
                                        value={razorpayAccountId}
                                        onChange={e => setRazorpayAccountId(e.target.value)}
                                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-2.5 px-4 text-white text-[11px] focus:ring-2 focus:ring-indigo-500/50 transition-all outline-none"
                                        placeholder="acc_XXXXXXXXXXXXXX"
                                    />
                                    <button
                                        type="submit"
                                        disabled={connectingRazorpay}
                                        className="w-full py-2 bg-neutral-800 text-white rounded-xl font-bold text-[10px] hover:bg-neutral-700 transition-colors disabled:opacity-50"
                                    >
                                        Link Existing ID
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>

                    <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-amber-500/10 rounded-xl">
                                <Shield className="text-amber-500" size={20} />
                            </div>
                            <h2 className="text-lg font-bold text-white">Identity Check</h2>
                        </div>

                        {seller?.kyc_status === 'approved' ? (
                            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 text-center">
                                <Check className="mx-auto text-emerald-500 mb-3" size={32} />
                                <h4 className="text-emerald-500 font-bold mb-1">Fully Verified</h4>
                                <p className="text-xs text-neutral-400">Your KYC documents have been approved.</p>
                            </div>
                        ) : seller?.kyc_status === 'pending' ? (
                            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6 text-center">
                                <Info className="mx-auto text-amber-500 mb-3" size={32} />
                                <h4 className="text-amber-500 font-bold mb-1">Under Review</h4>
                                <p className="text-xs text-neutral-400">Our team is verifying your details.</p>
                            </div>
                        ) : (
                            <form onSubmit={handleKYCSubmit} className="space-y-4">
                                <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl flex items-start gap-3 mb-4">
                                    <AlertCircle size={18} className="text-indigo-400 mt-0.5" />
                                    <p className="text-[10px] text-neutral-400 leading-relaxed font-medium">
                                        Submit your GST and PAN details to unlock higher sales limits and premium features.
                                    </p>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] uppercase font-bold text-neutral-500 mb-1.5 block">GST Number (Optional)</label>
                                        <input
                                            type="text"
                                            value={kycForm.gst_number}
                                            onChange={e => setKycForm({ ...kycForm, gst_number: e.target.value.toUpperCase() })}
                                            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-2.5 px-4 text-white text-sm focus:ring-2 focus:ring-indigo-500/50 transition-all outline-none"
                                            placeholder="22AAAAA0000A1Z5"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] uppercase font-bold text-neutral-500 mb-1.5 block">PAN Number</label>
                                        <input
                                            type="text"
                                            required
                                            value={kycForm.pan_number}
                                            onChange={e => setKycForm({ ...kycForm, pan_number: e.target.value.toUpperCase() })}
                                            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-2.5 px-4 text-white text-sm focus:ring-2 focus:ring-indigo-500/50 transition-all outline-none"
                                            placeholder="ABCDE1234F"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={submittingKYC}
                                        className="w-full py-3 bg-white text-black rounded-xl font-bold text-xs hover:bg-neutral-200 transition-colors disabled:opacity-50"
                                    >
                                        {submittingKYC ? 'Submitting...' : 'Submit Verification'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Billing;
