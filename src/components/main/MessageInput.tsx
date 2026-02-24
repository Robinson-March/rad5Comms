/* eslint-disable @typescript-eslint/no-explicit-any */
// components/main/MessageInput.tsx
import { useState, useRef, useEffect } from 'react';
import {
  Smile,
  Plus,
  Send,
  Paperclip,
  Mic,
  Image as ImageIcon,
  BarChart2,
} from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import axios from 'axios';
import { toast } from 'sonner';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface MessageInputProps {
  selectedChat: { id: string; type: 'channel' | 'dm'; name?: string } | null;
  onMessageSent?: (newMessage: any) => void;
  replyTarget?: {
    id: string;
    text: string;
    sender: { id: string; name: string };
  } | null;
  onCancelReply?: () => void;
  /** Emit typing indicator via socket */
  sendTyping?: (isTyping: boolean) => void;
}

const MessageInput = ({
  selectedChat,
  onMessageSent,
  replyTarget,
  onCancelReply,
  sendTyping,
}: MessageInputProps) => {
  const [message, setMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pickerRef = useRef<HTMLDivElement>(null);
  const plusMenuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close pickers on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
      if (plusMenuRef.current && !plusMenuRef.current.contains(event.target as Node)) {
        setShowPlusMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Placeholder handlers
  const handleAttachFile = () => console.log('Attach file');
  const handleVoiceNote = () => console.log('Voice note');
  const handleShareImage = () => console.log('Share image');
  const handleCreatePoll = () => console.log('Create poll');

  const handleSend = async () => {
    if (!message.trim() || !selectedChat || isSending) return;

    const textToSend = message;

    const optimisticMessage = {
      id: Date.now().toString(),
      sender: { id: 'me', name: 'You', avatar: null },
      text: textToSend,
      time: new Date().toISOString(),
      isOwn: true,
      ...(replyTarget && {
        replyTo: replyTarget.id,
        replyToText: replyTarget.text,
        replyToSender: replyTarget.sender.name,
      }),
    };

    // Optimistic UI: show message immediately
    onMessageSent?.(optimisticMessage);
    setMessage('');
    setIsSending(true);
    if (onCancelReply) onCancelReply();

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No token');

      let endpoint = '';
      if (selectedChat.type === 'channel') {
        endpoint = `/channels/${selectedChat.id}/messages`;
      } else {
        endpoint = `/dms/${selectedChat.id}/messages`;
      }

      // Just POST to REST — server broadcasts to socket room automatically
      await axios.post(
        `${API_BASE_URL}${endpoint}`,
        { text: textToSend, replyTo: replyTarget?.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // No client-side relay needed — server handles the broadcast
    } catch (err: any) {
      console.error('[MessageInput] Send error:', err);
      toast.error(err.response?.data?.error || 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
    if (selectedChat && sendTyping) {
      sendTyping(true);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        sendTyping(false);
      }, 1500);
    }
  };

  if (!selectedChat) return null;

  return (
    <div className="border-t border-border bg-gray-300 px-1 py-2 relative flex flex-col items-center justify-center">
      {replyTarget && (
        <div className="w-full px-3 mb-2">
          <div className="bg-white rounded-xl border border-border px-3 py-2 flex items-start justify-between">
            <div className="text-sm">
              <div className="font-semibold">{replyTarget.sender.name}</div>
              <div className="text-gray-600 truncate max-w-[70vw]">{replyTarget.text}</div>
            </div>
            <button
              onClick={onCancelReply}
              className="text-xs text-gray-500 hover:text-gray-700 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      <div className="h-12 flex items-center justify-between md:gap-2 bg-offwhite rounded-3xl px-1 lg:px-3 py-1 focus-within:ring-2 focus-within:ring-blue/30 w-full">
        <button
          className="p-1.5 hover:bg-white/50 rounded cursor-pointer flex items-start"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
        >
          <Smile className="w-3.5 h-3.5 lg:w-5 lg:h-5 text-text-secondary" />
        </button>

        <div className="relative flex items-center justify-center gap-1">
          <button
            className="p-1.5 hover:bg-white/50 rounded cursor-pointer flex items-start "
            onClick={() => setShowPlusMenu(!showPlusMenu)}
          >
            <Plus className="w-3.5 h-3.5 lg:w-5 lg:h-5 text-text-secondary" />
          </button>

          {showPlusMenu && (
            <div
              ref={plusMenuRef}
              className="absolute bottom-full left-0 mb-2 w-64 bg-white rounded-lg shadow-2xl border border-border py-2 z-50"
            >
              <button
                onClick={handleAttachFile}
                className="w-full text-left px-4 py-2.5 hover:bg-offwhite flex items-center gap-3 text-sm text-text-primary"
              >
                <Paperclip className="w-5 h-5 text-text-secondary" />
                Attach file
              </button>
              <button
                onClick={handleVoiceNote}
                className="w-full text-left px-4 py-2.5 hover:bg-offwhite flex items-center gap-3 text-sm text-text-primary"
              >
                <Mic className="w-5 h-5 text-text-secondary" />
                Voice note
              </button>
              <button
                onClick={handleShareImage}
                className="w-full text-left px-4 py-2.5 hover:bg-offwhite flex items-center gap-3 text-sm text-text-primary"
              >
                <ImageIcon className="w-5 h-5 text-text-secondary" />
                Share image
              </button>
              <button
                onClick={handleCreatePoll}
                className="w-full text-left px-4 py-2.5 hover:bg-offwhite flex items-center gap-3 text-sm text-text-primary"
              >
                <BarChart2 className="w-5 h-5 text-text-secondary" />
                Create poll
              </button>
            </div>
          )}
        </div>

        <input
          ref={inputRef}
          type="text"
          value={message}
          onChange={handleInputChange}
          placeholder="Type a message..."
          className="flex-1 bg-transparent outline-none text-text-primary placeholder:text-text-secondary px-1 md:px-3"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />

        <button
          onClick={handleSend}
          className={`p-1.5 rounded-full flex items-end border justify-end transition ${
            message.trim() && !isSending
              ? 'text-black hover:text-blue-600 cursor-pointer'
              : 'text-gray-400 cursor-not-allowed'
          }`}
          disabled={!message.trim() || isSending}
        >
          <Send className="w-4 h-4 md:w-5 md:h-5" />
        </button>
      </div>

      {showEmojiPicker && (
        <div ref={pickerRef} className="absolute bottom-16 left-4 z-50 shadow-xl">
          <EmojiPicker
            onEmojiClick={(emojiData) => {
              setMessage((prev) => prev + emojiData.emoji);
              setShowEmojiPicker(false);
              inputRef.current?.focus();
            }}
            width={300}
            height={390}
            previewConfig={{ showPreview: false }}
            lazyLoadEmojis={true}
          />
        </div>
      )}
    </div>
  );
};

export default MessageInput;
