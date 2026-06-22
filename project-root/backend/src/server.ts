import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import { registerSocketServer, getActiveUserCount } from "./socket/events";
import { getIceServers } from "./webrtc/peer";
import { logger } from "./utils/logger";
import type { ClientToServerEvents, ServerToClientEvents } from "./types";

const PORT = Number(process.env.PORT ?? 3001);
const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:3000";

const allowedOrigins = [
  "http://localhost:3000",
  "https://stranger-wave-omegle-style-chat.vercel.app",
  FRONTEND_URL
];
const uniqueOrigins = Array.from(new Set(allowedOrigins.filter(Boolean)));

const app = express();

const isDev = process.env.NODE_ENV !== "production";

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, etc.)
      if (!origin) {
        callback(null, true);
        return;
      }
      if (uniqueOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      if (isDev) {
        try {
          const hostname = new URL(origin).hostname;
          const isLocal =
            hostname === "localhost" ||
            hostname === "127.0.0.1" ||
            hostname.startsWith("192.168.") ||
            hostname.startsWith("10.") ||
            hostname.startsWith("172.") ||
            hostname.endsWith(".local");
          if (isLocal) {
            callback(null, true);
            return;
          }
        } catch {
          // ignore parsing error
        }
      }
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    methods: ["GET", "POST"],
    credentials: true,
  })
);
app.use(express.json({ limit: "10kb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", uptimeSeconds: process.uptime() });
});

// Frontend fetches this once on load to build its RTCPeerConnection config,
// so TURN credentials are only ever read from server-side env vars.
app.get("/api/ice-servers", (_req, res) => {
  res.json({ iceServers: getIceServers() });
});

app.get("/api/online-count", (_req, res) => {
  res.json({ count: getActiveUserCount() });
});

const httpServer = createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      if (uniqueOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      if (isDev) {
        try {
          const hostname = new URL(origin).hostname;
          const isLocal =
            hostname === "localhost" ||
            hostname === "127.0.0.1" ||
            hostname.startsWith("192.168.") ||
            hostname.startsWith("10.") ||
            hostname.startsWith("172.") ||
            hostname.endsWith(".local");
          if (isLocal) {
            callback(null, true);
            return;
          }
        } catch {
          // ignore parsing error
        }
      }
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    methods: ["GET", "POST"],
    credentials: true,
  },
  // Generous but bounded - prevents a single hung connection from lingering forever.
  pingTimeout: 20_000,
  pingInterval: 10_000,
});

registerSocketServer(io);

httpServer.listen(PORT, () => {
  logger.info(`Server listening`, { port: PORT, frontendUrl: FRONTEND_URL });
});

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled rejection", { reason: String(reason) });
});
