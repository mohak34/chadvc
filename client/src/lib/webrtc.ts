import SimplePeer from "simple-peer";
import { wsManager, Message } from "./websocket";

export type ConnectionState = "connecting" | "connected" | "failed" | "disconnected";

// Native WebRTC peer wrapper (used when SimplePeer fails)
interface NativePeerWrapper {
  pc: RTCPeerConnection;
  onsignal: (signal: any) => void;
  onstream: (stream: MediaStream) => void;
  onconnect: () => void;
  onerror: (error: Error) => void;
  onclose: () => void;
  signal: (signal: any) => void;
  destroy: () => void;
}

export interface PeerConnection {
  peer: SimplePeer.Instance | NativePeerWrapper;
  stream?: MediaStream;
  state: ConnectionState;
}

export class WebRTCManager {
  private peers: Map<string, PeerConnection> = new Map();
  private failedPeers: Set<string> = new Set(); // Track peers that failed to connect
  private localStream: MediaStream | null = null;
  private isInVoiceChannel: boolean = false;
  private isMuted: boolean = false;
  private webRTCSupported: boolean | null = null; // Cache WebRTC support check
  private simplePeerSupported: boolean | null = null; // Cache SimplePeer support check

  private onStateChangeCallback?: () => void;
  private onVoiceUsersChangeCallback?: (users: string[]) => void;
  private onVoiceKickedCallback?: (reason: string) => void;
  private unsubscribeMessage?: () => void;
  private unsubscribeConnection?: () => void;

  constructor() {
    this.setupWebSocketHandlers();
  }

  private setupWebSocketHandlers() {
    // Clean up any existing handlers
    if (this.unsubscribeMessage) {
      this.unsubscribeMessage();
    }
    if (this.unsubscribeConnection) {
      this.unsubscribeConnection();
    }

    this.unsubscribeMessage = wsManager.onMessage((message: Message) => {
      if (message.type === "voice_signal") {
        console.log(`[WebRTC] Received voice signal from ${message.from_user}`);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/e39950e9-9105-4203-a4e8-2cda83768eed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'webrtc.ts:38',message:'Received voice_signal',data:{fromUser:message.from_user,hasSignal:!!message.signal,signalType:message.signal?.type,isInVoiceChannel:this.isInVoiceChannel},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        this.handleVoiceSignal(message.from_user!, message.signal);
      } else if (message.type === "voice_kick") {
        console.log(`[WebRTC] Kicked from voice: ${message.reason}`);
        this.handleVoiceKick(message.reason || "unknown");
      } else if (message.type === "voice_join") {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/e39950e9-9105-4203-a4e8-2cda83768eed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'webrtc.ts:46',message:'Received voice_join message',data:{hasUsers:!!message.users,usersCount:message.users?.length||0,username:message.username,isInVoiceChannel:this.isInVoiceChannel},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        // If the message has a 'users' field, it means we just joined and need to connect to existing users
        if (message.users && message.users.length > 0) {
          console.log(`[WebRTC] Received list of voice users to connect to:`, message.users);
          this.connectToExistingUsers(message.users);
        } else if (message.username && this.isInVoiceChannel) {
          // Someone else joined voice - if we're in voice, connect to them
          console.log(`[WebRTC] ${message.username} joined voice, initiating connection`);
          this.connectToPeer(message.username, true);
        }
      } else if (message.type === "voice_leave" && message.username) {
        console.log(`[WebRTC] ${message.username} left voice, removing peer`);
        this.removePeer(message.username);
      } else if (message.type === "user_left" && message.username) {
        console.log(`[WebRTC] ${message.username} disconnected, removing peer`);
        this.removePeer(message.username);
      }
    });

    // Handle WebSocket disconnection - clean up voice state
    this.unsubscribeConnection = wsManager.onConnectionChange((connected) => {
      if (!connected && this.isInVoiceChannel) {
        console.log("[WebRTC] WebSocket disconnected, cleaning up voice state");
        this.cleanupVoiceState();
      }
    });
  }

  // Clean up voice state without sending messages (used when WS disconnects)
  private cleanupVoiceState() {
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    this.peers.forEach((connection) => {
      connection.peer.destroy();
    });
    this.peers.clear();

    this.isInVoiceChannel = false;
    this.isMuted = false;
    this.notifyStateChange();
    this.notifyVoiceUsersChange();
  }

