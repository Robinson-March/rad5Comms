/* eslint-disable @typescript-eslint/no-explicit-any */
// components/main/Main.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import '../../App.css';
import axios from 'axios';
import { toast } from 'sonner';
import ChatHeader from './ChatHeader';
import ChatPlaceholder from './ChatPlaceholder';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import { useWebSocket } from '../../context/webSocketContext';
import { useChannel } from '../../hooks/useChannel';
import { useDm } from '../../hooks/useDm';
import ForwardModal from './ForwardModal';
import type { SelectedChat } from '../../pages/HomePage';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface MainProps {
  isThreadOpen: boolean;
  toggleThreadPane: () => void;
  onBack?: () => void;
  selectedChat: SelectedChat | null;
}

interface Attachment {
  name: string;
  url: string;
  type: string;
  mimeType?: string | null;
  size?: number | null;
  duration?: number | string | null;
  thumbnailUrl?: string | null;
}

interface PollData {
  options?: string[];
  votes?: Record<string, string[]>;
}

interface ReactionSummary {
  emoji: string;
  count: number;
  userIds?: string[];
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
  attachments?: Attachment[];
  audio?: Attachment | null;
  poll?: PollData | null;
  type?: 'system' | 'user';
  replyTo?: string;
  replyToText?: string;
  replyToSender?: string;
  reactions?: ReactionSummary[];
  status?: 'sent' | 'delivered' | 'read';
  uploadProgress?: number | null;
  dmId?: string;
}

const isImageAttachment = (attachment: Attachment) => {
  const type = String(attachment.type || '').toLowerCase();
  const mimeType = String(attachment.mimeType || '').toLowerCase();
  return type === 'image' || mimeType.startsWith('image/');
};

const isAudioAttachment = (attachment: Attachment) => {
  const type = String(attachment.type || '').toLowerCase();
  const mimeType = String(attachment.mimeType || '').toLowerCase();
  return type === 'audio' || mimeType.startsWith('audio/');
};

const toggleReaction = (messages: Message[], messageId: string, emoji: string, userId?: string | null): Message[] =>
  messages.map((message) => {
    if (message.id !== messageId) {
      return message;
    }

    const reactions = message.reactions || [];
    const index = reactions.findIndex((reaction) => reaction.emoji === emoji);
    const existingReaction = index >= 0 ? reactions[index] : null;
    const userIds = new Set(existingReaction?.userIds || []);
    const shouldRemove = userId ? userIds.has(userId) : index >= 0;

    if (shouldRemove) {
      if (userId) {
        userIds.delete(userId);
      }

      const nextCount = Math.max(0, (existingReaction?.count || 0) - 1);
      if (nextCount <= 0) {
        return { ...message, reactions: reactions.filter((reaction) => reaction.emoji !== emoji) };
      }

      const nextReactions = [...reactions];
      nextReactions[index] = {
        emoji,
        count: nextCount,
        ...(userIds.size > 0 ? { userIds: Array.from(userIds) } : {}),
      };
      return { ...message, reactions: nextReactions };
    }

    const nextUserIds = userId ? Array.from(new Set([...(existingReaction?.userIds || []), userId])) : existingReaction?.userIds;

    if (index >= 0) {
      const nextReactions = [...reactions];
      nextReactions[index] = {
        emoji,
        count: (existingReaction?.count || 0) + 1,
        ...(nextUserIds && nextUserIds.length > 0 ? { userIds: nextUserIds } : {}),
      };
      return { ...message, reactions: nextReactions };
    }

    return {
      ...message,
      reactions: [...reactions, { emoji, count: 1, ...(nextUserIds && nextUserIds.length > 0 ? { userIds: nextUserIds } : {}) }],
    };
  });

