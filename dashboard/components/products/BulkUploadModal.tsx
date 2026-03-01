import React, { useState, useRef, useCallback } from 'react';
import { X, Upload, FileText, CheckCircle2, AlertCircle, Loader2, Download, ImageIcon, AlertTriangle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface BulkUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

interface ParsedProduct {
    name: string;
    description: string;
    category: string;
    price: number;
    discount_price: number | null;
    stock_quantity: number;
    image_url: string;
    is_active: boolean;
    errors: string[];
    valid: boolean;
}

interface UploadResult {
    success: number;
    failed: number;
    failures: { row: number; name: string; reason: string }[];
}

// RFC 4180 compliant CSV parser — handles quoted fields, commas in values, escaped quotes
function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    let i = 0;

    while (i < line.length) {
        const char = line[i];

        if (inQuotes) {
            if (char === '"') {
                if (i + 1 < line.length && line[i + 1] === '"') {
                    current += '"';
                    i += 2;
                } else {
                    inQuotes = false;
                    i++;
                }
            } else {
                current += char;
                i++;
            }
        } else {
            if (char === '"') {
                inQuotes = true;
                i++;
            } else if (char === ',') {
                result.push(current.trim());
                current = '';
                i++;
            } else {
                current += char;
                i++;
            }
        }
    }
    result.push(current.trim());
    return result;
}