  private handleVoiceKick(reason: string) {
    console.log(`[WebRTC] Handling voice kick: ${reason}`);
    
    // Clean up voice state
    this.cleanupVoiceState();

    // Notify callback
    if (this.onVoiceKickedCallback) {
      this.onVoiceKickedCallback(reason);
    }
  }

  async joinVoiceChannel(voiceUsers: string[]): Promise<void> {
    if (this.isInVoiceChannel) {
      console.warn("Already in voice channel");
      return;
    }

    try {
      console.log("[WebRTC] Requesting microphone access...");
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/e39950e9-9105-4203-a4e8-2cda83768eed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'webrtc.ts:109',message:'joinVoiceChannel called',data:{isInVoiceChannel:this.isInVoiceChannel,voiceUsersCount:voiceUsers.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      
      // Check if mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Your browser does not support microphone access. Please update your browser or check Tauri configuration.");
      }

      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      console.log("[WebRTC] Microphone access granted");
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/e39950e9-9105-4203-a4e8-2cda83768eed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'webrtc.ts:127',message:'Microphone access granted',data:{hasLocalStream:!!this.localStream,audioTracks:this.localStream?.getAudioTracks().length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      this.isInVoiceChannel = true;
      this.notifyStateChange();

      // Send voice_join message to server
      // The server will respond with a list of users already in voice
      wsManager.sendVoiceJoin();
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/e39950e9-9105-4203-a4e8-2cda83768eed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'webrtc.ts:135',message:'Sent voice_join to server',data:{isInVoiceChannel:this.isInVoiceChannel},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      
      // Note: We no longer connect to peers here immediately
      // The server will send us a voice_join message with a list of users to connect to
    } catch (error) {
      console.error("Failed to get microphone access:", error);
      
      // Detailed error messages
      if (error instanceof DOMException) {
        switch (error.name) {
          case "NotAllowedError":
            throw new Error("Microphone access denied. The app needs permission to access your microphone.");
          case "NotFoundError":
            throw new Error("No microphone found. Please connect a microphone and try again.");
          case "NotReadableError":
            throw new Error("Microphone is being used by another application. Please close other apps and try again.");
          case "OverconstrainedError":
            throw new Error("Microphone does not meet requirements. Please check your audio settings.");
          case "SecurityError":
            throw new Error("Security error accessing microphone. Please check Tauri permissions.");
          default:
            throw new Error(`Microphone access error: ${error.message}`);
        }
      }
      
      if (error instanceof Error) {
        throw error;
      }
      
      throw new Error("Failed to access microphone. Please check your system permissions.");
    }
  }

  // Connect to existing users when we join voice
  private connectToExistingUsers(usernames: string[]): void {
    console.log(`[WebRTC] Connecting to ${usernames.length} existing voice users`);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/e39950e9-9105-4203-a4e8-2cda83768eed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'webrtc.ts:165',message:'connectToExistingUsers called',data:{usernames:usernames,count:usernames.length,hasLocalStream:!!this.localStream},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    for (const username of usernames) {
      console.log(`[WebRTC] Initiating connection to ${username}`);
      this.connectToPeer(username, true);
    }
  }

  leaveVoiceChannel(): void {
    if (!this.isInVoiceChannel) return;

    // Send voice_leave message to server
    wsManager.sendVoiceLeave();

    // Clean up local state
    this.cleanupVoiceState();
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

  private createNativePeerWrapper(initiator: boolean, stream: MediaStream): NativePeerWrapper {
    console.log(`[WebRTC] Creating native WebRTC peer connection (initiator: ${initiator})`);
    
    // Get RTCPeerConnection constructor (handles prefixed versions)
    const RTCPC = this.getRTCPeerConnection();
    if (!RTCPC) {
      throw new Error("RTCPeerConnection is not available");
    }
    
    const pc = new RTCPC({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    });

    // Add local stream tracks
    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream);
      console.log(`[WebRTC] Added track: ${track.kind}`);
    });

