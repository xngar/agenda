import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
      // El paquete real lanza al importarse fuera de un Server Component,
      // con lo cual los módulos de servidor no se pueden probar.
      "server-only": fileURLToPath(
        new URL("./tests/stubs/server-only.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["tests/**/*.test.{ts,tsx}"],
    // playwright vive en e2e/, no entra aquí.
    exclude: ["node_modules/**", ".next/**", "e2e/**"],
  },
});