function parseCSV(text: string): Record<string, string>[] {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return [];

    const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/['"]/g, ''));

    return lines.slice(1).map(line => {
        const values = parseCSVLine(line);
        const obj: Record<string, string> = {};
        headers.forEach((header, i) => {
            obj[header] = values[i] || '';
        });
        return obj;
    });
}

function validateProduct(raw: Record<string, string>, rowIndex: number): ParsedProduct {
    const errors: string[] = [];

    const name = (raw.name || '').trim();
    if (!name) errors.push('Name is required');

    const priceStr = (raw.price || '').trim();
    const price = parseFloat(priceStr);
    if (!priceStr || isNaN(price) || price < 0) errors.push('Price must be a valid number ≥ 0');

    const discountStr = (raw.discount_price || '').trim();
    let discountPrice: number | null = null;
    if (discountStr) {
        discountPrice = parseFloat(discountStr);
        if (isNaN(discountPrice) || discountPrice < 0) {
            errors.push('Discount price must be a valid number ≥ 0');
            discountPrice = null;
        }
    }

    const stockStr = (raw.stock_quantity || raw.stock || '').trim();
    const stock = parseInt(stockStr) || 0;
    if (stockStr && isNaN(parseInt(stockStr))) errors.push('Stock must be a number');

    const imageUrl = (raw.image_url || raw.image || '').trim();

    const isActiveStr = (raw.is_active || 'true').trim().toLowerCase();
    const isActive = isActiveStr !== 'false' && isActiveStr !== '0' && isActiveStr !== 'no';

    return {
        name: name || `Product Row ${rowIndex + 1}`,
        description: (raw.description || '').trim(),
        category: (raw.category || 'Uncategorized').trim(),
        price: isNaN(price) ? 0 : price,
        discount_price: discountPrice,
        stock_quantity: stock,
        image_url: imageUrl,
        is_active: isActive,
        errors,
        valid: errors.length === 0,
    };
}

const TEMPLATE_CSV = `name,description,category,price,discount_price,stock_quantity,image_url,is_active
"Classic White T-Shirt","Premium cotton crew neck tee, ultra-soft fabric",T-Shirts,599,,25,https://example.com/tshirt.jpg,true
"Slim Fit Jeans","Stretch denim with modern slim fit",Jeans,1299,999,15,https://example.com/jeans.jpg,true
"Summer Floral Dress","Lightweight floral print dress for summer",Dresses,1499,,10,,true
"Leather Belt","Genuine leather belt with classic buckle",Accessories,399,349,50,https://example.com/belt.jpg,true
"Running Shoes","Breathable mesh running shoes with cushioned sole",Footwear,2499,1999,20,https://example.com/shoes.jpg,true`;

const BulkUploadModal: React.FC<BulkUploadModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [file, setFile] = useState<File | null>(null);
    const [parsing, setParsing] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [products, setProducts] = useState<ParsedProduct[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
    const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
    const fileInputRef = useRef<HTMLInputElement>(null);

    const resetState = useCallback(() => {
        setFile(null);
        setProducts([]);
        setError(null);
        setUploadResult(null);
        setUploadProgress({ current: 0, total: 0 });
        setParsing(false);
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }, []);

    if (!isOpen) return null;

    const handleClose = () => {
        resetState();
        onClose();
    };

    const handleDownloadTemplate = () => {
        const blob = new Blob([TEMPLATE_CSV], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'venderflow_product_template.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        if (selectedFile.size > 5 * 1024 * 1024) {
            setError('File size must be under 5MB.');
            return;
        }

        setFile(selectedFile);
        setUploadResult(null);
        parseFile(selectedFile);
    };

    const parseFile = async (selectedFile: File) => {
        setParsing(true);
        setError(null);
        setProducts([]);

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result as string;
                let rawData: Record<string, string>[] = [];

                if (selectedFile.name.endsWith('.json')) {
                    const parsed = JSON.parse(text);
                    rawData = Array.isArray(parsed) ? parsed : [parsed];
                } else if (selectedFile.name.endsWith('.csv')) {
                    rawData = parseCSV(text);
                } else {
                    throw new Error('Unsupported format. Use .csv or .json files.');
                }

                if (rawData.length === 0) {
                    throw new Error('No products found in the file. Check your format.');
                }

                if (rawData.length > 200) {
                    throw new Error(`Too many products (${rawData.length}). Maximum 200 per upload.`);
                }

                const validated = rawData.map((row, i) => validateProduct(row, i));
                setProducts(validated);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setParsing(false);
            }
        };
        reader.readAsText(selectedFile);
    };

    const handleUpload = async () => {
        const validProducts = products.filter(p => p.valid);
        if (validProducts.length === 0) {
            setError('No valid products to upload. Fix the errors first.');
            return;
        }

        setUploading(true);
        setError(null);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated. Please log in again.');

            const total = validProducts.length;
            setUploadProgress({ current: 0, total });

            const result: UploadResult = { success: 0, failed: 0, failures: [] };

            // Batch insert: up to 50 products at a time
            const BATCH_SIZE = 50;
            for (let i = 0; i < total; i += BATCH_SIZE) {
                const batch = validProducts.slice(i, i + BATCH_SIZE);

                const productsToInsert = batch.map(p => ({
                    name: p.name,
                    description: p.description || null,
                    category: p.category,
                    price: p.price,
                    discount_price: p.discount_price,
                    is_active: p.is_active,
                    has_variants: false,
                    seller_id: user.id,
                }));

                const { data: inserted, error: insertError } = await supabase
                    .from('products')
                    .insert(productsToInsert)
                    .select();

                if (insertError) {
                    batch.forEach((p, idx) => {
                        result.failed++;
                        result.failures.push({
                            row: i + idx + 1,
                            name: p.name,
                            reason: insertError.message,
                        });
                    });
                    setUploadProgress({ current: i + batch.length, total });
                    continue;
                }

                if (inserted && inserted.length > 0) {
                    // Insert stock records
                    const stockRows = inserted.map((dbProduct, idx) => ({
                        product_id: dbProduct.id,
                        stock_quantity: batch[idx].stock_quantity,
                        track_stock: true,
                    }));

                    await supabase.from('product_stock').insert(stockRows);

                    // Insert media for products with image URLs
                    const mediaRows = inserted
                        .map((dbProduct, idx) => {
                            if (batch[idx].image_url) {
                                return {
                                    product_id: dbProduct.id,
                                    file_url: batch[idx].image_url,
                                    is_primary: true,
                                    sort_order: 0,
                                };
                            }
                            return null;
                        })
                        .filter(Boolean);

                    if (mediaRows.length > 0) {
                        await supabase.from('product_media').insert(mediaRows);
                    }

                    result.success += inserted.length;
                }

                setUploadProgress({ current: Math.min(i + batch.length, total), total });
            }

            setUploadResult(result);

            if (result.success > 0) {
                onSuccess();
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setUploading(false);
        }
    };

    const validCount = products.filter(p => p.valid).length;
    const invalidCount = products.filter(p => !p.valid).length;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-[#1e2235] border border-gray-200 dark:border-white/10 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-white/10">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Bulk Product Import</h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Upload CSV or JSON to add multiple products at once</p>
                    </div>
                    <button onClick={handleClose} aria-label="Close" title="Close" className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors">
                        <X size={18} className="text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-4">

                    {/* Download Template */}
                    {!uploadResult && (
                        <button
                            onClick={handleDownloadTemplate}
                            className="flex items-center gap-2.5 px-4 py-3 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors text-sm w-full"
                        >
                            <Download size={18} />
                            <div className="text-left">
                                <span className="font-semibold block">Download CSV Template</span>
                                <span className="text-xs opacity-70">Pre-filled with 5 example products to get you started</span>
                            </div>
                        </button>
                    )}

                    {/* Upload Area */}
                    {!uploadResult && (
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className={`
                                border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all
                                ${file ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-500/5' : 'border-gray-300 dark:border-white/15 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-white/5'}
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
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${file ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600' : 'bg-gray-100 dark:bg-white/10 text-gray-400'}`}>
                                {parsing ? <Loader2 className="animate-spin" size={20} /> : <Upload size={20} />}
                            </div>
                            <span className="font-semibold text-sm text-gray-900 dark:text-white">{file ? file.name : 'Click to select file'}</span>
                            <span className="text-xs text-gray-400">CSV or JSON • Max 200 products • 5MB limit</span>
                        </div>
                    )}

                    {/* Error Banner */}
                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl flex items-start gap-2.5 text-red-600 dark:text-red-400 text-sm">
                            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Validation Summary */}
                    {products.length > 0 && !uploadResult && (
                        <div className="flex items-center gap-3 text-xs">
                            <span className="text-gray-500 dark:text-gray-400 font-medium">
                                <FileText size={14} className="inline mr-1" />
                                {products.length} products parsed
                            </span>
                            {validCount > 0 && (
                                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                    <CheckCircle2 size={13} className="inline mr-0.5" />
                                    {validCount} valid
                                </span>
                            )}
                            {invalidCount > 0 && (
                                <span className="text-amber-600 dark:text-amber-400 font-semibold">
                                    <AlertTriangle size={13} className="inline mr-0.5" />
                                    {invalidCount} with errors
                                </span>
                            )}
                        </div>
                    )}

                    {/* Preview Table */}
                    {products.length > 0 && !uploadResult && (
                        <div className="border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden">
                            <div className="max-h-[280px] overflow-y-auto">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 uppercase tracking-wider sticky top-0">
                                        <tr>
                                            <th className="px-3 py-2 font-semibold w-8">#</th>
                                            <th className="px-3 py-2 font-semibold">Image</th>
                                            <th className="px-3 py-2 font-semibold">Name</th>
                                            <th className="px-3 py-2 font-semibold">Price</th>
                                            <th className="px-3 py-2 font-semibold">Stock</th>
                                            <th className="px-3 py-2 font-semibold">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                        {products.map((item, i) => (
                                            <tr key={i} className={`${!item.valid ? 'bg-red-50/50 dark:bg-red-500/5' : ''}`}>
                                                <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                                                <td className="px-3 py-2">
                                                    {item.image_url ? (
                                                        <img
                                                            src={item.image_url}
                                                            alt={`Preview of ${item.name}`}
                                                            className="w-8 h-8 rounded object-cover bg-gray-100 dark:bg-white/10"
                                                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                        />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded bg-gray-100 dark:bg-white/10 flex items-center justify-center">
                                                            <ImageIcon size={14} className="text-gray-300" />
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 text-gray-900 dark:text-white font-medium max-w-[150px] truncate" title={item.name}>
                                                    {item.name}
                                                </td>
                                                <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                                                    ₹{item.price}
                                                    {item.discount_price != null && (
                                                        <span className="text-emerald-500 ml-1">→ ₹{item.discount_price}</span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{item.stock_quantity}</td>
                                                <td className="px-3 py-2">
                                                    {item.valid ? (
                                                        <CheckCircle2 size={14} className="text-emerald-500" />
                                                    ) : (
                                                        <span className="text-red-500 text-[10px]" title={item.errors.join(', ')}>
                                                            <AlertCircle size={14} className="inline" /> {item.errors[0]}
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Upload Progress */}
                    {uploading && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                                <span>Importing products...</span>
                                <span className="font-semibold">{uploadProgress.current}/{uploadProgress.total}</span>
                            </div>
                            <div className="w-full h-2 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-blue-500 rounded-full transition-all duration-300"
                                    style={{ width: `${uploadProgress.total > 0 ? (uploadProgress.current / uploadProgress.total) * 100 : 0}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Upload Result */}
                    {uploadResult && (
                        <div className="space-y-3">
                            <div className={`p-4 rounded-xl border ${uploadResult.failed === 0 ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20' : 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20'}`}>
                                <div className="flex items-center gap-2 mb-1">
                                    {uploadResult.failed === 0 ? (
                                        <CheckCircle2 size={18} className="text-emerald-600" />
                                    ) : (
                                        <AlertTriangle size={18} className="text-amber-600" />
                                    )}
                                    <span className="font-bold text-sm text-gray-900 dark:text-white">Import Complete</span>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                    <span className="text-emerald-600 font-semibold">{uploadResult.success} products added</span>
                                    {uploadResult.failed > 0 && (
                                        <span className="text-red-500 font-semibold ml-2">{uploadResult.failed} failed</span>
                                    )}
                                </p>
                            </div>

                            {uploadResult.failures.length > 0 && (
                                <div className="border border-red-200 dark:border-red-500/20 rounded-xl overflow-hidden">
                                    <div className="px-3 py-2 bg-red-50 dark:bg-red-500/10 text-xs font-semibold text-red-600">Failed Rows</div>
                                    <div className="max-h-[120px] overflow-y-auto">
                                        {uploadResult.failures.map((f, i) => (
                                            <div key={i} className="px-3 py-1.5 text-xs text-red-500 border-t border-red-100 dark:border-red-500/10">
                                                Row {f.row}: <span className="font-medium">{f.name}</span> — {f.reason}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Format Help */}
                    {!file && !uploadResult && (
                        <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 p-3 rounded-xl">
                            <h4 className="text-xs font-semibold text-gray-900 dark:text-white mb-1.5 flex items-center gap-1.5">
                                <CheckCircle2 size={13} className="text-blue-500" /> CSV Column Reference
                            </h4>
                            <div className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
                                <p><span className="font-semibold text-gray-700 dark:text-gray-300">name</span> — Product name (required)</p>
                                <p><span className="font-semibold text-gray-700 dark:text-gray-300">price</span> — Price in ₹ (required)</p>
                                <p><span className="font-semibold text-gray-700 dark:text-gray-300">description</span> — Product description</p>
                                <p><span className="font-semibold text-gray-700 dark:text-gray-300">category</span> — Category name</p>
                                <p><span className="font-semibold text-gray-700 dark:text-gray-300">discount_price</span> — Sale price</p>
                                <p><span className="font-semibold text-gray-700 dark:text-gray-300">stock_quantity</span> — Number in stock</p>
                                <p><span className="font-semibold text-gray-700 dark:text-gray-300">image_url</span> — Product image URL</p>
                                <p><span className="font-semibold text-gray-700 dark:text-gray-300">is_active</span> — true/false (publish immediately)</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-gray-200 dark:border-white/10 flex gap-3">
                    {uploadResult ? (
                        <button
                            onClick={handleClose}
                            className="flex-1 px-4 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-semibold hover:opacity-90 transition-opacity text-sm"
                        >
                            Done
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={handleClose}
                                className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-white/15 transition-colors text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                disabled={!file || uploading || parsing || !!error || validCount === 0}
                                onClick={handleUpload}
                                className="flex-1 px-4 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-semibold hover:opacity-90 disabled:opacity-40 transition-all text-sm flex items-center justify-center gap-2"
                            >
                                {uploading ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        Importing...
                                    </>
                                ) : (
                                    `Import ${validCount} Product${validCount !== 1 ? 's' : ''}`
                                )}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BulkUploadModal;
