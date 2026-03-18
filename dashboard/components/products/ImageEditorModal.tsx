import React, { useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import ReactCrop, { 
  centerCrop, 
  makeAspectCrop, 
  type Crop, 
  type PixelCrop 
} from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { X, Loader2, RotateCcw, ZoomIn, Maximize, Square, Monitor, Smartphone, RotateCw } from 'lucide-react';
import { unifiedUpload } from '../../lib/vault';

interface ImageEditorModalProps {
    isOpen: boolean;
    imageSrc: string;
    onClose: () => void;
    onComplete: (imageUrl: string) => void;
    productId?: string;
}

const ASPECT_OPTIONS = [
    { label: 'Free', value: undefined, icon: Maximize },
    { label: '1:1', value: 1, icon: Square },
    { label: '4:3', value: 4 / 3, icon: Monitor },
    { label: '16:9', value: 16 / 9, icon: Smartphone },
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
            if (!blob) {
                reject(new Error('Canvas crop failed'));
                return;
            }
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

    function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
      const { width, height } = e.currentTarget;
      setCrop(centerAspectCrop(width, height, aspect));
    }

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
        setUploadStatus('Finalizing...');

        try {
            const croppedFile = await getCroppedImg(imgRef.current, completedCrop, rotation);
            const result = await unifiedUpload({
                file: croppedFile,
                productId,
                isPrimary: false,
                mediaType: 'image',
            });

            onComplete(result.url);
            handleClose();
        } catch (err: any) {
            console.error('Editor failed:', err);
            setError(err.message || 'Upload failed');
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
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[60] flex flex-col bg-black overflow-hidden animate-[fadeIn_0.2s_ease-out]">
            {/* Minimal Header */}
            <div className="absolute top-0 left-0 right-0 h-16 flex items-center justify-between px-8 z-[70] pointer-events-none">
              <div className="flex items-center gap-4 pointer-events-auto">
                <span className="text-[10px] font-black tracking-[0.3em] uppercase text-white/20">Studio Editor</span>
                <div className="h-4 w-px bg-white/10" />
                <button 
                  onClick={handleReset}
                  className="p-2 text-white/40 hover:text-cyan-400 transition-colors"
                  title="Reset Workspace"
                >
                  <RotateCcw size={16} />
                </button>
              </div>
              <button 
                onClick={handleClose}
                className="p-2 text-white/40 hover:text-white transition-colors pointer-events-auto"
                title="Exit Editor"
              >
                <X size={24} />
              </button>
            </div>

            {/* Central Workspace */}
            <div className="flex-1 relative flex items-center justify-center p-20 pb-40">
                <div 
                  className="relative transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1)"
                  style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}
                >
                  <ReactCrop
                      crop={crop}
                      onChange={(c) => setCrop(c)}
                      onComplete={(c) => setCompletedCrop(c)}
                      aspect={aspect}
                      className="max-h-[75vh]"
                  >
                      <img
                          ref={imgRef}
                          src={imageSrc}
                          onLoad={onImageLoad}
                          alt="Edit target"
                          className="max-h-[75vh] w-auto object-contain select-none"
                          crossOrigin="anonymous"
                      />
                  </ReactCrop>
                </div>
            </div>

            {/* Unified Bottom Toolbar */}
            <div className="studio-toolbar">
              {/* Aspect Group */}
              <div className="studio-control-group">
                {ASPECT_OPTIONS.map((opt) => (
                  <button
                    key={opt.label}
                    onClick={() => handleAspectChange(opt.value)}
                    className={`studio-btn-minimal ${aspect === opt.value ? 'text-cyan-400 bg-cyan-500/10' : 'text-white/40 hover:text-white'}`}
                  >
                    <opt.icon size={14} />
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Precision Sliders */}
              <div className="studio-control-group flex-1 justify-center max-w-2xl">
                {/* Zoom */}
                <div className="studio-slider-compact group">
                  <ZoomIn size={14} className="text-white/20 group-hover:text-cyan-400 transition-colors" />
                  <input
                    type="range" min={0.5} max={2} step={0.01} value={zoom}
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="flex-1 h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-cyan-400"
                  />
                  <span className="text-[10px] font-mono text-white/20 w-8">{zoom.toFixed(1)}x</span>
                </div>

                <div className="h-6 w-px bg-white/5 mx-4" />

                {/* Rotate */}
                <div className="studio-slider-compact group">
                  <RotateCw size={14} className="text-white/20 group-hover:text-cyan-400 transition-colors" />
                  <input
                    type="range" min={-180} max={180} step={1} value={rotation}
                    onChange={(e) => setRotation(Number(e.target.value))}
                    className="flex-1 h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-cyan-400"
                  />
                  <span className="text-[10px] font-mono text-white/20 w-8">{rotation}°</span>
                </div>
              </div>

              {/* Actions */}
              <div className="studio-control-group min-w-[200px] justify-end">
                {error && <span className="text-red-400 text-[10px] font-bold uppercase truncate max-w-[120px]">{error}</span>}
                <button
                  onClick={handleApply}
                  disabled={uploading || !completedCrop}
                  className="studio-btn-primary"
                >
                  {uploading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 size={14} className="animate-spin" />
                      <span>{uploadStatus}</span>
                    </div>
                  ) : (
                    <span>Commit</span>
                  )}
                </button>
              </div>
            </div>
        </div>,
        document.body
    );
};

export default ImageEditorModal;
