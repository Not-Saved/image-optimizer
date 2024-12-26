import { ImageUpstream } from "../types";

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
