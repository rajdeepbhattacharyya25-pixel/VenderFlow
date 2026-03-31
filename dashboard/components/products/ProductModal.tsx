import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
    X, 
    Plus, 
    Upload, 
    Link, 
    Check, 
    AlertCircle, 
    Image as ImageIcon,
    Star,
    ChevronLeft,
    ChevronRight,
    Pencil,
    Video,
    Trash,
    Command
} from 'lucide-react';
import { Product } from '../../types';
import { unifiedUpload } from '../../lib/vault';
import { compressImage } from '../../lib/imageUtils';
import ImageEditorModal from './ImageEditorModal';
import { SellerSuccessAI } from './SellerSuccessAI';
import TagInput from './TagInput';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    TouchSensor,
    MouseSensor
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    horizontalListSortingStrategy
} from '@dnd-kit/sortable';
import { motion, AnimatePresence } from 'framer-motion';

import { CSS } from '@dnd-kit/utilities';
// Removed unused imports: Seller, loadSellerBySlug, etc.

interface SortableImage {
    id: string;
    url: string;
}

const PRODUCT_DRAFT_KEY = (productId: string) => `vf_product_draft_${productId}`;

interface ProductModalProps {
    isOpen: boolean;
    onClose: () => Promise<void> | void;
    product?: Product | null;
    existingCategories: string[];
    onSave?: (product: Partial<Product>) => Promise<void> | void;
}

interface ProductFormData {
    name: string;
    description: string;
    category: string[];
    is_active: boolean;
    status: 'draft' | 'active' | 'pending' | 'rejected';
    images: SortableImage[];
    videoUrl: string | null;
    variantImages: Record<string, string>;
    mainImageIndex: number;
    hasVariants: boolean;
    variants: Array<{ id?: string; option: string; value: string; price?: number; stock?: number }>;
    price: number;
    discountPrice: number | null;
    trackStock: boolean;
    stockQuantity: number;
    lowStockThreshold: number;
    allowOutOfStockOrders: boolean;
}

interface MediaItem {
    type: 'image' | 'video';
    src: string;
    index: number;
    id: string;
}

const defaultFormData: ProductFormData = {
    name: '',
    description: '',
    category: [],
    is_active: true,
    status: 'draft',
    images: [],
    videoUrl: null,
    variantImages: {},
    mainImageIndex: 0,
    hasVariants: false,
    variants: [],
    price: 0,
    discountPrice: null,
    trackStock: true,
    stockQuantity: 0,
    lowStockThreshold: 5,
    allowOutOfStockOrders: false,
};

interface SortableThumbnailProps {
    id: string;
    idx: number;
    src: string;
    type?: 'image' | 'video';
    isActive: boolean;
    isMain: boolean;
    onClick: () => void;
}

const SortableThumbnail = ({ id, src, type = 'image', isActive, isMain, onClick }: SortableThumbnailProps) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id });

    return (
        <div
            ref={setNodeRef}
            style={{
                transform: CSS.Transform.toString(transform),
                transition,
            }}
            {...attributes}
            {...listeners}
            onClick={onClick}
            title={isMain ? "Main image (draggable)" : "Click to view or drag to reorder"}
            className={`relative w-14 h-14 rounded-lg overflow-hidden border-2 flex-shrink-0 cursor-grab active:cursor-grabbing transition-all ${
                isActive
                    ? 'border-sky-500 ring-2 ring-sky-500/20 scale-105'
                    : 'border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500'
            } ${isDragging ? 'shadow-xl z-50 opacity-50' : 'z-1 opacity-100'}`}
        >
            {type === 'image' ? (
                <img src={src} alt="" className="w-full h-full object-cover" />
            ) : (
                <div className="w-full h-full bg-black flex items-center justify-center">
                    <Video size={16} className="text-white" />
                </div>
            )}
            {isMain && (
                <div className="absolute top-0.5 right-0.5 bg-sky-500 text-white rounded-full p-0.5 shadow-sm">
                    <Star size={8} fill="currentColor" />
                </div>
            )}
        </div>
    );
};

