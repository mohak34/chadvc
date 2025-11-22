export type MessageType = 
  | "message" 
  | "user_list" 
  | "user_joined" 
  | "user_left" 
  | "voice_signal" 
  | "voice_join" 
  | "voice_leave" 
  | "typing" 
  | "error";

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
}

export type MessageHandler = (message: Message) => void;

export class WebSocketManager {
  private ws: WebSocket | null = null;
  private messageHandlers: Set<MessageHandler> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private username: string = "";

  connect(username: string, url: string = "ws://localhost:8080/ws") {
    this.username = username;
    const wsUrl = `${url}?username=${encodeURIComponent(username)}`;

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log("WebSocket connected");
      this.reconnectAttempts = 0;
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

    this.ws.onclose = () => {
      console.log("WebSocket disconnected");
      this.ws = null;
      this.attemptReconnect();
    };
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.reconnectAttempts = this.maxReconnectAttempts;
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

  onMessage(handler: MessageHandler) {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
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
      if (this.username) {
        this.connect(this.username);
      }
    }, delay);
  }
}

export const wsManager = new WebSocketManager();
