"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Paperclip, Send, Download, CheckCircle, RefreshCw, X, AlertTriangle, Clock } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useToast } from "@/lib/toast-context";

type OrderStatus = "pending_approval"|"approved"|"in_progress"|"delivered"|"revision_requested"|"completed"|"rejected"|"disputed";

type Order = {
  id: string;
  status: OrderStatus;
  gig_id: string;
  gig_title: string;
  buyer_id: string;
  buyer_name: string;
  producer_id: string;
  producer_name: string;
  price: number;
  artist_payout: number;
  package_label: string;
  delivery_days: number;
  revisions_max: number;
  revisions_used: number;
  requirements: string | null;
  requested_first_draft: string | null;
  days_between_revisions: number | null;
  ghostprod: boolean | null;
  auto_accept_at: string | null;
  delivered_at: string | null;
  created_at: string;
};

type Message = {
  id: string;
  sender_id: string;
  sender_name: string;
  content: string | null;
  attachment_url: string | null;
  attachment_name: string | null;
  attachment_size: number | null;
  is_delivery: boolean;
  is_offer: boolean;
  created_at: string;
};

type Attachment = { name: string; url: string; size: number | null; msgId: string };

const STATUS_BANNER: Record<OrderStatus, { text: string; color: string; bg: string }> = {
  pending_approval:   { text: "Venter på at artisten godkjenner søknaden",  color: "#ff9500", bg: "rgba(255,149,0,0.08)" },
  approved:           { text: "Godkjent — betal for å starte",              color: "#818cf8", bg: "rgba(99,102,241,0.08)" },
  in_progress:        { text: "Artisten jobber",                             color: "#34d399", bg: "rgba(52,211,153,0.08)" },
  delivered:          { text: "Levert — godkjenn eller be om revisjon",     color: "#818cf8", bg: "rgba(99,102,241,0.08)" },
  revision_requested: { text: "Revisjon forespurt — artisten jobber",        color: "#ff9500", bg: "rgba(255,149,0,0.08)" },
  completed:          { text: "Fullført",                                    color: "#34d399", bg: "rgba(52,211,153,0.08)" },
  rejected:           { text: "Artist avslo søknaden",                      color: "#ff453a", bg: "rgba(255,69,58,0.08)" },
  disputed:           { text: "Tvist — admin er kontaktet",                 color: "#ff453a", bg: "rgba(255,69,58,0.08)" },
};

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function timeLabel(dateStr: string) {
  return new Date(dateStr).toLocaleString("nb-NO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function daysUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return days;
}

export default function GigChatPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const [order, setOrder]       = useState<Order | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [userId, setUserId]     = useState<string | null>(null);
  const [loading, setLoading]   = useState(true);
  const [sending, setSending]   = useState(false);
  const [text, setText]         = useState("");
  const [file, setFile]         = useState<File | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);

  const bottomRef     = useRef<HTMLDivElement>(null);
  const fileInputRef  = useRef<HTMLInputElement>(null);
  const supabase      = getSupabaseClient();

  // ── Load order + messages ─────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push("/logg-inn"); return; }
    setUserId(session.user.id);

    const [{ data: o }, { data: msgs }] = await Promise.all([
      supabase
        .from("gig_orders")
        .select(`
          id, status, gig_id, buyer_id, producer_id, price, artist_payout,
          requirements, requested_first_draft, days_between_revisions, ghostprod,
          revisions_max, revisions_used, auto_accept_at, delivered_at, created_at,
          gigs(title),
          buyer:profiles!buyer_id(display_name, username),
          producer:profiles!producer_id(display_name, username),
          gig_packages(label, delivery_days)
        `)
        .eq("id", orderId)
        .single(),
      supabase
        .from("gig_messages")
        .select(`id, sender_id, content, attachment_url, attachment_name, attachment_size, is_delivery, is_offer, created_at, profiles!sender_id(display_name, username)`)
        .eq("order_id", orderId)
        .order("created_at", { ascending: true }),
    ]);

    if (!o) { router.push("/meldinger"); return; }
    if (o.buyer_id !== session.user.id && o.producer_id !== session.user.id) {
      router.push("/meldinger"); return;
    }

    setOrder({
      id: o.id, status: o.status, gig_id: o.gig_id,
      gig_title:       o.gigs?.title ?? "",
      buyer_id:        o.buyer_id,
      buyer_name:      (o.buyer as any)?.display_name ?? (o.buyer as any)?.username ?? "Kjøper",
      producer_id:     o.producer_id,
      producer_name:   (o.producer as any)?.display_name ?? (o.producer as any)?.username ?? "Artist",
      price:           o.price, artist_payout: o.artist_payout,
      package_label:   (o.gig_packages as any)?.label ?? "",
      delivery_days:   (o.gig_packages as any)?.delivery_days ?? 0,
      revisions_max:   o.revisions_max, revisions_used: o.revisions_used,
      requirements:    o.requirements,
      requested_first_draft: o.requested_first_draft,
      days_between_revisions: o.days_between_revisions,
      ghostprod:       o.ghostprod,
      auto_accept_at:  o.auto_accept_at,
      delivered_at:    o.delivered_at,
      created_at:      o.created_at,
    });

    setMessages((msgs ?? []).map((m: any) => ({
      id: m.id, sender_id: m.sender_id,
      sender_name: m.profiles?.display_name ?? m.profiles?.username ?? "Ukjent",
      content: m.content, attachment_url: m.attachment_url,
      attachment_name: m.attachment_name, attachment_size: m.attachment_size,
      is_delivery: m.is_delivery, is_offer: m.is_offer,
      created_at: m.created_at,
    })));

    setLoading(false);
  }, [orderId]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Realtime subscription ─────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel(`order-${orderId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "gig_messages",
        filter: `order_id=eq.${orderId}`,
      }, async (payload: { new: Record<string, unknown> }) => {
        const m = payload.new as any;
        const { data: sender } = await supabase.from("profiles").select("display_name,username").eq("id", m.sender_id).single();
        setMessages((prev) => [...prev, {
          id: m.id, sender_id: m.sender_id,
          sender_name: sender?.display_name ?? sender?.username ?? "Ukjent",
          content: m.content, attachment_url: m.attachment_url,
          attachment_name: m.attachment_name, attachment_size: m.attachment_size,
          is_delivery: m.is_delivery, is_offer: m.is_offer, created_at: m.created_at,
        }]);
      })
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "gig_orders",
        filter: `id=eq.${orderId}`,
      }, () => { loadData(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [orderId, loadData]);

  // Scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Send message ──────────────────────────────────────────────────────────
  async function sendMessage(opts?: { is_delivery?: boolean }) {
    if (!text.trim() && !file) return;
    setSending(true);

    let attachmentUrl: string | null = null;
    let attachmentName: string | null = null;
    let attachmentSize: number | null = null;

    if (file) {
      const ext  = file.name.split(".").pop() ?? "bin";
      const path = `${orderId}/${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage.from("gig-files").upload(path, file);
      if (!upErr) {
        attachmentUrl  = path;
        attachmentName = file.name;
        attachmentSize = file.size;
      }
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }

    await supabase.from("gig_messages").insert({
      order_id:        orderId,
      sender_id:       userId,
      content:         text.trim() || null,
      attachment_url:  attachmentUrl,
      attachment_name: attachmentName,
      attachment_size: attachmentSize,
      is_delivery:     opts?.is_delivery ?? false,
    });

    // Update order status if delivery
    if (opts?.is_delivery) {
      const autoAcceptAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      await supabase.from("gig_orders").update({
        status: "delivered",
        delivered_at: new Date().toISOString(),
        auto_accept_at: autoAcceptAt,
      }).eq("id", orderId);
      await supabase.from("notifications").insert({ user_id: order!.buyer_id, type: "delivered", order_id: orderId });
    } else {
      // regular message notification
      const recipient = userId === order?.buyer_id ? order?.producer_id : order?.buyer_id;
      if (recipient) await supabase.from("notifications").insert({ user_id: recipient, type: "message", order_id: orderId });
    }

    setText("");
    setSending(false);
  }

  // ── Order actions ─────────────────────────────────────────────────────────
  async function approve() {
    setActionLoading(true);
    await supabase.from("gig_orders").update({ status: "approved" }).eq("id", orderId);
    await supabase.from("notifications").insert({ user_id: order!.buyer_id, type: "approved", order_id: orderId });
    await supabase.from("gig_messages").insert({
      order_id: orderId, sender_id: userId,
      content: "✓ Søknaden er godkjent. Du kan nå betale for å starte arbeidet.",
    });
    setActionLoading(false);
    toast("Søknad godkjent!", "success");
  }

  async function reject() {
    setActionLoading(true);
    await supabase.from("gig_orders").update({ status: "rejected" }).eq("id", orderId);
    await supabase.from("notifications").insert({ user_id: order!.buyer_id, type: "rejected", order_id: orderId });
    await supabase.from("gig_messages").insert({
      order_id: orderId, sender_id: userId,
      content: "Søknaden ble avslått.",
    });
    setActionLoading(false);
    toast("Søknad avslått");
  }

  async function acceptDelivery() {
    setActionLoading(true);
    const { data: profile } = await supabase.from("profiles").select("stripe_account_id").eq("id", order!.producer_id).single();
    const res = await fetch(`/api/gig-orders/${orderId}/accept`, { method: "POST" });
    if (!res.ok) { toast("Noe gikk galt. Prøv igjen."); setActionLoading(false); return; }
    await supabase.from("notifications").insert({ user_id: order!.producer_id, type: "accepted", order_id: orderId });
    setActionLoading(false);
    toast("Levering akseptert!", "success");
  }

  async function requestRevision() {
    if ((order!.revisions_used) >= order!.revisions_max && order!.revisions_max !== -1) {
      toast("Ingen revisjoner igjen."); return;
    }
    setActionLoading(true);
    await supabase.from("gig_orders").update({
      status: "revision_requested",
      revisions_used: order!.revisions_used + 1,
    }).eq("id", orderId);
    await supabase.from("gig_messages").insert({
      order_id: orderId, sender_id: userId,
      content: "Revisjon forespurt.",
    });
    await supabase.from("notifications").insert({ user_id: order!.producer_id, type: "revision_requested", order_id: orderId });
    setActionLoading(false);
    toast("Revisjon forespurt");
  }

  // ── Attachments ───────────────────────────────────────────────────────────
  const attachments: Attachment[] = messages
    .filter((m) => m.attachment_url && m.attachment_name)
    .map((m) => ({ name: m.attachment_name!, url: m.attachment_url!, size: m.attachment_size, msgId: m.id }));

  async function downloadAttachment(path: string, name: string) {
    const { data } = await supabase.storage.from("gig-files").createSignedUrl(path, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
    else toast("Kunne ikke laste ned filen.");
  }

  if (loading) return <div className="mx-auto max-w-4xl px-4 py-20 text-center"><p className="text-sm" style={{ color: "#3a3a3a" }}>Laster...</p></div>;
  if (!order) return null;

  const isProducer  = userId === order.producer_id;
  const isBuyer     = userId === order.buyer_id;
  const banner      = STATUS_BANNER[order.status];
  const revisionsLeft = order.revisions_max === -1 ? "∞" : Math.max(0, order.revisions_max - order.revisions_used);
  const autoAcceptDays = order.auto_accept_at ? daysUntil(order.auto_accept_at) : null;

  return (
    <div className="mx-auto max-w-5xl px-4 md:px-6 py-6 flex flex-col" style={{ height: "calc(100vh - 56px)" }}>

      {/* Header */}
      <div className="flex items-center gap-3 mb-4 shrink-0">
        <Link href="/meldinger" className="flex items-center gap-1 text-sm transition-opacity hover:opacity-60" style={{ color: "#86868b" }}>
          <ChevronLeft size={14} />
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: "#f5f5f7" }}>{order.gig_title}</p>
          <p className="text-xs" style={{ color: "#3a3a3a" }}>
            {isProducer ? order.buyer_name : order.producer_name} · {order.package_label} · kr {order.price.toLocaleString("nb-NO")}
          </p>
        </div>
        <button onClick={() => setShowAttachments((s) => !s)}
          className="text-xs rounded-lg px-3 py-1.5 transition-opacity hover:opacity-80"
          style={{ background: "rgba(255,255,255,0.06)", color: "#86868b" }}>
          Vedlegg ({attachments.length})
        </button>
      </div>

      {/* Status banner */}
      <div className="mb-4 rounded-xl px-4 py-3 flex items-center gap-2 shrink-0"
        style={{ background: banner.bg, border: `1px solid ${banner.color}30` }}>
        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: banner.color }} />
        <p className="text-xs font-medium flex-1" style={{ color: banner.color }}>{banner.text}</p>
        {order.status === "delivered" && autoAcceptDays !== null && (
          <span className="text-xs" style={{ color: "#3a3a3a" }}>
            <Clock size={10} className="inline mr-1" />
            Auto-aksept om {autoAcceptDays}d
          </span>
        )}
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Chat area */}
        <div className="flex-1 flex flex-col min-h-0">

          {/* Messages */}
          <div className="flex-1 overflow-y-auto flex flex-col gap-3 pb-3 pr-1" style={{ scrollbarWidth: "thin" }}>

            {/* Søknad summary (first message) */}
            {order.requirements && (
              <div className="rounded-2xl p-4 text-xs" style={{ background: "#0f0f0f", border: "1px solid #1e1e1e" }}>
                <p className="font-semibold mb-2" style={{ color: "#f5f5f7" }}>Søknad fra {order.buyer_name}</p>
                <p className="leading-relaxed mb-2" style={{ color: "#86868b" }}>{order.requirements}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1" style={{ color: "#3a3a3a" }}>
                  {order.requested_first_draft && (
                    <span>Ønsket dato: <span style={{ color: "#86868b" }}>{new Date(order.requested_first_draft).toLocaleDateString("nb-NO")}</span></span>
                  )}
                  {order.days_between_revisions && (
                    <span>Mellom revisjoner: <span style={{ color: "#86868b" }}>{order.days_between_revisions} dager</span></span>
                  )}
                  {order.ghostprod !== null && (
                    <span>{order.ghostprod ? "Ghostprod" : "Med credits"}</span>
                  )}
                </div>
              </div>
            )}

            {messages.map((msg, i) => {
              const isMe = msg.sender_id === userId;
              const showDate = i === 0 || new Date(msg.created_at).toDateString() !== new Date(messages[i - 1].created_at).toDateString();

              return (
                <div key={msg.id}>
                  {showDate && (
                    <div className="flex items-center gap-3 my-2">
                      <div className="flex-1 h-px" style={{ background: "#1e1e1e" }} />
                      <span className="text-xs" style={{ color: "#3a3a3a" }}>{new Date(msg.created_at).toLocaleDateString("nb-NO", { weekday: "long", day: "numeric", month: "long" })}</span>
                      <div className="flex-1 h-px" style={{ background: "#1e1e1e" }} />
                    </div>
                  )}

                  {/* Delivery badge */}
                  {msg.is_delivery && (
                    <div className="flex items-center gap-2 mb-1 ml-2">
                      <CheckCircle size={12} style={{ color: "#34d399" }} />
                      <span className="text-xs font-medium" style={{ color: "#34d399" }}>Levering</span>
                    </div>
                  )}

                  <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <div style={{
                      maxWidth: "75%",
                      background: msg.is_delivery ? "rgba(52,211,153,0.08)" :
                                  isMe ? "rgba(99,102,241,0.15)" : "#141414",
                      border: msg.is_delivery ? "1px solid rgba(52,211,153,0.25)" :
                              isMe ? "1px solid rgba(99,102,241,0.25)" : "1px solid #2a2a2a",
                      borderRadius: 16,
                      padding: "10px 14px",
                    }}>
                      {!isMe && <p className="text-xs font-medium mb-1" style={{ color: "#3a3a3a" }}>{msg.sender_name}</p>}
                      {msg.content && <p className="text-sm leading-relaxed" style={{ color: "#f5f5f7" }}>{msg.content}</p>}
                      {msg.attachment_url && msg.attachment_name && (
                        <button onClick={() => downloadAttachment(msg.attachment_url!, msg.attachment_name!)}
                          className="flex items-center gap-2 mt-2 rounded-lg px-3 py-2 transition-opacity hover:opacity-80 w-full"
                          style={{ background: "rgba(255,255,255,0.06)" }}>
                          <Download size={12} style={{ color: "#818cf8" }} />
                          <span className="text-xs truncate flex-1 text-left" style={{ color: "#f5f5f7" }}>{msg.attachment_name}</span>
                          {msg.attachment_size && <span className="text-xs shrink-0" style={{ color: "#3a3a3a" }}>{formatBytes(msg.attachment_size)}</span>}
                        </button>
                      )}
                      <p className="text-xs mt-1.5" style={{ color: "#3a3a3a" }}>{timeLabel(msg.created_at)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Action buttons */}
          {order.status !== "completed" && order.status !== "rejected" && order.status !== "disputed" && (
            <div className="flex flex-wrap gap-2 py-3 shrink-0 border-t" style={{ borderColor: "#1e1e1e" }}>
              {/* Producer actions */}
              {isProducer && order.status === "pending_approval" && (
                <>
                  <button onClick={approve} disabled={actionLoading}
                    className="rounded-xl px-4 py-2 text-xs font-semibold transition-opacity disabled:opacity-50"
                    style={{ background: "#34d399", color: "#080808" }}>Godkjenn søknad</button>
                  <button onClick={reject} disabled={actionLoading}
                    className="rounded-xl px-4 py-2 text-xs font-semibold transition-opacity disabled:opacity-50"
                    style={{ background: "rgba(255,69,58,0.12)", color: "#ff453a", border: "1px solid rgba(255,69,58,0.25)" }}>Avslå</button>
                </>
              )}
              {isProducer && (order.status === "in_progress" || order.status === "revision_requested") && (
                <button onClick={() => { if (text.trim() || file) sendMessage({ is_delivery: true }); else toast("Skriv en melding eller legg ved fil for å levere."); }}
                  disabled={actionLoading || sending}
                  className="rounded-xl px-4 py-2 text-xs font-semibold transition-opacity disabled:opacity-50"
                  style={{ background: "#34d399", color: "#080808" }}>Marker som levert</button>
              )}

              {/* Buyer actions */}
              {isBuyer && order.status === "approved" && (
                <Link href={`/api/stripe/checkout-gig?orderId=${orderId}`}
                  className="rounded-xl px-4 py-2 text-xs font-semibold transition-opacity hover:opacity-80"
                  style={{ background: "#0071e3", color: "#fff" }}>Betal nå — kr {order.price.toLocaleString("nb-NO")}</Link>
              )}
              {isBuyer && order.status === "delivered" && (
                <>
                  <button onClick={acceptDelivery} disabled={actionLoading}
                    className="rounded-xl px-4 py-2 text-xs font-semibold transition-opacity disabled:opacity-50"
                    style={{ background: "#34d399", color: "#080808" }}>Aksepter levering</button>
                  {(order.revisions_max === -1 || order.revisions_used < order.revisions_max) && (
                    <button onClick={requestRevision} disabled={actionLoading}
                      className="rounded-xl px-4 py-2 text-xs font-semibold transition-opacity disabled:opacity-50"
                      style={{ background: "rgba(255,149,0,0.1)", color: "#ff9500", border: "1px solid rgba(255,149,0,0.25)" }}>
                      Be om revisjon {order.revisions_max !== -1 && `(${revisionsLeft} igjen)`}
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {/* Input */}
          {order.status !== "rejected" && order.status !== "disputed" && (
            <div className="flex items-end gap-2 pt-2 shrink-0">
              {file && (
                <div className="flex items-center gap-2 rounded-xl px-3 py-2 mb-2 w-full"
                  style={{ background: "#141414", border: "1px solid #2a2a2a" }}>
                  <span className="text-xs flex-1 truncate" style={{ color: "#f5f5f7" }}>{file.name}</span>
                  <button onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}>
                    <X size={13} style={{ color: "#86868b" }} />
                  </button>
                </div>
              )}
              <div className="flex items-end gap-2 w-full">
                <button onClick={() => fileInputRef.current?.click()}
                  className="shrink-0 rounded-xl p-2.5 transition-opacity hover:opacity-70"
                  style={{ background: "#141414", border: "1px solid #2a2a2a", color: "#86868b" }}>
                  <Paperclip size={15} />
                </button>
                <input ref={fileInputRef} type="file" accept="*/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) { if (f.size > 1073741824) { toast("Filen er for stor (maks 1 GB)."); return; } setFile(f); } }} />
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder="Skriv en melding..."
                  rows={1}
                  className="flex-1 resize-none rounded-xl px-4 py-2.5 text-sm outline-none"
                  style={{
                    background: "#141414", border: "1px solid #2a2a2a",
                    color: "#f5f5f7", lineHeight: 1.5, maxHeight: 120, overflowY: "auto",
                  }}
                />
                <button onClick={() => sendMessage()} disabled={sending || (!text.trim() && !file)}
                  className="shrink-0 rounded-xl p-2.5 transition-opacity disabled:opacity-30"
                  style={{ background: "#0071e3", color: "#fff" }}>
                  <Send size={15} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Attachments sidebar */}
        {showAttachments && (
          <div className="w-56 shrink-0 flex flex-col rounded-2xl overflow-hidden"
            style={{ background: "#0f0f0f", border: "1px solid #1e1e1e" }}>
            <div className="px-4 py-3 flex items-center justify-between shrink-0"
              style={{ borderBottom: "1px solid #1e1e1e" }}>
              <p className="text-xs font-semibold" style={{ color: "#f5f5f7" }}>Vedlegg</p>
              <button onClick={() => setShowAttachments(false)} style={{ color: "#3a3a3a" }}><X size={13} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2" style={{ scrollbarWidth: "thin" }}>
              {attachments.length === 0 && (
                <p className="text-xs text-center mt-4" style={{ color: "#3a3a3a" }}>Ingen vedlegg</p>
              )}
              {attachments.map((a, i) => (
                <button key={i} onClick={() => downloadAttachment(a.url, a.name)}
                  className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-left w-full transition-opacity hover:opacity-80"
                  style={{ background: "#141414", border: "1px solid #2a2a2a" }}>
                  <Download size={11} style={{ color: "#818cf8", flexShrink: 0 }} />
                  <div className="min-w-0">
                    <p className="text-xs truncate" style={{ color: "#f5f5f7" }}>{a.name}</p>
                    {a.size && <p className="text-xs" style={{ color: "#3a3a3a" }}>{formatBytes(a.size)}</p>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
