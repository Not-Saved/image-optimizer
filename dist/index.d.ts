import sharp from 'sharp';

type SharpNamespace = typeof sharp;
interface ImageUpstream {
    buffer: Buffer;
    contentType: string | null | undefined;
    cacheControl: string | null | undefined;
}
declare function imageOptimizer(sharp: SharpNamespace, imageUpstream: ImageUpstream, params: {
    quality: number;
    width: number;
    mimeType: string;
}): Promise<{
    buffer: Buffer;
    contentType: string;
    maxAge: number;
    error?: unknown;
}>;
declare function fetchExternalImage(href: string): Promise<ImageUpstream>;
declare class ImageOptimizerCache {
    private cacheDir;
    static validateParams(acceptHeader: string, query: {
        url: string;
        w: string;
        q: string;
    }, isDev: boolean): {
        quality: number;
        width: number;
        mimeType: string;
        href: string;
        sizes: number[];
        isAbsolute: boolean;
        isStatic: boolean;
        minimumCacheTTL: number;
    } | {
        errorMessage: string;
    };
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
    set(cacheKey: string, value: IncrementalCacheValue, { revalidate, }: {
        revalidate?: number | false;
    }): Promise<void>;
}
type IncrementalCacheEntry = {
    value: {
        etag: string;
        buffer: Buffer;
        extension: string;
        upstreamEtag: string;
    };
    revalidateAfter: number;
    curRevalidate: number;
    isStale: boolean;
    isFallback: boolean;
};
type IncrementalCacheValue = {
    extension: string;
    buffer: Buffer;
    etag: string;
    upstreamEtag: string;
};

export { ImageOptimizerCache, fetchExternalImage, imageOptimizer };
