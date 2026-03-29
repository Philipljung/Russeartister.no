"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { Pencil, Settings, Play, Pause, Package, Trash2, CreditCard, CheckCircle2, Share2, SquarePen, LogOut } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { fetchProfileByUsername } from "@/lib/fetchProfile";
import { fetchBeatsByProducer } from "@/lib/fetchBeats";
import { fetchSamplesByProducer } from "@/lib/fetchSamples";
import { fetchRemakesByProducer } from "@/lib/fetchRemakes";
import { usePlayer } from "@/lib/player-context";
import { useToast } from "@/lib/toast-context";
import StripeOnboardingModal from "@/components/StripeOnboardingModal";
import ImageCropModal from "@/components/ImageCropModal";
import EditProductModal from "@/components/EditProductModal";
import { CATEGORY_LABELS } from "@/lib/sampleCategories";
import type { Profile, Beat, Sample, Remake } from "@/lib/supabase/types";

function genreColor(genre: string): string {
  const palette = ["#1a1040", "#001a2e", "#1a2e00", "#2e1a00", "#001e14", "#14001e", "#1e0a0a", "#00141e"];
  let hash = 0;
  for (let i = 0; i < genre.length; i++) hash = genre.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const usernameParam = params.username as string;
  const { toast } = useToast();
  const { currentBeat, isPlaying, toggleBeat } = usePlayer();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [beats, setBeats] = useState<Beat[]>([]);
  const [samples, setSamples] = useState<Sample[]>([]);
  const [remakes, setRemakes] = useState<Remake[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");

  const [bio, setBio] = useState("");
  const [editingBio, setEditingBio] = useState(false);
  const [bioInput, setBioInput] = useState("");

  const [showStripeModal, setShowStripeModal] = useState(false);

  const [socialLinks, setSocialLinks] = useState({ instagram: "", spotify: "", soundcloud: "" });
  const [editingSocial, setEditingSocial] = useState(false);
  const [socialInput, setSocialInput] = useState({ instagram: "", spotify: "", soundcloud: "" });

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ type: "beat" | "sample" | "remake"; id: string } | null>(null);
  const [editing, setEditing] = useState<{ type: "beat"; item: Beat } | { type: "sample"; item: Sample } | { type: "remake"; item: Remake } | null>(null);


  const nameInputRef = useRef<HTMLInputElement>(null);
  const bioTextareaRef = useRef<HTMLTextAreaElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarCropSrc, setAvatarCropSrc] = useState<string | null>(null);
  const [bannerCropSrc, setBannerCropSrc] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const [fetchedProfile, sessionResult] = await Promise.all([
        fetchProfileByUsername(usernameParam),
        getSupabaseClient().auth.getSession(),
      ]);

      if (!fetchedProfile) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const currentUserId = sessionResult.data.session?.user?.id ?? null;
      const owner = currentUserId === fetchedProfile.id;

      setProfile(fetchedProfile);
      setDisplayName(fetchedProfile.display_name);
      setNameInput(fetchedProfile.display_name);
      setBio(fetchedProfile.bio ?? "");
      setBioInput(fetchedProfile.bio ?? "");
      const links = {
        instagram: fetchedProfile.instagram_url ?? "",
        spotify: fetchedProfile.spotify_url ?? "",
        soundcloud: fetchedProfile.soundcloud_url ?? "",
      };
      setSocialLinks(links);
      setSocialInput(links);
      setAvatarUrl(fetchedProfile.avatar_url);
      setIsOwner(owner);

      const [fetchedBeats, fetchedSamples, fetchedRemakes] = await Promise.all([
        fetchBeatsByProducer(fetchedProfile.id),
        fetchSamplesByProducer(fetchedProfile.id),
        fetchRemakesByProducer(fetchedProfile.id),
      ]);
      setBeats(fetchedBeats);
      setSamples(fetchedSamples);
      setRemakes(fetchedRemakes);

      setLoading(false);
    }

    load();
  }, [usernameParam]);

  useEffect(() => {
    if (editingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [editingName]);

  useEffect(() => {
    if (editingBio && bioTextareaRef.current) {
      bioTextareaRef.current.focus();
    }
  }, [editingBio]);

  async function confirmDelete() {
    if (!pendingDelete) return;
    const { type, id } = pendingDelete;
    setPendingDelete(null);
    const supabase = getSupabaseClient();
    if (type === "beat") {
      const { error } = await supabase.from("beats").update({ deleted_at: new Date().toISOString() }).eq("id", id);
      if (error) toast("Kunne ikke slette. Prøv igjen.", "error");
      else { setBeats((prev) => prev.filter((b) => b.id !== id)); toast("Låt slettet.", "success"); }
    } else if (type === "sample") {
      const { error } = await supabase.from("samples").update({ deleted_at: new Date().toISOString() }).eq("id", id);
      if (error) toast("Kunne ikke slette. Prøv igjen.", "error");
      else { setSamples((prev) => prev.filter((s) => s.id !== id)); toast("Sample slettet.", "success"); }
    } else {
      const { error } = await supabase.from("remakes").update({ deleted_at: new Date().toISOString() }).eq("id", id);
      if (error) toast("Kunne ikke slette. Prøv igjen.", "error");
      else { setRemakes((prev) => prev.filter((r) => r.id !== id)); toast("Remake slettet.", "success"); }
    }
  }

  function deleteBeat(beatId: string) { setPendingDelete({ type: "beat", id: beatId }); }
  function deleteSample(sampleId: string) { setPendingDelete({ type: "sample", id: sampleId }); }
  function deleteRemake(remakeId: string) { setPendingDelete({ type: "remake", id: remakeId }); }

  async function shareProfile() {
    const url = `${window.location.origin}/profile/${encodeURIComponent(displayName || profile!.username)}`;
    await navigator.clipboard.writeText(url);
    toast("Lenken er kopiert!", "success");
  }

  async function saveName() {
    const trimmed = nameInput.trim();
    if (!trimmed) {
      setNameInput(displayName);
      setEditingName(false);
      return;
    }

    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: trimmed })
      .eq("id", profile!.id);

    if (error) {
      console.error("[profile] Failed to save display name:", error.message);
      toast("Kunne ikke lagre navn.", "error");
    } else {
      setDisplayName(trimmed);
    }
    setEditingName(false);
  }

  async function saveBio() {
    const trimmed = bioInput.trim();
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from("profiles")
      .update({ bio: trimmed })
      .eq("id", profile!.id);

    if (error) {
      console.error("[profile] Failed to save bio:", error.message);
      toast("Kunne ikke lagre bio.", "error");
    } else {
      setBio(trimmed);
    }
    setEditingBio(false);
  }

  function handleAvatarSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    setAvatarCropSrc(URL.createObjectURL(file));
  }

  async function uploadCroppedAvatar(blob: Blob) {
    if (!profile) return;
    setAvatarCropSrc(null);

    const path = `${profile.id}/avatar.webp`;
    setUploadingAvatar(true);

    try {
      const supabase = getSupabaseClient();
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, blob, { upsert: true, contentType: "image/webp" });

      if (uploadError) {
        console.error("[profile] Avatar upload error:", uploadError.message);
        toast("Kunne ikke laste opp bilde.", "error");
        return;
      }

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = urlData.publicUrl + `?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", profile.id);

      if (updateError) {
        console.error("[profile] Failed to save avatar_url:", updateError.message);
        toast("Bilde lastet opp, men kunne ikke lagre.", "error");
        return;
      }

      setAvatarUrl(publicUrl);
      toast("Profilbilde oppdatert.", "success");
    } catch (err) {
      console.error("[profile] Unexpected avatar error:", err);
      toast("Noe gikk galt.", "error");
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function saveSocialLinks() {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from("profiles")
      .update({
        instagram_url: socialInput.instagram.trim() || null,
        spotify_url: socialInput.spotify.trim() || null,
        soundcloud_url: socialInput.soundcloud.trim() || null,
      })
      .eq("id", profile!.id);

    if (error) {
      console.error("[profile] Failed to save social links:", error.message);
      toast("Kunne ikke lagre lenker.", "error");
    } else {
      setSocialLinks({ ...socialInput });
      toast("Lenker lagret.", "success");
    }
    setEditingSocial(false);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm" style={{ color: "#3a3a3a" }}>
          Laster profil...
        </p>
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3">
        <p className="text-lg font-semibold" style={{ color: "#f5f5f7" }}>
          Profil ikke funnet
        </p>
        <p className="text-sm" style={{ color: "#86868b" }}>
          @{usernameParam} eksisterer ikke
        </p>
        <Link
          href="/beats"
          className="mt-4 rounded-xl px-5 py-2 text-sm font-medium"
          style={{ background: "rgba(255,255,255,0.06)", color: "#f5f5f7" }}
        >
          Gå til beats
        </Link>
      </div>
    );
  }

  return (
    <>
    <div>
      {/* ── HEADER ── */}
      <div
        className="relative"
        style={{
          background: "linear-gradient(135deg, #1a0d3a 0%, #0d1a40 40%, #001430 70%, #0a0a14 100%)",
          height: 130,
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 30% 50%, rgba(99,102,241,0.12) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(139,92,246,0.08) 0%, transparent 50%)",
          }}
        />

        <div className="absolute right-6 top-5 flex items-center gap-2">
          <button
            onClick={shareProfile}
            className="rounded-lg p-2 transition-opacity hover:opacity-80"
            style={{ background: "rgba(255,255,255,0.06)", color: "#86868b" }}
            title="Del profil"
          >
            <Share2 size={18} />
          </button>
          {isOwner && (
            <>
              <Link
                href="/innstillinger"
                className="rounded-lg p-2 transition-opacity hover:opacity-80"
                style={{ background: "rgba(255,255,255,0.06)", color: "#86868b" }}
                title="Innstillinger"
              >
                <Settings size={18} />
              </Link>
              <button
                onClick={async () => {
                  const supabase = getSupabaseClient();
                  await supabase.auth.signOut();
                  router.push("/later");
                  router.refresh();
                }}
                className="rounded-lg p-2 transition-opacity hover:opacity-80"
                style={{ background: "rgba(255,255,255,0.06)", color: "#86868b" }}
                title="Logg ut"
              >
                <LogOut size={18} />
              </button>
            </>
          )}
        </div>

        {/* Avatar */}
        <div className="absolute bottom-0 left-0 translate-y-1/2 px-6 md:px-10">
          <div
            className="relative shrink-0 rounded-2xl"
            style={{
              width: 88, height: 88,
              background: "linear-gradient(135deg, #2a1a5e 0%, #1a2a5e 100%)",
              border: "3px solid #0a0a14",
              boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
              cursor: isOwner ? "pointer" : "default",
              overflow: "hidden",
            }}
            onClick={() => isOwner && avatarInputRef.current?.click()}
            title={isOwner ? "Endre profilbilde" : undefined}
          >
            {avatarUrl ? (
              <Image src={avatarUrl} alt="Profilbilde" fill style={{ objectFit: "cover" }} />
            ) : (
              <span
                className="flex h-full w-full items-center justify-center text-2xl font-bold tracking-wider select-none"
                style={{ color: "rgba(255,255,255,0.3)" }}
              >
                {displayName.slice(0, 2).toUpperCase()}
              </span>
            )}

            {/* Hover overlay for owner */}
            {isOwner && (
              <div
                className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 opacity-0 hover:opacity-100 transition-opacity"
                style={{ background: "rgba(0,0,0,0.65)" }}
              >
                {uploadingAvatar ? (
                  <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                ) : (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); avatarInputRef.current?.click(); }}
                      className="flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium transition-colors hover:bg-white/20"
                      style={{ color: "#fff" }}
                    >
                      <Pencil size={11} /> Endre
                    </button>
                    {avatarUrl && (
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          const supabase = getSupabaseClient();
                          const { error } = await supabase.from("profiles").update({ avatar_url: null }).eq("id", profile!.id);
                          if (!error) { setAvatarUrl(null); toast("Profilbilde fjernet.", "success"); }
                          else toast("Kunne ikke fjerne bilde.", "error");
                        }}
                        className="flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium transition-colors hover:bg-white/20"
                        style={{ color: "#ff6b6b" }}
                      >
                        Fjern
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Hidden file input */}
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarSelect}
          />
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className="mx-auto max-w-7xl px-4 md:px-10">
        {/* Name row */}
        <div className="pt-14 pb-1 flex items-center gap-2 flex-wrap">
          {editingName && isOwner ? (
            <>
              <input
                ref={nameInputRef}
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { void saveName(); }
                  if (e.key === "Escape") { setNameInput(displayName); setEditingName(false); }
                }}
                className="rounded-lg px-2 py-0.5 text-2xl font-bold tracking-tight outline-none"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(99,102,241,0.5)",
                  color: "#f5f5f7",
                  width: Math.max(120, nameInput.length * 16),
                }}
              />
              <button
                onClick={() => void saveName()}
                className="rounded-lg px-3 py-1 text-xs font-semibold"
                style={{ background: "#6366f1", color: "#fff" }}
              >Lagre</button>
              <button
                onClick={() => { setNameInput(displayName); setEditingName(false); }}
                className="rounded-lg px-3 py-1 text-xs font-semibold"
                style={{ background: "rgba(255,255,255,0.06)", color: "#86868b" }}
              >Avbryt</button>
            </>
          ) : (
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: "#f5f5f7" }}>
              {displayName}
            </h1>
          )}

          {isOwner && !editingName && (
            <button
              onClick={() => { setNameInput(displayName); setEditingName(true); }}
              className="rounded-md p-1.5 transition-colors"
              style={{ color: "#3a3a3a" }}
              title="Endre navn"
            >
              <Pencil size={14} />
            </button>
          )}
        </div>

        <p className="text-xs mt-0.5" style={{ color: "#3a3a3a" }}>
          @{profile.username}
        </p>

        {/* Bio */}
        <div className="mt-3 max-w-xl">
          {editingBio && isOwner ? (
            <div className="flex flex-col gap-2">
              <textarea
                ref={bioTextareaRef}
                value={bioInput}
                onChange={(e) => setBioInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") { setBioInput(bio); setEditingBio(false); }
                }}
                rows={3}
                className="w-full resize-none rounded-lg px-3 py-2 text-sm outline-none"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(99,102,241,0.5)",
                  color: "#f5f5f7",
                  lineHeight: 1.6,
                }}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => void saveBio()}
                  className="rounded-lg px-3 py-1 text-xs font-semibold"
                  style={{ background: "#6366f1", color: "#fff" }}
                >Lagre</button>
                <button
                  onClick={() => { setBioInput(bio); setEditingBio(false); }}
                  className="rounded-lg px-3 py-1 text-xs font-semibold"
                  style={{ background: "rgba(255,255,255,0.06)", color: "#86868b" }}
                >Avbryt</button>
              </div>
            </div>
          ) : (
            <p
              className="text-sm leading-relaxed"
              style={{
                color: bio ? "#86868b" : "#3a3a3a",
                cursor: isOwner ? "text" : "default",
              }}
              onClick={() => {
                if (!isOwner) return;
                setBioInput(bio);
                setEditingBio(true);
              }}
              title={isOwner ? "Klikk for å redigere" : undefined}
            >
              {bio || (isOwner ? "Legg til en beskrivelse..." : "")}
            </p>
          )}
        </div>

        {/* Social links */}
        <div className="mt-4 flex items-center gap-2 flex-wrap">
          {(["instagram", "spotify", "soundcloud"] as const).map((platform) => {
            const logos: Record<string, string> = {
              instagram: "/instagramlogo.jpg",
              spotify: "/spotifylogo.jpg",
              soundcloud: "/soundcloudlogo.png",
            };
            const labels: Record<string, string> = {
              instagram: "Instagram",
              spotify: "Spotify",
              soundcloud: "SoundCloud",
            };
            const url = socialLinks[platform];

            if (url) {
              return (
                <a
                  key={platform}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={labels[platform]}
                  className="transition-opacity hover:opacity-70"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    overflow: "hidden",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <Image src={logos[platform]} alt={labels[platform]} width={34} height={34} style={{ objectFit: "cover" }} />
                </a>
              );
            }

            if (!isOwner) return null;

            return (
              <button
                key={platform}
                onClick={() => { setSocialInput({ ...socialLinks }); setEditingSocial(true); }}
                className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs transition-colors hover:opacity-80"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px dashed rgba(255,255,255,0.1)",
                  color: "#3a3a3a",
                }}
              >
                <Image src={logos[platform]} alt={labels[platform]} width={14} height={14} style={{ objectFit: "cover", borderRadius: 3, opacity: 0.4 }} />
                Legg til {labels[platform]}
              </button>
            );
          })}

          {/* Always-visible edit button for owner */}
          {isOwner && (
            <button
              onClick={() => { setSocialInput({ ...socialLinks }); setEditingSocial(true); }}
              className="flex items-center justify-center rounded-full transition-colors hover:opacity-80"
              style={{ width: 28, height: 28, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#3a3a3a" }}
              title="Endre sosiale lenker"
            >
              <Pencil size={11} />
            </button>
          )}
        </div>

        {/* Social links edit modal */}
        {editingSocial && isOwner && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.7)" }}
            onClick={() => setEditingSocial(false)}
          >
            <div
              className="w-full max-w-sm rounded-2xl p-6 flex flex-col gap-4"
              style={{ background: "#111", border: "1px solid #222" }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-base font-semibold" style={{ color: "#f5f5f7" }}>Sosiale lenker</h3>
              {(["instagram", "spotify", "soundcloud"] as const).map((platform) => {
                const placeholders: Record<string, string> = {
                  instagram: "https://instagram.com/brukernavn",
                  spotify: "https://open.spotify.com/artist/...",
                  soundcloud: "https://soundcloud.com/brukernavn",
                };
                const labels: Record<string, string> = {
                  instagram: "Instagram",
                  spotify: "Spotify",
                  soundcloud: "SoundCloud",
                };
                return (
                  <div key={platform} className="flex flex-col gap-1">
                    <label className="text-xs font-medium" style={{ color: "#86868b" }}>{labels[platform]}</label>
                    <input
                      type="url"
                      value={socialInput[platform]}
                      onChange={(e) => setSocialInput((prev) => ({ ...prev, [platform]: e.target.value }))}
                      placeholder={placeholders[platform]}
                      className="rounded-xl px-3 py-2 text-sm outline-none"
                      style={{
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        color: "#f5f5f7",
                      }}
                    />
                  </div>
                );
              })}
              <div className="flex gap-2 mt-1">
                <button
                  onClick={() => setEditingSocial(false)}
                  className="flex-1 rounded-xl py-2 text-sm font-medium"
                  style={{ background: "rgba(255,255,255,0.06)", color: "#86868b" }}
                >
                  Avbryt
                </button>
                <button
                  onClick={saveSocialLinks}
                  className="flex-1 rounded-xl py-2 text-sm font-semibold"
                  style={{ background: "#6366f1", color: "#fff" }}
                >
                  Lagre
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stripe banner — owner only */}
        {isOwner && (
          profile.stripe_onboarding_complete ? (
            <div
              className="mt-5 inline-flex items-center gap-2 rounded-full px-3 py-1.5"
              style={{ background: "rgba(52,199,89,0.08)", border: "1px solid rgba(52,199,89,0.2)" }}
            >
              <CheckCircle2 size={13} style={{ color: "#34c759" }} />
              <span className="text-xs font-medium" style={{ color: "#34c759" }}>Stripe tilkoblet</span>
            </div>
          ) : (
            <div
              className="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl px-4 md:px-5 py-4"
              style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)" }}
            >
              <div>
                <p className="text-sm font-semibold" style={{ color: "#f5f5f7" }}>
                  Sett opp betalinger
                </p>
                <p className="text-xs mt-0.5" style={{ color: "#86868b" }}>
                  Koble til Stripe for å begynne å selge
                </p>
              </div>
              <div className="flex flex-col items-start sm:items-end gap-2 shrink-0">
                <button
                  className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-80"
                  style={{ background: "#6366f1", color: "#fff" }}
                  onClick={() => setShowStripeModal(true)}
                >
                  <CreditCard size={14} />
                  Sett opp Stripe
                </button>
                <a
                  href="https://stripe.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs transition-opacity hover:opacity-70"
                  style={{ color: "#86868b" }}
                >
                  Hva er Stripe? →
                </a>
              </div>
            </div>
          )
        )}

        {/* Divider */}
        <div className="mt-8 mb-6 h-px w-full" style={{ background: "#1e1e1e" }} />

        {/* Mine beats */}
        <section className="mb-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold tracking-tight" style={{ color: "#f5f5f7" }}>
              {isOwner ? "Mine låter" : "Låter"}
            </h2>
            {isOwner && (
              <Link
                href="/lastopp"
                className="rounded-xl px-4 py-1.5 text-sm font-semibold transition-opacity hover:opacity-90"
                style={{ background: "#ffffff", color: "#000000" }}
              >
                Last opp låt
              </Link>
            )}
          </div>

          {beats.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center rounded-2xl py-16"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid #1e1e1e" }}
            >
              <p className="text-sm font-medium" style={{ color: "#3a3a3a" }}>
                Ingen låter enda
              </p>
            </div>
          ) : (
            <div>
              {beats.map((beat) => {
                const isActive = currentBeat?.id === beat.id;
                const isCurrentlyPlaying = isActive && isPlaying;
                return (
                  <div
                    key={beat.id}
                    className="flex items-center gap-2 md:gap-4 rounded-xl px-2 md:px-3 py-2.5 cursor-pointer transition-colors hover:bg-white/[0.03]"
                    style={{ borderBottom: "1px solid #141414" }}
                    onClick={() => router.push(`/later/${beat.id}`)}
                  >
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleBeat(beat); }}
                      className="flex shrink-0 items-center justify-center rounded-full"
                      style={{
                        width: 32, height: 32,
                        background: isCurrentlyPlaying ? "#f5f5f7" : "rgba(255,255,255,0.06)",
                        color: isCurrentlyPlaying ? "#080808" : "#f5f5f7",
                      }}
                    >
                      {isCurrentlyPlaying
                        ? <Pause size={12} fill="#080808" />
                        : <Play size={12} fill="#f5f5f7" />}
                    </button>

                    <div
                      className="shrink-0 rounded-md hidden sm:block"
                      style={{ width: 36, height: 36, background: genreColor(beat.genre) }}
                    />

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium" style={{ color: "#f5f5f7" }}>
                        {beat.title}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: "#86868b" }}>
                        {beat.genre} &middot; {beat.bpm} BPM
                      </p>
                    </div>

                    <div className="hidden items-center gap-1.5 md:flex">
                      {beat.tags.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full px-2 py-0.5 text-xs"
                          style={{ background: "rgba(255,255,255,0.05)", color: "#86868b" }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
                      {isOwner && (
                        <span
                          className="hidden sm:inline text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{
                            background: beat.is_published ? "rgba(52,199,89,0.1)" : "rgba(255,255,255,0.05)",
                            color: beat.is_published ? "#34c759" : "#86868b",
                          }}
                        >
                          {beat.is_published ? "Publisert" : "Utkast"}
                        </span>
                      )}
                      <span className="text-xs sm:text-sm font-semibold" style={{ color: "#f5f5f7", minWidth: 40, textAlign: "right" }}>
                        kr {beat.price.toLocaleString("nb-NO")}
                      </span>
                      <button
                        title="Del"
                        className="hidden sm:flex items-center justify-center rounded-lg transition-colors hover:opacity-80"
                        style={{ width: 30, height: 30, color: "#86868b" }}
                        onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(`${window.location.origin}/later/${beat.id}`); toast("Lenke kopiert!"); }}
                      >
                        <Share2 size={14} />
                      </button>
                      {isOwner && (
                        <>
                          <button
                            title="Rediger låt"
                            className="flex items-center justify-center rounded-lg transition-colors hover:opacity-80"
                            style={{ width: 30, height: 30, color: "#86868b" }}
                            onClick={(e) => { e.stopPropagation(); setEditing({ type: "beat", item: beat }); }}
                          >
                            <SquarePen size={14} />
                          </button>
                          <button
                            title="Slett låt"
                            className="flex items-center justify-center rounded-lg transition-colors hover:opacity-80"
                            style={{ width: 30, height: 30, color: "#ff3b30" }}
                            onClick={(e) => { e.stopPropagation(); deleteBeat(beat.id); }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Mine samples & presets */}
        <section className="mb-16">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold tracking-tight" style={{ color: "#f5f5f7" }}>
              {isOwner ? "Mine samples & presets" : "Samples & presets"}
            </h2>
            {isOwner && (
              <Link
                href="/lastopp-sample"
                className="rounded-xl px-3 md:px-4 py-1.5 text-xs md:text-sm font-semibold transition-opacity hover:opacity-90 whitespace-nowrap"
                style={{ background: "#ffffff", color: "#000000" }}
              >
                <span className="hidden sm:inline">Last opp </span>sample / preset
              </Link>
            )}
          </div>

          {samples.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center rounded-2xl py-16"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid #1e1e1e" }}
            >
              <Package size={28} style={{ color: "#2a2a2a" }} />
              <p className="mt-3 text-sm font-medium" style={{ color: "#3a3a3a" }}>
                Ingen samples eller presets enda
              </p>
            </div>
          ) : (
            <div>
              {samples.map((sample) => (
                <div
                  key={sample.id}
                  className="flex items-center gap-2 md:gap-4 rounded-xl px-2 md:px-3 py-2.5 cursor-pointer transition-colors hover:bg-white/[0.03]"
                  style={{ borderBottom: "1px solid #141414" }}
                  onClick={() => router.push(`/samples/${sample.id}`)}
                >
                  <button
                    onClick={(e) => { e.stopPropagation(); if (sample.audio_preview_url) toggleBeat(sample); }}
                    className="shrink-0 flex items-center justify-center rounded-full"
                    style={{
                      width: 32, height: 32,
                      background: currentBeat?.id === sample.id && isPlaying ? "#f5f5f7" : "rgba(255,255,255,0.06)",
                      color: currentBeat?.id === sample.id && isPlaying ? "#080808" : sample.audio_preview_url ? "#f5f5f7" : "#3a3a3a",
                      cursor: sample.audio_preview_url ? "pointer" : "default",
                    }}
                  >
                    {currentBeat?.id === sample.id && isPlaying
                      ? <Pause size={12} fill="#080808" />
                      : sample.audio_preview_url
                        ? <Play size={12} fill="#f5f5f7" />
                        : <Package size={12} />}
                  </button>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium" style={{ color: "#f5f5f7" }}>
                      {sample.title}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "#86868b" }}>
                      {sample.item_type === "preset" ? "Preset" : "Sample"} &middot; {CATEGORY_LABELS[sample.category] ?? sample.category}
                      {sample.bpm ? ` · ${sample.bpm} BPM` : ""}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isOwner && (
                      <span
                        className="hidden sm:inline text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{
                          background: sample.is_published ? "rgba(52,199,89,0.1)" : "rgba(255,255,255,0.05)",
                          color: sample.is_published ? "#34c759" : "#86868b",
                        }}
                      >
                        {sample.is_published ? "Publisert" : "Utkast"}
                      </span>
                    )}
                    <span className="text-xs sm:text-sm font-semibold" style={{ color: "#f5f5f7", minWidth: 40, textAlign: "right" }}>
                      {sample.price === 0 ? "Gratis" : `kr ${sample.price.toLocaleString("nb-NO")}`}
                    </span>
                    <button
                      title="Del"
                      className="hidden sm:flex items-center justify-center rounded-lg transition-colors hover:opacity-80"
                      style={{ width: 30, height: 30, color: "#86868b" }}
                      onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(`${window.location.origin}/samples/${sample.id}`); toast("Lenke kopiert!"); }}
                    >
                      <Share2 size={14} />
                    </button>
                    {isOwner && (
                      <>
                        <button
                          title="Rediger sample"
                          className="flex items-center justify-center rounded-lg transition-colors hover:opacity-80"
                          style={{ width: 30, height: 30, color: "#86868b" }}
                          onClick={(e) => { e.stopPropagation(); setEditing({ type: "sample", item: sample }); }}
                        >
                          <SquarePen size={14} />
                        </button>
                        <button
                          title="Slett sample"
                          className="flex items-center justify-center rounded-lg transition-colors hover:opacity-80"
                          style={{ width: 30, height: 30, color: "#ff3b30" }}
                          onClick={(e) => { e.stopPropagation(); deleteSample(sample.id); }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Mine remakes */}
        <section className="mb-16">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold tracking-tight" style={{ color: "#f5f5f7" }}>
              {isOwner ? "Mine remakes" : "Remakes"}
            </h2>
            {isOwner && (
              <Link
                href="/lastopp-remake"
                className="rounded-xl px-3 md:px-4 py-1.5 text-xs md:text-sm font-semibold transition-opacity hover:opacity-90 whitespace-nowrap"
                style={{ background: "#ffffff", color: "#000000" }}
              >
                Last opp remake
              </Link>
            )}
          </div>

          {remakes.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center rounded-2xl py-16"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid #1e1e1e" }}
            >
              <p className="text-sm font-medium" style={{ color: "#3a3a3a" }}>Ingen remakes enda</p>
            </div>
          ) : (
            <div>
              {remakes.map((remake) => (
                <div
                  key={remake.id}
                  className="flex items-center gap-2 md:gap-4 rounded-xl px-2 md:px-3 py-2.5 cursor-pointer transition-colors hover:bg-white/[0.03]"
                  style={{ borderBottom: "1px solid #141414" }}
                  onClick={() => router.push(`/remakes/${remake.id}`)}
                >
                  <button
                    onClick={(e) => { e.stopPropagation(); if (remake.audio_preview_url) toggleBeat(remake); }}
                    className="shrink-0 flex items-center justify-center rounded-full"
                    style={{
                      width: 32, height: 32,
                      background: currentBeat?.id === remake.id && isPlaying ? "#f5f5f7" : "rgba(255,255,255,0.06)",
                      color: currentBeat?.id === remake.id && isPlaying ? "#080808" : remake.audio_preview_url ? "#f5f5f7" : "#3a3a3a",
                      cursor: remake.audio_preview_url ? "pointer" : "default",
                    }}
                  >
                    {currentBeat?.id === remake.id && isPlaying
                      ? <Pause size={12} fill="#080808" />
                      : <Play size={12} fill="#f5f5f7" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium" style={{ color: "#f5f5f7" }}>{remake.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: "#86868b" }}>
                      remake av {remake.original_song} &middot; {remake.bpm} BPM
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
                    {isOwner && (
                      <span
                        className="hidden sm:inline text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{
                          background: remake.is_published ? "rgba(52,199,89,0.1)" : "rgba(255,255,255,0.05)",
                          color: remake.is_published ? "#34c759" : "#86868b",
                        }}
                      >
                        {remake.is_published ? "Publisert" : "Utkast"}
                      </span>
                    )}
                    <span className="text-xs sm:text-sm font-semibold" style={{ color: "#f5f5f7", minWidth: 40, textAlign: "right" }}>
                      kr {remake.price.toLocaleString("nb-NO")}
                    </span>
                    <button
                      title="Del"
                      className="hidden sm:flex items-center justify-center rounded-lg transition-colors hover:opacity-80"
                      style={{ width: 30, height: 30, color: "#86868b" }}
                      onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(`${window.location.origin}/remakes/${remake.id}`); toast("Lenke kopiert!"); }}
                    >
                      <Share2 size={14} />
                    </button>
                    {isOwner && (
                      <>
                        <button
                          title="Rediger remake"
                          className="flex items-center justify-center rounded-lg transition-colors hover:opacity-80"
                          style={{ width: 30, height: 30, color: "#86868b" }}
                          onClick={(e) => { e.stopPropagation(); setEditing({ type: "remake", item: remake }); }}
                        >
                          <SquarePen size={14} />
                        </button>
                        <button
                          title="Slett remake"
                          className="flex items-center justify-center rounded-lg transition-colors hover:opacity-80"
                          style={{ width: 30, height: 30, color: "#ff3b30" }}
                          onClick={(e) => { e.stopPropagation(); deleteRemake(remake.id); }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>

    {showStripeModal && (
      <StripeOnboardingModal
        onClose={() => {
          setShowStripeModal(false);
          // Poll Stripe account status — may take a moment to fully enable
          let attempts = 0;
          const poll = () => {
            fetch("/api/stripe/check-onboarding", { method: "POST" })
              .then((r) => r.json())
              .then((data) => {
                if (data.complete) {
                  toast("Stripe er tilkoblet!");
                  fetchProfileByUsername(usernameParam).then((p) => { if (p) setProfile(p); });
                } else if (attempts < 3) {
                  attempts++;
                  setTimeout(poll, 2000);
                } else {
                  toast("Kunne ikke bekrefte Stripe-status. Prøv å laste siden på nytt.");
                }
              })
              .catch(() => { toast("Noe gikk galt med Stripe-sjekken. Prøv å laste siden på nytt."); });
          };
          poll();
        }}
        onComplete={() => {
          setShowStripeModal(false);
          let attempts = 0;
          const poll = () => {
            fetch("/api/stripe/check-onboarding", { method: "POST" })
              .then((r) => r.json())
              .then((data) => {
                if (data.complete) {
                  toast("Stripe er tilkoblet!");
                  fetchProfileByUsername(usernameParam).then((p) => { if (p) setProfile(p); });
                } else if (attempts < 3) {
                  attempts++;
                  setTimeout(poll, 2000);
                } else {
                  toast("Kunne ikke bekrefte Stripe-status. Prøv å laste siden på nytt.");
                }
              })
              .catch(() => { toast("Noe gikk galt med Stripe-sjekken. Prøv å laste siden på nytt."); });
          };
          poll();
        }}
      />
    )}

    {avatarCropSrc && (
      <ImageCropModal
        imageSrc={avatarCropSrc}
        aspect={1}
        onCancel={() => { setAvatarCropSrc(null); if (avatarInputRef.current) avatarInputRef.current.value = ""; }}
        onCrop={(blob) => void uploadCroppedAvatar(blob)}
      />
    )}

    {/* Edit product modal */}
    {editing && (
      <EditProductModal
        type={editing.type}
        item={editing.item as never}
        onClose={() => setEditing(null)}
        onSaved={(updated) => {
          if (editing.type === "beat") setBeats((prev) => prev.map((b) => b.id === updated.id ? updated as Beat : b));
          else if (editing.type === "sample") setSamples((prev) => prev.map((s) => s.id === updated.id ? updated as Sample : s));
          else setRemakes((prev) => prev.map((r) => r.id === updated.id ? updated as Remake : r));
          toast("Endringer lagret!", "success");
        }}
      />
    )}

    {/* Delete confirmation overlay */}
    {pendingDelete && (
      <div className={`fixed ${currentBeat ? "bottom-20" : "bottom-6"} left-1/2 z-[60] -translate-x-1/2 flex items-center gap-3 rounded-2xl px-5 py-3 shadow-2xl`}
        style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", whiteSpace: "nowrap" }}
      >
        <p className="text-sm" style={{ color: "#f5f5f7" }}>
          Er du sikker på at du vil slette?
        </p>
        <button
          onClick={() => void confirmDelete()}
          className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-80"
          style={{ background: "#ff3b30", color: "#fff" }}
        >
          Slett
        </button>
        <button
          onClick={() => setPendingDelete(null)}
          className="rounded-lg px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-70"
          style={{ background: "rgba(255,255,255,0.08)", color: "#86868b" }}
        >
          Avbryt
        </button>
      </div>
    )}
    </>
  );
}
