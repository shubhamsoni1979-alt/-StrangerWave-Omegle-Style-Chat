const { io } = require('socket.io-client');

const BACKEND_URL = "https://strangerwave-omegle-style-chat-production.up.railway.app";
console.log("Connecting sockets to:", BACKEND_URL);

const socket1 = io(BACKEND_URL, { transports: ["websocket"] });
const socket2 = io(BACKEND_URL, { transports: ["websocket"] });

let s1Connected = false;
let s2Connected = false;

function checkReady() {
  if (s1Connected && s2Connected) {
    console.log("Both connected! Emitting 'find-partner'...");
    socket1.emit('find-partner');
    socket2.emit('find-partner');
  }
}

socket1.on('connect', () => {
  console.log("Socket 1 connected:", socket1.id);
  s1Connected = true;
  checkReady();
});

socket2.on('connect', () => {
  console.log("Socket 2 connected:", socket2.id);
  s2Connected = true;
  checkReady();
});

socket1.on('queue-joined', () => console.log("Socket 1 joined queue"));
socket2.on('queue-joined', () => console.log("Socket 2 joined queue"));

socket1.on('partner-found', (data) => {
  console.log("Socket 1 MATCHED!", data);
  finish();
});

socket2.on('partner-found', (data) => {
  console.log("Socket 2 MATCHED!", data);
  finish();
});

socket1.on('connect_error', (err) => console.error("Socket 1 error:", err.message));
socket2.on('connect_error', (err) => console.error("Socket 2 error:", err.message));

let done = false;
function finish() {
  if (done) return;
  done = true;
  console.log("Test finished! Disconnecting...");
  socket1.disconnect();
  socket2.disconnect();
  process.exit(0);
}

setTimeout(() => {
  console.log("Timeout! Matchmaking failed to pair.");
  socket1.disconnect();
  socket2.disconnect();
  process.exit(1);
}, 10000);
