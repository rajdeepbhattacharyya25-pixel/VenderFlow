import React, { useState, useEffect } from 'react';
import { Plus, Filter, Upload, Check } from 'lucide-react';
import ProductTable from '../components/products/ProductTable';
import ProductSidePanel from '../components/products/ProductSidePanel';
import ProductModal from '../components/products/ProductModal';
import BulkActionBar from '../components/products/BulkActionBar';
import BulkUploadModal from '../components/products/BulkUploadModal';
import BulkEditModal from '../components/products/BulkEditModal';
import { Product } from '../types';
import { supabase } from '../../lib/supabase';
import { Seller } from '../../lib/seller';
import { Events } from '../../lib/analytics';
import { logAlert } from '../../lib/notifications';

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
    const [seller, setSeller] = useState<Seller | null>(null);

    // Filters Dropdown State
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);
    const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
    const [categoryFilters, setCategoryFilters] = useState<string[]>([]);
    const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
    const [hideDemoProducts, setHideDemoProducts] = useState(true);

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

            // Show ALL products in dashboard — no filtering.
            // Sellers must be able to see and delete even draft/ghost products.
            // Ghost filtering happens only on the public storefront.
            const mappedProducts = (data || []).map((p) => {
                    const media = (p.product_media || []) as { id: string; file_url: string; is_primary: boolean; sort_order: number; variant_value?: string }[];
                    const sortedMedia = [...media].sort((a, b) => {
                        if (a.is_primary && !b.is_primary) return -1;
                        if (!a.is_primary && b.is_primary) return 1;
                        return (a.sort_order || 0) - (b.sort_order || 0);
                    });
                    const images = sortedMedia.map((m: { file_url: string }) => m.file_url);
                    const stock = p.product_stock?.[0]?.stock_quantity ?? 0;
                    return {
                        ...p,
                        category: Array.isArray(p.category) ? p.category : (p.category ? [p.category] : []),
                        images: images.length > 0 ? images : ['https://via.placeholder.com/150'],
                        media,
                        stock_quantity: stock,
                        variants: p.product_variants || [],
                        orders: Math.floor(Math.random() * 50),
                        amount: (p.price || 0) * (Math.floor(Math.random() * 50))
                    };
                });

            setProducts(mappedProducts as Product[]);
        } catch (error: any) {
            console.error('Error fetching products:', error);
            const { data: { user } } = await supabase.auth.getUser();
            logAlert({
                type: 'PRODUCT_FETCH_FAILED',
                severity: 'warning',
                title: 'Failed to Load Products',
                message: `Could not retrieve your product catalog. ${error?.message || 'Unknown error'}`,
                seller_id: user?.id,
                metadata: {
                    operation_type: 'product_fetch',
                    error_code: error?.code || 'FETCH_ERROR'
                }
            });
        }
    };

    // Filter Logic
    useEffect(() => {
        // Show ALL products in the dashboard — no ghost filtering here.
        // Sellers need to see and delete every product including drafts.
        let baseProducts = [...products];

        // 1. Search Filter
        if (searchTerm) {
            const lowerSearch = searchTerm.toLowerCase();
            baseProducts = baseProducts.filter(p =>
                p.name.toLowerCase().includes(lowerSearch) ||
                (p.category && p.category.some(c => c.toLowerCase().includes(lowerSearch))) ||
                p.id.toLowerCase().includes(lowerSearch)
            );
        }

        // 2. Status Filter
        if (statusFilter !== 'all') {
            baseProducts = baseProducts.filter(p => statusFilter === 'published' ? p.is_active : !p.is_active);
        }

        // 3. Category Filter
        if (categoryFilters.length > 0) {
            baseProducts = baseProducts.filter(p => p.category && p.category.some(c => categoryFilters.includes(c)));
        }

        // 4. Stock Level Filter
        if (stockFilter !== 'all') {
            baseProducts = baseProducts.filter(p => {
                const stock = p.stock_quantity || 0;
                if (stockFilter === 'out_of_stock') return stock === 0;
                if (stockFilter === 'low_stock') return stock > 0 && stock <= 5;
                if (stockFilter === 'in_stock') return stock > 5;
                return true;
            });
        }

        // 5. Demo/Ghost Product Filter
        if (hideDemoProducts) {
            baseProducts = baseProducts.filter(p => {
                const name = (p.name || '').toLowerCase().trim();
                const isPlaceholder = name === 'new product' || name === 'demo' || name === 'test' || name === 'demo product' || !name;
                const hasNoPrice = !p.price || Number(p.price) === 0;
                const hasNoMedia = !p.media || p.media.length === 0;
                
                // It's a ghost if it has a default name AND no price AND no media
                const isGhost = isPlaceholder && hasNoPrice && hasNoMedia;
                return !isGhost;
            });
        }

        setFilteredProducts(baseProducts);
    }, [searchTerm, products, statusFilter, categoryFilters, stockFilter, hideDemoProducts]);

    // Derived unique categories for the filter UI
    const uniqueCategories = Array.from(new Set(products.flatMap(p => p.category || []))).filter(Boolean).sort();

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
            logAlert({
                type: 'AUTH_REQUIRED',
                severity: 'warning',
                title: 'Authentication Required',
                message: 'You must be logged in to add products.',
                metadata: { operation_type: 'product_create', error_code: 'NO_AUTH' }
            });
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
                logAlert({
                    type: 'PRODUCT_QUOTA_REACHED',
                    severity: 'warning',
                    title: 'Product Limit Reached',
                    message: `You can only have ${currentLimit} products on the ${seller.plan} plan. Upgrade to add more.`,
                    seller_id: user.id,
                    metadata: {
                        operation_type: 'product_create',
                        error_code: 'QUOTA_EXCEEDED',
                        current_plan: seller.plan,
                        current_count: seller.product_count,
                        limit: currentLimit
                    },
                    action: {
                        type: 'UPGRADE_PLAN',
                        payload: { redirect: '/dashboard?tab=billing', current_plan: seller.plan }
                    }
                });
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

                // Events Tracking
                Events.productCreated({
                    vendor_id: user.id,
                    product_id: data.id,
                    category: 'Uncategorized',
                    price: 0
                });
            }
        } catch (error: any) {
            console.error('Error creating product:', error);
            logAlert({
                type: 'PRODUCT_CREATE_FAILED',
                severity: 'critical',
                title: 'Product Creation Failed',
                message: `Failed to initialize new product. ${error?.message || 'Database error'}`,
                seller_id: user.id,
                metadata: {
                    operation_type: 'product_create',
                    error_code: error?.code || 'INSERT_ERROR'
                }
            });
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

                // Real-time Sync: Broadcast update to storefronts
                const channel = supabase.channel(`seller:${user.id}`);
                await channel.subscribe(async (status) => {
                    if (status === 'SUBSCRIBED') {
                        await channel.send({
                            type: 'broadcast',
                            event: 'product_update',
                            payload: { productId: id, action: 'delete' }
                        });
                        setTimeout(() => channel.unsubscribe(), 2000);
                    }
                });
            } else {
                logAlert({
                    type: 'PRODUCT_DELETE_FAILED',
                    severity: 'critical',
                    title: 'Product Deletion Failed',
                    message: `Could not delete product (ID: ${id}). The database operation failed.`,
                    seller_id: user?.id,
                    metadata: {
                        operation_type: 'product_delete',
                        resource_id: id,
                        error_code: error?.code || 'DELETE_ERROR'
                    }
                });
            }
        }
    };

    const handleSaveProduct = async (productData: Partial<Product>) => {
        try {
            const productId = editingProduct?.id;
            if (!productId) return;

            // 1. Validation for Publication
            if (productData.is_active && !seller?.razorpay_account_id) {
                const { data: { user: currentUser } } = await supabase.auth.getUser();
                logAlert({
                    type: 'RAZORPAY_NOT_LINKED',
                    severity: 'warning',
                    title: 'Payment Account Required',
                    message: 'You must link your Razorpay account in Billing before publishing products.',
                    seller_id: currentUser?.id,
                    metadata: {
                        operation_type: 'product_publish',
                        resource_id: productId,
                        error_code: 'NO_RAZORPAY'
                    },
                    action: {
                        type: 'LINK_RAZORPAY',
                        payload: { redirect: '/dashboard?tab=settings' }
                    }
                });
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

            // Events Tracking
            if (productData.is_active) {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    Events.productPublished({
                        vendor_id: user.id,
                        product_id: productId
                    });
                }
            }

            // 2. Update Stock
            if (typeof productData.stock_quantity === 'number') {
                const { error: stockError } = await supabase
                    .from('product_stock')
                    .upsert({
                        product_id: productId,
                        stock_quantity: productData.stock_quantity,
                        track_stock: true
                    });
                if (stockError) {
                    console.error('Stock update failed', stockError);
                    const { data: { user: stockUser } } = await supabase.auth.getUser();
                    logAlert({
                        type: 'STOCK_UPDATE_FAILED',
                        severity: 'critical',
                        title: 'Stock Update Failed',
                        message: `Stock quantity could not be updated for product. ${stockError.message}`,
                        seller_id: stockUser?.id,
                        metadata: { operation_type: 'stock_update', resource_id: productId, error_code: stockError.code || 'STOCK_ERROR' }
                    });
                }
            }

            // 3. Update Variants
            if (productData.variants) {
                // For proper upsert, we should use 'id' if it exists. 
                // Since this might cause issues if variant IDs are missing from client, 
                // an alternative is to delete variants NOT in the new list, and upsert the rest.
                // For simplicity matching the existing flow but safer:

                // Get current variants to find which ones to delete
                const currentVariantsIds = productData.variants.filter((v: { id?: string }) => v.id).map((v: { id?: string }) => v.id as string);

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
                    const variantsToUpsert = productData.variants.map((v: { id?: string; variant_name: string; price_override?: number; stock_quantity?: number }) => ({
                        ...(v.id ? { id: v.id } : {}), // include id for upsert if we have it
                        product_id: productId,
                        variant_name: v.variant_name,
                        price_override: v.price_override,
                        stock_quantity: v.stock_quantity
                    }));

                    const { error: variantsError } = await supabase
                        .from('product_variants')
                        .upsert(variantsToUpsert, { onConflict: 'id' });

                    if (variantsError) {
                        console.error('Error upserting variants:', variantsError);
                        const { data: { user: varUser } } = await supabase.auth.getUser();
                        logAlert({
                            type: 'VARIANT_UPSERT_FAILED',
                            severity: 'critical',
                            title: 'Variant Update Failed',
                            message: `Product variants could not be saved. ${variantsError.message}`,
                            seller_id: varUser?.id,
                            metadata: { operation_type: 'variant_upsert', resource_id: productId, error_code: variantsError.code || 'VARIANT_ERROR' }
                        });
                    }
                }
            }

            // 4. Update Media (Delete existing and batch insert new state for atomicity/consistency)
            const { error: deleteMediaError } = await supabase
                .from('product_media')
                .delete()
                .eq('product_id', productId);

            if (deleteMediaError) {
                console.error('Error clearing old media:', deleteMediaError);
                const { data: { user: mediaUser } } = await supabase.auth.getUser();
                logAlert({
                    type: 'MEDIA_CLEAR_FAILED',
                    severity: 'critical',
                    title: 'Media Cleanup Failed',
                    message: `Old product images could not be cleared. ${deleteMediaError.message}`,
                    seller_id: mediaUser?.id,
                    metadata: { operation_type: 'media_delete', resource_id: productId, error_code: deleteMediaError.code || 'MEDIA_ERROR' }
                });
            }

            if (productData.images && productData.images.length > 0) {
                const mediaBatch = productData.images.map((url, index) => ({
                    product_id: productId,
                    file_url: url,
                    sort_order: index,
                    is_primary: index === 0,
                    media_type: 'image'
                }));

                const { error: insertMediaError } = await supabase
                    .from('product_media')
                    .insert(mediaBatch);

                if (insertMediaError) {
                    console.error('Error inserting new media:', insertMediaError);
                    const { data: { user: imgUser } } = await supabase.auth.getUser();
                    logAlert({
                        type: 'MEDIA_INSERT_FAILED',
                        severity: 'critical',
                        title: 'Image Upload Failed',
                        message: `New product images could not be saved. ${insertMediaError.message}`,
                        seller_id: imgUser?.id,
                        metadata: { operation_type: 'media_insert', resource_id: productId, error_code: insertMediaError.code || 'MEDIA_ERROR' }
                    });
                }
            }

            fetchProducts();
            setIsModalOpen(false);

            // Real-time Sync: Broadcast update to storefronts
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user?.id) {
                const channel = supabase.channel(`seller:${session.user.id}`);
                await channel.subscribe(async (status) => {
                    if (status === 'SUBSCRIBED') {
                        await channel.send({
                            type: 'broadcast',
                            event: 'product_update',
                            payload: { productId, action: 'save' }
                        });
                        setTimeout(() => channel.unsubscribe(), 2000);
                    }
                });
            }
        } catch (error: any) {
            console.error('Error saving:', error);
            const { data: { user: saveUser } } = await supabase.auth.getUser();
            logAlert({
                type: 'PRODUCT_SAVE_FAILED',
                severity: 'critical',
                title: 'Product Save Failed',
                message: `Failed to save product changes. ${error?.message || 'Unknown error'}`,
                seller_id: saveUser?.id,
                metadata: {
                    operation_type: 'product_save',
                    resource_id: editingProduct?.id,
                    error_code: error?.code || 'SAVE_ERROR'
                }
            });
        }
    };

    const handleBulkEditSave = async ({ category, newImageFile }: { category?: string[]; newImageFile?: File }) => {
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
                const bulkUUID = (typeof crypto !== 'undefined' && crypto.randomUUID)
                    ? crypto.randomUUID()
                    : `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
                const fileName = `bulk-shared/${bulkUUID}.${fileExt}`;
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
                if (dbError) {
                    console.error('Error inserting bulk product media:', dbError);
                    const { data: { user: bulkUser } } = await supabase.auth.getUser();
                    logAlert({
                        type: 'BULK_MEDIA_INSERT_FAILED',
                        severity: 'critical',
                        title: 'Bulk Image Upload Failed',
                        message: `Could not attach images to ${selectedIds.length} products. ${dbError.message}`,
                        seller_id: bulkUser?.id,
                        metadata: { operation_type: 'bulk_media_insert', error_code: dbError.code || 'BULK_MEDIA_ERROR' }
                    });
                }
            }

            fetchProducts();
            setSelectedIds([]);
        } catch (error: any) {
            console.error('Bulk edit failed:', error);
            const { data: { user: editUser } } = await supabase.auth.getUser();
            logAlert({
                type: 'BULK_EDIT_FAILED',
                severity: 'critical',
                title: 'Bulk Edit Failed',
                message: `Bulk edit operation failed for ${selectedIds.length} products. ${error?.message || 'Unknown error'}`,
                seller_id: editUser?.id,
                metadata: {
                    operation_type: 'bulk_edit',
                    error_code: error?.code || 'BULK_EDIT_ERROR',
                    affected_count: selectedIds.length
                }
            });
            throw error; // Re-throw to be caught by BulkEditModal
        }
    };

    const handleBulkAction = async (action: string) => {
        if (selectedIds.length === 0) return;

        try {
            switch (action) {
                case 'delete': {
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
                        const deletedIds = [...selectedIds];
                        setSelectedIds([]);

                        // Real-time Sync: Broadcast bulk update to storefronts
                        if (user) {
                            const channel = supabase.channel(`seller:${user.id}`);
                            await channel.subscribe(async (status) => {
                                if (status === 'SUBSCRIBED') {
                                    await channel.send({
                                        type: 'broadcast',
                                        event: 'product_update',
                                        payload: { productIds: deletedIds, action: 'bulk_delete' }
                                    });
                                    setTimeout(() => channel.unsubscribe(), 2000);
                                }
                            });
                        }
                    }
                    break;
                }

                case 'edit':
                    setIsBulkEditModalOpen(true);
                    break;

                case 'status':
                case 'archive': {
                    const activate = action === 'status';

                    if (activate && !seller?.razorpay_account_id) {
                        const { data: { user: rpUser } } = await supabase.auth.getUser();
                        logAlert({
                            type: 'RAZORPAY_NOT_LINKED',
                            severity: 'warning',
                            title: 'Payment Account Required',
                            message: 'You must link your Razorpay account in Billing before publishing products.',
                            seller_id: rpUser?.id,
                            metadata: { operation_type: 'bulk_publish', error_code: 'NO_RAZORPAY' },
                            action: {
                                type: 'LINK_RAZORPAY',
                                payload: { redirect: '/dashboard?tab=settings' }
                            }
                        });
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
                }

                case 'export': {
                    const selectedProducts = products.filter(p => selectedIds.includes(p.id));
                    const headers = ['ID', 'Name', 'Category', 'Price', 'Stock', 'Status'];
                    const csvContent = [
                        headers.join(','),
                        ...selectedProducts.map(p => [
                            p.id,
                            `"${p.name}"`,
                            p.category && p.category.length > 0 ? `"${p.category.join(', ')}"` : 'Uncategorized',
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
                }

                default:
                    console.warn('Unknown bulk action:', action);
            }
        } catch (error: any) {
            console.error('Bulk action failed:', error);
            const { data: { user: actionUser } } = await supabase.auth.getUser();
            logAlert({
                type: 'BULK_ACTION_FAILED',
                severity: 'critical',
                title: 'Bulk Action Failed',
                message: `Bulk ${action} failed for ${selectedIds.length} products. ${error?.message || 'Unknown error'}`,
                seller_id: actionUser?.id,
                metadata: {
                    operation_type: `bulk_${action}`,
                    error_code: error?.code || 'BULK_ACTION_ERROR',
                    affected_count: selectedIds.length
                }
            });
        }
    };

    return (
        <div className="flex flex-col gap-6 animate-[fadeIn_0.5s_ease-out]">
            {/* Main Content (Table) */}
            <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">

                {/* Actions Row - Title is in Global Header, but we add Product Count here */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                    <div className="flex items-baseline gap-3">
                        <h2 className="text-2xl font-bold text-text">Products</h2>
                        <span className="text-lg text-muted">({products.length})</span>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        {searchTerm && (
                            <span className="text-xs text-muted italic hidden sm:inline">
                                Showing results for "{searchTerm}"
                            </span>
                        )}
                        <div className="relative">
                            <button
                                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                                className={`p-2.5 rounded-xl border transition-all flex items-center gap-2 ${showFilterDropdown || statusFilter !== 'all' || categoryFilters.length > 0 || stockFilter !== 'all' ? 'bg-chart-line/10 border-chart-line text-chart-line shadow-sm' : 'bg-panel border-muted/20 text-muted hover:text-text hover:border-chart-line'}`}
                                title="Filter Products"
                            >
                                <Filter size={20} />
                                {(statusFilter !== 'all' || categoryFilters.length > 0 || stockFilter !== 'all') && (
                                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-bg"></span>
                                )}
                            </button>

                            {/* Dropdown UI */}
                            {showFilterDropdown && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setShowFilterDropdown(false)} />
                                    <div className="absolute right-0 top-full mt-2 w-72 bg-panel border border-muted/20 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 p-5 flex flex-col gap-5">
                                        <div className="flex justify-between items-center pb-3 border-b border-muted/10">
                                            <h3 className="font-bold text-sm text-text">Filters</h3>
                                            {(statusFilter !== 'all' || categoryFilters.length > 0 || stockFilter !== 'all') && (
                                                <button onClick={() => { setStatusFilter('all'); setCategoryFilters([]); setStockFilter('all'); setShowFilterDropdown(false); }} className="text-xs text-red-500 hover:text-red-400 font-medium">Clear All</button>
                                            )}
                                        </div>

                                        {/* Status */}
                                        <div className="flex flex-col gap-2">
                                            <span className="text-xs font-semibold text-muted uppercase tracking-wider">Status</span>
                                            <select 
                                                title="Filter by status"
                                                value={statusFilter} 
                                                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                                                className="w-full bg-bg border border-muted/20 rounded-lg p-2.5 text-sm text-text outline-none focus:border-chart-line cursor-pointer"
                                            >
                                                <option value="all">All Statuses</option>
                                                <option value="published">Published</option>
                                                <option value="draft">Draft</option>
                                            </select>
                                        </div>

                                        {/* Stock Level */}
                                        <div className="flex flex-col gap-2">
                                            <span className="text-xs font-semibold text-muted uppercase tracking-wider">Stock Level</span>
                                            <select 
                                                title="Filter by stock level"
                                                value={stockFilter} 
                                                onChange={(e) => setStockFilter(e.target.value as typeof stockFilter)}
                                                className="w-full bg-bg border border-muted/20 rounded-lg p-2.5 text-sm text-text outline-none focus:border-chart-line cursor-pointer"
                                            >
                                                <option value="all">All Levels</option>
                                                <option value="in_stock">In Stock (&gt;5)</option>
                                                <option value="low_stock">Low Stock (1-5)</option>
                                                <option value="out_of_stock">Out of Stock (0)</option>
                                            </select>
                                        </div>

                                        {/* Demo Products Checkbox */}
                                        <div className="flex flex-col gap-2 pt-2 border-t border-muted/10">
                                            <label className="flex items-center gap-3 p-2 hover:bg-bg/50 rounded-lg cursor-pointer group transition-colors">
                                                <input 
                                                    type="checkbox" 
                                                    className="hidden" 
                                                    checked={hideDemoProducts}
                                                    onChange={(e) => setHideDemoProducts(e.target.checked)}
                                                />
                                                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shadow-sm ${hideDemoProducts ? 'bg-chart-line border-chart-line text-white' : 'bg-bg border-muted/30 group-hover:border-chart-line/50'}`}>
                                                    {hideDemoProducts && <Check size={12} strokeWidth={3} />}
                                                </div>
                                                <span className="text-sm font-medium text-text select-none group-hover:text-chart-line transition-colors text-nowrap">Hide Empty/Demo Products</span>
                                            </label>
                                        </div>

                                        {/* Categories */}
                                        {uniqueCategories.length > 0 && (
                                            <div className="flex flex-col gap-2">
                                                <span className="text-xs font-semibold text-muted uppercase tracking-wider">Categories</span>
                                                <div className="max-h-40 overflow-y-auto pr-1 flex flex-col gap-1 custom-scrollbar">
                                                    {uniqueCategories.map(cat => (
                                                        <label key={cat} className="flex items-center gap-3 p-2 hover:bg-bg/50 rounded-lg cursor-pointer group transition-colors">
                                                            <input type="checkbox" className="hidden" 
                                                                checked={categoryFilters.includes(cat)}
                                                                onChange={(e) => {
                                                                    if (e.target.checked) setCategoryFilters([...categoryFilters, cat]);
                                                                    else setCategoryFilters(categoryFilters.filter(c => c !== cat));
                                                                }}
                                                            />
                                                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shadow-sm ${categoryFilters.includes(cat) ? 'bg-chart-line border-chart-line text-white' : 'bg-bg border-muted/30 group-hover:border-chart-line/50'}`}>
                                                                {categoryFilters.includes(cat) && <Check size={12} strokeWidth={3} />}
                                                            </div>
                                                            <span className="text-sm text-text select-none text-nowrap truncate group-hover:text-chart-line transition-colors">{cat}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                        <button
                            onClick={async () => {
                                if (confirm('This will add sample products to your database using Supabase. Continue?')) {
                                    try {
                                        const { seedDatabase } = await import('../lib/seedData');
                                        await seedDatabase();
                                        fetchProducts();
                                        alert('Demo data generated successfully!');
                                    } catch (err: unknown) {
                                        const e = err as { message?: string };
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
                        onDelete={handleDelete}
                    />
                </div>

            </div>

            {/* Right Context Panel (Collapsible ideally, fixed for now) */}
                <div className="w-[320px] flex-shrink-0 hidden xl:flex flex-col border-l border-muted/10 pl-6">
                    <ProductSidePanel products={products.filter(p => {
                        const name = (p.name || '').toLowerCase();
                        if (name === 'new product' || !name) {
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
                existingCategories={uniqueCategories}
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
