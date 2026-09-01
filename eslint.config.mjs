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
    // Local agent libraries and private config live beside the app in this
    // workspace, but they are not application source and should not make
    // the site's validation or editor tooling scan hundreds of scripts.
    ".agents/**",
    ".claude/**",
    ".codex/**",
  ]),
]);

export default eslintConfig;
