import { join } from "node:path";
import { BLUR_IMG_SIZE, CACHE_VERSION } from "../constants";
import { getHash } from "../utils/getHash";
import { getSupportedMimeType } from "../utils/getSupportedMimeType";
import { promises } from "node:fs";

export class ImageOptimizerCache {
  private cacheDir: string;

  static validateParams(
    acceptHeader: string,
    query: {
      url: string;
      w: string;
      q: string;
    },
    isDev: boolean
  ):
    | {
        quality: number;
        width: number;
        mimeType: string;
        href: string;
        sizes: number[];
        isAbsolute: boolean;
        isStatic: boolean;
        minimumCacheTTL: number;
      }
    | { errorMessage: string } {
    const imageData = {
      deviceSizes: [],
      imageSizes: [],
      domains: [],
      minimumCacheTTL: 60,
      formats: ["image/webp"],
    };
    const {
      deviceSizes = [],
      imageSizes = [],
      domains = [],
      minimumCacheTTL = 60,
      formats = ["image/webp"],
    } = imageData;
    const remotePatterns: any[] = [];
    const localPatterns: any[] = [];
    const { url, w, q } = query;
    let href: string;

    if (!url) {
      return { errorMessage: '"url" parameter is required' };
    } else if (Array.isArray(url)) {
      return { errorMessage: '"url" parameter cannot be an array' };
    }

    if (url.length > 3072) {
      return { errorMessage: '"url" parameter is too long' };
    }

    if (url.startsWith("//")) {
      return {
        errorMessage: '"url" parameter cannot be a protocol-relative URL (//)',
      };
    }

    let isAbsolute: boolean;

    if (url.startsWith("/")) {
      href = url;
      isAbsolute = false;
      /* if (
          /\/_next\/image($|\/)/.test(
            decodeURIComponent(parseUrl(url)?.pathname ?? "")
          )
        ) {
          return {
            errorMessage: '"url" parameter cannot be recursive',
          };
        }
        if (!hasLocalMatch(localPatterns, url)) {
          return { errorMessage: '"url" parameter is not allowed' };
        } */
    } else {
      let hrefParsed: URL;

      try {
        hrefParsed = new URL(url);
        href = hrefParsed.toString();
        isAbsolute = true;
      } catch (_error) {
        return { errorMessage: '"url" parameter is invalid' };
      }

      if (!["http:", "https:"].includes(hrefParsed.protocol)) {
        return { errorMessage: '"url" parameter is invalid' };
      }

      /* if (!hasRemoteMatch(domains, remotePatterns, hrefParsed)) {
          return { errorMessage: '"url" parameter is not allowed' };
        } */
    }

    if (!w) {
      return { errorMessage: '"w" parameter (width) is required' };
    } else if (Array.isArray(w)) {
      return { errorMessage: '"w" parameter (width) cannot be an array' };
    } else if (!/^[0-9]+$/.test(w)) {
      return {
        errorMessage: '"w" parameter (width) must be an integer greater than 0',
      };
    }

    if (!q) {
      return { errorMessage: '"q" parameter (quality) is required' };
    } else if (Array.isArray(q)) {
      return { errorMessage: '"q" parameter (quality) cannot be an array' };
    } else if (!/^[0-9]+$/.test(q)) {
      return {
        errorMessage:
          '"q" parameter (quality) must be an integer between 1 and 100',
      };
    }

    const width = parseInt(w, 10);

    if (width <= 0 || isNaN(width)) {
      return {
        errorMessage: '"w" parameter (width) must be an integer greater than 0',
      };
    }

    const sizes: number[] = [...(deviceSizes || []), ...(imageSizes || [])];

    const isValidSize =
      sizes.includes(width) || (isDev && width <= BLUR_IMG_SIZE);

    if (!isValidSize) {
      return {
        errorMessage: `"w" parameter (width) of ${width} is not allowed`,
      };
    }

    const quality = parseInt(q, 10);

    if (isNaN(quality) || quality < 1 || quality > 100) {
      return {
        errorMessage:
          '"q" parameter (quality) must be an integer between 1 and 100',
      };
    }

    const mimeType = getSupportedMimeType(formats || [], acceptHeader);

    const isStatic = false;

    return {
      href,
      sizes,
      isAbsolute,
      isStatic,
      width,
      quality,
      mimeType,
      minimumCacheTTL,
    };
  }

  static getCacheKey({
    href,
    width,
    quality,
    mimeType,
  }: {
    href: string;
    width: number;
    quality: number;
    mimeType: string;
  }): string {
    return getHash([CACHE_VERSION, href, width, quality, mimeType]);
  }

  constructor({ distDir }: { distDir: string }) {
    this.cacheDir = join(distDir, "cache", "images");
  }

  async get(cacheKey: string): Promise<IncrementalCacheEntry | null> {
    try {
      const cacheDir = join(this.cacheDir, cacheKey);
      const files = await promises.readdir(cacheDir);
      const now = Date.now();

      for (const file of files) {
        const [maxAgeSt, expireAtSt, etag, upstreamEtag, extension] =
          file.split(".", 5);
        const buffer = await promises.readFile(join(cacheDir, file));
        const expireAt = Number(expireAtSt);
        const maxAge = Number(maxAgeSt);

        return {
          value: {
            etag,
            buffer,
            extension,
            upstreamEtag,
          },
          revalidateAfter: Math.max(maxAge) * 1000 + Date.now(),
          curRevalidate: maxAge,
          isStale: now > expireAt,
          isFallback: false,
        };
      }
    } catch (_) {
      // failed to read from cache dir, treat as cache miss
    }
    return null;
  }
  async set(
    cacheKey: string,
    value: IncrementalCacheValue,
    {
      revalidate,
    }: {
      revalidate?: number | false;
    }
  ) {
    if (typeof revalidate !== "number") {
      throw new Error("invariant revalidate must be a number for image-cache");
    }
    const expireAt = Math.max(revalidate) * 1000 + Date.now();

    try {
      await writeToCacheDir(
        join(this.cacheDir, cacheKey),
        value.extension,
        revalidate,
        expireAt,
        value.buffer,
        value.etag,
        value.upstreamEtag
      );
    } catch (err) {
      console.error(`Failed to write image to cache ${cacheKey}`, err);
    }
  }
}

async function writeToCacheDir(
  dir: string,
  extension: string,
  maxAge: number,
  expireAt: number,
  buffer: Buffer,
  etag: string,
  upstreamEtag: string
) {
  const filename = join(
    dir,
    `${maxAge}.${expireAt}.${etag}.${upstreamEtag}.${extension}`
  );

  await promises.rm(dir, { recursive: true, force: true }).catch(() => {});

  await promises.mkdir(dir, { recursive: true });
  await promises.writeFile(filename, buffer);
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