    const wrapper: NativePeerWrapper = {
      pc,
      onsignal: () => {},
      onstream: () => {},
      onconnect: () => {},
      onerror: () => {},
      onclose: () => {},
      signal: (signal: any) => {
        console.log(`[WebRTC] Native peer received signal:`, signal.type);
        if (signal.sdp) {
          const rtcSignal = signal.type === 'offer' 
            ? { type: 'offer', sdp: signal.sdp } as RTCSessionDescriptionInit
            : { type: 'answer', sdp: signal.sdp } as RTCSessionDescriptionInit;
            
          pc.setRemoteDescription(new RTCSessionDescription(rtcSignal))
            .then(() => {
              if (signal.type === 'offer') {
                console.log(`[WebRTC] Received offer, creating answer`);
                return pc.createAnswer();
              }
              return Promise.resolve(null);
            })
            .then(answer => {
              if (answer) {
                console.log(`[WebRTC] Setting local description (answer)`);
                return pc.setLocalDescription(answer);
              }
            })
            .then(() => {
              if (pc.localDescription) {
                wrapper.onsignal({
                  type: 'answer',
                  sdp: pc.localDescription.sdp,
                });
              }
            })
            .catch(err => {
              console.error(`[WebRTC] Error in signal processing:`, err);
              wrapper.onerror(err);
            });
        } else if (signal.candidate) {
          const candidate = typeof signal.candidate === 'string' 
            ? { candidate: signal.candidate, sdpMLineIndex: signal.sdpMLineIndex, sdpMid: signal.sdpMid }
            : signal;
          pc.addIceCandidate(new RTCIceCandidate(candidate))
            .catch(err => {
              console.error(`[WebRTC] Error adding ICE candidate:`, err);
              wrapper.onerror(err);
            });
        }
      },
      destroy: () => {
        console.log(`[WebRTC] Destroying native peer connection`);
        pc.close();
      },
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log(`[WebRTC] ICE candidate generated`);
        wrapper.onsignal({
          type: 'candidate',
          candidate: event.candidate.candidate,
          sdpMLineIndex: event.candidate.sdpMLineIndex,
          sdpMid: event.candidate.sdpMid,
        });
      } else {
        console.log(`[WebRTC] ICE gathering complete`);
      }
    };

    // Handle remote stream
    pc.ontrack = (event) => {
      console.log(`[WebRTC] Received remote track:`, event.track.kind);
      if (event.streams[0]) {
        wrapper.onstream(event.streams[0]);
      }
    };

    // Handle connection state
    pc.onconnectionstatechange = () => {
      console.log(`[WebRTC] Connection state changed: ${pc.connectionState}`);
      if (pc.connectionState === 'connected') {
        wrapper.onconnect();
      } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        wrapper.onerror(new Error(`Connection ${pc.connectionState}`));
      } else if (pc.connectionState === 'closed') {
        wrapper.onclose();
      }
    };

    // Create offer if initiator
    if (initiator) {
      console.log(`[WebRTC] Creating offer as initiator`);
      pc.createOffer()
        .then(offer => {
          console.log(`[WebRTC] Offer created, setting local description`);
          return pc.setLocalDescription(offer);
        })
        .then(() => {
          if (pc.localDescription) {
            console.log(`[WebRTC] Sending offer signal`);
            wrapper.onsignal({
              type: 'offer',
              sdp: pc.localDescription.sdp,
            });
          }
        })
        .catch(err => {
          console.error(`[WebRTC] Error creating offer:`, err);
          wrapper.onerror(err);
        });
    }

    return wrapper;
  }

  private getRTCPeerConnection(): typeof RTCPeerConnection | null {
    // Check for standard RTCPeerConnection
    if (typeof RTCPeerConnection !== 'undefined') {
      return RTCPeerConnection;
    }
    
    // Check for webkit-prefixed version (older browsers/WebKit)
    if (typeof (window as any).webkitRTCPeerConnection !== 'undefined') {
      console.log("[WebRTC] Using webkitRTCPeerConnection");
      return (window as any).webkitRTCPeerConnection as typeof RTCPeerConnection;
    }
    
    // Check for moz-prefixed version (Firefox)
    if (typeof (window as any).mozRTCPeerConnection !== 'undefined') {
      console.log("[WebRTC] Using mozRTCPeerConnection");
      return (window as any).mozRTCPeerConnection as typeof RTCPeerConnection;
    }
    
    // In Tauri, WebKitGTK doesn't support WebRTC natively
    // We would need native Rust WebRTC implementation
    // For now, return null - this means WebRTC is not available
    return null;
  }


  private checkWebRTCSupport(): boolean {
    // Cache the result
    if (this.webRTCSupported !== null) {
      return this.webRTCSupported;
    }

    // Check if RTCPeerConnection exists (in any form)
    const RTCPC = this.getRTCPeerConnection();
    if (!RTCPC) {
      const isTauri = typeof window !== 'undefined' && (window as any).__TAURI__ !== undefined;
      this.webRTCSupported = false;
      this.simplePeerSupported = false;
      
      if (isTauri) {
        console.error("[WebRTC] =========================================");
        console.error("[WebRTC] CRITICAL: WebRTC is NOT supported in Tauri");
        console.error("[WebRTC] WebKitGTK (used by Tauri on Linux) does not support WebRTC");
        console.error("[WebRTC] Voice chat will NOT work in the Tauri app");
        console.error("[WebRTC] =========================================");
        console.error("[WebRTC] SOLUTION: Use the browser version for voice chat");
        console.error("[WebRTC] The browser version supports WebRTC and will work");
        console.error("[WebRTC] =========================================");
      } else {
        console.error("[WebRTC] RTCPeerConnection is not available - WebRTC not supported");
      }
      
      return false;
    }

    // WebRTC is supported if RTCPeerConnection exists
    // Now check if SimplePeer works (optional - we can use native WebRTC if not)
    this.webRTCSupported = true; // WebRTC is supported
    
    // Try SimplePeer to see if it works
    try {
      const testPeer = new SimplePeer({ initiator: false });
      testPeer.destroy();
      this.simplePeerSupported = true;
      console.log("[WebRTC] SimplePeer works - will try SimplePeer first");
    } catch (error: any) {
      const errorMessage = error?.message || String(error);
      if (errorMessage.includes("Not a supported browser") || errorMessage.includes("No WebRTC support")) {
        this.simplePeerSupported = false;
        console.log("[WebRTC] SimplePeer browser detection failed - will use native WebRTC");
      } else {
        // Other error - assume SimplePeer might work, will try it
        this.simplePeerSupported = true;
        console.log("[WebRTC] SimplePeer test had unexpected error, will try it anyway");
      }
    }
    
    return true; // WebRTC is supported (we have RTCPeerConnection)
  }

  private connectToPeer(username: string, initiator: boolean): void {
    // Check WebRTC support first - if not supported, mark all as failed and return
    if (!this.checkWebRTCSupport()) {
      this.failedPeers.add(username);
      console.warn(`[WebRTC] WebRTC not supported - skipping ${username}`);
      return;
    }

    if (this.peers.has(username)) {
      console.warn(`[WebRTC] Already connected to ${username}`);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/e39950e9-9105-4203-a4e8-2cda83768eed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'webrtc.ts:195',message:'connectToPeer - already connected',data:{username,initiator,hasPeer:true},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      return;
    }

    // Don't retry if we've already failed for this peer
    if (this.failedPeers.has(username)) {
      console.warn(`[WebRTC] Skipping ${username} - previous connection attempt failed`);
      return;
    }

    if (!this.localStream) {
      console.error("[WebRTC] No local stream available");
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/e39950e9-9105-4203-a4e8-2cda83768eed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'webrtc.ts:201',message:'connectToPeer - no local stream',data:{username,initiator,hasLocalStream:false},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      return;
    }

    // Check if WebRTC is available - do this FIRST before anything else
    const RTCPC = this.getRTCPeerConnection();
    if (!RTCPC) {
      const error = new Error("WebRTC is not supported in this environment. WebKitGTK (used by Tauri on Linux) does not support WebRTC.");
      console.error(`[WebRTC] ${error.message}`);
      console.error(`[WebRTC] RTCPeerConnection, webkitRTCPeerConnection, and mozRTCPeerConnection are all undefined`);
      // Mark as failed immediately to prevent any retries
      this.failedPeers.add(username);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/e39950e9-9105-4203-a4e8-2cda83768eed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'webrtc.ts:230',message:'WebRTC not available',data:{username,initiator,error:error.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      return;
    }

    console.log(`[WebRTC] Creating peer connection to ${username} (initiator: ${initiator})`);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/e39950e9-9105-4203-a4e8-2cda83768eed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'webrtc.ts:235',message:'Creating peer connection',data:{username,initiator,hasLocalStream:!!this.localStream,audioTracks:this.localStream?.getAudioTracks().length||0,hasRTCPeerConnection:typeof RTCPeerConnection !== 'undefined',userAgent:navigator.userAgent},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion

    // Check if we're in Tauri environment
    const isTauri = typeof window !== 'undefined' && (window as any).__TAURI__ !== undefined;
    
    // If in Tauri and simple-peer might fail, check WebRTC availability
    if (isTauri && typeof window !== 'undefined') {
      // Check if WebRTC APIs are available (WebKitGTK on Linux may not support WebRTC)
      const hasWebRTC = typeof RTCPeerConnection !== 'undefined' || 
                        typeof (window as any).webkitRTCPeerConnection !== 'undefined' ||
                        typeof (window as any).mozRTCPeerConnection !== 'undefined';
      
      if (!hasWebRTC) {
        console.error("[WebRTC] WebRTC is not available in this Tauri environment. WebKitGTK on Linux does not support WebRTC.");
        return;
      }
    }

    // Check if SimplePeer is supported - if not, go straight to native WebRTC
    let peer: SimplePeer.Instance | NativePeerWrapper;
    let useNativeWebRTC = false;
    
    // In Tauri, SimplePeer doesn't work - always use native WebRTC
    // Also use native WebRTC if we know SimplePeer doesn't work
    if (isTauri || this.simplePeerSupported === false) {
      console.log(`[WebRTC] Using native WebRTC for ${username}${isTauri ? ' (Tauri environment)' : ' (SimplePeer not supported)'}`);
      try {
        peer = this.createNativePeerWrapper(initiator, this.localStream);
        useNativeWebRTC = true;
        // Mark SimplePeer as not supported so we don't try it again
        if (this.simplePeerSupported === null) {
          this.simplePeerSupported = false;
        }
      } catch (err) {
        console.error(`[WebRTC] Failed to create native WebRTC peer:`, err);
        this.failedPeers.add(username);
        return;
      }
    } else {
      // Try SimplePeer first
      try {
        peer = new SimplePeer({
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
        console.log(`[WebRTC] Using SimplePeer for ${username}`);
      } catch (error: any) {
        const errorMessage = error?.message || String(error);
        console.error(`[WebRTC] SimplePeer creation failed for ${username}:`, errorMessage);
        console.error(`[WebRTC] Error object:`, error);
        
        // Mark SimplePeer as not supported
        this.simplePeerSupported = false;
        
        const RTCPC = this.getRTCPeerConnection();
        if (RTCPC) {
          console.log(`[WebRTC] Falling back to native WebRTC for ${username}`);
          try {
            peer = this.createNativePeerWrapper(initiator, this.localStream);
            useNativeWebRTC = true;
          } catch (nativeErr) {
            console.error(`[WebRTC] Native WebRTC also failed:`, nativeErr);
            this.failedPeers.add(username);
            return;
          }
        } else {
          this.failedPeers.add(username);
          console.error(`[WebRTC] WebRTC not supported for ${username} - no RTCPeerConnection available`);
          return;
        }
      }
    }

    const connection: PeerConnection = {
      peer,
      state: "connecting",
    };

    this.peers.set(username, connection);

    // Set up event handlers - handle both SimplePeer (.on() method) and native wrapper (properties)
    if (useNativeWebRTC && 'onsignal' in peer) {
      // Native wrapper - use properties
      const nativePeer = peer as NativePeerWrapper;
      nativePeer.onsignal = (signal: any) => {
        console.log(`[WebRTC] Sending signal to ${username}`, signal.type);
        wsManager.sendVoiceSignal(username, signal);
      };
      nativePeer.onstream = (stream: MediaStream) => {
        console.log(`[WebRTC] Received stream from ${username}`);
        connection.stream = stream;
        connection.state = "connected";
        this.notifyStateChange();
        this.notifyVoiceUsersChange();

        const audio = new Audio();
        audio.srcObject = stream;
        audio.play()
          .then(() => console.log(`[WebRTC] Playing audio from ${username}`))
          .catch((err) => console.error(`[WebRTC] Error playing audio from ${username}:`, err));
      };
      nativePeer.onconnect = () => {
        console.log(`[WebRTC] Connected to ${username}`);
        connection.state = "connected";
        this.notifyStateChange();
      };
      nativePeer.onerror = (err: Error) => {
        console.error(`[WebRTC] Peer connection error with ${username}:`, err);
        connection.state = "failed";
        this.notifyStateChange();
      };
      nativePeer.onclose = () => {
        console.log(`[WebRTC] Connection closed with ${username}`);
        this.removePeer(username);
      };
    } else {
      // SimplePeer - use .on() method
      const simplePeer = peer as SimplePeer.Instance;
      simplePeer.on("signal", (signal: any) => {
        console.log(`[WebRTC] Sending signal to ${username}`, signal.type);
        wsManager.sendVoiceSignal(username, signal);
      });
      simplePeer.on("stream", (stream: MediaStream) => {
        console.log(`[WebRTC] Received stream from ${username}`);
        connection.stream = stream;
        connection.state = "connected";
        this.notifyStateChange();
        this.notifyVoiceUsersChange();

        const audio = new Audio();
        audio.srcObject = stream;
        audio.play()
          .then(() => console.log(`[WebRTC] Playing audio from ${username}`))
          .catch((err) => console.error(`[WebRTC] Error playing audio from ${username}:`, err));
      });
      simplePeer.on("connect", () => {
        console.log(`[WebRTC] Connected to ${username}`);
        connection.state = "connected";
        this.notifyStateChange();
      });
      simplePeer.on("error", (err: Error) => {
        console.error(`[WebRTC] Peer connection error with ${username}:`, err);
        connection.state = "failed";
        this.notifyStateChange();
      });
      simplePeer.on("close", () => {
        console.log(`[WebRTC] Connection closed with ${username}`);
        this.removePeer(username);
      });
    }

    this.notifyStateChange();
    this.notifyVoiceUsersChange();
  }

  private handleVoiceSignal(fromUser: string, signal: any): void {
    if (!this.isInVoiceChannel) {
      console.log(`[WebRTC] Ignoring signal from ${fromUser} - not in voice channel`);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/e39950e9-9105-4203-a4e8-2cda83768eed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'webrtc.ts:267',message:'handleVoiceSignal - not in voice',data:{fromUser,isInVoiceChannel:this.isInVoiceChannel},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      return;
    }

    // Check if this peer has already failed - don't retry
    if (this.failedPeers.has(fromUser)) {
      console.warn(`[WebRTC] Ignoring signal from ${fromUser} - peer connection previously failed`);
      return;
    }

    console.log(`[WebRTC] Processing signal from ${fromUser}`, signal.type);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/e39950e9-9105-4203-a4e8-2cda83768eed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'webrtc.ts:273',message:'Processing voice signal',data:{fromUser,signalType:signal.type,hasConnection:this.peers.has(fromUser)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    let connection = this.peers.get(fromUser);

    if (!connection) {
      console.log(`[WebRTC] No existing connection to ${fromUser}, creating as non-initiator`);
      this.connectToPeer(fromUser, false);
      connection = this.peers.get(fromUser);
      
      // If connection still doesn't exist after connectToPeer, it likely failed
      if (!connection) {
        console.warn(`[WebRTC] Failed to create connection to ${fromUser} - will not retry`);
        return;
      }
    }

    if (connection) {
      try {
        // Both SimplePeer and native wrapper have signal() method
        connection.peer.signal(signal);
        console.log(`[WebRTC] Signal processed for ${fromUser}`);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/e39950e9-9105-4203-a4e8-2cda83768eed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'webrtc.ts:284',message:'Signal processed successfully',data:{fromUser,signalType:signal.type,connectionState:connection.state},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
      } catch (err) {
        console.error(`[WebRTC] Error processing signal from ${fromUser}:`, err);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/e39950e9-9105-4203-a4e8-2cda83768eed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'webrtc.ts:287',message:'Signal processing error',data:{fromUser,error:err instanceof Error?err.message:String(err)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
      }
    }
  }

  private removePeer(username: string): void {
    const connection = this.peers.get(username);
    if (connection) {
      // Both SimplePeer and native wrapper have destroy() method
      connection.peer.destroy();
      this.peers.delete(username);
      this.failedPeers.delete(username); // Remove from failed list if it was there
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

  onVoiceKicked(callback: (reason: string) => void): () => void {
    this.onVoiceKickedCallback = callback;
    return () => {
      this.onVoiceKickedCallback = undefined;
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

  // Reset manager state (called on logout)
  reset(): void {
    this.cleanupVoiceState();
    this.failedPeers.clear();
    this.webRTCSupported = null; // Reset support check on reset
    this.simplePeerSupported = null; // Reset SimplePeer support check
  }
}

export const webrtcManager = new WebRTCManager();
