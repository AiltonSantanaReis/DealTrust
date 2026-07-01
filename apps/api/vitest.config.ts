import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@dealtrust/db": fileURLToPath(new URL("../../packages/db/src/index.ts", import.meta.url))
    }
  }
});
