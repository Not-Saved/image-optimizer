import { join } from "node:path";
import { BLUR_IMG_SIZE, CACHE_VERSION } from "../constants/constants";
import { getHash } from "../utils/getHash";
import { getSupportedMimeType } from "../utils/getSupportedMimeType";
import { promises } from "node:fs";
import { hasLocalMatch } from "../utils/hasLocalMatch";
import { hasRemoteMatch } from "../utils/hasRemoteMatch";
import { ImageConfigComplete } from "../..";

export class ImageOptimizerCache {
  private cacheDir: string;
  private promisesCache: Map<string, Promise<IncrementalCacheValue | null>> =
    new Map();

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
        const [maxAgeSt, expireAtSt, /* etag, upstreamEtag, */ extension] =
          file.split(".", 5);
        const buffer = await promises.readFile(join(cacheDir, file));
        const expireAt = Number(expireAtSt);
        const maxAge = Number(maxAgeSt);

        return {
          value: {
            // etag,
            buffer,
            extension,
            maxAge: maxAge,
            //  upstreamEtag,
          },
          expireAt,
          isStale: now > expireAt,
        };
      }
    } catch (_) {
      // failed to read from cache dir, treat as cache miss
    }
    return null;
  }
  async set(
    cacheKey: string,
    value: IncrementalCacheValue
  ): Promise<IncrementalCacheEntry> {
    if (typeof value.maxAge !== "number") {
      throw new Error("invariant revalidate must be a number for image-cache");
    }
    const expireAt = Math.max(value.maxAge) * 1000 + Date.now();

    if (this.promisesCache.has(cacheKey)) {
      const incrementalCacheValuePromise = this.promisesCache.get(cacheKey);

      const incrementalCacheValue =
        (await incrementalCacheValuePromise) as IncrementalCacheValue;
      return {
        value: incrementalCacheValue,
        expireAt,
        isStale: false,
      };
    }
    const incrementalCacheValuePromise = writeToCacheDir(
      join(this.cacheDir, cacheKey),
      value.extension,
      value.maxAge,
      expireAt,
      value.buffer
      /* value.etag,
        value.upstreamEtag */
    );
    this.promisesCache.set(cacheKey, incrementalCacheValuePromise);
    const incrementalCacheValue = await incrementalCacheValuePromise;
    this.promisesCache.delete(cacheKey);
    return {
      value: incrementalCacheValue,
      expireAt,
      isStale: false,
    };
  }
}

async function writeToCacheDir(
  dir: string,
  extension: string,
  maxAge: number,
  expireAt: number,
  buffer: Buffer
  /*  etag: string,
  upstreamEtag: string */
): Promise<IncrementalCacheValue> {
  /* const filename = join(
    dir,
    `${maxAge}.${expireAt}.${etag}.${upstreamEtag}.${extension}`
  ); */

  const filename = join(dir, `${maxAge}.${expireAt}.${extension}`);

  await promises.rm(dir, { recursive: true, force: true }).catch(() => {});

  await promises.mkdir(dir, { recursive: true });
  await promises.writeFile(filename, buffer);
  return { buffer, extension, maxAge };
}

export type IncrementalCacheEntry = {
  value: IncrementalCacheValue;
  expireAt: number;
  isStale: boolean;
};

export type IncrementalCacheValue = {
  extension: string;
  buffer: Buffer;
  //etag: string;
  //upstreamEtag: string;
  maxAge: number;
};

export function validateParams(
  acceptHeader: string,
  query: {
    url: string;
    w: string;
    q: string;
  },
  config: ImageConfigComplete,
  isDev?: boolean
):
  | {
      quality: number;
      width: number;
      mimeType: string;
      href: string;
      sizes: number[];
      isAbsolute: boolean;
      isStatic: boolean;
    }
  | { errorMessage: string } {
  const {
    deviceSizes = [],
    imageSizes = [],
    remotePatterns,
    localPatterns,
    formats = ["image/webp"],
  } = config;

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
      } */
    if (!hasLocalMatch(localPatterns, url)) {
      return { errorMessage: '"url" parameter is not allowed' };
    }
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

    if (!hasRemoteMatch(remotePatterns, hrefParsed)) {
      return { errorMessage: '"url" parameter is not allowed' };
    }
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
  };
}
