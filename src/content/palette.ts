// DB16 — DawnBringer 16. The LOCKED palette. Every sprite is quantized through this.
// 16 colors, hex strings WITHOUT '#'. Order is the canonical DB16 order.

export const DB16: readonly string[] = [
  "140c1c", // shadow / near-black
  "442434", // dark maroon
  "30346d", // dark blue
  "4e4a4e", // dark gray
  "854c30", // brown
  "346524", // dark green
  "d04648", // red
  "757161", // light gray-brown
  "597dce", // blue
  "d27d2c", // orange
  "8595a1", // light gray
  "6daa2c", // green
  "d2aa99", // skin / tan
  "6dc2ca", // cyan
  "dad45e", // yellow
  "deeed6", // pale / white
] as const;

export const DB16_BY_RGB: ReadonlyMap<string, string> = new Map(
  DB16.map((hex) => [hex, hex]),
);

// Palette membership check returns the palette hex for a given 6-digit hex, or null.
export function toPaletteHex(hex6: string): string | null {
  return DB16_BY_RGB.get(hex6.toLowerCase()) ?? null;
}

export const DB16_HEX8 = DB16.map((h) => `#${h}`);