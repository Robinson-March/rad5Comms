// components/main/Main.tsx
import { useState, useRef, useEffect } from 'react';
import '../../App.css';
import {
  Phone,
  Video,
  Settings,
  Smile,
  Plus,
  Send,
  ChevronDown,
  ChevronLeft,
  Paperclip,
  Mic,
  Image as ImageIcon,
  BarChart2,
} from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import SettingsModal from '../../pages/Settings'; 

interface MainProps {
  isThreadOpen: boolean;
  toggleThreadPane: () => void;
  onBack?: () => void;  
}

const Main = ({ isThreadOpen, toggleThreadPane, onBack }: MainProps) => {
  const [message, setMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showPlusMenu, setShowPlusMenu] = useState(false); // ← added

  const pickerRef = useRef<HTMLDivElement>(null);
  const plusMenuRef = useRef<HTMLDivElement>(null); // ← added
  const inputRef = useRef<HTMLInputElement>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Close both pickers/menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      // Close emoji picker
      if (pickerRef.current && !pickerRef.current.contains(target)) {
        setShowEmojiPicker(false);
      }

      // Close plus menu
      if (plusMenuRef.current && !plusMenuRef.current.contains(target)) {
        setShowPlusMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleEmojiClick = (emojiData: any) => {
    setMessage((prev) => prev + emojiData.emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  // Placeholder actions for Plus menu options (replace with real logic later)
  const handleAttachFile = () => {
    console.log('Open file picker / upload dialog');
    // In future: document.getElementById('file-input')?.click();
    setShowPlusMenu(false);
  };

  const handleVoiceNote = () => {
    console.log('Start voice note recording');
    // In future: navigator.mediaDevices.getUserMedia({ audio: true }) + MediaRecorder
    setShowPlusMenu(false);
  };

  const handleShareImage = () => {
    console.log('Open image picker / gallery');
    // In future: file input with accept="image/*"
    setShowPlusMenu(false);
  };

  const handleCreatePoll = () => {
    console.log('Open poll creation modal');
    // In future: show poll composer modal
    setShowPlusMenu(false);
  };

  // Dummy messages (unchanged)
  const messages = [
    {
      id: 1,
      sender: 'UI Art Design',
      text: 'by the readable content',
      time: '4:42 PM',
      isOwn: false,
      hasImage: true, // placeholder for images
    },
    {
      id: 1,
      sender: 'UI Art Design',
      text: 'by the readable content',
      time: '4:42 PM',
      isOwn: false,
      hasImage: true, // placeholder for images
    },
    {
      id: 1,
      sender: 'UI Art Design',
      text: 'by the readable content',
      time: '4:42 PM',
      isOwn: false,
      hasImage: true, // placeholder for images
    },
    {
      id: 1,
      sender: 'UI Art Design',
      text: 'by the readable content',
      time: '4:42 PM',
      isOwn: false,
      hasImage: true, // placeholder for images
    },
    {
      id: 1,
      sender: 'UI Art Design',
      text: 'by the readable content',
      time: '4:42 PM',
      isOwn: false,
      hasImage: true, // placeholder for images
    },
    {
      id: 1,
      sender: 'UI Art Design',
      text: 'by the readable content',
      time: '4:42 PM',
      isOwn: false,
      hasImage: true, // placeholder for images
    },
    {
      id: 1,
      sender: 'UI Art Design',
      text: 'by the readable content',
      time: '4:42 PM',
      isOwn: false,
      hasImage: true, // placeholder for images
    },
    {
      id: 1,
      sender: 'UI Art Design',
      text: 'by the readable content',
      time: '4:42 PM',
      isOwn: false,
      hasImage: true, // placeholder for images
    },
    {
      id: 1,
      sender: 'UI Art Design',
      text: 'by the readable content',
      time: '4:42 PM',
      isOwn: false,
      hasImage: true, // placeholder for images
    },
    {
      id: 1,
      sender: 'UI Art Design',
      text: 'by the readable content',
      time: '4:42 PM',
      isOwn: false,
      hasImage: true, // placeholder for images
    },
    {
      id: 1,
      sender: 'UI Art Design',
      text: 'by the readable content',
      time: '4:42 PM',
      isOwn: false,
      hasImage: true, // placeholder for images
    },
    {
      id: 1,
      sender: 'UI Art Design',
      text: 'by the readable content',
      time: '4:42 PM',
      isOwn: false,
      hasImage: true, // placeholder for images
    },
    {
      id: 1,
      sender: 'UI Art Design',
      text: 'by the readable content',
      time: '4:42 PM',
      isOwn: false,
      hasImage: true, // placeholder for images
    },
    {
      id: 1,
      sender: 'UI Art Design',
      text: 'by the readable content',
      time: '4:42 PM',
      isOwn: false,
      hasImage: true, // placeholder for images
    },
    {
      id: 1,
      sender: 'UI Art Design',
      text: 'by the readable content',
      time: '4:42 PM',
      isOwn: false,
      hasImage: true, // placeholder for images
    },
    {
      id: 1,
      sender: 'UI Art Design',
      text: 'by the readable content',
      time: '4:42 PM',
      isOwn: false,
      hasImage: true, // placeholder for images
    },
    {
      id: 1,
      sender: 'UI Art Design',
      text: 'by the readable content',
      time: '4:42 PM',
      isOwn: false,
      hasImage: true, // placeholder for images
    },
    {
      id: 2,
      sender: 'You',
      text: 'The point of using Lorem Ipsum',
      time: '4:45 PM',
      isOwn: true,
    },
    {
      id: 3,
      sender: 'Samuel Alex',
      text: 'There are many variations of passages of Lorem Ipsum available but the majority have suffered alteration 😄',
      time: '4:50 PM',
      isOwn: false,
      hasAudio: true,
      duration: '4:42',
    },
    {
      id: 4,
      sender: 'You',
      text: 'That sounds great 👍',
      time: '4:52 PM',
      isOwn: true,
    },
  ];

  const enrichedMessages = messages.map((msg, index) => ({
    ...msg,
    avatar: msg.isOwn
      ? null
      : [
          'https://images.pexels.com/photos/2379005/pexels-photo-2379005.jpeg',
          'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg',
          'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg',
          'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg',
          'https://images.pexels.com/photos/1043474/pexels-photo-1043474.jpeg',
        ][index % 5],
  }));

  return (
    <div className="h-screen flex-1 flex flex-col bg-offwhite font-poppins">
      {/* Header – unchanged */}
      <div className="flex items-center justify-center mb-2">
        <header className="h-14 bg-white flex items-center justify-between px-4 shadow-lg w-lg mt-2 rounded-3xl">
          {onBack && (
              <button onClick={onBack} className="p-2 -ml-2">
                <ChevronLeft className="w-6 h-6 text-text-primary" />
              </button>
            )}
          <div className="flex items-center gap-2 lg:gap-3 cursor-pointer " onClick={toggleThreadPane}>
            <h2 className="font-semibold text-text-primary">#ui-art-design</h2>
            <ChevronDown className={`w-4 h-4 text-text-secondary transition-transform duration-200 ${
                isThreadOpen ? 'rotate-180' : 'rotate-0'}`} />
          </div>

          <div className="flex items-center gap-1 lg:gap-2">
            <button className="p-2 rounded hover:bg-offwhite transition cursor-pointer">
              <Phone className="w-4 lg:w-5 h-4 lg:h-5 text-text-secondary" />
            </button>
            <button className="p-2 rounded hover:bg-offwhite transition cursor-pointer">
              <Video className="w-4 lg:w-5 h-4 lg:h-5 text-text-secondary" />
            </button>
            <button className="p-2 rounded hover:bg-offwhite transition cursor-pointer" onClick={() => setIsSettingsOpen(true)}>
              <Settings className="w-4 lg:w-5 h-4 lg:h-5 text-text-secondary" />
            </button>
          </div>
        </header>
      </div>

      {/* Messages Area – unchanged */}
      <div className="flex-1 overflow-y-scroll px-6 py-4 space-y-6 scroll">
        {enrichedMessages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${msg.isOwn ? 'justify-end' : 'justify-start'}`}
          >
            {!msg.isOwn && msg.avatar && (
              <img
                src={msg.avatar}
                alt={msg.sender}
                className="w-8 h-8 rounded-full object-cover shrink-0 mt-1"
              />
            )}

            <div className={`max-w-[70%] ${msg.isOwn ? 'items-end' : 'items-start'}`}>
              {!msg.isOwn && (
                <div className="text-xs text-text-secondary mb-1">{msg.sender}</div>
              )}

              <div
                className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  msg.isOwn
                    ? 'bg-blue text-white rounded-br-none'
                    : 'bg-white border border-border text-text-primary rounded-bl-none shadow-sm'
                }`}
              >
                {msg.text}

                {msg.hasImage && (
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    <div className="h-20 bg-gray-200 rounded" />
                    <div className="h-20 bg-gray-200 rounded" />
                    <div className="h-20 bg-gray-200 rounded" />
                  </div>
                )}

                {msg.hasAudio && (
                  <div className="mt-2 flex items-center gap-2 bg-black/5 px-3 py-1.5 rounded-full w-fit">
                    <div className="w-24 h-1 bg-blue/40 rounded-full relative">
                      <div className="absolute left-0 top-0 h-full w-1/2 bg-blue rounded-full" />
                    </div>
                    <span className="text-xs opacity-70">{msg.duration}</span>
                    <button className="p-1 rounded-full hover:bg-white/20">
                      <span className="text-xs">▶</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="text-xs text-text-secondary mt-1 opacity-70">
                {msg.time}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Input Bar */}
      <div className="border-t border-border bg-gray-300 px-4 py-2 relative flex flex-col items-center justify-center">
        <div className="h-12 flex items-center lg:gap-2 bg-offwhite rounded-3xl px-2 lg:px-3 py-1 focus-within:ring-2 focus-within:ring-blue/30 w-full">
          {/* Emoji button – unchanged */}
          <button
            className="p-1.5 hover:bg-white/50 rounded cursor-pointer"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          >
            <Smile className="w-4 lg:w-5 h-4 lg:h-5 text-text-secondary" />
          </button>

          {/* Plus button with menu – NEW FUNCTIONALITY */}
          <div className="relative">
            <button
              className="p-1.5 hover:bg-white/50 rounded cursor-pointer"
              onClick={() => setShowPlusMenu(!showPlusMenu)}
            >
              <Plus className="w-4 lg:w-5 h-4 lg:h-55 text-text-secondary" />
            </button>

            {showPlusMenu && (
              <div
                ref={plusMenuRef}
                className="absolute bottom-full left-0 mb-2 w-52 lg:w-64 bg-white rounded-lg shadow-2xl border border-border py-2 z-50"
              >
                <button
                  onClick={handleAttachFile}
                  className="w-full text-left px-4 py-2.5 hover:bg-offwhite flex items-center gap-3 text-sm text-text-primary"
                >
                  <Paperclip className="w-4 lg:w-5 h-4 lg:h-5 text-text-secondary" />
                  Attach file
                </button>

                <button
                  onClick={handleVoiceNote}
                  className="w-full text-left px-4 py-2.5 hover:bg-offwhite flex items-center gap-3 text-sm text-text-primary"
                >
                  <Mic className="w-4 lg:w-5 h-4 lg:h-5 text-text-secondary" />
                  Voice note
                </button>

                <button
                  onClick={handleShareImage}
                  className="w-full text-left px-4 py-2.5 hover:bg-offwhite flex items-center gap-3 text-sm text-text-primary"
                >
                  <ImageIcon className="w-4 lg:w-5 h-4 lg:h-5 text-text-secondary" />
                  Share image
                </button>

                <button
                  onClick={handleCreatePoll}
                  className="w-full text-left px-4 py-2.5 hover:bg-offwhite flex items-center gap-3 text-sm text-text-primary"
                >
                  <BarChart2 className="w-4 lg:w-5 h-4 lg:h-5 text-text-secondary" />
                  Create poll
                </button>
              </div>
            )}
          </div>

          {/* Text input – unchanged */}
          <input
            ref={inputRef}
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="What's on your mind..."
            className="flex-1 bg-transparent outline-none text-text-primary placeholder:text-text-secondary"
          />

          {/* Send button – unchanged */}
          <button
            className={`p-2 rounded-full transition ${
              message.trim()
                ? 'text-black hover:text-blue-dark cursor-pointer'
                : 'text-black cursor-not-allowed'
            }`}
            disabled={!message.trim()}
          >
            <Send className="w-4 lg:w-5 h-4 lg:h-5" />
          </button>
        </div>

        {/* Emoji Picker Popup – unchanged */}
        {showEmojiPicker && (
          <div
            ref={pickerRef}
            className="absolute bottom-16 left-0 z-50 shadow-xl"
          >
            <EmojiPicker
              onEmojiClick={handleEmojiClick}
              width={300}
              height={390}
            // theme=""
              previewConfig={{ showPreview: false }}
              lazyLoadEmojis={true}
              // skinTonePosition="none" // optional – hides skin tone selector
            />
          </div>
        )}
      </div>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
};

export default Main;