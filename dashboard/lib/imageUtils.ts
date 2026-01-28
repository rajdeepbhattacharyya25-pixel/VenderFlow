import imageCompression from 'browser-image-compression';

export interface CompressionResult {
    file: File;
    originalSize: number;
    compressedSize: number;
}

const MAX_IMAGE_SIZE_MB = 10;
const MAX_COMPRESSED_SIZE_MB = 2;
const MAX_VIDEO_SIZE_MB = 20;

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm'];

export async function compressImage(file: File): Promise<CompressionResult> {
    // 1. Validate File Type
    if (!ALLOWED_IMAGE_TYPES.includes(file.type) && !ALLOWED_VIDEO_TYPES.includes(file.type)) {
        throw new Error('Unsupported file type. Please upload JPG, PNG, WebP images or MP4/WebM videos.');
    }

    // 2. Handle Video (No Compression)
    if (file.type.startsWith('video/')) {
        if (file.size > MAX_VIDEO_SIZE_MB * 1024 * 1024) {
            throw new Error(`Video file too large. Max size is ${MAX_VIDEO_SIZE_MB}MB.`);
        }
        return {
            file,
            originalSize: file.size,
            compressedSize: file.size
        };
    }

    // 3. Handle Image Validation
    if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
        throw new Error(`Original image too large. Max size is ${MAX_IMAGE_SIZE_MB}MB.`);
    }

    // 4. Compress Image
    const options = {
        maxSizeMB: MAX_COMPRESSED_SIZE_MB,
        maxWidthOrHeight: 1600,
        useWebWorker: true,
        fileType: 'image/webp', // Convert everything to WebP for standardisation
        initialQuality: 0.75,
    };

    try {
        const compressedFile = await imageCompression(file, options);

        // Ensure final size check
        if (compressedFile.size > MAX_COMPRESSED_SIZE_MB * 1024 * 1024) {
            throw new Error(`Could not compress image below ${MAX_COMPRESSED_SIZE_MB}MB. Please try a smaller file.`);
        }

        return {
            file: compressedFile,
            originalSize: file.size,
            compressedSize: compressedFile.size
        };

    } catch (error) {
        console.error("Compression error:", error);
        throw error;
    }
}
