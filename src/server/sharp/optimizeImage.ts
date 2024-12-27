import { AVIF, JPEG, PNG, WEBP } from "../constants/constants";
import { getSharp } from "./getSharp";

export async function optimizeImage({
  buffer,
  contentType,
  quality,
  width,
  height,
  limitInputPixels,
  sequentialRead,
  timeoutInSeconds,
}: {
  buffer: Buffer;
  contentType: string;
  quality: number;
  width: number;
  height?: number;
  limitInputPixels?: number;
  sequentialRead?: boolean | null;
  timeoutInSeconds?: number;
}): Promise<Buffer> {
  const _sharp = getSharp();

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
