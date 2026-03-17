import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { Building2, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { API_BASE_URL, type AuditItem, type OverviewCard, normalizeAuditItems, normalizeOverviewCards } from './shared';

interface AdminOverviewPanelProps {
  token: string;
}

const AdminOverviewPanel = ({ token }: AdminOverviewPanelProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [cards, setCards] = useState<OverviewCard[]>([]);
  const [auditItems, setAuditItems] = useState<AuditItem[]>([]);

  const fetchOverview = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await axios.get(`${API_BASE_URL}/admin/overview`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setCards(normalizeOverviewCards(response.data));
      setAuditItems(normalizeAuditItems(response.data));
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to load admin overview');
      }
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void fetchOverview();
  }, [fetchOverview]);

  return (
    <div className="mt-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">Dashboard</h2>
          <p className="mt-1 text-sm text-text-secondary">Live counts and recent administrative activity.</p>
        </div>

        <button
          type="button"
          onClick={() => void fetchOverview()}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-sm font-medium text-text-primary transition hover:border-blue/30 hover:text-blue cursor-pointer"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {(isLoading
          ? Array.from({ length: 4 }, (_, index) => ({
              id: `overview-skeleton-${index}`,
              label: '',
              value: '',
              helper: undefined,
            }))
          : cards
        ).map((card, index) => (
          <div key={card?.id || `overview-skeleton-${index}`} className="rounded-[28px] border border-border bg-panel-muted/70 p-5">
            {isLoading ? (
              <div className="space-y-3">
                <div className="h-4 w-24 rounded-full bg-slate-200" />
                <div className="h-8 w-20 rounded-full bg-slate-200" />
                <div className="h-3 w-32 rounded-full bg-slate-200" />
              </div>
            ) : (
              <>
                <div className="text-sm font-medium text-text-secondary">{card.label}</div>
                <div className="mt-3 text-3xl font-semibold text-text-primary">{card.value}</div>
                {card.helper ? <div className="mt-2 text-sm text-text-secondary">{card.helper}</div> : null}
              </>
            )}
          </div>
        ))}
      </div>

      <div className="rounded-[28px] border border-border bg-panel-muted/70 p-5">
        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-text-secondary">
          <Building2 className="h-4 w-4" />
          Recent audit activity
        </div>

        <div className="mt-4 space-y-3">
          {auditItems.length === 0 && !isLoading ? (
            <div className="rounded-2xl border border-dashed border-border bg-white/70 px-4 py-5 text-sm text-text-secondary">
              No recent audit entries were returned by the backend.
            </div>
          ) : null}

          {auditItems.map((item) => (
            <div key={item.id} className="rounded-2xl border border-border bg-white px-4 py-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="text-sm font-semibold text-text-primary">
                  {item.actor} <span className="font-normal text-text-secondary">{item.action.toLowerCase()}</span> {item.target}
                </div>
                <div className="text-xs font-medium uppercase tracking-[0.18em] text-text-secondary">
                  {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminOverviewPanel;
