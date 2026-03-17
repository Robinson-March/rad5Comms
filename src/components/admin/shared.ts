export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export interface OverviewCard {
  id: string;
  label: string;
  value: string;
  helper?: string;
}

export interface AuditItem {
  id: string;
  actor: string;
  action: string;
  target: string;
  timestamp: string;
}

export interface AdminUserRecord {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  isActive: boolean;
  mustChangePassword: boolean;
  avatar?: string;
  department?: string;
  title?: string;
  lastActive?: string;
}

export interface TemporaryCredential {
  id: string;
  name: string;
  email: string;
  temporaryPassword: string;
}

export interface ChannelMemberRecord {
  id: string;
  name: string;
  email?: string;
  role: string;
  avatar?: string;
}

export interface AdminChannelRecord {
  id: string;
  name: string;
  description?: string;
  isDefault: boolean;
  isSystem: boolean;
  membershipPolicy?: string;
  memberCount: number;
  members: ChannelMemberRecord[];
}

export const defaultUserForm = {
  name: '',
  email: '',
  role: 'member',
};

export const defaultChannelForm = {
  name: '',
  description: '',
  isDefault: false,
  isSystem: false,
  membershipPolicy: 'open',
};

export const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const readString = (value: unknown) => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed || undefined;
};

export const readBoolean = (value: unknown) => (typeof value === 'boolean' ? value : undefined);

export const readArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const formatValue = (value: unknown) => {
  if (typeof value === 'number') {
    return value.toLocaleString();
  }

  if (typeof value === 'string' && value.trim()) {
    return value;
  }

  return '0';
};

export const extractRoot = (value: unknown): Record<string, unknown> => {
  if (!isObject(value)) {
    return {};
  }

  if (isObject(value.data)) {
    return value.data;
  }

  return value;
};

export const normalizeOverviewCards = (value: unknown): OverviewCard[] => {
  const root = extractRoot(value);
  const cards: OverviewCard[] = [];

  readArray(root.cards).forEach((item, index) => {
    if (!isObject(item)) {
      return;
    }

    cards.push({
      id: readString(item.id) || `card-${index}`,
      label: readString(item.label) || readString(item.title) || `Metric ${index + 1}`,
      value: formatValue(item.value ?? item.count ?? item.total),
      helper: readString(item.helper) || readString(item.description),
    });
  });

  if (cards.length > 0) {
    return cards;
  }

  const fallbackDefinitions = [
    { id: 'users', label: 'Users', keys: ['totalUsers', 'userCount', 'users'] },
    { id: 'channels', label: 'Channels', keys: ['totalChannels', 'channelCount', 'channels'] },
    { id: 'active', label: 'Active today', keys: ['activeUsers', 'activeToday', 'onlineUsers'] },
    { id: 'resets', label: 'Password resets', keys: ['passwordResets', 'resets', 'sessionResets'] },
  ];

  return fallbackDefinitions
    .map((definition) => {
      const rawValue = definition.keys
        .map((key) => root[key])
        .find((candidate) => typeof candidate === 'number' || typeof candidate === 'string');

      return {
        id: definition.id,
        label: definition.label,
        value: formatValue(rawValue),
      };
    })
    .filter((card) => card.value !== '0');
};

export const normalizeAuditItems = (value: unknown): AuditItem[] => {
  const root = extractRoot(value);
  const entries =
    readArray(root.recentAuditActivity).length > 0
      ? readArray(root.recentAuditActivity)
      : readArray(root.auditTrail).length > 0
        ? readArray(root.auditTrail)
        : readArray(root.audit).length > 0
          ? readArray(root.audit)
          : [];

  return entries
    .map((item, index) => {
      if (!isObject(item)) {
        return null;
      }

      const actorObject = isObject(item.actor) ? item.actor : null;
      const targetObject = isObject(item.target) ? item.target : null;
      const actor =
        readString(actorObject?.name) ||
        readString(actorObject?.email) ||
        readString(item.actorName) ||
        readString(item.actorEmail) ||
        'System';
      const target =
        readString(targetObject?.name) ||
        readString(targetObject?.email) ||
        readString(item.targetName) ||
        readString(item.targetEmail) ||
        readString(item.subject) ||
        'Workspace';
      const action = readString(item.action) || readString(item.event) || 'Updated';
      const timestamp = readString(item.createdAt) || readString(item.time) || new Date().toISOString();

      return {
        id: readString(item.id) || `audit-${index}`,
        actor,
        action,
        target,
        timestamp,
      } satisfies AuditItem;
    })
    .filter((item): item is AuditItem => Boolean(item));
};

