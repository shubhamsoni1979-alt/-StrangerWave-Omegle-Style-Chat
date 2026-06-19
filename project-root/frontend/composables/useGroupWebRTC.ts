import { ref, shallowRef, watch } from "vue";
import { useSocket } from "./useSocket";
import type { IceServerConfig } from "~/types/webrtc";
import type { RTCIceCandidateLike, RTCSessionDescriptionLike } from "~/types/socket";

export function useGroupWebRTC() {
  const config = useRuntimeConfig();
  const { connect, disconnect, getSocket } = useSocket();

  const localStream = shallowRef<MediaStream | null>(null);
  // Map of peer socketId to MediaStream
  const remoteStreams = ref<Map<string, MediaStream>>(new Map());
  // Map of peer socketId to RTCPeerConnection
  const peerConnections = new Map<string, RTCPeerConnection>();
  
  const myUserId = ref<string>("");
  const roomCode = ref<string>("");
  const participants = ref<{ socketId: string; userId: string }[]>([]);
  const messages = ref<{ id: string; fromUserId: string; text: string; at: number; isMe: boolean }[]>([]);
  const connectionError = ref<string | null>(null);

  // Helper: fetch ICE servers configuration from backend
  async function fetchIceServers(): Promise<IceServerConfig[]> {
    let url = config.public.backendUrl;
    if (typeof window !== "undefined" && window.location.hostname !== "localhost") {
      if (!url || url.includes("localhost")) {
        url = "https://strangerwave-omegle-style-chat-production.up.railway.app";
      }
    }
    if (url && !url.startsWith("http://") && !url.startsWith("https://")) {
      url = `https://${url}`;
    }
    try {
      const res = await $fetch<{ iceServers: IceServerConfig[] }>("/api/ice-servers", {
        baseURL: url,
      });
      return res.iceServers;
    } catch {
      return [{ urls: "stun:stun.l.google.com:19302" }];
    }
  }

  // Request camera and mic
  async function requestLocalMedia(): Promise<MediaStream> {
    if (localStream.value) return localStream.value;

    const constraints = {
      video: { width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: { echoCancellation: true, noiseSuppression: true },
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStream.value = stream;
      return stream;
    } catch (err) {
      console.warn("getUserMedia failed, trying basic video/audio:", err);
      const basicStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStream.value = basicStream;
      return basicStream;
    }
  }

  // Create a peer connection for a specific remote member in the group
  async function createPeerConnection(targetSocketId: string, initiator: boolean): Promise<RTCPeerConnection> {
    // If we already have one, close it first
    if (peerConnections.has(targetSocketId)) {
      peerConnections.get(targetSocketId)?.close();
      peerConnections.delete(targetSocketId);
    }

    const iceServers = await fetchIceServers();
    const pc = new RTCPeerConnection({ iceServers });

    // Add local tracks to connection
    if (localStream.value) {
      for (const track of localStream.value.getTracks()) {
        pc.addTrack(track, localStream.value);
      }
    }

    // Handle incoming stream from this peer
    pc.ontrack = (event) => {
      const incomingStream = event.streams[0] || new MediaStream([event.track]);
      remoteStreams.value.set(targetSocketId, incomingStream);
      // Force trigger Vue reactivity by creating a new Map reference
      remoteStreams.value = new Map(remoteStreams.value);
    };

    // Send local ICE candidates to this specific peer
    pc.onicecandidate = (event) => {
      if (!event.candidate) return;
      const socket = connect();
      socket.emit("group-ice-candidate", {
        to: targetSocketId,
        candidate: event.candidate.toJSON() as RTCIceCandidateLike
      });
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
        console.warn(`Connection to peer ${targetSocketId} failed or disconnected.`);
        closePeer(targetSocketId);
      }
    };

    peerConnections.set(targetSocketId, pc);
    return pc;
  }

  function closePeer(socketId: string) {
    if (peerConnections.has(socketId)) {
      peerConnections.get(socketId)?.close();
      peerConnections.delete(socketId);
    }
    if (remoteStreams.value.has(socketId)) {
      remoteStreams.value.delete(socketId);
      remoteStreams.value = new Map(remoteStreams.value);
    }
  }

  // Initialize socket and bind events
  function initSocket() {
    const socket = connect();

    // Listen for our User ID assigned by the server
    socket.on("user-id", (payload: { userId: string }) => {
      myUserId.value = payload.userId;
    });

    // Listen for incoming direct calls to join them automatically
    socket.on("incoming-group-call", (payload: { roomCode: string }) => {
      joinRoom(payload.roomCode);
    });

    // Listen for current members in the room when we join
    socket.on("group-room-members", async (payload: { members: { socketId: string; userId: string }[] }) => {
      participants.value = payload.members;

      // As the newcomer, we initiate the peer connections to ALL existing members
      for (const member of payload.members) {
        try {
          const pc = await createPeerConnection(member.socketId, true);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          
          socket.emit("group-offer", {
            to: member.socketId,
            sdp: offer as RTCSessionDescriptionLike
          });
        } catch (err) {
          console.error(`Failed to initiate offer to member ${member.userId}:`, err);
        }
      }
    });

    // Listen for a newcomer joining
    socket.on("user-joined-group", (payload: { socketId: string; userId: string }) => {
      // Add to participants list
      if (!participants.value.some(p => p.socketId === payload.socketId)) {
        participants.value = [...participants.value, payload];
      }
      loggerGroup(`User ${payload.userId} joined the call.`);
    });

    // Listen for a member leaving
    socket.on("user-left-group", (payload: { socketId: string }) => {
      const leftMember = participants.value.find(p => p.socketId === payload.socketId);
      if (leftMember) {
        loggerGroup(`User ${leftMember.userId} left the call.`);
      }
      participants.value = participants.value.filter(p => p.socketId !== payload.socketId);
      closePeer(payload.socketId);
    });

    // WebRTC signaling relays
    socket.on("group-offer", async (payload: { from: string; sdp: RTCSessionDescriptionLike }) => {
      try {
        const pc = await createPeerConnection(payload.from, false);
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit("group-answer", {
          to: payload.from,
          sdp: answer as RTCSessionDescriptionLike
        });
      } catch (err) {
        console.error("Error handling group offer:", err);
      }
    });

    socket.on("group-answer", async (payload: { from: string; sdp: RTCSessionDescriptionLike }) => {
      try {
        const pc = peerConnections.get(payload.from);
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        }
      } catch (err) {
        console.error("Error handling group answer:", err);
      }
    });

    socket.on("group-ice-candidate", async (payload: { from: string; candidate: RTCIceCandidateLike }) => {
      try {
        const pc = peerConnections.get(payload.from);
        if (pc) {
          await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
        }
      } catch (err) {
        console.error("Error handling remote candidate:", err);
      }
    });

    // Chat events
    socket.on("receive-group-message", (payload: { fromSocketId: string; fromUserId: string; text: string; at: number }) => {
      messages.value = [
        ...messages.value,
        {
          id: `${payload.fromSocketId}-${payload.at}`,
          fromUserId: payload.fromUserId,
          text: payload.text,
          at: payload.at,
          isMe: payload.fromSocketId === socket.id
        }
      ];
    });

    socket.on("error-message", (payload: { message: string }) => {
      connectionError.value = payload.message;
    });
  }

  function loggerGroup(text: string) {
    messages.value = [
      ...messages.value,
      {
        id: `system-${Date.now()}`,
        fromUserId: "System",
        text,
        at: Date.now(),
        isMe: false
      }
    ];
  }

  async function joinRoom(code: string) {
    connectionError.value = null;
    roomCode.value = code;
    
    // Acquire local media first
    await requestLocalMedia();
    
    initSocket();
    const socket = connect();
    socket.emit("join-group-room", { roomCode: code });
  }

  function leaveRoom() {
    // Teardown all peer connections
    for (const socketId of peerConnections.keys()) {
      closePeer(socketId);
    }
    
    const socket = getSocket();
    if (socket?.connected) {
      socket.emit("leave-group-room");
    }
    
    roomCode.value = "";
    participants.value = [];
    messages.value = [];
    remoteStreams.value = new Map();
  }

  function sendGroupMessage(text: string) {
    const socket = getSocket();
    if (socket?.connected) {
      socket.emit("send-group-message", { text });
    }
  }

  function setCameraEnabled(enabled: boolean): void {
    localStream.value?.getVideoTracks().forEach((track) => (track.enabled = enabled));
  }

  function setMicEnabled(enabled: boolean): void {
    localStream.value?.getAudioTracks().forEach((track) => (track.enabled = enabled));
  }

  function teardown(): void {
    leaveRoom();
    localStream.value?.getTracks().forEach((track) => track.stop());
    localStream.value = null;
    disconnect();
  }

  return {
    localStream,
    remoteStreams,
    myUserId,
    roomCode,
    participants,
    messages,
    connectionError,
    joinRoom,
    leaveRoom,
    sendGroupMessage,
    setCameraEnabled,
    setMicEnabled,
    teardown,
    initSocket
  };
}
