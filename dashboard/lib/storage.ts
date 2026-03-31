
import { supabase } from '../../lib/supabase';
import { ProductMedia } from '../types';

const BUCKET_NAME = 'products-images';

import { generateFileHash } from './vault-utils';

export async function uploadProductImage(
    file: File,
    productId: string,
    isPrimary: boolean = false,
    mediaType: 'image' | 'video' = 'image',
    variantValue?: string
): Promise<{ data: ProductMedia | null; error: Error | null; isDuplicate?: boolean }> {
    try {
        // 1. Generate Hash
        const contentHash = await generateFileHash(file);

        // 2. Check for Duplicate (Global)
        const { data: existingMedia } = await supabase
            .from('product_media')
            .select('*')
            .eq('content_hash', contentHash)
            .limit(1)
            .maybeSingle();

        if (existingMedia) {
            console.log("Duplicate media detected, reusing existing URL");
            
            // Still insert for the current product, but use existing URL
            const { data: mediaData, error: dbError } = await supabase
                .from('product_media')
                .insert({
                    product_id: productId,
                    file_url: existingMedia.file_url,
                    content_hash: contentHash,
                    is_primary: isPrimary,
                    sort_order: 0
                })
                .select()
                .single();

            if (dbError) throw dbError;
            return { data: mediaData, error: null, isDuplicate: true };
        }

        const fileExt = file.name.split('.').pop();
        const uuid = (typeof crypto !== 'undefined' && crypto.randomUUID) 
            ? crypto.randomUUID() 
            : `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
        const fileName = `${productId}/${uuid}.${fileExt}`;

        // 3. Upload to Storage
        const { error: uploadError } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(fileName, file);

        if (uploadError) throw uploadError;

        // 4. Get Public URL
        const { data: { publicUrl } } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(fileName);

        // 5. Insert Record into DB
        const { data: mediaData, error: dbError } = await supabase
            .from('product_media')
            .insert({
                product_id: productId,
                file_url: publicUrl,
                content_hash: contentHash,
                is_primary: isPrimary,
                sort_order: 0
            })
            .select()
            .single();

        if (dbError) throw dbError;

        return { data: mediaData, error: null, isDuplicate: false };
    } catch (error: any) {
        console.error(`Error uploading ${mediaType}:`, error);
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
