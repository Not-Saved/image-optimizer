type ImageLoader = (p: ImageLoaderProps) => string;
type ImageLoaderProps = {
    src: string;
    width: number;
    quality?: number;
};
type ImageConfigComplete = {
    deviceSizes: number[];
    imageSizes: number[];
    remotePatterns: RemotePattern[];
    localPatterns?: LocalPattern[];
    path: string;
    unoptimized: boolean;
    formats?: string[];
};
type ImageConfig = Partial<ImageConfigComplete>;
type LocalPattern = {
    /**
     * Can be literal or wildcard.
     * Single `*` matches a single path segment.
     * Double `**` matches any number of path segments.
     */
    pathname?: string;
    /**
     * Can be literal query string such as `?v=1` or
     * empty string meaning no query string.
     */
    search?: string;
};
type RemotePattern = {
    /**
     * Must be `http` or `https`.
     */
    protocol?: "http" | "https";
    /**
     * Can be literal or wildcard.
     * Single `*` matches a single subdomain.
     * Double `**` matches any number of subdomains.
     */
    hostname: string;
    /**
     * Can be literal port such as `8080` or empty string
     * meaning no port.
     */
    port?: string;
    /**
     * Can be literal or wildcard.
     * Single `*` matches a single path segment.
     * Double `**` matches any number of path segments.
     */
    pathname?: string;
    /**
     * Can be literal query string such as `?v=1` or
     * empty string meaning no query string.
     */
    search?: string;
};
declare const imageConfigDefault: ImageConfig;

export { type ImageConfig, type ImageConfigComplete, type ImageLoader, type ImageLoaderProps, type LocalPattern, type RemotePattern, imageConfigDefault };
