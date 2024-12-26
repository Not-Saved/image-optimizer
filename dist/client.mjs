// src/client.ts
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
export {
  generateImgAttrs,
  imageConfigDefault
};
//# sourceMappingURL=client.mjs.map