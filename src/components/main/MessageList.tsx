/* eslint-disable @typescript-eslint/no-explicit-any */
// components/main/MessageList.tsx
import { useEffect, useLayoutEffect, useRef } from 'react';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { format } from 'date-fns';
import MessageBubble from './MessageBubble';

interface MessageListProps {
  messages: any[] | null;
  isLoading: boolean;
  selectedChat: any;
  isTyping?: boolean;
  currentUserId?: string | null;
  onEditMessage?: (messageId: string, newText: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onMessagesViewed?: (messageIds: string[]) => void;
  onPollVoted?: (messageId: string, poll: { options?: string[]; votes?: Record<string, string[]> }) => void;
  onReactionOptimistic?: (messageId: string, emoji: string) => void;
}

const MessageList = ({
  messages,
  isLoading,
  selectedChat,
  isTyping,
  currentUserId,
  onEditMessage,
  onDeleteMessage,
  onMessagesViewed,
  onPollVoted,
  onReactionOptimistic,
}: MessageListProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastVisibleSignatureRef = useRef('');
  const didInitialScrollRef = useRef(false);
  const isNearBottomRef = useRef(true);
  const previousChatKeyRef = useRef('');
  const previousLastMessageIdRef = useRef('');
  const previousMessageCountRef = useRef(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const updateScrollState = () => {
      const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
      isNearBottomRef.current = distanceFromBottom <= 120;
    };

    updateScrollState();
    container.addEventListener('scroll', updateScrollState, { passive: true });
    return () => container.removeEventListener('scroll', updateScrollState);
  }, [selectedChat?.id, selectedChat?.type]);

  useEffect(() => {
    lastVisibleSignatureRef.current = '';
    didInitialScrollRef.current = false;
    isNearBottomRef.current = true;
    previousLastMessageIdRef.current = '';
    previousMessageCountRef.current = 0;
    previousChatKeyRef.current = selectedChat ? `${selectedChat.type}:${selectedChat.id}` : '';
  }, [selectedChat?.id, selectedChat?.type]);

