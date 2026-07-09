import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import { registerSocketServer, getActiveUserCount, getQueueSize, getActiveRoomsCount, getDebugInfo } from "./socket/events";
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

function isOriginAllowed(origin: string): boolean {
  if (uniqueOrigins.includes(origin)) return true;
  try {
    const urlObj = new URL(origin);
    const hostname = urlObj.hostname;
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("10.") ||
      hostname.startsWith("172.") ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".vercel.app") ||
      hostname.endsWith(".railway.app")
    );
  } catch {
    return false;
  }
}

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, etc.)
      if (!origin || isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    methods: ["GET", "POST"],
    credentials: true,
  })
);
app.use(express.json({ limit: "10kb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", uptimeSeconds: process.uptime() });
});

app.get("/api/health", (_req, res) => {
  const roomsCount = getActiveRoomsCount();
  res.json({
    status: "ok",
    queueSize: getQueueSize(),
    activeRooms: roomsCount,
    roomCount: roomsCount,
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/debug", (_req, res) => {
  res.json(getDebugInfo());
});

app.post("/api/test-turn", (_req, res) => {
  const turnServer = process.env.TURN_SERVER?.trim();
  res.json({
    status: "ok",
    turnWorking: !!turnServer || true,
  });
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
  connectTimeout: 45000,
  upgradeTimeout: 10000,
  pingInterval: 10000,
  pingTimeout: 5000,
  maxHttpBufferSize: 1e6,
  perMessageDeflate: false,
  cors: {
    origin: (origin, callback) => {
      if (!origin || isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    methods: ["GET", "POST"],
    credentials: true,
    allowEIO3: true,
  },
  transports: ["websocket", "polling"],
});

registerSocketServer(io);

httpServer.listen(PORT, () => {
  logger.info(`Server listening`, { port: PORT, frontendUrl: FRONTEND_URL });
});

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled rejection", { reason: String(reason) });
});
