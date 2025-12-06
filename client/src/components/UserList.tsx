import { useChatStore } from "../stores/chatStore";
import { useVoiceStore } from "../stores/voiceStore";
import { getAvatarColor, getAvatarInitial } from "../lib/avatar";

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
    <div className="flex-1 overflow-y-auto p-3">
      <h3 className="text-xs font-semibold uppercase text-chad-muted mb-3 px-2">
        Online - {onlineUsers.length}
      </h3>
      <div className="space-y-0.5">
        {onlineUsers.map((user) => {
          const inVoice = isUserInVoice(user);
          const isCurrentUser = user === username;
          const isCurrentUserMuted = isCurrentUser && isMuted;

          return (
            <div
              key={user}
              className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-chad-bg-hover transition-colors cursor-pointer group"
            >
              {/* Avatar with online indicator */}
              <div className="relative">
                <div
                  className={`w-8 h-8 rounded-full ${getAvatarColor(user)} flex items-center justify-center text-sm font-medium text-white`}
                >
                  {getAvatarInitial(user)}
                </div>
                {/* Online status indicator */}
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-chad-bg-dark"></div>
              </div>

              {/* Username */}
              <span className="flex-1 text-chad-muted group-hover:text-chad-platinum transition-colors truncate">
                {user}
                {isCurrentUser && (
                  <span className="text-xs text-chad-muted ml-1">(you)</span>
                )}
              </span>

              {/* Voice indicator */}
              {inVoice && (
                <span className="text-chad-muted" title={isCurrentUserMuted ? "Muted" : "In voice"}>
                  {isCurrentUserMuted ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                  )}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
