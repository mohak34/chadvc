import { get, writable } from "svelte/store";
import type { HistoryMessage, Message, PendingMessage } from "../lib/websocket";

export interface ChatMessage {
  id: number;
  username: string;
  content: string;
  timestamp: Date;
}

export interface ChatState {
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
}

const initialState: ChatState = {
  username: "",
  isConnected: false,
  isReconnecting: false,
  reconnectAttempt: 0,
  messages: [],
  onlineUsers: [],
  typingUsers: new Set<string>(),
  hasMoreMessages: false,
  isLoadingMore: false,
  pendingMessages: [],
  showConnectionBanner: false,
};

export const chatState = writable<ChatState>(initialState);

export function setUsername(username: string): void {
  chatState.update((state) => ({ ...state, username }));
}

export function setConnected(isConnected: boolean): void {
  chatState.update((state) => ({
    ...state,
    isConnected,
    isReconnecting: false,
    reconnectAttempt: 0,
    showConnectionBanner: !isConnected && state.showConnectionBanner,
  }));
}

export function setReconnecting(isReconnecting: boolean, reconnectAttempt = 0): void {
  chatState.update((state) => ({
    ...state,
    isReconnecting,
    reconnectAttempt,
    showConnectionBanner: isReconnecting,
  }));
}

export function addMessage(message: Message): void {
  chatState.update((state) => ({
    ...state,
    messages: [
      ...state.messages,
      {
        id: message.id ?? Date.now(),
        username: message.username ?? "System",
        content: message.content ?? "",
        timestamp: message.timestamp ? new Date(message.timestamp) : new Date(),
      },
    ],
  }));
}

export function setMessageHistory(messages: HistoryMessage[], hasMoreMessages: boolean): void {
  chatState.update((state) => ({
    ...state,
    messages: messages.map((message) => ({
      id: message.id,
      username: message.username,
      content: message.content,
      timestamp: new Date(message.timestamp),
    })),
    hasMoreMessages,
  }));
}

export function prependMessages(messages: HistoryMessage[], hasMoreMessages: boolean): void {
  chatState.update((state) => ({
    ...state,
    messages: [
      ...messages.map((message) => ({
        id: message.id,
        username: message.username,
        content: message.content,
        timestamp: new Date(message.timestamp),
      })),
      ...state.messages,
    ],
    hasMoreMessages,
    isLoadingMore: false,
  }));
}

export function setOnlineUsers(onlineUsers: string[]): void {
  chatState.update((state) => ({ ...state, onlineUsers }));
}

export function clearMessages(): void {
  chatState.update((state) => ({ ...state, messages: [], hasMoreMessages: false }));
}

export function setLoadingMore(isLoadingMore: boolean): void {
  chatState.update((state) => ({ ...state, isLoadingMore }));
}

export function getOldestMessageId(): number | null {
  const state = get(chatState);
  if (state.messages.length === 0) {
    return null;
  }
  return state.messages[0].id;
}

export function setPendingMessages(pendingMessages: PendingMessage[]): void {
  chatState.update((state) => ({ ...state, pendingMessages }));
}

export function setShowConnectionBanner(showConnectionBanner: boolean): void {
  chatState.update((state) => ({ ...state, showConnectionBanner }));
}
