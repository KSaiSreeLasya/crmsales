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
  return {
    name: "express-plugin",
    apply: "serve", // Only apply during development (serve mode)
    configureServer(server) {
      const app = createServer();

      // Prepend the Express app to the middleware chain so it runs BEFORE Vite's SPA fallback
      // We need to add it at the beginning of the middleware stack
      server.middlewares.stack.unshift(
        ...server.middlewares.stack.splice(0, server.middlewares.stack.length - 1)
      );

      // Add Express app as first-priority middleware
      const originalUse = server.middlewares.use.bind(server.middlewares);
      server.middlewares.use = function(fn: any) {
        // Override to add at beginning instead of end
        if (fn === app) {
          // Add this specific app at the very beginning
          const layer = {
            handle: fn,
            name: fn.name || 'expressApp',
            regexp: /^\//,
            keys: [],
            method: undefined,
            path: undefined
          };
          this.stack.unshift(layer);
        } else {
          return originalUse(fn);
        }
      };

      server.middlewares.use(app);
    },
  };
}
