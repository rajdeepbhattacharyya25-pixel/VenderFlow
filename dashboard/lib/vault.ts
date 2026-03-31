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
import { reportError } from '../../hooks/useSystemAlert';

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

    try {
        // ── Step 1: Hash ──
        const contentHash = await generateFileHash(file);

        // ── Step 2: Deduplication Check ──
        const { data: existing, error: fetchError } = await supabase
            .from('product_media')
            .select('*')
            .eq('content_hash', contentHash)
            .limit(1)
            .maybeSingle();

        if (fetchError) {
            console.error('Vault: Error fetching duplicate:', fetchError);
            throw new Error(`Database error during deduplication: ${fetchError.message}`);
        }

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
            
            // crypto.randomUUID() fallback for non-secure contexts
            const uuid = (typeof crypto !== 'undefined' && crypto.randomUUID) 
                ? crypto.randomUUID() 
                : `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
                
            const fileName = `${productId}/${uuid}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from(BUCKET_NAME)
                .upload(fileName, file);

            if (uploadError) {
                console.error('Vault: Storage upload failed:', uploadError);
                throw uploadError;
            }

            const { data: { publicUrl: url } } = supabase.storage
                .from(BUCKET_NAME)
                .getPublicUrl(fileName);

            publicUrl = url;
            provider = 'supabase';
        } else {
            // Regular images → ImgBB (free CDN)
            // On failure, automatically falls back to Supabase Storage
            // and reports a degraded-mode alert to admin.
            try {
                publicUrl = await uploadToImgBB(file);
                provider = 'imgbb';
            } catch (imgbbErr: unknown) {
                const imgbbError = imgbbErr as { message?: string };
                console.warn('Vault: ImgBB failed, falling back to Supabase Storage:', imgbbError);

                // Report to dashboard banner + Telegram (debounced)
                reportError(
                    'IMGBB_FAILURE',
                    `ImgBB rejected the upload: "${imgbbError.message}". Falling back to Supabase Storage. Check your VITE_IMGBB_API_KEY in Vercel settings.`,
                    { file_name: file.name, provider: 'imgbb→supabase', error: imgbbError.message }
                );

                // Fallback: upload to Supabase Storage instead
                const fileExt = file.name.split('.').pop() || 'jpg';
                const uuid = (typeof crypto !== 'undefined' && crypto.randomUUID)
                    ? crypto.randomUUID()
                    : `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
                const fallbackFileName = `${productId}/fallback-${uuid}.${fileExt}`;

                const { error: fallbackError } = await supabase.storage
                    .from(BUCKET_NAME)
                    .upload(fallbackFileName, file);

                if (fallbackError) {
                    // Both providers failed — report total upload failure
                    reportError(
                        'UPLOAD_FAILURE',
                        `Upload failed on all providers for "${file.name}". ImgBB error: ${imgbbError.message}. Supabase error: ${fallbackError.message}`,
                        { file_name: file.name, provider: 'all-failed' }
                    );
                    throw new Error(`All upload providers failed. ${fallbackError.message}`);
                }

                const { data: { publicUrl: fallbackUrl } } = supabase.storage
                    .from(BUCKET_NAME)
                    .getPublicUrl(fallbackFileName);

                publicUrl = fallbackUrl;
                provider = 'supabase';
            }
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

        if (dbError) {
            console.error('Vault: Error saving media record:', dbError);
            throw dbError;
        }

        return {
            url: publicUrl,
            isDuplicate: false,
            provider,
            mediaRecord: mediaData,
        };
    } catch (err: unknown) {
        console.error('Vault: Unified upload critical failure:', err);
        throw err;
    }
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
