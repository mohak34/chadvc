import { getSessionId } from "./session";

export type MessageType =
  | "message"
  | "user_list"
  | "user_joined"
  | "user_left"
  | "voice_signal"
  | "voice_join"
  | "voice_leave"
  | "voice_kick"
  | "typing"
  | "error"
  | "message_history"
  | "load_more";

export interface HistoryMessage {
  id: number;
  username: string;
  content: string;
  timestamp: string;
}

export interface Message {
  type: MessageType;
  username?: string;
  content?: string;
  timestamp?: string;
  users?: string[];
  to_user?: string;
  from_user?: string;
  signal?: any;
  error?: string;
  id?: number;
  messages?: HistoryMessage[];
  has_more?: boolean;
  before_id?: number;
  session_id?: string;
  to_session_id?: string;
  reason?: string;
}

// Pending message for retry queue
export interface PendingMessage {
  id: string;
  content: string;
  timestamp: Date;
  status: "pending" | "sending" | "failed";
  retryCount: number;
}

export type MessageHandler = (message: Message) => void;
export type ConnectionHandler = (connected: boolean) => void;
export type TokenRefreshHandler = () => Promise<string | null>;
export type PendingMessageHandler = (messages: PendingMessage[]) => void;

export class WebSocketManager {
  private ws: WebSocket | null = null;
  private messageHandlers: Set<MessageHandler> = new Set();
  private connectionHandlers: Set<ConnectionHandler> = new Set();
  private pendingMessageHandlers: Set<PendingMessageHandler> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private baseReconnectDelay = 1000;
  private maxReconnectDelay = 30000;
  private token: string = "";
  private tokenRefreshHandler: TokenRefreshHandler | null = null;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private isIntentionalDisconnect = false;
  private pendingMessages: Map<string, PendingMessage> = new Map();
  private connectionPromise: Promise<void> | null = null;
  private connectionResolve: (() => void) | null = null;

  setTokenRefreshHandler(handler: TokenRefreshHandler) {
    this.tokenRefreshHandler = handler;
  }

  async connect(token: string, url?: string): Promise<void> {
    // If already connecting, wait for that connection
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.token = token;
    this.isIntentionalDisconnect = false;

    // Clear any pending reconnect
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (!url) {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.hostname;
      url = `${protocol}//${host}:8080/ws`;
    }

    const sessionId = getSessionId();
    const wsUrl = `${url}?token=${encodeURIComponent(token)}&session_id=${encodeURIComponent(sessionId)}`;
    console.log(
      `[WebSocket] Connecting with session: ${sessionId.substring(0, 8)}...`,
    );

    this.connectionPromise = new Promise((resolve, reject) => {
      this.connectionResolve = resolve;

      try {
        this.ws = new WebSocket(wsUrl);
      } catch (error) {
        console.error("[WebSocket] Failed to create WebSocket:", error);
        this.connectionPromise = null;
        this.connectionResolve = null;
        reject(error);
        return;
      }

      const connectionTimeout = setTimeout(() => {
        if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
          console.error("[WebSocket] Connection timeout");
          this.ws.close();
        }
      }, 10000);

      this.ws.onopen = () => {
        clearTimeout(connectionTimeout);
        console.log("[WebSocket] Connected");
        this.reconnectAttempts = 0;
        this.notifyConnectionHandlers(true);
        this.connectionPromise = null;

        if (this.connectionResolve) {
          this.connectionResolve();
          this.connectionResolve = null;
        }

        // Retry any pending messages
        this.retryPendingMessages();
      };

      this.ws.onmessage = (event) => {
        try {
          const message: Message = JSON.parse(event.data);
          this.messageHandlers.forEach((handler) => handler(message));
        } catch (error) {
          console.error("[WebSocket] Failed to parse message:", error);
        }
      };

      this.ws.onerror = (error) => {
        clearTimeout(connectionTimeout);
        console.error("[WebSocket] Error:", error);
      };

      this.ws.onclose = async (event) => {
        clearTimeout(connectionTimeout);
        console.log(
          `[WebSocket] Disconnected (code: ${event.code}, reason: ${event.reason})`,
        );
        this.ws = null;
        this.connectionPromise = null;
        this.connectionResolve = null;
        this.notifyConnectionHandlers(false);

        // Don't reconnect if intentionally disconnected
        if (this.isIntentionalDisconnect) {
          console.log("[WebSocket] Intentional disconnect, not reconnecting");
          return;
        }

        // Check if disconnected due to token expiry
        if (
          event.code === 1008 ||
          event.reason?.includes("expired") ||
          event.code === 4001
        ) {
          console.log(
            "[WebSocket] Token may have expired, attempting refresh...",
          );
          if (this.tokenRefreshHandler) {
            const newToken = await this.tokenRefreshHandler();
            if (newToken) {
              console.log("[WebSocket] Token refreshed, reconnecting...");
              this.token = newToken;
              this.reconnectAttempts = 0;
              this.attemptReconnect();
              return;
            } else {
              console.log("[WebSocket] Token refresh failed, not reconnecting");
              return;
            }
          }
        }

        // Check for session conflict (409)
        if (event.code === 4009) {
          console.log(
            "[WebSocket] Session conflict - this tab may have reconnected elsewhere",
          );
          return;
        }

        this.attemptReconnect();
      };
    });

