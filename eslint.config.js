import js from "@eslint/js";
import globals from "globals";
import prettier from "eslint-config-prettier";

export default [
  // Ignore patterns
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/.code-analysis/**",
      "**/.code-analysis-example/**",
      "**/coverage/**",
    ],
  },

  // Base config for all JS files
  {
    files: ["**/*.js", "**/*.jsx"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
        ...globals.es2021,
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-console": "off", // We use a centralized logger, but allow console for now
      "prefer-const": "warn",
      "no-var": "error",
    },
  },

  // Backend-specific config
  {
    files: ["backend/**/*.js", "bin/**/*.js"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "no-process-exit": "warn",
    },
  },

  // Frontend-specific config
  {
    files: ["frontend/**/*.js", "frontend/**/*.jsx"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      "react/prop-types": "off", // Turn off if not using prop-types
      "react/react-in-jsx-scope": "off", // Not needed in React 17+
    },
  },

  // Prettier config (must be last to override other configs)
  prettier,
];
