<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import ConnectionBanner from "./components/ConnectionBanner.svelte";
  import LoginForm from "./components/LoginForm.svelte";
  import MessageInput from "./components/MessageInput.svelte";
  import MessageList from "./components/MessageList.svelte";
  import UserList from "./components/UserList.svelte";
  import VoiceControls from "./components/VoiceControls.svelte";
  import { webrtcManager } from "./lib/webrtc";
  import { type Message, wsManager } from "./lib/websocket";
  import {
    authState,
    logout,
    refreshAccessToken,
    validateSession,
  } from "./stores/auth.svelte";
  import {
    addMessage,
    chatState,
    clearMessages,
    prependMessages,
    setConnected,
    setMessageHistory,
    setOnlineUsers,
    setPendingMessages,
    setReconnecting,
    setShowConnectionBanner,
    setUsername,
  } from "./stores/chat.svelte";
  import { resetVoiceState, setKickReason, setVoiceUsers } from "./stores/voice.svelte";

  let isInitializing = true;
  let reconnectInterval: ReturnType<typeof setInterval> | null = null;
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  let activeSessionToken: string | null = null;

  const unsubscribers: Array<() => void> = [];

  async function initializeSession(): Promise<void> {
    if ($authState.isAuthenticated) {
      await validateSession();
    }
    isInitializing = false;
  }

  function clearReconnectTimers(): void {
    if (reconnectInterval) {
      clearInterval(reconnectInterval);
      reconnectInterval = null;
    }
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
  }

  function setupSocketSubscriptions(): void {
    let initialHistoryLoaded = false;

    const unsubscribeMessages = wsManager.onMessage((message: Message) => {
      switch (message.type) {
        case "message":
        case "user_joined":
        case "user_left":
          addMessage(message);
          break;
        case "user_list":
          if (message.users) {
            setOnlineUsers(message.users);
          }
          break;
        case "message_history":
          if (!message.messages) {
            break;
          }

          if (!initialHistoryLoaded) {
            setMessageHistory(message.messages, message.has_more ?? false);
            initialHistoryLoaded = true;
          } else {
            prependMessages(message.messages, message.has_more ?? false);
          }
          break;
        case "voice_kick":
          if (message.reason === "joined_from_another_device") {
            setKickReason("Disconnected: You joined voice from another device");
          }
          break;
        case "error":
          break;
      }
    });

    const unsubscribeConnection = wsManager.onConnectionChange((isConnected) => {
      setConnected(isConnected);

      if (!isConnected) {
        initialHistoryLoaded = false;
        setShowConnectionBanner(true);

        clearReconnectTimers();
        reconnectInterval = setInterval(() => {
          const reconnectAttempts = wsManager.getReconnectAttempts();
          if (reconnectAttempts > 0) {
            setReconnecting(true, reconnectAttempts);
          }

          if (wsManager.isConnected()) {
            setReconnecting(false);
            setShowConnectionBanner(false);
            clearReconnectTimers();
          }
        }, 500);

        reconnectTimeout = setTimeout(() => {
          clearReconnectTimers();
        }, 60000);

        return;
      }

      clearReconnectTimers();
      setShowConnectionBanner(false);
      setReconnecting(false);
    });

    const unsubscribePending = wsManager.onPendingMessagesChange((messages) => {
      setPendingMessages(messages);
    });

    const unsubscribeVoiceUsers = webrtcManager.onVoiceUsersChange((users) => {
      setVoiceUsers(users);
    });

    const unsubscribeVoiceKicked = webrtcManager.onVoiceKicked((reason) => {
      resetVoiceState();
      if (reason === "joined_from_another_device") {
        setKickReason("Disconnected: You joined voice from another device");
      }
    });

    unsubscribers.push(
      unsubscribeMessages,
      unsubscribeConnection,
      unsubscribePending,
      unsubscribeVoiceUsers,
      unsubscribeVoiceKicked
    );
  }

  function disconnectRealtime(): void {
    wsManager.disconnect();
    webrtcManager.reset();
    clearReconnectTimers();
    activeSessionToken = null;

    while (unsubscribers.length > 0) {
      const unsubscribe = unsubscribers.pop();
      if (unsubscribe) {
        unsubscribe();
      }
    }
  }

  async function handleLogout(): Promise<void> {
    disconnectRealtime();
    await logout();
    setConnected(false);
    setOnlineUsers([]);
    resetVoiceState();
  }

  function handleReconnect(): void {
    void wsManager.forceReconnect();
  }

  $: authReady = !isInitializing && !$authState.isValidating;
  $: isAuthed = $authState.isAuthenticated && !!$authState.accessToken && !!$authState.user;

  $: if (authReady && isAuthed) {
    const token = $authState.accessToken;
    const username = $authState.user?.username;

    const shouldStartRealtime = unsubscribers.length === 0;

    if (token && username && token !== activeSessionToken && shouldStartRealtime) {
      activeSessionToken = token;
      clearMessages();
      setUsername(username);

      wsManager.setTokenRefreshHandler(async () => {
        const isSuccess = await refreshAccessToken();
        if (!isSuccess) {
          return null;
        }

        return $authState.accessToken;
      });

      void wsManager.connect(token);
      if (unsubscribers.length === 0) {
        setupSocketSubscriptions();
      }
    }
  }

  $: if (authReady && !isAuthed) {
    disconnectRealtime();
  }

  $: currentUserInitial = $authState.user?.username?.charAt(0)?.toUpperCase() ?? "?";

  onMount(() => {
    void initializeSession();
  });

  onDestroy(() => {
    disconnectRealtime();
  });