  useLayoutEffect(() => {
    if (isLoading || !containerRef.current || !selectedChat) {
      return;
    }

    const container = containerRef.current;
    const sorted = [...(messages || [])].sort((a, b) => {
      const aTime = new Date(a.time).getTime();
      const bTime = new Date(b.time).getTime();
      if (aTime !== bTime) {
        return aTime - bTime;
      }
      return String(a.id).localeCompare(String(b.id));
    });
    const lastMessage = [...sorted].reverse().find((message) => message.type !== 'system') || sorted[sorted.length - 1];
    const currentChatKey = `${selectedChat.type}:${selectedChat.id}`;
    const isChatChanged = previousChatKeyRef.current !== currentChatKey;
    const hasNewLastMessage = Boolean(lastMessage && previousLastMessageIdRef.current !== String(lastMessage.id));
    const shouldScroll =
      !didInitialScrollRef.current ||
      isChatChanged ||
      (hasNewLastMessage && (isNearBottomRef.current || Boolean(lastMessage?.isOwn)));

    if (shouldScroll) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: didInitialScrollRef.current && !isChatChanged ? 'smooth' : 'auto',
      });
      isNearBottomRef.current = true;
      didInitialScrollRef.current = true;
    }

    previousChatKeyRef.current = currentChatKey;
    previousLastMessageIdRef.current = lastMessage ? String(lastMessage.id) : '';
    previousMessageCountRef.current = messages?.length || 0;
  }, [messages, selectedChat, isLoading]);

  useEffect(() => {
    if (!containerRef.current || !bottomRef.current || !selectedChat || !messages?.length) {
      return;
    }

    const visibleIds = messages.filter((message) => message.type !== 'system').map((message) => message.id);
    const signature = visibleIds.join('|');

    const notifyViewed = () => {
      if (!visibleIds.length || lastVisibleSignatureRef.current === signature) {
        return;
      }
      lastVisibleSignatureRef.current = signature;
      onMessagesViewed?.(visibleIds);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          notifyViewed();
        }
      },
      { root: containerRef.current, threshold: 0.92 }
    );

    observer.observe(bottomRef.current);
    return () => observer.disconnect();
  }, [selectedChat, messages, onMessagesViewed]);

  if (isLoading) {
    return (
      <div className="scroll flex-1 overflow-y-auto px-4 pb-6 pt-3 md:px-8">
        <div className="mx-auto w-full max-w-[820px] space-y-6">
          {Array.from({ length: 8 }).map((_, index) => {
            const isOwn = index % 3 === 2;
            return (
              <div key={index} className={`flex items-start gap-3 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                {!isOwn && <Skeleton circle width={42} height={42} baseColor="#dbeafe" highlightColor="#eff6ff" />}
                <div className={`max-w-[78%] space-y-2 ${isOwn ? 'items-end' : 'items-start'}`}>
                  {!isOwn && <Skeleton width={120} height={12} baseColor="#dbeafe" highlightColor="#eff6ff" />}
                  <Skeleton
                    width={isOwn ? 300 : 360}
                    height={index % 2 === 0 ? 84 : 62}
                    borderRadius={24}
                    baseColor="#e8f0fb"
                    highlightColor="#f8fbff"
                  />
                  <Skeleton width={70} height={12} baseColor="#dbeafe" highlightColor="#eff6ff" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (!messages || messages.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center text-text-secondary">
        <div className="text-3xl font-semibold text-text-primary">No messages yet</div>
        <p className="mt-3 max-w-md text-sm leading-6">
          Send the first message to open things up in this {selectedChat?.type === 'channel' ? 'channel' : 'conversation'}.
        </p>
      </div>
    );
  }

  const groupedMessages: { date: string; messages: any[] }[] = [];
  let currentKey: string | null = null;

  const sortedMessages = [...messages].sort((a, b) => {
    const aTime = new Date(a.time).getTime();
    const bTime = new Date(b.time).getTime();
    if (aTime !== bTime) {
      return aTime - bTime;
    }
    return String(a.id).localeCompare(String(b.id));
  });

  sortedMessages.forEach((message) => {
    const dateValue = new Date(message.time);
    const safeDate = Number.isNaN(dateValue.getTime()) ? new Date() : dateValue;
    const key = `${safeDate.getFullYear()}-${safeDate.getMonth() + 1}-${safeDate.getDate()}`;
    const localMidnight = new Date(safeDate.getFullYear(), safeDate.getMonth(), safeDate.getDate());
    const today = new Date();
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const diffDays = Math.round((todayMidnight.getTime() - localMidnight.getTime()) / 86400000);

    const label = diffDays === 0 ? 'Today' : diffDays === 1 ? 'Yesterday' : format(localMidnight, 'EEE, MMM d');

    if (key !== currentKey) {
      groupedMessages.push({ date: label, messages: [] });
      currentKey = key;
    }

    groupedMessages[groupedMessages.length - 1].messages.push(message);
  });

  const typingLabel = selectedChat?.type === 'dm' ? `${selectedChat.name} is typing` : 'Someone is typing';

  return (
    <div ref={containerRef} className="scroll ambient-grid flex-1 overflow-y-auto px-4 pb-6 pt-3 md:px-8">
      <div className="mx-auto w-full max-w-[820px] space-y-8">
        {groupedMessages.map((group) => (
          <div key={group.date} className="animate-fade-in">
            <div className="mb-6 flex items-center gap-4">
              <div className="h-px flex-1 bg-border/80" />
              <span className="rounded-full bg-panel px-4 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-text-secondary shadow-sm">
                {group.date}
              </span>
              <div className="h-px flex-1 bg-border/80" />
            </div>

            <div className="space-y-4">
              {group.messages.map((message) =>
                message.type === 'system' ? (
                  <div key={message.id} className="flex justify-center">
                    <span className="rounded-full bg-panel-strong px-4 py-2 text-xs font-medium text-text-secondary">
                      {message.text}
                    </span>
                  </div>
                ) : (
                  <div id={`msg-${message.id}`} key={message.id}>
                    <MessageBubble
                      message={message}
                      currentUserId={currentUserId}
                      showSenderName={selectedChat?.type === 'channel'}
                      onDelete={onDeleteMessage}
                      onEdit={onEditMessage}
                      onPollVoted={onPollVoted}
                      onReactionOptimistic={onReactionOptimistic}
                      onReply={(currentMessage) => {
                        window.dispatchEvent(new CustomEvent('start-reply', { detail: { message: currentMessage } }));
                      }}
                      onForward={(currentMessage) => {
                        window.dispatchEvent(new CustomEvent('start-forward', { detail: { message: currentMessage } }));
                      }}
                      onScrollToMessage={(targetId) => {
                        const element = containerRef.current?.querySelector(`#msg-${targetId}`) as HTMLElement | null;
                        element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }}
                    />
                  </div>
                )
              )}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="animate-fade-in flex justify-start">
            <div className="inline-flex items-center gap-3 rounded-full border border-border bg-white px-4 py-2.5 text-xs font-medium text-text-secondary shadow-sm">
              <span>{typingLabel}</span>
              <span className="typing-dots" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
};

export default MessageList;
