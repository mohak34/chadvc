import { useState } from "react";
import { useVoiceStore } from "../stores/voiceStore";
import { useChatStore } from "../stores/chatStore";
import { webrtcManager } from "../lib/webrtc";

export default function VoiceControls() {
  const { isInVoiceChannel, isMuted, error } = useVoiceStore();
  const { onlineUsers } = useChatStore();
  const [isJoining, setIsJoining] = useState(false);

  const handleJoinVoice = async () => {
    setIsJoining(true);
    useVoiceStore.getState().setError(null);

    try {
      const voiceUsers = webrtcManager.getVoiceUsers();
      await webrtcManager.joinVoiceChannel(voiceUsers);
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
    <div className="p-4 bg-gray-800 border-t border-gray-700">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Voice Channel</h3>
            <p className="text-xs text-gray-400">
              {isInVoiceChannel 
                ? `Connected - ${onlineUsers.length} user(s) online` 
                : "Not connected"}
            </p>
          </div>
        </div>

        {error && (
          <div className="text-xs text-red-400 bg-red-900/20 px-3 py-2 rounded">
            {error}
          </div>
        )}

        <div className="flex gap-2">
          {!isInVoiceChannel ? (
            <button
              onClick={handleJoinVoice}
              disabled={isJoining}
              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:cursor-not-allowed rounded-lg font-medium transition-colors text-sm"
            >
              {isJoining ? "Joining..." : "Join Voice"}
            </button>
          ) : (
            <>
              <button
                onClick={handleToggleMute}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
                  isMuted
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-gray-600 hover:bg-gray-700"
                }`}
              >
                {isMuted ? "Unmute" : "Mute"}
              </button>
              <button
                onClick={handleLeaveVoice}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors text-sm"
              >
                Leave Voice
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
