import React from 'react';
import { Shield, Lock, ExternalLink, QrCode, Clock, Smartphone, Info, CheckCircle2, Users, Loader2, Trash2, RefreshCw, MapPin, LogOut } from 'lucide-react';
import { TwoFactorSetup } from '../../../components/TwoFactorSetup';
import { supabase } from '../../../lib/supabase';

export const SecuritySettings = ({ settings, setSettings, renderHeader, handleLogoUpload, saving, setSaving, show2FAModal, setShow2FAModal, timeoutVal, setTimeoutVal, timeoutUnit, setTimeoutUnit, systemStatus, apiUsage, loadingApiUsage, sessions, loadingSessions, selectedSessions, setSelectedSessions, isRevoking, setIsRevoking, fetchSessions, handleRevokeSession, handleRevokeSelected, formatUaString, getDeviceIcon, DEFAULT_THEME_CONFIG, activePreviews, previewLoading, setPreviewLoading, fetchPreviews }: any) => {
    return (
        <div className="space-y-6 animate-fadeIn">
                        <div className="bg-panel rounded-2xl p-4 md:p-6 lg:p-8 border border-border shadow-sm">
                            {renderHeader('Account & Security', <Shield size={20} />)}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="bg-bg/50 p-6 rounded-2xl border border-border">
                                    <div className="flex items-center gap-2 mb-6 text-primary">
                                        <Lock size={18} />
                                        <h4 className="font-bold text-sm">Change Password</h4>
                                    </div>
                                    <div className="space-y-4">
                                        <input
                                            type="password"
                                            placeholder="Current Password"
                                            aria-label="Current Password"
                                            className="w-full bg-panel border border-border rounded-xl px-4 py-3 text-text focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                                        />
                                        <input
                                            type="password"
                                            placeholder="New Password"
                                            aria-label="New Password"
                                            className="w-full bg-panel border border-border rounded-xl px-4 py-3 text-text focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                                        />
                                        <button className="w-full bg-bg border border-border hover:bg-bg/80 text-text font-bold py-3 rounded-xl transition-all text-sm mt-2 shadow-sm">
                                            Update Password
                                        </button>
                                    </div>
                                </div>

                                <div className="bg-bg/50 p-6 rounded-2xl border border-border flex flex-col">
                                    <div className="flex items-center gap-2 mb-4 text-primary">
                                        <Lock size={18} />
                                        <h4 className="font-bold text-sm">Access Policy</h4>
                                    </div>

                                    <div className="space-y-6 flex-1">
                                        {/* Session Timeout Controls */}
                                        <div>
                                            <label className="text-[10px] font-bold text-muted uppercase tracking-wider mb-2 block">SESSION TIMEOUT</label>
                                            <div className="flex items-center gap-2">
                                                <div className="relative flex-1">
                                                    <input
                                                        type="number"
                                                        value={timeoutVal}
                                                        onChange={(e) => setTimeoutVal(e.target.value === '' ? '' : parseInt(e.target.value))}
                                                        disabled={timeoutUnit === 'never'}
                                                        className="w-full bg-bg border border-border rounded-xl px-4 py-2 text-text focus:outline-none focus:border-primary transition-colors pl-10 disabled:opacity-50 disabled:cursor-not-allowed"
                                                        placeholder={timeoutUnit === 'never' ? 'Infinite' : 'Enter duration'}
                                                        aria-label="Session timeout duration"
                                                    />
                                                    <Clock size={16} className="absolute left-3 top-2.5 text-muted" />
                                                </div>

                                                <select
                                                    value={timeoutUnit}
                                                    onChange={(e) => {
                                                        const unit = e.target.value as any;
                                                        setTimeoutUnit(unit);
                                                        // Default values when switching
                                                        if (unit === 'never') setTimeoutVal('');
                                                        if (unit === 'hours' && (timeoutVal === '' || typeof timeoutVal !== 'number')) setTimeoutVal(1);
                                                        if (unit === 'minutes' && (timeoutVal === '' || typeof timeoutVal !== 'number')) setTimeoutVal(60);
                                                    }}
                                                    className="bg-bg border border-border rounded-xl px-4 py-2 text-text text-sm focus:outline-none focus:border-primary transition-colors cursor-pointer hover:bg-bg/80"
                                                    aria-label="Session timeout unit"
                                                >
                                                    <option value="minutes">Minutes</option>
                                                    <option value="hours">Hours</option>
                                                    <option value="never">Never</option>
                                                </select>
                                            </div>
                                            <p className="text-[10px] text-muted mt-2">
                                                {timeoutUnit === 'never'
                                                    ? "Staff will remain logged in indefinitely until they manually logout."
                                                    : `Auto-logout inactive staff after ${timeoutVal || 0} ${timeoutUnit}.`
                                                }
                                            </p>
                                        </div>

                                        {/* 2FA Toggle */}
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between p-3 bg-bg border border-border rounded-xl">
                                                <div className="flex items-center gap-3">
                                                    <Smartphone size={18} className="text-primary" />
                                                    <div>
                                                        <div className="text-sm font-bold text-text">Enforce 2FA</div>
                                                        <div className="text-[10px] text-muted">Require Two-Factor Auth for Staff</div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => setSettings({ ...settings, enforce_2fa: !settings.enforce_2fa })}
                                                    className={`w-10 h-5 rounded-full p-0.5 transition-colors ${settings.enforce_2fa ? 'bg-primary' : 'bg-gray-300'}`}
                                                    aria-label="Toggle 2FA enforcement"
                                                >
                                                    <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${settings.enforce_2fa ? 'translate-x-5' : 'translate-x-0'}`} />
                                                </button>
                                            </div>

                                            {/* 2FA Explanation Box */}
                                            <div className={`p-3 rounded-lg text-xs leading-relaxed border transition-all ${settings.enforce_2fa ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-bg border-border text-muted'}`}>
                                                <div className="flex gap-2">
                                                    <Info size={14} className="flex-shrink-0 mt-0.5" />
                                                    <div>
                                                        <span className="font-bold block mb-1">Policy Effect:</span>
                                                        {settings.enforce_2fa
                                                            ? "All staff accounts will be required to set up 2FA to access this dashboard."
                                                            : "2FA is optional for your staff."
                                                        }
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 bg-green-50 border border-green-100 p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-green-500/20 text-green-600 rounded-full flex items-center justify-center">
                                        <CheckCircle2 size={24} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-sm text-green-900">Your Two-Step Verification</h4>
                                        <p className="text-xs text-green-700/80">Secure your personal account with mobile OTP verification.</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShow2FAModal(true)}
                                    className="text-primary font-bold text-sm hover:underline"
                                >
                                    Manage My 2FA
                                </button>
                            </div>

                            {/* Active Sessions List */}
                            <div className="mt-8 bg-panel border border-border rounded-2xl p-4 md:p-6 lg:p-8">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                                            <Users size={20} />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold text-text">Session History</h2>
                                            <p className="text-muted text-xs">Detailed history of devices logged into your account</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {/* Bulk Delete Button */}
                                        {selectedSessions.size > 0 && (
                                            <button
                                                onClick={async () => {
                                                    const count = selectedSessions.size;
                                                    if (!confirm(`Revoke ${count} selected session(s)? These devices will be logged out immediately.`)) return;
                                                    setIsRevoking(true);
                                                    try {
                                                        // Delete all selected sessions
                                                        const { error } = await supabase
                                                            .from('user_sessions')
                                                            .delete()
                                                            .in('id', Array.from(selectedSessions));

                                                        if (error) throw error;

                                                        setSelectedSessions(new Set());
                                                        await fetchSessions();
                                                    } catch (e) {
                                                        console.error('Bulk revoke error:', e);
                                                        alert('Failed to revoke some sessions');
                                                    } finally {
                                                        setIsRevoking(false);
                                                    }
                                                }}
                                                disabled={isRevoking}
                                                className="flex items-center gap-2 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
                                            >
                                                {isRevoking ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                                Remove {selectedSessions.size} Selected
                                            </button>
                                        )}
                                        <button
                                            onClick={fetchSessions}
                                            className="p-2 hover:bg-bg rounded-lg text-muted hover:text-primary transition-colors"
                                            title="Refresh List"
                                            aria-label="Refresh session list"
                                        >
                                            <RefreshCw size={16} className={loadingSessions ? "animate-spin" : ""} />
                                        </button>
                                    </div>
                                </div>

                                {/* Select All Header */}
                                {sessions.length > 0 && (
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4 pb-3 border-b border-border">
                                        <input
                                            type="checkbox"
                                            id="select-all-sessions"
                                            checked={
                                                sessions.filter(s => s.id !== localStorage.getItem('current_session_id')).length > 0 &&
                                                sessions.filter(s => s.id !== localStorage.getItem('current_session_id')).every(s => selectedSessions.has(s.id))
                                            }
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    // Select all non-current sessions
                                                    const nonCurrentIds = sessions
                                                        .filter(s => s.id !== localStorage.getItem('current_session_id'))
                                                        .map(s => s.id);
                                                    setSelectedSessions(new Set(nonCurrentIds));
                                                } else {
                                                    setSelectedSessions(new Set());
                                                }
                                            }}
                                            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                                        />
                                        <label htmlFor="select-all-sessions" className="text-xs font-bold text-muted uppercase tracking-wider cursor-pointer">
                                            Select All Devices ({sessions.filter(s => s.id !== localStorage.getItem('current_session_id')).length} removable)
                                        </label>
                                    </div>
                                )}

                                <div className="space-y-3">
                                    {loadingSessions ? (
                                        <div className="text-center py-8 text-muted text-sm">Loading session history...</div>
                                    ) : sessions.length > 0 ? (
                                        sessions.map((session) => {
                                            const isCurrent = session.id === localStorage.getItem('current_session_id'); // Match logic from LoginModal
                                            const ua = session.ua_string || session.device_info || 'Unknown Device';
                                            let icon = <ExternalLink size={16} />;
                                            let os = 'Unknown Device';

                                            if (/Mobile|Android|iPhone/i.test(ua)) icon = <Smartphone size={16} />;
                                            else icon = <ExternalLink size={16} />; // Monitor icon ideally

                                            // Device detection - check mobile OS FIRST since Android UA contains "Linux"
                                            if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iPhone';
                                            else if (ua.includes('Android')) os = 'Android';
                                            else if (ua.includes('Windows')) os = 'Windows PC';
                                            else if (ua.includes('Mac')) os = 'Mac';
                                            else if (ua.includes('CrOS')) os = 'Chromebook';
                                            else if (ua.includes('Linux')) os = 'Linux';

                                            const isSelected = selectedSessions.has(session.id);

                                            return (
                                                <div key={session.id} className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border rounded-xl transition-all ${isCurrent ? 'bg-primary/5 border-primary/20' : isSelected ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800' : 'bg-bg border-border hover:border-gray-300 dark:hover:border-gray-600'}`}>
                                                    <div className="flex items-center gap-4">
                                                        {/* Checkbox for non-current sessions */}
                                                        {!isCurrent ? (
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                aria-label={`Select ${os} session for removal`}
                                                                onChange={(e) => {
                                                                    const newSet = new Set(selectedSessions);
                                                                    if (e.target.checked) {
                                                                        newSet.add(session.id);
                                                                    } else {
                                                                        newSet.delete(session.id);
                                                                    }
                                                                    setSelectedSessions(newSet);
                                                                }}
                                                                className="w-4 h-4 rounded border-gray-300 text-red-500 focus:ring-red-500 cursor-pointer"
                                                            />
                                                        ) : (
                                                            <div className="w-4" /> // Spacer for alignment
                                                        )}
                                                        <div className={`p-2 rounded-full border ${isCurrent ? 'bg-green-500/10 border-green-500/20 text-green-600' : 'bg-gray-100 border-gray-200 text-gray-500 dark:bg-neutral-800 dark:border-neutral-700'}`}>
                                                            {icon}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <h4 className="text-sm font-bold text-text">{os}</h4>
                                                                {!isCurrent && <span className="text-[10px] bg-gray-100 dark:bg-neutral-800 text-muted px-1.5 py-0.5 rounded border border-border">{session.ip_address}</span>}
                                                            </div>
                                                            <div className="flex items-center gap-3 text-xs text-muted mt-1">
                                                                <span className="flex items-center gap-1">
                                                                    <MapPin size={10} />
                                                                    {session.location || 'Unknown Location'}
                                                                </span>
                                                                <span className="w-1 h-1 rounded-full bg-muted/50" />
                                                                <span>{new Date(session.last_active).toLocaleString()}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        {isCurrent ? (
                                                            <span className="text-xs px-2 py-1 rounded-full bg-green-500/10 text-green-600 font-bold border border-green-500/20 flex items-center gap-1">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                                                Current Session
                                                            </span>
                                                        ) : (
                                                            <button
                                                                className="text-xs text-red-500 hover:text-red-600 font-bold px-3 py-1.5 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors flex items-center gap-1"
                                                                onClick={async () => {
                                                                    if (!confirm('Revoke this session? Device will be logged out immediately.')) return;
                                                                    await supabase.from('user_sessions').delete().eq('id', session.id);
                                                                    setSelectedSessions(prev => {
                                                                        const newSet = new Set(prev);
                                                                        newSet.delete(session.id);
                                                                        return newSet;
                                                                    });
                                                                    fetchSessions();
                                                                }}
                                                            >
                                                                <LogOut size={12} />
                                                                Revoke
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="text-center py-8 text-muted">
                                            <p>No active sessions found.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                
    );
};
