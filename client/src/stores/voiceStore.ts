import { create } from "zustand";
import { ConnectionState } from "../lib/webrtc";

interface VoiceState {
  isInVoiceChannel: boolean;
  isMuted: boolean;
  voiceUsers: string[];
  connectionStates: Map<string, ConnectionState>;
  error: string | null;
  kickReason: string | null;

  setInVoiceChannel: (inChannel: boolean) => void;
  setMuted: (muted: boolean) => void;
  setVoiceUsers: (users: string[]) => void;
  setConnectionState: (username: string, state: ConnectionState) => void;
  setError: (error: string | null) => void;
  setKickReason: (reason: string | null) => void;
  reset: () => void;
}

export const useVoiceStore = create<VoiceState>((set) => ({
  isInVoiceChannel: false,
  isMuted: false,
  voiceUsers: [],
  connectionStates: new Map(),
  error: null,
  kickReason: null,

  setInVoiceChannel: (inChannel) => set({ isInVoiceChannel: inChannel }),

  setMuted: (muted) => set({ isMuted: muted }),

  setVoiceUsers: (users) => set({ voiceUsers: users }),

  setConnectionState: (username, state) =>
    set((prevState) => {
      const newStates = new Map(prevState.connectionStates);
      newStates.set(username, state);
      return { connectionStates: newStates };
    }),

  setError: (error) => set({ error }),

  setKickReason: (reason) => set({ kickReason: reason }),

  reset: () =>
    set({
      isInVoiceChannel: false,
      isMuted: false,
      voiceUsers: [],
      connectionStates: new Map(),
      error: null,
      kickReason: null,
    }),
}));
