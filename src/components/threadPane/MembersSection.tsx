// components/thread-pane/MembersSection.tsx
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
  isGroup: boolean; // new prop to hide for DMs
}

const MembersSection = ({ members, isAdmin, isGroup }: MembersSectionProps) => {
  // Hide entire section for personal chats (DMs)
  if (!isGroup) return null;

  const displayedMembers = members.slice(0, 10);
  const totalMembers = members.length;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-200 flex items-center gap-2">
          <Users className="w-4 h-4" />
          Members ({totalMembers})
        </h4>
        {totalMembers > 10 && (
          <button className="text-blue hover:underline text-xs">See all</button>
        )}
      </div>

      <div className="space-y-3">
        {displayedMembers.map((member) => (
          <MemberItem
            key={member.id}
            member={member}
            isAdmin={isAdmin}
          />
        ))}

        {totalMembers === 0 && (
          <div className="text-center py-2 text-gray-500">
            No members yet
          </div>
        )}
      </div>
    </div>
  );
};

export default MembersSection;