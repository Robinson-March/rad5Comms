/* eslint-disable @typescript-eslint/no-explicit-any */
// components/main/ForwardModal.tsx
import { useEffect, useState } from 'react';
import { Hash, Search, Send, X } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface ForwardModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceMessage: { id: string; text: string } | null;
}

const ForwardModal = ({ isOpen, onClose, sourceMessage }: ForwardModalProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [channelResults, setChannelResults] = useState<Array<{ id: string; name: string }>>([]);
  const [userResults, setUserResults] = useState<Array<{ id: string; name: string; avatar?: string }>>([]);
  const [selectedTargets, setSelectedTargets] = useState<Array<{ id: string; type: 'channel' | 'dm'; name: string }>>([]);

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setChannelResults([]);
      setUserResults([]);
      setSelectedTargets([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const term = searchTerm.trim();
    if (!term) {
      setChannelResults([]);
      setUserResults([]);
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const [channelsRes, usersRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/channels?search=${encodeURIComponent(term)}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${API_BASE_URL}/users?search=${encodeURIComponent(term)}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        setChannelResults((channelsRes.data?.channels || channelsRes.data || []).slice(0, 10));
        setUserResults((usersRes.data?.users || usersRes.data || []).slice(0, 10));
      } catch {
        setChannelResults([]);
        setUserResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [isOpen, searchTerm]);

  const toggleSelect = (id: string, type: 'channel' | 'dm', name: string) => {
    setSelectedTargets((prev) => {
      const exists = prev.find((target) => target.id === id && target.type === type);
      if (exists) {
        return prev.filter((target) => !(target.id === id && target.type === type));
      }
      return [...prev, { id, type, name }];
    });
  };

  const handleForward = async () => {
    if (!sourceMessage || selectedTargets.length === 0) {
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Please log in');
      return;
    }

    try {
      for (const target of selectedTargets) {
        const endpoint =
          target.type === 'channel'
            ? `/channels/${target.id}/messages`
            : `/dms/${target.id}/messages`;

        await axios.post(
          `${API_BASE_URL}${endpoint}`,
          { text: sourceMessage.text },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      toast.success('Message forwarded');
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to forward');
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4" onClick={onClose}>
      <div className="w-full max-w-xl rounded-[30px] border border-white/80 bg-white p-4 shadow-[0_34px_70px_rgba(15,23,42,0.2)]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-text-primary">Forward message</h2>
            <p className="mt-1 text-sm text-text-secondary">Choose one or more channels or people.</p>
          </div>
          <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full bg-panel-muted text-text-secondary transition hover:text-text-primary cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        {sourceMessage && (
          <div className="mt-4 rounded-3xl bg-panel-muted px-4 py-3 text-sm leading-6 text-text-primary">{sourceMessage.text}</div>
        )}

        <div className="mt-4 rounded-3xl border border-border bg-panel px-4 py-3">
          <div className="flex items-center gap-3 text-text-secondary">
            <Search className="h-4 w-4" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search channels or people"
              className="w-full bg-transparent text-sm text-text-primary outline-none placeholder:text-text-secondary"
              autoFocus
            />
          </div>
        </div>

        {selectedTargets.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {selectedTargets.map((target) => (
              <button
                key={`${target.type}-${target.id}`}
                onClick={() => toggleSelect(target.id, target.type, target.name)}
                className="inline-flex items-center gap-2 rounded-full bg-blue-soft px-3 py-1.5 text-xs font-medium text-blue cursor-pointer"
              >
                {target.type === 'channel' && <Hash className="h-3 w-3" />}
                {target.name}
                <span>x</span>
              </button>
            ))}
          </div>
        )}

        <div className="scroll mt-5 max-h-[340px] overflow-y-auto space-y-5 pr-1">
          {isSearching ? (
            <div className="rounded-3xl bg-panel-muted px-4 py-8 text-center text-sm text-text-secondary">Searching...</div>
          ) : (
            <>
              {channelResults.length > 0 && (
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-text-secondary">Channels</h3>
                  <div className="space-y-2">
                    {channelResults.map((channel) => {
                      const selected = selectedTargets.some((target) => target.id === channel.id && target.type === 'channel');
                      return (
                        <button
                          key={channel.id}
                          onClick={() => toggleSelect(channel.id, 'channel', channel.name)}
                          className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition cursor-pointer ${
                            selected ? 'bg-blue-soft text-blue' : 'bg-panel-muted text-text-primary hover:bg-panel-strong'
                          }`}
                        >
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-blue">
                            <Hash className="h-4 w-4" />
                          </div>
                          <span className="font-medium">{channel.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {userResults.length > 0 && (
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-text-secondary">People</h3>
                  <div className="space-y-2">
                    {userResults.map((user) => {
                      const selected = selectedTargets.some((target) => target.id === user.id && target.type === 'dm');
                      return (
                        <button
                          key={user.id}
                          onClick={() => toggleSelect(user.id, 'dm', user.name)}
                          className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition cursor-pointer ${
                            selected ? 'bg-blue-soft text-blue' : 'bg-panel-muted text-text-primary hover:bg-panel-strong'
                          }`}
                        >
                          {user.avatar ? (
                            <img src={user.avatar} alt={user.name} className="h-10 w-10 rounded-2xl object-cover" />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-sm font-semibold text-text-primary">
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="font-medium">{user.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {!searchTerm.trim() && (
                <div className="rounded-3xl bg-panel-muted px-4 py-8 text-center text-sm text-text-secondary">
                  Start typing to search channels and people.
                </div>
              )}
            </>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-full border border-border px-4 py-2 text-sm text-text-secondary transition hover:bg-panel-muted cursor-pointer">
            Cancel
          </button>
          <button
            onClick={handleForward}
            disabled={!sourceMessage || selectedTargets.length === 0}
            className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold ${
              sourceMessage && selectedTargets.length > 0
                ? 'bg-blue text-white shadow-[0_16px_30px_rgba(37,99,235,0.24)] cursor-pointer'
                : 'bg-panel-muted text-text-secondary cursor-not-allowed'
            }`}
          >
            <Send className="h-4 w-4" />
            Forward
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForwardModal;
