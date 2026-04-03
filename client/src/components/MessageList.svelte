<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { getAvatarColor, getAvatarInitial, isMoreThan30MinutesApart } from "../lib/avatar";
  import { wsManager } from "../lib/websocket";
  import {
    chatState,
    getOldestMessageId,
    setLoadingMore,
    type ChatMessage,
  } from "../stores/chat.svelte";

  let containerRef: HTMLDivElement | null = null;
  let topSentinelRef: HTMLDivElement | null = null;
  let bottomRef: HTMLDivElement | null = null;

  let previousMessagesLength = 0;
  let previousScrollHeight = 0;
  let observer: IntersectionObserver | null = null;

  function formatTimestamp(date: Date): string {
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    if (isToday) {
      return `Today at ${time}`;
    }
    if (isYesterday) {
      return `Yesterday at ${time}`;
    }
    return `${date.toLocaleDateString([], { month: "short", day: "numeric" })} at ${time}`;
  }

  function shouldShowHeader(currentMessage: ChatMessage, previousMessage: ChatMessage | null): boolean {
    if (!previousMessage) {
      return true;
    }
    if (currentMessage.username !== previousMessage.username) {
      return true;
    }
    if (currentMessage.username === "System") {
      return true;
    }
    return isMoreThan30MinutesApart(currentMessage.timestamp, previousMessage.timestamp);
  }

  function handleLoadMore(): void {
    if ($chatState.isLoadingMore || !$chatState.hasMoreMessages) {
      return;
    }

    const oldestMessageId = getOldestMessageId();
    if (oldestMessageId === null) {
      return;
    }

    if (containerRef) {
      previousScrollHeight = containerRef.scrollHeight;
    }

    setLoadingMore(true);
    wsManager.loadMoreMessages(oldestMessageId);
  }

  function scrollToBottom(behavior: ScrollBehavior): void {
    bottomRef?.scrollIntoView({ behavior });
  }

  $: {
    const currentLength = $chatState.messages.length;
    if (currentLength > previousMessagesLength && containerRef) {
      const isInitialLoad = previousMessagesLength === 0;
      const isPrepend = currentLength - previousMessagesLength > 1;

      requestAnimationFrame(() => {
        if (!containerRef) {
          return;
        }

        if (isInitialLoad) {
          scrollToBottom("auto");
        } else if (isPrepend && previousScrollHeight > 0) {
          const nextScrollHeight = containerRef.scrollHeight;
          const scrollDelta = nextScrollHeight - previousScrollHeight;
          containerRef.scrollTop = scrollDelta;
        } else {
          scrollToBottom("smooth");
        }
      });
    }

    previousMessagesLength = currentLength;
  }

  onMount(() => {
    if (!topSentinelRef) {
      return;
    }

    observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          handleLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(topSentinelRef);
  });

  onDestroy(() => {
    observer?.disconnect();
  });
</script>

<div bind:this={containerRef} class="flex-1 overflow-y-auto px-4 py-2 h-full">
  <div bind:this={topSentinelRef} class="h-1"></div>

  {#if $chatState.isLoadingMore}
    <div class="flex justify-center py-4">
      <div class="text-chad-muted text-sm">Loading older messages...</div>
    </div>
  {/if}

  {#if !$chatState.hasMoreMessages && $chatState.messages.length > 0}
    <div class="flex justify-center py-4 mb-4">
      <div class="text-chad-muted text-xs">This is the beginning of the conversation</div>
    </div>
  {/if}

  {#if $chatState.messages.length === 0 && !$chatState.isLoadingMore}
    <div class="flex items-center justify-center h-full text-chad-muted">No messages yet. Start the conversation!</div>
  {:else}
    {#each $chatState.messages as message, index (message.id)}
      {@const previousMessage = index > 0 ? $chatState.messages[index - 1] : null}
      {@const showHeader = shouldShowHeader(message, previousMessage)}
      {@const isSystem = message.username === "System"}

      {#if isSystem}
        <div class="py-1 px-4 text-center">
          <span class="text-xs text-chad-muted">{message.content}</span>
          <span class="text-xs text-chad-muted ml-2">{formatTimestamp(message.timestamp)}</span>
        </div>
      {:else}
        <div class={`group flex gap-4 py-0.5 px-2 hover:bg-chad-bg-hover rounded ${showHeader ? "mt-4" : ""}`}>
          <div class="w-10 flex-shrink-0">
            {#if showHeader}
              <div
                class={`w-10 h-10 rounded-full ${getAvatarColor(message.username)} flex items-center justify-center text-sm font-medium text-white`}
              >
                {getAvatarInitial(message.username)}
              </div>
            {/if}
          </div>

          <div class="flex-1 min-w-0">
            {#if showHeader}
              <div class="flex items-baseline gap-2">
                <span class="font-medium text-chad-steel hover:underline cursor-pointer">{message.username}</span>
                <span class="text-xs text-chad-muted">{formatTimestamp(message.timestamp)}</span>
              </div>
            {/if}
            <div class="text-chad-platinum leading-relaxed break-words">{message.content}</div>
          </div>
        </div>
      {/if}
    {/each}
  {/if}

  <div bind:this={bottomRef}></div>
</div>
