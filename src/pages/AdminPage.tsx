import { Link } from 'react-router-dom';
import { Hash, RotateCcw, Shield, Users } from 'lucide-react';
import { useState } from 'react';
import AdminOverviewPanel from '../components/admin/AdminOverviewPanel';
import AdminUsersPanel from '../components/admin/AdminUsersPanel';
import AdminChannelsPanel from '../components/admin/AdminChannelsPanel';
import { useAuthSession } from '../context/AuthSessionContext';

type AdminTab = 'overview' | 'users' | 'channels';

const AdminPage = () => {
  const { token, user } = useAuthSession();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  if (!token) {
    return null;
  }

  return (
    <div className="ambient-grid min-h-screen bg-panel-muted/60 p-4 md:p-6">
      <div className="mx-auto max-w-[1400px]">
        <div className="rounded-[32px] border border-white/80 bg-white/90 p-5 shadow-[0_28px_70px_rgba(15,23,42,0.12)] backdrop-blur md:p-6">
          <div className="flex flex-col gap-4 border-b border-border/80 pb-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex rounded-full bg-blue-soft px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-blue">
                Admin workspace
              </div>
              <h1 className="mt-4 text-3xl font-semibold text-text-primary">Control center</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
                Manage workspace access, forced-membership channels, and audit visibility from one internal admin area.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-full border border-border bg-panel-muted px-4 py-2 text-sm text-text-secondary">
                Signed in as <span className="font-semibold text-text-primary">{user?.name || 'Admin'}</span>
              </div>
              <Link
                to="/home"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-sm font-medium text-text-primary transition hover:border-blue/30 hover:text-blue"
              >
                <RotateCcw className="h-4 w-4" />
                Back to chat
              </Link>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {([
              { id: 'overview', label: 'Overview', icon: Shield },
              { id: 'users', label: 'Users', icon: Users },
              { id: 'channels', label: 'Channels', icon: Hash },
            ] as Array<{ id: AdminTab; label: string; icon: typeof Shield }>).map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition cursor-pointer ${
                    isActive ? 'bg-blue text-white shadow-sm' : 'bg-panel-muted text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {activeTab === 'overview' ? <AdminOverviewPanel key="overview" token={token} /> : null}
          {activeTab === 'users' ? <AdminUsersPanel key="users" token={token} /> : null}
          {activeTab === 'channels' ? <AdminChannelsPanel key="channels" token={token} /> : null}
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
