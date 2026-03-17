// components/threadPane/MemberItem.tsx
import { MoreVertical } from 'lucide-react';

interface MemberItemProps {
  member: { id: string; name: string; avatar?: string; role?: string };
  isAdmin: boolean;
  canManageMembers?: boolean;
}

const MemberItem = ({ member, isAdmin, canManageMembers = true }: MemberItemProps) => {
  return (
    <div className="group flex items-center justify-between rounded-2xl bg-panel-muted px-3 py-3 transition hover:bg-panel-strong">
      <div className="flex items-center gap-3">
        {member.avatar ? (
          <img src={member.avatar} alt={member.name} className="h-11 w-11 rounded-2xl object-cover" />
        ) : (
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-sm font-semibold text-text-primary">
            {member.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <p className="text-sm font-semibold text-text-primary">{member.name}</p>
          <p className="mt-1 text-xs text-text-secondary">{member.role || 'Member'}</p>
        </div>
      </div>

      {isAdmin && canManageMembers && (
        <button className="flex h-9 w-9 items-center justify-center rounded-full text-text-secondary opacity-0 transition group-hover:opacity-100 hover:bg-white cursor-pointer">
          <MoreVertical className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

export default MemberItem;
