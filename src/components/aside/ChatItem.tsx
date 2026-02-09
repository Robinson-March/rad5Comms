/* eslint-disable @typescript-eslint/no-explicit-any */
// components/aside/ChatItem.tsx
import { useState, useEffect, useRef } from 'react';
import { MoreVertical, Hash, Archive, Star, Moon, CheckCircle } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface ChatItemProps {
  item: {
    id: string;
    name: string;
    avatar?: string;
    unread?: number;
    isArchived?: boolean;
    isStarred?: boolean;
    // ... other fields
  };
  type: 'channel' | 'dm';
  onSelectChat?: (chatId: string, type: 'channel' | 'dm', name?: string) => void;
  activeTab: 'all' | 'archived' | 'starred';
}

const ChatItem = ({ item, type, onSelectChat, activeTab }: ChatItemProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(!isMenuOpen);
  };

  const handleAction = async (action: 'markRead' | 'archive' | 'star' | 'mute') => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No token');

      let baseEndpoint = '';
      if (type === 'channel') {
        baseEndpoint = `/channels/${item.id}`;
      } else {
        baseEndpoint = `/channels/personal/${item.id}`;
      }

      const actionPath = action === 'markRead' ? '/read' : `/${action}`;

      await axios.post(`${API_BASE_URL}${baseEndpoint}${actionPath}`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const actionText = {
        markRead: 'marked as read',
        archive: 'archived',
        star: 'starred',
        mute: 'muted',
      }[action];

      toast.success(`${item.name} ${actionText}`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || `Failed to ${action} ${item.name}`);
    }

    setIsMenuOpen(false);
  };

  // Tab visibility filter (hide if not matching active tab)
  if (
    (activeTab === 'archived' && !item.isArchived) ||
    (activeTab === 'starred' && !item.isStarred)
  ) {
    return null;
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => onSelectChat?.(item.id, type, item.name)}
        className="w-full text-left px-3 py-1.5 rounded-md hover:bg-white/10 transition flex items-center gap-2.5 cursor-pointer group"
      >
        {type === 'channel' ? (
          <Hash className="w-4 h-4 opacity-80" />
        ) : item.avatar ? (
          <img src={item.avatar} alt={item.name} className="w-6 h-6 rounded-full object-cover shrink-0" />
        ) : (
          <div className="w-6 h-6 rounded-full bg-blue-500/30 flex items-center justify-center text-white text-xs font-bold">
            {item.name.charAt(0).toUpperCase()}
          </div>
        )}

        <span className="flex-1 truncate">{item.name}</span>

        {item.unread && item.unread > 0 && (
          <span className="ml-2 text-xs bg-red-300/80 text-white px-2 py-0.5 rounded-full font-medium">
            {item.unread}
          </span>
        )}

        <button
          onClick={toggleMenu}
          className="p-1 rounded-full transition cursor-pointer"
        >
          <MoreVertical className="w-4 h-4 opacity-70" />
        </button>
      </button>

      {isMenuOpen && (
        <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-1.5 z-50">
          {item.unread && item.unread > 0 && (
            <button
              onClick={() => handleAction('markRead')}
              className="w-full text-left px-4 py-2.5 hover:bg-gray-100 flex items-center gap-3 text-sm text-gray-700"
            >
              <CheckCircle className="w-4 h-4" />
              Mark as read
            </button>
          )}

          <button
            onClick={() => handleAction('archive')}
            className="w-full text-left px-4 py-2.5 hover:bg-gray-100 flex items-center gap-3 text-sm text-gray-700"
          >
            <Archive className="w-4 h-4" />
            Archive
          </button>

          <button
            onClick={() => handleAction('star')}
            className="w-full text-left px-4 py-2.5 hover:bg-gray-100 flex items-center gap-3 text-sm text-gray-700"
          >
            <Star className="w-4 h-4" />
            Star
          </button>

          <button
            onClick={() => handleAction('mute')}
            className="w-full text-left px-4 py-2.5 hover:bg-gray-100 flex items-center gap-3 text-sm text-gray-700"
          >
            <Moon className="w-4 h-4" />
            Mute
          </button>
        </div>
      )}
    </div>
  );
};

export default ChatItem;