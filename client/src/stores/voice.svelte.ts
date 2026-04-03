import { writable } from "svelte/store";
import type { ConnectionState } from "../lib/webrtc";

export interface VoiceState {
  isInVoiceChannel: boolean;
  isMuted: boolean;
  voiceUsers: string[];
  connectionStates: Map<string, ConnectionState>;
  error: string | null;
  kickReason: string | null;
}

const initialState: VoiceState = {
  isInVoiceChannel: false,
  isMuted: false,
  voiceUsers: [],
  connectionStates: new Map<string, ConnectionState>(),
  error: null,
  kickReason: null,
};

export const voiceState = writable<VoiceState>(initialState);

export function setInVoiceChannel(isInVoiceChannel: boolean): void {
  voiceState.update((state) => ({ ...state, isInVoiceChannel }));
}

export function setMuted(isMuted: boolean): void {
  voiceState.update((state) => ({ ...state, isMuted }));
}

export function setVoiceUsers(voiceUsers: string[]): void {
  voiceState.update((state) => ({ ...state, voiceUsers }));
}

export function setConnectionState(username: string, connectionState: ConnectionState): void {
  voiceState.update((state) => {
    const updatedConnectionStates = new Map(state.connectionStates);
    updatedConnectionStates.set(username, connectionState);
    return { ...state, connectionStates: updatedConnectionStates };
  });
}

export function setVoiceError(error: string | null): void {
  voiceState.update((state) => ({ ...state, error }));
}

export function setKickReason(kickReason: string | null): void {
  voiceState.update((state) => ({ ...state, kickReason }));
}

export function resetVoiceState(): void {
  voiceState.set(initialState);
}
