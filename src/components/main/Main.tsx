/* eslint-disable @typescript-eslint/no-explicit-any */
// components/main/Main.tsx
import { useState, useEffect, useCallback } from 'react';
import '../../App.css';
import axios from 'axios';
import { toast } from 'sonner';
import ChatHeader from './ChatHeader';
import ChatPlaceholder from './ChatPlaceholder';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import SettingsModal from '../../pages/Settings';
import { useWebSocket } from '../../context/webSocketContext';
import { useChannel } from '../../hooks/useChannel';
import { useDm } from '../../hooks/useDm';
import ForwardModal from './ForwardModal';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface MainProps {
  isThreadOpen: boolean;
  toggleThreadPane: () => void;
  onBack?: () => void;
  selectedChat: { id: string; type: 'channel' | 'dm'; name?: string } | null;
}

interface Message {
  id: string;
  sender: { id: string; name: string; avatar?: string };
  text: string;
  time: string;
  isOwn: boolean;
  hasImage?: boolean;
  hasAudio?: boolean;
  duration?: string;
  type?: 'system' | 'user';
  replyTo?: string;
  replyToText?: string;
  replyToSender?: string;
  reactions?: Array<{ emoji: string; count: number }>;
  status?: 'sent' | 'delivered' | 'read';
}

const applyReaction = (messages: Message[], messageId: string, emoji: string, action: string): Message[] =>
  messages.map((m) => {
    if (m.id !== messageId) return m;
    const existing = m.reactions || [];
    const idx = existing.findIndex((r) => r.emoji === emoji);
    if (action === 'added' || action === 'add') {
      if (idx >= 0) {
        const next = [...existing];
        next[idx] = { emoji, count: next[idx].count + 1 };
        return { ...m, reactions: next };
      }
      return { ...m, reactions: [...existing, { emoji, count: 1 }] };
    }

    if (idx >= 0) {
      const next = [...existing];
      const newCount = next[idx].count - 1;
      if (newCount <= 0) {
        next.splice(idx, 1);
      } else {
        next[idx] = { emoji, count: newCount };
      }
      return { ...m, reactions: next };
    }

    return m;
  });

const normalizeMessage = (
  rawMessage: any,
  currentUserId: string | null,
  overrides: Partial<Message> = {}
): Message => {
  const sender = rawMessage?.sender || {};
  const senderId = String(
    sender.id ??
      rawMessage?.senderId ??
      rawMessage?.userId ??
      rawMessage?.fromId ??
      overrides.sender?.id ??
      ''
  );
  const senderName =
    sender.name ??
    rawMessage?.senderName ??
    rawMessage?.userName ??
    rawMessage?.fromName ??
    overrides.sender?.name ??
    'Unknown';
  const senderAvatar =
    sender.avatar ?? rawMessage?.senderAvatar ?? rawMessage?.avatar ?? overrides.sender?.avatar;
  const rawTime =
    rawMessage?.time ?? rawMessage?.createdAt ?? rawMessage?.updatedAt ?? overrides.time ?? new Date().toISOString();
  const replyTo =
    rawMessage?.replyTo ?? rawMessage?.reply_to ?? rawMessage?.replyId ?? rawMessage?.reply_id ?? undefined;
  const resolvedTime =
    typeof rawTime === 'string' ? rawTime : new Date(rawTime).toISOString();

  const normalized: Message = {
    id: String(rawMessage?.id ?? overrides.id ?? Date.now()),
    sender: {
      id: senderId,
      name: senderName,
      ...(senderAvatar ? { avatar: senderAvatar } : {}),
    },
    text: String(rawMessage?.text ?? overrides.text ?? ''),
    time: resolvedTime,
    isOwn:
      typeof rawMessage?.isOwn === 'boolean'
        ? rawMessage.isOwn
        : typeof overrides.isOwn === 'boolean'
          ? overrides.isOwn
          : Boolean(currentUserId && senderId && currentUserId === senderId),
    hasImage: rawMessage?.hasImage ?? overrides.hasImage,
    hasAudio: rawMessage?.hasAudio ?? overrides.hasAudio,
    duration: rawMessage?.duration ?? overrides.duration,
    type: rawMessage?.type ?? overrides.type ?? 'user',
    replyTo: replyTo ? String(replyTo) : overrides.replyTo,
    replyToText:
      rawMessage?.replyToText ?? rawMessage?.reply_to_text ?? overrides.replyToText,
    replyToSender:
      rawMessage?.replyToSender ?? rawMessage?.reply_to_sender ?? overrides.replyToSender,
    reactions: rawMessage?.reactions ?? overrides.reactions,
    status: rawMessage?.status ?? overrides.status,
  };

  return normalized;
};

