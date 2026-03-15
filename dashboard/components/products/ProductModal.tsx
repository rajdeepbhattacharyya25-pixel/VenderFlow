import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Image as ImageIcon, Plus, Trash, Star, Check, AlertCircle, Command, Video, Link, Upload, ChevronLeft, ChevronRight } from 'lucide-react';
import { Product } from '../../types';
import { unifiedUpload } from '../../lib/vault';
import { compressImage } from '../../lib/imageUtils';
import { ProductMedia } from '../../types';
import ImageEditorModal from './ImageEditorModal';
import { AIContentHelper } from '../AIContentHelper';
import { SellerSuccessAI } from './SellerSuccessAI';
import { AuditResult } from '../../lib/success-ai';

const PRODUCT_DRAFT_KEY = (productId: string) => `vf_product_draft_${productId}`;

interface ProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    product?: Product | null;
    onSave?: (product: Partial<Product>) => Promise<void>;
}

interface ProductFormData {
    name: string;
    description: string;
    category: string;
    is_active: boolean;
    status: 'draft' | 'active' | 'pending' | 'rejected';
    images: string[];
    videoUrl: string | null;
    variantImages: Record<string, string>; // variant name to image URL
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

const defaultFormData: ProductFormData = {
    name: '',
    description: '',
    category: '',
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

// Generate URL slug from title
const generateSlug = (title: string): string => {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
};

const ProductModal: React.FC<ProductModalProps> = ({ isOpen, onClose, product, onSave }) => {
    const [activeSection, setActiveSection] = useState('basic');
    const [formData, setFormData] = useState<ProductFormData>(defaultFormData);
    const [uploading, setUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState('');
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [hasChanges, setHasChanges] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [showDraftBanner, setShowDraftBanner] = useState(false);


    const videoInputRef = useRef<HTMLInputElement>(null);

    // Image URL input state
    const [imageUrlInput, setImageUrlInput] = useState('');
    const [imageUrlPreviewValid, setImageUrlPreviewValid] = useState<boolean | null>(null);

    // Image Editor state
    const [editorOpen, setEditorOpen] = useState(false);
    const [editorImageSrc, setEditorImageSrc] = useState('');
    const imgbbFileInputRef = useRef<HTMLInputElement>(null);
    const [activePreviewIndex, setActivePreviewIndex] = useState(0);

    // Video URL input state
    const [videoUrlInput, setVideoUrlInput] = useState('');
    const [videoUrlPreviewValid, setVideoUrlPreviewValid] = useState<boolean | null>(null);

    // Custom Category Management
    const [availableCategories, setAvailableCategories] = useState<string[]>([
        'Clothing', 'Accessories', 'Home', 'Beauty'
    ]);
    const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;

            // Esc to close
            if (e.key === 'Escape') {
                onClose();
            }

            // Ctrl + Enter to save
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                handleSave();
            }

            // Alt + 1-5 for tabs
            if (e.altKey && e.key >= '1' && e.key <= '5') {
                e.preventDefault();
                const sectionMap: Record<string, string> = {
                    '1': 'basic',
                    '2': 'photos',
                    '3': 'variants',
                    '4': 'pricing',
                    '5': 'stock',
                    '6': 'success'
                };
                setActiveSection(sectionMap[e.key]);
            }


        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, activeSection, formData, onClose]);

