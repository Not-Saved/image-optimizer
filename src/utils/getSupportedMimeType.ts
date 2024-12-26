export function getSupportedMimeType(options: string[], accept = ""): string {
    const mimeType = /* mediaType(accept, options) */ "image/webp";
    return accept.includes(mimeType) ? mimeType : "";
  }
  