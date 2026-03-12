// components/aside/AsideTabs.tsx
import { Archive, MessageSquare, Star } from 'lucide-react';
import Skeleton from 'react-loading-skeleton';

interface AsideTabsProps {
  activeTab: 'all' | 'archived' | 'starred';
  setActiveTab: (tab: 'all' | 'archived' | 'starred') => void;
  isLoading: boolean;
}

const tabs = [
  { id: 'all', label: 'All', icon: MessageSquare },
  { id: 'archived', label: 'Archived', icon: Archive },
  { id: 'starred', label: 'Starred', icon: Star },
] as const;

const AsideTabs = ({ activeTab, setActiveTab, isLoading }: AsideTabsProps) => {
  return (
    <div className="px-5 pb-3">
      <div className="grid grid-cols-3 gap-2 rounded-2xl bg-white/70 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
        {isLoading
          ? Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="flex items-center justify-center py-2">
                <Skeleton width={70} height={18} baseColor="#dbeafe" highlightColor="#eff6ff" />
              </div>
            ))
          : tabs.map(({ id, label, icon: Icon }) => {
              const isActive = activeTab === id;
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition cursor-pointer ${
                    isActive
                      ? 'bg-white text-text-primary shadow-[0_10px_24px_rgba(148,163,184,0.24)]'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              );
            })}
      </div>
    </div>
  );
};

export default AsideTabs;
