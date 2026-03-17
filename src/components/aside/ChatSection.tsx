/* eslint-disable @typescript-eslint/no-explicit-any */
// components/aside/ChatSection.tsx
import { Plus } from 'lucide-react';
import ChatItem from './ChatItem';

interface ChatSectionProps {
  title: string;
  icon: React.ReactNode;
  items: any[];
  type: 'channel' | 'dm';
  onSelectChat?: (chatId: string, type: 'channel' | 'dm', name?: string) => void;
  onPlusClick?: () => void;
  emptyMessage: string;
  activeTab: 'all' | 'archived' | 'starred';
  onActionSuccess?: (updatedItem: any) => void;
  selectedChatId?: string;
  selectedChatType?: 'channel' | 'dm';
}

const ChatSection = ({
  title,
  icon,
  items,
  type,
  onSelectChat,
  onPlusClick,
  emptyMessage,
  activeTab,
  onActionSuccess,
  selectedChatId,
  selectedChatType,
}: ChatSectionProps) => {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-text-secondary">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-blue shadow-sm">
            {icon}
          </span>
          {title}
        </div>

        {onPlusClick && (
          <button
            onClick={onPlusClick}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-white text-text-secondary transition duration-300 hover:-translate-y-0.5 hover:border-blue/30 hover:bg-blue-soft hover:text-blue cursor-pointer"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="relative space-y-2 overflow-visible">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-white/60 px-4 py-5 text-center text-sm text-text-secondary">
            {emptyMessage}
          </div>
        ) : (
          items.map((item, index) => (
            <ChatItem
              key={item.id}
              item={item}
              type={type}
              onSelectChat={onSelectChat}
              activeTab={activeTab}
              onActionSuccess={onActionSuccess}
              selectedChatId={selectedChatId}
              selectedChatType={selectedChatType}
              index={index}
            />
          ))
        )}
      </div>
    </section>
  );
};

export default ChatSection;

