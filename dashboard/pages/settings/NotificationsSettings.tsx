import React from 'react';
import { Bell as NotificationIcon, Smartphone, Mail, AlertCircle } from 'lucide-react';
import { TelegramSettings } from '../../components/TelegramSettings';

export const NotificationsSettings = ({ settings, setSettings, renderHeader, handleLogoUpload, saving, setSaving, show2FAModal, setShow2FAModal, timeoutVal, setTimeoutVal, timeoutUnit, setTimeoutUnit, systemStatus, apiUsage, loadingApiUsage, sessions, loadingSessions, selectedSessions, setSelectedSessions, isRevoking, handleRevokeSession, handleRevokeSelected, formatUaString, getDeviceIcon, DEFAULT_THEME_CONFIG, activePreviews, previewLoading, setPreviewLoading, fetchPreviews }: any) => {
    return (
        <div className="bg-panel rounded-2xl p-4 md:p-6 lg:p-8 border border-border shadow-sm animate-fadeIn">
                        {renderHeader('Notifications', <NotificationIcon size={20} />)}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                            {[
                                { id: 'low_stock', label: 'Low Stock Alerts', desc: 'Get notified when items drop below 5 units.' },
                                { id: 'payment_received', label: 'Payment Received', desc: 'Instant confirmation for every successful sale.' },
                                { id: 'daily_summary', label: 'Daily Sales Summary', desc: 'A snapshot of your shop performance every evening.' },
                                { id: 'overdue_bills', label: 'Overdue Bills', desc: 'Alerts for unpaid vendor invoices.' }
                            ].map((item) => (
                                <div key={item.id} className="flex justify-between items-start">
                                    <div className="max-w-[200px]">
                                        <h4 className="font-bold text-sm text-text mb-1">{item.label}</h4>
                                        <p className="text-xs text-muted leading-relaxed">{item.desc}</p>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="flex flex-col items-center gap-1.5">
                                            <Mail size={14} className="text-muted" />
                                            <input
                                                type="checkbox"
                                                checked={(settings.notifications as any)[`${item.id}_email`]}
                                                onChange={(e) => setSettings({
                                                    ...settings,
                                                    notifications: { ...settings.notifications, [`${item.id}_email`]: e.target.checked }
                                                } as any)}
                                                className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                                                aria-label={`${item.label} email notification`}
                                            />
                                        </div>
                                        <div className="flex flex-col items-center gap-1.5">
                                            <Smartphone size={14} className="text-muted" />
                                            <button
                                                type="button"
                                                onClick={() => setSettings({
                                                    ...settings,
                                                    notifications: { ...settings.notifications, [`${item.id}_push`]: !(settings.notifications as any)[`${item.id}_push`] }
                                                } as any)}
                                                className={`w-5 h-5 rounded flex items-center justify-center cursor-pointer transition-colors ${(settings.notifications as any)[`${item.id}_push`] ? 'bg-green-500' : 'bg-gray-200'
                                                    }`}
                                                aria-label={`${item.label} push notification`}
                                                aria-pressed={(settings.notifications as any)[`${item.id}_push`] ? "true" : "false"}
                                            >
                                                <div className="w-2 h-2 bg-white rounded-full"></div>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-12">
                            <h4 className="font-bold text-lg text-text border-b border-border pb-2 mb-6">Telegram Integration</h4>
                            <TelegramSettings />
                        </div>
                    </div>
                
    );
};
