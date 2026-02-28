import React, { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
import { X, Loader2, RotateCcw, ZoomIn, Maximize, Square, Monitor, Smartphone } from 'lucide-react';
import { uploadToImgBB } from '../../lib/imgbb';

interface ImageEditorModalProps {
    isOpen: boolean;
    imageSrc: string;
    onClose: () => void;
    onComplete: (imageUrl: string) => void;
}

const ASPECT_OPTIONS = [
    { label: 'Free', value: 0, icon: Maximize },
    { label: '1:1', value: 1, icon: Square },
    { label: '4:3', value: 4 / 3, icon: Monitor },
    { label: '16:9', value: 16 / 9, icon: Smartphone },
];

async function getCroppedImg(imageSrc: string, pixelCrop: Area, rotation: number = 0): Promise<File> {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    const radians = (rotation * Math.PI) / 180;
    const sin = Math.abs(Math.sin(radians));
    const cos = Math.abs(Math.cos(radians));
    const rotatedWidth = image.width * cos + image.height * sin;
    const rotatedHeight = image.width * sin + image.height * cos;

    canvas.width = rotatedWidth;
    canvas.height = rotatedHeight;

    ctx.translate(rotatedWidth / 2, rotatedHeight / 2);
    ctx.rotate(radians);
    ctx.translate(-image.width / 2, -image.height / 2);
    ctx.drawImage(image, 0, 0);

    const croppedCanvas = document.createElement('canvas');
    const croppedCtx = croppedCanvas.getContext('2d')!;

    croppedCanvas.width = pixelCrop.width;
    croppedCanvas.height = pixelCrop.height;

    croppedCtx.drawImage(
        canvas,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height,
    );

    return new Promise((resolve, reject) => {
        croppedCanvas.toBlob((blob) => {
            if (!blob) {
                reject(new Error('Canvas crop failed'));
                return;
            }
            resolve(new File([blob], 'product-image.webp', { type: 'image/webp' }));
        }, 'image/webp', 0.85);
    });
}

function createImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.addEventListener('load', () => resolve(img));
        img.addEventListener('error', (err) => reject(err));
        img.crossOrigin = 'anonymous';
        img.src = url;
    });
}

