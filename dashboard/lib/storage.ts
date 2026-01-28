
import { supabase } from '../../lib/supabase';
import { ProductMedia } from '../types';

const BUCKET_NAME = 'products-images';

export async function uploadProductImage(
    file: File,
    productId: string,
    isPrimary: boolean = false
): Promise<{ data: ProductMedia | null; error: Error | null }> {
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${productId}/${crypto.randomUUID()}.${fileExt}`;

        // 1. Upload to Storage
        const { error: uploadError } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(fileName, file);

        if (uploadError) throw uploadError;

        // 2. Get Public URL
        const { data: { publicUrl } } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(fileName);

        // 3. Insert Record into DB
        const { data: mediaData, error: dbError } = await supabase
            .from('product_media')
            .insert({
                product_id: productId,
                file_url: publicUrl,
                is_primary: isPrimary,
                sort_order: 0 // You might want to calculate this dynamically
            })
            .select() // important to return the object
            .single();

        if (dbError) throw dbError;

        return { data: mediaData, error: null };
    } catch (error: any) {
        console.error('Error uploading image:', error);
        return { data: null, error: error };
    }
}

export async function getProductMedia(productId: string): Promise<{ data: ProductMedia[] | null; error: Error | null }> {
    const { data, error } = await supabase
        .from('product_media')
        .select('*')
        .eq('product_id', productId)
        .order('sort_order', { ascending: true });

    return { data, error };
}

export async function deleteProductMedia(mediaId: string, fileUrl: string): Promise<{ error: Error | null }> {
    try {
        // 1. Delete from Storage (extract path from URL)
        // URL format: https://.../storage/v1/object/public/products-images/product_id/filename.ext
        const path = fileUrl.split(`${BUCKET_NAME}/`)[1];
        if (path) {
            const { error: storageError } = await supabase.storage
                .from(BUCKET_NAME)
                .remove([path]);
            if (storageError) console.warn("Storage delete error", storageError);
        }

        // 2. Delete from DB
        const { error: dbError } = await supabase
            .from('product_media')
            .delete()
            .eq('id', mediaId);

        return { error: dbError };

    } catch (error: any) {
        return { error };
    }
}

export async function setPrimaryImage(productId: string, mediaId: string): Promise<{ error: Error | null }> {
    // 1. Reset all others directly
    await supabase
        .from('product_media')
        .update({ is_primary: false })
        .eq('product_id', productId);

    // 2. Set new primary
    const { error } = await supabase
        .from('product_media')
        .update({ is_primary: true })
        .eq('id', mediaId);

    return { error };
}
