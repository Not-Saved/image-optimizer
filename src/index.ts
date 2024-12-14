import { createHash } from "crypto";
import { promises } from "fs";
import { join } from "path";
import type sharp from "sharp";
type SharpNamespace = typeof sharp;
type Sharp = (
  input?:
    | Buffer
    | ArrayBuffer
    | Uint8Array
    | Uint8ClampedArray
    | Int8Array
    | Uint16Array
    | Int16Array
    | Uint32Array
    | Int32Array
    | Float32Array
    | Float64Array
    | string,
  options?: sharp.SharpOptions
) => sharp.Sharp;

const AVIF = "image/avif";
const WEBP = "image/webp";
const PNG = "image/png";
const JPEG = "image/jpeg";
const GIF = "image/gif";
const SVG = "image/svg+xml";
const ICO = "image/x-icon";
const TIFF = "image/tiff";
const BMP = "image/bmp";
const CACHE_VERSION = 4;
const ANIMATABLE_TYPES = [WEBP, PNG, GIF];
const VECTOR_TYPES = [SVG];
const BLUR_IMG_SIZE = 8; // should match `next-image-loader`
const BLUR_QUALITY = 70; // should match `next-image-loader`

let _sharp: SharpNamespace;
function getSharp(
  sharp: SharpNamespace,
  concurrency?: number | null | undefined
): Sharp {
  if (_sharp) {
    return _sharp;
  }
  try {
    _sharp = sharp;
    if (_sharp && sharp.concurrency() > 1) {
      // Reducing concurrency should reduce the memory usage too.
      // We more aggressively reduce in dev but also reduce in prod.
      // https://sharp.pixelplumbing.com/api-utility#concurrency
      const divisor = process.env.NODE_ENV === "development" ? 4 : 2;
      _sharp.concurrency(
        concurrency ?? Math.floor(Math.max(_sharp.concurrency() / divisor, 1))
      );
    }
  } catch (e: unknown) {
    throw e;
  }
  return _sharp;
}

interface ImageUpstream {
  buffer: Buffer;
  contentType: string | null | undefined;
  cacheControl: string | null | undefined;
}
export async function imageOptimizer(
  sharp: SharpNamespace,
  imageUpstream: ImageUpstream,
  params: {
    quality: number;
    width: number;
    mimeType: string;
  }
): Promise<{
  buffer: Buffer;
  contentType: string;
  maxAge: number;
  error?: unknown;
}> {
  const { quality, width, mimeType } = params;
  const { buffer: upstreamBuffer } = imageUpstream;
  const maxAge = getMaxAge(imageUpstream.cacheControl);

  const upstreamType =
    detectContentType(upstreamBuffer) ||
    imageUpstream.contentType?.toLowerCase().trim();

  if (upstreamType) {
    if (upstreamType.startsWith("image/svg")) {
      throw new Error(
        '"url" parameter is valid but image type svg is not allowed'
      );
    }
    /*    if (ANIMATABLE_TYPES.includes(upstreamType) && isAnimated(upstreamBuffer)) {
      if (!opts.silent) {
        Log.warnOnce(
          `The requested resource "${href}" is an animated image so it will not be optimized. Consider adding the "unoptimized" property to the <Image>.`
        );
      }
      return {
        buffer: upstreamBuffer,
        contentType: upstreamType,
        maxAge,
        etag: upstreamEtag,
        upstreamEtag,
      };
    } */

    /* if (VECTOR_TYPES.includes(upstreamType)) {
      // We don't warn here because we already know that "dangerouslyAllowSVG"
      // was enabled above, therefore the user explicitly opted in.
      // If we add more VECTOR_TYPES besides SVG, perhaps we could warn for those.
      return {
        buffer: upstreamBuffer,
        contentType: upstreamType,
        maxAge,
      };
    } */

    if (!upstreamType.startsWith("image/") || upstreamType.includes(",")) {
      throw new Error("The requested resource isn't a valid image.");
    }
  }

  let contentType: string;

  if (mimeType) {
    contentType = mimeType;
  } else {
    contentType = JPEG;
  }

  /*  const previouslyCachedImage = getPreviouslyCachedImageOrNull(
    imageUpstream,
    opts.previousCacheEntry
  );
  if (previouslyCachedImage) {
    return {
      buffer: previouslyCachedImage.buffer,
      contentType,
      maxAge: opts?.previousCacheEntry?.curRevalidate || maxAge,
      etag: previouslyCachedImage.etag,
      upstreamEtag: previouslyCachedImage.upstreamEtag,
    };
  }
 */
  try {
    let optimizedBuffer = await optimizeImage({
      sharp,
      buffer: upstreamBuffer,
      contentType,
      quality,
      width,
    });
    /* if (opts.isDev && width <= BLUR_IMG_SIZE && quality === BLUR_QUALITY) {
      // During `next dev`, we don't want to generate blur placeholders with webpack
      // because it can delay starting the dev server. Instead, `next-image-loader.js`
      // will inline a special url to lazily generate the blur placeholder at request time.
      const meta = await getImageSize(optimizedBuffer);
      const blurOpts = {
        blurWidth: meta.width,
        blurHeight: meta.height,
        blurDataURL: `data:${contentType};base64,${optimizedBuffer.toString(
          "base64"
        )}`,
      };
      optimizedBuffer = Buffer.from(unescape(getImageBlurSvg(blurOpts)));
      contentType = "image/svg+xml";
    } */
    return {
      buffer: optimizedBuffer,
      contentType,
      maxAge: Math.max(maxAge, 60),
    };
  } catch (error) {
    if (upstreamType) {
      // If we fail to optimize, fallback to the original image
      return {
        buffer: upstreamBuffer,
        contentType: upstreamType,
        maxAge: 60,
        error,
      };
    } else {
      throw new Error(
        "Unable to optimize image and unable to fallback to upstream image"
      );
    }
  }
}

