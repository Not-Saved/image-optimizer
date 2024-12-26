import {
  imageOptimizer,
  fetchExternalImage,
  ImageOptimizerCache,
} from "../dist/index.mjs";
import http from "http";
const hostname = "127.0.0.1";
const port = 3000;

const cache = new ImageOptimizerCache({ distDir: "." });

const server = http.createServer(async (req, res) => {
  if (req.method === "GET") {
    try {
      const imageUrl = "https://picsum.photos/id/200/1920/1080"; // Replace with your image URL
      const cacheKey = ImageOptimizerCache.getCacheKey({
        href: imageUrl,
        width: 800,
        quality: 90,
        mimeType: "image/webp",
      });

      let image = await cache.get(cacheKey);
      if (!image || image.revalidateAfter < Date.now()) {
        const imageUpstream = await fetchExternalImage(imageUrl);

        const optimizedImage = await imageOptimizer(imageUpstream, {
          width: 800,
          quality: 90,
          mimeType: "image/webp",
        });
        await cache.set(
          cacheKey,
          {
            buffer: optimizedImage.buffer,
            etag: "",
            extension: "webp",
            upstreamEtag: "",
          },
          { revalidate: 1000 }
        );
        image = await cache.get(cacheKey);
      }

      res.statusCode = 200;
      res.setHeader("Content-Type", "image/webp");
      res.end(image.value.buffer);
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
