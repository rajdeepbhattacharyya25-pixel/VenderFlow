import React, { useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  type Crop,
  type PixelCrop
} from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import {
  X,
  Loader2,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize,
  Square,
  Monitor,
  Smartphone,
  RotateCw,
  Check,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { unifiedUpload } from '../../lib/vault';
import { logAlert } from '../../../lib/notifications';
import { supabase } from '../../../lib/supabase';

interface ImageEditorModalProps {
    isOpen: boolean;
    imageSrc: string;
    onClose: () => void;
    onComplete: (imageUrl: string) => void;
    productId?: string;
}

const ASPECT_OPTIONS = [
    { label: '1:1',   value: 1,             icon: Square    },
    { label: 'Free',  value: undefined,     icon: Maximize  },
    { label: '4:3',   value: 4 / 3,         icon: Monitor   },
    { label: '16:9',  value: 16 / 9,        icon: Smartphone },
    { label: '3:4',   value: 3 / 4,         icon: Smartphone },
];

function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number | undefined) {
  return centerCrop(
    makeAspectCrop(
      { unit: '%', width: 90 },
      aspect || 1,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  );
}

async function getCroppedImg(
    image: HTMLImageElement,
    pixelCrop: PixelCrop,
    rotation: number = 0
): Promise<File> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    canvas.width = pixelCrop.width * scaleX;
    canvas.height = pixelCrop.height * scaleY;

    ctx.imageSmoothingQuality = 'high';

    const rotateRads = rotation * Math.PI / 180;
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(rotateRads);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);

    ctx.drawImage(
      image,
      pixelCrop.x * scaleX,
      pixelCrop.y * scaleY,
      pixelCrop.width * scaleX,
      pixelCrop.height * scaleY,
      0,
      0,
      pixelCrop.width * scaleX,
      pixelCrop.height * scaleY
    );
    ctx.restore();

    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (!blob) { reject(new Error('Canvas crop failed')); return; }
            resolve(new File([blob], 'product-image.webp', { type: 'image/webp' }));
        }, 'image/webp', 0.9);
    });
}

