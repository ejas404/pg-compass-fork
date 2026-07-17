import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";
import pluginReactHooks from "eslint-plugin-react-hooks";
import pluginReact from "eslint-plugin-react";
import pluginJsxA11y from "eslint-plugin-jsx-a11y";
import globals from "globals";
import { config as baseConfig } from "./base.js";

/**
 * A custom ESLint configuration for libraries that use React.
 *
 * @type {import("eslint").Linter.Config[]} */
export const config = [
  ...baseConfig,
  js.configs.recommended,
  eslintConfigPrettier,
  ...tseslint.configs.recommended,
  pluginReact.configs.flat.recommended,
  {
    languageOptions: {
      ...pluginReact.configs.flat.recommended.languageOptions,
      globals: {
        ...globals.serviceworker,
        ...globals.browser,
      },
    },
  },
  {
    plugins: {
      "jsx-a11y": pluginJsxA11y,
      "react-hooks": pluginReactHooks,
    },
    settings: { react: { version: "detect" } },
    rules: {
      ...pluginReactHooks.configs.recommended.rules,
      ...pluginJsxA11y.flatConfigs.recommended.rules,
      // React scope no longer necessary with new JSX transform.
      "react/react-in-jsx-scope": "off",
    },
  },
  {
    files: [
      "**/components/help/keyboard-shortcuts-dialog.tsx",
      "**/components/workspace/renderers/{date-time-editor,foreign-key-editor}.tsx",
      "**/components/workspace/table-viewer/editable-cell.tsx",
    ],
    rules: {
      // These transient dialogs/editors intentionally focus their primary
      // control when opened.
      "jsx-a11y/no-autofocus": "off",
    },
  },
  {
    files: ["**/components/ui/**/*.{ts,tsx}"],
    rules: {
      // Generated shadcn primitives cannot statically know the consumer's
      // htmlFor/control relationship.
      "jsx-a11y/label-has-associated-control": "off",
    },
  },
];
