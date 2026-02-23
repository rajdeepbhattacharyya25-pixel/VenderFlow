import React, { useState, useEffect } from 'react';
import { Users, QrCode, Download, Trash2, Plus, Loader2, Save, X, Eye, EyeOff, Copy, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { QRCodeSVG } from 'qrcode.react';

// Types
interface StaffMember {
    id: string;
    name: string;
    role: string;
    user_id: string; // The auth user id
}

interface GeneratedCreds {
    email: string;
    password: string;
    loginUrl: string;
}

export const SharedAccessPanel = () => {
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);

    // Form State
    const [newName, setNewName] = useState('');
    const [newRole, setNewRole] = useState('Staff');
    const [creating, setCreating] = useState(false);

    // QR State
    const [generatedCreds, setGeneratedCreds] = useState<GeneratedCreds | null>(null);
    const [showQRModal, setShowQRModal] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        fetchStaff();
    }, []);

    const fetchStaff = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('store_staff')
                .select('*')
                .eq('created_by', user.id) // Ensure we only see staff we created
                .order('created_at', { ascending: false });

            if (error) throw error;
            setStaff(data || []);
        } catch (error) {
            console.error('Error fetching staff:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddStaff = async () => {
        if (!newName.trim()) return;
        setCreating(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            // 1. Get Store ID
            const { data: store } = await supabase.from('sellers').select('id').eq('id', user.id).single();
            // Assuming 1:1 user:store for now, or use user.id as store_id if that's the mapping. 
            // In typical setup, sellers.id is the primary key. If user.id === sellers.id, then:
            if (!store) throw new Error("Store not found");

            // 2. Call Edge Function
            const { data, error } = await supabase.functions.invoke('manage-staff', {
                body: {
                    action: 'create',
                    name: newName,
                    role: newRole,
                    storeId: store.id
                }
            });

            if (error) throw error;
            if (!data.email || !data.password) throw new Error("Invalid response from server");

            // 3. Generate Login URL
            // Assuming the app is hosted at window.location.origin
            const baseUrl = window.location.origin;
            const loginUrl = `${baseUrl}/staff/login?u=${encodeURIComponent(data.email)}&p=${encodeURIComponent(data.password)}`;

            setGeneratedCreds({
                email: data.email,
                password: data.password,
                loginUrl
            });
            setShowAddModal(false);
            setShowQRModal(true);

            // Refresh list
            fetchStaff();
            setNewName('');

        } catch (error: any) {
            console.error('Error creating staff:', error);
            alert(`Failed to create staff: ${error.message || 'Unknown error'}`);
        } finally {
            setCreating(false);
        }
    };

    const handleDeleteStaff = async (staffId: string) => {
        if (!confirm("Are you sure? This will revoke access immediately.")) return;

        // Optimistic UI update
        const originalStaff = [...staff];
        setStaff(prev => prev.filter(s => s.id !== staffId));

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return; // Should handle error
            const { data: store } = await supabase.from('sellers').select('id').eq('id', user.id).single();

            const { error } = await supabase.functions.invoke('manage-staff', {
                body: {
                    action: 'delete',
                    staffId: staffId,
                    storeId: store?.id
                }
            });

            if (error) throw error;
        } catch (error) {
            console.error('Error deleting staff:', error);
            alert("Failed to delete staff.");
            setStaff(originalStaff); // Revert
        }
    };

    const copyToClipboard = () => {
        if (generatedCreds) {
            navigator.clipboard.writeText(generatedCreds.loginUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleDownloadQR = () => {
        const svg = document.getElementById("staff-qr-code");
        if (svg) {
            const svgData = new XMLSerializer().serializeToString(svg);
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            const img = new Image();
            img.onload = () => {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx?.drawImage(img, 0, 0);
                const pngFile = canvas.toDataURL("image/png");
                const downloadLink = document.createElement("a");
                downloadLink.download = `staff-invite-${newName || 'qr'}.png`;
                downloadLink.href = pngFile;
                downloadLink.click();
            };
            img.src = "data:image/svg+xml;base64," + btoa(svgData);
        }
    };

    return (
        <div className="bg-panel rounded-2xl p-8 border border-border shadow-sm animate-fadeIn">
            {/* Header */}
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-border">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                        <Users size={20} />
                    </div>
                    <h3 className="font-bold text-lg text-text">Shared Access</h3>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl hover:opacity-90 transition-all font-bold text-sm shadow-sm"
                >
                    <Plus size={16} />
                    Add Helper
                </button>
            </div>

            {/* Static Hero Section (Optional - keep or remove based on preference, keeping for now) */}
            <div className="bg-bg/50 p-8 rounded-[2rem] border border-border mb-8">
                <div className="flex flex-col md:flex-row items-center gap-8 md:gap-10">
                    <div className="w-32 h-32 bg-white p-4 rounded-2xl border border-border shadow-sm flex items-center justify-center flex-shrink-0">
                        {/* Placeholder QR or Generic Icon */}
                        <QrCode size={80} className="text-gray-800" />
                    </div>
                    <div className="flex-grow text-center md:text-left">
                        <h4 className="text-xl font-bold text-text mb-2">Invite your Helpers</h4>
                        <p className="text-sm text-muted mb-4 leading-relaxed max-w-md mx-auto md:mx-0">
                            Create a staff account and share the QR code. They can scan it to instantly log in without remembering passwords.
                        </p>
                    </div>
                </div>
            </div>

            {/* Staff List */}
            <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                    <h4 className="text-xs font-bold text-muted uppercase tracking-widest">Team Members ({staff.length})</h4>
                </div>

                {loading ? (
                    <div className="text-center py-10"><Loader2 className="animate-spin text-primary mx-auto" /></div>
                ) : staff.length === 0 ? (
                    <div className="text-center py-10 bg-bg rounded-xl border border-border border-dashed text-muted text-sm">
                        No team members yet. Click "Add Helper" to invite someone.
                    </div>
                ) : (
                    staff.map((s) => (
                        <div key={s.id} className="flex items-center justify-between p-4 bg-bg border border-border rounded-xl transition-all hover:border-primary/50 group">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-primary/10 text-primary rounded-full flex items-center justify-center font-bold text-lg">
                                    {s.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-text">{s.name}</h4>
                                    <p className="text-[10px] uppercase font-bold text-muted tracking-wider">{s.role}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {/* Can add Edit button here later */}
                                <button
                                    onClick={() => handleDeleteStaff(s.id)}
                                    className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                    title="Revoke Access"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Add Staff Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-panel w-full max-w-md rounded-3xl p-6 shadow-2xl border border-border">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-text">Add New Helper</h3>
                            <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-bg rounded-full text-muted transition-colors"><X size={20} /></button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-muted uppercase mb-2">Name</label>
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-text focus:ring-2 focus:ring-primary/20 outline-none"
                                    placeholder="e.g. Rahul"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-muted uppercase mb-2">Role</label>
                                <select
                                    value={newRole}
                                    onChange={(e) => setNewRole(e.target.value)}
                                    className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-text focus:ring-2 focus:ring-primary/20 outline-none"
                                >
                                    <option value="Staff">Staff</option>
                                    <option value="Manager">Manager</option>
                                    <option value="Sales">Sales</option>
                                </select>
                            </div>

                            <button
                                onClick={handleAddStaff}
                                disabled={creating || !newName.trim()}
                                className="w-full bg-primary text-white py-3 rounded-xl font-bold hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
                            >
                                {creating ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                {creating ? 'Creating Account...' : 'Create & Generate QR'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* QR Code Modal */}
            {showQRModal && generatedCreds && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-panel w-full max-w-sm rounded-[2rem] p-8 shadow-2xl border border-border text-center relative overflow-hidden">
                        {/* Confetti or decorative elements can go here */}
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary to-indigo-500" />

                        <div className="mb-6">
                            <h3 className="text-2xl font-bold text-text mb-2">Access Granted!</h3>
                            <p className="text-sm text-muted">Scan to log in as <span className="text-primary font-bold">{newName || 'Staff'}</span></p>
                        </div>

                        <div className="bg-white p-4 rounded-2xl mx-auto w-fit shadow-inner mb-6">
                            <QRCodeSVG
                                id="staff-qr-code"
                                value={generatedCreds.loginUrl}
                                size={200}
                                level={"H"}
                                includeMargin={true}
                            />
                        </div>

                        <div className="space-y-3">
                            <button
                                onClick={handleDownloadQR}
                                className="w-full bg-primary text-white py-3 rounded-xl font-bold text-sm hover:brightness-110 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/25"
                            >
                                <Download size={18} />
                                Download QR Image
                            </button>

                            <button
                                onClick={copyToClipboard}
                                className="w-full bg-bg border border-border text-text py-3 rounded-xl font-bold text-sm hover:bg-bg/80 transition-all flex items-center justify-center gap-2"
                            >
                                {copied ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
                                {copied ? 'Link Copied!' : 'Copy Login Link'}
                            </button>
                        </div>

                        <button
                            onClick={() => setShowQRModal(false)}
                            className="mt-6 text-muted hover:text-text text-sm underline underline-offset-4"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
