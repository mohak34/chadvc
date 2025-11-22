import { useChatStore } from "../stores/chatStore";

export default function MessageList() {
  const messages = useChatStore((state) => state.messages);
  const username = useChatStore((state) => state.username);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-2">
      {messages.length === 0 ? (
        <div className="flex items-center justify-center h-full text-gray-500">
          No messages yet. Start chatting!
        </div>
      ) : (
        messages.map((msg) => (
          <div
            key={msg.id}
            className={`p-3 rounded-lg ${
              msg.username === username
                ? "bg-blue-600 ml-auto max-w-md"
                : msg.username === "System"
                ? "bg-gray-700 text-center text-sm text-gray-400"
                : "bg-gray-800 max-w-md"
            }`}
          >
            {msg.username !== "System" && (
              <div className="text-xs text-gray-400 mb-1">
                {msg.username}
              </div>
            )}
            <div className="text-white">{msg.content}</div>
            <div className="text-xs text-gray-500 mt-1">
              {msg.timestamp.toLocaleTimeString()}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
