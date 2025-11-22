import SimplePeer from "simple-peer";
import { wsManager } from "./websocket";

export type ConnectionState = "connecting" | "connected" | "failed" | "disconnected";

export interface PeerConnection {
  peer: SimplePeer.Instance;
  stream?: MediaStream;
  state: ConnectionState;
}

export class WebRTCManager {
  private peers: Map<string, PeerConnection> = new Map();
  private localStream: MediaStream | null = null;
  private isInVoiceChannel: boolean = false;
  private isMuted: boolean = false;

  private onStateChangeCallback?: () => void;
  private onVoiceUsersChangeCallback?: (users: string[]) => void;

  constructor() {
    this.setupWebSocketHandlers();
  }

  private setupWebSocketHandlers() {
    wsManager.onMessage((message) => {
      if (message.type === "voice_signal") {
        console.log(`[WebRTC] Received voice signal from ${message.from_user}`);
        this.handleVoiceSignal(message.from_user!, message.signal);
      } else if (message.type === "message" && message.username) {
        if (this.isInVoiceChannel) {
          const content = message.content || "";
          if (content.includes("joined voice")) {
            console.log(`[WebRTC] ${message.username} joined voice, initiating connection`);
            this.connectToPeer(message.username, true);
          }
        }
      } else if (message.type === "user_left" && message.username) {
        console.log(`[WebRTC] ${message.username} left, removing peer`);
        this.removePeer(message.username);
      }
    });
  }

  async joinVoiceChannel(voiceUsers: string[]): Promise<void> {
    if (this.isInVoiceChannel) {
      console.warn("Already in voice channel");
      return;
    }

    try {
      console.log("[WebRTC] Requesting microphone access...");
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      console.log("[WebRTC] Microphone access granted");
      this.isInVoiceChannel = true;
      this.notifyStateChange();

      console.log("[WebRTC] Broadcasting 'joined voice' message");
      wsManager.sendMessage("joined voice");

      console.log("[WebRTC] Voice users to connect to:", voiceUsers);
      for (const username of voiceUsers) {
        console.log(`[WebRTC] Initiating connection to ${username}`);
        this.connectToPeer(username, true);
      }
    } catch (error) {
      console.error("Failed to get microphone access:", error);
      throw new Error("Microphone access denied");
    }
  }

  leaveVoiceChannel(): void {
    if (!this.isInVoiceChannel) return;

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    this.peers.forEach((connection) => {
      connection.peer.destroy();
    });
    this.peers.clear();

    this.isInVoiceChannel = false;
    this.notifyStateChange();
    this.notifyVoiceUsersChange();

    wsManager.sendMessage("left voice");
  }

  toggleMute(): boolean {
    if (!this.localStream) return false;

    this.isMuted = !this.isMuted;
    this.localStream.getAudioTracks().forEach((track) => {
      track.enabled = !this.isMuted;
    });

    this.notifyStateChange();
    return this.isMuted;
  }

  private connectToPeer(username: string, initiator: boolean): void {
    if (this.peers.has(username)) {
      console.warn(`[WebRTC] Already connected to ${username}`);
      return;
    }

    if (!this.localStream) {
      console.error("[WebRTC] No local stream available");
      return;
    }

    console.log(`[WebRTC] Creating peer connection to ${username} (initiator: ${initiator})`);

    const peer = new SimplePeer({
      initiator,
      stream: this.localStream,
      trickle: true,
      config: {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
      },
    });

    const connection: PeerConnection = {
      peer,
      state: "connecting",
    };

    this.peers.set(username, connection);

    peer.on("signal", (signal) => {
      console.log(`[WebRTC] Sending signal to ${username}`, signal.type);
      wsManager.sendVoiceSignal(username, signal);
    });

    peer.on("stream", (stream) => {
      console.log(`[WebRTC] ✓ Received stream from ${username}`);
      connection.stream = stream;
      connection.state = "connected";
      this.notifyStateChange();
      this.notifyVoiceUsersChange();

      const audio = new Audio();
      audio.srcObject = stream;
      audio.play()
        .then(() => console.log(`[WebRTC] ✓ Playing audio from ${username}`))
        .catch((err) => console.error(`[WebRTC] ✗ Error playing audio from ${username}:`, err));
    });

    peer.on("connect", () => {
      console.log(`[WebRTC] ✓ Connected to ${username}`);
      connection.state = "connected";
      this.notifyStateChange();
    });

    peer.on("error", (err) => {
      console.error(`[WebRTC] ✗ Peer connection error with ${username}:`, err);
      connection.state = "failed";
      this.notifyStateChange();
    });

    peer.on("close", () => {
      console.log(`[WebRTC] Connection closed with ${username}`);
      this.removePeer(username);
    });

    this.notifyStateChange();
    this.notifyVoiceUsersChange();
  }

  private handleVoiceSignal(fromUser: string, signal: any): void {
    console.log(`[WebRTC] Processing signal from ${fromUser}`, signal.type);
    let connection = this.peers.get(fromUser);

    if (!connection) {
      console.log(`[WebRTC] No existing connection to ${fromUser}, creating as non-initiator`);
      this.connectToPeer(fromUser, false);
      connection = this.peers.get(fromUser);
    }

    if (connection) {
      try {
        connection.peer.signal(signal);
        console.log(`[WebRTC] ✓ Signal processed for ${fromUser}`);
      } catch (err) {
        console.error(`[WebRTC] ✗ Error processing signal from ${fromUser}:`, err);
      }
    }
  }

  private removePeer(username: string): void {
    const connection = this.peers.get(username);
    if (connection) {
      connection.peer.destroy();
      this.peers.delete(username);
      this.notifyStateChange();
      this.notifyVoiceUsersChange();
    }
  }

  getConnectionState(username: string): ConnectionState {
    return this.peers.get(username)?.state || "disconnected";
  }

  getVoiceUsers(): string[] {
    return Array.from(this.peers.keys()).filter(
      (username) => this.peers.get(username)?.state === "connected"
    );
  }

  isInVoice(): boolean {
    return this.isInVoiceChannel;
  }

  getMuteState(): boolean {
    return this.isMuted;
  }

  onStateChange(callback: () => void): () => void {
    this.onStateChangeCallback = callback;
    return () => {
      this.onStateChangeCallback = undefined;
    };
  }

  onVoiceUsersChange(callback: (users: string[]) => void): () => void {
    this.onVoiceUsersChangeCallback = callback;
    return () => {
      this.onVoiceUsersChangeCallback = undefined;
    };
  }

  private notifyStateChange(): void {
    if (this.onStateChangeCallback) {
      this.onStateChangeCallback();
    }
  }

  private notifyVoiceUsersChange(): void {
    if (this.onVoiceUsersChangeCallback) {
      this.onVoiceUsersChangeCallback(this.getVoiceUsers());
    }
  }
}

export const webrtcManager = new WebRTCManager();
