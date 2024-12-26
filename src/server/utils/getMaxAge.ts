import { parseCacheControl } from "./parseCacheControl";

export function getMaxAge(str: string | null | undefined): number {
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
