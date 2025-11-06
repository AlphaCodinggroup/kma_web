import next from "eslint-config-next";

export default [
  ...next,
  {
    ignores: [".next/**", "node_modules/**", "dist/**", "coverage/**"],
  },
  {
    name: "kma_web-custom",
    rules: {
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
];