const normalizeMessageList = (rawMessages: any[], currentUserId: string | null): Message[] => {
  const safeMessages = Array.isArray(rawMessages) ? rawMessages : [];
  const byId = new Map<string, any>(safeMessages.map((message) => [String(message.id), message]));

  return safeMessages.map((message) => {
    const replyTo = message.replyTo ?? message.reply_to ?? message.replyId ?? message.reply_id;
    const replyTarget = replyTo ? byId.get(String(replyTo)) : null;

    return normalizeMessage(message, currentUserId, {
      replyTo: replyTo ? String(replyTo) : undefined,
      replyToText:
        message.replyToText ?? message.reply_to_text ?? replyTarget?.text ?? undefined,
      replyToSender:
        message.replyToSender ??
        message.reply_to_sender ??
        replyTarget?.sender?.name ??
        replyTarget?.senderName ??
        undefined,
    });
  });
};

const mergeMessages = (existing: Message[], incoming: Message[]): Message[] => {
  const next = new Map<string, Message>();

  existing.forEach((message) => {
    next.set(String(message.id), message);
  });

  incoming.forEach((message) => {
    const key = String(message.id);
    const previous = next.get(key);
    next.set(
      key,
      previous
        ? {
            ...previous,
            ...message,
            sender: { ...previous.sender, ...message.sender },
          }
        : message
    );
  });

  return Array.from(next.values());
};

