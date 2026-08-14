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

<div class="px-4 py-3">
  <h3 class="text-[11px] font-bold uppercase tracking-widest text-chad-text-muted mb-3 flex items-center gap-2">
    Voice Channel
  </h3>

  {#if $voiceState.isInVoiceChannel}
    <div class="mb-3 px-1">
      <p class="text-[12px] font-medium text-emerald-500 flex items-center gap-2">
        <span class="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
        Voice Connected
      </p>
      <p class="text-[11px] font-medium text-chad-text-muted mt-1.5">
        {$chatState.onlineUsers.length} user{$chatState.onlineUsers.length !== 1 ? "s" : ""} online
      </p>
    </div>
  {/if}

  {#if $voiceState.kickReason}
    <div class="mb-3">
      <p class="text-[11px] font-medium text-amber-400 bg-amber-500/10 px-3 py-2 rounded-md flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <span>{$voiceState.kickReason}</span>
      </p>
    </div>
  {/if}

  {#if $voiceState.error}
    <div class="mb-3">
      <p class="text-[11px] font-medium text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-md">{$voiceState.error}</p>
    </div>
  {/if}

  {#if !$chatState.isConnected && !$voiceState.isInVoiceChannel}
    <div class="mb-3 px-1">
      <p class="text-[11px] font-medium text-chad-text-muted">Connect to server to join voice</p>
    </div>
  {/if}

  <div class="space-y-1.5">
    {#if !$voiceState.isInVoiceChannel}
      <button
        on:click={handleJoinVoice}
        disabled={isJoining || !$chatState.isConnected}
        class="w-full flex items-center gap-3 px-3 py-2.5 rounded-md bg-chad-bg-light hover:bg-chad-bg-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 border border-chad-border hover:border-chad-border-focus"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
        </svg>
        <span class="text-[13px] font-semibold text-chad-text-primary tracking-wide">{isJoining ? "Joining..." : "Join Voice"}</span>
      </button>
    {:else}
      <div class="flex items-center gap-1.5">
        <button
          on:click={handleToggleMute}
          class={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-md transition-all duration-200 font-semibold text-[13px] tracking-wide ${
            $voiceState.isMuted
              ? "bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20"
              : "bg-chad-bg-light hover:bg-chad-bg-hover text-chad-text-primary border border-chad-border"
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
          <span>{$voiceState.isMuted ? "Unmute" : "Mute"}</span>
        </button>

        <button
          on:click={handleLeaveVoice}
          class="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-md bg-chad-bg-light hover:bg-red-500/10 text-chad-text-muted hover:text-red-400 border border-chad-border hover:border-red-500/20 transition-all duration-200 font-semibold text-[13px] tracking-wide"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span>Disconnect</span>
        </button>
      </div>
    {/if}
  </div>
</div>
