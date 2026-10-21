import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Pixi.js и React — в отдельных чанках, чтобы кэшировались между деплоями
        manualChunks(id) {
          if (id.includes("node_modules/pixi.js") || id.includes("node_modules/@pixi")) return "pixi";
          if (id.includes("node_modules/react")) return "react";
        },
      },
    },
  },
});
