import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

const geojsonPlugin = {
  name: "vite-plugin-geojson",
  transform(code: string, id: string) {
    if (id.endsWith(".geojson")) {
      return {
        code: `export default ${code}`,
        map: null,
      };
    }
  },
};

export default defineConfig({
  plugins: [react(), geojsonPlugin],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./__tests__/setup.ts"],
    include: ["__tests__/**/*.test.{ts,tsx}"],
    testTimeout: 15000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
