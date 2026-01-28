
import { supabase } from '../../lib/supabase';

const CATEGORIES = ['Clothing', 'Accessories', 'Home', 'Beauty', 'Electronics', 'Sports'];
const ADJECTIVES = ['Premium', 'Classic', 'Modern', 'Sleek', 'Durable', 'Elegant', 'Essential', 'Handcrafted'];
const NOUNS = ['T-Shirt', 'Hoodie', 'Watch', 'Lamp', 'Serum', 'Backpack', 'Sneakers', 'Wallet', 'Bottle'];
const IMAGES = [
    'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1572635196237-14b3f281503f?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1542219550-30d41809122a?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80'
];

export const seedDatabase = async () => {
    try {
        console.log('Starting seed...');

        // Create 10 products
        const productsToCreate = Array.from({ length: 10 }).map((_, i) => {
            const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
            const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
            const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
            return {
                name: `${adj} ${noun} ${i + 1}`,
                description: `This is a high-quality ${noun.toLowerCase()} perfect for your daily needs. Features durable materials and a stylish design.`,
                category: category.toLowerCase(),
                price: Math.floor(Math.random() * 5000) + 500, // 500 to 5500 INR
                is_active: true,
                has_variants: Math.random() > 0.5,
                discount_price: Math.random() > 0.7 ? Math.floor(Math.random() * 400) + 100 : null
            };
        });

        // Insert Products
        const { data: insertedProducts, error: prodError } = await supabase
            .from('products')
            .insert(productsToCreate)
            .select();

        if (prodError || !insertedProducts) throw prodError || new Error('No products inserted');

        console.log(`Inserted ${insertedProducts.length} products`);

        // Insert Related Data
        for (const product of insertedProducts) {
            // Stock
            await supabase.from('product_stock').upsert({
                product_id: product.id,
                stock_quantity: Math.floor(Math.random() * 100),
                track_stock: true,
                low_stock_threshold: 10
            });

            // Images (1-3 images)
            const numImages = Math.floor(Math.random() * 3) + 1;
            for (let j = 0; j < numImages; j++) {
                await supabase.from('product_media').insert({
                    product_id: product.id,
                    file_url: IMAGES[Math.floor(Math.random() * IMAGES.length)],
                    is_primary: j === 0,
                    sort_order: j
                });
            }

            // Variants (if has_variants)
            if (product.has_variants) {
                const variants = ['Small', 'Medium', 'Large'].map(size => ({
                    product_id: product.id,
                    variant_name: `Size: ${size}`,
                    price_override: null,
                    stock_quantity: Math.floor(Math.random() * 20),
                    created_at: new Date().toISOString()
                }));
                await supabase.from('product_variants').insert(variants);
            }
        }

        console.log('Seeding complete!');
    } catch (error) {
        console.error('Seeding failed:', error);
        throw error;
    }
};
