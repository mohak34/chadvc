import { useEffect } from "react";
import { useChatStore } from "./stores/chatStore";
import { useAuthStore } from "./stores/authStore";
import { useVoiceStore } from "./stores/voiceStore";
import { wsManager, Message } from "./lib/websocket";
import { webrtcManager } from "./lib/webrtc";
import LoginForm from "./components/LoginForm";
import MessageList from "./components/MessageList";
import MessageInput from "./components/MessageInput";
import UserList from "./components/UserList";
import VoiceControls from "./components/VoiceControls";

function App() {
  const { isConnected, setConnected, addMessage, setOnlineUsers, setUsername, setMessageHistory, prependMessages, clearMessages } = useChatStore();
  const { user, isAuthenticated, accessToken, logout, refreshAccessToken } = useAuthStore();
  const { setVoiceUsers } = useVoiceStore();

  // Set up token refresh handler for WebSocket
  useEffect(() => {
    wsManager.setTokenRefreshHandler(async () => {
      const success = await refreshAccessToken();
      if (success) {
        return useAuthStore.getState().accessToken;
      }
      return null;
    });
  }, [refreshAccessToken]);

  // Connect WebSocket when authenticated
  useEffect(() => {
    if (!isAuthenticated || !accessToken || !user) return;

    // Clear messages when connecting fresh
    clearMessages();

    // Set username in chat store
    setUsername(user.username);

    // Connect with token
    wsManager.connect(accessToken);

    // Track if this is the initial history load
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
          if (message.messages) {
            if (!initialHistoryLoaded) {
              // Initial history load
              setMessageHistory(message.messages, message.has_more || false);
              initialHistoryLoaded = true;
            } else {
              // Pagination - prepend older messages
              prependMessages(message.messages, message.has_more || false);
            }
          }
          break;
        case "error":
          console.error("Server error:", message.error);
          break;
      }
    });

    const unsubscribeConnection = wsManager.onConnectionChange((connected) => {
      setConnected(connected);
      if (!connected) {
        initialHistoryLoaded = false;
      }
    });

    const unsubscribeVoice = webrtcManager.onVoiceUsersChange((users) => {
      setVoiceUsers(users);
    });

    return () => {
      unsubscribeMessages();
      unsubscribeConnection();
      unsubscribeVoice();
      wsManager.disconnect();
    };
  }, [isAuthenticated, accessToken, user, addMessage, setOnlineUsers, setConnected, setVoiceUsers, setUsername, setMessageHistory, prependMessages, clearMessages]);

  const handleLoginSuccess = () => {
    // WebSocket will connect via the useEffect above
  };

  const handleLogout = async () => {
    wsManager.disconnect();
    await logout();
    setConnected(false);
    setOnlineUsers([]);
  };

  if (!isAuthenticated) {
    return <LoginForm onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex h-screen bg-chad-bg-darkest text-chad-platinum">
      {/* Left Sidebar - App info, voice controls, current user */}
      <aside className="w-60 bg-chad-bg-dark flex flex-col border-r border-chad-border">
        {/* App header */}
        <div className="px-4 py-3 border-b border-chad-border">
          <h1 className="text-base font-semibold text-chad-platinum">ChadVC</h1>
          <p className="text-xs text-chad-muted">
            {isConnected ? "Connected" : "Connecting..."}
          </p>
        </div>

        {/* Voice controls in middle area */}
        <div className="flex-1 overflow-y-auto">
          <VoiceControls />
        </div>

        {/* Current user panel at bottom */}
        <div className="p-3 bg-chad-bg-darkest border-t border-chad-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-chad-lavender flex items-center justify-center text-sm font-medium text-chad-platinum">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-chad-platinum truncate">
                {user?.username}
              </p>
              <p className="text-xs text-chad-muted">Online</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-chad-bg-hover rounded text-chad-muted hover:text-chad-platinum transition-colors"
              title="Logout"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col bg-chad-bg-dark">
        {/* Channel header */}
        <header className="h-12 px-4 flex items-center border-b border-chad-border bg-chad-bg-dark">
          <span className="text-chad-muted mr-2">#</span>
          <span className="font-semibold text-chad-platinum">general</span>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <MessageList />
        </div>

        {/* Message Input */}
        <MessageInput />
      </main>

      {/* Right Sidebar - Online users */}
      <aside className="w-60 bg-chad-bg-dark border-l border-chad-border flex flex-col">
        <UserList />
      </aside>
    </div>
  );
}

export default App;
