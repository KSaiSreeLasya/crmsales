import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { createServer } from "./server";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    fs: {
      allow: [".", "./client", "./shared"],
      deny: [".env", ".env.*", "*.{crt,pem}", "**/.git/**", "server/**"],
    },
  },
  build: {
    outDir: "dist/spa",
  },
  plugins: [react(), expressPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
}));

function expressPlugin(): Plugin {
  let apiProxy: any;

  return {
    name: "express-plugin",
    apply: "serve",
    configureServer(server) {
      const app = createServer();

      // Store reference for use in resolveId/load hooks
      apiProxy = app;

      // Manually insert at the beginning of middleware stack
      if (server.middlewares.stack) {
        const layer = {
          handle: app,
          name: app.name || 'expressApp',
          regexp: /^\//,
          keys: [],
          method: undefined,
          path: undefined
        };
        server.middlewares.stack.unshift(layer);
      } else {
        // Fallback if stack doesn't exist
        server.middlewares.use(app);
      }
    },
  };
}
