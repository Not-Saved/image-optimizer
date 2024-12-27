import {
  imageOptimizer,
  fetchExternalImage,
  ImageOptimizerCache,
} from "../dist/server.mjs";

import http from "http";
const hostname = "127.0.0.1";
const port = 3000;

const cache = new ImageOptimizerCache({ distDir: "." });

const server = http.createServer(async (req, res) => {
  if (req.method === "GET") {
    try {
      const imageParams = {
        href: "https://picsum.photos/id/200/1920/1080",
        width: 800,
        quality: 90,
        mimeType: "image/webp",
      };
      const cacheKey = ImageOptimizerCache.getCacheKey(imageParams);

      let cacheEntry = await cache.get(cacheKey);
      let image = cacheEntry?.value;
      if (!image || image.isStale) {
        const imageUpstream = await fetchExternalImage(imageParams.href);
        const optimizedImage = await imageOptimizer(imageUpstream, {
          width: imageParams.width,
          quality: imageParams.quality,
          mimeType: imageParams.mimeType,
        });
        image = await cache.set(cacheKey, {
          buffer: optimizedImage.buffer,
          extension: optimizedImage.extension,
          maxAge: optimizedImage.maxAge,
        });
      }

      res.statusCode = 200;
      res.setHeader("Content-Type", imageParams.mimeType);
      //   res.setHeader("Content-Length", Buffer.byteLength(optimizedImage.buffer));
      res.end(image.buffer);
    } catch (error) {
      console.log(error);
      res.statusCode = 500;
      res.setHeader("Content-Type", "text/plain");
      res.end("Error optimizing image");
    }
  } else {
    res.statusCode = 404;
    res.setHeader("Content-Type", "text/plain");
    res.end("Not Found");
  }
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
