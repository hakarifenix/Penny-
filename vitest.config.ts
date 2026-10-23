import { defineConfig } from "vitest/config";

export default defineConfig({
  // Let esbuild transform any TSX encountered without pulling in the React
  // plugin (which conflicts with vitest's bundled Vite types).
  esbuild: { jsx: "automatic" },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    css: false,
  },
});