const applyReaction = (
  messages: Message[],
  messageId: string,
  emoji: string,
  action: string,
  actorUserId?: string
): Message[] =>
  messages.map((message) => {
    if (message.id !== messageId) {
      return message;
    }

    const reactions = message.reactions || [];
    const index = reactions.findIndex((reaction) => reaction.emoji === emoji);
    const normalizedAction = action === 'removed' ? 'remove' : action;

    if (normalizedAction === 'added' || normalizedAction === 'add') {
      if (index >= 0) {
        const next = [...reactions];
        const userIds = new Set(next[index].userIds || []);
        if (actorUserId) {
          userIds.add(actorUserId);
        }
        next[index] = {
          emoji,
          count: next[index].count + 1,
          ...(userIds.size > 0 ? { userIds: Array.from(userIds) } : {}),
        };
        return { ...message, reactions: next };
      }
      return {
        ...message,
        reactions: [...reactions, { emoji, count: 1, ...(actorUserId ? { userIds: [actorUserId] } : {}) }],
      };
    }

    if (index >= 0) {
      const next = [...reactions];
      const userIds = new Set(next[index].userIds || []);
      if (actorUserId) {
        userIds.delete(actorUserId);
      }
      const newCount = next[index].count - 1;
      if (newCount <= 0) {
        next.splice(index, 1);
      } else {
        next[index] = {
          emoji,
          count: newCount,
          ...(userIds.size > 0 ? { userIds: Array.from(userIds) } : {}),
        };
      }
      return { ...message, reactions: next };
    }

    return message;
  });

const normalizeAttachment = (rawAttachment: any): Attachment | null => {
  if (!rawAttachment || (!rawAttachment.url && !rawAttachment.thumbnailUrl && !rawAttachment.name && !rawAttachment.originalName)) {
    return null;
  }

  return {
    name: String(rawAttachment.name ?? rawAttachment.originalName ?? 'Attachment'),
    url: String(rawAttachment.url ?? rawAttachment.thumbnailUrl ?? ''),
    type: String(rawAttachment.type ?? rawAttachment.kind ?? 'file'),
    mimeType: rawAttachment.mimeType ?? rawAttachment.mimetype ?? null,
    size: typeof rawAttachment.size === 'number' ? rawAttachment.size : null,
    duration: rawAttachment.duration ?? null,
    thumbnailUrl: rawAttachment.thumbnailUrl ?? null,
  };
};

const normalizeReactions = (rawReactions: any): ReactionSummary[] | undefined => {
  if (!Array.isArray(rawReactions)) {
    return undefined;
  }

  const counts = new Map<string, { count: number; userIds: Set<string> }>();

  rawReactions.forEach((reaction) => {
    const emoji = typeof reaction?.emoji === 'string' ? reaction.emoji : '';
    if (!emoji) {
      return;
    }

    const existing = counts.get(emoji) || { count: 0, userIds: new Set<string>() };
    const parsedCount = Number(reaction?.count);
    const increment = Number.isFinite(parsedCount) && parsedCount > 0 ? parsedCount : 1;
    const userId = reaction?.user?.id ? String(reaction.user.id) : '';

    existing.count += increment;
    if (userId) {
      existing.userIds.add(userId);
    }

    counts.set(emoji, existing);
  });

  return Array.from(counts.entries()).map(([emoji, value]) => ({
    emoji,
    count: value.count,
    ...(value.userIds.size > 0 ? { userIds: Array.from(value.userIds) } : {}),
  }));
};

const normalizeMessage = (
  rawMessage: any,
  currentUserId: string | null,
  overrides: Partial<Message> = {}
): Message => {
  const sender = rawMessage?.sender || {};
  const senderId = String(
    sender.id ?? rawMessage?.senderId ?? rawMessage?.userId ?? rawMessage?.fromId ?? overrides.sender?.id ?? ''
  );
  const senderName =
    sender.name ?? rawMessage?.senderName ?? rawMessage?.userName ?? rawMessage?.fromName ?? overrides.sender?.name ?? 'Unknown';
  const senderAvatar = sender.avatar ?? rawMessage?.senderAvatar ?? rawMessage?.avatar ?? overrides.sender?.avatar;
  const rawTime = rawMessage?.time ?? rawMessage?.createdAt ?? rawMessage?.updatedAt ?? overrides.time ?? new Date().toISOString();
  const replyTo = rawMessage?.replyTo ?? rawMessage?.reply_to ?? rawMessage?.replyId ?? rawMessage?.reply_id ?? undefined;
  const attachments = Array.isArray(rawMessage?.attachments)
    ? rawMessage.attachments
        .map(normalizeAttachment)
        .filter((attachment: Attachment | null): attachment is Attachment => Boolean(attachment))
    : Array.isArray(overrides.attachments)
      ? overrides.attachments
      : [];
  const audio = rawMessage?.audio ? normalizeAttachment(rawMessage.audio) : overrides.audio ?? null;
  const poll = rawMessage?.poll ?? overrides.poll ?? null;
  const derivedHasImage = attachments.some(isImageAttachment);
  const derivedHasAudio = Boolean(audio) || attachments.some(isAudioAttachment);
  const textValue = rawMessage?.text ?? overrides.text ?? '';

  return {
    id: String(rawMessage?.id ?? overrides.id ?? Date.now()),
    sender: {
      id: senderId,
      name: senderName,
      ...(senderAvatar ? { avatar: senderAvatar } : {}),
    },
    text: textValue == null ? '' : String(textValue),
    time: typeof rawTime === 'string' ? rawTime : new Date(rawTime).toISOString(),
    isOwn:
      typeof rawMessage?.isOwn === 'boolean'
        ? rawMessage.isOwn
        : typeof overrides.isOwn === 'boolean'
          ? overrides.isOwn
          : Boolean(currentUserId && senderId && currentUserId === senderId),
    hasImage: rawMessage?.hasImage ?? overrides.hasImage ?? derivedHasImage,
    hasAudio: rawMessage?.hasAudio ?? overrides.hasAudio ?? derivedHasAudio,
    duration: rawMessage?.duration ?? overrides.duration ?? (audio?.duration ? String(audio.duration) : undefined),
    attachments,
    audio,
    poll,
    type: rawMessage?.type ?? overrides.type ?? 'user',
    replyTo: replyTo ? String(replyTo) : overrides.replyTo,
    replyToText: rawMessage?.replyToText ?? rawMessage?.reply_to_text ?? overrides.replyToText,
    replyToSender: rawMessage?.replyToSender ?? rawMessage?.reply_to_sender ?? overrides.replyToSender,
    reactions: normalizeReactions(rawMessage?.reactions) ?? overrides.reactions,
    status: rawMessage?.status ?? overrides.status,
    uploadProgress: overrides.uploadProgress ?? null,
    dmId: rawMessage?.dmId ? String(rawMessage.dmId) : overrides.dmId,
  };
};

