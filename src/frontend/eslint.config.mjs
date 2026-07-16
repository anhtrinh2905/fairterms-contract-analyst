import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Ported design (FairTerms) — faithful port of a plain-CSS React mockup.
  // Relax a few rules that fight Vietnamese punctuation and the mockup's
  // use of plain <img> for decorative, rotated product screenshots.
  {
    files: ["app/fairterms/**/*.{ts,tsx}", "app/landing/**/*.{ts,tsx}"],
    rules: {
      "react/no-unescaped-entities": "off",
      "@next/next/no-img-element": "off",
      // The app is a client-only SPA that bootstraps persisted state
      // (auth/theme from localStorage) on mount to stay hydration-safe.
      "react-hooks/set-state-in-effect": "off",
      // Landing CTAs use full-page navigation to /app on purpose, so the
      // landing's global CSS doesn't carry over into the app shell.
      "@next/next/no-html-link-for-pages": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
