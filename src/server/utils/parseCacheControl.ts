export function parseCacheControl(
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
