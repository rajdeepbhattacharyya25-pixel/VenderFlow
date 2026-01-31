import React, { useState } from 'react';
import { Shield, Key, Lock, ExternalLink, Loader2, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const AdminSecurityPanel: React.FC = () => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();

        if (newPassword.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }

        if (newPassword !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        try {
            setLoading(true);
            const { error } = await supabase.auth.updateUser({ password: newPassword });

            if (error) throw error;

            toast.success('Password updated successfully');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            console.error('Error updating password:', error);
            toast.error(error.message || 'Failed to update password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8">
            <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-red-500/10 text-red-500 rounded-xl flex items-center justify-center">
                    <Shield size={24} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-white">Critical Security</h2>
                    <p className="text-neutral-400 text-sm mt-1">Manage access control and credentials</p>
                </div>
            </div>

            <div className="space-y-8">
                {/* Change Password Section */}
                <div className="bg-black/20 border border-neutral-800 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <Key size={20} className="text-neutral-400" />
                        <h3 className="font-bold text-white">Change Admin Password</h3>
                    </div>

                    <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                        <div className="space-y-2">
                            <label className="text-xs text-neutral-500 font-medium">NEW PASSWORD</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                                    placeholder="Enter new strong password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-2.5 text-neutral-500 hover:text-white"
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs text-neutral-500 font-medium">CONFIRM NEW PASSWORD</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                                    placeholder="Confirm new password"
                                />
                                <Lock size={16} className="absolute right-3 top-2.5 text-neutral-500" />
                            </div>
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={loading || !newPassword}
                                className="flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}
                                {loading ? 'Updating...' : 'Update Password'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Audit Logs Quick Link */}
                <div className="flex items-center justify-between p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-xl">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                            <AlertTriangle size={20} />
                        </div>
                        <div>
                            <h4 className="font-bold text-white">Security Audit Logs</h4>
                            <p className="text-xs text-neutral-500">View recent login activity and sensitive actions.</p>
                        </div>
                    </div>
                    <button
                        onClick={() => navigate('/admin/logs')}
                        className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 text-sm font-medium transition-colors"
                    >
                        View Logs <ExternalLink size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdminSecurityPanel;
