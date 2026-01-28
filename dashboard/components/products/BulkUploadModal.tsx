import React, { useState, useRef } from 'react';
import { X, Upload, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface BulkUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const BulkUploadModal: React.FC<BulkUploadModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [file, setFile] = useState<File | null>(null);
    const [parsing, setParsing] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [preview, setPreview] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            parseFile(selectedFile);
        }
    };

    const parseFile = async (selectedFile: File) => {
        setParsing(true);
        setError(null);
        const reader = new FileReader();

        reader.onload = async (e) => {
            try {
                const text = e.target?.result as string;
                let data: any[] = [];

                if (selectedFile.name.endsWith('.json')) {
                    data = JSON.parse(text);
                } else if (selectedFile.name.endsWith('.csv')) {
                    data = parseCSV(text);
                } else {
                    throw new Error('Unsupported file format. Please use CSV or JSON.');
                }

                if (!Array.isArray(data)) {
                    throw new Error('Data must be an array of products.');
                }

                setPreview(data.slice(0, 5)); // Show first 5 as preview
                setParsing(false);
            } catch (err: any) {
                setError(err.message);
                setParsing(false);
            }
        };

        reader.readAsText(selectedFile);
    };

    const parseCSV = (text: string) => {
        const lines = text.split(/\r?\n/);
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

        return lines.slice(1).filter(line => line.trim()).map(line => {
            const values = line.split(',').map(v => v.trim());
            const obj: any = {};
            headers.forEach((header, i) => {
                obj[header] = values[i];
            });
            return obj;
        });
    };

    const handleUpload = async () => {
        if (!file) return;
        setUploading(true);
        setError(null);

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const text = e.target?.result as string;
                let data: any[] = [];

                if (file.name.endsWith('.json')) {
                    data = JSON.parse(text);
                } else {
                    data = parseCSV(text);
                }

                // Prepare and validate data
                const productsToInsert = data.map(item => ({
                    name: item.name || 'Untitled Product',
                    description: item.description || '',
                    category: item.category || 'Uncategorized',
                    price: parseFloat(item.price) || 0,
                    discount_price: parseFloat(item.discount_price) || null,
                    is_active: item.is_active === 'true' || item.is_active === true,
                    has_variants: false // Simplified for bulk upload
                }));

                // 1. Bulk Insert Products
                const { data: insertedProducts, error: insertError } = await supabase
                    .from('products')
                    .insert(productsToInsert)
                    .select();

                if (insertError) throw insertError;

                // 2. Insert Stock for each product
                if (insertedProducts) {
                    const stockToInsert = insertedProducts.map((p, index) => {
                        const originalItem = data[index];
                        return {
                            product_id: p.id,
                            stock_quantity: parseInt(originalItem.stock_quantity) || 0,
                            track_stock: true
                        };
                    });

                    const { error: stockError } = await supabase
                        .from('product_stock')
                        .insert(stockToInsert);

                    if (stockError) console.error('Bulk stock insertion failed', stockError);

                    // 3. Insert Primary Image if image_url provided
                    const mediaToInsert = insertedProducts.map((p, index) => {
                        const originalItem = data[index];
                        if (originalItem.image_url) {
                            return {
                                product_id: p.id,
                                file_url: originalItem.image_url,
                                is_primary: true
                            };
                        }
                        return null;
                    }).filter(Boolean);

                    if (mediaToInsert.length > 0) {
                        const { error: mediaError } = await supabase
                            .from('product_media')
                            .insert(mediaToInsert);
                        if (mediaError) console.error('Bulk media insertion failed', mediaError);
                    }
                }

                onSuccess();
                onClose();
            } catch (err: any) {
                setError(err.message);
            } finally {
                setUploading(false);
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity">
            <div className="bg-panel border border-muted/10 w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-muted/10">
                    <div>
                        <h2 className="text-xl font-bold text-text">Bulk Product Import</h2>
                        <p className="text-sm text-muted">Upload CSV or JSON files to add products in bulk.</p>
                    </div>
                    <button onClick={onClose} aria-label="Close" title="Close" className="p-2 hover:bg-muted/10 rounded-full transition-colors">
                        <X size={20} className="text-muted" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6">

                    {/* Upload Area */}
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className={`
                            border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all
                            ${file ? 'border-chart-line bg-chart-line/5' : 'border-muted/20 hover:border-chart-line hover:bg-muted/5'}
                        `}
                    >
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept=".csv,.json"
                            className="hidden"
                            title="Select file for bulk upload"
                            aria-label="Select file for bulk upload"
                        />
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${file ? 'bg-chart-line/20 text-chart-line' : 'bg-muted/10 text-muted'}`}>
                            {uploading ? <Loader2 className="animate-spin" /> : <Upload size={24} />}
                        </div>
                        <div className="text-center">
                            <span className="font-bold text-text block">{file ? file.name : 'Click to select or drag and drop'}</span>
                            <span className="text-xs text-muted">CSV or JSON (max 5MB)</span>
                        </div>
                    </div>

                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-500 text-sm">
                            <AlertCircle size={18} />
                            <span>{error}</span>
                        </div>
                    )}

                    {file && !error && !parsing && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between text-sm">
                                <span className="font-bold text-text flex items-center gap-2">
                                    <FileText size={16} className="text-chart-line" />
                                    Preview (First 5 items)
                                </span>
                                <span className="text-muted">{preview.length} items found</span>
                            </div>

                            <div className="border border-muted/10 rounded-xl overflow-hidden text-xs">
                                <table className="w-full text-left">
                                    <thead className="bg-muted/5 text-muted uppercase tracking-wider">
                                        <tr>
                                            <th className="px-4 py-2 font-bold">Name</th>
                                            <th className="px-4 py-2 font-bold">Price</th>
                                            <th className="px-4 py-2 font-bold">Category</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-muted/10 text-text">
                                        {preview.map((item, i) => (
                                            <tr key={i}>
                                                <td className="px-4 py-2">{item.name || '---'}</td>
                                                <td className="px-4 py-2">₹{item.price || '0'}</td>
                                                <td className="px-4 py-2">{item.category || '---'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {!file && (
                        <div className="bg-blue-500/5 border border-blue-500/10 p-4 rounded-xl space-y-2">
                            <h4 className="text-xs font-bold text-blue-500 uppercase flex items-center gap-2">
                                <CheckCircle2 size={14} /> Recommended CSV Format
                            </h4>
                            <p className="text-xs text-muted leading-relaxed">
                                Headers: name, description, category, price, discount_price, stock_quantity, image_url
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-muted/10 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 bg-panel border border-muted/20 text-text rounded-xl font-bold hover:bg-muted/5 transition-all text-sm"
                    >
                        Cancel
                    </button>
                    <button
                        disabled={!file || uploading || parsing || !!error}
                        onClick={handleUpload}
                        className="flex-1 px-4 py-2.5 bg-text text-bg rounded-xl font-bold hover:opacity-90 disabled:opacity-50 transition-all text-sm flex items-center justify-center gap-2"
                    >
                        {uploading ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                Importing...
                            </>
                        ) : (
                            'Confirm Import'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BulkUploadModal;
