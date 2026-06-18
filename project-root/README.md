# StrangerWave — Random Video Chat (Omegle-style)

A from-scratch, no-login random video chat app: Nuxt 3 + Vue 3 + Pinia frontend,
Node/Express + Socket.io signaling backend, peer-to-peer WebRTC media. No database,
no Redis, no Docker — matchmaking lives entirely in memory in the Node process.

```
project-root/
├── frontend/   # Nuxt 3 app (UI, WebRTC client logic, Pinia stores)
├── backend/    # Express + Socket.io signaling/matchmaking server
└── README.md
```

## 1. Requirements

- Node.js 18+
- Two terminal tabs (one for `backend/`, one for `frontend/`)
- A browser that supports WebRTC (any modern Chrome/Firefox/Edge/Safari) and HTTPS in production (browsers block camera/mic access on plain HTTP except on `localhost`)

## 2. Install & run — backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev        # starts on http://localhost:3001 with hot reload (tsx)
```

`npm run build && npm start` builds and runs the compiled JS for production.

## 3. Install & run — frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev         # starts on http://localhost:3000
```

Open `http://localhost:3000`, accept the entry gate, and you're in the matchmaking queue.
Open a second private/incognito browser window to test matching with yourself.

## 4. Environment variables

**backend/.env**

| Variable | Purpose |
|---|---|
| `PORT` | Port the signaling server listens on |
| `FRONTEND_URL` | Allowed CORS origin for both Express and Socket.io |
| `TURN_SERVER`, `TURN_USERNAME`, `TURN_PASSWORD` | Optional TURN relay (see §6) |
| `MAX_MESSAGE_LENGTH` | Hard cap on chat message length |
| `MAX_MESSAGES_PER_10S`, `MAX_FIND_PARTNER_PER_10S` | Rate limit thresholds |
| `QUEUE_MATCH_INTERVAL_MS` | Backstop matching sweep interval |
| `STALE_SOCKET_TIMEOUT_MS` | How long before an unresponsive socket is evicted |

**frontend/.env**

| Variable | Purpose |
|---|---|
| `NUXT_PUBLIC_BACKEND_URL` | URL of the Socket.io/signaling server |

## 5. How matchmaking works

- `backend/src/matchmaking/queue.ts` is a plain array + Set acting as a FIFO waiting room.
- `backend/src/matchmaking/matcher.ts` pulls two waiting sockets and creates a `ChatRoom`,
  preferring a partner the user hasn't *just* talked to (tracked per-session, last 5 partners)
  to avoid annoying back-to-back rematches, while falling back gracefully so nobody gets stuck
  waiting forever in a small pool.