const ImageEditorModal: React.FC<ImageEditorModalProps> = ({
    isOpen,
    imageSrc,
    onClose,
    onComplete,
    productId = 'temp-new-product'
}) => {
    const [crop, setCrop] = useState<Crop>();
    const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [aspect, setAspect] = useState<number | undefined>(1);
    const [uploading, setUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isAiEnhance, setIsAiEnhance] = useState(false);

    const imgRef = useRef<HTMLImageElement>(null);

    const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
      const { width, height } = e.currentTarget;
      setCrop(centerAspectCrop(width, height, aspect));
    }, [aspect]);

    const handleAspectChange = (newAspect: number | undefined) => {
      setAspect(newAspect);
      if (imgRef.current) {
        const { width, height } = imgRef.current;
        setCrop(centerAspectCrop(width, height, newAspect));
      }
    };

    const handleApply = async () => {
        if (!completedCrop || !imgRef.current) return;
        setUploading(true);
        setError(null);
        setUploadStatus('Uploading…');
        try {
            const croppedFile = await getCroppedImg(imgRef.current, completedCrop, rotation);
            const result = await unifiedUpload({
                file: croppedFile,
                productId,
                isPrimary: false,
                mediaType: 'image',
            });
            onComplete(result.url);
            if ('vibrate' in navigator) navigator.vibrate([10, 30, 10]); // Success pattern
            handleClose();
        } catch (err: unknown) {
            const e = err as { message?: string, code?: string };
            console.error('Editor failed:', err);
            setError(e.message || 'Upload failed');
            
            const { data: { user } } = await supabase.auth.getUser();
            logAlert({
                type: 'EDITOR_UPLOAD_FAILED',
                severity: 'critical',
                title: 'Editor Upload Failed',
                message: `Studio editor failed to upload product image. ${e.message || 'Unknown error'}`,
                seller_id: user?.id,
                metadata: { operation_type: 'editor_upload', resource_id: productId, error_code: e.code || 'EDITOR_ERROR' }
            });
        } finally {
            setUploading(false);
            setUploadStatus('');
        }
    };

    const handleClose = () => {
        setCrop(undefined);
        setCompletedCrop(undefined);
        setZoom(1);
        setRotation(0);
        setAspect(1);
        setError(null);
        onClose();
    };

    const handleReset = () => {
        if (imgRef.current) {
          const { width, height } = imgRef.current;
          setCrop(centerAspectCrop(width, height, aspect));
        }
        setZoom(1);
        setRotation(0);
        if ('vibrate' in navigator) navigator.vibrate(20);
    };


    const cycleRotation = () => {
        setRotation(prev => {
            let next = prev + 90;
            // Wrap from 180 to -179 range (standard canvas/transform range)
            if (next > 180) next -= 360;
            if ('vibrate' in navigator) navigator.vibrate(10);
            return next;
        });
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[60] flex flex-col bg-black overflow-hidden editor-touch-container">

            {/* ── Header ─────────────────────────────────────────── */}
            <div className="shrink-0 h-[calc(3.25rem+env(safe-area-inset-top))] pt-safe flex items-center justify-between px-6 border-b border-white/5 bg-black/95 backdrop-blur-xl z-[70]">
                <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                        <span className="text-[9px] font-black tracking-[0.3em] uppercase text-cyan-500/50">
                            VenderFlow
                        </span>
                        <span className="text-[11px] font-bold tracking-tight text-white/90">
                            Studio Editor
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => {
                            setIsAiEnhance(!isAiEnhance);
                            if ('vibrate' in navigator) navigator.vibrate(5);
                        }}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all border ${
                            isAiEnhance 
                            ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400 shadow-lg shadow-cyan-500/20' 
                            : 'bg-white/5 border-white/10 text-white/40 hover:text-white/60'
                        }`}
                        title="AI Background Removal (Preview)"
                    >
                        <Sparkles size={12} className={isAiEnhance ? 'animate-pulse' : ''} />
                        <span>AI Remove BG</span>
                    </button>
                    
                    <div className="w-px h-6 bg-white/10 mx-1" />

                    <button
                        onClick={handleClose}
                        className="p-2.5 rounded-full text-white/40 hover:text-white hover:bg-white/10 active:scale-95 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center border border-white/5"
                        aria-label="Close editor"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* ── Workspace ──────────────────────────────────────── */}
            <div className="flex-1 relative flex items-center justify-center overflow-hidden p-4 sm:p-12">
                <div
                    className="relative transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1)"
                    style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}
                >
                    <ReactCrop
                        crop={crop}
                        onChange={(c) => setCrop(c)}
                        onComplete={(c) => setCompletedCrop(c)}
                        aspect={aspect}
                        className="max-h-[60vh] shadow-2xl shadow-black/50"
                    >
                        <img
                            ref={imgRef}
                            src={imageSrc}
                            onLoad={onImageLoad}
                            alt="Edit target"
                            className="max-h-[60vh] w-auto object-contain select-none rounded-sm border border-white/5"
                            crossOrigin="anonymous"
                            draggable={false}
                        />
                    </ReactCrop>
                </div>

                {/* Error banner */}
                {error && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-5 py-3 bg-red-500/20 border border-red-500/40 rounded-2xl text-red-400 text-xs font-black uppercase tracking-widest backdrop-blur-md shadow-2xl z-[80]">
                        <AlertCircle size={14} />
                        {error}
                    </div>
                )}
            </div>

            {/* ── Bottom Controls ─────────────────────────────────── */}
            <div className="shrink-0 bg-black/95 backdrop-blur-xl border-t border-white/5 pb-[env(safe-area-inset-bottom)]">
                
                {/* Layer 1: Essential Tools (Reset, Zoom, Rotate) */}
                <div className="px-6 py-4 flex items-center justify-between gap-6 border-b border-white/5">
                    {/* Zoom & Rotate Slider Group */}
                    <div className="flex-1 flex flex-col gap-4">
                        {/* Zoom Slider */}
                        <div className="flex items-center gap-3">
                            <ZoomOut size={14} className="text-white/20 shrink-0" />
                            <div className="flex-1 relative h-8 flex items-center">
                                <input
                                    type="range"
                                    min={0.5} max={2} step={0.05}
                                    value={zoom}
                                    onChange={(e) => setZoom(Number(e.target.value))}
                                    className="w-full h-1 rounded-full appearance-none cursor-pointer accent-cyan-500 bg-white/10"
                                    aria-label="Zoom"
                                />
                            </div>
                            <ZoomIn size={14} className="text-white/20 shrink-0" />
                        </div>

                        {/* Rotation Control: Cycle 90 + Current display */}
                        <div className="flex items-center gap-3">
                             <button
                                onClick={cycleRotation}
                                className="w-12 h-12 flex items-center justify-center rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 active:scale-90 transition-all shadow-lg shadow-cyan-500/5 group"
                                title="Rotate 90° CW"
                                aria-label="Rotate clockwise 90 degrees"
                            >
                                <RotateCw size={20} className="group-active:rotate-90 transition-transform duration-300" />
                            </button>
                            
                            <div className="flex-1 flex flex-col items-center bg-white/5 rounded-2xl py-1.5 px-4 border border-white/5">
                                <span className="text-[11px] font-mono text-cyan-500 font-black tracking-widest">{rotation}°</span>
                                <div className="flex gap-2 mt-1">
                                    {[0, 1, 2, 3].map(i => {
                                        const angle = i * 90;
                                        // Normalize angle to -180...180 for match
                                        const normalized = angle > 180 ? angle - 360 : angle;
                                        const isActive = Math.abs(rotation - normalized) < 45;
                                        return (
                                            <div key={i} className={`w-1 h-1 rounded-full ${isActive ? 'bg-cyan-500' : 'bg-white/10'}`} />
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="w-px h-16 bg-white/5" />

                    {/* Reset Button (Tactile) */}
                    <button
                        onClick={handleReset}
                        className="flex flex-col items-center justify-center gap-2 p-3 rounded-2xl text-white/40 hover:text-white hover:bg-white/5 active:scale-90 transition-all group lg:min-w-[70px]"
                        title="Reset Transforms"
                    >
                        <div className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 border border-white/5 group-hover:border-white/20">
                            <RotateCcw size={18} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-tighter">Reset</span>
                    </button>
                </div>

                {/* Layer 2: Aspect Ratio Strip (Horizontal Scroll) */}
                <div className="flex gap-2.5 px-6 py-4 overflow-x-auto no-scrollbar">
                    {ASPECT_OPTIONS.map((opt) => {
                        const isActive = aspect === opt.value;
                        return (
                            <button
                                key={opt.label}
                                onClick={() => {
                                    handleAspectChange(opt.value);
                                    if ('vibrate' in navigator) navigator.vibrate(5);
                                }}
                                className={`shrink-0 flex flex-col items-center justify-center gap-1.5 px-5 py-3 rounded-2xl text-xs font-bold border transition-all active:scale-95 min-w-[72px] ${
                                    isActive
                                        ? 'bg-cyan-500 text-black border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                                        : 'bg-white/5 border-white/5 text-white/40 hover:text-white/70 hover:border-white/10'
                                }`}
                                aria-pressed={isActive}
                            >
                                <opt.icon size={16} />
                                <span className="font-black text-[10px] uppercase tracking-wide">{opt.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Layer 3: Primary Actions (Touch Arc Zone) */}
                <div className="grid grid-cols-2 gap-4 px-6 pb-4 sm:pb-6 pt-2">
                    <button
                        onClick={handleClose}
                        className="px-6 py-4 rounded-3xl border border-white/5 bg-white/5 text-white/40 font-black text-xs uppercase tracking-[0.2em] hover:bg-white/10 hover:text-white active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleApply}
                        disabled={uploading || !completedCrop}
                        className="flex items-center justify-center gap-3 py-4 rounded-3xl font-black text-xs uppercase tracking-[0.2em] transition-all active:scale-[0.98] disabled:opacity-30 bg-cyan-500 text-black shadow-[0_8px_30px_rgba(6,182,212,0.3)] hover:bg-cyan-400"
                    >
                        {uploading ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                <span>{uploadStatus || 'Saving…'}</span>
                            </>
                        ) : (
                            <>
                                <Check size={18} strokeWidth={3} />
                                <span>Apply Crop</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ImageEditorModal;
