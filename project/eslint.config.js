import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";
import pluginReactRefresh from "eslint-plugin-react-refresh";

export default tseslint.config(
  {
    ignores: ["dist", "node_modules", "eslint.config.js", ".netlify"],
  },
  // TypeScript parser + recommended type-checked rules
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{js,jsx,mjs,cjs,ts,tsx}"],
    plugins: {
      "react": pluginReact,
      "react-hooks": pluginReactHooks,
      "react-refresh": pluginReactRefresh,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      ...pluginReact.configs.recommended.rules,
      ...pluginReactHooks.configs.recommended.rules,

      // ── React ──────────────────────────────────────────────────────────
      "react-refresh/only-export-components": "warn",
      "react/react-in-jsx-scope": "off",        // Not needed in React 17+
      "react/prop-types": "off",                // Replaced by TypeScript types
      "react/no-unescaped-entities": "off",     // Portuguese text has lots of quotes — pure noise

      // ── React Hooks ────────────────────────────────────────────────────
      "react-hooks/rules-of-hooks": "error",    // Catches runtime crashes — keep strict
      "react-hooks/exhaustive-deps": "warn",    // Good practice, not urgent

      // ── TypeScript ─────────────────────────────────────────────────────
      "@typescript-eslint/no-explicit-any": "warn",       // Common in this codebase, not a crash risk
      "no-unused-vars": "off",                            // Disable base rule (TS version handles it)
      "@typescript-eslint/no-unused-vars": "warn",        // Tech debt, not urgent
      "@typescript-eslint/no-empty-object-type": "warn",
      "@typescript-eslint/ban-ts-comment": "warn",        // @ts-nocheck should be reviewed, not blocked
      "@typescript-eslint/no-unused-expressions": "warn",
      "react/display-name": "warn",                       // Not a crash risk

      // ── General ────────────────────────────────────────────────────────
      "prefer-const": "off",   // Legado já tem muito let — não vale manter como erro
    },
  },
);
