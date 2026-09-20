import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  build: {
    outDir: "dist/client",
  },
  optimizeDeps: {
    include: ["react", "react-dom/client"],
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: ["terminal.local"],
    warmup: {
      clientFiles: ["./src/main.jsx"],
    },
    // Stands in for api/jev.js so `npm run dev` reaches Jev the same way the
    // deployed app does. TypeSafe blocks the browser's preflight, not the POST.
    proxy: {
      "/api/jev": {
        target: "https://api.typesafe.ai",
        changeOrigin: true,
        rewrite: () => "/v1/systemone",
      },
    },
  },
  plugins: [react()],
});
