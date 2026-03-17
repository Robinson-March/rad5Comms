import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { FileUp, RefreshCw, RotateCcw, UserCheck, UserCog, UserPlus, UserX, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import {
  API_BASE_URL,
  defaultUserForm,
  extractRoot,
  normalizeAdminUser,
  normalizeTemporaryCredentials,
  readArray,
  type AdminUserRecord,
  type TemporaryCredential,
} from './shared';

interface AdminUsersPanelProps {
  token: string;
}

const AdminUsersPanel = ({ token }: AdminUsersPanelProps) => {
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userForm, setUserForm] = useState(defaultUserForm);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingUserForm, setEditingUserForm] = useState(defaultUserForm);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [temporaryCredentials, setTemporaryCredentials] = useState<TemporaryCredential[]>([]);

  const fetchUsers = useCallback(async () => {
    setIsLoadingUsers(true);

    try {
      const response = await axios.get(`${API_BASE_URL}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const root = extractRoot(response.data);
      const nextUsers = readArray(root.users)
        .map(normalizeAdminUser)
        .filter((record): record is AdminUserRecord => Boolean(record));

      setUsers(nextUsers);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to load users');
      }
    } finally {
      setIsLoadingUsers(false);
    }
  }, [token]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = useMemo(() => {
    const term = userSearch.trim().toLowerCase();

    if (!term) {
      return users;
    }

    return users.filter((record) =>
      [record.name, record.email, record.role, record.department, record.title]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term)
    );
  }, [userSearch, users]);

  const handleCreateUser = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      const response = await axios.post(`${API_BASE_URL}/admin/users`, userForm, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const credentials = normalizeTemporaryCredentials(response.data);
      if (credentials.length > 0) {
        setTemporaryCredentials(credentials);
      }

      toast.success('User created');
      setUserForm(defaultUserForm);
      await fetchUsers();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to create user');
      }
    }
  };

  const handleImportUsers = async () => {
    if (!importFile) {
      toast.error('Choose an import file first');
      return;
    }

    const formData = new FormData();
    formData.append('file', importFile);

    try {
      const response = await axios.post(`${API_BASE_URL}/admin/users/import`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      const credentials = normalizeTemporaryCredentials(response.data);
      if (credentials.length > 0) {
        setTemporaryCredentials(credentials);
      }

      toast.success('User import completed');
      setImportFile(null);
      await fetchUsers();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to import users');
      }
    }
  };

  const handleSaveUser = async (userId: string) => {
    try {
      await axios.patch(`${API_BASE_URL}/admin/users/${userId}`, editingUserForm, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success('User updated');
      setEditingUserId(null);
      setEditingUserForm(defaultUserForm);
      await fetchUsers();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to update user');
      }
    }
  };

  const handleUserAction = async (userId: string, action: 'disable' | 'reactivate' | 'reset-sessions') => {
    try {
      await axios.post(
        `${API_BASE_URL}/admin/users/${userId}/${action}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(action === 'reset-sessions' ? 'Sessions reset' : 'User updated');
      await fetchUsers();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to update user');
      }
    }
  };

  return (
    <div className="mt-6 grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
      <div className="space-y-5">
        <form onSubmit={handleCreateUser} className="rounded-[28px] border border-border bg-panel-muted/70 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-text-secondary">
            <UserPlus className="h-4 w-4" />
            Create user
          </div>

          <div className="mt-4 space-y-3">
            <input
              type="text"
              value={userForm.name}
              onChange={(event) => setUserForm((previous) => ({ ...previous, name: event.target.value }))}
              placeholder="Full name"
              className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-text-primary outline-none focus:border-blue/30"
            />
            <input
              type="email"
              value={userForm.email}
              onChange={(event) => setUserForm((previous) => ({ ...previous, email: event.target.value }))}
              placeholder="Email address"
              className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-text-primary outline-none focus:border-blue/30"
            />
            <select
              value={userForm.role}
              onChange={(event) => setUserForm((previous) => ({ ...previous, role: event.target.value }))}
              className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-text-primary outline-none focus:border-blue/30"
            >
              <option value="member">Member</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
              <option value="super_admin">Super admin</option>
            </select>
          </div>

          <button
            type="submit"
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-dark cursor-pointer"
          >
            <UserPlus className="h-4 w-4" />
            Create user
          </button>
        </form>

        <div className="rounded-[28px] border border-border bg-panel-muted/70 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-text-secondary">
            <FileUp className="h-4 w-4" />
            Import users
          </div>

          <div className="mt-4 space-y-3">
            <input
              type="file"
              accept=".csv,.xlsx,.xls,.json"
              onChange={(event) => setImportFile(event.target.files?.[0] || null)}
              className="block w-full text-sm text-text-secondary file:mr-4 file:rounded-full file:border-0 file:bg-white file:px-4 file:py-2.5 file:text-sm file:font-medium file:text-text-primary"
            />
            <p className="text-sm leading-6 text-text-secondary">
              Upload your prepared user list. Temporary passwords returned by the backend will show in the one-time panel below.
            </p>
          </div>

          <button
            type="button"
            onClick={handleImportUsers}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-text-primary transition hover:border-blue/30 hover:text-blue cursor-pointer"
          >
            <FileUp className="h-4 w-4" />
            Import file
          </button>
        </div>

        {temporaryCredentials.length > 0 ? (
          <div className="rounded-[28px] border border-amber-200 bg-amber-50/90 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-amber-950">Temporary passwords</div>
                <p className="mt-2 text-sm leading-6 text-amber-900/80">
                  Show these once and share them securely. They are not stored after you dismiss this panel.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTemporaryCredentials([])}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-amber-200 bg-white text-amber-900 transition hover:bg-amber-100 cursor-pointer"
                aria-label="Dismiss temporary passwords"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {temporaryCredentials.map((credential) => (
                <div key={credential.id} className="rounded-2xl border border-amber-200 bg-white px-4 py-4">
                  <div className="text-sm font-semibold text-text-primary">{credential.name}</div>
                  <div className="mt-1 text-sm text-text-secondary">{credential.email}</div>
                  <div className="mt-3 rounded-xl bg-panel-muted px-3 py-2 font-mono text-sm text-text-primary">
                    {credential.temporaryPassword}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="rounded-[28px] border border-border bg-panel-muted/70 p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-text-primary">Users</h2>
            <p className="mt-1 text-sm text-text-secondary">Create, update, suspend, and reset sessions.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              value={userSearch}
              onChange={(event) => setUserSearch(event.target.value)}
              placeholder="Search users"
              className="min-w-[220px] rounded-full border border-border bg-white px-4 py-2.5 text-sm text-text-primary outline-none focus:border-blue/30"
            />
            <button
              type="button"
              onClick={() => void fetchUsers()}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2.5 text-sm font-medium text-text-primary transition hover:border-blue/30 hover:text-blue cursor-pointer"
            >
              <RefreshCw className={`h-4 w-4 ${isLoadingUsers ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {filteredUsers.map((record) => {
            const isEditing = editingUserId === record.id;

            return (
              <div key={record.id} className="rounded-2xl border border-border bg-white px-4 py-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    {isEditing ? (
                      <div className="grid gap-3 md:grid-cols-3">
                        <input
                          type="text"
                          value={editingUserForm.name}
                          onChange={(event) => setEditingUserForm((previous) => ({ ...previous, name: event.target.value }))}
                          className="rounded-2xl border border-border bg-panel-muted px-4 py-3 text-sm text-text-primary outline-none focus:border-blue/30"
                        />
                        <input
                          type="email"
                          value={editingUserForm.email}
                          onChange={(event) => setEditingUserForm((previous) => ({ ...previous, email: event.target.value }))}
                          className="rounded-2xl border border-border bg-panel-muted px-4 py-3 text-sm text-text-primary outline-none focus:border-blue/30"
                        />
                        <select
                          value={editingUserForm.role}
                          onChange={(event) => setEditingUserForm((previous) => ({ ...previous, role: event.target.value }))}
                          className="rounded-2xl border border-border bg-panel-muted px-4 py-3 text-sm text-text-primary outline-none focus:border-blue/30"
                        >
                          <option value="member">Member</option>
                          <option value="manager">Manager</option>
                          <option value="admin">Admin</option>
                          <option value="super_admin">Super admin</option>
                        </select>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold text-text-primary">{record.name}</h3>
                          <span className="rounded-full bg-panel-muted px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-text-secondary">
                            {record.role}
                          </span>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
                              record.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                            }`}
                          >
                            {record.status}
                          </span>
                          {record.mustChangePassword ? (
                            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">
                              Must change password
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-2 text-sm text-text-secondary">{record.email}</p>
                        <div className="mt-2 flex flex-wrap gap-3 text-sm text-text-secondary">
                          {record.department ? <span>{record.department}</span> : null}
                          {record.title ? <span>{record.title}</span> : null}
                          {record.lastActive ? (
                            <span>Last active {formatDistanceToNow(new Date(record.lastActive), { addSuffix: true })}</span>
                          ) : null}
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          onClick={() => void handleSaveUser(record.id)}
                          className="rounded-full bg-blue px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-dark cursor-pointer"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingUserId(null);
                            setEditingUserForm(defaultUserForm);
                          }}
                          className="rounded-full border border-border bg-white px-4 py-2 text-sm font-medium text-text-secondary transition hover:text-text-primary cursor-pointer"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingUserId(record.id);
                            setEditingUserForm({
                              name: record.name,
                              email: record.email,
                              role: record.role,
                            });
                          }}
                          className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-sm font-medium text-text-primary transition hover:border-blue/30 hover:text-blue cursor-pointer"
                        >
                          <UserCog className="h-4 w-4" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleUserAction(record.id, record.isActive ? 'disable' : 'reactivate')}
                          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition cursor-pointer ${
                            record.isActive
                              ? 'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                              : 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          }`}
                        >
                          {record.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                          {record.isActive ? 'Disable' : 'Reactivate'}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleUserAction(record.id, 'reset-sessions')}
                          className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-sm font-medium text-text-primary transition hover:border-blue/30 hover:text-blue cursor-pointer"
                        >
                          <RotateCcw className="h-4 w-4" />
                          Reset sessions
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {filteredUsers.length === 0 && !isLoadingUsers ? (
            <div className="rounded-2xl border border-dashed border-border bg-white/70 px-4 py-5 text-sm text-text-secondary">
              No users matched your current search.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default AdminUsersPanel;
