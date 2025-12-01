import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { handleDemo } from "./routes/demo";
import { handleSyncLeads } from "./routes/sync-leads";
import { handleSyncLeadsDynamic } from "./routes/sync-leads-dynamic";
import { handleSyncSalespersons } from "./routes/sync-salespersons";
import { handleFetchGoogleSheet } from "./routes/fetch-google-sheet";
import { handleFetchGoogleSheetApi } from "./routes/fetch-google-sheet-api";
import { handleFetchGoogleSheetsMetadata } from "./routes/fetch-google-sheets-metadata";
import { handleSyncGoogleSheet } from "./routes/sync-google-sheet";
import { handleGetUserProfile } from "./routes/get-user-profile";
import { handleLogin } from "./routes/login";
import { handleBatchUpdateLeads } from "./routes/batch-update-leads";
import {
  handleCreateUser,
  handleDeleteUser,
  handleUpdatePassword,
} from "./routes/admin-users";
import { handleTestSupabase } from "./routes/test-supabase";
import { handleDiagnoseGoogleSheet } from "./routes/diagnose-google-sheet";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/debug/env", (_req, res) => {
    res.json({
      supabaseUrl: process.env.VITE_SUPABASE_URL ? "✅ SET" : "❌ MISSING",
      supabaseKey: process.env.VITE_SUPABASE_ANON_KEY ? "✅ SET" : "❌ MISSING",
    });
  });

  app.get("/api/test-supabase", handleTestSupabase);
  app.get("/api/demo", handleDemo);
  app.post("/api/login", handleLogin);
  app.get("/api/user-profile", handleGetUserProfile);

  // Google Sheets API routes
  app.get("/api/fetch-google-sheet", handleFetchGoogleSheet);
  app.get("/api/fetch-google-sheet-api", handleFetchGoogleSheetApi);
  app.get("/api/fetch-google-sheets-metadata", handleFetchGoogleSheetsMetadata);
  app.post("/api/sync-google-sheet", handleSyncGoogleSheet);
  app.get("/api/diagnose-google-sheet", handleDiagnoseGoogleSheet);

  // CRM API routes
  app.post("/api/sync-leads", handleSyncLeads);
  app.post("/api/sync-leads-dynamic", handleSyncLeadsDynamic);
  app.post("/api/sync-salespersons", handleSyncSalespersons);
  app.post("/api/batch-update-leads", handleBatchUpdateLeads);

  // Admin routes for user management
  app.post("/api/admin/create-user", handleCreateUser);
  app.post("/api/admin/delete-user", handleDeleteUser);
  app.post("/api/admin/update-password", handleUpdatePassword);

  // Serve static files from dist/spa in production
  // When running from dist/server/node-build.mjs, we need to go up 2 levels to reach dist/spa
  const distPath = path.join(__dirname, "../spa");
  const indexPath = path.join(distPath, "index.html");

  console.log("Static files path:", distPath);
  console.log("Index.html exists:", fs.existsSync(indexPath));

  if (fs.existsSync(indexPath)) {
    // Only serve static files and SPA fallback if dist/spa exists (production mode)
    app.use(express.static(distPath, { maxAge: "1h" }));
    console.log("✅ Serving static files from:", distPath);

    // SPA fallback - serve index.html for all non-API routes
    app.get(/^(?!\/api)/, (_req, res) => {
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error("Error serving index.html:", err);
          res.status(404).send("Not found");
        }
      });
    });
  } else {
    console.warn("⚠️ dist/spa not found - serving in dev mode");
  }

  // Error handler - ensure API errors return JSON
  app.use((err: any, req: any, res: any, _next: any) => {
    console.error("Server error:", err);
    if (req.path.startsWith("/api")) {
      res.setHeader("Content-Type", "application/json");
      res.status(err.status || 500).json({
        error: err.message || "Internal server error",
        message: err.message || "Unknown error",
      });
    } else {
      // Let frontend handle non-API routes
      res
        .status(err.status || 500)
        .send(err.message || "Internal server error");
    }
  });

  // 404 handler - only for API routes
  app.use((req: any, res: any) => {
    if (req.path.startsWith("/api")) {
      res.setHeader("Content-Type", "application/json");
      res.status(404).json({
        error: "Not found",
        message: "The requested endpoint does not exist",
      });
    } else {
      // Don't handle non-API routes - let the frontend handle them
      res.status(404).send("Not found");
    }
  });

  return app;
}
