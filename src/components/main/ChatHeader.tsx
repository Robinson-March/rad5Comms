// components/main/ChatHeader.tsx
import { Bell, ChevronLeft, Hash, Info, Search } from 'lucide-react';
import type { SelectedChat } from '../../pages/HomePage';

interface ChatHeaderProps {
  selectedChat: SelectedChat | null;
  isThreadOpen: boolean;
  toggleThreadPane: () => void;
  onBack?: () => void;
  isOnline?: boolean;
}

const ChatHeader = ({ selectedChat, isThreadOpen, toggleThreadPane, onBack, isOnline }: ChatHeaderProps) => {
  if (!selectedChat) {
    return null;
  }

  const subtitle =
    selectedChat.type === 'channel'
      ? selectedChat.description || `${selectedChat.memberCount || 0} members coordinating`
      : 'Direct message';

  return (
    <div className="px-4 pb-3 pt-4 md:px-8 md:pb-4">
      <header className="animate-fade-up mx-auto flex w-full max-w-[1040px] items-center gap-3 rounded-[28px] border border-white/80 bg-white/90 px-4 py-3 shadow-[0_24px_50px_rgba(148,163,184,0.18)] backdrop-blur">
        {onBack && (
          <button
            onClick={onBack}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-panel-muted text-text-primary transition duration-300 hover:-translate-y-0.5 hover:border-blue/30 hover:text-blue cursor-pointer"
            type="button"
          >
            <ChevronLeft className="h-[18px] w-[18px]" />
          </button>
        )}

        <button
          onClick={toggleThreadPane}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-1 py-1 text-left transition duration-300 hover:bg-panel-muted cursor-pointer"
          type="button"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-soft text-blue">
            {selectedChat.type === 'channel' ? (
              <Hash className="h-5 w-5" />
            ) : selectedChat.avatar ? (
              <img src={selectedChat.avatar} alt={selectedChat.name} className="h-full w-full rounded-2xl object-cover" />
            ) : (
              <span className="text-sm font-semibold">{selectedChat.name.charAt(0).toUpperCase()}</span>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-lg font-semibold text-text-primary">{selectedChat.name}</h2>
              {selectedChat.type === 'dm' && isOnline ? <span className="h-2.5 w-2.5 rounded-full bg-success" /> : null}
            </div>
            <p className="truncate text-sm text-text-secondary">{subtitle}</p>
          </div>
        </button>

        <div className="hidden min-w-[240px] flex-1 items-center gap-3 rounded-full border border-border bg-panel-muted px-4 py-3 text-text-secondary lg:flex">
          <Search className="h-4 w-4" />
          <span className="truncate text-sm">
            Search in {selectedChat.type === 'channel' ? `#${selectedChat.name}` : selectedChat.name}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-panel text-text-secondary transition duration-300 hover:-translate-y-0.5 hover:border-blue/30 hover:text-blue cursor-pointer"
            type="button"
          >
            <Bell className="h-4 w-4" />
          </button>
          <button
            onClick={toggleThreadPane}
            className={`flex h-11 w-11 items-center justify-center rounded-full border transition duration-300 cursor-pointer ${
              isThreadOpen
                ? 'border-blue/30 bg-blue-soft text-blue'
                : 'border-border bg-panel text-text-secondary hover:-translate-y-0.5 hover:border-blue/30 hover:text-blue'
            }`}
            type="button"
          >
            <Info className="h-4 w-4" />
          </button>
        </div>
      </header>
    </div>
  );
};

export default ChatHeader;

