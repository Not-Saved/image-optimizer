"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  ImageOptimizerCache: () => ImageOptimizerCache,
  fetchExternalImage: () => fetchExternalImage,
  imageOptimizer: () => imageOptimizer
});
module.exports = __toCommonJS(index_exports);

// src/constants/index.ts
var AVIF = "image/avif";
var WEBP = "image/webp";
var PNG = "image/png";
var JPEG = "image/jpeg";
var GIF = "image/gif";
var SVG = "image/svg+xml";
var ICO = "image/x-icon";
var TIFF = "image/tiff";
var BMP = "image/bmp";
var CACHE_VERSION = 4;
var BLUR_IMG_SIZE = 8;

// src/utils/detectContentType.ts
function detectContentType(buffer) {
  if ([255, 216, 255].every((b, i) => buffer[i] === b)) {
    return JPEG;
  }
  if ([137, 80, 78, 71, 13, 10, 26, 10].every(
    (b, i) => buffer[i] === b
  )) {
    return PNG;
  }
  if ([71, 73, 70, 56].every((b, i) => buffer[i] === b)) {
    return GIF;
  }
  if ([82, 73, 70, 70, 0, 0, 0, 0, 87, 69, 66, 80].every(
    (b, i) => !b || buffer[i] === b
  )) {
    return WEBP;
  }
  if ([60, 63, 120, 109, 108].every((b, i) => buffer[i] === b)) {
    return SVG;
  }
  if ([60, 115, 118, 103].every((b, i) => buffer[i] === b)) {
    return SVG;
  }
  if ([0, 0, 0, 0, 102, 116, 121, 112, 97, 118, 105, 102].every(
    (b, i) => !b || buffer[i] === b
  )) {
    return AVIF;
  }
  if ([0, 0, 1, 0].every((b, i) => buffer[i] === b)) {
    return ICO;
  }
  if ([73, 73, 42, 0].every((b, i) => buffer[i] === b)) {
    return TIFF;
  }
  if ([66, 77].every((b, i) => buffer[i] === b)) {
    return BMP;
  }
  return null;
}

// src/sharp/getSharp.ts
var import_sharp = __toESM(require("sharp"));
var _sharp;
function getSharp(concurrency) {
  if (_sharp) {
    return _sharp;
  }
  try {
    _sharp = import_sharp.default;
    if (_sharp && import_sharp.default.concurrency() > 1) {
      const divisor = process.env.NODE_ENV === "development" ? 4 : 2;
      _sharp.concurrency(
        concurrency ?? Math.floor(Math.max(_sharp.concurrency() / divisor, 1))
      );
    }
  } catch (e) {
    throw e;
  }
  return _sharp;
}

