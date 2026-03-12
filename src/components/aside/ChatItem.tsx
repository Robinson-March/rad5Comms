// components/aside/ChatItem.tsx
import { useEffect, useRef, useState } from 'react';
import { Archive, Bell, BellOff, CheckCircle, Hash, MoreHorizontal, Star } from 'lucide-react';
import axios, { AxiosError } from 'axios';
import { toast } from 'sonner';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface ChatItemProps {
  item: {
    id: string;
    dmId?: string;
    name: string;
    avatar?: string;
    unread?: number;
    isArchived?: boolean;
    isStarred?: boolean;
    isMuted?: boolean;
    isOnline?: boolean;
    members?: Array<{ id: string }>;
    description?: string;
    preview?: string;
  };
  type: 'channel' | 'dm';
  onSelectChat?: (chatId: string, type: 'channel' | 'dm', name?: string) => void;
  activeTab: 'all' | 'archived' | 'starred';
  selectedChatId?: string;
  selectedChatType?: 'channel' | 'dm';
  onActionSuccess?: (updatedItem: any) => void;
  index?: number;
}

const ChatItem = ({
  item,
  type,
  onSelectChat,
  activeTab,
  selectedChatId,
  selectedChatType,
  onActionSuccess,
  index = 0,
}: ChatItemProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isSelected = selectedChatId === item.id && selectedChatType === type;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAction = async (action: 'markRead' | 'archive' | 'star' | 'mute') => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No token');
      }

      const actionPath = action === 'markRead' ? 'read' : action;
      const targetId = item.id;
      const url =
        type === 'channel'
          ? `${API_BASE_URL}/channels/${targetId}/${actionPath}`
          : `${API_BASE_URL}/dms/${targetId}/${actionPath}`;

      const res = await axios.post(
        url,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const responseData = res.data;
      const updatedItem = {
        ...item,
        unread: action === 'markRead' ? 0 : item.unread,
        ...(responseData.isStarred !== undefined && { isStarred: responseData.isStarred }),
        ...(responseData.isArchived !== undefined && { isArchived: responseData.isArchived }),
        ...(responseData.isMuted !== undefined && { isMuted: responseData.isMuted }),
      };

      onActionSuccess?.(updatedItem);

      const actionTextMap = {
        markRead: 'marked as read',
        archive: updatedItem.isArchived ? 'archived' : 'unarchived',
        star: updatedItem.isStarred ? 'starred' : 'unstarred',
        mute: updatedItem.isMuted ? 'muted' : 'unmuted',
      };

      toast.success(`${item.name} ${actionTextMap[action]}`);
    } catch (err: unknown) {
      const error = err as AxiosError<{ error: string }>;
      toast.error(error.response?.data?.error || `Failed to ${action} ${item.name}`);
    }

    setIsMenuOpen(false);
  };

  if ((activeTab === 'archived' && !item.isArchived) || (activeTab === 'all' && item.isArchived)) {
    return null;
  }

  const subtitle =
    type === 'channel'
      ? item.description || `${item.members?.length || 0} members`
      : item.preview || (item.isOnline ? 'Online now' : 'Direct message');

  return (
    <div
      className="animate-fade-up relative"
      ref={menuRef}
      style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
    >
      <div
        className={`flex items-center gap-3 rounded-[22px] px-3 py-3 transition duration-300 ${
          isSelected
            ? 'bg-white text-text-primary shadow-[0_18px_30px_rgba(37,99,235,0.12)] ring-1 ring-blue/10'
            : 'bg-transparent text-text-primary hover:bg-white/72 hover:-translate-y-0.5'
        }`}
      >
        <button
          onClick={() => onSelectChat?.(item.id, type, item.name)}
          className="flex min-w-0 flex-1 items-center gap-3 text-left cursor-pointer"
          type="button"
        >
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl ${
              type === 'channel' ? 'bg-blue-soft text-blue' : 'bg-panel-strong text-text-primary'
            }`}
          >
            {type === 'channel' ? (
              <Hash className="h-5 w-5" />
            ) : item.avatar ? (
              <img src={item.avatar} alt={item.name} className="h-full w-full object-cover" />
            ) : (
              <span className="text-sm font-semibold">{item.name.charAt(0).toUpperCase()}</span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-semibold">{item.name}</span>
              {item.isStarred && <Star className="h-3.5 w-3.5 fill-current text-warning" />}
            </div>
            <div className="mt-1 truncate text-xs text-text-secondary">{subtitle}</div>
          </div>
        </button>

        <div className="flex shrink-0 items-center gap-2">
          {typeof item.unread === 'number' && item.unread > 0 && (
            <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-blue px-2 py-1 text-xs font-semibold text-white shadow-[0_10px_18px_rgba(37,99,235,0.28)]">
              {item.unread > 99 ? '99+' : item.unread}
            </span>
          )}

          {type === 'dm' ? (
            <span className={`h-2.5 w-2.5 rounded-full ${item.isOnline ? 'bg-success' : 'bg-border'}`} />
          ) : null}

          <button
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-text-secondary transition hover:bg-panel-muted hover:text-text-primary cursor-pointer"
            type="button"
            aria-label={`Open actions for ${item.name}`}
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-56 rounded-2xl border border-border bg-white p-1.5 shadow-[0_22px_50px_rgba(15,23,42,0.14)]">
          {item.unread && item.unread > 0 && (
            <button
              onClick={() => handleAction('markRead')}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-text-primary transition hover:bg-panel-muted cursor-pointer"
              type="button"
            >
              <CheckCircle className="h-4 w-4" />
              Mark as read
            </button>
          )}

          <button
            onClick={() => handleAction('archive')}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-text-primary transition hover:bg-panel-muted cursor-pointer"
            type="button"
          >
            <Archive className="h-4 w-4" />
            {item.isArchived ? 'Unarchive' : 'Archive'}
          </button>

          <button
            onClick={() => handleAction('star')}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-text-primary transition hover:bg-panel-muted cursor-pointer"
            type="button"
          >
            <Star className="h-4 w-4" />
            {item.isStarred ? 'Unstar' : 'Star'}
          </button>

          <button
            onClick={() => handleAction('mute')}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-text-primary transition hover:bg-panel-muted cursor-pointer"
            type="button"
          >
            {item.isMuted ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
            {item.isMuted ? 'Unmute' : 'Mute'}
          </button>
        </div>
      )}
    </div>
  );
};

export default ChatItem;

