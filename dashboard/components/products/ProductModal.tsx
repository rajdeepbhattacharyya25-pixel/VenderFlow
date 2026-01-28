import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Image as ImageIcon, Plus, Trash, Star, Check, AlertCircle, Command } from 'lucide-react';
import { Product } from '../../types';
import { uploadProductImage } from '../../lib/storage';
import { compressImage } from '../../lib/imageUtils';

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
    images: string[];
    mainImageIndex: number;
    hasVariants: boolean;
    variants: Array<{ option: string; value: string; price?: number; stock?: number }>;
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
    images: [],
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

    const fileInputRef = useRef<HTMLInputElement>(null);

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
                    '5': 'stock'
                };
                setActiveSection(sectionMap[e.key]);
            }

            // Ctrl + U for photo upload (only in photos tab)
            if ((e.ctrlKey || e.metaKey) && e.key === 'u' && activeSection === 'photos') {
                e.preventDefault();
                fileInputRef.current?.click();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, activeSection, formData, onClose]);

    // Initialize form with product data
    useEffect(() => {
        if (product) {
            setFormData({
                name: product.name || '',
                description: product.description || '',
                category: product.category || '',
                is_active: product.is_active ?? true,
                images: product.images || [],
                mainImageIndex: 0,
                hasVariants: product.has_variants ?? false,
                variants: [],
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
                has_variants: formData.hasVariants,
                variants: formData.variants.map(v => ({
                    id: '', // Will be assigned by DB or ignored on insert
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
            setTimeout(() => {
                setSaveStatus('idle');
            }, 2000);
        } catch (error) {
            setSaveStatus('error');
            console.error('Save failed:', error);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        try {
            const originalFile = e.target.files[0];
            setUploading(true);
            setUploadStatus('Optimizing image for faster loading...');

            const { file: compressedFile } = await compressImage(originalFile);
            setUploadStatus('Uploading...');

            const productId = product?.id || 'temp-new-product';
            const { data, error } = await uploadProductImage(compressedFile, productId);

            if (error) throw error;

            if (data && data.file_url) {
                updateField('images', [...formData.images, data.file_url]);
            }
        } catch (err: any) {
            console.error('Upload failed', err);
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
    ];

    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]"
            onClick={onClose}
        >
            <div
                className="bg-panel rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-muted/20 animate-[slideUp_0.3s_ease-out]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-muted/10">
                    <h2 className="text-xl font-bold text-text">
                        {product ? 'Edit Product' : 'Add New Product'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-muted hover:text-red-500 rounded-lg hover:bg-red-500/10 transition-colors"
                        title="Close Modal"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 flex min-h-0 overflow-hidden">
                    {/* Sidebar Nav */}
                    <div className="w-48 border-r border-muted/10 p-4 space-y-1 overflow-y-auto bg-bg/30">
                        {sections.map(section => (
                            <button
                                key={section.id}
                                onClick={() => setActiveSection(section.id)}
                                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-medium transition-all group ${activeSection === section.id
                                    ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 shadow-sm'
                                    : 'text-muted hover:text-text hover:bg-bg'
                                    }`}
                            >
                                <span>{section.label}</span>
                                <span className={`text-[10px] font-bold px-1 py-0.5 rounded border transition-colors ${activeSection === section.id
                                    ? 'bg-sky-500/20 border-sky-500/30 text-sky-600'
                                    : 'bg-muted/5 border-muted/20 text-muted group-hover:border-muted/40'
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
                                    <label className="text-sm font-medium text-text">
                                        Product Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => updateField('name', e.target.value)}
                                        className={`w-full p-3 rounded-xl bg-bg border ${errors.name ? 'border-red-500' : 'border-muted/20'} text-text focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-all`}
                                        placeholder="e.g. Cotton T-Shirt, Handmade Soap"
                                    />
                                    {errors.name && (
                                        <p className="text-red-500 text-sm flex items-center gap-1">
                                            <AlertCircle size={14} /> {errors.name}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-text">Description</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => updateField('description', e.target.value)}
                                        className="w-full h-28 p-3 rounded-xl bg-bg border border-muted/20 text-text focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none resize-none transition-all"
                                        placeholder="Tell customers about your product..."
                                    />
                                    <p className="text-xs text-muted">Optional - helps customers understand what they're buying</p>
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="category" className="text-sm font-medium text-text">Category</label>
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
                                            className="w-full p-3 rounded-xl bg-bg border border-muted/20 text-text focus:border-sky-500 outline-none transition-all"
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
                                                    className="flex-1 p-3 rounded-xl bg-bg border border-sky-500 text-text focus:ring-2 focus:ring-sky-500/20 outline-none transition-all"
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
                                                    className="px-4 py-2 bg-muted/10 text-muted rounded-xl hover:bg-muted/20 transition-colors"
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

                                <div className="space-y-3 p-4 rounded-xl bg-bg/50 border border-muted/10">
                                    <label className="text-sm font-medium text-text">Visibility</label>
                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            onClick={() => updateField('is_active', true)}
                                            className={`flex-1 p-3 rounded-xl border-2 transition-all ${formData.is_active === true
                                                ? 'border-green-500 bg-green-500/10 text-green-600'
                                                : 'border-muted/20 text-muted hover:border-muted/40'
                                                }`}
                                        >
                                            <div className="font-medium">✓ Available for sale</div>
                                            <div className="text-xs opacity-70 mt-1">Customers can see and buy</div>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => updateField('is_active', false)}
                                            className={`flex-1 p-3 rounded-xl border-2 transition-all ${formData.is_active === false
                                                ? 'border-yellow-500 bg-yellow-500/10 text-yellow-600'
                                                : 'border-muted/20 text-muted hover:border-muted/40'
                                                }`}
                                        >
                                            <div className="font-medium">Hidden (Draft)</div>
                                            <div className="text-xs opacity-70 mt-1">Only you can see this</div>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* PHOTOS */}
                        {activeSection === 'photos' && (
                            <div className="space-y-6 animate-[fadeIn_0.2s_ease-out]">
                                <div className="relative border-2 border-dashed border-muted/30 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:border-sky-500/50 transition-all cursor-pointer bg-bg/50 group">
                                    <ImageIcon size={48} className="text-muted mb-4 group-hover:text-sky-500 transition-colors" />
                                    <p className="font-medium text-text">Drag & drop images here</p>
                                    <p className="text-sm text-muted mt-1">or click to browse <span className="text-[10px] font-mono bg-muted/10 px-1 rounded border border-muted/20 ml-1">Ctrl+U</span></p>
                                    <p className="text-xs text-muted mt-3">Images are automatically optimized for fast loading</p>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        accept="image/*"
                                        onChange={handleFileUpload}
                                        disabled={uploading}
                                        title="Upload Product Image"
                                    />
                                </div>

                                {uploading && (
                                    <div className="text-center p-4 bg-sky-500/10 rounded-xl border border-sky-500/20">
                                        <div className="text-sm font-medium text-sky-600 animate-pulse">{uploadStatus}</div>
                                    </div>
                                )}

                                {formData.images.length > 0 && (
                                    <div className="space-y-3">
                                        <p className="text-sm font-medium text-text">Your photos ({formData.images.length})</p>
                                        <div className="grid grid-cols-4 gap-4">
                                            {formData.images.map((img, i) => (
                                                <div
                                                    key={i}
                                                    className={`relative group aspect-square rounded-xl overflow-hidden border-2 transition-all ${i === formData.mainImageIndex
                                                        ? 'border-sky-500 ring-2 ring-sky-500/20'
                                                        : 'border-muted/20 hover:border-muted/40'
                                                        }`}
                                                >
                                                    <img src={img} alt="" className="w-full h-full object-cover" />

                                                    {i === formData.mainImageIndex && (
                                                        <div className="absolute top-2 left-2 px-2 py-1 bg-sky-500 text-white text-xs font-medium rounded-md flex items-center gap-1">
                                                            <Star size={12} /> Main
                                                        </div>
                                                    )}

                                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                        {i !== formData.mainImageIndex && (
                                                            <button
                                                                onClick={() => setMainImage(i)}
                                                                className="p-2 bg-white text-gray-800 rounded-lg hover:bg-sky-500 hover:text-white transition-colors"
                                                                title="Set as main photo"
                                                            >
                                                                <Star size={16} />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => removeImage(i)}
                                                            className="p-2 bg-white text-gray-800 rounded-lg hover:bg-red-500 hover:text-white transition-colors"
                                                            title="Remove"
                                                        >
                                                            <Trash size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* VARIANTS */}
                        {activeSection === 'variants' && (
                            <div className="space-y-6 max-w-xl animate-[fadeIn_0.2s_ease-out]">
                                <div className="p-4 rounded-xl bg-bg/50 border border-muted/10">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.hasVariants}
                                            onChange={(e) => updateField('hasVariants', e.target.checked)}
                                            className="w-5 h-5 rounded border-muted/30 text-sky-500 focus:ring-sky-500"
                                        />
                                        <div>
                                            <span className="font-medium text-text">This product has variants</span>
                                            <p className="text-sm text-muted">Like different sizes or colors</p>
                                        </div>
                                    </label>
                                </div>

                                {formData.hasVariants && (
                                    <div className="space-y-4">
                                        {formData.variants.map((variant, index) => (
                                            <div key={index} className="p-4 rounded-xl border border-muted/20 bg-bg/30 space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-medium text-text">Option {index + 1}</span>
                                                    <button
                                                        onClick={() => removeVariant(index)}
                                                        title="Remove variant"
                                                        className="p-1 text-red-500 hover:bg-red-500/10 rounded transition-colors"
                                                    >
                                                        <Trash size={16} />
                                                    </button>
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <select
                                                        title="Variant type"
                                                        value={variant.option}
                                                        onChange={(e) => updateVariant(index, 'option', e.target.value)}
                                                        className="p-2.5 rounded-lg bg-bg border border-muted/20 text-text text-sm"
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
                                                        className="p-2.5 rounded-lg bg-bg border border-muted/20 text-text text-sm"
                                                    />
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="text-xs text-muted">Price (optional)</label>
                                                        <input
                                                            type="number"
                                                            value={variant.price || ''}
                                                            onChange={(e) => updateVariant(index, 'price', e.target.value ? Number(e.target.value) : undefined)}
                                                            placeholder="Override price"
                                                            className="w-full p-2.5 rounded-lg bg-bg border border-muted/20 text-text text-sm"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-muted">Stock (optional)</label>
                                                        <input
                                                            type="number"
                                                            value={variant.stock || ''}
                                                            onChange={(e) => updateVariant(index, 'stock', e.target.value ? Number(e.target.value) : undefined)}
                                                            placeholder="Variant stock"
                                                            className="w-full p-2.5 rounded-lg bg-bg border border-muted/20 text-text text-sm"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}

                                        <button
                                            onClick={addVariant}
                                            className="w-full p-3 rounded-xl border-2 border-dashed border-muted/30 text-muted hover:border-sky-500/50 hover:text-sky-500 transition-all flex items-center justify-center gap-2"
                                        >
                                            <Plus size={18} /> Add Variant
                                        </button>
                                    </div>
                                )}

                                {!formData.hasVariants && (
                                    <div className="text-center py-8 text-muted">
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
                                    <label className="text-sm font-medium text-text">
                                        Selling Price <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted">₹</span>
                                        <input
                                            type="number"
                                            value={formData.price || ''}
                                            onChange={(e) => updateField('price', Number(e.target.value))}
                                            className={`w-full p-3 pl-8 rounded-xl bg-bg border ${errors.price ? 'border-red-500' : 'border-muted/20'} text-text text-lg font-medium focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-all`}
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
                                    <label className="text-sm font-medium text-text">Discount Price</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted">₹</span>
                                        <input
                                            type="number"
                                            value={formData.discountPrice || ''}
                                            onChange={(e) => updateField('discountPrice', e.target.value ? Number(e.target.value) : null)}
                                            className="w-full p-3 pl-8 rounded-xl bg-bg border border-muted/20 text-text focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-all"
                                            placeholder="Optional - sale price"
                                        />
                                    </div>
                                    <p className="text-xs text-muted">Leave empty if not on sale</p>
                                </div>

                                {formData.sellingPrice > 0 && formData.discountPrice && formData.discountPrice < formData.sellingPrice && (
                                    <div className="p-4 bg-green-500/10 rounded-xl border border-green-500/20">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-green-600 font-medium">Discount</span>
                                            <span className="text-lg font-bold text-green-600">
                                                {Math.round(((formData.sellingPrice - formData.discountPrice) / formData.sellingPrice) * 100)}% OFF
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* STOCK */}
                        {activeSection === 'stock' && (
                            <div className="space-y-6 max-w-md animate-[fadeIn_0.2s_ease-out]">
                                <div className="p-4 rounded-xl bg-bg/50 border border-muted/10">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.trackStock}
                                            onChange={(e) => updateField('trackStock', e.target.checked)}
                                            className="w-5 h-5 rounded border-muted/30 text-sky-500 focus:ring-sky-500"
                                        />
                                        <div>
                                            <span className="font-medium text-text">Track stock quantity</span>
                                            <p className="text-sm text-muted">Automatically updates when orders are placed</p>
                                        </div>
                                    </label>
                                </div>

                                {formData.trackStock && (
                                    <>
                                        <div className="space-y-2">
                                            <label htmlFor="stockQuantity" className="text-sm font-medium text-text">Available Quantity</label>
                                            <input
                                                id="stockQuantity"
                                                type="number"
                                                value={formData.stockQuantity}
                                                onChange={(e) => updateField('stockQuantity', Number(e.target.value))}
                                                min="0"
                                                placeholder="0"
                                                className="w-full p-3 rounded-xl bg-bg border border-muted/20 text-text text-lg font-medium focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-all"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label htmlFor="lowStockThreshold" className="text-sm font-medium text-text">Low stock alert</label>
                                            <input
                                                id="lowStockThreshold"
                                                type="number"
                                                value={formData.lowStockThreshold}
                                                onChange={(e) => updateField('lowStockThreshold', Number(e.target.value))}
                                                min="0"
                                                placeholder="5"
                                                className="w-full p-3 rounded-xl bg-bg border border-muted/20 text-text focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-all"
                                            />
                                            <p className="text-xs text-muted">You'll be notified when stock falls below this</p>
                                        </div>

                                        <div className="space-y-3">
                                            <label className="text-sm font-medium text-text">When out of stock</label>
                                            <div className="space-y-2">
                                                <button
                                                    type="button"
                                                    onClick={() => updateField('allowOutOfStockOrders', false)}
                                                    className={`w-full p-3 rounded-xl border-2 text-left transition-all ${formData.allowOutOfStockOrders === false
                                                        ? 'border-sky-500 bg-sky-500/10'
                                                        : 'border-muted/20 hover:border-muted/40'
                                                        }`}
                                                >
                                                    <div className="font-medium text-text">Hide product</div>
                                                    <div className="text-xs text-muted mt-1">Product won't be visible to customers</div>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => updateField('allowOutOfStockOrders', true)}
                                                    className={`w-full p-3 rounded-xl border-2 text-left transition-all ${formData.allowOutOfStockOrders === true
                                                        ? 'border-sky-500 bg-sky-500/10'
                                                        : 'border-muted/20 hover:border-muted/40'
                                                        }`}
                                                >
                                                    <div className="font-medium text-text">Allow pre-orders</div>
                                                    <div className="text-xs text-muted mt-1">Customers can still order (shown as "Pre-order")</div>
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
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-muted/10 flex justify-between items-center bg-bg/50 rounded-b-2xl">
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
                            className="px-4 py-2.5 rounded-xl border border-muted/20 text-text font-medium hover:bg-bg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saveStatus === 'saving'}
                            className={`px-6 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 ${saveStatus === 'saving'
                                ? 'bg-muted text-bg cursor-not-allowed'
                                : saveStatus === 'saved'
                                    ? 'bg-green-500 text-white'
                                    : 'bg-sky-500 text-white hover:bg-sky-600 shadow-lg shadow-sky-500/20'
                                }`}
                        >
                            {saveStatus === 'saving' ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-bg/30 border-t-bg rounded-full animate-spin"></span>
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
};

export default ProductModal;
