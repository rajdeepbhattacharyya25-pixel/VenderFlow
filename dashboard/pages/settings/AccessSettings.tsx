import React from 'react';
import { Users, AlertCircle } from 'lucide-react';
import { SharedAccessPanel } from '../../components/SharedAccessPanel';

export const AccessSettings = ({ settings, setSettings, renderHeader, handleLogoUpload, saving, setSaving, show2FAModal, setShow2FAModal, timeoutVal, setTimeoutVal, timeoutUnit, setTimeoutUnit, systemStatus, apiUsage, loadingApiUsage, sessions, loadingSessions, selectedSessions, setSelectedSessions, isRevoking, handleRevokeSession, handleRevokeSelected, formatUaString, getDeviceIcon, DEFAULT_THEME_CONFIG, activePreviews, previewLoading, setPreviewLoading, fetchPreviews }: any) => {
    return (
        <SharedAccessPanel />
                
    );
};