const ProductModal: React.FC<ProductModalProps> = ({ isOpen, onClose, product, existingCategories, onSave }) => {
    const [activeSection, setActiveSection] = useState('basic');
    const [formData, setFormData] = useState<ProductFormData>(defaultFormData);
    const videoInputRef = useRef<HTMLInputElement>(null);
    const [editorOpen, setEditorOpen] = useState(false);
    const [editorImageSrc, setEditorImageSrc] = useState('');
    const imgbbFileInputRef = useRef<HTMLInputElement>(null);
    const [activePreviewIndex, setActivePreviewIndex] = useState(0);
    const [editingImageIndex, setEditingImageIndex] = useState<number | null>(null);
    const [videoUrlInput, setVideoUrlInput] = useState('');
    const [videoUrlPreviewValid, setVideoUrlPreviewValid] = useState<boolean | null>(null);
    const [uploading, setUploading] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [hasChanges, setHasChanges] = useState(false);

    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const allMedia = useMemo<MediaItem[]>(() => [
        ...formData.images.map((img, i) => ({ type: 'image' as const, src: img.url, index: i, id: img.id })),
        ...(formData.videoUrl ? [{ type: 'video' as const, src: formData.videoUrl, index: -1, id: 'video-main' } as MediaItem] : [])
    ], [formData.images, formData.videoUrl]);

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setFormData(prev => {
                const oldIndex = allMedia.findIndex(m => m.id === active.id);
                const newIndex = allMedia.findIndex(m => m.id === over.id);

                if (oldIndex === -1 || newIndex === -1) return prev;

                const newAllMedia = arrayMove(allMedia, oldIndex, newIndex);
                
                // Separate back into images and video
                const newImages = newAllMedia
                    .filter(m => m.type === 'image')
                    .map(m => ({ id: m.id, url: m.src }));
                
                const videoItem = newAllMedia.find(m => m.type === 'video');
                const newVideoUrl = videoItem ? videoItem.src : null;

                // Update main image index if necessary
                let newMainIndex = prev.mainImageIndex;
                const oldImageItem = allMedia[oldIndex] as MediaItem;
                if (oldImageItem && oldImageItem.type === 'image') {
                    const oldImageIndex = prev.images.findIndex(img => img.id === oldImageItem.id);
                    if (prev.mainImageIndex === oldImageIndex) {
                        // The main image itself was moved
                        const newImageIndex = newImages.findIndex(img => img.id === oldImageItem.id);
                        newMainIndex = newImageIndex;
                    }
                }

                setHasChanges(true);
                return { 
                    ...prev, 
                    images: newImages, 
                    videoUrl: newVideoUrl,
                    mainImageIndex: newMainIndex 
                };
            });
        }
    }, [allMedia]);

    const updateField = useCallback(<K extends keyof ProductFormData>(field: K, value: ProductFormData[K]) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setHasChanges(true);
        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    }, [errors]);

    const validate = useCallback((): boolean => {
        const newErrors: Record<string, string> = {};
        if (!formData.name.trim()) newErrors.name = 'Product name is required';
        if (formData.price <= 0) newErrors.price = 'Please enter a valid price';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [formData.name, formData.price]);

    const handleSave = useCallback(async () => {
        if (!validate()) return;
        setSaveStatus('saving');
        try {
            const productData: Partial<Product> = {
                name: formData.name,
                description: formData.description,
                category: formData.category,
                price: formData.price,
                discount_price: formData.discountPrice || undefined,
                is_active: formData.is_active,
                status: formData.status,
                has_variants: formData.hasVariants,
                images: formData.images.map(img => img.url),
                variants: formData.variants.map(v => ({
                    id: v.id,
                    product_id: product?.id || '',
                    variant_name: `${v.option}: ${v.value}`,
                    price_override: v.price,
                    stock_quantity: v.stock || 0,
                    created_at: new Date().toISOString()
                }))
            };
            if (onSave) await onSave(productData);
            setSaveStatus('saved');
            setHasChanges(false);
            if (product?.id) localStorage.removeItem(PRODUCT_DRAFT_KEY(product.id));
            setTimeout(() => setSaveStatus('idle'), 2000);
        } catch (err: unknown) {
            setSaveStatus('error');
            const errorMessage = err instanceof Error ? err.message : 'Unknown error during save';
            console.error("Product save error:", errorMessage);
        }
    }, [validate, formData, product, onSave]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;
            if (e.key === 'Escape') onClose();
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); handleSave(); }
            if (e.altKey && e.key >= '1' && e.key <= '6') {
                e.preventDefault();
                const sectionMap: Record<string, string> = { '1': 'basic', '2': 'photos', '3': 'variants', '4': 'pricing', '5': 'stock', '6': 'success' };
                setActiveSection(sectionMap[e.key]);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose, handleSave]);

    useEffect(() => {
        if (product) {
            const media = product.media || [];
            const imagesList = media.filter(m => m.media_type === 'image').map(m => m.file_url);
            const videoUrl = media.find(m => m.media_type === 'video')?.file_url || null;
            const variantImages: Record<string, string> = {};
            media.forEach(m => { if (m.variant_value) variantImages[m.variant_value] = m.file_url; });

            const rawImages = imagesList.length > 0 ? imagesList : (product.images || []);
            const sortableImages: SortableImage[] = rawImages.map((url, i) => ({
                id: `img-${i}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                url
            }));

            const initialCategory = Array.isArray(product.category) 
                ? product.category 
                : (product.category ? [product.category] : []);

            setFormData({
                ...defaultFormData,
                name: product.name || '',
                description: product.description || '',
                category: initialCategory,
                is_active: product.is_active ?? true,
                status: product.status || 'draft',
                images: sortableImages,
                videoUrl: videoUrl,
                variantImages: variantImages,
                mainImageIndex: 0,
                hasVariants: product.has_variants ?? false,
                variants: product.variants ? product.variants.map((v: { id?: string; variant_name: string; price_override?: number; stock_quantity?: number }) => ({
                    id: v.id,
                    option: v.variant_name.split(': ')[0] || 'Size',
                    value: v.variant_name.split(': ')[1] || v.variant_name,
                    price: v.price_override || undefined,
                    stock: v.stock_quantity || 0
                })) : [],
                price: product.price || 0,
                discountPrice: product.discount_price ?? null,
                trackStock: true,
                stockQuantity: 0,
                lowStockThreshold: 5,
                allowOutOfStockOrders: false,
            });
        } else {
            setFormData(defaultFormData);
        }
        setHasChanges(false);
        setSaveStatus('idle');
    }, [product, isOpen]);

    const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        const MAX_VIDEO_MB = 8;
        if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
            alert(`Video file too large. Max size is ${MAX_VIDEO_MB}MB.`);
            e.target.value = '';
            return;
        }
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = async () => {
            window.URL.revokeObjectURL(video.src);
            if (video.duration > 30) {
                alert('Video must be 30 seconds or less.');
                e.target.value = '';
                return;
            }
            try {
                setUploading(true);
                const result = await unifiedUpload({ file, productId: product?.id || 'temp', isPrimary: false, mediaType: 'video' });
                updateField('videoUrl', result.url);
            } catch (err: unknown) { 
                const error = err as { message?: string };
                alert(error.message || 'Video upload failed'); 
            }
            finally { setUploading(false); e.target.value = ''; }
        };
        video.src = URL.createObjectURL(file);
    };

    const removeImage = (index: number) => {
        const removedWasMain = index === formData.mainImageIndex;
        const newImages = formData.images.filter((_, i) => i !== index);
        updateField('images', newImages);
        if (newImages.length === 0) updateField('mainImageIndex', 0);
        else if (removedWasMain) updateField('mainImageIndex', 0);
        else if (index < formData.mainImageIndex) updateField('mainImageIndex', formData.mainImageIndex - 1);
    };

    const removeVideo = () => updateField('videoUrl', null);

    const setMainImage = (index: number) => {
        setFormData(prev => {
            const newImages = [...prev.images];
            // Move item at index to front (index 0)
            const [mainImg] = newImages.splice(index, 1);
            newImages.unshift(mainImg);
            
            setHasChanges(true);
            return {
                ...prev,
                images: newImages,
                mainImageIndex: 0
            };
        });
        setActivePreviewIndex(0);
    };

    const addVariant = () => {
        updateField('variants', [...formData.variants, { option: 'Size', value: '', price: undefined, stock: 0 }]);
    };

    const removeVariant = (index: number) => {
        updateField('variants', formData.variants.filter((_, i) => i !== index));
    };

    const updateVariant = (index: number, field: string, value: string | number | undefined) => {
        const newVariants = [...formData.variants];
        newVariants[index] = { ...newVariants[index], [field]: value };
        updateField('variants', newVariants);
    };

    const handleVariantImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, variantValue: string) => {
        if (!e.target.files || e.target.files.length === 0) return;
        setUploading(true);
        try {
            const { file: compressedFile } = await compressImage(e.target.files[0]);
            const result = await unifiedUpload({ 
                file: compressedFile, 
                productId: product?.id || 'temp', 
                isPrimary: false, 
                mediaType: 'image',
                variantValue 
            });
            const newVariantImages = { ...formData.variantImages, [variantValue]: result.url };
            updateField('variantImages', newVariantImages);
        } catch (err: unknown) {
            const error = err as { message?: string };
            alert(error.message || 'Variant image upload failed');
        } finally {
            setUploading(false);
        }
    };

    if (!isOpen) return null;

    const sections = [
        { id: 'basic', label: 'Basic Info', shortcut: 'Alt + 1' },
        { id: 'photos', label: 'Photos', shortcut: 'Alt + 2' },
        { id: 'variants', label: 'Variants', shortcut: 'Alt + 3' },
        { id: 'pricing', label: 'Pricing', shortcut: 'Alt + 4' },
        { id: 'stock', label: 'Stock', shortcut: 'Alt + 5' },
        { id: 'success', label: 'Success AI', shortcut: 'Alt + 6' },
    ];

    return (
        <>
            {createPortal(
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
                    <div className="bg-theme-panel rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-theme-border" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-6 border-b border-theme-border/50">
                    <h2 className="text-xl font-bold text-theme-text">{product ? 'Edit Product' : 'Add New Product'}</h2>
                    <button onClick={onClose} className="absolute right-4 top-4 rounded-full p-2 text-white/50 hover:bg-white/10 hover:text-white transition-colors" title="Close"><X size={20} /></button>
                </div>
                <div className="flex-1 flex min-h-0 overflow-hidden">
                    <div className="w-48 border-r border-theme-border/50 p-4 space-y-1 overflow-y-auto">
                        {sections.map(section => (
                            <button 
                                key={section.id} 
                                onClick={() => setActiveSection(section.id)} 
                                title={`Switch to ${section.label} (${section.shortcut})`}
                                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeSection === section.id ? 'bg-sky-500/10 text-sky-600' : 'text-theme-muted hover:bg-theme-border/20'}`}
                            >
                                <span>{section.label}</span>
                            </button>
                        ))}
                    </div>
                    <div className="flex-1 p-6 overflow-y-auto">
                        {activeSection === 'basic' && (
                            <div className="space-y-6 max-w-xl animate-[fadeIn_0.2s_ease-out]">
                                <div className="space-y-2">
                                    <label htmlFor="productName" className="text-sm font-medium text-theme-text flex items-center gap-1">
                                        Product Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        id="productName"
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => updateField('name', e.target.value)}
                                        placeholder="e.g. Premium Wireless Headphones"
                                        title="Enter product name"
                                        className={`w-full p-3 rounded-xl bg-theme-bg border ${errors.name ? 'border-red-500' : 'border-theme-border'} text-theme-text focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-all`}
                                    />
                                    {errors.name && <p className="text-red-500 text-xs">{errors.name}</p>}
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="productDescription" className="text-sm font-medium text-theme-text">Description</label>
                                    <textarea
                                        id="productDescription"
                                        value={formData.description}
                                        onChange={(e) => updateField('description', e.target.value)}
                                        placeholder="Describe your product's key features, materials, and benefits..."
                                        rows={5}
                                        className="w-full p-3 rounded-xl bg-theme-bg border border-theme-border text-theme-text focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-all resize-none"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-theme-text">Categories</label>
                                        <TagInput
                                            tags={formData.category}
                                            onChange={(tags) => updateField('category', tags)}
                                            suggestions={existingCategories}
                                            placeholder="Add categories (e.g. Electronics, Sale)..."
                                        />
                                        <p className="text-[10px] text-theme-muted">Press Enter or comma to add multiple categories.</p>
                                    </div>

                                    <div className="space-y-2">
                                        <label htmlFor="productStatus" className="text-sm font-medium text-theme-text">Visibility Status</label>
                                        <select
                                            id="productStatus"
                                            value={formData.status}
                                            onChange={(e) => updateField('status', e.target.value as ProductFormData['status'])}
                                            className="w-full p-3 rounded-xl bg-theme-bg border border-theme-border text-theme-text focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-all"
                                        >
                                            <option value="active">Active (Visible)</option>
                                            <option value="draft">Draft (Hidden)</option>
                                            <option value="pending">Pending Review</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.is_active}
                                            onChange={(e) => updateField('is_active', e.target.checked)}
                                            className="w-5 h-5 rounded border-theme-border text-emerald-500 focus:ring-emerald-500"
                                        />
                                        <div>
                                            <span className="font-medium text-theme-text text-sm">Product is ready for sale</span>
                                            <p className="text-xs text-theme-muted">Turn this off to temporarily hide the product from storefront</p>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        )}

                        {activeSection === 'photos' && (
                            <div className="space-y-4">
                                <button type="button" onClick={() => imgbbFileInputRef.current?.click()} className="w-full p-8 border-2 border-dashed border-emerald-300 rounded-xl flex flex-col items-center gap-3">
                                    <Upload size={32} className="text-emerald-400" />
                                    <span className="text-sm text-emerald-600">Choose Image to Upload</span>
                                </button>
                                <input ref={imgbbFileInputRef} type="file" className="hidden" accept="image/*" multiple onChange={async (e) => {
                                    const files = e.target.files;
                                    if (!files) return;
                                    setUploading(true);
                                    try {
                                        const uploadedUrls: string[] = [];
                                        for (let i = 0; i < files.length; i++) {
                                            const { file: compressedFile } = await compressImage(files[i]);
                                            const result = await unifiedUpload({ file: compressedFile, productId: product?.id || 'temp', isPrimary: false, mediaType: 'image' });
                                            uploadedUrls.push(result.url);
                                        }
                                        updateField('images', [...formData.images, ...uploadedUrls.map(url => ({ id: Math.random().toString(), url }))]);
                                    } finally { setUploading(false); }
                                }} />
                                {(allMedia.length > 0) && (() => {
                                    const safeIndex = Math.min(activePreviewIndex, allMedia.length - 1);
                                    const active = allMedia[Math.max(0, safeIndex)];
                                    if (!active) return null;
                                    
                                    return (
                                        <div className="space-y-2.5 md:space-y-3">
                                            <p className="text-sm font-medium text-theme-text">
                                                Your media ({allMedia.length})
                                            </p>

                                            {/* Large Active Preview */}
                                            <div className="relative aspect-[4/3] max-h-[260px] md:max-h-[320px] rounded-xl overflow-hidden border-2 border-theme-border bg-theme-bg/50 group">
                                                <AnimatePresence mode="wait">
                                                    <motion.div
                                                        key={active.id}
                                                        initial={{ opacity: 0, x: 20 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        exit={{ opacity: 0, x: -20 }}
                                                        transition={{ duration: 0.2 }}
                                                        className="w-full h-full"
                                                        drag="x"
                                                        dragConstraints={{ left: 0, right: 0 }}
                                                        onDragEnd={(_, info) => {
                                                            if (info.offset.x > 50) {
                                                                setActivePreviewIndex(safeIndex > 0 ? safeIndex - 1 : allMedia.length - 1);
                                                            } else if (info.offset.x < -50) {
                                                                setActivePreviewIndex(safeIndex < allMedia.length - 1 ? safeIndex + 1 : 0);
                                                            }
                                                        }}
                                                    >
                                                        {active.type === 'image' ? (
                                                            <img src={active.src} alt="Product preview" className="w-full h-full object-contain" />
                                                        ) : (
                                                            <video src={active.src} className="w-full h-full object-contain bg-black" controls playsInline />
                                                        )}
                                                    </motion.div>
                                                </AnimatePresence>


                                                {/* Nav Arrows — always visible on mobile, hover on desktop */}
                                                {allMedia.length > 1 && (
                                                    <>
                                                        <button
                                                            onClick={() => setActivePreviewIndex(safeIndex > 0 ? safeIndex - 1 : allMedia.length - 1)}
                                                            className="absolute left-1.5 md:left-2 top-1/2 -translate-y-1/2 p-2 md:p-1.5 bg-theme-panel/90 rounded-full shadow-lg text-theme-text hover:bg-theme-panel active:scale-95 transition-all md:opacity-0 md:group-hover:opacity-100 min-w-[36px] min-h-[36px] flex items-center justify-center"
                                                            title="Previous"
                                                        >
                                                            <ChevronLeft size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => setActivePreviewIndex(safeIndex < allMedia.length - 1 ? safeIndex + 1 : 0)}
                                                            className="absolute right-1.5 md:right-2 top-1/2 -translate-y-1/2 p-2 md:p-1.5 bg-theme-panel/90 rounded-full shadow-lg text-theme-text hover:bg-theme-panel active:scale-95 transition-all md:opacity-0 md:group-hover:opacity-100 min-w-[36px] min-h-[36px] flex items-center justify-center"
                                                            title="Next"
                                                        >
                                                            <ChevronRight size={18} />
                                                        </button>
                                                    </>
                                                )}

                                                {/* Main Badge */}
                                                {active.type === 'image' && active.index === formData.mainImageIndex && (
                                                    <div className="absolute top-2 left-2 px-2 py-1 bg-sky-500 text-white text-xs font-medium rounded-md flex items-center gap-1 shadow">
                                                        <Star size={12} /> Main
                                                    </div>
                                                )}

                                                {/* Action Buttons — always visible on mobile */}
                                                <div className="absolute bottom-2.5 md:bottom-3 right-2.5 md:right-3 flex items-center gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                                    {active.type === 'image' && (
                                                        <button
                                                            onClick={() => {
                                                                setEditingImageIndex(active.index);
                                                                setEditorImageSrc(active.src);
                                                                setEditorOpen(true);
                                                            }}
                                                            className="px-3 py-2 md:py-1.5 bg-theme-panel/90 text-theme-text rounded-lg text-xs font-medium shadow hover:bg-sky-500 hover:text-white active:scale-95 transition-all flex items-center gap-1 min-h-[36px]"
                                                            title="Edit photo"
                                                        >
                                                            <Pencil size={12} /> Edit
                                                        </button>
                                                    )}
                                                    {active.type === 'image' && active.index !== formData.mainImageIndex && (
                                                        <button
                                                            onClick={() => setMainImage(active.index)}
                                                            className="px-3 py-2 md:py-1.5 bg-theme-panel/90 text-theme-text rounded-lg text-xs font-medium shadow hover:bg-sky-500 hover:text-white active:scale-95 transition-all flex items-center gap-1 min-h-[36px]"
                                                            title="Set as main photo"
                                                        >
                                                            <Star size={12} /> Set Main
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => {
                                                            if (active.type === 'image') {
                                                                removeImage(active.index);
                                                                setActivePreviewIndex(Math.max(0, safeIndex - 1));
                                                            } else {
                                                                removeVideo();
                                                                setActivePreviewIndex(Math.max(0, safeIndex - 1));
                                                            }
                                                        }}
                                                        className="px-3 py-2 md:py-1.5 bg-theme-panel/90 text-red-500 rounded-lg text-xs font-medium shadow hover:bg-red-500 hover:text-white active:scale-95 transition-all flex items-center gap-1 min-h-[36px]"
                                                        title="Remove"
                                                    >
                                                        <Trash size={12} /> Remove
                                                    </button>
                                                </div>

                                                {/* Counter — always visible on mobile */}
                                                <div className="absolute bottom-2.5 md:bottom-3 left-2.5 md:left-3 px-2 py-1 bg-black/60 text-white text-[10px] font-mono rounded-md md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                                    {safeIndex + 1} / {allMedia.length}
                                                </div>
                                            </div>

                                            {/* Thumbnail Strip with Drag & Drop */}
                                            <div className="flex gap-2 overflow-x-auto pb-2 pt-1 -mx-1 px-1 custom-scrollbar">
                                                <DndContext
                                                    sensors={sensors}
                                                    collisionDetection={closestCenter}
                                                    onDragEnd={handleDragEnd}
                                                >
                                                    <SortableContext
                                                        items={allMedia.map(m => m.id)}
                                                        strategy={horizontalListSortingStrategy}
                                                    >
                                                        {allMedia.map((item, idx) => (
                                                            <SortableThumbnail
                                                                key={item.id}
                                                                id={item.id}
                                                                idx={idx}
                                                                src={item.src}
                                                                type={item.type}
                                                                isActive={idx === safeIndex}
                                                                isMain={item.type === 'image' && item.index === formData.mainImageIndex}
                                                                onClick={() => setActivePreviewIndex(idx)}
                                                            />
                                                        ))}
                                                    </SortableContext>
                                                </DndContext>
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* VIDEO UPLOAD (only if no video yet) */}
                                {!formData.videoUrl && (
                                    <div className="border-t border-theme-border/50 pt-4 md:pt-6 mt-4 md:mt-6">
                                        <p className="text-sm font-medium text-theme-text mb-3">Product Video (Optional)</p>

                                        {/* File Upload */}
                                        <div className="relative border-2 border-dashed border-theme-border rounded-xl p-5 md:p-6 flex flex-col items-center justify-center text-center hover:border-sky-500/50 active:border-sky-500/70 transition-all cursor-pointer bg-theme-bg/30 group min-h-[80px]">
                                            <Video size={28} className="text-theme-muted mb-2 group-hover:text-sky-500 transition-colors" />
                                            <p className="font-medium text-theme-text text-sm">Tap to upload video</p>
                                            <p className="text-xs text-theme-muted mt-1">Max 8MB · 30 seconds · MP4 or WebM</p>
                                            <input
                                                ref={videoInputRef}
                                                type="file"
                                                className="absolute inset-0 opacity-0 cursor-pointer"
                                                accept="video/*"
                                                onChange={handleVideoUpload}
                                                disabled={uploading}
                                                title="Upload Product Video"
                                            />
                                        </div>

                                        {/* Video URL Input */}
                                        <div className="mt-4 pt-4 border-t border-theme-border/50">
                                            <p className="text-sm font-medium text-theme-text mb-3 flex items-center gap-2">
                                                <Link size={16} className="text-teal-500" />
                                                Add Video via URL
                                            </p>
                                            <div className="space-y-3">
                                                {/* Live Video Preview */}
                                                {videoUrlInput.trim() && (
                                                    <div className="relative aspect-video max-h-[160px] md:max-h-[180px] rounded-xl overflow-hidden border-2 border-theme-border bg-black">
                                                        {videoUrlPreviewValid !== false ? (
                                                            <video
                                                                src={videoUrlInput.trim()}
                                                                className="w-full h-full object-contain"
                                                                controls
                                                                playsInline
                                                                onLoadedData={() => setVideoUrlPreviewValid(true)}
                                                                onError={() => setVideoUrlPreviewValid(false)}
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                                                                <AlertCircle size={24} className="text-red-400" />
                                                                <span className="text-xs text-red-400">Cannot load video from this URL</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                                <input
                                                    type="url"
                                                    value={videoUrlInput}
                                                    onChange={(e) => {
                                                        setVideoUrlInput(e.target.value);
                                                        setVideoUrlPreviewValid(null);
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' && videoUrlPreviewValid) {
                                                            e.preventDefault();
                                                            updateField('videoUrl', videoUrlInput.trim());
                                                            setVideoUrlInput('');
                                                            setVideoUrlPreviewValid(null);
                                                        }
                                                    }}
                                                    placeholder="https://example.com/video.mp4"
                                                    className="w-full p-3.5 md:p-3 rounded-xl bg-theme-bg border border-theme-border text-theme-text focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all text-sm"
                                                />
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (videoUrlInput.trim()) {
                                                                updateField('videoUrl', videoUrlInput.trim());
                                                                setVideoUrlInput('');
                                                                setVideoUrlPreviewValid(null);
                                                            }
                                                        }}
                                                        disabled={!videoUrlInput.trim() || videoUrlPreviewValid === false}
                                                        className="px-5 py-2.5 md:py-2 bg-teal-500 text-white rounded-xl md:rounded-lg text-sm font-medium hover:bg-teal-600 active:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 min-h-[44px]"
                                                    >
                                                        <Plus size={16} />
                                                        Add Video
                                                    </button>
                                                    <span className="text-xs text-theme-muted">
                                                        {videoUrlPreviewValid === true && '✓ Video loaded'}
                                                        {videoUrlPreviewValid === false && 'Could not load video'}
                                                        {videoUrlPreviewValid === null && videoUrlInput.trim() && 'Checking...'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                                   {/* VARIANTS */}
                        {activeSection === 'variants' && (
                            <div className="space-y-6 max-w-xl animate-[fadeIn_0.2s_ease-out]">
                                <div className="p-4 rounded-xl bg-theme-bg/50 border border-theme-border/50">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.hasVariants}
                                            onChange={(e) => updateField('hasVariants', e.target.checked)}
                                            className="w-5 h-5 rounded border-theme-border text-sky-500 focus:ring-sky-500"
                                        />
                                        <div>
                                            <span className="font-medium text-theme-text">This product has variants</span>
                                            <p className="text-sm text-theme-muted">Like different sizes or colors</p>
                                        </div>
                                    </label>
                                </div>

                                {formData.hasVariants && (
                                    <div className="space-y-4">
                                        {formData.variants.map((variant, index) => (
                                            <div key={index} className="p-4 rounded-xl border border-theme-border bg-theme-bg/30 space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-medium text-theme-text">Option {index + 1}</span>
                                                    <button
                                                        onClick={() => removeVariant(index)}
                                                        title="Remove variant"
                                                        className="p-1 text-red-500 hover:bg-red-500/10 rounded transition-colors"
                                                    >
                                                        <Trash size={16} />
                                                    </button>
                                                </div>
                                                <div className="flex gap-3">
                                                    {formData.variantImages[variant.value] ? (
                                                        <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-theme-border group">
                                                            <img src={formData.variantImages[variant.value]} className="w-full h-full object-cover" alt={`${variant.value} variant view`} />
                                                            <button onClick={() => {
                                                                const newVariantImages = { ...formData.variantImages };
                                                                delete newVariantImages[variant.value];
                                                                updateField('variantImages', newVariantImages);
                                                            }} className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" title="Remove image">
                                                                <Trash size={12} />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="relative w-12 h-12 flex flex-col items-center justify-center border border-dashed border-theme-border rounded-lg cursor-pointer hover:border-sky-500 text-theme-muted shrink-0 bg-theme-bg/50 overflow-hidden group">
                                                            <ImageIcon size={16} className="group-hover:text-sky-500 transition-colors" />
                                                            <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleVariantImageUpload(e, variant.value)} disabled={uploading || !variant.value} title={!variant.value ? "Enter a variant value first" : "Upload variant image"} />
                                                        </div>
                                                    )}
                                                    <div className="flex-1 grid grid-cols-2 gap-3">
                                                        <select
                                                            title="Variant type"
                                                            value={variant.option}
                                                            onChange={(e) => updateVariant(index, 'option', e.target.value)}
                                                            className="p-2.5 rounded-lg bg-theme-bg border border-theme-border text-theme-text text-sm"
                                                        >
                                                            <option value="Size">Size</option>
                                                            <option value="Color">Color</option>
                                                            <option value="Material">Material</option>
                                                            <option value="Style">Style</option>
                                                        </select>
                                                        <input
                                                            type="text"
                                                            value={variant.value}
                                                            onChange={(e) => updateVariant(index, 'value', e.target.value)}
                                                            placeholder="e.g. Small, Red, Cotton"
                                                            className="p-2.5 rounded-lg bg-theme-bg border border-theme-border text-theme-text text-sm"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="text-xs text-theme-muted">Price (optional)</label>
                                                        <input
                                                            type="number"
                                                            value={variant.price || ''}
                                                            onChange={(e) => updateVariant(index, 'price', e.target.value ? Number(e.target.value) : undefined)}
                                                            placeholder="Override price"
                                                            className="w-full p-2.5 rounded-lg bg-theme-bg border border-theme-border text-theme-text text-sm"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-theme-muted">Stock (optional)</label>
                                                        <input
                                                            type="number"
                                                            value={variant.stock || ''}
                                                            onChange={(e) => updateVariant(index, 'stock', e.target.value ? Number(e.target.value) : undefined)}
                                                            placeholder="Variant stock"
                                                            className="w-full p-2.5 rounded-lg bg-theme-bg border border-theme-border text-theme-text text-sm"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}

                                        <button
                                            onClick={addVariant}
                                            className="w-full p-3 rounded-xl border-2 border-dashed border-theme-border text-theme-muted hover:border-sky-500/50 hover:text-sky-500 transition-all flex items-center justify-center gap-2"
                                        >
                                            <Plus size={18} /> Add Variant
                                        </button>
                                    </div>
                                )}

                                {!formData.hasVariants && (
                                    <div className="text-center py-8 text-theme-muted">
                                        <p className="text-sm">No variants needed? That's fine!</p>
                                        <p className="text-xs mt-1">Stock will be managed as a single product</p>
                                    </div>
                                )}
                            </div>
                        )}
                           {/* PRICING */}
                        {activeSection === 'pricing' && (
                            <div className="space-y-6 max-w-md animate-[fadeIn_0.2s_ease-out]">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-theme-text">
                                        Selling Price <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-theme-muted font-bold">₹</span>
                                        <input
                                            type="number"
                                            value={formData.price || ''}
                                            onChange={(e) => updateField('price', Number(e.target.value))}
                                            className={`w-full p-3 pl-8 rounded-xl bg-theme-bg border ${errors.price ? 'border-red-500' : 'border-theme-border'} text-theme-text text-lg font-medium focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-all`}
                                            placeholder="0"
                                        />
                                    </div>
                                    {errors.price && (
                                        <p className="text-red-500 text-sm flex items-center gap-1">
                                            <AlertCircle size={14} /> {errors.price}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-theme-text">Discount Price</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-theme-muted font-bold">₹</span>
                                        <input
                                            type="number"
                                            value={formData.discountPrice || ''}
                                            onChange={(e) => updateField('discountPrice', e.target.value ? Number(e.target.value) : null)}
                                            className="w-full p-3 pl-8 rounded-xl bg-theme-bg border border-theme-border text-theme-text focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-all"
                                            placeholder="Optional - sale price"
                                        />
                                    </div>
                                    <p className="text-xs text-theme-muted">Leave empty if not on sale</p>
                                </div>

                                {formData.price > 0 && formData.discountPrice && formData.discountPrice < formData.price && (
                                    <div className="p-4 bg-green-500/10 rounded-xl border border-green-500/20">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-green-600 font-medium">Discount</span>
                                            <span className="text-lg font-bold text-green-600">
                                                {Math.round(((formData.price - formData.discountPrice) / formData.price) * 100)}% OFF
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                           {/* STOCK */}
                        {activeSection === 'stock' && (
                            <div className="space-y-6 max-w-md animate-[fadeIn_0.2s_ease-out]">
                                <div className="p-4 rounded-xl bg-theme-bg/50 border border-theme-border/50">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.trackStock}
                                            onChange={(e) => updateField('trackStock', e.target.checked)}
                                            className="w-5 h-5 rounded border-theme-border text-sky-500 focus:ring-sky-500"
                                        />
                                        <div>
                                            <span className="font-medium text-theme-text">Track stock quantity</span>
                                            <p className="text-sm text-theme-muted">Automatically updates when orders are placed</p>
                                        </div>
                                    </label>
                                </div>

                                {formData.trackStock && (
                                    <>
                                        <div className="space-y-2">
                                            <label htmlFor="stockQuantity" className="text-sm font-medium text-theme-text">Available Quantity</label>
                                            <input
                                                id="stockQuantity"
                                                type="number"
                                                value={formData.stockQuantity}
                                                onChange={(e) => updateField('stockQuantity', Number(e.target.value))}
                                                min="0"
                                                placeholder="0"
                                                className="w-full p-3 rounded-xl bg-theme-bg border border-theme-border text-theme-text text-lg font-medium focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-all"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label htmlFor="lowStockThreshold" className="text-sm font-medium text-theme-text">Low stock alert</label>
                                            <input
                                                id="lowStockThreshold"
                                                type="number"
                                                value={formData.lowStockThreshold}
                                                onChange={(e) => updateField('lowStockThreshold', Number(e.target.value))}
                                                min="0"
                                                placeholder="5"
                                                className="w-full p-3 rounded-xl bg-theme-bg border border-theme-border text-theme-text focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-all"
                                            />
                                            <p className="text-xs text-theme-muted">You'll be notified when stock falls below this</p>
                                        </div>

                                        <div className="space-y-3">
                                            <label className="text-sm font-medium text-theme-text">When out of stock</label>
                                            <div className="space-y-2">
                                                <button
                                                    type="button"
                                                    onClick={() => updateField('allowOutOfStockOrders', false)}
                                                    className={`w-full p-3 rounded-xl border-2 text-left transition-all ${formData.allowOutOfStockOrders === false
                                                        ? 'border-sky-500 bg-sky-500/10'
                                                        : 'border-theme-border hover:border-sky-500/50'
                                                        }`}
                                                >
                                                    <div className="font-medium text-theme-text">Hide product</div>
                                                    <div className="text-xs text-theme-muted mt-1">Product won't be visible to customers</div>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => updateField('allowOutOfStockOrders', true)}
                                                    className={`w-full p-3 rounded-xl border-2 text-left transition-all ${formData.allowOutOfStockOrders === true
                                                        ? 'border-sky-500 bg-sky-500/10'
                                                        : 'border-theme-border hover:border-sky-500/50'
                                                        }`}
                                                >
                                                    <div className="font-medium text-theme-text">Allow pre-orders</div>
                                                    <div className="text-xs text-theme-muted mt-1">Customers can still order (shown as "Pre-order")</div>
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {!formData.trackStock && (
                                    <div className="p-4 bg-yellow-500/10 rounded-xl border border-yellow-500/20">
                                        <p className="text-sm text-yellow-600">
                                            Stock tracking is off. Product will always show as available.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* SUCCESS AI */}
                        {activeSection === 'success' && (
                            <div className="max-w-xl animate-[fadeIn_0.2s_ease-out]">
                                <SellerSuccessAI 
                                    product={{
                                        name: formData.name,
                                        description: formData.description,
                                        category: formData.category,
                                        images: formData.images.map(img => img.url),
                                        hasVariants: formData.hasVariants,
                                        price: formData.price
                                    }}
                                    onApplyOptimization={(optimized) => {
                                        updateField('name', optimized.name);
                                        updateField('description', optimized.description);
                                        setActiveSection('basic');
                                        alert("AI optimizations applied! Check the Basic Info tab.");
                                    }}
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-theme-border/50 flex justify-between items-center bg-theme-bg/50 rounded-b-2xl">
                    <div className="flex items-center gap-2 text-sm">
                        {hasChanges && (
                            <span className="flex items-center gap-2 text-yellow-600">
                                <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span>
                                Unsaved changes
                            </span>
                        )}
                        {saveStatus === 'saved' && (
                            <span className="flex items-center gap-2 text-green-600">
                                <Check size={16} /> Saved!
                            </span>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2.5 rounded-xl border border-theme-border text-theme-text font-medium hover:bg-theme-bg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saveStatus === 'saving'}
                            className={`px-6 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 ${saveStatus === 'saving'
                                ? 'bg-theme-muted text-theme-bg cursor-not-allowed'
                                : saveStatus === 'saved'
                                    ? 'bg-green-500 text-white'
                                    : 'bg-sky-500 text-white hover:bg-sky-600 shadow-lg shadow-sky-500/20'
                                }`}
                        >
                            {saveStatus === 'saving' ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-theme-bg/30 border-t-theme-bg rounded-full animate-spin"></span>
                                    Saving...
                                </>
                            ) : saveStatus === 'saved' ? (
                                <>
                                    <Check size={18} /> Saved!
                                </>
                            ) : (
                                <>
                                    Save Product
                                    <span className="text-[10px] opacity-60 font-mono ml-1 border border-white/30 px-1 rounded flex items-center gap-0.5">
                                        <Command size={10} /> ↵
                                    </span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    )}
            <ImageEditorModal
                isOpen={editorOpen}
                imageSrc={editorImageSrc}
                productId={product?.id || 'temp-new-product'}
                onClose={() => {
                    setEditorOpen(false);
                    setEditingImageIndex(null);
                }}
                onComplete={(url) => {
                    if (editingImageIndex !== null) {
                        setFormData(prev => {
                            const newImages = [...prev.images];
                            newImages[editingImageIndex] = { ...newImages[editingImageIndex], url };
                            return { ...prev, images: newImages };
                        });
                    } else {
                        const newImage: SortableImage = {
                            id: `img-edit-${Date.now()}`,
                            url
                        };
                        updateField('images', [...formData.images, newImage]);
                    }
                    setEditorOpen(false);
                    setEditingImageIndex(null);
                }}
            />
        </>
    );
};


export default ProductModal;