    // Initialize form with product data
    useEffect(() => {
        if (product) {

            // Extract media info
            const media = product.media || [];
            const images = media.map(m => m.file_url);
            const video = null;
            const variantImages: Record<string, string> = {};

            setFormData({
                name: product.name || '',
                description: product.description || '',
                category: product.category || '',
                is_active: product.is_active ?? true,
                status: product.status || 'draft',
                images: images.length > 0 ? images : (product.images || []),
                videoUrl: video ? video.file_url : null,
                variantImages: variantImages,
                mainImageIndex: 0,
                hasVariants: product.has_variants ?? false,
                variants: product.variants ? product.variants.map((v: any) => {
                    const parts = v.variant_name.split(': ');
                    return {
                        id: v.id,
                        option: parts.length > 1 ? parts[0] : 'Size',
                        value: parts.length > 1 ? parts[1] : v.variant_name,
                        price: v.price_override || undefined,
                        stock: v.stock_quantity || 0
                    };
                }) : [],
                price: product.price || 0,
                discountPrice: product.discount_price ?? null,
                trackStock: true, // Will be fetched from product_stock if needed, default true
                stockQuantity: 0,
                lowStockThreshold: 5,
                allowOutOfStockOrders: false,
            });

            // If product has a category not in our list, add it
            if (product.category && !availableCategories.some(c => c.toLowerCase() === product.category?.toLowerCase())) {
                setAvailableCategories(prev => [...prev, product.category!]);
            }
        } else {
            setFormData(defaultFormData);
        }
        setHasChanges(false);
        setSaveStatus('idle');
        setShowDraftBanner(false);
        // Check for a saved draft for this product
        if (product?.id) {
            const raw = localStorage.getItem(PRODUCT_DRAFT_KEY(product.id));
            if (raw) {
                try {
                    const draft = JSON.parse(raw);
                    if (draft.savedAt && Date.now() - draft.savedAt < 24 * 60 * 60 * 1000) {
                        setShowDraftBanner(true);
                    } else {
                        localStorage.removeItem(PRODUCT_DRAFT_KEY(product.id));
                    }
                } catch { localStorage.removeItem(PRODUCT_DRAFT_KEY(product.id)); }
            }
        }
    }, [product, isOpen]);

