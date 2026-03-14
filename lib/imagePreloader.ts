export interface PreloadOptions {
    frameCount: number;
    framePathPrefix: string; // e.g., "/frames/frame_"
    framePathSuffix: string; // e.g., ".jpg"
    padLength: number;       // e.g., 4
    initialBatchSize?: number;
    sparseSkip?: number;
}

export class ImagePreloader {
    private cache: Map<number, HTMLImageElement> = new Map();
    private loadQueue: Set<number> = new Set();
    private loading: Set<number> = new Set();
    private failed: Set<number> = new Set();

    private options: PreloadOptions;

    constructor(options: PreloadOptions) {
        this.options = {
            initialBatchSize: 20,
            sparseSkip: 10,
            ...options
        };
    }

    // Helper to format frame path
    private getFramePath(index: number): string {
        const paddedIndex = index.toString().padStart(this.options.padLength, '0');
        return `${this.options.framePathPrefix}${paddedIndex}${this.options.framePathSuffix}`;
    }

    // Load a single frame and decode it
    private async loadFrame(index: number): Promise<HTMLImageElement | null> {
        if (this.cache.has(index)) return this.cache.get(index)!;
        if (this.failed.has(index)) return null;

        return new Promise((resolve) => {
            this.loading.add(index);
            const img = new Image();
            img.src = this.getFramePath(index);

            img.decode().then(() => {
                this.cache.set(index, img);
                this.loading.delete(index);
                this.loadQueue.delete(index);
                resolve(img);
            }).catch((err) => {
                console.warn(`Failed to decode frame ${index}:`, err);
                // Fallback: wait for load event
                img.onload = () => {
                    this.cache.set(index, img);
                    this.loading.delete(index);
                    this.loadQueue.delete(index);
                    resolve(img);
                };
                img.onerror = () => {
                    this.failed.add(index);
                    this.loading.delete(index);
                    this.loadQueue.delete(index);
                    resolve(null);
                };
            });
        });
    }

    // Initialize loading sequence (sparse + initial batch)
    public async initialize(): Promise<void> {
        const promises: Promise<HTMLImageElement | null>[] = [];

        // Parse load: First frame is critical
        promises.push(this.loadFrame(1));

        // Sparse load for quick scrub availability
        for (let i = 1; i <= this.options.frameCount; i += this.options.sparseSkip!) {
            if (i !== 1) promises.push(this.loadFrame(i));
        }

        // Initial batch load
        for (let i = 2; i <= Math.min(this.options.frameCount, this.options.initialBatchSize!); i++) {
            promises.push(this.loadFrame(i));
        }

        await Promise.all(promises);
    }

    // Dynamically load frames near the current index
    // Should be called on scroll
    public preloadProximity(currentIndex: number, windowSize: number = 8) {
        const start = Math.max(1, currentIndex - windowSize);
        const end = Math.min(this.options.frameCount, currentIndex + windowSize);

        for (let i = start; i <= end; i++) {
            if (!this.cache.has(i) && !this.loading.has(i) && !this.failed.has(i)) {
                this.loadQueue.add(i);
                this.processQueue();
            }
        }
    }

    private isQueueProcessing = false;

    private async processQueue() {
        if (this.isQueueProcessing || this.loadQueue.size === 0) return;
        this.isQueueProcessing = true;

        // Process a few at a time to not block the main thread
        while (this.loadQueue.size > 0) {
            const batchedItems = Array.from(this.loadQueue).slice(0, 3);
            await Promise.all(batchedItems.map(i => this.loadFrame(i)));
            // Yield to main thread briefly
            await new Promise(resolve => setTimeout(resolve, 0));
        }

        this.isQueueProcessing = false;
    }

    public getFrame(index: number): HTMLImageElement | null {
        return this.cache.get(index) || null;
    }

    // Optionally trigger background loading of remaining frames
    public loadRemaining() {
        for (let i = 1; i <= this.options.frameCount; i++) {
            if (!this.cache.has(i) && !this.loading.has(i) && !this.failed.has(i)) {
                this.loadQueue.add(i);
            }
        }
        this.processQueue();
    }
}
