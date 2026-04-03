<script lang="ts">
  import { getAvatarColor, getAvatarInitial } from "../lib/avatar";
  import { chatState } from "../stores/chat.svelte";
  import { voiceState } from "../stores/voice.svelte";

  function isUserInVoice(user: string): boolean {
    return $voiceState.voiceUsers.includes(user) || (user === $chatState.username && $voiceState.isInVoiceChannel);
  }
</script>

<div class="flex-1 overflow-y-auto p-3">
  <h3 class="text-xs font-semibold uppercase text-chad-muted mb-3 px-2">Online - {$chatState.onlineUsers.length}</h3>
  <div class="space-y-0.5">
    {#each $chatState.onlineUsers as user (user)}
      <div
        class="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-chad-bg-hover transition-colors cursor-pointer group"
      >
        <div class="relative">
          <div
            class={`w-8 h-8 rounded-full ${getAvatarColor(user)} flex items-center justify-center text-sm font-medium text-white`}
          >
            {getAvatarInitial(user)}
          </div>
          <div class="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-chad-bg-dark"></div>
        </div>

        <span class="flex-1 text-chad-muted group-hover:text-chad-platinum transition-colors truncate">
          {user}
          {#if user === $chatState.username}
            <span class="text-xs text-chad-muted ml-1">(you)</span>
          {/if}
        </span>

        {#if isUserInVoice(user)}
          <span class="text-chad-muted" title={user === $chatState.username && $voiceState.isMuted ? "Muted" : "In voice"}>
            {#if user === $chatState.username && $voiceState.isMuted}
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            {:else}
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
            {/if}
          </span>
        {/if}
      </div>
    {/each}
  </div>
</div>
