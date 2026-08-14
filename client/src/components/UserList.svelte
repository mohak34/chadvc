<script lang="ts">
  import { getAvatarColor, getAvatarInitial } from "../lib/avatar";
  import { chatState } from "../stores/chat.svelte";
  import { voiceState } from "../stores/voice.svelte";

  function isUserInVoice(user: string): boolean {
    return $voiceState.voiceUsers.includes(user) || (user === $chatState.username && $voiceState.isInVoiceChannel);
  }
</script>

<div class="flex-1 overflow-y-auto px-2 py-4">
  <h3 class="text-[11px] font-bold uppercase tracking-widest text-chad-text-muted mb-4 px-3 flex items-center gap-2">
    Online <span class="bg-chad-bg-hover text-chad-text-primary px-1.5 py-0.5 rounded text-[10px]">{ $chatState.onlineUsers.length }</span>
  </h3>
  <div class="space-y-1">
    {#each $chatState.onlineUsers as user (user)}
      <div
        class="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-chad-bg-hover transition-colors cursor-pointer group"
      >
        <div class="relative flex-shrink-0">
          <div
            class={`w-8 h-8 rounded-full bg-[var(--color-${getAvatarColor(user).replace('bg-', '')})] flex items-center justify-center text-[13px] font-bold text-white shadow-sm`}
          >
            {getAvatarInitial(user)}
          </div>
          <div class="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-chad-accent rounded-full border-2 border-chad-bg"></div>
        </div>

        <div class="flex-1 flex items-baseline truncate">
          <span class="text-[14px] font-medium text-chad-text-secondary group-hover:text-chad-text-primary transition-colors truncate">
            {user}
          </span>
          {#if user === $chatState.username}
            <span class="text-[10px] font-medium text-chad-text-muted ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-wider">You</span>
          {/if}
        </div>

        {#if isUserInVoice(user)}
          <span class="text-chad-text-muted flex-shrink-0" title={user === $chatState.username && $voiceState.isMuted ? "Muted" : "In voice"}>
            {#if user === $chatState.username && $voiceState.isMuted}
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            {:else}
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
            {/if}
          </span>
        {/if}
      </div>
    {/each}
  </div>
</div>
