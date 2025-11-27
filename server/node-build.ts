import { fileURLToPath } from "url";
import path from "path";
import { createServer } from "./index";

const app = createServer();
const port = process.env.PORT || 3000;
const host = process.env.HOST || "0.0.0.0";

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.listen(port, host, () => {
  console.log(`🚀 Fusion Starter server running on port ${port}`);
  console.log(`📱 Frontend: http://localhost:${port}`);
  console.log(`🔧 API: http://localhost:${port}/api`);
  console.log(`✅ Supabase configured: ${process.env.VITE_SUPABASE_URL ? "Yes" : "No"}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("🛑 Received SIGTERM, shutting down gracefully");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("🛑 Received SIGINT, shutting down gracefully");
  process.exit(0);
});
