import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Gitignored local working dirs. ESLint doesn't read .gitignore, so
    // without these a local `npm run lint` reports thousands of problems in
    // generated or third-party code that is never committed.
    "ds-bundle/**",
    ".ds-sync/**",
    "prototypes/**",
  ]),
]);

export default eslintConfig;
