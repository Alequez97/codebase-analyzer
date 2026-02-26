import js from "@eslint/js";
import globals from "globals";
import prettier from "eslint-config-prettier";
import react from "eslint-plugin-react";
import unusedImports from "eslint-plugin-unused-imports";

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
    plugins: {
      "unused-imports": unusedImports,
    },
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
      "no-unused-vars": "off", // Replaced by unused-imports/no-unused-vars
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "error",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],
      "no-console": "off", // We use a centralized logger, but allow console for now
      "prefer-const": "error",
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
      "no-process-exit": "off",
    },
  },

  // Frontend-specific config
  {
    files: ["frontend/**/*.js", "frontend/**/*.jsx"],
    plugins: {
      react,
    },
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
      "react/jsx-no-undef": "error",
      "react/jsx-uses-vars": "error",
      "react/jsx-uses-react": "off", // Not needed with the new JSX transform
      "react/react-in-jsx-scope": "off", // Not needed in React 17+
    },
  },

  // Prettier config (must be last to override other configs)
  prettier,
];
