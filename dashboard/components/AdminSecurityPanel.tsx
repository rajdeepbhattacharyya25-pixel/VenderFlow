import React, { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Shield, Key, Lock, ExternalLink, Loader2, AlertTriangle, Eye, EyeOff, Clock, Smartphone, Users, LogOut, CheckCircle, Info, MapPin } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { PlatformSettings } from '../../types';
import { TwoFactorSetup } from '../../components/TwoFactorSetup';

const AdminSecurityPanel: React.FC = () => {
    // Password Change State
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // 2FA Setup State
    const [show2FAModal, setShow2FAModal] = useState(false);

    // Platform Security Settings State
    const [settings, setSettings] = useState<PlatformSettings | null>(null);
    const [settingsLoading, setSettingsLoading] = useState(false);
    const [settingsSaving, setSettingsSaving] = useState(false);

    // Local state for UI inputs (to handle units)
    const [timeoutVal, setTimeoutVal] = useState<number | ''>(60);
    const [timeoutUnit, setTimeoutUnit] = useState<'minutes' | 'hours' | 'never'>('minutes');

    const navigate = useNavigate();

    const [sessions, setSessions] = useState<any[]>([]);

    useEffect(() => {
        fetchSessions();

        // Subscribe to changes
        const subscription = supabase
            .channel('user_sessions')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'user_sessions' }, () => {
                fetchSessions();
            })
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const fetchSessions = async () => {
        try {
            const { data } = await supabase
                .from('user_sessions')
                .select('*')
                .order('last_active', { ascending: false });

            if (data) {
                // Enrich with location (mock or fetch)
                const enriched = await Promise.all(data.map(async (s) => {
                    let location = 'Unknown Location';
                    try {
                        if (s.ip_address && s.ip_address !== '127.0.0.1' && s.ip_address !== 'localhost') {
                            const res = await fetch(`https://ipapi.co/${s.ip_address}/json/`);
                            const json = await res.json();
                            if (json.city) location = `${json.city}, ${json.country_name}`;
                        } else {
                            location = 'Localhost';
                        }
                    } catch (e) { console.error('Loc fetch error', e); }
                    return { ...s, location };
                }));
                setSessions(enriched);
            }
        } catch (error) {
            console.error('Error fetching sessions:', error);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    // Sync local state when settings load
    useEffect(() => {
        if (settings) {
            const mins = settings.session_timeout_minutes;
            if (!mins || mins <= 0) {
                setTimeoutUnit('never');
                setTimeoutVal('');
            } else if (mins % 60 === 0) {
                setTimeoutUnit('hours');
                setTimeoutVal(mins / 60);
            } else {
                setTimeoutUnit('minutes');
                setTimeoutVal(mins);
            }
        }
    }, [settings]);

    const fetchSettings = async () => {
        try {
            setSettingsLoading(true);
            const { data, error } = await supabase
                .from('platform_settings')
                .select('*')
                .limit(1)
                .single();

            if (error) throw error;
            setSettings(data);
        } catch (error) {
            console.error('Error fetching security settings:', error);
            // toast.error('Failed to load security settings');
        } finally {
            setSettingsLoading(false);
        }
    };

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
            setPasswordLoading(true);
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;
            toast.success('Password updated successfully');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            console.error('Error updating password:', error);
            toast.error(error.message || 'Failed to update password');
        } finally {
            setPasswordLoading(false);
        }
    };

    const handleSaveSettings = async () => {
        if (!settings) return;

        // Calculate minutes based on unit
        let finalMinutes = 0;
        if (timeoutUnit === 'never') {
            finalMinutes = -1; // -1 represents 'Never'
        } else if (timeoutUnit === 'hours') {
            finalMinutes = (typeof timeoutVal === 'number' ? timeoutVal : 0) * 60;
        } else {
            finalMinutes = typeof timeoutVal === 'number' ? timeoutVal : 60;
        }

        // Validate finalMinutes (must be > 0 unless it is -1 for 'never')
        if (finalMinutes === 0) {
            toast.error('Session timeout must be at least 1 minute/hour');
            return;
        }
        if (finalMinutes < -1) {
            toast.error('Invalid timeout value');
            return;
        }

        try {
            setSettingsSaving(true);
            const { error } = await supabase
                .from('platform_settings')
                .update({
                    session_timeout_minutes: finalMinutes,
                    enforce_2fa: settings.enforce_2fa,
                    max_login_attempts: settings.max_login_attempts
                })
                .eq('id', settings.id);

            if (error) throw error;
            toast.success('Security settings updated');

            // Re-fetch to normalize state
            await fetchSettings();
        } catch (error) {
            console.error('Error saving settings:', error);
            toast.error('Failed to save settings');
        } finally {
            setSettingsSaving(false);
        }
    };

    const handleRevokeSession = async (sessionId: string) => {
        if (!confirm('Are you sure you want to revoke this session?')) return;

        try {
            const { error } = await supabase
                .from('user_sessions')
                .delete()
                .eq('id', sessionId);

            if (error) throw error;
            toast.success('Session revoked successfully');
            // List will update via realtime subscription
        } catch (error) {
            console.error('Error revoking session:', error);
            toast.error('Failed to revoke session');
        }
    };

    const handleRevokeAll = async () => {
        if (!confirm('Are you sure you want to revoke ALL sessions? You will be logged out of other devices.')) return;

        try {
            const currentSessionId = localStorage.getItem('current_session_id');
            // Revoke all EXCEPT current? Or all? "Revoke All" usually implies all others or all.
            // Let's revoke ALL others first if possible, or just all.
            // The UI says "Revoke All". Let's assume it means "Revoke All Other Sessions" or "Revoke All".
            // If I revoke current, I get logged out.
            // But usually "Revoke All" is for compromised account.
            // Let's revoke all except current if possible, or just all.
            // Safer to revoke all except current to avoid accidental lockout if user didn't mean to.
            // But if user wants to strict cleanup, maybe all.
            // I'll filter by ID != currentSessionId if currentSessionId exists.

            let query = supabase.from('user_sessions').delete();

            if (currentSessionId) {
                query = query.neq('id', currentSessionId);
            }
            // If we want to revoke ALL, we just don't add filter.
            // But typical "Revoke All" next to "Active Sessions" often keeps current.
            // Let's keep current.

            const { error } = await query;

            if (error) throw error;
            toast.success('All other sessions revoked');
        } catch (error) {
            console.error('Error revoking sessions:', error);
            toast.error('Failed to revoke sessions');
        }
    };

    return (
        <div className="space-y-6">
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

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Change Password Section */}
                    <div className="bg-black/20 border border-neutral-800 rounded-xl p-6 h-full">
                        <div className="flex items-center gap-3 mb-6">
                            <Key size={20} className="text-neutral-400" />
                            <h3 className="font-bold text-white">Change Admin Password</h3>
                        </div>

                        <form onSubmit={handlePasswordChange} className="space-y-4">
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
                                        aria-label={showPassword ? "Hide password" : "Show password"}
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
                                    disabled={passwordLoading || !newPassword}
                                    className="flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full justify-center"
                                >
                                    {passwordLoading ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}
                                    {passwordLoading ? 'Updating...' : 'Update Password'}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Session & Access Control */}
                    {settings && (
                        <div className="bg-black/20 border border-neutral-800 rounded-xl p-6 h-full flex flex-col">
                            <div className="flex items-center gap-3 mb-6">
                                <Lock size={20} className="text-neutral-400" />
                                <h3 className="font-bold text-white">Access Policy</h3>
                            </div>

                            <div className="space-y-6 flex-1">
                                {/* Session Timeout Controls */}
                                <div>
                                    <label className="text-xs text-neutral-500 font-medium mb-2 block">SESSION TIMEOUT</label>
                                    <div className="flex items-center gap-2">
                                        <div className="relative flex-1">
                                            <input
                                                type="number"
                                                value={timeoutVal}
                                                onChange={(e) => setTimeoutVal(e.target.value === '' ? '' : parseInt(e.target.value))}
                                                disabled={timeoutUnit === 'never'}
                                                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500 transition-colors pl-10 disabled:opacity-50 disabled:cursor-not-allowed"
                                                placeholder={timeoutUnit === 'never' ? 'Infinite' : 'Enter duration'}
                                            />
                                            <Clock size={16} className="absolute left-3 top-2.5 text-neutral-500" />
                                        </div>

                                        <select
                                            aria-label="Session timeout unit"
                                            value={timeoutUnit}
                                            onChange={(e) => {
                                                const unit = e.target.value as any;
                                                setTimeoutUnit(unit);
                                                // Default values when switching
                                                if (unit === 'never') setTimeoutVal('');
                                                if (unit === 'hours' && (timeoutVal === '' || typeof timeoutVal !== 'number')) setTimeoutVal(1);
                                                if (unit === 'minutes' && (timeoutVal === '' || typeof timeoutVal !== 'number')) setTimeoutVal(60);
                                            }}
                                            className="bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer hover:bg-neutral-800"
                                        >
                                            <option value="minutes">Minutes</option>
                                            <option value="hours">Hours</option>
                                            <option value="never">Never</option>
                                        </select>
                                    </div>
                                    <p className="text-xs text-neutral-600 mt-2">
                                        {timeoutUnit === 'never'
                                            ? "Admins will remain logged in indefinitely until they manually logout."
                                            : `Auto-logout inactive admins after ${timeoutVal || 0} ${timeoutUnit}.`
                                        }
                                    </p>
                                </div>

                                {/* 2FA Toggle */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between p-3 bg-neutral-900 rounded-lg border border-neutral-800">
                                        <div className="flex items-center gap-3">
                                            <Smartphone size={18} className="text-indigo-400" />
                                            <div>
                                                <div className="text-sm font-medium text-white">Enforce 2FA</div>
                                                <div className="text-xs text-neutral-500">Require Two-Factor Auth</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => setShow2FAModal(true)}
                                                className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
                                            >
                                                Manage My 2FA
                                            </button>
                                            <button
                                                onClick={() => setSettings({ ...settings, enforce_2fa: !settings.enforce_2fa })}
                                                className={`w-10 h-5 rounded-full p-0.5 transition-colors ${settings.enforce_2fa ? 'bg-indigo-600' : 'bg-neutral-700'}`}
                                                aria-label="Toggle 2FA enforcement"
                                            >
                                                <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${settings.enforce_2fa ? 'translate-x-5' : 'translate-x-0'}`} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* 2FA Explanation Box */}
                                    <div className={`p-3 rounded-lg text-xs leading-relaxed border transition-all ${settings.enforce_2fa ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300' : 'bg-neutral-800/30 border-neutral-800 text-neutral-500'}`}>
                                        <div className="flex gap-2">
                                            <Info size={14} className="flex-shrink-0 mt-0.5" />
                                            <div>
                                                <span className="font-bold block mb-1">How Enforcement Works:</span>
                                                {settings.enforce_2fa
                                                    ? "On next login, all admin accounts will be prompted to scan a QR code and set up an authenticator app (Google Auth, Authy) if they haven't done so. Access will be blocked until setup is complete."
                                                    : "2FA is optional. Admins can choose to enable it individually from their profile settings, but it is not mandatory for access."
                                                }
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleSaveSettings}
                                disabled={settingsSaving}
                                className="mt-6 w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                            >
                                {settingsSaving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                                {settingsSaving ? 'Saving...' : 'Save Policies'}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Active Sessions */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-indigo-500/10 text-indigo-400 rounded-xl flex items-center justify-center">
                            <Users size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Active Sessions</h2>
                            <p className="text-neutral-400 text-xs">Devices currently logged into admin panel</p>
                        </div>
                    </div>
                    <button
                        onClick={handleRevokeAll}
                        className="text-xs text-red-400 hover:text-red-300 font-medium"
                    >
                        Revoke All
                    </button>
                </div>

                <div className="space-y-3">

                    {sessions.map((session) => {
                        const isCurrent = session.id === localStorage.getItem('current_session_id');
                        const ua = session.ua_string || session.device_info || 'Unknown Device';
                        let os = 'Unknown Device';

                        // Device detection - check mobile OS FIRST since Android UA contains "Linux"
                        if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iPhone';
                        else if (ua.includes('Android')) os = 'Android';
                        else if (ua.includes('Windows')) os = 'Windows PC';
                        else if (ua.includes('Mac')) os = 'Mac';
                        else if (ua.includes('CrOS')) os = 'Chromebook';
                        else if (ua.includes('Linux')) os = 'Linux';

                        return (
                            <div key={session.id} className="flex items-center justify-between p-4 bg-black/20 border border-neutral-800 rounded-xl">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-neutral-800 rounded-full text-neutral-400">
                                        {ua.match(/Mobile|Android|iPhone/i) ? <Smartphone size={16} /> : <ExternalLink size={16} />}
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-medium text-white max-w-[200px] truncate" title={ua}>{os}</h4>
                                        <div className="flex items-center gap-2 text-xs text-neutral-500 mt-0.5">
                                            <span>{session.ip_address}</span>
                                            {session.location && (
                                                <>
                                                    <span className="w-1 h-1 rounded-full bg-neutral-700" />
                                                    <span className="flex items-center gap-1">
                                                        <MapPin size={10} />
                                                        {session.location}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className={`text-xs px-2 py-1 rounded-full ${isCurrent ? 'bg-green-500/10 text-green-500' : 'bg-neutral-800 text-neutral-400'}`}>
                                        {isCurrent ? 'Current Session' : formatDistanceToNow(new Date(session.last_active), { addSuffix: true })}
                                    </span>
                                    {!isCurrent && (
                                        <button
                                            onClick={() => handleRevokeSession(session.id)}
                                            className="p-2 text-neutral-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                            title="Revoke Access"
                                        >
                                            <LogOut size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    {sessions.length === 0 && (
                        <div className="text-center text-neutral-500 py-4 text-sm">
                            No active sessions found.
                        </div>
                    )}
                </div>
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

            {show2FAModal && (
                <TwoFactorSetup
                    onClose={() => setShow2FAModal(false)}
                    onComplete={() => {
                        setShow2FAModal(false);
                    }}
                />
            )}
        </div>
    );
};

export default AdminSecurityPanel;
