
import React, { useState, useEffect } from 'react';
import { Plus, Filter, Upload } from 'lucide-react';
import ProductTable from '../components/products/ProductTable';
import ProductSidePanel from '../components/products/ProductSidePanel';
import ProductModal from '../components/products/ProductModal';
import BulkActionBar from '../components/products/BulkActionBar';
import BulkUploadModal from '../components/products/BulkUploadModal';
import BulkEditModal from '../components/products/BulkEditModal';
import { Product } from '../types';
import { supabase } from '../../lib/supabase';
import { Seller } from '../../lib/seller';

interface ProductsProps {
    searchTerm?: string;
}

export default function Products({ searchTerm = '' }: ProductsProps) {
    const [products, setProducts] = useState<Product[]>([]);
    const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);
    const [showSidePanel, setShowSidePanel] = useState(true);
    const [seller, setSeller] = useState<Seller | null>(null);

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
                    product_media ( id, file_url, is_primary, sort_order ),
                    product_stock ( stock_quantity ),
                    product_variants (*)
                `)
                .eq('seller_id', user.id);

            if (error) throw error;

            // Fetch seller data for validation
            const { data: sellerData } = await supabase
                .from('sellers')
                .select('*')
                .eq('id', user.id)
                .single();

            if (sellerData) setSeller(sellerData as Seller);

            const mappedProducts = (data || [])
                .filter((p: any) => {
                    // Filter out "ghost" products: named 'New Product' with no media
                    // These are products that were initialized but never saved or had images added.
                    if (p.name === 'New Product' || !p.name) {
                        const media = p.product_media || [];
                        if (media.length === 0) return false;
                    }
                    return true;
                })
                .map((p: any) => {
                    // Ensure we use the proper media objects
                    const media = p.product_media || [];
                    // ...
                    const images = media.map((m: any) => m.file_url);
    
                    // Extract stock
                    const stock = p.product_stock?.[0]?.stock_quantity ?? 0;
    
                    return {
                        ...p,
                        images: images.length > 0 ? images : ['https://via.placeholder.com/150'],
                        media: media,
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
        // Universal ghost filtering: hide products named 'New Product' with no media
        let baseProducts = products.filter(p => {
            if (p.name === 'New Product' || !p.name) {
                const media = p.media || [];
                if (media.length === 0) return false;
            }
            return true;
        });

        if (!searchTerm) {
            setFilteredProducts(baseProducts);
            return;
        }

        const lowerSearch = searchTerm.toLowerCase();
        const filtered = baseProducts.filter(p =>
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
        console.log('Initiating product creation...');
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            console.error('No authenticated user found');
            alert('You must be logged in to add products.');
            return;
        }
        
        console.log('User authenticated:', user.id);

        try {
            // 1. Check Seller Plan & Quota
            const { data: seller, error: sellerError } = await supabase
                .from('sellers')
                .select('plan, product_count')
                .eq('id', user.id)
                .single();

            if (sellerError || !seller) throw new Error('Failed to fetch seller details');

            const limits: Record<string, number> = {
                'free': 10,
                'pro': 200,
                'premium': 999999
            };

            const currentLimit = limits[seller.plan as keyof typeof limits] || 10;
            if (seller.product_count >= currentLimit) {
                alert(`Limit Reached: You can only have ${currentLimit} products on the ${seller.plan} plan. Please upgrade to add more.`);
                return;
            }


            const { data, error } = await supabase
                .from('products')
                .insert([{
                    name: 'New Product',
                    price: 0,
                    is_active: false,
                    seller_id: user.id,
                    status: 'draft'
                }])
                .select()
                .single();

            if (error) throw error;

            if (data) {
                // 3. Increment product count atomically
                await supabase.rpc('increment_seller_quota', {
                    seller_id_param: user.id,
                    column_param: 'product_count',
                    amount_param: 1
                });

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
            console.error('Error creating product:', error);
            alert('Failed to initialize new product');
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this product?')) {
            const { data: { user } } = await supabase.auth.getUser();
            const { error } = await supabase.from('products').delete().eq('id', id);
            if (!error && user) {
                await supabase.rpc('decrement_seller_quota', {
                    seller_id_param: user.id,
                    column_param: 'product_count',
                    amount_param: 1
                });
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

            // 1. Validation for Publication
            if (productData.is_active && !seller?.razorpay_account_id) {
                alert('You must link your Razorpay account in Billing before publishing products.');
                return;
            }

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
                // For proper upsert, we should use 'id' if it exists. 
                // Since this might cause issues if variant IDs are missing from client, 
                // an alternative is to delete variants NOT in the new list, and upsert the rest.
                // For simplicity matching the existing flow but safer:

                // Get current variants to find which ones to delete
                const currentVariantsIds = productData.variants.filter((v: any) => v.id).map((v: any) => v.id);

                if (currentVariantsIds.length > 0) {
                    await supabase
                        .from('product_variants')
                        .delete()
                        .eq('product_id', productId)
                        .not('id', 'in', `(${currentVariantsIds.join(',')})`);
                } else {
                    await supabase
                        .from('product_variants')
                        .delete()
                        .eq('product_id', productId);
                }

                if (productData.variants.length > 0) {
                    const variantsToUpsert = productData.variants.map((v: any) => ({
                        ...(v.id ? { id: v.id } : {}), // include id for upsert if we have it
                        product_id: productId,
                        variant_name: v.variant_name,
                        price_override: v.price_override,
                        stock_quantity: v.stock_quantity
                    }));

                    const { error: variantsError } = await supabase
                        .from('product_variants')
                        .upsert(variantsToUpsert, { onConflict: 'id' });

                    if (variantsError) console.error('Error upserting variants:', variantsError);
                }
            }

            fetchProducts();
            setIsModalOpen(false);
        } catch (error) {
            console.error('Error saving:', error);
            alert('Failed to save product.');
        }
    };

    const handleBulkEditSave = async ({ category, newImageFile }: { category?: string; newImageFile?: File }) => {
        try {
            if (category) {
                const { error: updateError } = await supabase
                    .from('products')
                    .update({ category })
                    .in('id', selectedIds);
                if (updateError) throw updateError;
            }

            if (newImageFile) {
                const fileExt = newImageFile.name.split('.').pop();
                const fileName = `bulk-shared/${crypto.randomUUID()}.${fileExt}`;
                const { error: uploadError } = await supabase.storage.from('products-images').upload(fileName, newImageFile);
                if (uploadError) throw uploadError;
                
                const { data: { publicUrl } } = supabase.storage.from('products-images').getPublicUrl(fileName);
                
                const mediaInserts = selectedIds.map(id => ({
                    product_id: id,
                    file_url: publicUrl,
                    is_primary: false,
                    sort_order: 0
                }));
                const { error: dbError } = await supabase.from('product_media').insert(mediaInserts);
                if (dbError) console.error("Error inserting bulk product media:", dbError);
            }

            fetchProducts();
            setSelectedIds([]);
        } catch (error: any) {
            console.error('Bulk edit failed:', error);
            throw error; // Re-throw to be caught by BulkEditModal
        }
    };

    const handleBulkAction = async (action: string) => {
        if (selectedIds.length === 0) return;

        try {
            switch (action) {
                case 'delete':
                    if (confirm(`Are you sure you want to delete ${selectedIds.length} products?`)) {
                        const { data: { user } } = await supabase.auth.getUser();
                        const { error } = await supabase.from('products').delete().in('id', selectedIds);
                        if (error) throw error;

                        if (user) {
                            await supabase.rpc('decrement_seller_quota', {
                                seller_id_param: user.id,
                                column_param: 'product_count',
                                amount_param: selectedIds.length
                            });
                        }

                        alert('Products deleted successfully');
                        fetchProducts();
                        setSelectedIds([]);
                    }
                    break;

                case 'edit':
                    setIsBulkEditModalOpen(true);
                    break;

                case 'status':
                case 'archive':
                    const activate = action === 'status';

                    if (activate && !seller?.razorpay_account_id) {
                        alert('You must link your Razorpay account in Billing before publishing products.');
                        return;
                    }

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
                <div className="w-[320px] flex-shrink-0 hidden xl:flex flex-col border-l border-muted/10 pl-6">
                    <ProductSidePanel products={products.filter(p => {
                        if (p.name === 'New Product' || !p.name) {
                            const media = p.media || [];
                            if (media.length === 0) return false;
                        }
                        return true;
                    })} />
                </div>

            {/* Global Overlays */}
            <ProductModal
                isOpen={isModalOpen}
                onClose={async () => {
                    setIsModalOpen(false);
                    // If we close the modal and it was a new product that was NEVER saved (still named 'New Product' and in draft status)
                    // we should probably delete it to prevent "ghost" products.
                    if (editingProduct?.name === 'New Product' && editingProduct?.status === 'draft') {
                        const { error } = await supabase.from('products').delete().eq('id', editingProduct.id);
                        if (!error) {
                             // Decrement quota if it was incremented
                             const { data: { user } } = await supabase.auth.getUser();
                             if (user) {
                                 await supabase.rpc('decrement_seller_quota', {
                                     seller_id_param: user.id,
                                     column_param: 'product_count',
                                     amount_param: 1
                                 });
                             }
                             fetchProducts();
                        }
                    }
                    setEditingProduct(null);
                }}
                product={editingProduct}
                onSave={handleSaveProduct}
            />

            <BulkUploadModal
                isOpen={isBulkModalOpen}
                onClose={() => setIsBulkModalOpen(false)}
                onSuccess={() => fetchProducts()}
            />

            <BulkEditModal
                isOpen={isBulkEditModalOpen}
                onClose={() => setIsBulkEditModalOpen(false)}
                selectedIds={selectedIds}
                onSave={handleBulkEditSave}
            />

            <BulkActionBar
                selectedCount={selectedIds.length}
                onClearSelection={() => setSelectedIds([])}
                onAction={handleBulkAction}
            />

        </div>
    );
}
