import builtins from "builtin-modules";
import esbuild from "esbuild";
import toml from "esbuild-plugin-toml";
import process from "process";

import path from "path";
import fs from "fs";

const banner = `/*
THIS IS A GENERATED/BUNDLED FILE BY ESBUILD
if you want to view the source, please visit the github repository of this plugin
*/
`;

let wasmPlugin = {
  name: "wasm",
  setup(build) {
    // Resolve ".wasm" files to a path with a namespace
    build.onResolve({ filter: /\.wasm$/ }, (args) => {
      // Otherwise, generate the JavaScript stub module for this
      // ".wasm" file. Put it in the "wasm-stub" namespace to tell
      // our stub load callback to fill it with JavaScript.
      //
      // Resolve relative paths to absolute paths here since this
      // resolve callback is given "resolveDir", the directory to
      // resolve imports against.
      if (args.resolveDir === "") {
        return; // Ignore unresolvable paths
      }
      return {
        path: path.isAbsolute(args.path)
          ? args.path
          : path.join(args.resolveDir, args.path),
        namespace: "wasm-binary",
      };
    });

    // Virtual modules in the "wasm-binary" namespace contain the
    // actual bytes of the WebAssembly file. This uses esbuild's
    // built-in "binary" loader instead of manually embedding the
    // binary data inside JavaScript code ourselves.
    build.onLoad({ filter: /.*/, namespace: "wasm-binary" }, async (args) => ({
      contents: await fs.promises.readFile(args.path),
      loader: "binary",
    }));
  },
};

const prod = process.argv[2] === "production";
const test_build = process.argv[2] === "test" || process.argv[3] === "test";

let entry_point;
let outfile;
if (!test_build) {
  entry_point = "src/main.ts";
  outfile = "main.js";
} else {
  entry_point = "tests/main.test.ts";
  outfile = "main.test.js";
}

esbuild
  .build({
    banner: {
      js: banner,
    },
    entryPoints: [entry_point],
    bundle: true,
    external: [
      "obsidian",
      "electron",
      "@codemirror/autocomplete",
      "@codemirror/closebrackets",
      "@codemirror/collab",
      "@codemirror/commands",
      "@codemirror/comment",
      "@codemirror/fold",
      "@codemirror/gutter",
      "@codemirror/highlight",
      "@codemirror/history",
      "@codemirror/language",
      "@codemirror/lint",
      "@codemirror/matchbrackets",
      "@codemirror/panel",
      "@codemirror/rangeset",
      "@codemirror/rectangular-selection",
      "@codemirror/search",
      "@codemirror/state",
      "@codemirror/stream-parser",
      "@codemirror/text",
      "@codemirror/tooltip",
      "@codemirror/view",
      ...builtins,
    ],
    format: "cjs",
    watch: !prod,
    target: "es2020",
    logLevel: "info",
    sourcemap: prod ? false : "inline",
    treeShaking: true,
    plugins: [toml(), wasmPlugin],
    outfile: outfile,
  })
  .catch(() => process.exit(1));
