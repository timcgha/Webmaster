import { build } from "vite";
import { requirePreview } from "./catalog.mjs";

/** Build an isolated preview into its catalog pagesDir. */
export async function buildPreview(id) {
  const preview = requirePreview(id);
  // JS literal base avoids Git Bash rewriting the Pages URL into a Windows path.
  await build({
    base: preview.base,
    build: { outDir: preview.pagesDir, emptyOutDir: true, manifest: true },
  });
}

const id = process.argv[2];
if (id) await buildPreview(id);
