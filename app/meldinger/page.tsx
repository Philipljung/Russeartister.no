"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase/client";

type ConversationRow = {
  orderId: string;
  gigTitle: string;
  status: string;
  otherParty: string;
  otherAvatar: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  isActive: boolean;
  unread: number;
};

const STATUS_LABEL: Record<string, string> = {
  pending_approval:   "Venter på godkjenning",
  approved:           "Godkjent — klar for betaling",
  in_progress:        "Pågår",
  delivered:          "Levert — venter på aksept",
  revision_requested: "Revisjon forespurt",
  completed:          "Fullført",
  rejected:           "Avslått",
  disputed:           "Tvist",
};

const STATUS_COLOR: Record<string, string> = {
  pending_approval:   "#ff9500",
  approved:           "#818cf8",
  in_progress:        "#34d399",
  delivered:          "#818cf8",
  revision_requested: "#ff9500",
  completed:          "#34d399",
  rejected:           "#ff453a",
  disputed:           "#ff453a",
};

const ACTIVE_STATUSES = ["pending_approval","approved","in_progress","delivered","revision_requested"];

export default function MeldingerPage() {
  const router = useRouter();
  const [rows, setRows] = useState<ConversationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabaseClient();
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/logg-inn"); return; }
      setUserId(session.user.id);

      const { data: orders } = await supabase
        .from("gig_orders")
        .select(`
          id, status, created_at,
          gigs(title),
          buyer:profiles!buyer_id(id, display_name, username, avatar_url),
          producer:profiles!producer_id(id, display_name, username, avatar_url),
          gig_messages(content, created_at, sender_id)
        `)
        .or(`buyer_id.eq.${session.user.id},producer_id.eq.${session.user.id}`)
        .order("created_at", { ascending: false });

      if (!orders) { setLoading(false); return; }

      const mapped: ConversationRow[] = orders.map((o: any) => {
        const isBuyer    = o.buyer?.id === session.user.id;
        const other      = isBuyer ? o.producer : o.buyer;
        const msgs       = (o.gig_messages ?? []).sort((a: any, b: any) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        const last       = msgs[0] ?? null;
        const unread     = msgs.filter((m: any) => m.sender_id !== session.user.id).length; // simplified
        return {
          orderId:       o.id,
          gigTitle:      o.gigs?.title ?? "Ukjent tjeneste",
          status:        o.status,
          otherParty:    other?.display_name ?? other?.username ?? "Ukjent",
          otherAvatar:   other?.avatar_url ?? null,
          lastMessage:   last?.content ?? null,
          lastMessageAt: last?.created_at ?? o.created_at,
          isActive:      ACTIVE_STATUSES.includes(o.status),
          unread:        0, // TODO: track properly with read receipts
        };
      });

      // Active orders first, then by last activity
      mapped.sort((a, b) => {
        if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
        return new Date(b.lastMessageAt ?? 0).getTime() - new Date(a.lastMessageAt ?? 0).getTime();
      });

      setRows(mapped);
      setLoading(false);
    })();
  }, []);

  function timeAgo(dateStr: string | null) {
    if (!dateStr) return "";
    const diff = Date.now() - new Date(dateStr).getTime();
    const min  = Math.floor(diff / 60000);
    if (min < 1)   return "Nå";
    if (min < 60)  return `${min}m`;
    const h = Math.floor(min / 60);
    if (h < 24)    return `${h}t`;
    const d = Math.floor(h / 24);
    if (d < 7)     return `${d}d`;
    return new Date(dateStr).toLocaleDateString("nb-NO", { day: "numeric", month: "short" });
  }

  if (loading) {
    return <div className="mx-auto max-w-2xl px-6 py-20 text-center"><p className="text-sm" style={{ color: "#3a3a3a" }}>Laster...</p></div>;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-xl font-semibold mb-6" style={{ color: "#f5f5f7" }}>Meldinger</h1>

      {rows.length === 0 ? (
        <div className="rounded-2xl p-10 text-center" style={{ background: "#0f0f0f", border: "1px solid #1e1e1e" }}>
          <p className="text-sm" style={{ color: "#86868b" }}>Ingen samtaler enda.</p>
          <Link href="/tjenester" className="mt-3 inline-block text-sm underline" style={{ color: "#818cf8" }}>
            Bla gjennom tjenester
          </Link>
        </div>
      ) : (
        <div className="flex flex-col divide-y" style={{ borderTop: "1px solid #1e1e1e", borderBottom: "1px solid #1e1e1e" }}>
          {rows.map((row) => (
            <Link key={row.orderId} href={`/meldinger/${row.orderId}`}
              className="flex items-center gap-4 py-4 transition-colors hover:bg-white/[0.02] px-2 -mx-2 rounded-xl">

              {/* Avatar */}
              <div className="shrink-0 rounded-full flex items-center justify-center text-sm font-bold relative"
                style={{
                  width: 44, height: 44,
                  background: row.otherAvatar ? `url(${row.otherAvatar}) center/cover` : "linear-gradient(135deg,#2a1a5e,#1a2a5e)",
                  backgroundImage: row.otherAvatar ? `url(${row.otherAvatar})` : undefined,
                  color: "rgba(255,255,255,0.6)",
                }}>
                {!row.otherAvatar && row.otherParty[0]?.toUpperCase()}
                {/* Active indicator */}
                {row.isActive && (
                  <div className="absolute -bottom-0.5 -right-0.5 rounded-full border-2"
                    style={{ width: 10, height: 10, background: STATUS_COLOR[row.status] ?? "#34d399", borderColor: "#080808" }} />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold truncate" style={{ color: "#f5f5f7" }}>{row.otherParty}</p>
                  <span className="shrink-0 text-xs" style={{ color: "#3a3a3a" }}>{timeAgo(row.lastMessageAt)}</span>
                </div>
                <p className="text-xs truncate mt-0.5" style={{ color: "#3a3a3a" }}>{row.gigTitle}</p>
                {row.lastMessage ? (
                  <p className="text-xs truncate mt-0.5" style={{ color: "#86868b" }}>{row.lastMessage}</p>
                ) : (
                  <p className="text-xs mt-0.5" style={{ color: STATUS_COLOR[row.status] ?? "#86868b" }}>
                    {STATUS_LABEL[row.status] ?? row.status}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
