import sharp from "sharp";

type SharpNamespace = typeof sharp;
type Sharp = (
  input?:
    | Buffer
    | ArrayBuffer
    | Uint8Array
    | Uint8ClampedArray
    | Int8Array
    | Uint16Array
    | Int16Array
    | Uint32Array
    | Int32Array
    | Float32Array
    | Float64Array
    | string,
  options?: sharp.SharpOptions
) => sharp.Sharp;

let _sharp: SharpNamespace;
export function getSharp(concurrency?: number | null | undefined): Sharp {
  if (_sharp) {
    return _sharp;
  }
  try {
    _sharp = sharp;
    if (_sharp && sharp.concurrency() > 1) {
      // Reducing concurrency should reduce the memory usage too.
      // We more aggressively reduce in dev but also reduce in prod.
      // https://sharp.pixelplumbing.com/api-utility#concurrency
      const divisor = process.env.NODE_ENV === "development" ? 4 : 2;
      _sharp.concurrency(
        concurrency ?? Math.floor(Math.max(_sharp.concurrency() / divisor, 1))
      );
    }
  } catch (e: unknown) {
    throw e;
  }
  return _sharp;
}
