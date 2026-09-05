// ESLint flat config. Enforces determinism rules (no Math.random / Date.now in sim/)
// and TS strictness. src/render/ may use Phaser/DOM; src/sim must be pure.

import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

const simPure = {
  files: ["src/sim/**/*.ts", "src/content/**/*.ts"],
  rules: {
    "no-restricted-globals": [
      "error",
      { name: "Math.random", message: "Math.random is banned in sim/. Use the seeded PRNG threaded through state." },
      { name: "Date.now", message: "Date.now is banned in sim/. Use the tick counter." },
    ],
  },
};

const testsGlobals = {
  files: ["tests/**/*.ts"],
  languageOptions: {
    globals: {
      vi: "readonly", describe: "readonly", it: "readonly", test: "readonly",
      expect: "readonly", beforeAll: "readonly", afterAll: "readonly",
      beforeEach: "readonly", afterEach: "readonly",
    },
  },
  rules: {
    "@typescript-eslint/no-explicit-any": "off",
  },
};

const renderGlobals = {
  files: ["src/render/**/*.ts", "src/main.ts", "tests/e2e/**/*.ts"],
  rules: {
    // DOM globals (HTMLElement, PointerEvent, ...) are provided by the TS DOM lib; ESLint
    // no-undef would force enumerating dozens of them. strict tsc already guards undefined
    // identifiers, so we rely on TS here rather than ESLint.
    "no-undef": "off",
  },
};

const nodeEnv = {
  files: ["config/**/*.{ts,mjs}", "vite.config.ts", "vitest.config.ts", "playwright.config.ts", "tests/**/*.{ts,mjs}"],
  languageOptions: {
    globals: {
      process: "readonly", console: "readonly", Buffer: "readonly",
      module: "readonly", require: "readonly", __dirname: "readonly",
      __filename: "readonly", global: "readonly", setTimeout: "readonly",
      setInterval: "readonly", clearTimeout: "readonly", clearInterval: "readonly",
    },
  },
};

export default [
  { ignores: ["dist/**", "node_modules/**", "playwright-report/**", "test-results/**", "coverage/**", ".git/**"] },
  js.configs.recommended,
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2022,
      sourceType: "module",
    },
    plugins: { "@typescript-eslint": tseslint },
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "no-unused-vars": "off",
      "no-constant-condition": ["error", { checkLoops: false }],
    },
  },
  nodeEnv,
  renderGlobals,
  simPure,
  testsGlobals,
];