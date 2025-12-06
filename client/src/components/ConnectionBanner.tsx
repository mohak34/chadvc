import { useChatStore } from "../stores/chatStore";

interface ConnectionBannerProps {
  onReconnect: () => void;
}

export default function ConnectionBanner({ onReconnect }: ConnectionBannerProps) {
  const isReconnecting = useChatStore((state) => state.isReconnecting);
  const reconnectAttempt = useChatStore((state) => state.reconnectAttempt);
  const isConnected = useChatStore((state) => state.isConnected);

  // Don't show if connected
  if (isConnected) {
    return null;
  }

  return (
    <div className="bg-red-500/20 border-b border-red-500/30 px-4 py-2">
      <div className="flex items-center justify-between max-w-screen-xl mx-auto">
        <div className="flex items-center gap-3">
          {isReconnecting ? (
            <>
              <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-red-300">
                Reconnecting... (attempt {reconnectAttempt})
              </span>
            </>
          ) : (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <span className="text-sm text-red-300">
                Connection lost. Messages may not be sent.
              </span>
            </>
          )}
        </div>
        {!isReconnecting && (
          <button
            onClick={onReconnect}
            className="px-3 py-1 text-sm bg-red-500/30 hover:bg-red-500/50 text-red-200 rounded transition-colors"
          >
            Reconnect
          </button>
        )}
      </div>
    </div>
  );
}
