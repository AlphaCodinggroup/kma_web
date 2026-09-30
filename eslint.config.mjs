// Configuración flat de ESLint.
//
// No se usa `eslint-config-next` porque su entrada eslintrc aplica
// @rushstack/eslint-patch, incompatible con ESLint 9.39. En su lugar se
// declaran directamente los plugins que esa configuración agrupa.
import js from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import reactPlugin from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";

export default [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "dist/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
      "next-env.d.ts",
    ],
  },
  js.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
      globals: {
        // Navegador
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        localStorage: "readonly",
        sessionStorage: "readonly",
        fetch: "readonly",
        Request: "readonly",
        Response: "readonly",
        Headers: "readonly",
        FormData: "readonly",
        File: "readonly",
        Blob: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
        AbortController: "readonly",
        AbortSignal: "readonly",
        atob: "readonly",
        btoa: "readonly",
        crypto: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        queueMicrotask: "readonly",
        console: "readonly",
        HTMLElement: "readonly",
        HTMLInputElement: "readonly",
        HTMLDivElement: "readonly",
        HTMLTableElement: "readonly",
        HTMLButtonElement: "readonly",
        HTMLFormElement: "readonly",
        HTMLImageElement: "readonly",
        HTMLTextAreaElement: "readonly",
        HTMLSelectElement: "readonly",
        HTMLAnchorElement: "readonly",
        HTMLParagraphElement: "readonly",
        HTMLSpanElement: "readonly",
        HTMLHeadingElement: "readonly",
        HTMLTableRowElement: "readonly",
        HTMLTableCellElement: "readonly",
        HTMLTableSectionElement: "readonly",
        HTMLUListElement: "readonly",
        HTMLLIElement: "readonly",
        HTMLLabelElement: "readonly",
        Event: "readonly",
        KeyboardEvent: "readonly",
        MouseEvent: "readonly",
        // Node / Next server runtime
        process: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        globalThis: "readonly",
        // Tests
        vi: "readonly",
        describe: "readonly",
        it: "readonly",
        expect: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      "@next/next": nextPlugin,
      react: reactPlugin,
      "react-hooks": reactHooks,
      "jsx-a11y": jsxA11y,
    },
    settings: { react: { version: "detect" } },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      ...reactHooks.configs.recommended.rules,

      // TypeScript ya cubre estas; en TS producen falsos positivos.
      "no-undef": "off",
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // El código nuevo no debe introducir any ni logs de depuración.
      "@typescript-eslint/no-explicit-any": "warn",
      "no-console": ["error", { allow: ["warn", "error"] }],

      // Accesibilidad mínima en formularios y controles.
      "jsx-a11y/alt-text": "warn",
      "jsx-a11y/anchor-is-valid": "warn",
      "jsx-a11y/label-has-associated-control": "warn",
    },
  },
  {
    // Los tests pueden usar console y tipos laxos.
    files: ["**/__tests__/**", "**/*.test.{ts,tsx}", "e2e/**"],
    rules: {
      "no-console": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];
