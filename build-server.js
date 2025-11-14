// Build script para o servidor backend
const esbuild = require("esbuild");
const path = require("path");

esbuild
  .build({
    entryPoints: ["src/server/index.ts"],
    bundle: true,
    platform: "node",
    target: "node18",
    outfile: "dist/server.cjs",
    external: [
      "electron",
      "better-sqlite3",
      "@whiskeysockets/baileys",
      "@hapi/boom",
      "pino",
    ],
    format: "cjs",
    sourcemap: true,
    logLevel: "info",
    banner: {
      js: "(async()=>{",
    },
    footer: {
      js: "})();",
    },
  })
  .then(() => {
    console.log("✓ Server bundle created");
  })
  .catch((error) => {
    console.error("✗ Build failed:", error);
    process.exit(1);
  });
