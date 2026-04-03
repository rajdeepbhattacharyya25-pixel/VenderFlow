import React, { useState } from 'react';
import { X, Upload, Tag, Check, AlertCircle } from 'lucide-react';
import TagInput from './TagInput';

interface BulkEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedIds: string[];
    onSave: (data: { category?: string[]; newImageFile?: File }) => Promise<void>;
}

const BulkEditModal: React.FC<BulkEditModalProps> = ({ isOpen, onClose, selectedIds, onSave }) => {
    const [categories, setCategories] = useState<string[]>([]);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            setImageFile(file);
            const reader = new FileReader();
            reader.onload = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async () => {
        try {
            setStatus('saving');
            await onSave({
                category: categories.length > 0 ? categories : undefined,
                newImageFile: imageFile || undefined,
            });
            setStatus('saved');
            setTimeout(() => {
                setStatus('idle');
                onClose();
                setCategories([]);
                setImageFile(null);
                setImagePreview(null);
            }, 1000);
        } catch (error) {
            console.error(error);
            setStatus('error');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
            <div className="bg-theme-panel rounded-2xl w-full max-w-md shadow-2xl border border-theme-border animate-[slideUp_0.3s_ease-out] p-6">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-theme-text">Bulk Edit Products</h2>
                        <p className="text-sm text-theme-muted mt-1">Editing {selectedIds.length} products</p>
                    </div>
                    <button onClick={onClose} title="Close" className="p-2 text-theme-muted hover:text-theme-text hover:bg-theme-bg rounded-lg">
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-6">
                    {/* Category Update */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-theme-text flex items-center gap-2">
                            <Tag size={16} /> Categories
                        </label>
                        <TagInput
                            tags={categories}
                            onChange={setCategories}
                            placeholder="Add tags to all selected products..."
                        />
                        <p className="text-[10px] text-theme-muted">Leave blank to keep existing categories.</p>
                    </div>

                    {/* Image Upload */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-theme-text flex items-center gap-2">
                            <Upload size={16} /> Add Shared Image
                        </label>
                        <div className="border-2 border-dashed border-theme-border rounded-xl p-4 text-center hover:bg-theme-bg/50 transition-colors">
                            {imagePreview ? (
                                <div className="relative inline-block">
                                    <img src={imagePreview} alt="Preview" className="h-32 w-auto mx-auto rounded-lg object-cover" />
                                    <button
                                        onClick={() => { setImageFile(null); setImagePreview(null); }}
                                        title="Remove Image"
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow hover:bg-red-600"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-2 py-4">
                                    <Upload className="mx-auto text-theme-muted" size={24} />
                                    <label className="text-sm text-sky-500 font-medium cursor-pointer hover:underline">
                                        Choose File
                                        <input type="file" className="hidden" accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif" onChange={handleFileChange} />
                                    </label>
                                    <p className="text-xs text-theme-muted">Image will be added to all selected products.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-theme-border/50">
                        <button
                            onClick={onClose}
                            className="flex-1 py-2.5 rounded-xl border border-theme-border text-theme-text font-medium hover:bg-theme-bg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={status === 'saving'}
                            className="flex-1 py-2.5 rounded-xl bg-sky-500 text-white font-medium hover:bg-sky-600 transition-colors flex items-center justify-center gap-2"
                        >
                            {status === 'saving' && <span className="animate-spin w-4 h-4 rounded-full border-2 border-white/20 border-t-white"></span>}
                            {status === 'saved' && <Check size={16} />}
                            {status === 'idle' ? 'Apply changes' : status === 'saving' ? 'Applying...' : 'Success'}
                        </button>
                    </div>
                    {status === 'error' && (
                        <p className="text-red-500 text-xs text-center flex items-center justify-center gap-1">
                            <AlertCircle size={14} /> Failed to save changes
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BulkEditModal;
