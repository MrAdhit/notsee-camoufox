import { build } from "esbuild";

import { NodeResolvePlugin } from "@esbuild-plugins/node-resolve";
import { esbuildPluginFilePathExtensions } from "esbuild-plugin-file-path-extensions";

build({
    format: "esm",
    bundle: true,
    // TODO: Ignore .test.ts files.
    entryPoints: ["src/**/*.ts", "src/**/*.py"],
    outdir: "dist",
    platform: "node",
    target: "node22",
    loader: {
        ".py": "copy",
    },
    external: ["playwright-core"],
    sourcemap: true,
    plugins: [
        NodeResolvePlugin({
            extensions: ["*.ts", "*.js"],
            onResolved: (resolved) => {
                if (resolved.includes("node_modules"))
                    return {
                        external: true
                    };
                
                if (resolved.startsWith("node:"))
                    return {
                        external: true
                    }
                
                return resolved;
            }
        }),
        esbuildPluginFilePathExtensions({
            esmExtension: "js",
        }),
    ]
});
