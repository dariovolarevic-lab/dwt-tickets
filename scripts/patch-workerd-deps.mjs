// Patches third-party packages so they run in Cloudflare Workers (workerd). Idempotent; run after
// `npm install` / `prisma generate` (the npm scripts do this automatically).
import { existsSync, readFileSync, writeFileSync } from "node:fs";

// 1) Prisma: the generated workerd loader does `import('./query_compiler_bg.wasm')`, which the Next/OpenNext
// bundling can't resolve. In a Worker the wasm is imported by custom-worker.ts (bundled by Wrangler) and handed
// over via a global; under plain Node (`next dev`) it is compiled from disk.
const loader = "node_modules/.prisma/client/wasm-worker-loader.mjs";
if (!existsSync(loader)) throw new Error(`${loader} not found: run "prisma generate" first`);
writeFileSync(
  loader,
  `// Patched by scripts/patch-workerd-deps.mjs
async function fromDisk() {
  const fs = await import("node:fs/promises");
  const path = await import("node:path");
  const file = path.join(process.cwd(), "node_modules", ".prisma", "client", "query_compiler_bg.wasm");
  return WebAssembly.compile(await fs.readFile(file));
}

export default (async () => ({ default: globalThis.__PRISMA_QUERY_COMPILER_WASM ?? (await fromDisk()) }))()
`,
);
console.log("Patched", loader);

// 2) yoga-layout (used by @react-pdf for layout) compiles its wasm from a base64 string at runtime, which Workers
// forbid. Extract the wasm to a file (imported as a real module by custom-worker.ts) and let loadYoga() use it.
const yogaGlue = "node_modules/yoga-layout/dist/binaries/yoga-wasm-base64-esm.js";
const yogaWasm = "node_modules/yoga-layout/dist/binaries/yoga.wasm";
const yogaLoad = "node_modules/yoga-layout/dist/src/load.js";
if (existsSync(yogaGlue) && existsSync(yogaLoad)) {
  const base64 = readFileSync(yogaGlue, "utf8").match(/data:application\/octet-stream;base64,([A-Za-z0-9+/=]+)/)?.[1];
  if (!base64) throw new Error("Could not find the embedded yoga wasm");
  writeFileSync(yogaWasm, Buffer.from(base64, "base64"));

  const src = readFileSync(yogaLoad, "utf8");
  if (!src.includes("__YOGA_WASM_MODULE")) {
    const patched = src.replace(
      "return wrapAssembly(await loadYogaImpl());",
      `const wasm = globalThis.__YOGA_WASM_MODULE;
  return wrapAssembly(
    await loadYogaImpl(
      wasm
        ? {
            instantiateWasm(imports, done) {
              WebAssembly.instantiate(wasm, imports).then((instance) => done(instance));
              return {};
            },
          }
        : undefined,
    ),
  );`,
    );
    if (patched === src) throw new Error("yoga load.js has an unexpected shape");
    writeFileSync(yogaLoad, patched);
  }
  console.log("Patched", yogaLoad);
}

// 3) pdfkit (used by @react-pdf/renderer) loads its built-in fonts with a runtime require of a "#standard-fonts/*"
// import-map specifier, which bundlers can't follow. Replace them with static references.
const FONT_REQUIRE = /require\$1\('#standard-fonts\/(\w+)'\)/g;

const cjs = "node_modules/pdfkit/js/pdfkit.js";
if (existsSync(cjs)) {
  const src = readFileSync(cjs, "utf8");
  if (FONT_REQUIRE.test(src)) {
    FONT_REQUIRE.lastIndex = 0;
    writeFileSync(cjs, src.replace(FONT_REQUIRE, "require('./standard-fonts/$1.cjs')"));
    console.log("Patched", cjs);
  }
}

const esm = "node_modules/pdfkit/js/pdfkit.node.mjs";
if (existsSync(esm)) {
  const src = readFileSync(esm, "utf8");
  FONT_REQUIRE.lastIndex = 0;
  if (FONT_REQUIRE.test(src)) {
    FONT_REQUIRE.lastIndex = 0;
    const names = [...new Set([...src.matchAll(FONT_REQUIRE)].map((m) => m[1]))];
    const imports = names.map((n) => `import __stdFont_${n} from './standard-fonts/${n}.mjs';`).join("\n");
    writeFileSync(esm, `${imports}\n${src.replace(FONT_REQUIRE, "__stdFont_$1")}`);
    console.log("Patched", esm);
  }
}
