// components/main/ChatHeader.tsx
import { useEffect, useRef } from 'react';
import { Bell, ChevronDown, ChevronLeft, ChevronUp, Hash, Info, Search, X } from 'lucide-react';
import type { SelectedChat } from '../../pages/HomePage';

interface ChatHeaderProps {
  selectedChat: SelectedChat | null;
  isThreadOpen: boolean;
  toggleThreadPane: () => void;
  onBack?: () => void;
  isOnline?: boolean;
  isSearchOpen: boolean;
  searchValue: string;
  searchResultsCount: number;
  activeSearchIndex: number;
  onToggleSearch: () => void;
  onSearchChange: (value: string) => void;
  onPreviousSearchResult: () => void;
  onNextSearchResult: () => void;
  onClearSearch: () => void;
  onCloseSearch: () => void;
}

const ChatHeader = ({
  selectedChat,
  isThreadOpen,
  toggleThreadPane,
  onBack,
  isOnline,
  isSearchOpen,
  searchValue,
  searchResultsCount,
  activeSearchIndex,
  onToggleSearch,
  onSearchChange,
  onPreviousSearchResult,
  onNextSearchResult,
  onClearSearch,
  onCloseSearch,
}: ChatHeaderProps) => {
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSearchOpen) {
      searchInputRef.current?.focus();
    }
  }, [isSearchOpen]);

  if (!selectedChat) {
    return null;
  }

  const subtitle =
    selectedChat.type === 'channel'
      ? selectedChat.description || `${selectedChat.memberCount || 0} members coordinating`
      : 'Direct message';

  return (
    <div className="px-4 pb-3 pt-4 md:px-8 md:pb-4">
      <header className="animate-fade-up mx-auto flex w-full max-w-[1040px] flex-col gap-3 rounded-[28px] border border-white/80 bg-white/90 px-4 py-3 shadow-[0_24px_50px_rgba(148,163,184,0.18)] backdrop-blur">
        <div className="flex w-full items-center gap-3">
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

          <div className="flex items-center gap-2">
            <button
              onClick={onToggleSearch}
              className={`flex h-11 w-11 items-center justify-center rounded-full border transition duration-300 cursor-pointer ${
                isSearchOpen || searchValue.trim()
                  ? 'border-blue/30 bg-blue-soft text-blue'
                  : 'border-border bg-panel text-text-secondary hover:-translate-y-0.5 hover:border-blue/30 hover:text-blue'
              }`}
              type="button"
              aria-label={isSearchOpen ? 'Close search' : 'Open search'}
            >
              <Search className="h-4 w-4" />
            </button>
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
        </div>

        {isSearchOpen ? (
          <div className="flex w-full flex-wrap items-center gap-2 rounded-[22px] border border-blue/15 bg-panel-muted/90 px-3 py-2.5 text-text-secondary">
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-[18px] bg-white/90 px-3 py-2 shadow-sm">
              <Search className="h-4 w-4 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchValue}
                onChange={(event) => onSearchChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter') {
                    return;
                  }

                  event.preventDefault();
                  if (event.shiftKey) {
                    onPreviousSearchResult();
                    return;
                  }

                  onNextSearchResult();
                }}
                placeholder={`Search ${selectedChat.type === 'channel' ? `#${selectedChat.name}` : selectedChat.name}`}
                className="min-w-0 flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-secondary"
              />
            </div>

            {searchValue.trim() ? (
              <>
                <span className="shrink-0 rounded-full bg-white px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-secondary">
                  {searchResultsCount > 0 ? `${activeSearchIndex + 1} of ${searchResultsCount}` : 'No matches'}
                </span>
                <button
                  onClick={onPreviousSearchResult}
                  disabled={searchResultsCount === 0}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-white text-text-secondary transition hover:border-blue/30 hover:text-blue disabled:cursor-not-allowed disabled:opacity-45 cursor-pointer"
                  type="button"
                  aria-label="Previous search result"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  onClick={onNextSearchResult}
                  disabled={searchResultsCount === 0}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-white text-text-secondary transition hover:border-blue/30 hover:text-blue disabled:cursor-not-allowed disabled:opacity-45 cursor-pointer"
                  type="button"
                  aria-label="Next search result"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
                <button
                  onClick={onClearSearch}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-white text-text-secondary transition hover:border-blue/30 hover:text-blue cursor-pointer"
                  type="button"
                  aria-label="Clear search text"
                >
                  <X className="h-4 w-4" />
                </button>
              </>
            ) : null}

            <button
              onClick={onCloseSearch}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-white text-text-secondary transition hover:border-blue/30 hover:text-blue cursor-pointer"
              type="button"
              aria-label="Close search"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </header>
    </div>
  );
};

export default ChatHeader;

