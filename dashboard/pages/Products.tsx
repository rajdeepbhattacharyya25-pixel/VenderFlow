
import React, { useState, useEffect } from 'react';
import { Plus, Filter, Upload } from 'lucide-react';
import ProductTable from '../components/products/ProductTable';
import ProductSidePanel from '../components/products/ProductSidePanel';
import ProductModal from '../components/products/ProductModal';
import BulkActionBar from '../components/products/BulkActionBar';
import BulkUploadModal from '../components/products/BulkUploadModal';
import { Product } from '../types';
import { supabase } from '../../lib/supabase';
import { uploadProductImage } from '../lib/storage';

interface ProductsProps {
    searchTerm?: string;
}

const Products: React.FC<ProductsProps> = ({ searchTerm = '' }) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [showSidePanel, setShowSidePanel] = useState(true);

    // Initial Load
    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('products')
                .select(`
                    *,
                    product_media ( file_url, is_primary ),
                    product_stock ( stock_quantity ),
                    product_variants (*)
                `)
                .eq('seller_id', user.id);

            if (error) throw error;

            const mappedProducts = (data || []).map((p: any) => {
                // Extract images from relation
                const images = p.product_media?.map((m: any) => m.file_url) || [];
                // Extract stock
                const stock = p.product_stock?.[0]?.stock_quantity ?? 0;

                return {
                    ...p,
                    images: images.length > 0 ? images : ['https://via.placeholder.com/150'],
                    stock_quantity: stock,
                    variants: p.product_variants || [],
                    orders: Math.floor(Math.random() * 50),
                    amount: (p.price || 0) * (Math.floor(Math.random() * 50))
                };
            });

            setProducts(mappedProducts);
        } catch (error) {
            console.error('Error fetching products:', error);
        }
    };

    // Filter Logic
    useEffect(() => {
        if (!searchTerm) {
            setFilteredProducts(products);
            return;
        }
        const lowerSearch = searchTerm.toLowerCase();
        const filtered = products.filter(p =>
            p.name.toLowerCase().includes(lowerSearch) ||
            p.category?.toLowerCase().includes(lowerSearch) ||
            p.id.toLowerCase().includes(lowerSearch)
        );
        setFilteredProducts(filtered);
    }, [searchTerm, products]);

    const handleSelect = (id: string, selected: boolean) => {
        if (selected) {
            setSelectedIds([...selectedIds, id]);
        } else {
            setSelectedIds(selectedIds.filter(sid => sid !== id));
        }
    };

    const handleSelectAll = (selected: boolean) => {
        if (selected) {
            setSelectedIds(products.map(p => p.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleEdit = (product: Product) => {
        setEditingProduct(product);
        setIsModalOpen(true);
    };

    const handleCreate = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        try {
            const { data, error } = await supabase
                .from('products')
                .insert([{
                    name: 'New Product',
                    price: 0,
                    is_active: false,
                    seller_id: user.id
                }])
                .select()
                .single();

            if (error) throw error;

            if (data) {
                // Construct full object matching our UI type
                const newProduct: Product = {
                    ...data,
                    images: [],
                    stock_quantity: 0
                };
                setEditingProduct(newProduct);
                setIsModalOpen(true);
            }
        } catch (error) {
            console.error('Error creating draft:', error);
            alert('Failed to initialize new product');
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this product?')) {
            const { error } = await supabase.from('products').delete().eq('id', id);
            if (!error) {
                fetchProducts();
                setSelectedIds(selectedIds.filter(sid => sid !== id));
            } else {
                alert('Failed to delete product');
            }
        }
    };

    const handleSaveProduct = async (productData: Partial<Product>) => {
        try {
            const productId = editingProduct?.id;
            if (!productId) return;

            // 1. Update Product Table
            const { error: productError } = await supabase
                .from('products')
                .update({
                    name: productData.name,
                    description: productData.description,
                    category: productData.category,
                    price: productData.price,
                    discount_price: productData.discount_price,
                    is_active: productData.is_active,
                    has_variants: productData.has_variants
                })
                .eq('id', productId);

            if (productError) throw productError;

            // 2. Update Stock
            if (typeof productData.stock_quantity === 'number') {
                const { error: stockError } = await supabase
                    .from('product_stock')
                    .upsert({
                        product_id: productId,
                        stock_quantity: productData.stock_quantity,
                        track_stock: true
                    });
                if (stockError) console.error('Stock update failed', stockError);
            }

            // 3. Update Variants
            if (productData.variants) {
                // Clear existing variants to ensure sync
                const { error: deleteError } = await supabase
                    .from('product_variants')
                    .delete()
                    .eq('product_id', productId);

                if (deleteError) console.error('Error clearing variants:', deleteError);

                if (productData.variants.length > 0) {
                    const variantsToInsert = productData.variants.map(v => ({
                        product_id: productId,
                        variant_name: v.variant_name,
                        price_override: v.price_override,
                        stock_quantity: v.stock_quantity
                    }));

                    const { error: variantsError } = await supabase
                        .from('product_variants')
                        .insert(variantsToInsert);

                    if (variantsError) console.error('Error inserting variants:', variantsError);
                }
            }

            fetchProducts();
            setIsModalOpen(false);
        } catch (error) {
            console.error('Error saving:', error);
            alert('Failed to save product.');
        }
    };

    const handleBulkAction = async (action: string) => {
        if (selectedIds.length === 0) return;

        try {
            switch (action) {
                case 'delete':
                    if (confirm(`Are you sure you want to delete ${selectedIds.length} products?`)) {
                        const { error } = await supabase.from('products').delete().in('id', selectedIds);
                        if (error) throw error;
                        alert('Products deleted successfully');
                        fetchProducts();
                        setSelectedIds([]);
                    }
                    break;

                case 'status':
                case 'archive':
                    const activate = action === 'status';
                    const { error: updateError } = await supabase
                        .from('products')
                        .update({ is_active: activate })
                        .in('id', selectedIds);

                    if (updateError) throw updateError;
                    alert(`Products ${activate ? 'published' : 'archived'} successfully`);
                    fetchProducts();
                    setSelectedIds([]);
                    break;

                case 'export':
                    const selectedProducts = products.filter(p => selectedIds.includes(p.id));
                    const headers = ['ID', 'Name', 'Category', 'Price', 'Stock', 'Status'];
                    const csvContent = [
                        headers.join(','),
                        ...selectedProducts.map(p => [
                            p.id,
                            `"${p.name}"`,
                            p.category || 'Uncategorized',
                            p.price,
                            p.stock_quantity,
                            p.is_active ? 'Published' : 'Draft'
                        ].join(','))
                    ].join('\n');

                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                    const link = document.createElement('a');
                    const url = URL.createObjectURL(blob);
                    link.setAttribute('href', url);
                    link.setAttribute('download', `products_export_${new Date().toISOString().split('T')[0]}.csv`);
                    link.style.visibility = 'hidden';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    break;

                default:
                    console.warn('Unknown bulk action:', action);
            }
        } catch (error: any) {
            console.error('Bulk action failed:', error);
            alert('Bulk action failed: ' + error.message);
        }
    };

    return (
        <div className="flex flex-col gap-6 animate-[fadeIn_0.5s_ease-out]">

            {/* Main Content (Table) */}
            <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${showSidePanel ? '' : ''}`}>

                {/* Actions Row - Title is in Global Header */}
                <div className="flex flex-col sm:flex-row justify-end items-start sm:items-center mb-6 gap-4">
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        {searchTerm && (
                            <span className="text-xs text-muted italic hidden sm:inline">
                                Showing results for "{searchTerm}"
                            </span>
                        )}
                        <button
                            className="p-2.5 rounded-xl bg-panel border border-muted/20 text-muted hover:text-text hover:border-chart-line transition-all"
                            title="Filter Products"
                        >
                            <Filter size={20} />
                        </button>
                        <button
                            onClick={async () => {
                                if (confirm('This will add sample products to your database using Supabase. Continue?')) {
                                    try {
                                        const { seedDatabase } = await import('../lib/seedData');
                                        await seedDatabase();
                                        fetchProducts();
                                        alert('Demo data generated successfully!');
                                    } catch (e: any) {
                                        console.error(e);
                                        alert('Failed to generate data: ' + e.message);
                                    }
                                }
                            }}
                            className="p-2.5 rounded-xl bg-panel border border-muted/20 text-muted hover:text-text hover:border-chart-line transition-all"
                            title="Generate Demo Data"
                        >
                            <span className="text-xs font-bold">Demo Data</span>
                        </button>
                        <button
                            onClick={() => setIsBulkModalOpen(true)}
                            className="p-2.5 rounded-xl bg-panel border border-muted/20 text-muted hover:text-text hover:border-chart-line transition-all flex items-center gap-2 group"
                            title="Import from CSV/JSON"
                        >
                            <Upload size={18} className="group-hover:scale-110 transition-transform" />
                            <span className="text-xs font-bold">Bulk Upload</span>
                        </button>
                        <button
                            onClick={handleCreate}
                            className="flex items-center gap-2 px-4 py-2.5 bg-text text-bg rounded-xl font-bold hover:opacity-90 transition-opacity shadow-lg shadow-chart-line/10 whitespace-nowrap"
                        >
                            <Plus size={20} />
                            <span className="hidden sm:inline">Add Product</span>
                        </button>
                    </div>
                </div>

                {/* Table Area */}
                <div className="flex-1 flex flex-col min-h-0 pb-10">
                    <ProductTable
                        products={filteredProducts}
                        selectedIds={selectedIds}
                        onSelect={handleSelect}
                        onSelectAll={handleSelectAll}
                        onEdit={handleEdit}
                    />
                </div>

            </div>

            {/* Right Context Panel (Collapsible ideally, fixed for now) */}
            {showSidePanel && (
                <div className="w-[320px] flex-shrink-0 hidden xl:flex flex-col border-l border-muted/10 pl-6">
                    <ProductSidePanel />
                </div>
            )}

            {/* Global Overlays */}
            <ProductModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                product={editingProduct}
                onSave={handleSaveProduct}
            />

            <BulkUploadModal
                isOpen={isBulkModalOpen}
                onClose={() => setIsBulkModalOpen(false)}
                onSuccess={() => fetchProducts()}
            />

            <BulkActionBar
                selectedCount={selectedIds.length}
                onClearSelection={() => setSelectedIds([])}
                onAction={handleBulkAction}
            />

        </div>
    );
};

export default Products;
