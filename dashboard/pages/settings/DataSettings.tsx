import React, { useEffect, useState } from 'react';
import { Database, Lock } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { BackupManager } from '../../components/backup/BackupManager';

export const DataSettings = ({ renderHeader }: any) => {
    const [sellerId, setSellerId] = useState<string | undefined>();

    useEffect(() => {
        const fetchUser = async () => {
            const { data } = await supabase.auth.getUser();
            if (data.user) {
                setSellerId(data.user.id);
            }
        };
        fetchUser();
    }, []);

    return (
        <div className="bg-panel rounded-2xl p-4 md:p-6 lg:p-8 border border-border shadow-sm animate-fadeIn">
            {renderHeader('Data & Backup', <Database size={20} />)}

            <div className="mb-6">
                <BackupManager sellerId={sellerId} />
            </div>

            <div className="bg-orange-50 border border-orange-100 p-5 rounded-2xl flex items-start gap-4">
                <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                    <Lock size={18} />
                </div>
                <div>
                    <h4 className="font-bold text-sm text-orange-900 mb-1">Data Ownership</h4>
                    <p className="text-xs text-orange-800/80 leading-relaxed">
                        We believe you should own your data. These backups are saved directly to your personal Google Drive, giving you full control and access to your business records even if you leave our platform.
                    </p>
                </div>
            </div>
        </div>
    );
};
