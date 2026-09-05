// Loads the asset manifest as a typed object. Gameplay code resolves sprites via these ids;
// the renderer generates matching placeholder textures at boot.
import type { Manifest } from "../content/schemas";
import { ManifestSchema } from "../content/schemas";
import manifestJson from "../assets/manifest.json";

let cache: Manifest | null = null;
export function manifest(): Manifest {
  if (cache) return cache;
  const parsed = ManifestSchema.safeParse(manifestJson);
  if (!parsed.success) throw new Error("manifest.json invalid: " + parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; "));
  cache = parsed.data;
  return cache;
}