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
    <div className="flex h-screen bg-gray-900 text-white">
      <div className="flex-1 flex flex-col">
        <header className="bg-gray-800 px-6 py-4 border-b border-gray-700 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">ChadVC</h1>
            <p className="text-sm text-gray-400">
              {isConnected ? (
                <>
                  Connected as <span className="text-blue-400">{user?.username}</span>
                </>
              ) : (
                <span className="text-yellow-400">Connecting...</span>
              )}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
          >
            Logout
          </button>
        </header>

        <div className="flex-1 overflow-hidden">
          <MessageList />
        </div>

        <div className="border-t border-gray-700">
          <MessageInput />
        </div>
      </div>

      <aside className="w-64 bg-gray-800 border-l border-gray-700 flex flex-col">
        <div className="flex-1 overflow-y-auto">
          <UserList />
        </div>
        <VoiceControls />
      </aside>
    </div>
  );
}

export default App;
