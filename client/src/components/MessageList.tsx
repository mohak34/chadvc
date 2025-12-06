import { useEffect, useRef, useCallback } from "react";
import { useChatStore } from "../stores/chatStore";
import { wsManager } from "../lib/websocket";

function formatTimestamp(date: Date): string {
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (isToday) {
    return timeStr;
  } else if (isYesterday) {
    return `Yesterday ${timeStr}`;
  } else {
    return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${timeStr}`;
  }
}

export default function MessageList() {
  const messages = useChatStore((state) => state.messages);
  const username = useChatStore((state) => state.username);
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
    <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-2 h-full">
      {/* Top sentinel for infinite scroll */}
      <div ref={topSentinelRef} className="h-1" />

      {/* Loading indicator */}
      {isLoadingMore && (
        <div className="flex justify-center py-2">
          <div className="text-gray-400 text-sm">Loading older messages...</div>
        </div>
      )}

      {/* No more messages indicator */}
      {!hasMoreMessages && messages.length > 0 && (
        <div className="flex justify-center py-2">
          <div className="text-gray-500 text-xs">Beginning of conversation</div>
        </div>
      )}

      {messages.length === 0 && !isLoadingMore ? (
        <div className="flex items-center justify-center h-full text-gray-500">
          No messages yet. Start chatting!
        </div>
      ) : (
        messages.map((msg) => (
          <div
            key={msg.id}
            className={`p-3 rounded-lg ${msg.username === username
              ? "bg-blue-600 ml-auto max-w-md"
              : msg.username === "System"
                ? "bg-gray-700 text-center text-sm text-gray-400"
                : "bg-gray-800 max-w-md"
              }`}
          >
            {msg.username !== "System" && (
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-gray-300">
                  {msg.username}
                </span>
                <span className="text-xs text-gray-500">
                  {formatTimestamp(msg.timestamp)}
                </span>
              </div>
            )}
            <div className="text-white">{msg.content}</div>
            {msg.username === "System" && (
              <div className="text-xs text-gray-500 mt-1">
                {formatTimestamp(msg.timestamp)}
              </div>
            )}
          </div>
        ))
      )}
      {/* Bottom sentinel for auto-scroll */}
      <div ref={bottomRef} />
    </div>
  );
}
