// components/aside/AsideHeader.tsx
import { useState } from 'react';
import { Search } from 'lucide-react';
import Skeleton from 'react-loading-skeleton';
import ChatSearchModal from './ChatSearchModal';

interface AsideHeaderProps {
  isLoading: boolean;
  channels: Array<{ id: string; name: string; avatar?: string }>; // pass from Aside
  users: Array<{ id: string; name: string; avatar?: string }>;   // pass from Aside
  onSelectChat: (chatId: string, type: 'channel' | 'dm', name: string) => void;
}

const AsideHeader = ({ isLoading, channels, users, onSelectChat }: AsideHeaderProps) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <>
      <div className="p-4 pb-2 border-b border-white/10 flex items-center justify-between px-4">
        {isLoading ? (
          <>
            <div>
              <Skeleton width={160} height={28} baseColor="#1e40af" highlightColor="#3b82f6" />
              <Skeleton width={110} height={16} className="mt-1" baseColor="#1e40af" highlightColor="#3b82f6" />
            </div>
            <Skeleton circle width={32} height={32} baseColor="#1e40af" highlightColor="#3b82f6" />
          </>
        ) : (
          <>
            <div>
              <h1 className="text-xl font-bold">Rad5 Comms</h1>
              <p className="text-sm opacity-70 mt-1">Chats</p>
            </div>
            <button
              onClick={() => setIsSearchOpen(true)}
              className="p-2 rounded-full hover:bg-white/10 transition cursor-pointer"
            >
              <Search className="w-5 h-5 opacity-80" />
            </button>
          </>
        )}
      </div>

      {/* Search Modal */}
      <ChatSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        channels={channels}
        users={users}
        onSelectChat={onSelectChat}
      />
    </>
  );
};

export default AsideHeader;