// components/thread-pane/ThreadHeader.tsx
import { UserPlus } from 'lucide-react';

interface ThreadHeaderProps {
  chat: {
    id: string;
    name: string;
    description?: string;
    bio?: string;
    avatar?: string;
    memberCount?: number;       // only for groups/channels
    isGroup: boolean;           // true for channels/groups, false for DMs
  } | null;
}

const ThreadHeader = ({ chat }: ThreadHeaderProps) => {
  const middleText = chat.type === 'dm'? chat.bio: chat.description;

  if (!chat) {
    return (
      <div className="text-center space-y-4 py-8 text-gray-500">
        <p>No chat selected</p>
      </div>
    );
  }

  return (
    <div className="text-center space-y-5 px-6 py-2">
      {/* Avatar */}
      <div className="mx-auto w-28 h-28 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden border-4 border-white shadow-lg">
        {chat.avatar ? (
          <img
            src={chat.avatar}
            alt={chat.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-5xl font-bold text-gray-600">
            {chat.name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      {/* Name */}
      <h3 className="text-lg lg:text-2xl font-bold text-white">{chat.name}</h3>

      {/* Description / Bio */}
      <p className="text-sm text-gray-600 leading-relaxed max-w-md mx-auto">
        {middleText}
      </p>

      {/* Member count + Add button — only for groups/channels */}
      {chat.isGroup && (
        <div className="flex items-center justify-center gap-8 text-sm pt-2">
          <div className="text-center">
            <span className="block text-2xl font-bold text-white">
              {chat.memberCount ?? 0}
            </span>
            <span className="text-gray-600">members</span>
          </div>

          <button className="flex items-center gap-2 px-2 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition shadow-md text-xs">
            <UserPlus className="w-5 h-5" />
            Add members
          </button>
        </div>
      )}
    </div>
  );
};

export default ThreadHeader;