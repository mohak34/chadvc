import { useState, useEffect } from "react";
import { useVoiceStore } from "../stores/voiceStore";
import { useChatStore } from "../stores/chatStore";
import { webrtcManager } from "../lib/webrtc";

export default function VoiceControls() {
  const { isInVoiceChannel, isMuted, error, kickReason, setKickReason } = useVoiceStore();
  const { onlineUsers, isConnected } = useChatStore();
  const [isJoining, setIsJoining] = useState(false);

  // Clear kick reason after showing it for a few seconds
  useEffect(() => {
    if (kickReason) {
      const timer = setTimeout(() => {
        setKickReason(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [kickReason, setKickReason]);

  // Listen for voice kick events
  useEffect(() => {
    const unsubscribe = webrtcManager.onVoiceKicked((reason) => {
      useVoiceStore.getState().setInVoiceChannel(false);
      useVoiceStore.getState().setMuted(false);
      useVoiceStore.getState().setVoiceUsers([]);
      
      if (reason === "joined_from_another_device") {
        setKickReason("Disconnected: You joined voice from another device");
      } else {
        setKickReason("Disconnected from voice");
      }
    });

    return unsubscribe;
  }, [setKickReason]);

  const handleJoinVoice = async () => {
    if (!isConnected) {
      useVoiceStore.getState().setError("Not connected to server");
      return;
    }

    setIsJoining(true);
    useVoiceStore.getState().setError(null);
    setKickReason(null);

    try {
      // The server will send us the list of voice users after we join
      await webrtcManager.joinVoiceChannel([]);
      useVoiceStore.getState().setInVoiceChannel(true);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to join voice channel";
      useVoiceStore.getState().setError(errorMsg);
      console.error("Failed to join voice:", err);
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeaveVoice = () => {
    webrtcManager.leaveVoiceChannel();
    useVoiceStore.getState().setInVoiceChannel(false);
    useVoiceStore.getState().setMuted(false);
    useVoiceStore.getState().setVoiceUsers([]);
  };

  const handleToggleMute = () => {
    const newMuteState = webrtcManager.toggleMute();
    useVoiceStore.getState().setMuted(newMuteState);
  };

  return (
    <div className="p-3">
      {/* Voice channel header */}
      <div className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-chad-bg-hover cursor-pointer mb-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 text-chad-muted"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
          />
        </svg>
        <span className="text-chad-muted text-sm">Voice Channel</span>
      </div>

      {/* Connected status */}
      {isInVoiceChannel && (
        <div className="mb-2 px-2">
          <p className="text-xs text-green-500 flex items-center gap-1">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Voice Connected
          </p>
          <p className="text-xs text-chad-muted mt-0.5">
            {onlineUsers.length} user{onlineUsers.length !== 1 ? "s" : ""} online
          </p>
        </div>
      )}

      {/* Kick notification */}
      {kickReason && (
        <div className="mb-2 px-2">
          <p className="text-xs text-yellow-400 bg-yellow-500/10 px-2 py-1.5 rounded flex items-center gap-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3 w-3"
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
            {kickReason}
          </p>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="mb-2 px-2">
          <p className="text-xs text-red-400 bg-red-500/10 px-2 py-1.5 rounded">{error}</p>
        </div>
      )}

      {/* Not connected warning */}
      {!isConnected && !isInVoiceChannel && (
        <div className="mb-2 px-2">
          <p className="text-xs text-chad-muted">Connect to server to join voice</p>
        </div>
      )}

      {/* Controls */}
      <div className="space-y-1">
        {!isInVoiceChannel ? (
          <button
            onClick={handleJoinVoice}
            disabled={isJoining || !isConnected}
            className="w-full flex items-center gap-2 px-3 py-2 rounded bg-chad-bg hover:bg-chad-bg-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 text-green-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
              />
            </svg>
            <span className="text-sm text-chad-platinum">
              {isJoining ? "Joining..." : "Join Voice"}
            </span>
          </button>
        ) : (
          <>
            <button
              onClick={handleToggleMute}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded transition-colors ${
                isMuted
                  ? "bg-red-500/20 hover:bg-red-500/30 text-red-400"
                  : "bg-chad-bg hover:bg-chad-bg-hover text-chad-platinum"
              }`}
            >
              {isMuted ? (
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
                    d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                  />
                </svg>
              ) : (
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
                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                  />
                </svg>
              )}
              <span className="text-sm">{isMuted ? "Unmute" : "Mute"}</span>
            </button>
            <button
              onClick={handleLeaveVoice}
              className="w-full flex items-center gap-2 px-3 py-2 rounded bg-chad-bg hover:bg-red-500/20 text-chad-muted hover:text-red-400 transition-colors"
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
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              <span className="text-sm">Disconnect</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
