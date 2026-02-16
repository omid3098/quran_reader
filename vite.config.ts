import path from "path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  return {
    base: "/quran_reader/",
    server: {
      port: 3000,
      host: "0.0.0.0",
    },
    plugins: [react()],
    define: {
      "process.env.API_KEY": JSON.stringify(env.GEMINI_API_KEY),
      "process.env.GEMINI_API_KEY": JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "."),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            // Core React - loaded immediately
            "vendor-react": ["react", "react-dom"],
            // BlockNote + Mantine - lazy loaded with note modals
            "vendor-blocknote": [
              "@blocknote/core",
              "@blocknote/react",
              "@blocknote/mantine",
              "@mantine/core",
            ],
            // Icons - can be deferred
            "vendor-icons": ["lucide-react"],
            // ReactFlow - lazy loaded with NodeReader view only
            "vendor-xyflow": ["@xyflow/react"],
          },
        },
      },
    },
  };
});
