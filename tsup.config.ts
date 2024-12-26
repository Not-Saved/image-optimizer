import { defineConfig } from "tsup";

export default defineConfig({
  target: "es2020",
  format: ["cjs", "esm"],
  splitting: false,
  sourcemap: true,
  clean: true,
  dts: {
    entry: {
      server: "src/server.ts",
      client: "src/client.ts",
    },
  },
  entryPoints: ["./src/server.ts", "./src/client.ts"],
});
