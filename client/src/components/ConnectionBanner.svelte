<script lang="ts">
  import { chatState } from "../stores/chat.svelte";

  export let onReconnect: () => void;
</script>

{#if !$chatState.isConnected}
  <div class="bg-red-500/20 border-b border-red-500/30 px-4 py-2">
    <div class="flex items-center justify-between max-w-screen-xl mx-auto">
      <div class="flex items-center gap-3">
        {#if $chatState.isReconnecting}
          <div class="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin"></div>
          <span class="text-sm text-red-300">
            Reconnecting... (attempt {$chatState.reconnectAttempt})
          </span>
        {:else}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-4 w-4 text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <span class="text-sm text-red-300">Connection lost. Messages may not be sent.</span>
        {/if}
      </div>
      {#if !$chatState.isReconnecting}
        <button
          on:click={onReconnect}
          class="px-3 py-1 text-sm bg-red-500/30 hover:bg-red-500/50 text-red-200 rounded transition-colors"
        >
          Reconnect
        </button>
      {/if}
    </div>
  </div>
{/if}
