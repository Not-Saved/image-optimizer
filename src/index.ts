export type ImageLoader = (p: ImageLoaderProps) => string;

export type ImageLoaderProps = {
  src: string;
  width: number;
  quality?: number;
};

export type ImageConfigComplete = {
  deviceSizes: number[];
  imageSizes: number[];
  remotePatterns: RemotePattern[];
  localPatterns?: LocalPattern[];
  path: string;
  unoptimized: boolean;
  formats?: string[];
};

export type ImageConfig = Partial<ImageConfigComplete>;

export type LocalPattern = {
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

export type RemotePattern = {
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

export const imageConfigDefault: ImageConfig = {
  deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
  imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  path: "/api/image",
  unoptimized: false,
  formats: ["image/webp"],
};
