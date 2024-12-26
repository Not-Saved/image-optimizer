export interface ImageUpstream {
  buffer: Buffer;
  contentType: string | null | undefined;
  cacheControl: string | null | undefined;
}
