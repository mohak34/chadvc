export type MessageType = 
  | "message" 
  | "user_list" 
  | "user_joined" 
  | "user_left" 
  | "voice_signal" 
  | "voice_join" 
  | "voice_leave" 
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
}

export type MessageHandler = (message: Message) => void;
export type ConnectionHandler = (connected: boolean) => void;
export type TokenRefreshHandler = () => Promise<string | null>;

export class WebSocketManager {
  private ws: WebSocket | null = null;
  private messageHandlers: Set<MessageHandler> = new Set();
  private connectionHandlers: Set<ConnectionHandler> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private token: string = "";
  private tokenRefreshHandler: TokenRefreshHandler | null = null;

  setTokenRefreshHandler(handler: TokenRefreshHandler) {
    this.tokenRefreshHandler = handler;
  }

  connect(token: string, url?: string) {
    this.token = token;
    
    if (!url) {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.hostname;
      url = `${protocol}//${host}:8080/ws`;
    }
    
    const wsUrl = `${url}?token=${encodeURIComponent(token)}`;
    console.log(`[WebSocket] Connecting with token...`);

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log("WebSocket connected");
      this.reconnectAttempts = 0;
      this.notifyConnectionHandlers(true);
    };

    this.ws.onmessage = (event) => {
      try {
        const message: Message = JSON.parse(event.data);
        this.messageHandlers.forEach((handler) => handler(message));
      } catch (error) {
        console.error("Failed to parse message:", error);
      }
    };

    this.ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    this.ws.onclose = async (event) => {
      console.log("WebSocket disconnected", event.code, event.reason);
      this.ws = null;
      this.notifyConnectionHandlers(false);
      
      // Check if disconnected due to token expiry (401)
      if (event.code === 1008 || event.reason?.includes("expired")) {
        // Try to refresh token
        if (this.tokenRefreshHandler) {
          const newToken = await this.tokenRefreshHandler();
          if (newToken) {
            this.token = newToken;
            this.reconnectAttempts = 0;
            this.attemptReconnect();
            return;
          }
        }
      }
      
      this.attemptReconnect();
    };
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.reconnectAttempts = this.maxReconnectAttempts;
    this.notifyConnectionHandlers(false);
  }

  sendMessage(content: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error("WebSocket is not connected");
      return;
    }

    const message: Message = {
      type: "message",
      content,
    };

    this.ws.send(JSON.stringify(message));
  }

  sendTyping() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const message: Message = {
      type: "typing",
    };

    this.ws.send(JSON.stringify(message));
  }

  sendVoiceSignal(toUser: string, signal: any) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const message: Message = {
      type: "voice_signal",
      to_user: toUser,
      signal,
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

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private notifyConnectionHandlers(connected: boolean) {
    this.connectionHandlers.forEach((handler) => handler(connected));
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log("Max reconnect attempts reached");
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts;

    console.log(`Attempting to reconnect in ${delay}ms...`);

    setTimeout(() => {
      if (this.token) {
        this.connect(this.token);
      }
    }, delay);
  }
}

export const wsManager = new WebSocketManager();
