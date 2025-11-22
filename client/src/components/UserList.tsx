import { useChatStore } from "../stores/chatStore";
import { useVoiceStore } from "../stores/voiceStore";

export default function UserList() {
  const onlineUsers = useChatStore((state) => state.onlineUsers);
  const username = useChatStore((state) => state.username);
  const voiceUsers = useVoiceStore((state) => state.voiceUsers);
  const isMuted = useVoiceStore((state) => state.isMuted);
  const isInVoiceChannel = useVoiceStore((state) => state.isInVoiceChannel);

  const isUserInVoice = (user: string) => {
    return voiceUsers.includes(user) || (user === username && isInVoiceChannel);
  };

  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-4 text-white">
        Online Users ({onlineUsers.length})
      </h3>
      <div className="space-y-2">
        {onlineUsers.map((user) => {
          const inVoice = isUserInVoice(user);
          const isCurrentUser = user === username;
          const isCurrentUserMuted = isCurrentUser && isMuted;

          return (
            <div
              key={user}
              className={`flex items-center gap-2 p-2 rounded ${
                isCurrentUser ? "bg-blue-600" : "bg-gray-700"
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  inVoice ? "bg-green-500 animate-pulse" : "bg-green-500"
                }`}
              ></div>
              <span className="text-white flex-1">{user}</span>
              
              {inVoice && (
                <span className="text-xs text-green-400">
                  {isCurrentUserMuted ? "🔇" : "🔊"}
                </span>
              )}
              
              {isCurrentUser && (
                <span className="text-xs text-gray-300">(you)</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
