// components/threadPane/MembersSection.tsx
import { Users } from 'lucide-react';
import MemberItem from './MemberItem';

interface MembersSectionProps {
  members: Array<{
    id: string;
    name: string;
    avatar?: string;
    role?: string;
  }>;
  isAdmin: boolean;
  isGroup: boolean;
  isAdminManagedChannel?: boolean;
}

const MembersSection = ({ members, isAdmin, isGroup, isAdminManagedChannel = false }: MembersSectionProps) => {
  if (!isGroup) {
    return null;
  }

  const displayedMembers = members.slice(0, 10);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h4 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-text-secondary">
          <Users className="h-4 w-4" />
          Members ({members.length})
        </h4>
        {members.length > 10 && <button className="text-xs font-medium text-blue cursor-pointer">See all</button>}
      </div>

      <div className="space-y-3">
        {displayedMembers.map((member) => (
          <MemberItem key={member.id} member={member} isAdmin={isAdmin} canManageMembers={!isAdminManagedChannel} />
        ))}

        {members.length === 0 && (
          <div className="rounded-2xl bg-panel-muted px-4 py-5 text-center text-sm text-text-secondary">No members yet</div>
        )}

        {isAdminManagedChannel ? (
          <div className="rounded-2xl bg-panel-muted px-4 py-4 text-sm leading-6 text-text-secondary">
            Member removal for this channel is handled from the admin area.
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default MembersSection;
