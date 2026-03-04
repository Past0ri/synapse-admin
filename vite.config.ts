import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const synapseTarget = env.VITE_SYNAPSE_TARGET ?? "http://localhost:8008";
  const appVersion = process.env.npm_package_version ?? "dev";

  return ({
  plugins: [
    react(),
  ],
  server: {
    host: "0.0.0.0",
    port: 4000,
    strictPort: true,
    proxy: {
      "/_synapse": {
        target: synapseTarget,
        changeOrigin: true,
        configure: proxy => {
          proxy.on("error", err => {
            console.error("Vite proxy error for /_synapse:", err.message);
          });
        },
      },
      "/_matrix": {
        target: synapseTarget,
        changeOrigin: true,
        configure: proxy => {
          proxy.on("error", err => {
            console.error("Vite proxy error for /_matrix:", err.message);
          });
        },
      },
    },
  },
  base: "./",
  define: {
    __SYNAPSE_ADMIN_VERSION__: JSON.stringify(appVersion),
  },
  build: {
    chunkSizeWarningLimit: 1500,
    sourcemap: mode === "development",
  },
  test: {
    globals: true,
    environment: "happy-dom",
    setupFiles: "./src/vitest.setup.ts",
  },
  ssr: {
    noExternal: ["react-dropzone", "react-admin", "ra-ui-materialui"],
  },
});
});
