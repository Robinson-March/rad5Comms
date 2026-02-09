// components/aside/ChatSearchModal.tsx
import { useState, useEffect } from 'react';
import { X, Hash, Search } from 'lucide-react';

interface ChatSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  channels: Array<{ id: string; name: string; avatar?: string }>;
  users: Array<{ id: string; name: string; avatar?: string }>;
  onSelectChat: (chatId: string, type: 'channel' | 'dm', name: string) => void;
}

const ChatSearchModal = ({
  isOpen,
  onClose,
  channels,
  users,
  onSelectChat,
}: ChatSearchModalProps) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Reset search when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const lowerTerm = searchTerm.toLowerCase().trim();

  const filteredChannels = channels.filter((ch) =>
    ch.name.toLowerCase().includes(lowerTerm)
  );

  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(lowerTerm)
  );

  const hasResults = filteredChannels.length > 0 || filteredUsers.length > 0;

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={onClose} // close on backdrop click
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()} // prevent close on content click
      >
        {/* Header */}
        <div className="p-5 border-b flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Search Chats</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-5">
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search channels or people..."
              className="w-full px-5 py-4 pl-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              autoFocus
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto px-5 pb-5">
          {searchTerm ? (
            <>
              {hasResults ? (
                <>
                  {/* Channels */}
                  {filteredChannels.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-sm font-semibold text-gray-600 mb-2">Channels</h3>
                      {filteredChannels.map((ch) => (
                        <button
                          key={ch.id}
                          onClick={() => {
                            onSelectChat(ch.id, 'channel', ch.name);
                            onClose();
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 rounded-xl transition"
                        >
                          <Hash className="w-6 h-6 text-gray-500" />
                          <span className="font-medium text-gray-900">{ch.name}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Users / DMs */}
                  {filteredUsers.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-600 mb-2">People</h3>
                      {filteredUsers.map((u) => (
                        <button
                          key={u.id}
                          onClick={() => {
                            onSelectChat(u.id, 'dm', u.name);
                            onClose();
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 rounded-xl transition"
                        >
                          {u.avatar ? (
                            <img
                              src={u.avatar}
                              alt={u.name}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium">
                              {u.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="font-medium text-gray-900">{u.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  No chats or channels found matching "{searchTerm}"
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-gray-500">
              Start typing to search your chats and channels
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatSearchModal;