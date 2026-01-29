// components/aside/Aside.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../App.css';
import {
  MessageSquare,
  Archive,
  Star,
  Users,
  Plus,
  Hash,
  AtSign,
  Moon,
  Search,
} from 'lucide-react';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import axios from 'axios';
import { toast } from 'sonner';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface AsideProps {
  onSelectChat?: (chatId: string, type: 'channel' | 'dm') => void;
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
}

const Aside = ({ onSelectChat }: AsideProps) => {
  const [activeTab, setActiveTab] = useState<'all' | 'archived' | 'starred'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

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

        // Safely extract arrays from nested responses
        const channelsData = channelsRes.data?.channels || [];
        const usersData = usersRes.data?.users || [];

        setChannels(Array.isArray(channelsData) ? channelsData : []);
        setUsers(Array.isArray(usersData) ? usersData : []);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        const msg =
          err.response?.data?.error ||
          err.response?.data?.message ||
          'Failed to load channels and users';

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

  return (
    <div className="font-poppins h-screen sm:w-auto lg:w-[280px] min-w-[260px] bg-sidebar text-sidebar-text overflow-y-auto flex flex-col scroll">
      {/* Header */}
      <div className="p-4 pb-2 border-b border-white/10 flex items-center justify-between">
        {isLoading ? (
          <>
            <div>
              <Skeleton width={160} height={28} baseColor="#1e40af" highlightColor="#3b82f6" />
              <Skeleton width={110} height={16} className="mt-1" baseColor="#1e40af" highlightColor="#3b82f6" />
            </div>
            <Skeleton circle width={32} height={32} baseColor="#1e40af" highlightColor="#3b82f6" />
          </>
        ) : (
          <>
            <div>
              <h1 className="text-xl font-bold">Rad5 Comms</h1>
              <p className="text-sm opacity-70 mt-1">Chats</p>
            </div>
            <button className="p-2 rounded-full hover:bg-white/10 transition cursor-pointer">
              <Search className="w-5 h-5 opacity-80" />
            </button>
          </>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 mt-2">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex-1 py-2">
              <Skeleton height={20} width="60%" className="mx-auto" baseColor="#1e40af" highlightColor="#3b82f6" />
            </div>
          ))
        ) : (
          <>
            <button
              onClick={() => setActiveTab('all')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 cursor-pointer text-xs font-medium transition-colors ${
                activeTab === 'all'
                  ? 'text-white border-b-2 border-blue'
                  : 'text-sidebar-text/70 hover:text-white'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              All
            </button>
            <button
              onClick={() => setActiveTab('archived')}
              className={`flex-1 flex items-center justify-center cursor-pointer gap-1.5 py-2 text-xs font-medium transition-colors ${
                activeTab === 'archived'
                  ? 'text-white border-b-2 border-blue'
                  : 'text-sidebar-text/70 hover:text-white'
              }`}
            >
              <Archive className="w-4 h-4" />
              Archived
            </button>
            <button
              onClick={() => setActiveTab('starred')}
              className={`flex-1 flex items-center justify-center gap-1.5 cursor-pointer py-2 text-xs font-medium transition-colors ${
                activeTab === 'starred'
                  ? 'text-white border-b-2 border-blue'
                  : 'text-sidebar-text/70 hover:text-white'
              }`}
            >
              <Star className="w-4 h-4" />
              Starred
            </button>
          </>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scroll">
        {isLoading ? (
          // Your original skeleton (unchanged)
          <>
            <div>
              <div className="flex items-center justify-between mb-2 px-2">
                <div className="flex items-center gap-1.5">
                  <Skeleton circle width={14} height={14} baseColor="#1e40af" highlightColor="#3b82f6" />
                  <Skeleton width={60} height={14} baseColor="#1e40af" highlightColor="#3b82f6" />
                </div>
                <Skeleton circle width={20} height={20} baseColor="#1e40af" highlightColor="#3b82f6" />
              </div>
              <div className="space-y-0.5">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="w-full px-3 py-1.5 flex items-center gap-2.5">
                    <Skeleton circle width={16} height={16} baseColor="#1e40af" highlightColor="#3b82f6" />
                    <Skeleton width={110} height={16} baseColor="#1e40af" highlightColor="#3b82f6" />
                    {i === 1 && (
                      <Skeleton width={24} height={16} className="ml-auto rounded-full" baseColor="#1e40af" highlightColor="#3b82f6" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2 px-2">
                <div className="flex items-center gap-1.5">
                  <Skeleton circle width={14} height={14} baseColor="#1e40af" highlightColor="#3b82f6" />
                  <Skeleton width={80} height={14} baseColor="#1e40af" highlightColor="#3b82f6" />
                </div>
                <Skeleton circle width={20} height={20} baseColor="#1e40af" highlightColor="#3b82f6" />
              </div>
              <div className="space-y-0.5">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="w-full px-3 py-1.5 flex items-center gap-2.5">
                    <Skeleton circle width={24} height={24} baseColor="#1e40af" highlightColor="#3b82f6" />
                    <Skeleton width={130} height={16} baseColor="#1e40af" highlightColor="#3b82f6" />
                    {i % 3 === 0 && i < 6 && (
                      <Skeleton width={24} height={16} className="ml-auto rounded-full" baseColor="#1e40af" highlightColor="#3b82f6" />
                    )}
                    {i === 5 && (
                      <Skeleton width={40} height={16} className="ml-auto" baseColor="#1e40af" highlightColor="#3b82f6" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : error ? (
          <div className="text-center text-red-400 py-8 px-4 text-sm">
            {error}
          </div>
        ) : (
          <>
            {/* TEAM / Channels */}
            <div>
              <div className="flex items-center justify-between mb-2 px-2">
                <h2 className="text-xs font-semibold uppercase tracking-wide opacity-80 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  TEAM
                </h2>
                <button className="text-white/60 hover:text-white cursor-pointer">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-0.5">
                {channels.length === 0 ? (
                  <div className="text-center text-sm opacity-70 py-6 px-4 bg-white/5 rounded-lg">
                    No channels yet.<br />
                    Create one to start chatting!
                  </div>
                ) : (
                  channels.map((channel) => (
                    <button
                      key={channel.id}
                      onClick={() => onSelectChat?.(channel.id, 'channel')}
                      className="w-full text-left px-3 py-1.5 rounded-md hover:bg-white/10 transition flex items-center gap-2.5 cursor-pointer"
                    >
                      <Hash className="w-4 h-4 opacity-80" />
                      {channel.name}
                      {/* You can add unread badge if API provides it */}
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* PERSONAL / DMs */}
            <div>
              <div className="flex items-center justify-between mb-2 px-2">
                <h2 className="text-xs font-semibold uppercase tracking-wide opacity-80 flex items-center gap-1.5">
                  <AtSign className="w-3.5 h-3.5" />
                  PERSONAL
                </h2>
                <button className="text-white/60 hover:text-white cursor-pointer">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-0.5">
                {users.length === 0 ? (
                  <div className="text-center text-sm opacity-70 py-6 px-4 bg-white/5 rounded-lg">
                    No direct messages yet
                  </div>
                ) : (
                  users.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => onSelectChat?.(user.id, 'dm')}
                      className="w-full text-left px-3 py-1.5 rounded-md hover:bg-white/10 transition flex items-center gap-2.5 cursor-pointer"
                    >
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user.name}
                          className="w-6 h-6 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-blue-500/30 flex items-center justify-center text-white text-xs font-bold">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      {user.name}
                      {/* Add unread if API provides it */}
                    </button>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Bottom actions */}
      <div className="p-4 border-t border-white/10 flex gap-3">
        <button className="w-full py-2 bg-white/10 hover:bg-white/20 rounded-md text-sm font-medium transition flex items-center justify-center gap-2 cursor-pointer">
          <Plus className="w-4 h-4" />
          New Conversation
        </button>
        <button className="p-3 cursor-pointer bg-white/10 hover:bg-white/20 rounded-full text-sm transition flex items-center justify-center">
          <Moon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Aside;