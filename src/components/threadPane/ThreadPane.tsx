// components/threadPane/ThreadPane.tsx
import { ChevronLeft } from 'lucide-react';
import ThreadHeader from './ThreadHeader';
import MediaSection from './MediaSection';
import MembersSection from './MembersSection';
import ActionsSection from './ActionsSection';
import type { SelectedChat } from '../../pages/HomePage';

interface ThreadPaneProps {
  isOpen: boolean;
  onToggle?: () => void;
  onBack?: () => void;
  selectedChat?: SelectedChat | null;
}

const ThreadPane = ({ isOpen, onBack, onToggle, selectedChat }: ThreadPaneProps) => {
  if (!isOpen) {
    return null;
  }

  if (!selectedChat) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center text-text-secondary">
        <div>
          <p className="text-lg font-semibold text-text-primary">No chat selected</p>
          <p className="mt-2 text-sm">Select a conversation to view members, media, and actions.</p>
        </div>
      </div>
    );
  }

  const isGroup = selectedChat.type === 'channel';
  const isAdminManagedChannel = Boolean(
    isGroup &&
      (selectedChat.isSystem || selectedChat.isDefault || selectedChat.membershipPolicy === 'admin_managed')
  );

  const handleActionSuccess = () => {
    onToggle?.();
    window.dispatchEvent(new CustomEvent('chat-action-success', { detail: { chatId: selectedChat.id } }));
  };

  return (
    <aside className="flex h-full min-h-0 flex-col bg-panel-muted/95">
      <div className="flex items-center gap-2 border-b border-border/80 px-4 py-4 lg:hidden">
        {onBack && (
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-sm font-medium text-text-primary transition hover:border-blue/30 hover:text-blue cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>
        )}
      </div>

      <div className="scroll flex-1 overflow-y-auto px-5 py-5">
        <div className="space-y-5">
          <div className="rounded-[30px] border border-white/80 bg-white p-5 shadow-[0_22px_45px_rgba(148,163,184,0.16)]">
            <ThreadHeader
              chat={{
                ...selectedChat,
                isGroup,
                isAdminManagedChannel,
              }}
            />
          </div>

          <div className="rounded-[30px] border border-white/80 bg-white p-5 shadow-[0_22px_45px_rgba(148,163,184,0.14)]">
            <MediaSection media={selectedChat.media || []} />
          </div>

          {isGroup && (
            <div className="rounded-[30px] border border-white/80 bg-white p-5 shadow-[0_22px_45px_rgba(148,163,184,0.14)]">
              <MembersSection
              members={selectedChat.members || []}
              isAdmin={selectedChat.isAdmin || false}
              isGroup={selectedChat.type === 'channel'}
              isAdminManagedChannel={isAdminManagedChannel}
            />
          </div>
        )}

          <div className="rounded-[30px] border border-white/80 bg-white p-5 shadow-[0_22px_45px_rgba(148,163,184,0.14)]">
            <ActionsSection
              isGroup={isGroup}
              chatId={selectedChat.id}
              isAdminManagedChannel={isAdminManagedChannel}
              onActionSuccess={handleActionSuccess}
            />
          </div>
        </div>
      </div>
    </aside>
  );
};

export default ThreadPane;