// src/sharp/optimizeImage.ts
async function optimizeImage({
  buffer,
  contentType,
  quality,
  width,
  height,
  limitInputPixels,
  sequentialRead,
  timeoutInSeconds
}) {
  const _sharp2 = getSharp();
  const transformer = _sharp2(buffer, {
    limitInputPixels,
    sequentialRead: sequentialRead ?? void 0
  }).timeout({
    seconds: timeoutInSeconds ?? 7
  }).rotate();
  if (height) {
    transformer.resize(width, height);
  } else {
    transformer.resize(width, void 0, {
      withoutEnlargement: true
    });
  }
  if (contentType === AVIF) {
    transformer.avif({
      quality: Math.max(quality - 20, 1),
      effort: 3
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

// src/utils/parseCacheControl.ts
function parseCacheControl(str) {
  const map = /* @__PURE__ */ new Map();
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

// src/utils/getMaxAge.ts
function getMaxAge(str) {
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

// src/fetch/fetchExternalImage.ts
async function fetchExternalImage(href) {
  const res = await fetch(href, {
    signal: AbortSignal.timeout(7e3)
  }).catch((err) => err);
  if (res instanceof Error) {
    const err = res;
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

// src/cache/index.ts
var import_node_path = require("path");

// src/utils/getHash.ts
var import_node_crypto = require("crypto");
function getHash(items) {
  const hash = (0, import_node_crypto.createHash)("sha256");
  for (let item of items) {
    if (typeof item === "number") hash.update(String(item));
    else {
      hash.update(item);
    }
  }
  return hash.digest("base64url");
}

// src/utils/getSupportedMimeType.ts
function getSupportedMimeType(options, accept = "") {
  const mimeType = (
    /* mediaType(accept, options) */
    "image/webp"
  );
  return accept.includes(mimeType) ? mimeType : "";
}

// src/cache/index.ts
var import_node_fs = require("fs");
var ImageOptimizerCache = class {
  static validateParams(acceptHeader, query, isDev) {
    const imageData = {
      deviceSizes: [],
      imageSizes: [],
      domains: [],
      minimumCacheTTL: 60,
      formats: ["image/webp"]
    };
    const {
      deviceSizes = [],
      imageSizes = [],
      domains = [],
      minimumCacheTTL = 60,
      formats = ["image/webp"]
    } = imageData;
    const remotePatterns = [];
    const localPatterns = [];
    const { url, w, q } = query;
    let href;
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
        errorMessage: '"url" parameter cannot be a protocol-relative URL (//)'
      };
    }
    let isAbsolute;
    if (url.startsWith("/")) {
      href = url;
      isAbsolute = false;
    } else {
      let hrefParsed;
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
    }
    if (!w) {
      return { errorMessage: '"w" parameter (width) is required' };
    } else if (Array.isArray(w)) {
      return { errorMessage: '"w" parameter (width) cannot be an array' };
    } else if (!/^[0-9]+$/.test(w)) {
      return {
        errorMessage: '"w" parameter (width) must be an integer greater than 0'
      };
    }
    if (!q) {
      return { errorMessage: '"q" parameter (quality) is required' };
    } else if (Array.isArray(q)) {
      return { errorMessage: '"q" parameter (quality) cannot be an array' };
    } else if (!/^[0-9]+$/.test(q)) {
      return {
        errorMessage: '"q" parameter (quality) must be an integer between 1 and 100'
      };
    }
    const width = parseInt(w, 10);
    if (width <= 0 || isNaN(width)) {
      return {
        errorMessage: '"w" parameter (width) must be an integer greater than 0'
      };
    }
    const sizes = [...deviceSizes || [], ...imageSizes || []];
    const isValidSize = sizes.includes(width) || isDev && width <= BLUR_IMG_SIZE;
    if (!isValidSize) {
      return {
        errorMessage: `"w" parameter (width) of ${width} is not allowed`
      };
    }
    const quality = parseInt(q, 10);
    if (isNaN(quality) || quality < 1 || quality > 100) {
      return {
        errorMessage: '"q" parameter (quality) must be an integer between 1 and 100'
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
      minimumCacheTTL
    };
  }
  static getCacheKey({
    href,
    width,
    quality,
    mimeType
  }) {
    return getHash([CACHE_VERSION, href, width, quality, mimeType]);
  }
  constructor({ distDir }) {
    this.cacheDir = (0, import_node_path.join)(distDir, "cache", "images");
  }
  async get(cacheKey) {
    try {
      const cacheDir = (0, import_node_path.join)(this.cacheDir, cacheKey);
      const files = await import_node_fs.promises.readdir(cacheDir);
      const now = Date.now();
      for (const file of files) {
        const [maxAgeSt, expireAtSt, etag, upstreamEtag, extension] = file.split(".", 5);
        const buffer = await import_node_fs.promises.readFile((0, import_node_path.join)(cacheDir, file));
        const expireAt = Number(expireAtSt);
        const maxAge = Number(maxAgeSt);
        return {
          value: {
            etag,
            buffer,
            extension,
            upstreamEtag
          },
          revalidateAfter: Math.max(maxAge) * 1e3 + Date.now(),
          curRevalidate: maxAge,
          isStale: now > expireAt,
          isFallback: false
        };
      }
    } catch (_) {
    }
    return null;
  }
  async set(cacheKey, value, {
    revalidate
  }) {
    if (typeof revalidate !== "number") {
      throw new Error("invariant revalidate must be a number for image-cache");
    }
    const expireAt = Math.max(revalidate) * 1e3 + Date.now();
    try {
      await writeToCacheDir(
        (0, import_node_path.join)(this.cacheDir, cacheKey),
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
};
async function writeToCacheDir(dir, extension, maxAge, expireAt, buffer, etag, upstreamEtag) {
  const filename = (0, import_node_path.join)(
    dir,
    `${maxAge}.${expireAt}.${etag}.${upstreamEtag}.${extension}`
  );
  await import_node_fs.promises.rm(dir, { recursive: true, force: true }).catch(() => {
  });
  await import_node_fs.promises.mkdir(dir, { recursive: true });
  await import_node_fs.promises.writeFile(filename, buffer);
}

// src/index.ts
async function imageOptimizer(imageUpstream, params) {
  const { quality, width, mimeType } = params;
  const { buffer: upstreamBuffer } = imageUpstream;
  const maxAge = getMaxAge(imageUpstream.cacheControl);
  const upstreamType = imageUpstream.contentType?.toLowerCase().trim() || detectContentType(upstreamBuffer);
  if (upstreamType) {
    if (upstreamType.startsWith("image/svg")) {
      throw new Error(
        '"url" parameter is valid but image type svg is not allowed'
      );
    }
    if (!upstreamType.startsWith("image/") || upstreamType.includes(",")) {
      throw new Error("The requested resource isn't a valid image.");
    }
  }
  let contentType;
  if (mimeType) {
    contentType = mimeType;
  } else {
    contentType = JPEG;
  }
  try {
    let optimizedBuffer = await optimizeImage({
      buffer: upstreamBuffer,
      contentType,
      quality,
      width
    });
    return {
      buffer: optimizedBuffer,
      contentType,
      maxAge: Math.max(maxAge, 60)
    };
  } catch (error) {
    if (upstreamType) {
      return {
        buffer: upstreamBuffer,
        contentType: upstreamType,
        maxAge: 60,
        error
      };
    } else {
      throw new Error(
        "Unable to optimize image and unable to fallback to upstream image"
      );
    }
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ImageOptimizerCache,
  fetchExternalImage,
  imageOptimizer
});
//# sourceMappingURL=index.js.map