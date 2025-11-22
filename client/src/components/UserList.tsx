import { useChatStore } from "../stores/chatStore";

export default function UserList() {
  const onlineUsers = useChatStore((state) => state.onlineUsers);
  const username = useChatStore((state) => state.username);

  return (
    <div className="w-64 bg-gray-800 border-l border-gray-700 p-4">
      <h3 className="text-lg font-semibold mb-4 text-white">
        Online Users ({onlineUsers.length})
      </h3>
      <div className="space-y-2">
        {onlineUsers.map((user) => (
          <div
            key={user}
            className={`flex items-center gap-2 p-2 rounded ${
              user === username ? "bg-blue-600" : "bg-gray-700"
            }`}
          >
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-white">{user}</span>
            {user === username && (
              <span className="text-xs text-gray-300">(you)</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
