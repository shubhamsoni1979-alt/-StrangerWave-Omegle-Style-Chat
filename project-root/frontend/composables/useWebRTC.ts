import { ref, shallowRef } from "vue";
import { useConnectionStore } from "~/stores/connection";
import type { IceServerConfig } from "~/types/webrtc";
import type { RTCIceCandidateLike, RTCSessionDescriptionLike } from "~/types/socket";

export function useWebRTC() {
  const config = useRuntimeConfig();
  const { connect } = useSocket();

  const localStream = shallowRef<MediaStream | null>(null);
  const remoteStream = shallowRef<MediaStream | null>(null);
  const peerConnection = shallowRef<RTCPeerConnection | null>(null);
  const mediaError = ref<string | null>(null);

  // ICE candidates that arrive before the remote description is set need to
  // be queued, since RTCPeerConnection.addIceCandidate throws otherwise.
  let pendingRemoteCandidates: RTCIceCandidateLike[] = [];
  let hasRemoteDescription = false;

  async function fetchIceServers(): Promise<IceServerConfig[]> {
    let url = getBackendUrl(config.public.backendUrl);
    if (url && !url.startsWith("http://") && !url.startsWith("https://")) {
      url = `https://${url}`;
    }
    try {
      const res = await $fetch<{ iceServers: IceServerConfig[] }>("/api/ice-servers", {
        baseURL: url,
      });
      return res.iceServers;
    } catch {
      // Fall back to public STUN only - chat still works on many networks,
      // just with worse connectivity behind strict NATs without TURN.
      return [{ urls: "stun:stun.l.google.com:19302" }];
    }
  }

  async function requestLocalMedia(): Promise<MediaStream> {
    if (localStream.value) return localStream.value;

    if (typeof navigator === "undefined" || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const errorMsg = "Camera/microphone access is not supported on this connection (Note: WebRTC requires a secure HTTPS connection or localhost).";
      mediaError.value = errorMsg;
      throw new Error(errorMsg);
    }

    const constraintsList = [
      // 1. Try high-quality video & audio with advanced constraints
      {
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
        audio: { echoCancellation: true, noiseSuppression: true },
      },
      // 2. Fallback to basic video & audio (no custom constraints)
      {
        video: true,
        audio: true,
      },
      // 3. Fallback to video only (in case there's no mic, or mic is blocked)
      {
        video: true,
        audio: false,
      },
      // 4. Fallback to audio only (in case there's no camera, or camera is blocked)
      {
        video: false,
        audio: true,
      }
    ];

    let lastError: any = null;
    for (const constraints of constraintsList) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        localStream.value = stream;
        mediaError.value = null;
        return stream;
      } catch (err) {
        lastError = err;
        console.warn("getUserMedia failed for constraints:", constraints, err);
      }
    }

    mediaError.value =
      lastError instanceof Error
        ? `Camera/microphone access was blocked or unavailable: ${lastError.message}`
        : "Camera/microphone access was blocked or unavailable.";
    throw lastError || new Error("No media devices available");
  }

  async function createPeerConnection(onFailed?: () => void): Promise<RTCPeerConnection> {
    const iceServers = await fetchIceServers();
    const pc = new RTCPeerConnection({ iceServers });

    const stream = localStream.value;
    if (stream) {
      for (const track of stream.getTracks()) pc.addTrack(track, stream);
    }

    pc.ontrack = (event) => {
      const incomingStream = event.streams[0] || new MediaStream([event.track]);
      if (!remoteStream.value) {
        remoteStream.value = incomingStream;
      } else {
        const currentTracks = remoteStream.value.getTracks();
        if (!currentTracks.some((t) => t.id === event.track.id)) {
          remoteStream.value.addTrack(event.track);
        }
        // Force shallowRef update so Vue's watcher in RemoteVideo.vue is triggered
        remoteStream.value = new MediaStream(remoteStream.value.getTracks());
      }
    };

    pc.onicecandidate = (event) => {
      if (!event.candidate) return;
      const socket = connect();
      socket.emit("ice-candidate", { candidate: event.candidate.toJSON() as RTCIceCandidateLike });
    };

    pc.onconnectionstatechange = () => {
      const connectionStore = useConnectionStore();
      if (pc.connectionState === "connected") {
        connectionStore.setConnected();
      } else if (pc.connectionState === "failed") {
        onFailed?.();
      }
    };

    peerConnection.value = pc;
    hasRemoteDescription = false;
    pendingRemoteCandidates = [];
    return pc;
  }

  async function makeOffer(): Promise<void> {
    const pc = peerConnection.value;
    if (!pc) return;
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    const socket = connect();
    socket.emit("offer", { sdp: offer as RTCSessionDescriptionLike });
  }

  async function handleRemoteOffer(sdp: RTCSessionDescriptionLike): Promise<void> {
    const pc = peerConnection.value;
    if (!pc) return;
    await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    hasRemoteDescription = true;
    await flushPendingCandidates();

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    const socket = connect();
    socket.emit("answer", { sdp: answer as RTCSessionDescriptionLike });
  }

  async function handleRemoteAnswer(sdp: RTCSessionDescriptionLike): Promise<void> {
    const pc = peerConnection.value;
    if (!pc) return;
    await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    hasRemoteDescription = true;
    await flushPendingCandidates();
  }

  async function handleRemoteIceCandidate(candidate: RTCIceCandidateLike): Promise<void> {
    const pc = peerConnection.value;
    if (!pc) return;
    if (!hasRemoteDescription) {
      pendingRemoteCandidates.push(candidate);
      return;
    }
    await pc.addIceCandidate(new RTCIceCandidate(candidate));
  }

  async function flushPendingCandidates(): Promise<void> {
    const pc = peerConnection.value;
    if (!pc) return;
    for (const candidate of pendingRemoteCandidates) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    }
    pendingRemoteCandidates = [];
  }

  function setCameraEnabled(enabled: boolean): void {
    localStream.value?.getVideoTracks().forEach((track) => (track.enabled = enabled));
  }

  function setMicEnabled(enabled: boolean): void {
    localStream.value?.getAudioTracks().forEach((track) => (track.enabled = enabled));
  }

  function teardownPeerConnection(): void {
    peerConnection.value?.close();
    peerConnection.value = null;
    remoteStream.value = null;
    hasRemoteDescription = false;
    pendingRemoteCandidates = [];
  }

  function stopLocalMedia(): void {
    localStream.value?.getTracks().forEach((track) => track.stop());
    localStream.value = null;
  }

  return {
    localStream,
    remoteStream,
    mediaError,
    requestLocalMedia,
    createPeerConnection,
    makeOffer,
    handleRemoteOffer,
    handleRemoteAnswer,
    handleRemoteIceCandidate,
    setCameraEnabled,
    setMicEnabled,
    teardownPeerConnection,
    stopLocalMedia,
  };
}
