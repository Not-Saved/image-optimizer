import { LocalPattern } from "../..";

export function matchLocalPattern(pattern: LocalPattern, url: URL): boolean {
  if (pattern.search !== undefined) {
    if (pattern.search !== url.search) {
      return false;
    }
  }

  /* if (!makeRe(pattern.pathname ?? "**", { dot: true }).test(url.pathname)) {
    return false;
  } */

  /* Simply matching for now */
  if (pattern.pathname !== url.pathname) {
    return false;
  }

  return true;
}

export function hasLocalMatch(
  localPatterns: LocalPattern[] | undefined,
  urlPathAndQuery: string
): boolean {
  if (!localPatterns) {
    // if the user didn't define "localPatterns", we allow all local images
    return true;
  }
  const url = new URL(urlPathAndQuery, "http://n");
  return localPatterns.some((p) => matchLocalPattern(p, url));
}