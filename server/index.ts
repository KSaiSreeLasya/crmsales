import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { handleSyncLeads } from "./routes/sync-leads";
import { handleSyncSalespersons } from "./routes/sync-salespersons";

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

  // CRM API routes
  app.post("/api/sync-leads", handleSyncLeads);
  app.post("/api/sync-salespersons", handleSyncSalespersons);

  return app;
}
