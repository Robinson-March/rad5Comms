// components/threadPane/ThreadHeader.tsx
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
    avatar?: string;
    memberCount?: number;
    isGroup: boolean;
    isAdminManagedChannel?: boolean;
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
    if (!isAdding) {
      return;
    }

    const fetchMe = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          return;
        }
        const res = await axios.get(`${API_BASE_URL}/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const name = res.data?.name || res.data?.user?.name;
        if (name) {
          setCurrentUserName(name);
        }
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
        const res = await axios.get(`${API_BASE_URL}/users?search=${encodeURIComponent(searchTerm)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const users: Array<{ id: string; name: string; avatar?: string }> = res.data?.users || res.data || [];
        const lower = searchTerm.toLowerCase();
        setSearchResults(users.filter((user) => user.name.toLowerCase().includes(lower)).slice(0, 10));
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [isAdding, searchTerm]);

  if (!chat) {
    return <div className="text-sm text-text-secondary">No chat selected</div>;
  }

  const supportingText = chat.type === 'dm' ? chat.bio : chat.description;

  return (
    <div className="text-center">
      <div className="mx-auto flex h-24 w-24 items-center justify-center overflow-hidden rounded-[30px] bg-blue-soft text-3xl font-semibold text-blue shadow-[0_18px_36px_rgba(37,99,235,0.18)]">
        {chat.avatar ? (
          <img src={chat.avatar} alt={chat.name} className="h-full w-full object-cover" />
        ) : (
          chat.name.charAt(0).toUpperCase()
        )}
      </div>

      <h3 className="mt-5 text-2xl font-semibold text-text-primary">{chat.name}</h3>
      {supportingText && <p className="mt-3 text-sm leading-6 text-text-secondary">{supportingText}</p>}

      {chat.isGroup && (
        <div className="mt-5 flex items-center justify-center gap-4 rounded-[24px] bg-panel-muted px-4 py-4 text-left">
          <div>
            <div className="text-2xl font-semibold text-text-primary">{chat.memberCount ?? 0}</div>
            <div className="text-xs uppercase tracking-[0.2em] text-text-secondary">Members</div>
          </div>
          <button
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium shadow-[0_14px_28px_rgba(37,99,235,0.22)] transition ${
              chat.isAdminManagedChannel
                ? 'cursor-not-allowed bg-panel text-text-secondary shadow-none opacity-70'
                : 'bg-blue text-white hover:bg-blue-dark cursor-pointer'
            }`}
            onClick={() => {
              if (chat.isAdminManagedChannel) {
                toast.info('Membership changes for this channel are managed from the admin area.');
                return;
              }

              setIsAdding((value) => !value);
            }}
            type="button"
          >
            <UserPlus className="h-4 w-4" />
            {isAdding ? 'Close invite' : 'Add members'}
          </button>
        </div>
      )}

      {chat.isGroup && chat.isAdminManagedChannel ? (
        <p className="mt-4 text-sm leading-6 text-text-secondary">
          Membership for this channel is managed in the admin area.
        </p>
      ) : null}

      {chat.isGroup && isAdding && !chat.isAdminManagedChannel && (
        <div className="mt-5 rounded-[24px] bg-panel-muted p-4 text-left">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search for teammates"
            className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-text-primary outline-none focus:border-blue/30"
          />

          {searchTerm && (
            <div className="scroll mt-3 max-h-56 overflow-y-auto rounded-2xl bg-white p-2 shadow-sm">
              {isSearching ? (
                <div className="px-3 py-4 text-center text-sm text-text-secondary">Searching...</div>
              ) : searchResults.length === 0 ? (
                <div className="px-3 py-4 text-center text-sm text-text-secondary">No users found</div>
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
                        window.dispatchEvent(
                          new CustomEvent('member-added', {
                            detail: {
                              channelId: chat.id,
                              addedUser: { id: user.id, name: user.name, avatar: user.avatar },
                              addedBy: { name: currentUserName || 'You' },
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
                          // @ts-expect-error response access
                          err.response?.data?.error
                            ? // @ts-expect-error response access
                              err.response.data.error
                            : 'Failed to add member';
                        toast.error(msg);
                      }
                    }}
                    className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 transition hover:bg-panel-muted cursor-pointer"
                  >
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.name} className="h-9 w-9 rounded-2xl object-cover" />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-panel-muted text-sm font-semibold text-text-primary">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="text-sm font-medium text-text-primary">{user.name}</span>
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
