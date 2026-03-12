// components/aside/AsideHeader.tsx
import { useMemo, useState } from 'react';
import { Search, Settings2 } from 'lucide-react';
import Skeleton from 'react-loading-skeleton';
import ChatSearchModal from './ChatSearchModal';

interface AsideHeaderProps {
  isLoading: boolean;
  channels: Array<{ id: string; name: string; avatar?: string }>;
  users: Array<{ id: string; name: string; avatar?: string; isOnline?: boolean }>;
  onSelectChat: (chatId: string, type: 'channel' | 'dm', name: string) => void;
  isConnected?: boolean;
  currentUserName?: string | null;
  currentUserAvatar?: string | null;
  onProfileOpen?: () => void;
}

const AsideHeader = ({
  isLoading,
  channels,
  users,
  onSelectChat,
  isConnected,
  currentUserName,
  currentUserAvatar,
  onProfileOpen,
}: AsideHeaderProps) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const activeMembers = users.filter((user) => user.isOnline).length;

  const displayName = useMemo(() => {
    const trimmed = currentUserName?.trim();
    if (!trimmed) {
      return 'Your workspace';
    }
    return trimmed;
  }, [currentUserName]);

  return (
    <>
      <div className="px-5 pb-4 pt-5">
        {isLoading ? (
          <div className="space-y-3 rounded-[28px] border border-white/70 bg-white px-4 py-4 shadow-[0_18px_40px_rgba(148,163,184,0.16)]">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <Skeleton circle width={52} height={52} baseColor="#dbeafe" highlightColor="#eff6ff" />
                <div>
                  <Skeleton width={150} height={22} baseColor="#dbeafe" highlightColor="#eff6ff" />
                  <Skeleton width={110} height={14} className="mt-2" baseColor="#dbeafe" highlightColor="#eff6ff" />
                </div>
              </div>
              <Skeleton width={48} height={48} borderRadius={999} baseColor="#dbeafe" highlightColor="#eff6ff" />
            </div>
            <div className="flex gap-2">
              <Skeleton width={96} height={34} borderRadius={999} baseColor="#dbeafe" highlightColor="#eff6ff" />
              <Skeleton width={116} height={34} borderRadius={999} baseColor="#dbeafe" highlightColor="#eff6ff" />
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <button
                onClick={onProfileOpen}
                className="animate-fade-up group flex min-w-0 flex-1 items-center gap-3 rounded-[24px] border border-white/80 bg-white/92 px-3.5 py-3.5 text-left shadow-[0_20px_42px_rgba(148,163,184,0.16)] transition duration-300 hover:-translate-y-0.5 hover:border-blue/20 hover:shadow-[0_24px_50px_rgba(37,99,235,0.16)] cursor-pointer"
                aria-label="Edit profile"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[18px] bg-gradient-to-br from-blue to-cyan-400 text-lg font-semibold text-white shadow-[0_16px_30px_rgba(37,99,235,0.24)]">
                  {currentUserAvatar ? (
                    <img src={currentUserAvatar} alt={displayName} className="h-full w-full object-cover" />
                  ) : (
                    displayName.charAt(0).toUpperCase()
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h1 className="truncate text-lg font-semibold text-text-primary">{displayName}</h1>
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${isConnected ? 'bg-success' : 'bg-border'}`} />
                  </div>
                  <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.24em] text-text-secondary/80">
                    Profile and workspace
                  </p>
                </div>

                <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-panel-muted text-text-secondary transition duration-300 group-hover:border-blue/30 group-hover:bg-blue-soft group-hover:text-blue sm:inline-flex">
                  <Settings2 className="h-4 w-4" />
                </span>
              </button>

              <button
                onClick={() => setIsSearchOpen(true)}
                className="animate-fade-up animate-delay-1 inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border bg-white/92 text-text-secondary shadow-[0_16px_34px_rgba(148,163,184,0.16)] transition duration-300 hover:-translate-y-0.5 hover:border-blue/30 hover:bg-blue-soft hover:text-blue cursor-pointer"
                aria-label="Search chats"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>

            <div className="animate-fade-up animate-delay-2 mt-3 flex flex-wrap gap-2 text-xs text-text-secondary">
              <div className="rounded-full border border-white/70 bg-white/78 px-3 py-2 shadow-sm">
                <span className="font-semibold text-text-primary">{activeMembers}</span> active now
              </div>
              <div className="rounded-full border border-white/70 bg-white/78 px-3 py-2 shadow-sm">
                <span className="font-semibold text-text-primary">{channels.length + users.length}</span> conversations
              </div>
            </div>
          </>
        )}
      </div>

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