export const normalizeAdminUser = (value: unknown): AdminUserRecord | null => {
  if (!isObject(value)) {
    return null;
  }

  const id = readString(value.id);
  if (!id) {
    return null;
  }

  const role = readString(value.role) || 'member';
  const status = readString(value.status) || (readBoolean(value.isActive) === false ? 'disabled' : 'active');
  const isActive =
    readBoolean(value.isActive) ??
    !['disabled', 'inactive', 'deactivated'].includes(status.toLowerCase());

  return {
    id,
    name: readString(value.name) || 'Unnamed user',
    email: readString(value.email) || '',
    role,
    status,
    isActive,
    mustChangePassword: readBoolean(value.mustChangePassword) || false,
    avatar: readString(value.avatar),
    department: readString(value.department),
    title: readString(value.title),
    lastActive: readString(value.lastActive) || readString(value.updatedAt),
  };
};

export const normalizeTemporaryCredentials = (value: unknown): TemporaryCredential[] => {
  const root = extractRoot(value);
  const listCandidates = [root.createdUsers, root.importedUsers, root.users, root.results, root.credentials];

  const credentialLists = listCandidates.flatMap((candidate) =>
    readArray(candidate).map((item) => {
      if (!isObject(item)) {
        return null;
      }

      const temporaryPassword =
        readString(item.temporaryPassword) ||
        readString(item.tempPassword) ||
        readString(item.password);
      const id = readString(item.id);

      if (!temporaryPassword || !id) {
        return null;
      }

      return {
        id,
        name: readString(item.name) || 'New user',
        email: readString(item.email) || '',
        temporaryPassword,
      } satisfies TemporaryCredential;
    })
  );

  const directUser = isObject(root.user) ? root.user : null;
  const directPassword =
    readString(root.temporaryPassword) ||
    readString(root.tempPassword) ||
    readString(directUser?.temporaryPassword) ||
    readString(directUser?.tempPassword);

  if (directUser && directPassword && readString(directUser.id)) {
    credentialLists.unshift({
      id: readString(directUser.id) || 'direct-user',
      name: readString(directUser.name) || 'New user',
      email: readString(directUser.email) || '',
      temporaryPassword: directPassword,
    });
  }

  return credentialLists.filter((credential): credential is TemporaryCredential => Boolean(credential));
};

export const normalizeChannelMember = (value: unknown): ChannelMemberRecord | null => {
  if (!isObject(value)) {
    return null;
  }

  const id = readString(value.id);
  if (!id) {
    return null;
  }

  const membership = isObject(value.ChannelMember) ? value.ChannelMember : null;

  return {
    id,
    name: readString(value.name) || 'Member',
    email: readString(value.email),
    role: readString(membership?.role) || readString(value.role) || 'member',
    avatar: readString(value.avatar),
  };
};

export const normalizeChannel = (value: unknown): AdminChannelRecord | null => {
  if (!isObject(value)) {
    return null;
  }

  const id = readString(value.id);
  if (!id) {
    return null;
  }

  const members = readArray(value.members)
    .map(normalizeChannelMember)
    .filter((member): member is ChannelMemberRecord => Boolean(member));

  return {
    id,
    name: readString(value.name) || 'Unnamed channel',
    description: readString(value.description),
    isDefault: readBoolean(value.isDefault) || false,
    isSystem: readBoolean(value.isSystem) || false,
    membershipPolicy: readString(value.membershipPolicy),
    memberCount:
      (typeof value.memberCount === 'number' ? value.memberCount : undefined) ||
      (typeof value.memberTotal === 'number' ? value.memberTotal : undefined) ||
      members.length,
    members,
  };
};
