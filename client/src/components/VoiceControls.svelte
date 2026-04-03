<script lang="ts">
  import { onDestroy } from "svelte";
  import { webrtcManager } from "../lib/webrtc";
  import { chatState } from "../stores/chat.svelte";
  import {
    resetVoiceState,
    setInVoiceChannel,
    setKickReason,
    setMuted,
    setVoiceError,
    setVoiceUsers,
    voiceState,
  } from "../stores/voice.svelte";

  let isJoining = false;
  let kickReasonTimer: ReturnType<typeof setTimeout> | null = null;

  const unsubscribeKick = webrtcManager.onVoiceKicked((reason) => {
    setInVoiceChannel(false);
    setMuted(false);
    setVoiceUsers([]);

    if (reason === "joined_from_another_device") {
      setKickReason("Disconnected: You joined voice from another device");
      return;
    }

    setKickReason("Disconnected from voice");
  });

  $: {
    const reason = $voiceState.kickReason;
    if (kickReasonTimer) {
      clearTimeout(kickReasonTimer);
      kickReasonTimer = null;
    }
    if (reason) {
      kickReasonTimer = setTimeout(() => {
        setKickReason(null);
      }, 5000);
    }
  }

  onDestroy(() => {
    unsubscribeKick();
    if (kickReasonTimer) {
      clearTimeout(kickReasonTimer);
    }
  });

  async function handleJoinVoice(): Promise<void> {
    if (!$chatState.isConnected) {
      setVoiceError("Not connected to server");
      return;
    }

    isJoining = true;
    setVoiceError(null);
    setKickReason(null);

    try {
      const connectedVoiceUsers = webrtcManager.getVoiceUsers();
      await webrtcManager.joinVoiceChannel(connectedVoiceUsers);
      setInVoiceChannel(true);
    } catch (error) {
      setVoiceError(error instanceof Error ? error.message : "Failed to join voice channel");
    } finally {
      isJoining = false;
    }
  }

  function handleLeaveVoice(): void {
    webrtcManager.leaveVoiceChannel();
    resetVoiceState();
  }

  function handleToggleMute(): void {
    const nextMuteState = webrtcManager.toggleMute();
    setMuted(nextMuteState);
  }
</script>

<div class="p-3">
  <div class="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-chad-bg-hover cursor-pointer mb-2">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="h-5 w-5 text-chad-muted"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
      />
    </svg>
    <span class="text-chad-muted text-sm">Voice Channel</span>
  </div>

  {#if $voiceState.isInVoiceChannel}
    <div class="mb-2 px-2">
      <p class="text-xs text-green-500 flex items-center gap-1">
        <span class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
        Voice Connected
      </p>
      <p class="text-xs text-chad-muted mt-0.5">
        {$chatState.onlineUsers.length} user{$chatState.onlineUsers.length !== 1 ? "s" : ""} online
      </p>
    </div>
  {/if}

  {#if $voiceState.kickReason}
    <div class="mb-2 px-2">
      <p class="text-xs text-yellow-400 bg-yellow-500/10 px-2 py-1.5 rounded flex items-center gap-1">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        {$voiceState.kickReason}
      </p>
    </div>
  {/if}

  {#if $voiceState.error}
    <div class="mb-2 px-2">
      <p class="text-xs text-red-400 bg-red-500/10 px-2 py-1.5 rounded">{$voiceState.error}</p>
    </div>
  {/if}

  {#if !$chatState.isConnected && !$voiceState.isInVoiceChannel}
    <div class="mb-2 px-2">
      <p class="text-xs text-chad-muted">Connect to server to join voice</p>
    </div>
  {/if}

  <div class="space-y-1">
    {#if !$voiceState.isInVoiceChannel}
      <button
        on:click={handleJoinVoice}
        disabled={isJoining || !$chatState.isConnected}
        class="w-full flex items-center gap-2 px-3 py-2 rounded bg-chad-bg hover:bg-chad-bg-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
          />
        </svg>
        <span class="text-sm text-chad-platinum">{isJoining ? "Joining..." : "Join Voice"}</span>
      </button>
    {:else}
      <button
        on:click={handleToggleMute}
        class={`w-full flex items-center gap-2 px-3 py-2 rounded transition-colors ${
          $voiceState.isMuted
            ? "bg-red-500/20 hover:bg-red-500/30 text-red-400"
            : "bg-chad-bg hover:bg-chad-bg-hover text-chad-platinum"
        }`}
      >
        {#if $voiceState.isMuted}
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
          </svg>
        {:else}
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        {/if}
        <span class="text-sm">{$voiceState.isMuted ? "Unmute" : "Mute"}</span>
      </button>

      <button
        on:click={handleLeaveVoice}
        class="w-full flex items-center gap-2 px-3 py-2 rounded bg-chad-bg hover:bg-red-500/20 text-chad-muted hover:text-red-400 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
          />
        </svg>
        <span class="text-sm">Disconnect</span>
      </button>
    {/if}
  </div>
</div>