const Main = ({ isThreadOpen, toggleThreadPane, onBack, selectedChat }: MainProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [replyTarget, setReplyTarget] = useState<Message | null>(null);
  const [forwardSource, setForwardSource] = useState<Message | null>(null);
  const { onlineUsers, transport } = useWebSocket();
  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const [resolvedDmId, setResolvedDmId] = useState<string | undefined>(undefined);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const channelId = selectedChat?.type === 'channel' ? selectedChat.id : undefined;
  const dmId = selectedChat?.type === 'dm' ? resolvedDmId : undefined;

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    axios
      .get(`${API_BASE_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((response) => {
        const userId = response.data?.id || response.data?.user?.id || null;
        setCurrentUserId(userId ? String(userId) : null);
      })
      .catch((err) => {
        console.warn('[Main] Failed to resolve current user id', err);
      });
  }, []);

  const sharedCallbacks = {
    onMessage: (msg: any) => {
      const normalized = normalizeMessage(msg, currentUserId);
      setMessages((prev) => mergeMessages(prev, [normalized]));
    },
    onEdited: (messageId: string, text: string) =>
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, text } : m))),
    onDeleted: (messageId: string) =>
      setMessages((prev) => prev.filter((m) => m.id !== messageId)),
    onTyping: (_userId: string, isTyping: boolean) => setIsPeerTyping(isTyping),
    onStatusUpdate: (data: any) => {
      const { messageId, status } = data;
      if (messageId && status) {
        setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, status } : m)));
      }
    },
    onReaction: (data: any) => {
      const { messageId, emoji, action } = data;
      setMessages((prev) => applyReaction(prev, messageId, emoji, action));
    },
  };

  const { sendTyping: channelSendTyping, markRead: channelMarkRead } =
    useChannel(channelId, sharedCallbacks);

  const { sendTyping: dmSendTyping, markRead: dmMarkRead } =
    useDm(dmId, sharedCallbacks);

  const sendTyping = selectedChat?.type === 'channel' ? channelSendTyping : dmSendTyping;

  useEffect(() => {
    setIsPeerTyping(false);
    setResolvedDmId(undefined);
    setReplyTarget(null);
  }, [selectedChat?.id]);

  const resolveDmConversationId = useCallback(
    async (recipientId: string, token: string) => {
      let conversationId: string | null = null;

      try {
        const createResponse = await axios.post(
          `${API_BASE_URL}/dms/${recipientId}`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        conversationId =
          createResponse.data?.dm?.id ||
          createResponse.data?.id ||
          createResponse.data?.dmId ||
          null;
      } catch (createErr: any) {
        if (createErr.response?.status === 409 || createErr.response?.status === 400) {
          const errData = createErr.response?.data;
          conversationId =
            errData?.dm?.id ||
            errData?.id ||
            errData?.dmId ||
            errData?.existingDmId ||
            null;
        } else {
          throw createErr;
        }
      }

      if (!conversationId) {
        const getResponse = await axios.get(`${API_BASE_URL}/dms/${recipientId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        conversationId =
          getResponse.data?.dm?.id || getResponse.data?.id || getResponse.data?.dmId || null;
      }

      return conversationId || recipientId;
    },
    []
  );

  const fetchChatMessages = useCallback(
    async (showSpinner = true) => {
      if (!selectedChat) {
        setMessages([]);
        setIsLoadingMessages(false);
        return;
      }

      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please log in');
        return;
      }

      if (showSpinner) setIsLoadingMessages(true);

      try {
        let chatId = selectedChat.id;
        let endpointBase = '';

        if (selectedChat.type === 'channel') {
          endpointBase = `/channels/${chatId}`;
        } else {
          chatId = await resolveDmConversationId(selectedChat.id, token);
          endpointBase = `/dms/${chatId}`;
          setResolvedDmId(chatId);
          console.log('[Main] resolved DM conversation ID:', chatId, '(recipient:', selectedChat.id, ')');
        }

        const response = await axios.get(`${API_BASE_URL}${endpointBase}/messages`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const rawMessages = response.data?.messages || response.data || [];
        const normalizedMessages = normalizeMessageList(rawMessages, currentUserId);
        setMessages(normalizedMessages);

        const messageIds = normalizedMessages.map((message) => message.id);
        if (messageIds.length > 0) {
          if (selectedChat.type === 'channel') {
            channelMarkRead(messageIds);
          } else {
            dmMarkRead(messageIds);
          }
        }
      } catch (err: any) {
        console.error('Chat init/fetch error:', err);
        const msg = err.response?.data?.error || 'Failed to load or initialize chat';
        if (showSpinner) {
          toast.error(msg);
        }

        if (err.response?.status === 404) {
          setMessages([]);
        }
      } finally {
        if (showSpinner) setIsLoadingMessages(false);
      }
    },
    [selectedChat, resolveDmConversationId, currentUserId, channelMarkRead, dmMarkRead]
  );

  useEffect(() => {
    fetchChatMessages(true);
  }, [fetchChatMessages]);

  useEffect(() => {
    if (!selectedChat || transport === 'websocket') return;

    const intervalId = window.setInterval(() => {
      fetchChatMessages(false);
    }, 3000);

    return () => window.clearInterval(intervalId);
  }, [selectedChat, transport, fetchChatMessages]);

  useEffect(() => {
    const onStartReply = (e: Event) => {
      const ce = e as CustomEvent<{ message: Message }>;
      setReplyTarget(ce.detail.message);
    };
    const onStartForward = (e: Event) => {
      const ce = e as CustomEvent<{ message: Message }>;
      setForwardSource(ce.detail.message);
    };
    window.addEventListener('start-reply', onStartReply as EventListener);
    window.addEventListener('start-forward', onStartForward as EventListener);
    return () => {
      window.removeEventListener('start-reply', onStartReply as EventListener);
      window.removeEventListener('start-forward', onStartForward as EventListener);
    };
  }, []);

  useEffect(() => {
    const onMemberAdded = (e: Event) => {
      const ce = e as CustomEvent<{
        channelId: string;
        addedUser: { id: string; name: string };
        addedBy: { name: string };
      }>;
      if (!selectedChat || selectedChat.type !== 'channel') return;
      if (selectedChat.id !== ce.detail.channelId) return;
      const sysMessage: Message = {
        id: `sys-${Date.now()}`,
        sender: { id: 'system', name: 'System' },
        text: `${ce.detail.addedBy.name} added ${ce.detail.addedUser.name}`,
        time: new Date().toISOString(),
        isOwn: false,
        type: 'system',
      };
      setMessages((prev) => [...prev, sysMessage]);
    };
    window.addEventListener('member-added', onMemberAdded as EventListener);
    return () => window.removeEventListener('member-added', onMemberAdded as EventListener);
  }, [selectedChat?.id, selectedChat?.type, selectedChat]);

  const handleMessageSent = (newMessage: Message) => {
    setMessages((prev) => mergeMessages(prev, [newMessage]));
    setReplyTarget(null);
  };

  const handleMessageConfirmed = (temporaryId: string, confirmedMessage: any) => {
    const normalized = normalizeMessage(confirmedMessage, currentUserId, { isOwn: true });
    setMessages((prev) => {
      const withoutTemporary = prev.filter((message) => message.id !== temporaryId);
      return mergeMessages(withoutTemporary, [normalized]);
    });
  };

  const handleMessageFailed = (temporaryId: string) => {
    setMessages((prev) => prev.filter((message) => message.id !== temporaryId));
  };

  useEffect(() => {
    const onLocalReaction = (e: Event) => {
      const ce = e as CustomEvent<{ messageId: string; emoji: string; action: 'added' | 'removed' }>;
      const { messageId, emoji, action } = ce.detail;
      setMessages((prev) => applyReaction(prev, messageId, emoji, action));
    };
    window.addEventListener('reaction-update', onLocalReaction as EventListener);
    return () => window.removeEventListener('reaction-update', onLocalReaction as EventListener);
  }, []);

  return (
    <div className="h-screen flex-1 flex flex-col bg-offwhite font-poppins">
      <ChatHeader
        selectedChat={selectedChat}
        isThreadOpen={isThreadOpen}
        toggleThreadPane={toggleThreadPane}
        onBack={onBack}
        onSettingsOpen={() => setIsSettingsOpen(true)}
        isOnline={selectedChat?.type === 'dm' ? onlineUsers.includes(String(selectedChat.id)) : undefined}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {!selectedChat ? (
          <ChatPlaceholder />
        ) : (
          <>
            <MessageList
              messages={messages}
              isLoading={isLoadingMessages}
              selectedChat={selectedChat}
              isTyping={isPeerTyping}
            />
            <MessageInput
              selectedChat={selectedChat}
              dmConversationId={resolvedDmId}
              onMessageSent={handleMessageSent}
              onMessageConfirmed={handleMessageConfirmed}
              onMessageFailed={handleMessageFailed}
              onSyncRequested={() => fetchChatMessages(false)}
              replyTarget={replyTarget}
              onCancelReply={() => setReplyTarget(null)}
              sendTyping={sendTyping}
            />
          </>
        )}

        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
        />
        <ForwardModal
          isOpen={Boolean(forwardSource)}
          onClose={() => setForwardSource(null)}
          sourceMessage={forwardSource ? { id: forwardSource.id, text: forwardSource.text } : null}
        />
      </div>
    </div>
  );
};

export default Main;
