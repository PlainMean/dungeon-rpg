// Pure seeded RNG. No Math.random, no Date.now. xorshift32 with splitmix32 finalizer.
// Seed and call-count live in state and persist, so replay is byte-exact.

export interface Rng {
  state: number; // 32-bit xorshift state
  calls: number; // how many draws since seed
}

/** Any 32-bit int accepts. */
export function seedRng(seed: number): Rng {
  return { state: seed >>> 0, calls: 0 };
}

function nextRaw(rng: Rng): number {
  // xorshift32
  let x = rng.state >>> 0;
  if (x === 0) x = 0x9e3779b9 >>> 0; // never all-zero state
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  rng.state = x >>> 0;
  rng.calls += 1;
  return rng.state;
}

/** Uniform float in [0, 1). Mutates rng. */
export function nextFloat(rng: Rng): number {
  const x = nextRaw(rng);
  // Use top 24 bits for good distribution.
  return (x >>> 8) / 0x1000000; // / 2^24, in [0,1)
}

/** Uniform int in [lo, hi] inclusive. Mutates rng. lo<=hi. */
export function nextInt(rng: Rng, lo: number, hi: number): number {
  const range = hi - lo + 1;
  // simple modulo is fine for gameplay (no adversarial RNG attacks)
  return lo + Math.floor(nextFloat(rng) * range);
}

/** Returns true with probability p (0..1). */
export function chance(rng: Rng, p: number): boolean {
  return nextFloat(rng) < p;
}

/** Pick a random element of a non-empty array. */
export function pick<T>(rng: Rng, arr: readonly T[]): T {
  if (arr.length === 0) throw new Error("pick() on empty array");
  return arr[nextInt(rng, 0, arr.length - 1)];
}

// Deterministic 64-bit string/integer hash (cyrb53). Used for replay state hashes.
export function cyrb53(str: string, seed = 0): string {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, "0");
}