</script>

{#if isInitializing || $authState.isValidating}
  <div class="min-h-screen bg-chad-bg-darkest flex items-center justify-center">
    <div class="text-chad-muted">Loading...</div>
  </div>
{:else if !$authState.isAuthenticated}
  <LoginForm />
{:else}
  <div class="flex flex-col h-screen bg-chad-bg-darkest text-chad-platinum">
    {#if $chatState.showConnectionBanner}
      <ConnectionBanner onReconnect={handleReconnect} />
    {/if}

    <div class="flex flex-1 overflow-hidden">
      <aside class="w-60 bg-chad-bg-dark flex flex-col border-r border-chad-border">
        <div class="px-4 py-3 border-b border-chad-border flex items-center gap-2">
          <div class="flex-1">
            <h1 class="text-base font-semibold text-chad-platinum">ChadVC</h1>
          </div>
          <div
            class={`w-2 h-2 rounded-full ${
              $chatState.isConnected ? "bg-green-500" : "bg-red-500 animate-pulse"
            }`}
            title={$chatState.isConnected ? "Connected" : "Disconnected"}
          ></div>
        </div>

        <div class="flex-1 overflow-y-auto">
          <VoiceControls />
        </div>

        <div class="p-3 bg-chad-bg-darkest border-t border-chad-border">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-full bg-chad-lavender flex items-center justify-center text-sm font-medium text-chad-platinum">
              {currentUserInitial}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-chad-platinum truncate">{$authState.user?.username}</p>
              <p class={`text-xs ${$chatState.isConnected ? "text-green-500" : "text-red-400"}`}>
                {$chatState.isConnected ? "Online" : "Offline"}
              </p>
            </div>
            <button
              on:click={handleLogout}
              class="p-2 hover:bg-chad-bg-hover rounded text-chad-muted hover:text-chad-platinum transition-colors"
              title="Logout"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      <main class="flex-1 flex flex-col bg-chad-bg-dark">
        <header class="h-12 px-4 flex items-center border-b border-chad-border bg-chad-bg-dark">
          <span class="text-chad-muted mr-2">#</span>
          <span class="font-semibold text-chad-platinum">general</span>
        </header>

        <div class="flex-1 overflow-hidden flex flex-col">
          <MessageList />
        </div>

        <MessageInput />
      </main>

      <aside class="w-60 bg-chad-bg-dark border-l border-chad-border flex flex-col">
        <UserList />
      </aside>
    </div>
  </div>
{/if}
