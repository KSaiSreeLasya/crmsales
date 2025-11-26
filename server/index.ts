import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { handleSyncLeads } from "./routes/sync-leads";
import { handleSyncLeadsDynamic } from "./routes/sync-leads-dynamic";
import { handleSyncSalespersons } from "./routes/sync-salespersons";
import { handleFetchGoogleSheet } from "./routes/fetch-google-sheet";
import { handleFetchGoogleSheetsMetadata } from "./routes/fetch-google-sheets-metadata";
import { handleSyncGoogleSheet } from "./routes/sync-google-sheet";
import { handleGetUserProfile } from "./routes/get-user-profile";

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

  app.get("/api/demo", handleDemo);
  app.get("/api/user-profile", handleGetUserProfile);

  // Google Sheets API routes
  app.get("/api/fetch-google-sheet", handleFetchGoogleSheet);
  app.get("/api/fetch-google-sheets-metadata", handleFetchGoogleSheetsMetadata);
  app.post("/api/sync-google-sheet", handleSyncGoogleSheet);

  // CRM API routes
  app.post("/api/sync-leads", handleSyncLeads);
  app.post("/api/sync-leads-dynamic", handleSyncLeadsDynamic);
  app.post("/api/sync-salespersons", handleSyncSalespersons);

  return app;
}
