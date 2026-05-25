import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "dist",
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("@tanstack")) return "query";
          if (id.includes("framer-motion")) return "motion";
          if (id.includes("lucide-react") || id.includes("react-icons")) return "icons";
          if (id.includes("react-router-dom")) return "router";
          if (id.includes("axios")) return "axios";
          if (id.includes("leaflet") || id.includes("react-leaflet")) return "leaflet";
          if (id.includes("react") || id.includes("react-dom")) return "vendor";
          return "misc";
        },
      },
    },
  },
  server: {
    port: 5173,
  },
});
