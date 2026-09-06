import { defineConfig } from "vitest/config";
import base from "./vitest.config";

export default defineConfig({
  ...base,
  test: {
    ...base.test,
    coverage: {
      ...base.test?.coverage,
      provider: "v8",
      reportsDirectory: "./coverage/bff",
      include: ["app/api/**/*.{ts,tsx}"],
    },
  },
});
