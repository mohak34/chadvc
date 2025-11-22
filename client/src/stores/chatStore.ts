import { create } from "zustand";
import { Message } from "../lib/websocket";

interface ChatMessage {
  id: string;
  username: string;
  content: string;
  timestamp: Date;
}

interface ChatState {
  username: string;
  isConnected: boolean;
  messages: ChatMessage[];
  onlineUsers: string[];
  typingUsers: Set<string>;

  setUsername: (username: string) => void;
  setConnected: (connected: boolean) => void;
  addMessage: (message: Message) => void;
  setOnlineUsers: (users: string[]) => void;
  addTypingUser: (username: string) => void;
  removeTypingUser: (username: string) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  username: "",
  isConnected: false,
  messages: [],
  onlineUsers: [],
  typingUsers: new Set(),

  setUsername: (username) => set({ username }),

  setConnected: (connected) => set({ isConnected: connected }),

  addMessage: (message) =>
    set((state) => {
      const newMessage: ChatMessage = {
        id: `${message.username}-${Date.now()}`,
        username: message.username || "System",
        content: message.content || "",
        timestamp: message.timestamp ? new Date(message.timestamp) : new Date(),
      };
      return { messages: [...state.messages, newMessage] };
    }),

  setOnlineUsers: (users) => set({ onlineUsers: users }),

  addTypingUser: (username) =>
    set((state) => {
      const newTypingUsers = new Set(state.typingUsers);
      newTypingUsers.add(username);
      return { typingUsers: newTypingUsers };
    }),

  removeTypingUser: (username) =>
    set((state) => {
      const newTypingUsers = new Set(state.typingUsers);
      newTypingUsers.delete(username);
      return { typingUsers: newTypingUsers };
    }),

  clearMessages: () => set({ messages: [] }),
}));
