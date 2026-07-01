import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@dealtrust/contracts": fileURLToPath(
        new URL("../../packages/contracts/src/index.ts", import.meta.url)
      ),
      "@dealtrust/db": fileURLToPath(new URL("../../packages/db/src/index.ts", import.meta.url))
    }
  }
});
