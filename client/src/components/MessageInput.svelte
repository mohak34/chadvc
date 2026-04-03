<script lang="ts">
  import type { PendingMessage } from "../lib/websocket";
  import { wsManager } from "../lib/websocket";
  import { chatState } from "../stores/chat.svelte";

  let message = "";
  let failedMessages: PendingMessage[] = [];

  function handleSend(): void {
    if (!message.trim()) {
      return;
    }

    wsManager.sendMessage(message);
    message = "";
  }

  function handleKeyDown(event: KeyboardEvent): void {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  }

  function handleRetry(messageId: string): void {
    wsManager.retryMessage(messageId);
  }

  function handleRemove(messageId: string): void {
    wsManager.removeFailedMessage(messageId);
  }

  $: failedMessages = $chatState.pendingMessages.filter((pending) => pending.status === "failed");
</script>

<div class="px-4 pb-6 pt-2">
  {#if failedMessages.length > 0}
    <div class="mb-2 space-y-1">
      {#each failedMessages as pending (pending.id)}
        <div class="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded text-sm">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-4 w-4 text-red-400 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span class="flex-1 text-red-300 truncate">{pending.content}</span>
          <button
            on:click={() => handleRetry(pending.id)}
            class="px-2 py-1 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded transition-colors"
            title="Retry sending"
          >
            Retry
          </button>
          <button
            on:click={() => handleRemove(pending.id)}
            class="p-1 text-red-400 hover:text-red-300 transition-colors"
            title="Remove message"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      {/each}
    </div>
  {/if}

  <div class={`flex items-center bg-chad-bg rounded-lg ${!$chatState.isConnected ? "opacity-75" : ""}`}>
    <input
      type="text"
      bind:value={message}
      on:keydown={handleKeyDown}
      placeholder={$chatState.isConnected ? "Message #general" : "Reconnecting..."}
      disabled={!$chatState.isConnected}
      class="flex-1 px-4 py-3 bg-transparent focus:outline-none text-chad-platinum placeholder-chad-muted disabled:cursor-not-allowed"
    />
    <button
      on:click={handleSend}
      disabled={!message.trim() || !$chatState.isConnected}
      aria-label="Send message"
      class="px-4 py-2 mr-2 text-chad-muted hover:text-chad-platinum disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
      </svg>
    </button>
  </div>
</div>
