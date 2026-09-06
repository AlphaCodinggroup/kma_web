import { defineConfig } from "vitest/config";
import base from "./vitest.config";

export default defineConfig({
  ...base,
  test: {
    ...base.test,
    coverage: {
      ...base.test?.coverage,
      provider: "v8",
      reportsDirectory: "./coverage/web",
      include: ["app/**/*.{ts,tsx}", "src/**/*.{ts,tsx}"],
      exclude: [
        ...(base.test?.coverage?.exclude ?? []),
        "app/api/**",
      ],
    },
  },
});
