/* eslint-disable @typescript-eslint/no-explicit-any */
// components/aside/Aside.tsx
import { useState, useEffect } from 'react';
import '../../App.css'
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import AsideHeader from './AsideHeader';
import AsideTabs from './AsideTabs';
import ChatSection from './ChatSection';
import CreateChannelModal from './CreateChannelModal';
import NewConversationModal from './NewConversationModal';
// import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { AtSign, Moon, Plus, Users } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface AsideProps {
  onSelectChat?: (chatId: string, type: 'channel' | 'dm', name?: string) => void;
}

interface Channel {
  id: string;
  name: string;
  description?: string;
  avatar?: string;
  isGroup: boolean;
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
}

const Aside = ({ onSelectChat }: AsideProps) => {
  const [activeTab, setActiveTab] = useState<'all' | 'archived' | 'starred'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);

  const [showCreateChannelModal, setShowCreateChannelModal] = useState(false);
  const [showNewConversationModal, setShowNewConversationModal] = useState(false);

  const navigate = useNavigate();

  // Fetch current user ID (to exclude self from DMs)
  useEffect(() => {
    const fetchCurrentUser = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        const res = await axios.get(`${API_BASE_URL}/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCurrentUserId(res.data?.id || res.data?.user?.id);
      } catch (err) {
        console.warn('Failed to fetch current user ID', err);
      }
    };
    fetchCurrentUser();
  }, []);

  // Fetch channels & users
  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please log in to view chats');
        navigate('/');
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const [channelsRes, usersRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/channels`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${API_BASE_URL}/users`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        setChannels(channelsRes.data?.channels || []);
        setUsers(usersRes.data?.users || []);
      } catch (err: any) {
        const msg = err.response?.data?.error || 'Failed to load data';
        setError(msg);
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

  // Filter logic
  const filteredChannels = channels.filter((ch) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'archived') return ch.isArchived;
    if (activeTab === 'starred') return ch.isStarred;
    return true;
  });

  const filteredUsers = users
    .filter((u) => u.id !== currentUserId) // No self-DM
    .filter((u) => {
      if (activeTab === 'all') return true;
      if (activeTab === 'archived') return u.isArchived;
      if (activeTab === 'starred') return u.isStarred;
      return true;
    });

  // Callback for optimistic updates after action
  const handleActionSuccess = (updatedItem: any, isChannel: boolean) => {
    if (isChannel) {
      setChannels((prev) =>
        prev.map((ch) => (ch.id === updatedItem.id ? { ...ch, ...updatedItem } : ch))
      );
    } else {
      setUsers((prev) =>
        prev.map((u) => (u.id === updatedItem.id ? { ...u, ...updatedItem } : u))
      );
    }
  };

  const handleSelectChat = (chatId: string, type: 'channel' | 'dm', name?: string) => {
    setSelectedChatId(chatId);
    onSelectChat?.(chatId, type, name);
  };

  return (
    <div className="font-poppins h-screen sm:w-auto lg:w-[280px] min-w-[260px] bg-sidebar text-sidebar-text flex flex-col">
      <AsideHeader isLoading={isLoading}
      channels={channels}
      users={users}
      onSelectChat={handleSelectChat}
    />

      <AsideTabs activeTab={activeTab} setActiveTab={setActiveTab} isLoading={isLoading} />

      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Channels ~60% */}
        <div className="flex-5 overflow-y-auto px-3 py-4 scroll">
          <ChatSection
            title="TEAM"
            icon={<Users className="w-3.5 h-3.5" />}
            items={filteredChannels}
            type="channel"
            onSelectChat={handleSelectChat} // ← use handler
            onPlusClick={() => setShowCreateChannelModal(true)}
            emptyMessage="No channels yet. Click + to create one!"
            activeTab={activeTab}
            onActionSuccess={(updated) => handleActionSuccess(updated, true)}
            selectedChatId={selectedChatId} // ← pass current selected ID
          />
        </div>

        {/* Personal ~40% */}
        <div className="flex-6 overflow-y-auto px-3 py-4 border-t border-white/10 scroll">
          <ChatSection
            title="PERSONAL"
            icon={<AtSign className="w-3.5 h-3.5" />}
            items={filteredUsers}
            type="dm"
            onSelectChat={handleSelectChat} // ← use handler
            emptyMessage="No direct messages yet"
            activeTab={activeTab}
            onActionSuccess={(updated) => handleActionSuccess(updated, false)}
            selectedChatId={selectedChatId} // ← pass current selected ID
          />
        </div>
      </div>

      <div className="p-4 border-t border-white/10 flex gap-3">
        <button
          onClick={() => setShowNewConversationModal(true)}
          className="flex-1 py-2 bg-white/10 hover:bg-white/20 rounded-md text-sm font-medium transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          New Conversation
        </button>
        <button className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition flex items-center justify-center">
          <Moon className="w-4 h-4" />
        </button>
      </div>

      <CreateChannelModal
        isOpen={showCreateChannelModal}
        onClose={() => setShowCreateChannelModal(false)}
      />

      <NewConversationModal
        isOpen={showNewConversationModal}
        onClose={() => setShowNewConversationModal(false)}
        onSelectChat={handleSelectChat} // ← use handler here too
      />
    </div>
  );
};

export default Aside;