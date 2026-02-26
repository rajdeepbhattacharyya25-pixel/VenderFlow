import React, { useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import './OfflineOverlay.css';

// Custom "Outlined" WiFi Icon
const CustomWifiIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className={className} xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="19" r="2.5" />
        <path d="M 5 12 A 10 10 0 0 1 19 12 L 17 14 A 7 7 0 0 0 7 14 Z" />
        <path d="M 0.7 7.7 A 16 16 0 0 1 23.3 7.7 L 21.2 9.8 A 13 13 0 0 0 2.8 9.8 Z" />
    </svg>
);

const OfflineOverlay: React.FC = () => {
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const [isSurging, setIsSurging] = useState(false);

    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // --- ULTRA-HARD SYNC FIX ---
        // Problem: CSS animations start when the element is painted. 
        // If React repaints them slightly differently, they desync.
        // Solution: Force them all to START at the same time.

        const forceSync = () => {
            const anims = document.getAnimations();

            // Find all animations named 'swing'
            const swingAnims = anims.filter(a => {
                // Type guard for CSSAnimation (has animationName)
                return (a as any).animationName === 'swing';
            });

            if (swingAnims.length > 0) {
                // Hard Reset: Force them all to restart at t=0 relative to timeline
                // This snaps them into perfect phase.
                const now = document.timeline.currentTime;
                swingAnims.forEach(a => {
                    a.startTime = now;
                    a.currentTime = 0;
                });
            }
        };

        // Run immediately
        forceSync();

        // Run again if visibility changes (handled by effect dependency)
        // Also keep a slow check just in case browser drifts (tab inactive etc)
        const checkInterval = setInterval(() => {
            const anims = document.getAnimations();
            const swingAnims = anims.filter(a => (a as any).animationName === 'swing');
            if (swingAnims.length >= 2) {
                const t0 = swingAnims[0].currentTime;
                // If drifted by > 16ms (1 frame), snap first to second
                if (Math.abs(Number(t0) - Number(swingAnims[1].currentTime)) > 16) {
                    forceSync();
                }
            }
        }, 1000);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            clearInterval(checkInterval);
        };
    }, [isOffline]); // Re-run when offline state changes (visibility)

    const handleDismiss = () => {
        setIsSurging(true);
        setTimeout(() => window.location.reload(), 600);
    };

    if (!isOffline && !isSurging) return null;

    return (
        <div className={`offline-overlay-root visible`}>
            {/* --- PHYSICS LAYER (The Hidden Object) --- */}
            <div className="wifi-physics-layer">
                <CustomWifiIcon className="wifi-bright-icon" />

                {/* The Mask Container - Multiplies the Scene */}
                <div className="wifi-mask-container">
                    {/* SHARED MECHANISM: Must match Spotlight exactly */}
                    <div className="swing-mechanism">
                        <div className="wifi-mask-beam" />
                    </div>
                </div>
            </div>

            {/* --- SPOTLIGHT LAYER (The Visible Light) --- */}
            {/* PROOF OF SYNC: Uses the EXACT same class 'swing-mechanism' */}
            <div className="spotlight-container swing-mechanism">
                <div className="spotlight-source" />
                <div className="spotlight-beam" />
            </div>

            {/* --- VIGNETTE & CONTENT --- */}
            <div className="offline-vignette" />

            <div className="offline-content">
                <h1 className="offline-title">No internet connection</h1>
                <p className="offline-subtitle">Please connect to the internet and retry</p>

                <button
                    className={`offline-btn ${isSurging ? 'surging' : ''}`}
                    onClick={handleDismiss}
                    aria-label="Retry Connection"
                    disabled={isSurging}
                >
                    <RotateCcw size={24} strokeWidth={2} />
                    <span>RETRY</span>
                </button>
            </div>
        </div>
    );
};

export default OfflineOverlay;