async function optimizeImage({
  sharp,
  buffer,
  contentType,
  quality,
  width,
  height,
  concurrency,
  limitInputPixels,
  sequentialRead,
  timeoutInSeconds,
}: {
  sharp: SharpNamespace;
  buffer: Buffer;
  contentType: string;
  quality: number;
  width: number;
  height?: number;
  concurrency?: number | null;
  limitInputPixels?: number;
  sequentialRead?: boolean | null;
  timeoutInSeconds?: number;
}): Promise<Buffer> {
  const _sharp = getSharp(sharp);

  const transformer = _sharp(buffer, {
    limitInputPixels,
    sequentialRead: sequentialRead ?? undefined,
  })
    .timeout({
      seconds: timeoutInSeconds ?? 7,
    })
    .rotate();

  if (height) {
    transformer.resize(width, height);
  } else {
    transformer.resize(width, undefined, {
      withoutEnlargement: true,
    });
  }

  if (contentType === AVIF) {
    transformer.avif({
      quality: Math.max(quality - 20, 1),
      effort: 3,
    });
  } else if (contentType === WEBP) {
    transformer.webp({ quality });
  } else if (contentType === PNG) {
    transformer.png({ quality });
  } else if (contentType === JPEG) {
    transformer.jpeg({ quality, mozjpeg: true });
  }

  const optimizedBuffer = await transformer.toBuffer();

  return optimizedBuffer;
}

export async function fetchExternalImage(href: string): Promise<ImageUpstream> {
  const res = await fetch(href, {
    signal: AbortSignal.timeout(7_000),
  }).catch((err) => err as Error);

  if (res instanceof Error) {
    const err = res as Error;
    if (err.name === "TimeoutError") {
      throw new Error(
        '"url" parameter is valid but upstream response timed out'
      );
    }
    throw err;
  }

  if (!res.ok) {
    throw new Error(
      '"url" parameter is valid but upstream response is invalid'
    );
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get("Content-Type");
  const cacheControl = res.headers.get("Cache-Control");
  return { buffer, contentType, cacheControl };
}

function parseCacheControl(
  str: string | null | undefined
): Map<string, string> {
  const map = new Map<string, string>();
  if (!str) {
    return map;
  }
  for (let directive of str.split(",")) {
    let [key, value] = directive.trim().split("=", 2);
    key = key.toLowerCase();
    if (value) {
      value = value.toLowerCase();
    }
    map.set(key, value);
  }
  return map;
}

function getMaxAge(str: string | null | undefined): number {
  const map = parseCacheControl(str);
  if (map) {
    let age = map.get("s-maxage") || map.get("max-age") || "";
    if (age.startsWith('"') && age.endsWith('"')) {
      age = age.slice(1, -1);
    }
    const n = parseInt(age, 10);
    if (!isNaN(n)) {
      return n;
    }
  }
  return 0;
}

/**
 * Inspects the first few bytes of a buffer to determine if
 * it matches the "magic number" of known file signatures.
 * https://en.wikipedia.org/wiki/List_of_file_signatures
 */
function detectContentType(buffer: Buffer) {
  if ([0xff, 0xd8, 0xff].every((b, i) => buffer[i] === b)) {
    return JPEG;
  }
  if (
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every(
      (b, i) => buffer[i] === b
    )
  ) {
    return PNG;
  }
  if ([0x47, 0x49, 0x46, 0x38].every((b, i) => buffer[i] === b)) {
    return GIF;
  }
  if (
    [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50].every(
      (b, i) => !b || buffer[i] === b
    )
  ) {
    return WEBP;
  }
  if ([0x3c, 0x3f, 0x78, 0x6d, 0x6c].every((b, i) => buffer[i] === b)) {
    return SVG;
  }
  if ([0x3c, 0x73, 0x76, 0x67].every((b, i) => buffer[i] === b)) {
    return SVG;
  }
  if (
    [0, 0, 0, 0, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66].every(
      (b, i) => !b || buffer[i] === b
    )
  ) {
    return AVIF;
  }
  if ([0x00, 0x00, 0x01, 0x00].every((b, i) => buffer[i] === b)) {
    return ICO;
  }
  if ([0x49, 0x49, 0x2a, 0x00].every((b, i) => buffer[i] === b)) {
    return TIFF;
  }
  if ([0x42, 0x4d].every((b, i) => buffer[i] === b)) {
    return BMP;
  }
  return null;
}

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
        console.log(maxAgeSt, expireAtSt, etag, upstreamEtag, extension);
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

function getSupportedMimeType(options: string[], accept = ""): string {
  const mimeType = /* mediaType(accept, options) */ "image/webp";
  return accept.includes(mimeType) ? mimeType : "";
}

function getHash(items: (string | number | Buffer)[]) {
  const hash = createHash("sha256");
  for (let item of items) {
    if (typeof item === "number") hash.update(String(item));
    else {
      hash.update(item);
    }
  }
  // See https://en.wikipedia.org/wiki/Base64#URL_applications
  return hash.digest("base64url");
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
