import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Camera, RefreshCw, Grid, Shield, Smartphone, Zap, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface LiveCameraModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCapture: (imageDataUrl: string) => void;
}

const LiveCameraModal: React.FC<LiveCameraModalProps> = ({ isOpen, onClose, onCapture }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [showGrid, setShowGrid] = useState(true);
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
    const [isInitializing, setIsInitializing] = useState(true);
    const [isFlash, setIsFlash] = useState(false);

    const stopCamera = useCallback(() => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    }, [stream]);

    const startCamera = useCallback(async () => {
        setIsInitializing(true);
        setError(null);
        stopCamera();

        try {
            const constraints = {
                video: {
                    facingMode: facingMode,
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    aspectRatio: { ideal: 1 }
                },
                audio: false
            };

            const newStream = await navigator.mediaDevices.getUserMedia(constraints);
            setStream(newStream);
            if (videoRef.current) {
                videoRef.current.srcObject = newStream;
            }
            setTimeout(() => setIsInitializing(false), 800);
        } catch (err: unknown) {
            console.error('Camera access error:', err);
            const errorObj = err as { name?: string };
            setError(errorObj.name === 'NotAllowedError' 
                ? 'Camera access denied. Please enable it in your browser settings.' 
                : 'Unable to access camera. Please check your device connections.');
            setIsInitializing(false);
        }
    }, [facingMode, stopCamera]);

    useEffect(() => {
        if (isOpen) {
            startCamera();
        } else {
            stopCamera();
        }
        return () => stopCamera();
    }, [isOpen, facingMode, startCamera, stopCamera]);

    const handleCapture = () => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        if (!ctx) return;

        // Force 1:1 Square Capture
        const size = Math.min(video.videoWidth, video.videoHeight);
        const startX = (video.videoWidth - size) / 2;
        const startY = (video.videoHeight - size) / 2;

        canvas.width = size;
        canvas.height = size;

        // Flip image if using front camera
        if (facingMode === 'user') {
            ctx.translate(size, 0);
            ctx.scale(-1, 1);
        }

        ctx.drawImage(video, startX, startY, size, size, 0, 0, size, size);

        // Flash effect
        setIsFlash(true);
        setTimeout(() => setIsFlash(false), 150);

        // Haptic feedback
        if ('vibrate' in navigator) {
            navigator.vibrate(50);
        }

        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        
        // Brief delay for the flash to be visible before closing
        setTimeout(() => {
            onCapture(dataUrl);
            onClose();
        }, 200);
    };

    const toggleCamera = () => {
        setFacingMode(prev => (prev === 'user' ? 'environment' : 'user'));
    };

    if (!isOpen) return null;

    return createPortal(
        <AnimatePresence>
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center overflow-hidden"
            >
                {/* Header Controls */}
                <div className="absolute top-0 left-0 right-0 pt-safe h-[calc(4rem+env(safe-area-inset-top))] flex items-center justify-between px-6 bg-gradient-to-b from-black/80 to-transparent z-10">
                    <button 
                        onClick={onClose}
                        title="Close Camera"
                        aria-label="Close Camera"
                        className="p-3 rounded-full bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-all active:scale-95"
                    >
                        <X size={24} />
                    </button>

                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => {
                                setShowGrid(!showGrid);
                                if ('vibrate' in navigator) navigator.vibrate(10);
                            }}
                            className={`p-3 rounded-full transition-all active:scale-95 ${showGrid ? 'bg-sky-500 text-white' : 'bg-white/10 text-white/70'}`}
                            title="Toggle Grid"
                        >
                            <Grid size={22} />
                        </button>
                        <button 
                            onClick={() => {
                                toggleCamera();
                                if ('vibrate' in navigator) navigator.vibrate(20);
                            }}
                            className="p-3 rounded-full bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-all active:scale-95"
                            title="Flip Camera"
                        >
                            <RefreshCw size={22} />
                        </button>
                    </div>
                </div>

                {/* Camera Viewport */}
                <div className="relative w-full aspect-square max-w-[500px] flex items-center justify-center overflow-hidden bg-zinc-900 border-y border-white/5">
                    {isInitializing && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-20">
                            <motion.div 
                                animate={{ opacity: [0.3, 0.6, 0.3] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                                className="w-16 h-16 rounded-2xl border-2 border-sky-500/50 flex items-center justify-center"
                            >
                                <Zap size={32} className="text-sky-500" />
                            </motion.div>
                            <p className="mt-4 text-sky-500/60 text-xs font-black tracking-widest uppercase">Initializing Studio</p>
                        </div>
                    )}

                    {error ? (
                        <div className="p-8 text-center space-y-4">
                            <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 flex items-center justify-center">
                                <AlertCircle size={32} className="text-red-500" />
                            </div>
                            <p className="text-white font-medium">{error}</p>
                            <button 
                                onClick={startCamera}
                                className="px-6 py-2 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-all font-bold"
                            >
                                Try Again
                            </button>
                        </div>
                    ) : (
                        <>
                            <video 
                                ref={videoRef}
                                autoPlay 
                                playsInline 
                                muted
                                className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                            />
                            
                            {/* Square Guide Mask */}
                            <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none">
                                <div className="w-full h-full border border-white/20 relative">
                                    {/* Grid Lines */}
                                    {showGrid && (
                                        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
                                            <div className="border-r border-b border-white/20"></div>
                                            <div className="border-r border-b border-white/20"></div>
                                            <div className="border-b border-white/20"></div>
                                            <div className="border-r border-b border-white/20"></div>
                                            <div className="border-r border-b border-white/20"></div>
                                            <div className="border-b border-white/20"></div>
                                            <div className="border-r border-white/20"></div>
                                            <div className="border-r border-white/20"></div>
                                            <div></div>
                                        </div>
                                    )}
                                    
                                    {/* Corner Accents */}
                                    <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-sky-500"></div>
                                    <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-sky-500"></div>
                                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-sky-500"></div>
                                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-sky-500"></div>

                                    {/* Pro Badge */}
                                    <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 bg-sky-500/10 backdrop-blur-md rounded-md scale-75 origin-top-left border border-sky-500/30">
                                        <div className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse"></div>
                                        <span className="text-[10px] font-black text-sky-500 tracking-widest uppercase">VF_STUDIO_ALPHA</span>
                                    </div>
                                </div>
                            </div>

                            {/* Flash Effect Overlay */}
                            <AnimatePresence>
                                {isFlash && (
                                    <motion.div 
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="absolute inset-0 bg-white z-50"
                                    />
                                )}
                            </AnimatePresence>
                        </>
                    )}
                </div>

                {/* Bottom Controls */}
                <div className="absolute bottom-0 left-0 right-0 pb-safe h-[calc(10rem+env(safe-area-inset-bottom))] flex flex-col items-center justify-center gap-6 bg-gradient-to-t from-black/80 to-transparent">
                    <div className="flex items-center gap-12 mb-4 shrink-0">
                        <div className="flex flex-col items-center opacity-40">
                            <Smartphone size={20} className="text-white mb-1" />
                            <span className="text-[10px] font-bold uppercase tracking-tighter">Mobile View</span>
                        </div>
                        
                        <button 
                            onClick={handleCapture}
                            disabled={isInitializing || !!error}
                            title="Capture Photo"
                            aria-label="Capture Photo"
                            className={`group relative w-24 h-24 rounded-full flex items-center justify-center transition-all ${isInitializing || !!error ? 'opacity-20 grayscale cursor-not-allowed' : 'active:scale-90 scale-110'}`}
                        >
                            <div className="absolute inset-0 rounded-full border-4 border-white/30 group-hover:border-white/50 transition-all"></div>
                            <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-2xl">
                                <Camera size={40} className="text-black" />
                            </div>
                        </button>
...

                        <div className="flex flex-col items-center text-sky-500">
                            <Zap size={20} className="mb-1" />
                            <span className="text-[10px] font-bold uppercase tracking-tighter">1:1 Snap</span>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
                        <Shield size={14} className="text-emerald-400" />
                        <span className="text-[10px] text-white/50 font-medium tracking-wide">Camera access is used only to capture product images</span>
                    </div>
                </div>

                <canvas ref={canvasRef} className="hidden" />
            </motion.div>
        </AnimatePresence>,
        document.body
    );
};

export default LiveCameraModal;
