// Copia o worker do MapLibre para public/. Na v6 ele é um arquivo separado que
// a lib procura ao lado do próprio bundle — caminho que o bundler do Next não
// reproduz. O mapa aponta para cá com setWorkerUrl (ver route-map.tsx).
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const dist = dirname(require.resolve("maplibre-gl/package.json"));
const outDir = join(process.cwd(), "public", "maplibre");

mkdirSync(outDir, { recursive: true });
copyFileSync(join(dist, "dist", "maplibre-gl-worker.mjs"), join(outDir, "maplibre-gl-worker.mjs"));
console.log("maplibre: worker copiado para public/maplibre/");
