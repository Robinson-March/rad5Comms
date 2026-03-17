/* eslint-disable @typescript-eslint/no-explicit-any */
// components/aside/Aside.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import '../../App.css';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import AsideHeader from './AsideHeader';
import AsideTabs from './AsideTabs';
import ChatSection from './ChatSection';
import CreateChannelModal from './CreateChannelModal';
import NewConversationModal from './NewConversationModal';
import 'react-loading-skeleton/dist/skeleton.css';
import { AtSign, Users } from 'lucide-react';
import { useWebSocket } from '../../context/webSocketContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface AsideProps {
  onSelectChat?: (
    chatId: string,
    type: 'channel' | 'dm',
    name?: string,
    extra?: {
      avatar?: string;
      description?: string;
      bio?: string;
      memberCount?: number;
      isSystem?: boolean;
      isDefault?: boolean;
      membershipPolicy?: string;
      dmId?: string;
    }
  ) => void;
  selectedChatId?: string | null;
  selectedChatType?: 'channel' | 'dm' | null;
  onProfileOpen?: () => void;
  canAccessAdmin?: boolean;
}

interface Channel {
  id: string;
  name: string;
  description?: string;
  avatar?: string;
  isGroup: boolean;
  isSystem?: boolean;
  isDefault?: boolean;
  membershipPolicy?: string;
  createdBy: string;
  members: Array<{
    id: string;
    name: string;
    avatar?: string;
    isOnline: boolean;
    ChannelMember?: { role: string };
  }>;
  role: string;
  createdAt: string;
  updatedAt: string;
  unread?: number;
  isArchived?: boolean;
  isStarred?: boolean;
}

interface User {
  id: string;
  dmId?: string;
  name: string;
  email: string;
  avatar?: string;
  bio?: string;
  lastSeen: string;
  profileVisibility: string;
  readReceipts: boolean;
  typingIndicators: boolean;
  notificationSettings: {
    messages: boolean;
    groups: boolean;
    sounds: boolean;
  };
  isOnline: boolean;
  lastActive: string;
  createdAt: string;
  updatedAt: string;
  unread?: number;
  isArchived?: boolean;
  isStarred?: boolean;
  isMuted?: boolean;
  preview?: string;
}

const defaultNotificationSettings = {
  messages: true,
  groups: true,
  sounds: true,
};

const resolveUnreadCount = (...values: unknown[]): number | null => {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return Math.max(0, value);
    }

    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return Math.max(0, parsed);
      }
    }
  }

  return null;
};

const buildMessagePreview = (message: any) => {
  const text = typeof message?.text === 'string' ? message.text.trim() : '';
  if (text) {
    return text.slice(0, 72);
  }

  if (message?.hasImage) {
    return 'Shared an image';
  }

  if (message?.hasAudio || message?.audio) {
    return 'Sent a voice note';
  }

  if (Array.isArray(message?.attachments) && message.attachments.length > 0) {
    return message.attachments.length > 1 ? 'Shared attachments' : 'Shared an attachment';
  }

  return 'Direct message';
};

const readSocketPathValue = (source: any, path: string) =>
  path.split('.').reduce((value, key) => (value == null ? undefined : value[key]), source);

const resolveSocketField = (payload: any, paths: string[]) => {
  const sources = [payload, payload?.message, payload?.data, payload?.data?.message, payload?.payload, payload?.payload?.message];

  for (const source of sources) {
    if (!source) {
      continue;
    }

    for (const path of paths) {
      const value = readSocketPathValue(source, path);
      if (value != null && value !== '') {
        return String(value);
      }
    }
  }

  return '';
};

const mapChannelSummary = (channel: any): Channel => ({
  ...channel,
  id: String(channel?.id ?? ''),
  unread: resolveUnreadCount(channel?.unreadCount, channel?.unread) ?? 0,
});