    const updateField = <K extends keyof ProductFormData>(field: K, value: ProductFormData[K]) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setHasChanges(true);
        // Clear error when field is updated
        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    // Auto-save draft to localStorage when form has unsaved changes
    useEffect(() => {
        if (!hasChanges || !product?.id) return;
        const timer = setTimeout(() => {
            const draftData = {
                formData: {
                    name: formData.name,
                    description: formData.description,
                    category: formData.category,
                    is_active: formData.is_active,
                    status: formData.status,
                    hasVariants: formData.hasVariants,
                    variants: formData.variants,
                    price: formData.price,
                    discountPrice: formData.discountPrice,
                    trackStock: formData.trackStock,
                    stockQuantity: formData.stockQuantity,
                    lowStockThreshold: formData.lowStockThreshold,
                    allowOutOfStockOrders: formData.allowOutOfStockOrders,
                },
                savedAt: Date.now(),
            };
            localStorage.setItem(PRODUCT_DRAFT_KEY(product.id), JSON.stringify(draftData));
        }, 500);
        return () => clearTimeout(timer);
    }, [formData, hasChanges, product?.id]);

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};
        if (!formData.name.trim()) {
            newErrors.name = 'Product name is required';
        }
        if (formData.price <= 0) {
            newErrors.price = 'Please enter a valid price';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async () => {
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
                variants: formData.variants.map(v => ({
                    id: v.id,
                    product_id: product?.id || '',
                    variant_name: `${v.option}: ${v.value}`,
                    price_override: v.price,
                    stock_quantity: v.stock || 0,
                    created_at: new Date().toISOString()
                }))
            };

            // Stock data will be handled by trigger or separate update
            // if we need to pass stock info to onSave, we might need to adjust Product type
            // or pass it as a separate object. For now sticking to Product type.

            if (onSave) {
                await onSave(productData);
            }

            setSaveStatus('saved');
            setHasChanges(false);
            if (product?.id) localStorage.removeItem(PRODUCT_DRAFT_KEY(product.id));
            setShowDraftBanner(false);
            setTimeout(() => {
                setSaveStatus('idle');
            }, 2000);
        } catch (error) {
            setSaveStatus('error');
            console.error('Save failed:', error);
        }
    };



    const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];

        // File size check (8MB max)
        const MAX_VIDEO_MB = 8;
        if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
            alert(`Video file too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max size is ${MAX_VIDEO_MB}MB.`);
            if (e.target) e.target.value = '';
            return;
        }

        const video = document.createElement('video');
        video.preload = 'metadata';

        video.onloadedmetadata = async () => {
            window.URL.revokeObjectURL(video.src);
            if (video.duration > 30) {
                alert('Video must be 30 seconds or less.');
                if (e.target) e.target.value = '';
                return;
            }

            try {
                setUploading(true);
                setUploadStatus('Uploading video via Vault...');
                const productId = product?.id || 'temp-new-product';
                const result = await unifiedUpload({
                    file,
                    productId,
                    isPrimary: false,
                    mediaType: 'video',
                });

                updateField('videoUrl', result.url);
            } catch (err: any) {
                console.error('Video upload failed', err);
                alert(err.message || 'Video upload failed');
            } finally {
                setUploading(false);
                setUploadStatus('');
                if (e.target) e.target.value = '';
            }
        };
        video.src = URL.createObjectURL(file);
    };

    const handleVariantImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, variantValue: string) => {
        if (!e.target.files || e.target.files.length === 0) return;
        try {
            const originalFile = e.target.files[0];
            setUploading(true);
            setUploadStatus(`Optimizing image for ${variantValue}...`);

            const { file: compressedFile } = await compressImage(originalFile);
            setUploadStatus('Uploading via Vault...');

            const productId = product?.id || 'temp-new-product';
            const result = await unifiedUpload({
                file: compressedFile,
                productId,
                isPrimary: false,
                mediaType: 'image',
                variantValue,
            });

            const newVariantImages = { ...formData.variantImages, [variantValue]: result.url };
            updateField('variantImages', newVariantImages);
        } catch (err: any) {
            alert(err.message || 'Upload failed');
        } finally {
            setUploading(false);
            setUploadStatus('');
            if (e.target) e.target.value = '';
        }
    };

    const removeImage = (index: number) => {
        const newImages = formData.images.filter((_, i) => i !== index);
        updateField('images', newImages);
        if (formData.mainImageIndex >= newImages.length) {
            updateField('mainImageIndex', Math.max(0, newImages.length - 1));
        }
    };

    const removeVideo = () => updateField('videoUrl', null);

    const addImageByUrl = () => {
        const url = imageUrlInput.trim();
        if (!url) return;
        try {
            new URL(url);
        } catch {
            return;
        }
        updateField('images', [...formData.images, url]);
        setImageUrlInput('');
        setImageUrlPreviewValid(null);
    };

    const setMainImage = (index: number) => {
        updateField('mainImageIndex', index);
    };

    const addVariant = () => {
        updateField('variants', [...formData.variants, { option: 'Size', value: '', price: undefined, stock: undefined }]);
    };

    const removeVariant = (index: number) => {
        updateField('variants', formData.variants.filter((_, i) => i !== index));
    };

    const updateVariant = (index: number, field: string, value: any) => {
        const newVariants = [...formData.variants];
        newVariants[index] = { ...newVariants[index], [field]: value };
        updateField('variants', newVariants);
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

    const modal = createPortal(
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]"
            onClick={onClose}
        >
            <div
                className="bg-theme-panel rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-theme-border animate-[slideUp_0.3s_ease-out]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-theme-border/50">
                    <h2 className="text-xl font-bold text-theme-text">
                        {product ? 'Edit Product' : 'Add New Product'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-theme-muted hover:text-red-500 rounded-lg hover:bg-red-500/10 transition-colors"
                        title="Close Modal"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Draft Restore Banner */}
                {showDraftBanner && product?.id && (
                    <div className="flex items-center justify-between gap-3 px-6 py-2.5 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-700/40 text-sm">
                        <span className="text-amber-700 dark:text-amber-400 font-medium flex items-center gap-2">
                            <span>📝</span> Unsaved draft found from a previous session.
                        </span>
                        <div className="flex gap-2 flex-shrink-0">
                            <button
                                onClick={() => {
                                    const raw = localStorage.getItem(PRODUCT_DRAFT_KEY(product.id));
                                    if (!raw) return;
                                    try {
                                        const draft = JSON.parse(raw);
                                        if (draft.formData) {
                                            setFormData(prev => ({ ...prev, ...draft.formData }));
                                            setHasChanges(true);
                                        }
                                    } catch { /* ignore */ }
                                    setShowDraftBanner(false);
                                }}
                                className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-md text-xs transition-colors"
                            >
                                Restore
                            </button>
                            <button
                                onClick={() => {
                                    localStorage.removeItem(PRODUCT_DRAFT_KEY(product.id));
                                    setShowDraftBanner(false);
                                }}
                                className="px-3 py-1 border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-md text-xs transition-colors"
                            >
                                Discard
                            </button>
                        </div>
                    </div>
                )}

                {/* Body */}
                <div className="flex-1 flex min-h-0 overflow-hidden">
                    {/* Sidebar Nav */}
                    <div className="w-48 border-r border-theme-border/50 p-4 space-y-1 overflow-y-auto bg-theme-bg/50">
                        {sections.map(section => (
                            <button
                                key={section.id}
                                onClick={() => setActiveSection(section.id)}
                                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-medium transition-all group ${activeSection === section.id
                                    ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 shadow-sm'
                                    : 'text-theme-muted hover:text-theme-text hover:bg-theme-bg'
                                    }`}
                            >
                                <span>{section.label}</span>
                                <span className={`text-[10px] font-bold px-1 py-0.5 rounded border transition-colors ${activeSection === section.id
                                    ? 'bg-sky-500/20 border-sky-500/30 text-sky-600'
                                    : 'bg-theme-bg border-theme-border text-theme-muted group-hover:border-theme-muted'
                                    }`}>
                                    {section.shortcut && section.shortcut.includes('Alt + ') ? '⌥' + section.shortcut.split('Alt + ')[1] : section.shortcut}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Form Content */}
                    <div className="flex-1 p-6 overflow-y-auto">
                        {/* BASIC INFO */}
                        {activeSection === 'basic' && (
                            <div className="space-y-6 max-w-xl animate-[fadeIn_0.2s_ease-out]">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-theme-text">
                                        Product Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => updateField('name', e.target.value)}
                                        className={`w-full p-3 rounded-xl bg-theme-bg border ${errors.name ? 'border-red-500' : 'border-theme-border'} text-theme-text focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-all`}
                                        placeholder="e.g. Cotton T-Shirt, Handmade Soap"
                                    />
                                    {errors.name && (
                                        <p className="text-red-500 text-sm flex items-center gap-1">
                                            <AlertCircle size={14} /> {errors.name}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-medium text-theme-text">Description</label>
                                        <AIContentHelper
                                            type="product"
                                            context={{
                                                name: formData.name,
                                                category: formData.category,
                                                keywords: formData.name // Use name as seed keywords
                                            }}
                                            onApply={(data) => {
                                                updateField('description', data.description);
                                                if (data.suggestedCategory && !formData.category) {
                                                    updateField('category', data.suggestedCategory.toLowerCase());
                                                }
                                                // If we had a tags field we'd apply data.tags too
                                            }}
                                        />
                                    </div>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => updateField('description', e.target.value)}
                                        className="w-full h-28 p-3 rounded-xl bg-theme-bg border border-theme-border text-theme-text focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none resize-none transition-all"
                                        placeholder="Tell customers about your product..."
                                    />
                                    <p className="text-xs text-theme-muted">Optional - helps customers understand what they're buying</p>
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="category" className="text-sm font-medium text-theme-text">Category</label>
                                    {!isAddingNewCategory ? (
                                        <select
                                            id="category"
                                            title="Product category"
                                            value={formData.category}
                                            onChange={(e) => {
                                                if (e.target.value === 'add-new') {
                                                    setIsAddingNewCategory(true);
                                                } else {
                                                    updateField('category', e.target.value);
                                                }
                                            }}
                                            className="w-full p-3 rounded-xl bg-theme-bg border border-theme-border text-theme-text focus:border-sky-500 outline-none transition-all"
                                        >
                                            <option value="">Select a category</option>
                                            {availableCategories.map(cat => (
                                                <option key={cat} value={cat.toLowerCase()}>{cat}</option>
                                            ))}
                                            <option value="add-new" className="text-sky-500 font-medium font-bold">+ Add New Category...</option>
                                        </select>
                                    ) : (
                                        <div className="flex flex-col gap-2">
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={newCategoryName}
                                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                                    placeholder="Enter new category name"
                                                    className="flex-1 p-3 rounded-xl bg-theme-bg border border-sky-500 text-theme-text focus:ring-2 focus:ring-sky-500/20 outline-none transition-all"
                                                    autoFocus
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (newCategoryName.trim()) {
                                                            const newCat = newCategoryName.trim();
                                                            setAvailableCategories(prev => [...prev, newCat]);
                                                            updateField('category', newCat.toLowerCase());
                                                            setNewCategoryName('');
                                                            setIsAddingNewCategory(false);
                                                        }
                                                    }}
                                                    className="px-4 py-2 bg-sky-500 text-white rounded-xl hover:bg-sky-600 transition-colors font-medium"
                                                >
                                                    Add
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setIsAddingNewCategory(false);
                                                        setNewCategoryName('');
                                                    }}
                                                    className="px-4 py-2 bg-theme-bg text-theme-muted rounded-xl hover:bg-theme-bg/80 transition-colors border border-theme-border"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                            <p className="text-xs text-sky-500 flex items-center gap-1">
                                                <Plus size={10} /> Creating a new category for your products
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4 p-4 rounded-xl bg-theme-bg/50 border border-theme-border/50">
                                    <div className="space-y-3">
                                        <label className="text-sm font-medium text-theme-text">Publishing Status</label>
                                        <div className="flex gap-3">
                                            <button
                                                type="button"
                                                onClick={() => updateField('status', 'active')}
                                                className={`flex-1 p-3 rounded-xl border-2 transition-all ${formData.status === 'active'
                                                    ? 'border-green-500 bg-green-500/10 text-green-600 dark:text-green-400'
                                                    : 'border-theme-border text-theme-muted hover:border-theme-muted'
                                                    }`}
                                            >
                                                <div className="font-medium flex justify-center items-center gap-2">✓ Live</div>
                                                <div className="text-xs opacity-70 mt-1 text-center">Visible to public (if active)</div>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => updateField('status', 'draft')}
                                                className={`flex-1 p-3 rounded-xl border-2 transition-all ${formData.status === 'draft'
                                                    ? 'border-yellow-500 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
                                                    : 'border-theme-border text-theme-muted hover:border-theme-muted'
                                                    }`}
                                            >
                                                <div className="font-medium flex justify-center items-center gap-2">Draft</div>
                                                <div className="text-xs opacity-70 mt-1 text-center">Preview mode only</div>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-3 pt-4 border-t border-theme-border/50">
                                        <label className="text-sm font-medium text-theme-text">Store Visibility</label>
                                        <div className="flex gap-3">
                                            <button
                                                type="button"
                                                onClick={() => updateField('is_active', true)}
                                                className={`flex-1 p-3 rounded-xl border-2 transition-all ${formData.is_active === true
                                                    ? 'border-sky-500 bg-sky-500/10 text-sky-600 dark:text-sky-400'
                                                    : 'border-theme-border text-theme-muted hover:border-theme-muted'
                                                    }`}
                                            >
                                                <div className="font-medium text-center">Active (Available)</div>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => updateField('is_active', false)}
                                                className={`flex-1 p-3 rounded-xl border-2 transition-all ${formData.is_active === false
                                                    ? 'border-theme-muted bg-theme-muted/10 text-theme-text dark:text-gray-300'
                                                    : 'border-theme-border text-theme-muted hover:border-theme-muted'
                                                    }`}
                                            >
                                                <div className="font-medium text-center">Inactive (Hidden)</div>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* PHOTOS */}
                        {activeSection === 'photos' && (
                            <div className="space-y-4 md:space-y-6 animate-[fadeIn_0.2s_ease-out]">


                                {/* UPLOAD & EDIT (FREE HOSTING via ImgBB) */}
                                <div className="pt-1">
                                    <p className="text-sm font-medium text-theme-text mb-2 flex items-center gap-2 flex-wrap">
                                        <Upload size={16} className="text-emerald-500" />
                                        Upload & Edit Image <span className="text-[10px] font-normal px-1.5 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-md border border-emerald-500/20">Free Hosting</span>
                                    </p>
                                    <p className="text-xs text-theme-muted mb-3">Crop, resize & rotate → auto-uploaded to free hosting.</p>
                                    <button
                                        type="button"
                                        onClick={() => imgbbFileInputRef.current?.click()}
                                        disabled={uploading}
                                        className="w-full p-8 md:p-12 rounded-xl border-2 border-dashed border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-500/5 hover:border-emerald-500 active:border-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-all flex flex-col items-center justify-center gap-3 group cursor-pointer min-h-[100px]"
                                    >
                                        <Upload size={32} className="text-emerald-400 group-hover:text-emerald-500 transition-colors" />
                                        <span className="font-medium text-sm text-emerald-600 dark:text-emerald-400">Choose Image to Edit & Upload</span>
                                    </button>
                                    <input
                                        ref={imgbbFileInputRef}
                                        type="file"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;
                                            const reader = new FileReader();
                                            reader.onload = () => {
                                                setEditorImageSrc(reader.result as string);
                                                setEditorOpen(true);
                                            };
                                            reader.readAsDataURL(file);
                                            e.target.value = '';
                                        }}
                                        title="Select image for editing"
                                    />
                                </div>

                                {/* IMAGE URL INPUT */}
                                <div className="border-t border-theme-border/50 pt-4 md:pt-6 mt-2">
                                    <p className="text-sm font-medium text-theme-text mb-3 flex items-center gap-2">
                                        <Link size={16} className="text-sky-500" />
                                        Add Image via URL
                                    </p>
                                    <div className="space-y-3">
                                        {/* Live Preview Thumbnail */}
                                        {imageUrlInput.trim() && (
                                            <div className="w-full h-32 md:h-40 rounded-xl border-2 border-theme-border overflow-hidden bg-theme-bg/50 flex items-center justify-center">
                                                {imageUrlPreviewValid !== false ? (
                                                    <img
                                                        src={imageUrlInput.trim()}
                                                        alt="URL preview"
                                                        className="w-full h-full object-contain"
                                                        onLoad={() => setImageUrlPreviewValid(true)}
                                                        onError={() => setImageUrlPreviewValid(false)}
                                                    />
                                                ) : (
                                                    <div className="flex flex-col items-center gap-1">
                                                        <AlertCircle size={24} className="text-red-400" />
                                                        <span className="text-xs text-red-400">Cannot load image from this URL</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        <input
                                            type="url"
                                            value={imageUrlInput}
                                            onChange={(e) => {
                                                setImageUrlInput(e.target.value);
                                                setImageUrlPreviewValid(null);
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && imageUrlPreviewValid) {
                                                    e.preventDefault();
                                                    addImageByUrl();
                                                }
                                            }}
                                            placeholder="https://example.com/product-image.jpg"
                                            className="w-full p-3.5 md:p-3 rounded-xl bg-theme-bg border border-theme-border text-theme-text focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-all text-sm"
                                        />
                                        <div className="flex items-center gap-3">
                                            <button
                                                type="button"
                                                onClick={addImageByUrl}
                                                disabled={!imageUrlInput.trim() || imageUrlPreviewValid === false}
                                                className="px-5 py-2.5 md:py-2 bg-sky-500 text-white rounded-xl md:rounded-lg text-sm font-medium hover:bg-sky-600 active:bg-sky-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 min-h-[44px]"
                                            >
                                                <Plus size={16} />
                                                Add Image
                                            </button>
                                            <span className="text-xs text-theme-muted">
                                                {imageUrlPreviewValid === true && '✓ Image loaded'}
                                                {imageUrlPreviewValid === false && 'Could not load image'}
                                                {imageUrlPreviewValid === null && imageUrlInput.trim() && 'Checking...'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {uploading && (
                                    <div className="text-center p-4 bg-sky-500/10 rounded-xl border border-sky-500/20">
                                        <div className="text-sm font-medium text-sky-600 animate-pulse">{uploadStatus}</div>
                                    </div>
                                )}

                                {/* MEDIA PREVIEW — Large Preview + Thumbnail Strip */}
                                {(formData.images.length > 0 || formData.videoUrl) && (() => {
                                    const allMedia: Array<{ type: 'image' | 'video'; src: string; index: number }> = [
                                        ...formData.images.map((img, i) => ({ type: 'image' as const, src: img, index: i })),
                                        ...(formData.videoUrl ? [{ type: 'video' as const, src: formData.videoUrl, index: -1 }] : []),
                                    ];
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
                                                {active.type === 'image' ? (
                                                    <img src={active.src} alt="Product preview" className="w-full h-full object-contain" />
                                                ) : (
                                                    <video src={active.src} className="w-full h-full object-contain bg-black" controls playsInline />
                                                )}

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

                                            {/* Thumbnail Strip */}
                                            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                                                {allMedia.map((item, idx) => (
                                                    <button
                                                        key={`${item.type}-${idx}`}
                                                        onClick={() => setActivePreviewIndex(idx)}
                                                        className={`relative w-14 h-14 md:w-14 md:h-14 rounded-lg overflow-hidden border-2 flex-shrink-0 transition-all active:scale-95 ${idx === safeIndex
                                                            ? 'border-sky-500 ring-2 ring-sky-500/20 scale-105'
                                                            : 'border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500 opacity-70 hover:opacity-100'
                                                            }`}
                                                        title={item.type === 'video' ? 'Video' : `Photo ${item.index + 1}`}
                                                    >
                                                        {item.type === 'image' ? (
                                                            <img src={item.src} alt={`Product variant ${item.index + 1}`} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full bg-black flex items-center justify-center">
                                                                <Video size={16} className="text-white" />
                                                            </div>
                                                        )}
                                                        {item.type === 'image' && item.index === formData.mainImageIndex && (
                                                            <div className="absolute top-0.5 left-0.5 w-3.5 h-3.5 bg-sky-500 text-white rounded-sm flex items-center justify-center">
                                                                <Star size={8} />
                                                            </div>
                                                        )}
                                                    </button>
                                                ))}
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
                                                <Link size={16} className="text-purple-500" />
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
                                                    className="w-full p-3.5 md:p-3 rounded-xl bg-theme-bg border border-theme-border text-theme-text focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all text-sm"
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
                                                        className="px-5 py-2.5 md:py-2 bg-purple-500 text-white rounded-xl md:rounded-lg text-sm font-medium hover:bg-purple-600 active:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 min-h-[44px]"
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
                                                    )/* REPLACED with theme-aware classes */}
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
                                        images: formData.images,
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
    );

    return (
        <>
            {modal}
            <ImageEditorModal
                isOpen={editorOpen}
                imageSrc={editorImageSrc}
                onClose={() => setEditorOpen(false)}
                onComplete={(url) => {
                    updateField('images', [...formData.images, url]);
                    setEditorOpen(false);
                }}
            />
        </>
    );
};

export default ProductModal;