const ImageEditorModal: React.FC<ImageEditorModalProps> = ({ isOpen, imageSrc, onClose, onComplete }) => {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [aspect, setAspect] = useState(0);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState('');
    const [error, setError] = useState<string | null>(null);

    const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
        setCroppedAreaPixels(croppedPixels);
    }, []);

    const handleApply = async () => {
        if (!croppedAreaPixels) return;

        setUploading(true);
        setError(null);
        setUploadStatus('Cropping image...');

        try {
            const croppedFile = await getCroppedImg(imageSrc, croppedAreaPixels, rotation);

            setUploadStatus('Uploading to free hosting...');
            const hostedUrl = await uploadToImgBB(croppedFile);

            onComplete(hostedUrl);
            handleClose();
        } catch (err: any) {
            setError(err.message || 'Upload failed');
        } finally {
            setUploading(false);
            setUploadStatus('');
        }
    };

    const handleClose = () => {
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setRotation(0);
        setAspect(0);
        setCroppedAreaPixels(null);
        setError(null);
        setUploading(false);
        setUploadStatus('');
        onClose();
    };

    const handleReset = () => {
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setRotation(0);
    };

    if (!isOpen) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]"
            onClick={handleClose}
        >
            <div
                className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-3xl max-h-[95vh] md:max-h-[92vh] flex flex-col shadow-2xl border border-gray-200 dark:border-slate-700 animate-[slideUp_0.3s_ease-out]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 md:p-5 border-b border-gray-100 dark:border-slate-700/50">
                    <div>
                        <h2 className="text-base md:text-lg font-bold text-gray-900 dark:text-white">Edit Image</h2>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Crop, zoom & rotate</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={handleReset}
                            className="p-2.5 md:p-2 text-gray-400 hover:text-sky-500 rounded-lg hover:bg-sky-500/10 active:bg-sky-500/20 transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
                            title="Reset"
                        >
                            <RotateCcw size={18} />
                        </button>
                        <button
                            onClick={handleClose}
                            className="p-2.5 md:p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-500/10 active:bg-red-500/20 transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
                            title="Close"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Crop Area */}
                <div className="relative w-full h-[50vh] md:h-[400px]">
                    <Cropper
                        image={imageSrc}
                        crop={crop}
                        zoom={zoom}
                        rotation={rotation}
                        aspect={aspect || undefined}
                        onCropChange={setCrop}
                        onZoomChange={setZoom}
                        onRotationChange={setRotation}
                        onCropComplete={onCropComplete}
                        style={{
                            containerStyle: { background: '#0f172a' },
                        }}
                    />
                </div>

                {/* Controls */}
                <div className="p-4 md:p-5 border-t border-gray-100 dark:border-slate-700/50 space-y-3 md:space-y-4">
                    {/* Aspect Ratio Presets */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-14 md:w-16 shrink-0">Ratio</span>
                        <div className="flex gap-1.5 flex-wrap">
                            {ASPECT_OPTIONS.map((opt) => {
                                const Icon = opt.icon;
                                return (
                                    <button
                                        key={opt.label}
                                        onClick={() => setAspect(opt.value)}
                                        className={`px-3 py-2 md:py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 min-h-[36px] active:scale-95 ${aspect === opt.value
                                            ? 'bg-sky-500 text-white shadow-sm'
                                            : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-700'
                                            }`}
                                    >
                                        <Icon size={13} />
                                        {opt.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Zoom Slider */}
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-14 md:w-16 shrink-0 flex items-center gap-1">
                            <ZoomIn size={13} /> Zoom
                        </span>
                        <input
                            title="Zoom level"
                            type="range"
                            min={1}
                            max={3}
                            step={0.05}
                            value={zoom}
                            onChange={(e) => setZoom(Number(e.target.value))}
                            className="flex-1 h-1.5 bg-gray-200 dark:bg-slate-700 rounded-full appearance-none cursor-pointer accent-sky-500"
                        />
                        <span className="text-xs font-mono text-gray-400 w-10 text-right">{zoom.toFixed(1)}x</span>
                    </div>

                    {/* Rotation Slider */}
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-14 md:w-16 shrink-0 flex items-center gap-1">
                            <RotateCcw size={13} /> Rotate
                        </span>
                        <input
                            title="Rotation angle"
                            type="range"
                            min={-180}
                            max={180}
                            step={1}
                            value={rotation}
                            onChange={(e) => setRotation(Number(e.target.value))}
                            className="flex-1 h-1.5 bg-gray-200 dark:bg-slate-700 rounded-full appearance-none cursor-pointer accent-sky-500"
                        />
                        <span className="text-xs font-mono text-gray-400 w-10 text-right">{rotation}°</span>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl text-sm text-red-600 dark:text-red-400">
                            {error}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 md:p-5 border-t border-gray-100 dark:border-slate-700/50 flex items-center gap-3">
                    <button
                        onClick={handleClose}
                        disabled={uploading}
                        className="flex-1 px-4 py-3 md:py-2.5 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-slate-700 active:bg-gray-300 transition-colors text-sm disabled:opacity-50 min-h-[48px]"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleApply}
                        disabled={uploading || !croppedAreaPixels}
                        className="flex-1 px-4 py-3 md:py-2.5 bg-sky-500 text-white rounded-xl font-semibold hover:bg-sky-600 active:bg-sky-700 disabled:opacity-40 transition-all text-sm flex items-center justify-center gap-2 min-h-[48px]"
                    >
                        {uploading ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                {uploadStatus}
                            </>
                        ) : (
                            'Apply & Upload'
                        )}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ImageEditorModal;
