const esbuild = require("esbuild");

esbuild.build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  outfile: "dist/index.js",
  platform: "node",
  target: "node18",
  external: ["notsee-camoufox", "readline/promises"],
  loader: {
    ".png": "binary",
  },
  plugins: [ ]
}).catch(() => process.exit(1));
