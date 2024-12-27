import { RemotePattern } from "../..";

// Modifying this function should also modify writeImagesManifest()
export function matchRemotePattern(pattern: RemotePattern, url: URL): boolean {
  if (pattern.protocol !== undefined) {
    const actualProto = url.protocol.slice(0, -1);
    if (pattern.protocol !== actualProto) {
      return false;
    }
  }
  if (pattern.port !== undefined) {
    if (pattern.port !== url.port) {
      return false;
    }
  }

  if (pattern.hostname === undefined) {
    throw new Error(
      `Pattern should define hostname but found\n${JSON.stringify(pattern)}`
    );
  } else {
    if (pattern.hostname !== url.hostname) {
      return false;
    }
  }

  if (pattern.search !== undefined) {
    if (pattern.search !== url.search) {
      return false;
    }
  }

  if (pattern.hostname !== url.hostname) {
    return false;
  }

  return true;
}

export function hasRemoteMatch(
  remotePatterns: RemotePattern[],
  url: URL
): boolean {
  return remotePatterns.some((p) => matchRemotePattern(p, url));
}