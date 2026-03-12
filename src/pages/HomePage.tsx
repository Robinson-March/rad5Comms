// src/pages/HomePage.tsx
import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import Aside from '../components/aside/Aside';
import Main from '../components/main/Main';
import ThreadPane from '../components/threadPane/ThreadPane';
import SettingsModal from './Settings';
import 'react-loading-skeleton/dist/skeleton.css';

const DESKTOP_BREAKPOINT = 1180;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export interface SelectedChat {
  id: string;
  type: 'channel' | 'dm';
  name: string;
  description?: string;
  bio?: string;
  avatar?: string;
  memberCount?: number;
  members?: Array<{ id: string; name: string; avatar?: string; role?: string }>;
  isAdmin?: boolean;
  dmId?: string;
  media?: Array<{ url: string; type: string; name?: string; mimeType?: string | null; size?: number | null }>;
}

const extractMedia = (payload: any): Array<{ url: string; type: string; name?: string; mimeType?: string | null; size?: number | null }> => {
  const mediaItems = Array.isArray(payload?.media)
    ? payload.media
    : Array.isArray(payload?.messages)
      ? payload.messages
      : Array.isArray(payload)
        ? payload
        : [];

  return mediaItems.flatMap((item: any) => {
    const attachments = Array.isArray(item?.attachments) ? item.attachments : [];
    const audio = item?.audio ? [item.audio] : [];

    return [...attachments, ...audio]
      .filter((attachment: any) => {
        const type = String(attachment?.type ?? '').toLowerCase();
        const mimeType = String(attachment?.mimeType ?? '').toLowerCase();
        return Boolean(attachment?.url) && (type === 'image' || mimeType.startsWith('image/'));
      })
      .map((attachment: any) => ({
        url: String(attachment.url),
        type: String(attachment.type ?? 'image'),
        name: attachment.name ?? attachment.originalName ?? undefined,
        mimeType: attachment.mimeType ?? attachment.mimetype ?? null,
        size: typeof attachment.size === 'number' ? attachment.size : null,
      }));
  });
};