const mapDmSummaryToUser = (dm: any): User => {
  const participant = dm?.participant || {};
  const userId = String(participant.id ?? dm?.otherUserId ?? dm?.userId ?? dm?.id ?? '');

  return {
    id: userId,
    dmId: dm?.id ? String(dm.id) : undefined,
    name: participant.name || 'Unknown user',
    email: participant.email || '',
    avatar: participant.avatar || undefined,
    bio: participant.bio || dm?.bio || '',
    lastSeen: participant.lastActive || '',
    profileVisibility: 'everyone',
    readReceipts: true,
    typingIndicators: true,
    notificationSettings: defaultNotificationSettings,
    isOnline: Boolean(participant.isOnline),
    lastActive: participant.lastActive || '',
    createdAt: dm?.createdAt || '',
    updatedAt: dm?.updatedAt || '',
    unread: resolveUnreadCount(dm?.unreadCount, dm?.unread, participant?.unreadCount, participant?.unread) ?? 0,
    isArchived: Boolean(dm?.isArchived),
    isStarred: Boolean(dm?.isStarred),
    isMuted: Boolean(dm?.isMuted),
    preview: buildMessagePreview(dm?.lastMessage),
  };
};

const upsertChannel = (items: Channel[], nextChannel: Channel): Channel[] => {
  const existing = items.find((channel) => channel.id === nextChannel.id);
  const mergedChannel = existing
    ? {
        ...existing,
        ...nextChannel,
        members: nextChannel.members?.length ? nextChannel.members : existing.members,
      }
    : nextChannel;

  return [mergedChannel, ...items.filter((channel) => channel.id !== nextChannel.id)];
};

const upsertDmUser = (items: User[], nextUser: User): User[] => {
  const existing = items.find((user) => user.id === nextUser.id);
  const mergedUser = existing
    ? {
        ...existing,
        ...nextUser,
        dmId: nextUser.dmId || existing.dmId,
        preview: nextUser.preview || existing.preview,
      }
    : nextUser;

  return [mergedUser, ...items.filter((user) => user.id !== nextUser.id)];
};

