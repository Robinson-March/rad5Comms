// components/thread-pane/ThreadHeader.tsx
import { useEffect, useState } from 'react';
import { UserPlus } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface ThreadHeaderProps {
  chat: {
    id: string;
    name: string;
    description?: string;
    bio?: string;
    avatar?: string;           // ← this is what we use
    memberCount?: number;
    isGroup: boolean;
    type?: 'channel' | 'dm';
  } | null;
}

const ThreadHeader = ({ chat }: ThreadHeaderProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Array<{ id: string; name: string; avatar?: string }>>([]);
  const [currentUserName, setCurrentUserName] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdding) return;
    const fetchMe = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const res = await axios.get(`${API_BASE_URL}/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const name = res.data?.name || res.data?.user?.name;
        if (name) setCurrentUserName(name);
      } catch {
        // ignore
      }
    };
    fetchMe();
  }, [isAdding]);

  useEffect(() => {
    if (!isAdding || !searchTerm.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(
          `${API_BASE_URL}/users?search=${encodeURIComponent(searchTerm)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const users: Array<{ id: string; name: string; avatar?: string }> =
          res.data?.users || res.data || [];
        const lower = searchTerm.toLowerCase();
        const filtered = users.filter((u) => u.name.toLowerCase().includes(lower));
        setSearchResults(filtered.slice(0, 10));
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [isAdding, searchTerm]);

    
  // Bio for DM, description for channel — silent if missing
  const middleText = chat?.type === 'dm' ? chat?.bio : chat?.description;

  if (!chat) {
    return (
      <div className="text-center space-y-4 py-8 text-gray-500">
        <p>No chat selected</p>
      </div>
    );
  }

  return (
    <div className="text-center space-y-5 px-6 py-2">
      {/* Avatar — uses chat.avatar if available */}
      <div className="mx-auto w-28 h-28 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden border-4 border-white shadow-lg">
        {chat.avatar ? (
          <img
            src={chat.avatar}
            alt={chat.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.src = ''; // fallback on error
              e.currentTarget.style.display = 'none';
              e.currentTarget.parentElement!.innerHTML = `<span class="text-5xl font-bold text-gray-600">${chat.name.charAt(0).toUpperCase()}</span>`;
            }}
          />
        ) : (
          <span className="text-5xl font-bold text-gray-600">
            {chat.name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      {/* Name */}
      <h3 className="text-lg lg:text-2xl font-bold text-white">{chat.name}</h3>

      {/* Bio/Description — only if present */}
      {middleText && (
        <p className="text-sm text-gray-600 leading-relaxed max-w-md mx-auto">
          {middleText}
        </p>
      )}

      {/* Member count + Add button — only for groups/channels */}
      {chat.isGroup && (
        <div className="flex items-center justify-center gap-8 text-sm pt-2">
          <div className="text-center">
            <span className="block text-2xl font-bold text-white">
              {chat.memberCount ?? 0}
            </span>
            <span className="text-gray-600">members</span>
          </div>

          <button
            className="flex items-center gap-2 px-2 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition shadow-md text-xs"
            onClick={() => setIsAdding((v) => !v)}
          >
            <UserPlus className="w-5 h-5" />
            Add members
          </button>
        </div>
      )}

      {/* Add members search modal */}
      {chat.isGroup && isAdding && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-center gap-2">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Type a name to search..."
              className="px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {searchTerm && (
            <div className="max-h-56 overflow-y-auto bg-white rounded-md border border-gray-200 shadow-sm mx-auto w-72">
              {isSearching ? (
                <div className="p-3 text-center text-gray-500 text-sm">Searching...</div>
              ) : searchResults.length === 0 ? (
                <div className="p-3 text-center text-gray-500 text-sm">No users found</div>
              ) : (
                searchResults.map((user) => (
                  <button
                    key={user.id}
                    onClick={async () => {
                      try {
                        const token = localStorage.getItem('token');
                        if (!token) {
                          toast.error('Please log in');
                          return;
                        }
                        await axios.post(
                          `${API_BASE_URL}/channels/${chat.id}/members`,
                          { userId: user.id },
                          { headers: { Authorization: `Bearer ${token}` } }
                        );
                        toast.success('Member added');

                        const byName = currentUserName || 'You';
                        window.dispatchEvent(
                          new CustomEvent('member-added', {
                            detail: {
                              channelId: chat.id,
                              addedUser: { id: user.id, name: user.name },
                              addedBy: { name: byName },
                            },
                          })
                        );

                        setSearchTerm('');
                        setSearchResults([]);
                        setIsAdding(false);
                      } catch (err: unknown) {
                        const msg =
                          typeof err === 'object' &&
                          err !== null &&
                          // @ts-expect-error index access
                          err.response?.data?.error
                            ? // @ts-expect-error index access
                              err.response.data.error
                            : 'Failed to add member';
                        toast.error(msg);
                      }
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition border-b last:border-none"
                  >
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="font-medium text-gray-900 text-sm">{user.name}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ThreadHeader;