function HomePage() {
  const [isThreadOpen, setIsThreadOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < DESKTOP_BREAKPOINT);
  const [activeView, setActiveView] = useState<'aside' | 'main' | 'thread'>('aside');
  const [selectedChat, setSelectedChat] = useState<SelectedChat | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const latestSelectionRef = useRef<string>('');

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < DESKTOP_BREAKPOINT;
      setIsMobile(mobile);
      if (!mobile) {
        setActiveView('aside');
      } else if (!selectedChat) {
        setActiveView('aside');
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [selectedChat]);

  useEffect(() => {
    if (isMobile && !selectedChat && activeView !== 'aside') {
      setActiveView('aside');
    }
  }, [activeView, isMobile, selectedChat]);

  useEffect(() => {
    const handleChatAction = () => {
      latestSelectionRef.current = '';
      setSelectedChat(null);
      setIsThreadOpen(false);
      if (isMobile) {
        setActiveView('aside');
      }
    };

    window.addEventListener('chat-action-success', handleChatAction);
    return () => window.removeEventListener('chat-action-success', handleChatAction);
  }, [isMobile]);

  useEffect(() => {
    const onMemberAdded = (e: Event) => {
      const ce = e as CustomEvent<{
        channelId: string;
        addedUser: { id: string; name: string; avatar?: string };
        addedBy: { name: string };
      }>;

      setSelectedChat((prev) => {
        if (!prev || prev.type !== 'channel' || prev.id !== ce.detail.channelId) {
          return prev;
        }

        const existing = Array.isArray(prev.members) ? prev.members : [];
        const alreadyExists = existing.some((member) => member.id === ce.detail.addedUser.id);

        return {
          ...prev,
          memberCount: (prev.memberCount || existing.length) + (alreadyExists ? 0 : 1),
          members: alreadyExists
            ? existing
            : [
                ...existing,
                {
                  id: ce.detail.addedUser.id,
                  name: ce.detail.addedUser.name,
                  avatar: ce.detail.addedUser.avatar,
                },
              ],
        };
      });
    };

    window.addEventListener('member-added', onMemberAdded as EventListener);
    return () => window.removeEventListener('member-added', onMemberAdded as EventListener);
  }, []);

  const toggleThreadPane = () => {
    setIsThreadOpen((prev) => {
      const next = !prev;
      if (isMobile) {
        setActiveView(next ? 'thread' : 'main');
      }
      return next;
    });
  };

  const handleSelectChat = async (
    chatId: string,
    type: 'channel' | 'dm',
    name?: string,
    extra?: {
      avatar?: string;
      description?: string;
      bio?: string;
      memberCount?: number;
      dmId?: string;
    }
  ) => {
    const selectionKey = `${type}:${chatId}`;
    latestSelectionRef.current = selectionKey;

    const provisionalChat: SelectedChat = {
      id: chatId,
      type,
      name: name || 'Unnamed chat',
      ...extra,
      dmId: extra?.dmId,
      media: selectedChat?.id === chatId && selectedChat.type === type ? selectedChat.media : [],
    };

    setSelectedChat(provisionalChat);
    setIsThreadOpen(false);
    if (isMobile) {
      setActiveView('main');
    }

    const token = localStorage.getItem('token');
    if (!token) {
      return;
    }

    let fullData: Omit<SelectedChat, 'id' | 'type' | 'name'> = {
      ...extra,
      dmId: extra?.dmId,
    };

    try {
      if (type === 'channel') {
        const [channelRes, mediaRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/channels/${chatId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios
            .get(`${API_BASE_URL}/channels/${chatId}/media`, {
              headers: { Authorization: `Bearer ${token}` },
            })
            .catch(() => null),
        ]);

        const channel = channelRes.data?.channel || channelRes.data || {};
        const media = extractMedia(mediaRes?.data).length
          ? extractMedia(mediaRes?.data)
          : Array.isArray(channel.media)
            ? channel.media
            : [];

        fullData = {
          avatar: channel.avatar || extra?.avatar,
          description: channel.description || extra?.description,
          memberCount:
            typeof channel.memberCount === 'number'
              ? channel.memberCount
              : channel.members?.length || extra?.memberCount,
          members: Array.isArray(channel.members) ? channel.members : [],
          isAdmin: channel.role === 'admin' || channel.isAdmin === true,
          media,
        };
      } else {
        const [userRes, mediaRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/users/${chatId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios
            .get(`${API_BASE_URL}/dms/${chatId}/media`, {
              headers: { Authorization: `Bearer ${token}` },
            })
            .catch(() => null),
        ]);

        const user = userRes.data?.user || userRes.data || {};
        fullData = {
          avatar: user.avatar || extra?.avatar,
          bio: user.bio || extra?.bio,
          dmId: user.dmId || extra?.dmId,
          media: extractMedia(mediaRes?.data),
        };
      }
    } catch (err) {
      console.warn('Failed to fetch full chat details:', err);
    }

    if (latestSelectionRef.current !== selectionKey) {
      return;
    }

    setSelectedChat((prev) => {
      if (!prev || prev.id !== chatId || prev.type !== type) {
        return prev;
      }

      return {
        ...prev,
        name: name || prev.name,
        ...fullData,
      };
    });
  };

  const goBackToAside = () => setActiveView('aside');
  const goBackToMain = () => {
    setIsThreadOpen(false);
    setActiveView('main');
  };

  const mobileViewClass = isMobile ? 'absolute inset-0 transform transition-transform duration-300 ease-out' : '';

  return (
    <div className="ambient-grid relative h-screen w-screen overflow-hidden p-3 lg:p-4">
      <div className="surface-glow relative flex h-full overflow-hidden rounded-[32px] border border-white/70 bg-white/72 backdrop-blur-xl">
        <div
          className={
            isMobile
              ? `${mobileViewClass} ${activeView === 'aside' ? 'translate-x-0' : '-translate-x-full'} z-30 bg-sidebar`
              : 'h-full w-[320px] min-w-[320px] border-r border-border/80 bg-sidebar'
          }
        >
          <Aside
            onSelectChat={handleSelectChat}
            selectedChatId={selectedChat?.id ?? null}
            selectedChatType={selectedChat?.type ?? null}
            onProfileOpen={() => setIsSettingsOpen(true)}
          />
        </div>

        <div
          className={
            isMobile
              ? `${mobileViewClass} ${activeView === 'main' ? 'translate-x-0' : 'translate-x-full'} z-20 bg-transparent`
              : 'flex min-w-0 flex-1 flex-col bg-transparent'
          }
        >
          <Main isThreadOpen={isThreadOpen} toggleThreadPane={toggleThreadPane} onBack={isMobile ? goBackToAside : undefined} selectedChat={selectedChat} />
        </div>

        <div
          className={
            isMobile
              ? `${mobileViewClass} ${activeView === 'thread' ? 'translate-x-0' : 'translate-x-full'} z-40 bg-panel-muted`
              : `h-full border-l border-border/80 bg-panel-muted/88 transition-[width] duration-300 ease-out ${
                  isThreadOpen ? 'w-[336px] min-w-[336px]' : 'w-0 overflow-hidden border-l-transparent'
                }`
          }
        >
          {(isMobile ? activeView === 'thread' : isThreadOpen) && (
            <ThreadPane isOpen={true} onToggle={toggleThreadPane} onBack={isMobile ? goBackToMain : undefined} selectedChat={selectedChat} />
          )}
        </div>
      </div>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} defaultTab="profile" />
    </div>
  );
}

export default HomePage;