    return this.connectionPromise;
  }

  disconnect() {
    this.isIntentionalDisconnect = true;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close(1000, "User disconnected");
      this.ws = null;
    }

    this.reconnectAttempts = 0;
    this.pendingMessages.clear();
    this.notifyConnectionHandlers(false);
    this.notifyPendingMessageHandlers();
  }

  // Send a message with retry support
  sendMessage(content: string): string {
    const messageId = crypto.randomUUID();
    const pendingMessage: PendingMessage = {
      id: messageId,
      content,
      timestamp: new Date(),
      status: "pending",
      retryCount: 0,
    };

    this.pendingMessages.set(messageId, pendingMessage);
    this.notifyPendingMessageHandlers();

    this.trySendMessage(messageId);
    return messageId;
  }

  private trySendMessage(messageId: string) {
    const pending = this.pendingMessages.get(messageId);
    if (!pending) return;

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      pending.status = "failed";
      this.notifyPendingMessageHandlers();
      return;
    }

    pending.status = "sending";
    this.notifyPendingMessageHandlers();

    const message: Message = {
      type: "message",
      content: pending.content,
    };

    try {
      this.ws.send(JSON.stringify(message));
      // Message sent successfully - remove from pending
      // The server will broadcast it back to us
      this.pendingMessages.delete(messageId);
      this.notifyPendingMessageHandlers();
    } catch (error) {
      console.error("[WebSocket] Failed to send message:", error);
      pending.status = "failed";
      pending.retryCount++;
      this.notifyPendingMessageHandlers();
    }
  }

  // Retry a failed message
  retryMessage(messageId: string) {
    const pending = this.pendingMessages.get(messageId);
    if (!pending) return;

    pending.status = "pending";
    pending.retryCount++;
    this.notifyPendingMessageHandlers();
    this.trySendMessage(messageId);
  }

  // Remove a failed message (user gave up)
  removeFailedMessage(messageId: string) {
    this.pendingMessages.delete(messageId);
    this.notifyPendingMessageHandlers();
  }

  // Retry all pending/failed messages
  private retryPendingMessages() {
    for (const [messageId, pending] of this.pendingMessages) {
      if (pending.status === "failed" || pending.status === "pending") {
        this.trySendMessage(messageId);
      }
    }
  }

  // Get current pending messages
  getPendingMessages(): PendingMessage[] {
    return Array.from(this.pendingMessages.values());
  }

  sendTyping() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const message: Message = {
      type: "typing",
    };

    this.ws.send(JSON.stringify(message));
  }

  sendVoiceSignal(toUser: string, signal: any, toSessionId?: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      // #region agent log
      fetch(
        "http://127.0.0.1:7242/ingest/e39950e9-9105-4203-a4e8-2cda83768eed",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: "websocket.ts:308",
            message: "sendVoiceSignal - WS not open",
            data: { toUser, readyState: this.ws?.readyState },
            timestamp: Date.now(),
            sessionId: "debug-session",
            runId: "run1",
            hypothesisId: "B",
          }),
        },
      ).catch(() => {});
      // #endregion
      return;
    }

    const message: Message = {
      type: "voice_signal",
      to_user: toUser,
      signal,
      to_session_id: toSessionId,
    };

    // #region agent log
    fetch("http://127.0.0.1:7242/ingest/e39950e9-9105-4203-a4e8-2cda83768eed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "websocket.ts:318",
        message: "Sending voice_signal",
        data: { toUser, toSessionId, signalType: signal.type },
        timestamp: Date.now(),
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: "B",
      }),
    }).catch(() => {});
    // #endregion
    this.ws.send(JSON.stringify(message));
  }

  sendVoiceJoin() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      // #region agent log
      fetch(
        "http://127.0.0.1:7242/ingest/e39950e9-9105-4203-a4e8-2cda83768eed",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: "websocket.ts:321",
            message: "sendVoiceJoin - WS not open",
            data: { readyState: this.ws?.readyState },
            timestamp: Date.now(),
            sessionId: "debug-session",
            runId: "run1",
            hypothesisId: "A",
          }),
        },
      ).catch(() => {});
      // #endregion
      return;
    }

    const message: Message = {
      type: "voice_join",
    };

    // #region agent log
    fetch("http://127.0.0.1:7242/ingest/e39950e9-9105-4203-a4e8-2cda83768eed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "websocket.ts:329",
        message: "Sending voice_join",
        data: {},
        timestamp: Date.now(),
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: "A",
      }),
    }).catch(() => {});
    // #endregion
    this.ws.send(JSON.stringify(message));
  }

  sendVoiceLeave() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const message: Message = {
      type: "voice_leave",
    };

    this.ws.send(JSON.stringify(message));
  }

  loadMoreMessages(beforeId: number) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const message: Message = {
      type: "load_more",
      before_id: beforeId,
    };

    this.ws.send(JSON.stringify(message));
  }

  onMessage(handler: MessageHandler) {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  onConnectionChange(handler: ConnectionHandler) {
    this.connectionHandlers.add(handler);
    return () => this.connectionHandlers.delete(handler);
  }

  onPendingMessagesChange(handler: PendingMessageHandler) {
    this.pendingMessageHandlers.add(handler);
    return () => this.pendingMessageHandlers.delete(handler);
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }

  private notifyConnectionHandlers(connected: boolean) {
    this.connectionHandlers.forEach((handler) => handler(connected));
  }

  private notifyPendingMessageHandlers() {
    const messages = this.getPendingMessages();
    this.pendingMessageHandlers.forEach((handler) => handler(messages));
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log("[WebSocket] Max reconnect attempts reached");
      // Mark all pending messages as failed
      for (const pending of this.pendingMessages.values()) {
        pending.status = "failed";
      }
      this.notifyPendingMessageHandlers();
      return;
    }

    this.reconnectAttempts++;

    // Exponential backoff with jitter
    const delay = Math.min(
      this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts - 1) +
        Math.random() * 1000,
      this.maxReconnectDelay,
    );

    console.log(
      `[WebSocket] Attempting to reconnect in ${Math.round(delay)}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`,
    );

    this.reconnectTimeout = setTimeout(async () => {
      if (this.token && !this.isIntentionalDisconnect) {
        // Try to refresh token before reconnecting
        if (this.tokenRefreshHandler) {
          const newToken = await this.tokenRefreshHandler();
          if (newToken) {
            this.token = newToken;
          }
        }
        this.connect(this.token);
      }
    }, delay);
  }

  // Force reconnect (used when user wants to manually reconnect)
  async forceReconnect(): Promise<void> {
    this.reconnectAttempts = 0;
    this.isIntentionalDisconnect = false;

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    if (this.token) {
      // Try to refresh token first
      if (this.tokenRefreshHandler) {
        const newToken = await this.tokenRefreshHandler();
        if (newToken) {
          this.token = newToken;
        }
      }
      return this.connect(this.token);
    }
  }
}

export const wsManager = new WebSocketManager();
