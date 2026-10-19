import coreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

/**
 * ESLint flat config.
 *
 * eslint-config-next 16 ships native flat configs, so these are spread
 * directly. Do not route them through @eslint/eslintrc's FlatCompat — the
 * shared React plugin object is circular and FlatCompat's validator throws
 * "Converting circular structure to JSON" on it.
 */
export default [
  ...coreWebVitals,
  ...nextTypescript,
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "migrations/_legacy-postgres/**",
      "public/service-worker.js",
      "next-env.d.ts",
    ],
  },
  {
    rules: {
      /*
       * BASELINE POLICY
       *
       * Lint was introduced to a codebase that had never run it, so a straight
       * adoption produced 88 errors and 652 warnings. A permanently red build
       * is one nobody reads, so pre-existing categories are demoted to
       * warnings and listed here as tracked debt. They are still reported —
       * they just don't fail CI, so a genuinely new error stands out.
       *
       * Promote these back to "error" as each category is cleaned up.
       */

      // ~85 occurrences.
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // 55 occurrences — almost all are apostrophes in copy. Cosmetic.
      "react/no-unescaped-entities": "warn",
      // 19 occurrences. Real debt: setState inside an effect causes a second
      // render pass and often signals derived state that should be computed
      // during render. Worth fixing, not worth blocking on today.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/purity": "warn",
      "@typescript-eslint/no-empty-object-type": "warn",
      // tailwind.config.ts legitimately uses require() for plugins.
      "@typescript-eslint/no-require-imports": "warn",

      // next/image is the right default, but the admin panel renders
      // admin-supplied remote URLs where a plain <img> is correct.
      "@next/next/no-img-element": "off",
    },
  },
];
