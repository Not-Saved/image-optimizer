"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client.ts
var client_exports = {};
__export(client_exports, {
  generateImgAttrs: () => generateImgAttrs,
  imageConfigDefault: () => imageConfigDefault
});
module.exports = __toCommonJS(client_exports);
function generateImgAttrs({
  config,
  src,
  unoptimized,
  width,
  quality,
  sizes,
  loader
}) {
  if (unoptimized) {
    return { src, srcSet: void 0, sizes: void 0 };
  }
  const { widths, kind } = getWidths(
    {
      deviceSizes: config.deviceSizes || [],
      imageSizes: config.imageSizes || []
    },
    width,
    sizes
  );
  const last = widths.length - 1;
  return {
    sizes: !sizes && kind === "w" ? "100vw" : sizes,
    srcSet: widths.map(
      (w, i) => `${loader({ config, src, quality, width: w })} ${kind === "w" ? w : i + 1}${kind}`
    ).join(", "),
    // It's intended to keep `src` the last attribute because React updates
    // attributes in order. If we keep `src` the first one, Safari will
    // immediately start to fetch `src`, before `sizes` and `srcSet` are even
    // updated by React. That causes multiple unnecessary requests if `srcSet`
    // and `sizes` are defined.
    // This bug cannot be reproduced in Chrome or Firefox.
    src: loader({ config, src, quality, width: widths[last] })
  };
}
function getWidths({ deviceSizes, imageSizes }, width, sizes) {
  const allSizes = [...deviceSizes, ...imageSizes].sort((a, b) => a - b);
  if (sizes) {
    const viewportWidthRe = /(^|\s)(1?\d?\d)vw/g;
    const percentSizes = [];
    for (let match; match = viewportWidthRe.exec(sizes); match) {
      percentSizes.push(parseInt(match[2]));
    }
    if (percentSizes.length) {
      const smallestRatio = Math.min(...percentSizes) * 0.01;
      return {
        widths: allSizes.filter((s) => s >= deviceSizes[0] * smallestRatio),
        kind: "w"
      };
    }
    return { widths: allSizes, kind: "w" };
  }
  if (typeof width !== "number") {
    return { widths: deviceSizes, kind: "w" };
  }
  let widths = [];
  if (width) {
    widths = [
      ...new Set(
        // > This means that most OLED screens that say they are 3x resolution,
        // > are actually 3x in the green color, but only 1.5x in the red and
        // > blue colors. Showing a 3x resolution image in the app vs a 2x
        // > resolution image will be visually the same, though the 3x image
        // > takes significantly more data. Even true 3x resolution screens are
        // > wasteful as the human eye cannot see that level of detail without
        // > something like a magnifying glass.
        // https://blog.twitter.com/engineering/en_us/topics/infrastructure/2019/capping-image-fidelity-on-ultra-high-resolution-devices.html
        [
          width,
          width * 2
          /*, width * 3*/
        ].map(
          (w) => allSizes.find((p) => p >= w) || allSizes[allSizes.length - 1]
        )
      )
    ];
  }
  return { widths, kind: "x" };
}
var imageConfigDefault = {
  deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
  imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  path: "/api/image",
  unoptimized: false
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  generateImgAttrs,
  imageConfigDefault
});
//# sourceMappingURL=client.js.map