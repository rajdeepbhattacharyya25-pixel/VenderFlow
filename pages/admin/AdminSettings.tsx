import React, { useState } from 'react';
import { Settings, Shield, Database, Bell, LayoutGrid } from 'lucide-react';
import PlatformConfigPanel from '../../dashboard/components/PlatformConfigPanel';
import AdminSecurityPanel from '../../dashboard/components/AdminSecurityPanel';
import AdminBackupPanel from '../../dashboard/components/AdminBackupPanel';
import AdminNotificationsPanel from '../../dashboard/components/AdminNotificationsPanel';

const AdminSettings: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'general' | 'security' | 'backup' | 'notifications'>('general');

    const tabs = [
        { id: 'general', label: 'General', icon: LayoutGrid },
        { id: 'security', label: 'Security', icon: Shield },
        { id: 'backup', label: 'Data & Backup', icon: Database },
        { id: 'notifications', label: 'Notifications', icon: Bell },
    ];

    return (
        <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold text-white tracking-tight mb-8">Platform Settings</h1>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Sidebar Navigation */}
                <div className="w-full lg:w-64 flex-shrink-0">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden sticky top-24">
                        <div className="p-4 border-b border-neutral-800">
                            <h2 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Configuration</h2>
                        </div>
                        <nav className="p-2 space-y-1">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === tab.id
                                            ? 'bg-indigo-600/10 text-indigo-400'
                                            : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
                                        }`}
                                >
                                    <tab.icon size={18} />
                                    {tab.label}
                                </button>
                            ))}
                        </nav>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 min-w-0">
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {activeTab === 'general' && <PlatformConfigPanel />}
                        {activeTab === 'security' && <AdminSecurityPanel />}
                        {activeTab === 'backup' && <AdminBackupPanel />}
                        {activeTab === 'notifications' && <AdminNotificationsPanel />}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminSettings;
