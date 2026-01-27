// components/thread-pane/ThreadPane.tsx
import {
  Bell,    // for close button when open  // for open button when closed (in parent, but we can simulate)
  Users,
  Image as ImageIcon,
  FileText,
  // X,
  ChevronLeft
} from 'lucide-react';

interface ThreadPaneProps {
  isGroup?: boolean;          // true = group chat, false = 1:1 DM
  isOpen?: boolean;           // controlled from parent (App.tsx)
  onToggle?: () => void;      // callback to toggle open/close
  onBack?: () => void;
}

const ThreadPane = ({
  isGroup = true,             // default to group for demo
  isOpen = true,
  // onToggle,
  onBack
}: ThreadPaneProps) => {
  const mainUser = {
    name: 'Nasir Uddin',
    role: 'UI Designer',
    avatar: 'https://images.pexels.com/photos/2379005/pexels-photo-2379005.jpeg',
  };

  const members = [
    { name: 'Mahmud', avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg' },
    { name: 'Aisha', avatar: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg' },
    { name: 'Tunde', avatar: 'https://images.pexels.com/photos/1043474/pexels-photo-1043474.jpeg' },
    { name: 'Fatima', avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg' },
  ];

  const photos = [
    'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg',
    'https://images.pexels.com/photos/3184296/pexels-photo-3184296.jpeg',
    'https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg',
    'https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg',
  ];

  const attachments = [
    { name: 'Competitor Analysis Template.pdf', type: 'pdf' },
    { name: 'How to Create a Case Study.docx', type: 'doc' },
    { name: 'Project Documents.zip', type: 'zip' },
  ];

  if (!isOpen) {
    return null; // or return a thin bar with open button – see note below
  }

  return (
    <div
      className={`
        h-screen sm:w-auto lg:w-[320px] min-w-[300px] bg-light-red-soft border-l border-border 
        overflow-y-auto flex flex-col transition-all duration-300 ease-in-out font-poppins
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
      `}
    >
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between sticky top-0 bg-white z-20">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="p-2 -ml-2">
              <ChevronLeft className="w-6 h-6 text-text-secondary" />
            </button>
            )}
          <div className="relative">
            <Bell className="w-5 h-5 text-text-secondary hover:text-text-primary cursor-pointer" />
            {/* Optional: red dot for unread notifications */}
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-light-red rounded-full"></span>
          </div>
          <div className="flex items-center gap-3">
            <img
              src={mainUser.avatar}
              alt={mainUser.name}
              className="w-10 h-10 rounded-full object-cover"
            />
            <div>
              <h3 className="font-semibold text-text-primary">{mainUser.name}</h3>
              {isGroup && <p className="text-xs text-text-secondary">{mainUser.role}</p>}
            </div>
          </div>
        </div>

        {/* <div className="flex items-center gap-2">
          <button
            onClick={onToggle}
            className="p-2 rounded hover:bg-offwhite transition cursor-pointer"
          >
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div> */}
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-6 space-y-8">
        {/* Group Members (only for groups) */}
        {isGroup && (
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wide text-text-secondary mb-4 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Group Members
            </h4>
            <div className="relative flex justify-center mb-6">
              {/* Central large avatar */}
              <img
                src={mainUser.avatar}
                alt={mainUser.name}
                className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md z-10"
              />
              {/* Surrounding small avatars */}
              <div className="absolute inset-0 flex justify-center items-center -rotate-12">
                {members.slice(0, 4).map((member, i) => (
                  <img
                    key={i}
                    src={member.avatar}
                    alt={member.name}
                    className={`w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm absolute transform ${
                      i === 0 ? '-translate-x-10' :
                      i === 1 ? 'translate-x-10' :
                      i === 2 ? '-translate-y-10' : 'translate-y-10'
                    }`}
                    style={{ transform: `rotate(${i * 90}deg)` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Photos & Multimedia */}
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wide text-text-secondary mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              PHOTOS & MULTIMEDIA
            </div>
            <button className="text-blue hover:underline text-xs">View All</button>
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {photos.map((src, i) => (
              <img
                key={i}
                src={src}
                alt={`Media ${i + 1}`}
                className="w-full h-24 object-cover rounded-lg cursor-pointer hover:opacity-90 transition"
              />
            ))}
          </div>
        </div>

        {/* Attachments */}
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wide text-text-secondary mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              ATTACHMENTS
            </div>
            <button className="text-blue hover:underline text-xs">View All</button>
          </h4>
          <div className="space-y-3">
            {attachments.map((att, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 bg-offwhite rounded-lg hover:bg-gray-100 transition cursor-pointer"
              >
                <div className="w-10 h-10 bg-blue/10 rounded flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue" />
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">{att.name}</p>
                  <p className="text-xs text-text-secondary">Shared 2 days ago</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThreadPane;