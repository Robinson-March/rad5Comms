// components/aside/Aside.tsx
import { useState } from 'react';
import '../../App.css';
import {
  MessageSquare,
  Archive,
  Star,
  Users,
  Plus,
  Hash,
  AtSign,
  Moon,
  Search,           // ← added for search icon
} from 'lucide-react';

const Aside = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'archived' | 'starred'>('all');

  return (
    <div className="h-screen w-[280px] min-w-[260px] bg-sidebar text-sidebar-text overflow-y-auto flex flex-col scroll">
      {/* Header / Workspace name + Search icon */}
      <div className="p-4 pb-2 border-b border-white/10 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Your Workspace</h1>
          <p className="text-sm opacity-70 mt-1">@wisdom • Admin</p>
        </div>
        <button className="p-2 rounded-full hover:bg-white/10 transition cursor-pointer">
          <Search className="w-5 h-5 opacity-80" />
        </button>
      </div>

      {/* Tabs: All Conversations | Archived | Starred */}
      <div className="flex border-b border-white/10 mt-2">
        <button
          onClick={() => setActiveTab('all')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 cursor-pointer text-xs font-medium transition-colors ${
            activeTab === 'all'
              ? 'text-white border-b-2 border-blue'
              : 'text-sidebar-text/70 hover:text-white'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          All
        </button>
        <button
          onClick={() => setActiveTab('archived')}
          className={`flex-1 flex items-center justify-center cursor-pointer gap-1.5 py-2 text-xs font-medium transition-colors ${
            activeTab === 'archived'
              ? 'text-white border-b-2 border-blue'
              : 'text-sidebar-text/70 hover:text-white'
          }`}
        >
          <Archive className="w-4 h-4" />
          Archived
        </button>
        <button
          onClick={() => setActiveTab('starred')}
          className={`flex-1 flex items-center justify-center gap-1.5 cursor-pointer py-2 text-xs font-medium transition-colors ${
            activeTab === 'starred'
              ? 'text-white border-b-2 border-blue'
              : 'text-sidebar-text/70 hover:text-white'
          }`}
        >
          <Star className="w-4 h-4" />
          Starred
        </button>
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scroll">
        {/* TEAM section – shorter */}
        <div>
          <div className="flex items-center justify-between mb-2 px-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide opacity-80 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              TEAM
            </h2>
            <button className="text-white/60 hover:text-white cursor-pointer">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-0.5">
            <button className="w-full text-left px-3 py-1.5 rounded-md hover:bg-white/10 transition flex items-center gap-2.5 cursor-pointer">
              <Hash className="w-4 h-4 opacity-80" />
              announcements
            </button>
            <button className="w-full text-left px-3 py-1.5 rounded-md bg-blue/20 text-white font-medium flex items-center gap-2.5 cursor-pointer">
              <Hash className="w-4 h-4" />
              project-x
              <span className="ml-auto text-xs bg-light-red text-white px-1.5 rounded-full cursor-pointer">2</span>
            </button>
            <button className="w-full text-left px-3 py-1.5 rounded-md hover:bg-white/10 transition flex items-center gap-2.5 cursor-pointer">
              <Hash className="w-4 h-4 opacity-80" />
              dev-team
            </button>
          </div>
        </div>

        {/* PERSONAL / DMs section – longer with real avatar images */}
        <div>
          <div className="flex items-center justify-between mb-2 px-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide opacity-80 flex items-center gap-1.5">
              <AtSign className="w-3.5 h-3.5" />
              PERSONAL
            </h2>
            <button className="text-white/60 hover:text-white cursor-pointer">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-0.5">
            <button className="w-full text-left px-3 py-1.5 rounded-md hover:bg-white/10 transition flex items-center gap-2.5 cursor-pointer">
              <img
                src="https://images.pexels.com/photos/10376237/pexels-photo-10376237.jpeg"
                alt="Pia Stebe"
                className="w-6 h-6 rounded-full object-cover shrink-0"
              />
              Pia Stebe
              <span className="ml-auto text-xs bg-light-red text-white px-1.5 rounded-full">1</span>
            </button>
            <button className="w-full text-left px-3 py-1.5 rounded-md bg-blue text-white font-medium flex items-center gap-2.5 cursor-pointer">
              <img
                src="https://images.pexels.com/photos/7821936/pexels-photo-7821936.jpeg"
                alt="Sara-O"
                className="w-6 h-6 rounded-full object-cover shrink-0"
              />
              Sara-O
            </button>
            <button className="w-full text-left px-3 py-1.5 rounded-md hover:bg-white/10 transition flex items-center gap-2.5 cursor-pointer">
              <img
                src="https://p3.hippopx.com/preview/102/944/business-man-smiling-corporate-success-work-confident-professional-manager-executive.jpg"
                alt="Sergey Horobachev"
                className="w-6 h-6 rounded-full object-cover shrink-0"
              />
              Sergey Horobachev
            </button>
            <button className="w-full text-left px-3 py-1.5 rounded-md hover:bg-white/10 transition flex items-center gap-2.5 cursor-pointer">
              <img
                src="https://media.easy-peasy.ai/27feb2bb-aeb4-4a83-9fb6-8f3f2a15885e/bc8437e3-e360-4d83-869d-ba98c4df2edc.jpg"
                alt="Taryn Etienne"
                className="w-6 h-6 rounded-full object-cover shrink-0"
              />
              Taryn Etienne
            </button>
            <button className="w-full text-left px-3 py-1.5 rounded-md hover:bg-white/10 transition flex items-center gap-2.5 cursor-pointer">
              <img
                src="https://p1.hippopx.com/preview/475/75/706/suit-sufi-blue-business.jpg"
                alt="Spavee"
                className="w-6 h-6 rounded-full object-cover shrink-0"
              />
              Spavee
            </button>
            <button className="w-full text-left px-3 py-1.5 rounded-md hover:bg-white/10 transition flex items-center gap-2.5 opacity-70 cursor-pointer">
              <img
                src="https://p0.piqsels.com/preview/42/142/377/fashion-men-shopify-glasses.jpg"
                alt="David Kovac"
                className="w-6 h-6 rounded-full object-cover shrink-0"
              />
              David Kovac
              <span className="ml-auto text-xs opacity-60">14h</span>
            </button>
            <button className="w-full text-left px-3 py-1.5 rounded-md hover:bg-white/10 transition flex items-center gap-2.5 opacity-70 cursor-pointer">
              <img
                src="https://images.pexels.com/photos/7821936/pexels-photo-7821936.jpeg"
                alt="Paul Horobachev"
                className="w-6 h-6 rounded-full object-cover shrink-0"
              />
              Paul Horobachev
            </button>
            <button className="w-full text-left px-3 py-1.5 rounded-md hover:bg-white/10 transition flex items-center gap-2.5 opacity-70 cursor-pointer">
              <img
                src="https://media.easy-peasy.ai/27feb2bb-aeb4-4a83-9fb6-8f3f2a15885e/bc8437e3-e360-4d83-869d-ba98c4df2edc.jpg"
                alt="Olga"
                className="w-6 h-6 rounded-full object-cover shrink-0"
              />
              Olga
            </button>
          </div>
        </div>
      </div>

      {/* Bottom actions */}
      <div className="p-4 border-t border-white/10 flex gap-3">
        <button className="w-full py-2 bg-white/10 hover:bg-white/20 rounded-md text-sm font-medium transition flex items-center justify-center gap-2 cursor-pointer">
          <Plus className="w-4 h-4" />
          New Conversation
        </button>
        <button className="p-3 cursor-pointer bg-white/10 hover:bg-white/20 rounded-full text-sm transition flex items-center justify-center">
          <Moon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Aside;