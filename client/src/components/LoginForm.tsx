import { useState } from "react";
import { useChatStore } from "../stores/chatStore";

interface LoginFormProps {
  onLogin: (username: string) => void;
}

export default function LoginForm({ onLogin }: LoginFormProps) {
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const setStoreUsername = useChatStore((state) => state.setUsername);

  const handleConnect = () => {
    if (!username.trim()) {
      setError("Please enter a username");
      return;
    }

    setError("");
    setStoreUsername(username.trim());
    onLogin(username.trim());
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleConnect();
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-8">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-3xl font-bold mb-2 text-white">ChadVC</h1>
        <p className="text-gray-400 mb-6">Enter your username to join</p>

        <div className="space-y-4">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Username"
            className="w-full px-4 py-3 bg-gray-700 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none text-white"
          />

          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}

          <button
            onClick={handleConnect}
            className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
          >
            Connect
          </button>
        </div>

        <div className="mt-6 text-sm text-gray-500 text-center">
          Make sure the server is running on localhost:8080
        </div>
      </div>
    </div>
  );
}