const Aside = ({
  onSelectChat,
  selectedChatId = null,
  selectedChatType = null,
  onProfileOpen,
  canAccessAdmin = false,
}: AsideProps) => {
  const [activeTab, setActiveTab] = useState<'all' | 'archived' | 'starred'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string | null>(null);
  const [currentUserAvatar, setCurrentUserAvatar] = useState<string | null>(null);
  const [showCreateChannelModal, setShowCreateChannelModal] = useState(false);
  const [showNewConversationModal, setShowNewConversationModal] = useState(false);

  const navigate = useNavigate();
  const { socket, isConnected, onlineUsers } = useWebSocket();
  const channelsRef = useRef<Channel[]>([]);
  const usersRef = useRef<User[]>([]);
  const selectedChatRef = useRef<{ id: string | null; type: 'channel' | 'dm' | null }>({
    id: null,
    type: null,
  });
  const dmUserMapRef = useRef<Record<string, string>>({});
  const userDmMapRef = useRef<Record<string, string>>({});

  useEffect(() => {
    channelsRef.current = channels;
  }, [channels]);

  useEffect(() => {
    usersRef.current = users;
    const nextDmUserMap: Record<string, string> = {};
    const nextUserDmMap: Record<string, string> = {};

    users.forEach((user) => {
      if (user.dmId) {
        nextDmUserMap[user.dmId] = user.id;
        nextUserDmMap[user.id] = user.dmId;
      }
    });

    dmUserMapRef.current = nextDmUserMap;
    userDmMapRef.current = nextUserDmMap;
  }, [users]);

  useEffect(() => {
    selectedChatRef.current = { id: selectedChatId, type: selectedChatType };
  }, [selectedChatId, selectedChatType]);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        return;
      }

      try {
        const res = await axios.get(`${API_BASE_URL}/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const user = res.data?.user || res.data || {};
        const resolvedId = user.id ? String(user.id) : '';
        setCurrentUserId(resolvedId || null);
        setCurrentUserName(typeof user.name === 'string' ? user.name.trim() : null);
        setCurrentUserAvatar(typeof user.avatar === 'string' ? user.avatar : null);
      } catch (err) {
        console.warn('Failed to fetch current user details', err);
      }
    };

    fetchCurrentUser();
  }, []);

  useEffect(() => {
    const onProfileUpdated = (event: Event) => {
      const ce = event as CustomEvent<{ name?: string; avatar?: string | null }>;
      if (typeof ce.detail.name === 'string') {
        setCurrentUserName(ce.detail.name.trim());
      }
      if (typeof ce.detail.avatar === 'string' || ce.detail.avatar === null) {
        setCurrentUserAvatar(ce.detail.avatar);
      }
    };

    window.addEventListener('profile-updated', onProfileUpdated as EventListener);
    return () => window.removeEventListener('profile-updated', onProfileUpdated as EventListener);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please log in to view chats');
        navigate('/');
        return;
      }

      setIsLoading(true);

      try {
        const [channelsRes, dmsRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/channels`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${API_BASE_URL}/dms`, {
            headers: { Authorization: `Bearer ${token}` },
            params: { filter: 'all' },
          }),
        ]);

        setChannels(
          (channelsRes.data?.channels || [])
            .map(mapChannelSummary)
            .filter((channel: Channel) => Boolean(channel.id))
        );
        setUsers(
          (dmsRes.data?.dms || [])
            .map(mapDmSummaryToUser)
            .filter((user: User) => Boolean(user.id))
        );
      } catch (err: any) {
        const msg = err.response?.data?.error || 'Failed to load data';
        toast.error(msg);

        if (err.response?.status === 401 || err.response?.status === 403) {
          localStorage.removeItem('token');
          navigate('/');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  const resolveDmListUserId = useCallback(
    (senderId?: string, dmId?: string) => {
      if (senderId && (!currentUserId || senderId !== currentUserId)) {
        return senderId;
      }

      if (dmId && dmUserMapRef.current[dmId]) {
        return dmUserMapRef.current[dmId];
      }

      return senderId || '';
    },
    [currentUserId]
  );

  const isActiveDmChat = useCallback((userId?: string, dmId?: string) => {
    if (selectedChatRef.current.type !== 'dm') {
      return false;
    }

    if (userId && selectedChatRef.current.id === userId) {
      return true;
    }

    const activeUserId = selectedChatRef.current.id;
    return Boolean(activeUserId && dmId && userDmMapRef.current[activeUserId] === dmId);
  }, []);

  const channelIdsKey = useMemo(() => channels.map((channel) => channel.id).join('|'), [channels]);
  const dmIdsKey = useMemo(
    () => users.map((user) => user.dmId).filter((dmId): dmId is string => Boolean(dmId)).join('|'),
    [users]
  );

  useEffect(() => {
    if (!socket || !isConnected || !channelIdsKey) {
      return;
    }

    channels.forEach((channel) => socket.emit('join_channel', { channelId: channel.id }));
  }, [socket, isConnected, channelIdsKey, channels]);

  useEffect(() => {
    if (!socket || !isConnected || !dmIdsKey) {
      return;
    }

    users.forEach((user) => {
      if (user.dmId) {
        socket.emit('join_dm', { dmId: user.dmId });
      }
    });
  }, [socket, isConnected, dmIdsKey, users]);

  useEffect(() => {
    if (!socket) {
      return;
    }

    const onNewMessage = (data: any) => {
      const message = data?.message ?? data?.data?.message ?? data?.payload?.message ?? data;
      const channelId = resolveSocketField(data, ['channelId', 'channel.id']);
      const senderId = resolveSocketField(data, ['sender.id', 'senderId']);
      const preview = buildMessagePreview(message);
      const isActiveChannel =
        selectedChatRef.current.type === 'channel' && selectedChatRef.current.id === channelId;

      if (!channelId || (currentUserId && senderId === currentUserId)) {
        return;
      }

      setChannels((prev) =>
        prev.map((channel) =>
          channel.id === channelId
            ? {
                ...channel,
                unread: isActiveChannel ? 0 : (channel.unread || 0) + 1,
              }
            : channel
        )
      );

      if (!isActiveChannel) {
        const channel = channelsRef.current.find((item) => item.id === channelId);
        toast.info(`${channel?.name || 'Channel'}: ${preview}`);
      }
    };

    const onNewDmMessage = (data: any) => {
      const message = data?.message ?? data?.data?.message ?? data?.payload?.message ?? data;
      const roomDmId = resolveSocketField(data, ['dmId', 'dm.id']);
      const senderId = resolveSocketField(data, ['sender.id', 'senderId']);
      const isOwnMessage = Boolean(currentUserId && senderId && senderId === currentUserId);
      const targetUserId = resolveDmListUserId(senderId, roomDmId);
      const preview = buildMessagePreview(message);
      const isActiveDm = isActiveDmChat(targetUserId, roomDmId);

      if (!targetUserId || isOwnMessage) {
        return;
      }

      setUsers((prev) => {
        const existing = prev.find((user) => user.id === targetUserId);
        const updatedUser: User = existing
          ? {
              ...existing,
              dmId: roomDmId || existing.dmId,
              avatar: message?.sender?.avatar || existing.avatar,
              isOnline: true,
              lastActive: new Date().toISOString(),
              preview,
              unread: isActiveDm ? 0 : (existing.unread || 0) + 1,
            }
          : {
              id: targetUserId,
              dmId: roomDmId || undefined,
              name: message?.sender?.name || 'New DM',
              email: '',
              avatar: message?.sender?.avatar || undefined,
              bio: '',
              lastSeen: '',
              profileVisibility: 'everyone',
              readReceipts: true,
              typingIndicators: true,
              notificationSettings: defaultNotificationSettings,
              isOnline: true,
              lastActive: new Date().toISOString(),
              createdAt: '',
              updatedAt: '',
              unread: isActiveDm ? 0 : 1,
              isArchived: false,
              isStarred: false,
              isMuted: false,
              preview,
            };

        return [updatedUser, ...prev.filter((user) => user.id !== targetUserId)];
      });

      if (!isActiveDm) {
        const user = usersRef.current.find((item) => item.id === targetUserId);
        toast.info(`${user?.name || message?.sender?.name || 'New DM'}: ${preview}`);
      }
    };

    socket.on('new_message', onNewMessage);
    socket.on('new_dm_message', onNewDmMessage);

    return () => {
      socket.off('new_message', onNewMessage);
      socket.off('new_dm_message', onNewDmMessage);
    };
  }, [socket, currentUserId, isActiveDmChat, resolveDmListUserId]);

  useEffect(() => {
    const onChannelCreated = (e: Event) => {
      const ce = e as CustomEvent<{ channel?: any }>;
      const rawChannel = ce.detail?.channel ?? ce.detail;
      const nextChannel = mapChannelSummary(rawChannel);

      if (!nextChannel.id) {
        return;
      }

      setChannels((prev) => upsertChannel(prev, nextChannel));
    };

    const onDmCreated = (e: Event) => {
      const ce = e as CustomEvent<{ dm?: any }>;
      const rawDm = ce.detail?.dm ?? ce.detail;
      const nextUser = mapDmSummaryToUser(rawDm);

      if (!nextUser.id) {
        return;
      }

      if (nextUser.dmId) {
        dmUserMapRef.current[nextUser.dmId] = nextUser.id;
        userDmMapRef.current[nextUser.id] = nextUser.dmId;
      }

      setUsers((prev) => upsertDmUser(prev, nextUser));
    };

    const onUnreadUpdate = (e: Event) => {
      const ce = e as CustomEvent<{
        type?: string;
        channelId?: string | number;
        dmId?: string | number;
        senderId?: string | number;
        userId?: string | number;
        otherUserId?: string | number;
        unreadCount?: number | string;
        count?: number | string;
        unread?: number | string;
      }>;

      const unreadCount = resolveUnreadCount(ce.detail.unreadCount, ce.detail.count, ce.detail.unread);

      if (ce.detail.type === 'channel' && ce.detail.channelId) {
        const channelId = String(ce.detail.channelId);
        const isActiveChannel =
          selectedChatRef.current.type === 'channel' && selectedChatRef.current.id === channelId;

        setChannels((prev) =>
          prev.map((channel) =>
            channel.id === channelId
              ? {
                  ...channel,
                  unread: isActiveChannel ? 0 : unreadCount ?? (channel.unread || 0) + 1,
                }
              : channel
          )
        );
        return;
      }

      const dmId = ce.detail.dmId ? String(ce.detail.dmId) : '';
      const senderId = ce.detail.senderId ? String(ce.detail.senderId) : '';
      const hintedUserId = ce.detail.otherUserId
        ? String(ce.detail.otherUserId)
        : ce.detail.userId
          ? String(ce.detail.userId)
          : '';
      const targetUserId = resolveDmListUserId(senderId || hintedUserId, dmId) || hintedUserId;

      if (
        !targetUserId ||
        (currentUserId && targetUserId === currentUserId) ||
        isActiveDmChat(targetUserId, dmId)
      ) {
        return;
      }

      setUsers((prev) =>
        prev.map((user) =>
          user.id === targetUserId
            ? {
                ...user,
                unread: unreadCount ?? (user.unread || 0) + 1,
              }
            : user
        )
      );
    };

    const onDmResolved = (e: Event) => {
      const ce = e as CustomEvent<{ userId?: string; dmId?: string }>;
      const userId = ce.detail.userId ? String(ce.detail.userId) : '';
      const dmId = ce.detail.dmId ? String(ce.detail.dmId) : '';

      if (!userId || !dmId) {
        return;
      }

      dmUserMapRef.current[dmId] = userId;
      userDmMapRef.current[userId] = dmId;

      setUsers((prev) => prev.map((user) => (user.id === userId ? { ...user, dmId } : user)));

      if (usersRef.current.some((user) => user.id === userId)) {
        return;
      }

      const token = localStorage.getItem('token');
      if (!token) {
        return;
      }

      void axios
        .get(`${API_BASE_URL}/users/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((res) => {
          const user = res.data?.user || res.data || {};
          setUsers((prev) => {
            if (prev.some((item) => item.id === userId)) {
              return prev;
            }

            return [
              {
                id: userId,
                dmId,
                name: user.name || 'New DM',
                email: user.email || '',
                avatar: user.avatar || undefined,
                bio: user.bio || '',
                lastSeen: user.lastActive || '',
                profileVisibility: user.profileVisibility || 'everyone',
                readReceipts: user.readReceipts ?? true,
                typingIndicators: user.typingIndicators ?? true,
                notificationSettings: user.notificationSettings || defaultNotificationSettings,
                isOnline: Boolean(user.isOnline),
                lastActive: user.lastActive || '',
                createdAt: user.createdAt || '',
                updatedAt: user.updatedAt || '',
                unread: 0,
                isArchived: false,
                isStarred: false,
                isMuted: false,
                preview: 'Direct message',
              },
              ...prev,
            ];
          });
        })
        .catch((err) => {
          console.warn('Failed to hydrate DM participant from resolved room', err);
        });
    };

    window.addEventListener('channel-created', onChannelCreated as EventListener);
    window.addEventListener('dm-created', onDmCreated as EventListener);
    window.addEventListener('unread-update', onUnreadUpdate as EventListener);
    window.addEventListener('dm-resolved', onDmResolved as EventListener);
    return () => {
      window.removeEventListener('channel-created', onChannelCreated as EventListener);
      window.removeEventListener('dm-created', onDmCreated as EventListener);
      window.removeEventListener('unread-update', onUnreadUpdate as EventListener);
      window.removeEventListener('dm-resolved', onDmResolved as EventListener);
    };
  }, [currentUserId, isActiveDmChat, resolveDmListUserId]);

  useEffect(() => {
    const onChatRead = (e: Event) => {
      const ce = e as CustomEvent<{ chatId: string; type: 'channel' | 'dm' }>;
      const { chatId, type } = ce.detail;

      if (type === 'channel') {
        setChannels((prev) => prev.map((channel) => (channel.id === chatId ? { ...channel, unread: 0 } : channel)));
      } else {
        setUsers((prev) => prev.map((user) => (user.id === chatId ? { ...user, unread: 0 } : user)));
      }
    };

    window.addEventListener('chat-read', onChatRead as EventListener);
    return () => window.removeEventListener('chat-read', onChatRead as EventListener);
  }, []);

  const filteredChannels = channels.filter((channel) => {
    if (activeTab === 'archived') {
      return channel.isArchived;
    }
    if (activeTab === 'starred') {
      return channel.isStarred && !channel.isArchived;
    }
    return !channel.isArchived;
  });

  const filteredUsers = users
    .filter((user) => user.id !== currentUserId)
    .map((user) => ({
      ...user,
      isOnline: isConnected ? onlineUsers.includes(String(user.id)) : user.isOnline,
    }))
    .filter((user) => {
      if (activeTab === 'archived') {
        return user.isArchived;
      }
      if (activeTab === 'starred') {
        return user.isStarred && !user.isArchived;
      }
      return !user.isArchived;
    });

  const handleActionSuccess = (updatedItem: any, isChannel: boolean) => {
    if (isChannel) {
      setChannels((prev) => prev.map((channel) => (channel.id === updatedItem.id ? { ...channel, ...updatedItem } : channel)));
    } else {
      setUsers((prev) => prev.map((user) => (user.id === updatedItem.id ? { ...user, ...updatedItem } : user)));
    }
  };

  const handleSelectChat = (chatId: string, type: 'channel' | 'dm', name?: string) => {
    if (type === 'channel') {
      setChannels((prev) => prev.map((channel) => (channel.id === chatId ? { ...channel, unread: 0 } : channel)));
    } else {
      setUsers((prev) => prev.map((user) => (user.id === chatId ? { ...user, unread: 0 } : user)));
    }

    let extraData:
      | {
          avatar?: string;
          description?: string;
          bio?: string;
          memberCount?: number;
          isSystem?: boolean;
          isDefault?: boolean;
          membershipPolicy?: string;
          dmId?: string;
        }
      | undefined;

    if (type === 'channel') {
      const channel = channels.find((item) => item.id === chatId);
      if (channel) {
        extraData = {
          avatar: channel.avatar,
          description: channel.description,
          memberCount: channel.members?.length,
          isSystem: channel.isSystem,
          isDefault: channel.isDefault,
          membershipPolicy: channel.membershipPolicy,
        };
      }
    } else {
      const user = users.find((item) => item.id === chatId);
      if (user) {
        extraData = {
          avatar: user.avatar,
          bio: user.bio,
          dmId: user.dmId,
        };
      }
    }

    onSelectChat?.(chatId, type, name, extraData);
  };

  return (
    <aside className="flex h-full min-h-0 flex-col bg-sidebar text-sidebar-text">
      <AsideHeader
        isLoading={isLoading}
        channels={channels}
        users={filteredUsers}
        onSelectChat={handleSelectChat}
        isConnected={isConnected}
        currentUserName={currentUserName}
        currentUserAvatar={currentUserAvatar}
        onProfileOpen={onProfileOpen}
        canAccessAdmin={canAccessAdmin}
      />

      <AsideTabs activeTab={activeTab} setActiveTab={setActiveTab} isLoading={isLoading} />

      <div className="scroll flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-5 pb-5 pt-2">
        <ChatSection
          title="Channels"
          icon={<Users className="h-3.5 w-3.5" />}
          items={filteredChannels}
          type="channel"
          onSelectChat={handleSelectChat}
          onPlusClick={() => setShowCreateChannelModal(true)}
          emptyMessage="No channels yet. Create one to get the team talking."
          activeTab={activeTab}
          onActionSuccess={(updated: any) => handleActionSuccess(updated, true)}
          selectedChatId={selectedChatId ?? undefined}
          selectedChatType={selectedChatType ?? undefined}
        />

        <ChatSection
          title="Direct Messages"
          icon={<AtSign className="h-3.5 w-3.5" />}
          items={filteredUsers}
          type="dm"
          onSelectChat={handleSelectChat}
          emptyMessage="No direct messages yet."
          activeTab={activeTab}
          onActionSuccess={(updated) => handleActionSuccess(updated, false)}
          selectedChatId={selectedChatId ?? undefined}
          selectedChatType={selectedChatType ?? undefined}
        />
      </div>

      <div className="px-5 pb-5 pt-2">
        <button
          onClick={() => setShowNewConversationModal(true)}
          className="flex w-full items-center justify-center gap-3 rounded-[22px] bg-gradient-to-r from-blue to-blue-dark px-5 py-4 text-base font-semibold text-white shadow-[0_18px_34px_rgba(37,99,235,0.28)] transition duration-300 hover:-translate-y-0.5 cursor-pointer"
        >
          <span className="text-2xl leading-none">+</span>
          Invite People
        </button>
      </div>

      <CreateChannelModal
        isOpen={showCreateChannelModal}
        onClose={() => setShowCreateChannelModal(false)}
      />

      <NewConversationModal
        isOpen={showNewConversationModal}
        onClose={() => setShowNewConversationModal(false)}
        onSelectChat={handleSelectChat}
      />
    </aside>
  );
};

export default Aside;






