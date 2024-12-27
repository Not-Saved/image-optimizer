import { ImageConfigComplete } from './index.mjs';

interface ImageUpstream {
    buffer: Buffer;
    contentType: string | null | undefined;
    cacheControl: string | null | undefined;
}

declare function fetchExternalImage(href: string): Promise<ImageUpstream>;

declare class ImageOptimizerCache {
    private cacheDir;
    private promisesCache;
    static getCacheKey({ href, width, quality, mimeType, }: {
        href: string;
        width: number;
        quality: number;
        mimeType: string;
    }): string;
    constructor({ distDir }: {
        distDir: string;
    });
    get(cacheKey: string): Promise<IncrementalCacheEntry | null>;
    set(cacheKey: string, value: IncrementalCacheValue): Promise<IncrementalCacheEntry>;
}
type IncrementalCacheEntry = {
    value: IncrementalCacheValue;
    expireAt: number;
    isStale: boolean;
};
type IncrementalCacheValue = {
    extension: string;
    buffer: Buffer;
    maxAge: number;
};
declare function validateParams(acceptHeader: string, query: {
    url: string;
    w: string;
    q: string;
}, config: ImageConfigComplete, isDev?: boolean): {
    quality: number;
    width: number;
    mimeType: string;
    href: string;
    sizes: number[];
    isAbsolute: boolean;
    isStatic: boolean;
} | {
    errorMessage: string;
};

declare function imageOptimizer(imageUpstream: ImageUpstream, params: {
    quality: number;
    width: number;
    mimeType: string;
}): Promise<{
    buffer: Buffer;
    contentType: string;
    extension: string;
    maxAge: number;
    error?: unknown;
}>;

export { ImageOptimizerCache, type ImageUpstream, type IncrementalCacheEntry, type IncrementalCacheValue, fetchExternalImage, imageOptimizer, validateParams };
