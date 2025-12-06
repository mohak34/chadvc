import { useEffect, useRef, useCallback } from "react";
import { useChatStore } from "../stores/chatStore";
import { wsManager, Message } from "../lib/websocket";
import { getAvatarColor, getAvatarInitial, isMoreThan30MinutesApart } from "../lib/avatar";

function formatTimestamp(date: Date): string {
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (isToday) {
    return `Today at ${timeStr}`;
  } else if (isYesterday) {
    return `Yesterday at ${timeStr}`;
  } else {
    return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${timeStr}`;
  }
}

// Determine if we should show the message header (avatar + username + timestamp)
function shouldShowHeader(
  currentMsg: Message,
  prevMsg: Message | null
): boolean {
  // Always show header for first message
  if (!prevMsg) return true;

  // Always show header if different user
  if (currentMsg.username !== prevMsg.username) return true;

  // Always show header for system messages
  if (currentMsg.username === "System") return true;

  // Show header if more than 30 minutes apart
  if (isMoreThan30MinutesApart(currentMsg.timestamp, prevMsg.timestamp)) {
    return true;
  }

  return false;
}

export default function MessageList() {
  const messages = useChatStore((state) => state.messages);
  const hasMoreMessages = useChatStore((state) => state.hasMoreMessages);
  const isLoadingMore = useChatStore((state) => state.isLoadingMore);
  const setLoadingMore = useChatStore((state) => state.setLoadingMore);
  const getOldestMessageId = useChatStore((state) => state.getOldestMessageId);

  const containerRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef(messages.length);
  const prevScrollHeightRef = useRef(0);

  const bottomRef = useRef<HTMLDivElement>(null);

  // Handle scroll to load more messages
  const handleLoadMore = useCallback(() => {
    if (isLoadingMore || !hasMoreMessages) return;

    const oldestId = getOldestMessageId();
    if (oldestId === null) return;

    // Save scroll height before loading
    if (containerRef.current) {
      prevScrollHeightRef.current = containerRef.current.scrollHeight;
    }

    setLoadingMore(true);
    wsManager.loadMoreMessages(oldestId);
  }, [isLoadingMore, hasMoreMessages, getOldestMessageId, setLoadingMore]);

  // Intersection observer for infinite scroll
  useEffect(() => {
    const sentinel = topSentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreMessages && !isLoadingMore) {
          handleLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMoreMessages, isLoadingMore, handleLoadMore]);

  // Maintain scroll position when prepending messages
  useEffect(() => {
    // Helper to scroll to bottom reliably
    const scrollToBottom = () => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    if (containerRef.current && messages.length > prevMessagesLengthRef.current) {
      const isInitialLoad = prevMessagesLengthRef.current === 0;
      const isPrepend = messages.length - prevMessagesLengthRef.current > 1;

      // Use requestAnimationFrame to ensure DOM has updated with new messages
      requestAnimationFrame(() => {
        if (containerRef.current) {
          if (isInitialLoad) {
            // Scroll to bottom on initial load (instant)
            bottomRef.current?.scrollIntoView({ behavior: "auto" });
          } else if (isPrepend && prevScrollHeightRef.current > 0) {
            // Maintain scroll position when prepending
            const newScrollHeight = containerRef.current.scrollHeight;
            const scrollDiff = newScrollHeight - prevScrollHeightRef.current;
            containerRef.current.scrollTop = scrollDiff;
          } else {
            // Scroll to bottom for new messages
            scrollToBottom();
          }
        }
      });
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages]);

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto px-4 py-2 h-full">
      {/* Top sentinel for infinite scroll */}
      <div ref={topSentinelRef} className="h-1" />

      {/* Loading indicator */}
      {isLoadingMore && (
        <div className="flex justify-center py-4">
          <div className="text-chad-muted text-sm">Loading older messages...</div>
        </div>
      )}

      {/* No more messages indicator */}
      {!hasMoreMessages && messages.length > 0 && (
        <div className="flex justify-center py-4 mb-4">
          <div className="text-chad-muted text-xs">This is the beginning of the conversation</div>
        </div>
      )}

      {messages.length === 0 && !isLoadingMore ? (
        <div className="flex items-center justify-center h-full text-chad-muted">
          No messages yet. Start the conversation!
        </div>
      ) : (
        messages.map((msg, index) => {
          const prevMsg = index > 0 ? messages[index - 1] : null;
          const showHeader = shouldShowHeader(msg, prevMsg);
          const isSystem = msg.username === "System";

          if (isSystem) {
            return (
              <div key={msg.id} className="py-1 px-4 text-center">
                <span className="text-xs text-chad-muted">{msg.content}</span>
                <span className="text-xs text-chad-muted ml-2">
                  {formatTimestamp(msg.timestamp)}
                </span>
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              className={`group flex gap-4 py-0.5 px-2 hover:bg-chad-bg-hover rounded ${
                showHeader ? "mt-4" : ""
              }`}
            >
              {/* Avatar column - show avatar only on header rows */}
              <div className="w-10 flex-shrink-0">
                {showHeader && (
                  <div
                    className={`w-10 h-10 rounded-full ${getAvatarColor(
                      msg.username
                    )} flex items-center justify-center text-sm font-medium text-white`}
                  >
                    {getAvatarInitial(msg.username)}
                  </div>
                )}
              </div>

              {/* Message content */}
              <div className="flex-1 min-w-0">
                {showHeader && (
                  <div className="flex items-baseline gap-2">
                    <span className="font-medium text-chad-steel hover:underline cursor-pointer">
                      {msg.username}
                    </span>
                    <span className="text-xs text-chad-muted">
                      {formatTimestamp(msg.timestamp)}
                    </span>
                  </div>
                )}
                <div className="text-chad-platinum leading-relaxed break-words">
                  {msg.content}
                </div>
              </div>
            </div>
          );
        })
      )}
      {/* Bottom sentinel for auto-scroll */}
      <div ref={bottomRef} />
    </div>
  );
}
