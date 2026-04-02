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
  AlertCircle
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
    { label: 'Free',  value: undefined,     icon: Maximize  },
    { label: '1:1',   value: 1,             icon: Square    },
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
    const [aspect, setAspect] = useState<number | undefined>(undefined);
    const [uploading, setUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState('');
    const [error, setError] = useState<string | null>(null);

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
        setAspect(undefined);
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

    const nudgeZoom = (delta: number) =>
        setZoom(z => Math.min(2, Math.max(0.5, parseFloat((z + delta).toFixed(2)))));

    const nudgeRotation = (delta: number) =>
        setRotation(r => Math.min(180, Math.max(-180, r + delta)));

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[60] flex flex-col bg-black overflow-hidden editor-touch-container">

            {/* ── Header ─────────────────────────────────────────── */}
            <div className="shrink-0 h-[calc(3.5rem+env(safe-area-inset-top))] pt-safe flex items-center justify-between px-4 sm:px-8 border-b border-white/5 bg-black/80 backdrop-blur-sm z-[70]">
                <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black tracking-[0.25em] uppercase text-white/25">
                        Studio Editor
                    </span>
                    <div className="h-3 w-px bg-white/10 hidden sm:block" />
                    <button
                        onClick={handleReset}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-white/40 hover:text-cyan-400 hover:bg-white/5 active:scale-95 transition-all min-h-[44px] min-w-[44px] justify-center"
                        title="Reset"
                        aria-label="Reset crop and transforms"
                    >
                        <RotateCcw size={16} />
                        <span className="hidden sm:inline text-[11px] font-medium">Reset</span>
                    </button>
                </div>

                <button
                    onClick={handleClose}
                    className="p-3 rounded-xl text-white/40 hover:text-white hover:bg-white/10 active:scale-95 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
                    title="Exit Editor"
                    aria-label="Close editor"
                >
                    <X size={20} />
                </button>
            </div>

            {/* ── Workspace ──────────────────────────────────────── */}
            <div className="flex-1 relative flex items-center justify-center overflow-hidden p-3 sm:p-8 sm:pb-4">
                <div
                    className="relative transition-transform duration-300 ease-out"
                    style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}
                >
                    <ReactCrop
                        crop={crop}
                        onChange={(c) => setCrop(c)}
                        onComplete={(c) => setCompletedCrop(c)}
                        aspect={aspect}
                        className="max-h-[calc(100vh-220px)] sm:max-h-[70vh]"
                    >
                        <img
                            ref={imgRef}
                            src={imageSrc}
                            onLoad={onImageLoad}
                            alt="Edit target"
                            className="max-h-[calc(100vh-220px)] sm:max-h-[70vh] w-auto object-contain select-none"
                            crossOrigin="anonymous"
                            draggable={false}
                        />
                    </ReactCrop>
                </div>

                {/* Error banner */}
                {error && (
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2.5 bg-red-500/20 border border-red-500/40 rounded-xl text-red-400 text-sm font-medium backdrop-blur-sm shadow-lg whitespace-nowrap">
                        <AlertCircle size={16} />
                        {error}
                    </div>
                )}
            </div>

            {/* ── Bottom Controls ─────────────────────────────────── */}
            <div className="shrink-0 bg-black/90 backdrop-blur-sm border-t border-white/5 pb-safe">

                {/* Aspect Ratio Strip — scrollable chips */}
                <div className="flex gap-2 px-4 pt-3 pb-2 overflow-x-auto no-scrollbar">
                    {ASPECT_OPTIONS.map((opt) => {
                        const isActive = aspect === opt.value;
                        return (
                            <button
                                key={opt.label}
                                onClick={() => {
                                    handleAspectChange(opt.value);
                                    if ('vibrate' in navigator) navigator.vibrate(5);
                                }}
                                className={`shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold border transition-all active:scale-95 min-h-[48px] ${
                                    isActive
                                        ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
                                        : 'bg-white/5 border-white/10 text-white/40 hover:text-white hover:border-white/20'
                                }`}
                                aria-pressed={isActive}
                                aria-label={`Aspect ratio ${opt.label}`}
                            >
                                <opt.icon size={14} />
                                <span>{opt.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Sliders Row with touch-friendly +/- buttons */}
                <div className="flex items-center gap-3 px-4 pb-3 pt-1">
                    {/* Zoom control */}
                    <div className="flex-1 flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2 min-h-[48px]">
                        <ZoomOut size={14} className="text-white/30 shrink-0" />
                        <input
                            type="range"
                            min={0.5} max={2} step={0.05}
                            value={zoom}
                            onChange={(e) => setZoom(Number(e.target.value))}
                            className="flex-1 h-1 rounded-full appearance-none cursor-pointer accent-cyan-400 bg-white/10"
                            aria-label="Zoom"
                        />
                        <ZoomIn size={14} className="text-white/30 shrink-0" />
                        <button
                            onClick={() => nudgeZoom(0.1)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/10 text-white/60 hover:text-cyan-400 hover:bg-cyan-500/10 active:scale-90 transition-all text-base font-bold leading-none"
                            aria-label="Zoom in"
                        >+</button>
                        <span className="text-[10px] font-mono text-white/30 w-7 text-right">{zoom.toFixed(1)}x</span>
                    </div>

                    {/* Rotate control */}
                    <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2 min-h-[48px]">
                        <button
                            onClick={() => nudgeRotation(-90)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 text-white/50 hover:text-cyan-400 hover:bg-cyan-500/10 active:scale-90 transition-all"
                            title="Rotate -90°"
                            aria-label="Rotate counter-clockwise 90 degrees"
                        >
                            <RotateCcw size={15} />
                        </button>
                        <span className="text-[11px] font-mono text-white/30 w-10 text-center">{rotation}°</span>
                        <button
                            onClick={() => nudgeRotation(90)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 text-white/50 hover:text-cyan-400 hover:bg-cyan-500/10 active:scale-90 transition-all"
                            title="Rotate +90°"
                            aria-label="Rotate clockwise 90 degrees"
                        >
                            <RotateCw size={15} />
                        </button>
                    </div>
                </div>

                {/* Primary CTA — thumb zone, full-width on mobile */}
                <div className="flex gap-3 px-4 pb-4 pt-1">
                    <button
                        onClick={handleClose}
                        className="px-5 py-3.5 rounded-2xl border border-white/10 text-white/50 font-semibold hover:border-white/20 hover:text-white active:scale-95 transition-all min-h-[52px]"
                        aria-label="Cancel and close editor"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleApply}
                        disabled={uploading || !completedCrop}
                        className="flex-1 flex items-center justify-center gap-2.5 py-3.5 rounded-2xl font-black text-sm uppercase tracking-wider transition-all active:scale-[0.98] min-h-[52px] disabled:opacity-40 disabled:cursor-not-allowed bg-cyan-500 hover:bg-cyan-400 text-black shadow-lg shadow-cyan-500/25"
                        aria-label={uploading ? 'Saving image…' : 'Apply crop and save'}
                    >
                        {uploading ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                <span>{uploadStatus || 'Saving…'}</span>
                            </>
                        ) : (
                            <>
                                <Check size={16} />
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
