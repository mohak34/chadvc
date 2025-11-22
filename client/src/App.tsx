import { useEffect } from "react";
import { useChatStore } from "./stores/chatStore";
import { wsManager, Message } from "./lib/websocket";
import LoginForm from "./components/LoginForm";
import MessageList from "./components/MessageList";
import MessageInput from "./components/MessageInput";
import UserList from "./components/UserList";

function App() {
  const { username, isConnected, setConnected, addMessage, setOnlineUsers } = useChatStore();

  useEffect(() => {
    if (!username) return;

    const unsubscribe = wsManager.onMessage((message: Message) => {
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
        case "error":
          console.error("Server error:", message.error);
          break;
      }
    });

    const checkConnection = setInterval(() => {
      setConnected(wsManager.isConnected());
    }, 1000);

    return () => {
      unsubscribe();
      clearInterval(checkConnection);
    };
  }, [username, addMessage, setOnlineUsers, setConnected]);

  const handleLogin = (username: string) => {
    wsManager.connect(username);
  };

  if (!username || !isConnected) {
    return <LoginForm onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      <div className="flex-1 flex flex-col">
        <header className="bg-gray-800 px-6 py-4 border-b border-gray-700">
          <h1 className="text-xl font-bold">ChadVC</h1>
          <p className="text-sm text-gray-400">
            Connected as <span className="text-blue-400">{username}</span>
          </p>
        </header>

        <div className="flex-1 overflow-hidden">
          <MessageList />
        </div>

        <div className="border-t border-gray-700">
          <MessageInput />
        </div>
      </div>

      <aside className="w-64 bg-gray-800 border-l border-gray-700">
        <UserList />
      </aside>
    </div>
  );
}

export default App;
