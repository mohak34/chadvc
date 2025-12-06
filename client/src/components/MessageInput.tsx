import { useState } from "react";
import { wsManager } from "../lib/websocket";
import { useChatStore } from "../stores/chatStore";

export default function MessageInput() {
  const [message, setMessage] = useState("");
  const pendingMessages = useChatStore((state) => state.pendingMessages);
  const isConnected = useChatStore((state) => state.isConnected);

  const handleSend = () => {
    if (!message.trim()) return;

    wsManager.sendMessage(message);
    setMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleRetry = (messageId: string) => {
    wsManager.retryMessage(messageId);
  };

  const handleRemove = (messageId: string) => {
    wsManager.removeFailedMessage(messageId);
  };

  const failedMessages = pendingMessages.filter((m) => m.status === "failed");

  return (
    <div className="px-4 pb-6 pt-2">
      {/* Failed messages */}
      {failedMessages.length > 0 && (
        <div className="mb-2 space-y-1">
          {failedMessages.map((pending) => (
            <div
              key={pending.id}
              className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded text-sm"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 text-red-400 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="flex-1 text-red-300 truncate">{pending.content}</span>
              <button
                onClick={() => handleRetry(pending.id)}
                className="px-2 py-1 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded transition-colors"
                title="Retry sending"
              >
                Retry
              </button>
              <button
                onClick={() => handleRemove(pending.id)}
                className="p-1 text-red-400 hover:text-red-300 transition-colors"
                title="Remove message"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <div className={`flex items-center bg-chad-bg rounded-lg ${!isConnected ? 'opacity-75' : ''}`}>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={isConnected ? "Message #general" : "Reconnecting..."}
          disabled={!isConnected}
          className="flex-1 px-4 py-3 bg-transparent focus:outline-none text-chad-platinum placeholder-chad-muted disabled:cursor-not-allowed"
        />
        <button
          onClick={handleSend}
          disabled={!message.trim() || !isConnected}
          className="px-4 py-2 mr-2 text-chad-muted hover:text-chad-platinum disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