- A socket can never match itself (it's filtered out of its own candidate list), and a room is
  only ever created by removing both members from the queue atomically in the same function call,
  so duplicate/overlapping matches aren't possible.
- A periodic sweep (`QUEUE_MATCH_INTERVAL_MS`) re-attempts matching for everyone still queued, and
  a separate stale-socket sweep (`STALE_SOCKET_TIMEOUT_MS`) cleans up sessions whose underlying
  socket died without a clean `disconnect` event (flaky networks, killed tabs, etc).

## 6. WebRTC explained

1. Each client requests camera/mic access (`useWebRTC.requestLocalMedia`) and creates an
   `RTCPeerConnection` once matched, seeded with ICE servers fetched from the backend's
   `GET /api/ice-servers` (so TURN credentials live only in backend env vars, never in the
   frontend bundle).
2. The socket pair that gets matched is assigned an "initiator" (lower socket id) who creates
   and sends the SDP **offer**; the other side replies with an **answer**.
3. Both sides exchange **ICE candidates** as they're discovered, relayed unmodified through the
   Socket.io server (`backend/src/socket/signaling.ts`) — the server never sees decoded media,
   only signaling metadata.
4. Once ICE negotiation completes, video/audio flows **directly peer-to-peer** between the two
   browsers (or through a TURN relay if direct connectivity fails).

### TURN server

Public STUN (`stun:stun.l.google.com:19302`) is enough to discover your own public IP, but it
cannot relay media — calls between users on symmetric NATs/strict corporate firewalls/some
mobile carriers will fail without a TURN server. For production, run your own (e.g. [coturn](https://github.com/coturn/coturn))
or use a managed provider, then set `TURN_SERVER` (e.g. `turn:turn.example.com:3478`),
`TURN_USERNAME`, and `TURN_PASSWORD` in `backend/.env`. No frontend changes are needed — the
client fetches this config at runtime from `/api/ice-servers`.

## 7. Security measures implemented

- **Rate limiting**: sliding-window limiter (`backend/src/middleware/rateLimit.ts`) on
  `find-partner`, `send-message`, and `typing`.
- **Input validation**: message length capped server-side regardless of what the client sends;
  malformed offer/answer/candidate payloads are dropped instead of relayed.
- **XSS prevention**: chat text is rendered as plain text in Vue (never `v-html`), and the server
  additionally strips control characters and escapes `<`/`>` defensively.
- **CORS**: both REST and Socket.io are restricted to `FRONTEND_URL`.
- **Socket cleanup**: every disconnect (clean or stale) releases queue slots, room state, and
  rate-limit buckets so memory doesn't grow unbounded under churn.
- **Report control**: a `report-partner` event immediately ends the chat and logs the report
  server-side (see §8 — this is a stub, not a moderation pipeline).

## 8. Before you deploy this publicly — read this

This codebase implements the feature list you'd ask for in a "build an Omegle clone" brief, and
nothing more. **Anonymous, random-matched, no-login video chat with strangers has a well-documented
history of being used to expose minors to sexual content and adult predators** — this is the
core reason the original Omegle shut down in 2023 amid lawsuits alleging exactly that. Shipping
this app to real, public users in this state would recreate the same risk surface. At minimum,
before any public launch you should add:

- **Real age assurance**, not a self-attested checkbox — this MVP's terms gate (`pages/index.vue`)
  is a placeholder, not a safeguard.
- **Content moderation**: automated nudity/CSAM-detection on video frames (e.g. via a hashing/ML
  moderation API) and text-message filtering, with a human review queue for reports.
- **A real reporting/escalation pipeline**: the `report-partner` event here only ends the call and
  writes a log line — it is not connected to any moderation team, blocklist, or law-enforcement
  reporting workflow (in the US, providers are legally required to report CSAM to NCMEC via
  CyberTipline; consult counsel for your jurisdiction's obligations before launch).
- **Abuse/ban infrastructure**: this app has no persistence at all, so there's no way to ban a
  device, IP, or repeat offender between sessions — that requires *some* durable store, which
  trades off against the "no database" constraint in the original brief.
- **Terms of Service, Privacy Policy, and a minimum-age policy** reviewed by a lawyer, plus a
  jurisdiction-appropriate compliance review (e.g. COPPA in the US, GDPR-K in the EU).

None of the above is implemented here — this repo is a learning/prototyping scaffold for the
matchmaking + WebRTC + Socket.io mechanics, not a launch-ready product.

## 9. Deployment guide (once the above is addressed)

- **Backend**: deploy `backend/` to any Node host (Render, Fly.io, a VPS, etc.) behind HTTPS/WSS.
  Set `FRONTEND_URL` to your deployed frontend's exact origin. Socket.io needs sticky
  sessions/affinity if you ever run more than one backend instance, since matchmaking state is
  in-memory and not shared across processes.
- **Frontend**: `npm run build` produces a Node server output (`.output/`) you can deploy to any
  Node host, or `npm run generate` for a static build if you don't need SSR. Set
  `NUXT_PUBLIC_BACKEND_URL` to your backend's public HTTPS URL.
- **HTTPS is mandatory**: browsers refuse `getUserMedia` on non-localhost HTTP origins, and
  WebRTC connectivity is meaningfully worse without `wss://` for signaling.

## 10. Troubleshooting

| Symptom | Likely cause |
|---|---|
| Camera/mic prompt never appears | Site isn't on HTTPS (or `localhost`); browser previously denied permission — check site settings |
| Stuck on "Looking for someone to talk to…" | Only one tab/socket connected — open a second browser/incognito window, or check the backend logs for errors |
| Connects but no video/audio | Likely a NAT traversal failure — configure a TURN server (§6); check `chrome://webrtc-internals` for ICE failures |
| "Disconnected" badge constantly flashing | `NUXT_PUBLIC_BACKEND_URL` mismatch, or backend CORS `FRONTEND_URL` doesn't match the frontend's actual origin |
| Messages not appearing for one side | Confirm both sockets are still in the same `roomId` — check backend logs around `matched`/`partner-left` |
