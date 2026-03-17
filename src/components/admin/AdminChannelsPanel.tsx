import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Hash, RefreshCw, UserCog, UserMinus, Users } from 'lucide-react';
import { toast } from 'sonner';
import {
  API_BASE_URL,
  defaultChannelForm,
  extractRoot,
  normalizeAdminUser,
  normalizeChannel,
  readArray,
  type AdminChannelRecord,
  type AdminUserRecord,
} from './shared';

interface AdminChannelsPanelProps {
  token: string;
}

const AdminChannelsPanel = ({ token }: AdminChannelsPanelProps) => {
  const [isLoadingChannels, setIsLoadingChannels] = useState(false);
  const [channels, setChannels] = useState<AdminChannelRecord[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [channelSearch, setChannelSearch] = useState('');
  const [channelForm, setChannelForm] = useState(defaultChannelForm);
  const [editingChannelId, setEditingChannelId] = useState<string | null>(null);
  const [editingChannelForm, setEditingChannelForm] = useState(defaultChannelForm);
  const [memberSearchTerm, setMemberSearchTerm] = useState('');
  const [memberSearchResults, setMemberSearchResults] = useState<AdminUserRecord[]>([]);
  const [isSearchingMembers, setIsSearchingMembers] = useState(false);

  const fetchChannels = useCallback(async () => {
    setIsLoadingChannels(true);

    try {
      const response = await axios.get(`${API_BASE_URL}/admin/channels`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const root = extractRoot(response.data);
      const nextChannels = readArray(root.channels)
        .map(normalizeChannel)
        .filter((channel): channel is AdminChannelRecord => Boolean(channel));

      setChannels(nextChannels);
      setSelectedChannelId((previous) => previous || nextChannels[0]?.id || null);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to load channels');
      }
    } finally {
      setIsLoadingChannels(false);
    }
  }, [token]);

  useEffect(() => {
    void fetchChannels();
  }, [fetchChannels]);

  useEffect(() => {
    if (!memberSearchTerm.trim()) {
      setMemberSearchResults([]);
      setIsSearchingMembers(false);
      return;
    }

    const timer = window.setTimeout(async () => {
      setIsSearchingMembers(true);

      try {
        const response = await axios.get(`${API_BASE_URL}/admin/users`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { search: memberSearchTerm.trim() },
        });

        const root = extractRoot(response.data);
        const nextUsers = readArray(root.users)
          .map(normalizeAdminUser)
          .filter((record): record is AdminUserRecord => Boolean(record));

        setMemberSearchResults(nextUsers);
      } catch (err: unknown) {
        if (axios.isAxiosError(err)) {
          toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to search users');
        }
      } finally {
        setIsSearchingMembers(false);
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
    };
  }, [memberSearchTerm, token]);

  const filteredChannels = useMemo(() => {
    const term = channelSearch.trim().toLowerCase();

    if (!term) {
      return channels;
    }

    return channels.filter((channel) =>
      [channel.name, channel.description, channel.membershipPolicy]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term)
    );
  }, [channelSearch, channels]);

  const selectedChannel = useMemo(
    () => channels.find((channel) => channel.id === selectedChannelId) || null,
    [channels, selectedChannelId]
  );

  const handleCreateChannel = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      await axios.post(`${API_BASE_URL}/admin/channels`, channelForm, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success('Channel created');
      setChannelForm(defaultChannelForm);
      await fetchChannels();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to create channel');
      }
    }
  };

  const handleSaveChannel = async (channelId: string) => {
    try {
      await axios.patch(`${API_BASE_URL}/admin/channels/${channelId}`, editingChannelForm, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success('Channel updated');
      setEditingChannelId(null);
      setEditingChannelForm(defaultChannelForm);
      await fetchChannels();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to update channel');
      }
    }
  };

  const handleSyncDefaultMembership = async (channelId: string) => {
    try {
      await axios.post(
        `${API_BASE_URL}/admin/channels/${channelId}/sync-default-membership`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('Default membership synced');
      await fetchChannels();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to sync membership');
      }
    }
  };

  const handleAddMember = async (channelId: string, userId: string) => {
    try {
      await axios.post(
        `${API_BASE_URL}/admin/channels/${channelId}/members`,
        { userId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('Member added');
      setMemberSearchTerm('');
      setMemberSearchResults([]);
      await fetchChannels();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to add member');
      }
    }
  };

  const handleUpdateMemberRole = async (channelId: string, memberId: string, role: string) => {
    try {
      await axios.patch(
        `${API_BASE_URL}/admin/channels/${channelId}/members/${memberId}`,
        { role },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('Member role updated');
      await fetchChannels();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to update member role');
      }
    }
  };

  const handleRemoveMember = async (channelId: string, memberId: string) => {
    try {
      await axios.delete(`${API_BASE_URL}/admin/channels/${channelId}/members/${memberId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success('Member removed');
      await fetchChannels();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to remove member');
      }
    }
  };

  return (
    <div className="mt-6 grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
      <div className="space-y-5">
        <form onSubmit={handleCreateChannel} className="rounded-[28px] border border-border bg-panel-muted/70 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-text-secondary">
            <Hash className="h-4 w-4" />
            Create channel
          </div>

          <div className="mt-4 space-y-3">
            <input
              type="text"
              value={channelForm.name}
              onChange={(event) => setChannelForm((previous) => ({ ...previous, name: event.target.value }))}
              placeholder="Channel name"
              className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-text-primary outline-none focus:border-blue/30"
            />
            <textarea
              value={channelForm.description}
              onChange={(event) => setChannelForm((previous) => ({ ...previous, description: event.target.value }))}
              placeholder="Description"
              rows={4}
              className="w-full resize-none rounded-2xl border border-border bg-white px-4 py-3 text-sm text-text-primary outline-none focus:border-blue/30"
            />
            <select
              value={channelForm.membershipPolicy}
              onChange={(event) => setChannelForm((previous) => ({ ...previous, membershipPolicy: event.target.value }))}
              className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-text-primary outline-none focus:border-blue/30"
            >
              <option value="open">Open membership</option>
              <option value="admin_managed">Admin managed</option>
            </select>
            <label className="flex items-center gap-3 rounded-2xl border border-border bg-white px-4 py-3 text-sm text-text-primary">
              <input
                type="checkbox"
                checked={channelForm.isDefault}
                onChange={(event) => setChannelForm((previous) => ({ ...previous, isDefault: event.target.checked }))}
                className="h-4 w-4"
              />
              Forced membership
            </label>
            <label className="flex items-center gap-3 rounded-2xl border border-border bg-white px-4 py-3 text-sm text-text-primary">
              <input
                type="checkbox"
                checked={channelForm.isSystem}
                onChange={(event) => setChannelForm((previous) => ({ ...previous, isSystem: event.target.checked }))}
                className="h-4 w-4"
              />
              System channel
            </label>
          </div>

          <button
            type="submit"
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-dark cursor-pointer"
          >
            <Hash className="h-4 w-4" />
            Create channel
          </button>
        </form>

        <div className="rounded-[28px] border border-border bg-panel-muted/70 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-text-primary">Channels</h2>
              <p className="mt-1 text-sm text-text-secondary">Select a channel to manage members and policy.</p>
            </div>

            <button
              type="button"
              onClick={() => void fetchChannels()}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-sm font-medium text-text-primary transition hover:border-blue/30 hover:text-blue cursor-pointer"
            >
              <RefreshCw className={`h-4 w-4 ${isLoadingChannels ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          <input
            type="text"
            value={channelSearch}
            onChange={(event) => setChannelSearch(event.target.value)}
            placeholder="Search channels"
            className="mt-4 w-full rounded-full border border-border bg-white px-4 py-2.5 text-sm text-text-primary outline-none focus:border-blue/30"
          />

          <div className="mt-4 space-y-3">
            {filteredChannels.map((channel) => {
              const isSelected = channel.id === selectedChannelId;

              return (
                <button
                  key={channel.id}
                  type="button"
                  onClick={() => setSelectedChannelId(channel.id)}
                  className={`w-full rounded-2xl border px-4 py-4 text-left transition cursor-pointer ${
                    isSelected ? 'border-blue/30 bg-blue-soft/70 shadow-sm' : 'border-border bg-white hover:border-blue/20'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-text-primary">{channel.name}</div>
                      <div className="mt-1 text-sm text-text-secondary">{channel.description || `${channel.memberCount} members`}</div>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      {channel.isDefault ? (
                        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">
                          Forced
                        </span>
                      ) : null}
                      {channel.isSystem ? (
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700">
                          System
                        </span>
                      ) : null}
                      {channel.membershipPolicy ? (
                        <span className="rounded-full bg-panel-muted px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-text-secondary">
                          {channel.membershipPolicy.replace('_', ' ')}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="space-y-5">
        {selectedChannel ? (
          <>
            <div className="rounded-[28px] border border-border bg-panel-muted/70 p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-text-primary">{selectedChannel.name}</h2>
                  <p className="mt-2 text-sm leading-6 text-text-secondary">
                    {selectedChannel.description || 'No description provided.'}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {selectedChannel.isDefault ? (
                    <button
                      type="button"
                      onClick={() => void handleSyncDefaultMembership(selectedChannel.id)}
                      className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-900 transition hover:bg-amber-100 cursor-pointer"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Sync forced membership
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => {
                      setEditingChannelId(selectedChannel.id);
                      setEditingChannelForm({
                        name: selectedChannel.name,
                        description: selectedChannel.description || '',
                        isDefault: selectedChannel.isDefault,
                        isSystem: selectedChannel.isSystem,
                        membershipPolicy: selectedChannel.membershipPolicy || 'open',
                      });
                    }}
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-sm font-medium text-text-primary transition hover:border-blue/30 hover:text-blue cursor-pointer"
                  >
                    <UserCog className="h-4 w-4" />
                    Edit channel
                  </button>
                </div>
              </div>

              {editingChannelId === selectedChannel.id ? (
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  <input
                    type="text"
                    value={editingChannelForm.name}
                    onChange={(event) => setEditingChannelForm((previous) => ({ ...previous, name: event.target.value }))}
                    className="rounded-2xl border border-border bg-white px-4 py-3 text-sm text-text-primary outline-none focus:border-blue/30"
                  />
                  <select
                    value={editingChannelForm.membershipPolicy}
                    onChange={(event) =>
                      setEditingChannelForm((previous) => ({ ...previous, membershipPolicy: event.target.value }))
                    }
                    className="rounded-2xl border border-border bg-white px-4 py-3 text-sm text-text-primary outline-none focus:border-blue/30"
                  >
                    <option value="open">Open membership</option>
                    <option value="admin_managed">Admin managed</option>
                  </select>
                  <textarea
                    value={editingChannelForm.description}
                    onChange={(event) => setEditingChannelForm((previous) => ({ ...previous, description: event.target.value }))}
                    rows={4}
                    className="md:col-span-2 resize-none rounded-2xl border border-border bg-white px-4 py-3 text-sm text-text-primary outline-none focus:border-blue/30"
                  />
                  <label className="flex items-center gap-3 rounded-2xl border border-border bg-white px-4 py-3 text-sm text-text-primary">
                    <input
                      type="checkbox"
                      checked={editingChannelForm.isDefault}
                      onChange={(event) =>
                        setEditingChannelForm((previous) => ({ ...previous, isDefault: event.target.checked }))
                      }
                      className="h-4 w-4"
                    />
                    Forced membership
                  </label>
                  <label className="flex items-center gap-3 rounded-2xl border border-border bg-white px-4 py-3 text-sm text-text-primary">
                    <input
                      type="checkbox"
                      checked={editingChannelForm.isSystem}
                      onChange={(event) =>
                        setEditingChannelForm((previous) => ({ ...previous, isSystem: event.target.checked }))
                      }
                      className="h-4 w-4"
                    />
                    System channel
                  </label>
                  <div className="md:col-span-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void handleSaveChannel(selectedChannel.id)}
                      className="rounded-full bg-blue px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-dark cursor-pointer"
                    >
                      Save channel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingChannelId(null);
                        setEditingChannelForm(defaultChannelForm);
                      }}
                      className="rounded-full border border-border bg-white px-4 py-2 text-sm font-medium text-text-secondary transition hover:text-text-primary cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="rounded-[28px] border border-border bg-panel-muted/70 p-5">
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-text-secondary">
                <Users className="h-4 w-4" />
                Members
              </div>

              <div className="mt-4 rounded-2xl border border-border bg-white p-4">
                <div className="text-sm font-medium text-text-primary">Add member</div>
                <input
                  type="text"
                  value={memberSearchTerm}
                  onChange={(event) => setMemberSearchTerm(event.target.value)}
                  placeholder="Search users by name or email"
                  className="mt-3 w-full rounded-2xl border border-border bg-panel-muted px-4 py-3 text-sm text-text-primary outline-none focus:border-blue/30"
                />

                {memberSearchTerm.trim() ? (
                  <div className="mt-3 max-h-56 overflow-y-auto space-y-2">
                    {isSearchingMembers ? (
                      <div className="rounded-2xl bg-panel-muted px-4 py-3 text-sm text-text-secondary">Searching users...</div>
                    ) : memberSearchResults.length === 0 ? (
                      <div className="rounded-2xl bg-panel-muted px-4 py-3 text-sm text-text-secondary">No users found.</div>
                    ) : (
                      memberSearchResults.map((record) => {
                        const alreadyMember = selectedChannel.members.some((member) => member.id === record.id);

                        return (
                          <button
                            key={record.id}
                            type="button"
                            disabled={alreadyMember}
                            onClick={() => void handleAddMember(selectedChannel.id, record.id)}
                            className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left transition ${
                              alreadyMember
                                ? 'cursor-not-allowed bg-panel-muted text-text-secondary opacity-70'
                                : 'bg-panel-muted text-text-primary hover:bg-panel-strong cursor-pointer'
                            }`}
                          >
                            <div>
                              <div className="text-sm font-semibold">{record.name}</div>
                              <div className="mt-1 text-xs text-text-secondary">{record.email}</div>
                            </div>
                            <span className="text-xs font-semibold uppercase tracking-[0.16em]">
                              {alreadyMember ? 'Added' : 'Add'}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                ) : null}
              </div>

              {selectedChannel.isDefault ? (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-900">
                  Forced membership is enabled for this channel, so per-user removal is hidden here by design.
                </div>
              ) : null}

              <div className="mt-4 space-y-3">
                {selectedChannel.members.map((member) => (
                  <div key={member.id} className="rounded-2xl border border-border bg-white px-4 py-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <div className="text-sm font-semibold text-text-primary">{member.name}</div>
                        <div className="mt-1 text-sm text-text-secondary">{member.email || 'No email provided'}</div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={member.role}
                          onChange={(event) =>
                            void handleUpdateMemberRole(selectedChannel.id, member.id, event.target.value)
                          }
                          className="rounded-full border border-border bg-panel-muted px-4 py-2 text-sm text-text-primary outline-none focus:border-blue/30"
                        >
                          <option value="member">Member</option>
                          <option value="admin">Admin</option>
                        </select>

                        {!selectedChannel.isDefault ? (
                          <button
                            type="button"
                            onClick={() => void handleRemoveMember(selectedChannel.id, member.id)}
                            className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100 cursor-pointer"
                          >
                            <UserMinus className="h-4 w-4" />
                            Remove
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}

                {selectedChannel.members.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border bg-white/70 px-4 py-5 text-sm text-text-secondary">
                    No members were returned for this channel.
                  </div>
                ) : null}
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-[28px] border border-dashed border-border bg-panel-muted/70 px-6 py-10 text-center text-text-secondary">
            Select a channel to manage it.
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminChannelsPanel;