const normalizeMessageList = (rawMessages: any[], currentUserId: string | null): Message[] => {
  const safeMessages = Array.isArray(rawMessages) ? rawMessages : [];
  const byId = new Map<string, any>(safeMessages.map((message) => [String(message.id), message]));

  return safeMessages.map((message) => {
    const replyTo = message.replyTo ?? message.reply_to ?? message.replyId ?? message.reply_id;
    const replyTarget = replyTo ? byId.get(String(replyTo)) : null;

    return normalizeMessage(message, currentUserId, {
      replyTo: replyTo ? String(replyTo) : undefined,
      replyToText: message.replyToText ?? message.reply_to_text ?? replyTarget?.text ?? undefined,
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
  const [replyTarget, setReplyTarget] = useState<Message | null>(null);
  const [forwardSource, setForwardSource] = useState<Message | null>(null);
  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const [resolvedDmId, setResolvedDmId] = useState<string | undefined>(selectedChat?.type === 'dm' ? selectedChat.dmId : undefined);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [messageSearchTerm, setMessageSearchTerm] = useState('');
  const [activeSearchIndex, setActiveSearchIndex] = useState(0);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { onlineUsers, socket, transport } = useWebSocket();

  const channelId = selectedChat?.type === 'channel' ? selectedChat.id : undefined;
  const dmId = selectedChat?.type === 'dm' ? resolvedDmId || selectedChat.dmId : undefined;
  const normalizedSearchTerm = messageSearchTerm.trim().toLowerCase();

  const searchMatchIds = useMemo(() => {
    if (!normalizedSearchTerm) {
      return [];
    }

    return messages
      .filter((message) => {
        if (message.type === 'system') {
          return false;
        }

        const searchableText = [message.text, message.replyToText, message.replyToSender, message.sender?.name]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return searchableText.includes(normalizedSearchTerm);
      })
      .map((message) => message.id);
  }, [messages, normalizedSearchTerm]);

  const activeSearchMessageId = searchMatchIds.length ? searchMatchIds[activeSearchIndex] : null;

  const syncResolvedDm = useCallback(
    (nextDmId?: string | null) => {
      if (!selectedChat || selectedChat.type !== 'dm' || !nextDmId) {
        return;
      }

      const normalizedDmId = String(nextDmId);
      setResolvedDmId((prev) => (prev === normalizedDmId ? prev : normalizedDmId));
      window.dispatchEvent(
        new CustomEvent('dm-resolved', {
          detail: { userId: selectedChat.id, dmId: normalizedDmId },
        })
      );
    },
    [selectedChat]
  );

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      return;
    }

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
    onMessage: (message: any) => {
      const normalized = normalizeMessage(message, currentUserId);
      setMessages((prev) => mergeMessages(prev, [normalized]));

      if (selectedChat?.type === 'dm' && normalized.dmId) {
        syncResolvedDm(normalized.dmId);
      }

      if (normalized.isOwn || !normalized.id) {
        return;
      }

      if (selectedChat?.type === 'channel' && channelId) {
        socket?.emit('messages_delivered', { channelId, messageIds: [normalized.id] });
      } else if (selectedChat?.type === 'dm') {
        const activeDmId = normalized.dmId || dmId;
        if (activeDmId) {
          socket?.emit('dm_messages_delivered', { dmId: activeDmId, messageIds: [normalized.id] });
        }
      }
    },
    onEdited: (messageId: string, text: string) => {
      setMessages((prev) => prev.map((message) => (message.id === messageId ? { ...message, text } : message)));
    },
    onDeleted: (messageId: string) => {
      setMessages((prev) => prev.filter((message) => message.id !== messageId));
    },
    onTyping: (userId: string, isTyping: boolean) => {
      if (currentUserId && userId && userId === currentUserId) {
        return;
      }

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }

      if (!isTyping) {
        setIsPeerTyping(false);
        return;
      }

      setIsPeerTyping(true);
      typingTimeoutRef.current = window.setTimeout(() => {
        setIsPeerTyping(false);
        typingTimeoutRef.current = null;
      }, 1800);
    },
    onStatusUpdate: (data: any) => {
      const payload = data?.data ?? data;
      const messageId = String(payload?.messageId ?? payload?.id ?? data?.messageId ?? data?.id ?? '');
      const status = payload?.status ?? data?.status;
      if (!messageId || !status) {
        return;
      }
      setMessages((prev) => prev.map((message) => (message.id === messageId ? { ...message, status } : message)));
    },
    onReaction: (data: any) => {
      const normalizedReactions = normalizeReactions(data?.reactions);
      if (normalizedReactions) {
        const messageId = String(data?.messageId ?? data?.id ?? data?.message?.id ?? '');
        if (!messageId) {
          return;
        }
        setMessages((prev) =>
          prev.map((message) => (message.id === messageId ? { ...message, reactions: normalizedReactions } : message))
        );
        return;
      }
      const messageId = String(data?.messageId ?? data?.id ?? data?.message?.id ?? '');
      const emoji = data?.emoji;
      const action = data?.action;
      const actorUserId = data?.userId ? String(data.userId) : data?.user?.id ? String(data.user.id) : data?.reaction?.user?.id ? String(data.reaction.user.id) : undefined;
      if (!messageId || !emoji || !action) {
        return;
      }
      setMessages((prev) => applyReaction(prev, messageId, emoji, action, actorUserId));
    },
    onPollUpdate: (data: any) => {
      const messageId = String(data?.messageId ?? data?.id ?? '');
      const poll = data?.poll ?? data?.message?.poll;
      if (!messageId || !poll) {
        return;
      }
      setMessages((prev) => prev.map((message) => (message.id === messageId ? { ...message, poll } : message)));
    },
  };

  const { sendTyping: channelSendTyping, markRead: channelMarkRead } = useChannel(channelId, sharedCallbacks);
  const { sendTyping: dmSendTyping, markRead: dmMarkRead } = useDm(dmId, sharedCallbacks);
  const sendTyping = selectedChat?.type === 'channel' ? channelSendTyping : dmSendTyping;

  useEffect(() => {
    setIsPeerTyping(false);
    setResolvedDmId(selectedChat?.type === 'dm' ? selectedChat.dmId : undefined);
    setReplyTarget(null);
    setIsSearchOpen(false);
    setMessageSearchTerm('');
    setActiveSearchIndex(0);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, [selectedChat?.id, selectedChat?.type, selectedChat?.dmId]);

  useEffect(() => {
    if (!searchMatchIds.length) {
      setActiveSearchIndex(0);
      return;
    }

    setActiveSearchIndex((previousIndex) => Math.min(previousIndex, searchMatchIds.length - 1));
  }, [searchMatchIds]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const resolveDmConversationId = useCallback(async (recipientId: string, token: string) => {
    let conversationId: string | null = null;

    try {
      const createResponse = await axios.post(
        `${API_BASE_URL}/dms/${recipientId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      conversationId = createResponse.data?.dm?.id || createResponse.data?.id || createResponse.data?.dmId || null;
    } catch (createErr: any) {
      if (createErr.response?.status === 409 || createErr.response?.status === 400) {
        const errData = createErr.response?.data;
        conversationId = errData?.dm?.id || errData?.id || errData?.dmId || errData?.existingDmId || null;
      } else {
        throw createErr;
      }
    }

    if (!conversationId) {
      const getResponse = await axios.get(`${API_BASE_URL}/dms/${recipientId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      conversationId = getResponse.data?.dm?.id || getResponse.data?.id || getResponse.data?.dmId || null;
    }

    return conversationId ? String(conversationId) : null;
  }, []);

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

      if (showSpinner) {
        setIsLoadingMessages(true);
      }

      try {
        const endpointBase =
          selectedChat.type === 'channel' ? `/channels/${selectedChat.id}` : `/dms/${selectedChat.id}`;
        const nextDmId =
          selectedChat.type === 'dm' ? selectedChat.dmId || (await resolveDmConversationId(selectedChat.id, token)) : undefined;

        if (nextDmId) {
          syncResolvedDm(nextDmId);
        }

        const response = await axios.get(`${API_BASE_URL}${endpointBase}/messages`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const rawMessages = response.data?.messages || response.data || [];
        const normalizedMessages = normalizeMessageList(rawMessages, currentUserId);
        setMessages(normalizedMessages);

        const derivedDmId = nextDmId || normalizedMessages.find((message) => message.dmId)?.dmId;
        if (selectedChat.type === 'dm' && derivedDmId) {
          syncResolvedDm(derivedDmId);
        }

        const incomingMessageIds = normalizedMessages
          .filter((message) => !message.isOwn && message.type !== 'system')
          .map((message) => message.id);
        if (incomingMessageIds.length > 0) {
          if (selectedChat.type === 'channel') {
            channelMarkRead(incomingMessageIds);
          } else if (derivedDmId) {
            socket?.emit('dm_messages_read', { dmId: derivedDmId, messageIds: incomingMessageIds });
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
        if (showSpinner) {
          setIsLoadingMessages(false);
        }
      }
    },
    [selectedChat, resolveDmConversationId, currentUserId, channelMarkRead, socket, syncResolvedDm]
  );

  useEffect(() => {
    fetchChatMessages(true);
  }, [fetchChatMessages]);

  useEffect(() => {
    if (!selectedChat || transport === 'websocket') {
      return;
    }

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
      if (!selectedChat || selectedChat.type !== 'channel' || selectedChat.id !== ce.detail.channelId) {
        return;
      }
      const systemMessage: Message = {
        id: `sys-${Date.now()}`,
        sender: { id: 'system', name: 'System' },
        text: `${ce.detail.addedBy.name} added ${ce.detail.addedUser.name}`,
        time: new Date().toISOString(),
        isOwn: false,
        type: 'system',
      };
      setMessages((prev) => [...prev, systemMessage]);
    };

    window.addEventListener('member-added', onMemberAdded as EventListener);
    return () => window.removeEventListener('member-added', onMemberAdded as EventListener);
  }, [selectedChat]);

  const handleMessageSent = (newMessage: Message) => {
    setMessages((prev) => mergeMessages(prev, [newMessage]));
    setReplyTarget(null);
  };

  const handleMessageConfirmed = (temporaryId: string, confirmedMessage: any) => {
    const normalized = normalizeMessage(confirmedMessage, currentUserId, { isOwn: true, status: 'sent' });
    if (selectedChat?.type === 'dm' && normalized.dmId) {
      syncResolvedDm(normalized.dmId);
    }
    setMessages((prev) => {
      const withoutTemporary = prev.filter((message) => message.id !== temporaryId);
      return mergeMessages(withoutTemporary, [normalized]);
    });
  };

  const handleMessageUploadProgress = (temporaryId: string, progress: number) => {
    setMessages((prev) =>
      prev.map((message) =>
        message.id === temporaryId
          ? { ...message, uploadProgress: progress, hasImage: message.hasImage ?? Boolean(message.attachments?.length) }
          : message
      )
    );
  };

  const handleMessageFailed = (temporaryId: string) => {
    setMessages((prev) => prev.filter((message) => message.id !== temporaryId));
  };

  const handleMessageEdited = (messageId: string, newText: string) => {
    setMessages((prev) => prev.map((message) => (message.id === messageId ? { ...message, text: newText } : message)));
  };

  const handlePollVoted = (messageId: string, poll: PollData) => {
    setMessages((prev) => prev.map((message) => (message.id === messageId ? { ...message, poll } : message)));
  };

  const handleReactionOptimistic = (messageId: string, emoji: string) => {
    setMessages((prev) => toggleReaction(prev, messageId, emoji, currentUserId));
  };

  const handleMessageDeleted = (messageId: string) => {
    setMessages((prev) => prev.filter((message) => message.id !== messageId));
  };

  const handleMessagesViewed = useCallback(
    (messageIds: string[]) => {
      if (!selectedChat || !messageIds.length) {
        return;
      }

      const incomingMessageIds = messageIds.filter((messageId) => {
        const match = messages.find((message) => message.id === messageId);
        return Boolean(match && !match.isOwn && match.type !== 'system');
      });

      if (!incomingMessageIds.length) {
        return;
      }

      if (selectedChat.type === 'channel') {
        channelMarkRead(incomingMessageIds);
      } else {
        const activeDmId = resolvedDmId || selectedChat.dmId || messages.find((message) => message.dmId)?.dmId;
        if (activeDmId) {
          socket?.emit('dm_messages_read', { dmId: activeDmId, messageIds: incomingMessageIds });
        } else {
          dmMarkRead(incomingMessageIds);
        }
      }

      window.dispatchEvent(
        new CustomEvent('chat-read', {
          detail: { chatId: selectedChat.id, type: selectedChat.type },
        })
      );
    },
    [selectedChat, channelMarkRead, dmMarkRead, resolvedDmId, socket, messages]
  );

  const handleSearchChange = (value: string) => {
    setMessageSearchTerm(value);
    setActiveSearchIndex(0);
  };

  const handlePreviousSearchResult = () => {
    if (!searchMatchIds.length) {
      return;
    }

    setActiveSearchIndex((previousIndex) => (previousIndex - 1 + searchMatchIds.length) % searchMatchIds.length);
  };

  const handleNextSearchResult = () => {
    if (!searchMatchIds.length) {
      return;
    }

    setActiveSearchIndex((previousIndex) => (previousIndex + 1) % searchMatchIds.length);
  };

  const handleClearSearch = () => {
    setMessageSearchTerm('');
    setActiveSearchIndex(0);
  };

  const handleToggleSearch = () => {
    setIsSearchOpen((current) => {
      const next = !current;
      if (!next) {
        setMessageSearchTerm('');
        setActiveSearchIndex(0);
      }
      return next;
    });
  };

  const handleCloseSearch = () => {
    setIsSearchOpen(false);
    setMessageSearchTerm('');
    setActiveSearchIndex(0);
  };

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-transparent">
      {selectedChat ? (
        <ChatHeader
          selectedChat={selectedChat}
          isThreadOpen={isThreadOpen}
          toggleThreadPane={toggleThreadPane}
          onBack={onBack}
          isOnline={selectedChat.type === 'dm' ? onlineUsers.includes(String(selectedChat.id)) : undefined}
          isSearchOpen={isSearchOpen}
          searchValue={messageSearchTerm}
          searchResultsCount={searchMatchIds.length}
          activeSearchIndex={searchMatchIds.length ? activeSearchIndex : -1}
          onToggleSearch={handleToggleSearch}
          onSearchChange={handleSearchChange}
          onPreviousSearchResult={handlePreviousSearchResult}
          onNextSearchResult={handleNextSearchResult}
          onClearSearch={handleClearSearch}
          onCloseSearch={handleCloseSearch}
        />
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col">
        {!selectedChat ? (
          <ChatPlaceholder />
        ) : (
          <>
            <MessageList
              messages={messages}
              isLoading={isLoadingMessages}
              selectedChat={selectedChat}
              isTyping={isPeerTyping}
              currentUserId={currentUserId}
              onEditMessage={handleMessageEdited}
              onDeleteMessage={handleMessageDeleted}
              onMessagesViewed={handleMessagesViewed}
              onPollVoted={handlePollVoted}
              onReactionOptimistic={handleReactionOptimistic}
              matchedMessageIds={searchMatchIds}
              activeSearchMessageId={activeSearchMessageId}
            />
            <MessageInput
              selectedChat={selectedChat}
              dmConversationId={resolvedDmId || selectedChat.dmId}
              onMessageSent={handleMessageSent}
              onMessageConfirmed={handleMessageConfirmed}
              onMessageFailed={handleMessageFailed}
              onMessageUploadProgress={handleMessageUploadProgress}
              onSyncRequested={() => fetchChatMessages(false)}
              replyTarget={replyTarget}
              onCancelReply={() => setReplyTarget(null)}
              sendTyping={sendTyping}
            />
          </>
        )}

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














