import { detectContentType } from "./utils/detectContentType";
import { optimizeImage } from "./sharp/optimizeImage";
import { JPEG } from "./constants";
import { getMaxAge } from "./utils/getMaxAge";
import { ImageUpstream } from "./types";

export * from "./fetch/fetchExternalImage";
export * from "./types";
export * from "./cache";

export async function imageOptimizer(
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
    imageUpstream.contentType?.toLowerCase().trim() ||
    detectContentType(upstreamBuffer);

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
