import { create } from "zustand";
import { Message, HistoryMessage, PendingMessage } from "../lib/websocket";

interface ChatMessage {
  id: number;
  username: string;
  content: string;
  timestamp: Date;
}

interface ChatState {
  username: string;
  isConnected: boolean;
  isReconnecting: boolean;
  reconnectAttempt: number;
  messages: ChatMessage[];
  onlineUsers: string[];
  typingUsers: Set<string>;
  hasMoreMessages: boolean;
  isLoadingMore: boolean;
  pendingMessages: PendingMessage[];
  showConnectionBanner: boolean;

  setUsername: (username: string) => void;
  setConnected: (connected: boolean) => void;
  setReconnecting: (reconnecting: boolean, attempt?: number) => void;
  addMessage: (message: Message) => void;
  setMessageHistory: (messages: HistoryMessage[], hasMore: boolean) => void;
  prependMessages: (messages: HistoryMessage[], hasMore: boolean) => void;
  setOnlineUsers: (users: string[]) => void;
  addTypingUser: (username: string) => void;
  removeTypingUser: (username: string) => void;
  clearMessages: () => void;
  setLoadingMore: (loading: boolean) => void;
  getOldestMessageId: () => number | null;
  setPendingMessages: (messages: PendingMessage[]) => void;
  setShowConnectionBanner: (show: boolean) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  username: "",
  isConnected: false,
  isReconnecting: false,
  reconnectAttempt: 0,
  messages: [],
  onlineUsers: [],
  typingUsers: new Set(),
  hasMoreMessages: false,
  isLoadingMore: false,
  pendingMessages: [],
  showConnectionBanner: false,

  setUsername: (username) => set({ username }),

  setConnected: (connected) => {
    set({ 
      isConnected: connected,
      isReconnecting: false,
      reconnectAttempt: 0,
      // Hide banner when connected
      showConnectionBanner: !connected && get().showConnectionBanner,
    });
  },

  setReconnecting: (reconnecting, attempt = 0) => set({ 
    isReconnecting: reconnecting, 
    reconnectAttempt: attempt,
    showConnectionBanner: reconnecting,
  }),

  addMessage: (message) =>
    set((state) => {
      const newMessage: ChatMessage = {
        id: message.id || Date.now(),
        username: message.username || "System",
        content: message.content || "",
        timestamp: message.timestamp ? new Date(message.timestamp) : new Date(),
      };
      return { messages: [...state.messages, newMessage] };
    }),

  setMessageHistory: (messages, hasMore) =>
    set(() => {
      const chatMessages: ChatMessage[] = messages.map((msg) => ({
        id: msg.id,
        username: msg.username,
        content: msg.content,
        timestamp: new Date(msg.timestamp),
      }));
      return { messages: chatMessages, hasMoreMessages: hasMore };
    }),

  prependMessages: (messages, hasMore) =>
    set((state) => {
      const newMessages: ChatMessage[] = messages.map((msg) => ({
        id: msg.id,
        username: msg.username,
        content: msg.content,
        timestamp: new Date(msg.timestamp),
      }));
      return {
        messages: [...newMessages, ...state.messages],
        hasMoreMessages: hasMore,
        isLoadingMore: false,
      };
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

  clearMessages: () => set({ messages: [], hasMoreMessages: false }),

  setLoadingMore: (loading) => set({ isLoadingMore: loading }),

  getOldestMessageId: () => {
    const state = get();
    if (state.messages.length === 0) return null;
    return state.messages[0].id;
  },

  setPendingMessages: (messages) => set({ pendingMessages: messages }),

  setShowConnectionBanner: (show) => set({ showConnectionBanner: show }),
}));
