import { createHash } from "node:crypto";

export function getHash(items: (string | number | Buffer)[]) {
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