/**
 * Universal Vault — Cross-Provider Deduplication Middleware
 *
 * Central upload function that:
 * 1. Hashes the file (SHA-256)
 * 2. Checks the DB for an existing match
 * 3. If match found → reuses URL (skips upload entirely)
 * 4. If no match → routes to the correct provider (ImgBB for images, Supabase for videos)
 * 5. Saves the hash + URL to `product_media`
 */

import { supabase } from '../../lib/supabase';
import { generateFileHash } from './vault-utils';
import { uploadToImgBB } from './imgbb';
import { ProductMedia } from '../types';

const BUCKET_NAME = 'products-images';

export interface VaultUploadResult {
    url: string;
    isDuplicate: boolean;
    provider: 'imgbb' | 'supabase' | 'reused';
    mediaRecord: ProductMedia | null;
}

interface VaultUploadOptions {
    file: File;
    productId: string;
    isPrimary?: boolean;
    mediaType?: 'image' | 'video';
    variantValue?: string;
}

/**
 * Unified upload with cross-provider deduplication.
 *
 * Flow:
 *   hash file → check DB → reuse OR upload → save record
 */
export async function unifiedUpload(opts: VaultUploadOptions): Promise<VaultUploadResult> {
    const {
        file,
        productId,
        isPrimary = false,
        mediaType = 'image',
        variantValue,
    } = opts;

    // ── Step 1: Hash ──
    const contentHash = await generateFileHash(file);

    // ── Step 2: Deduplication Check ──
    const { data: existing } = await supabase
        .from('product_media')
        .select('*')
        .eq('content_hash', contentHash)
        .limit(1)
        .maybeSingle();

    if (existing) {
        // Reuse existing URL — create a new media record pointing to the same asset
        const { data: mediaData, error: dbError } = await supabase
            .from('product_media')
            .insert({
                product_id: productId,
                file_url: existing.file_url,
                content_hash: contentHash,
                is_primary: isPrimary,
                media_type: mediaType,
                variant_value: variantValue ?? null,
                sort_order: 0,
            })
            .select()
            .single();

        if (dbError) throw dbError;

        return {
            url: existing.file_url,
            isDuplicate: true,
            provider: 'reused',
            mediaRecord: mediaData,
        };
    }

    // ── Step 3: Route to Provider ──
    let publicUrl: string;
    let provider: 'imgbb' | 'supabase';

    const useSupabase = mediaType === 'video';

    if (useSupabase) {
        // Videos and variant-specific images → Supabase Storage
        const fileExt = file.name.split('.').pop() || 'bin';
        const fileName = `${productId}/${crypto.randomUUID()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl: url } } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(fileName);

        publicUrl = url;
        provider = 'supabase';
    } else {
        // Regular images → ImgBB (free hosting)
        publicUrl = await uploadToImgBB(file);
        provider = 'imgbb';
    }

    // ── Step 4: Save Record ──
    const { data: mediaData, error: dbError } = await supabase
        .from('product_media')
        .insert({
            product_id: productId,
            file_url: publicUrl,
            content_hash: contentHash,
            is_primary: isPrimary,
            media_type: mediaType,
            variant_value: variantValue ?? null,
            sort_order: 0,
        })
        .select()
        .single();

    if (dbError) throw dbError;

    return {
        url: publicUrl,
        isDuplicate: false,
        provider,
        mediaRecord: mediaData,
    };
}

/**
 * Lightweight "check only" — returns existing URL if hash match, null otherwise.
 * Useful for pre-flight checks before showing upload progress.
 */
export async function checkDuplicate(file: File): Promise<string | null> {
    const hash = await generateFileHash(file);
    const { data } = await supabase
        .from('product_media')
        .select('file_url')
        .eq('content_hash', hash)
        .limit(1)
        .maybeSingle();

    return data?.file_url ?? null;
}
