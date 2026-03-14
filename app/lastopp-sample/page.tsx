"use client";

import { useState, useRef, KeyboardEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Upload, Package, ImageIcon, AlertCircle, Music } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase/client";
import Link from "next/link";
import { SAMPLE_CATEGORIES, PRESET_CATEGORIES, CATEGORY_LABELS } from "@/lib/sampleCategories";

const MUSICAL_KEYS = [
  "C maj","C# maj","D maj","Eb maj","E maj","F maj",
  "F# maj","G maj","Ab maj","A maj","Bb maj","B maj",
  "C min","C# min","D min","Eb min","E min","F min",
  "F# min","G min","Ab min","A min","Bb min","B min",
];


type UploadFile = { file: File; previewUrl?: string } | null;

const inputStyle: React.CSSProperties = {
  background: "#141414",
  border: "1px solid #2a2a2a",
  borderRadius: 12,
  padding: "10px 14px",
  fontSize: 13,
  color: "#f5f5f7",
  outline: "none",
  width: "100%",
};

function Label({ children }: { children: React.ReactNode }) {
  return <p className="mb-1.5 text-xs font-medium" style={{ color: "#86868b" }}>{children}</p>;
}

export default function LastOppSamplePage() {
  const router = useRouter();
  const [stripeReady, setStripeReady] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = getSupabaseClient();
    supabase.auth.getSession().then(async ({ data: { session } }: { data: { session: import("@supabase/supabase-js").Session | null } }) => {
      if (!session) { setStripeReady(false); return; }
      const { data } = await supabase
        .from("profiles")
        .select("stripe_onboarding_complete")
        .eq("id", session.user.id)
        .single();
      setStripeReady(data?.stripe_onboarding_complete ?? false);
    });
  }, []);

  // Form state
  const [itemType, setItemType] = useState<"sample" | "preset">("sample");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [genre, setGenre] = useState("");
  const [bpm, setBpm] = useState("");
  const [key, setKey] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [price, setPrice] = useState("");
  const [isPublished, setIsPublished] = useState(true);

  // Files
  const [cover, setCover] = useState<UploadFile>(null);
  const [sampleFile, setSampleFile] = useState<UploadFile>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const coverInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset category when type changes
  function handleTypeChange(t: "sample" | "preset") {
    setItemType(t);
    setCategory("");
  }

  function addTag() {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g, "-");
    if (t && !tags.includes(t) && tags.length < 6) setTags([...tags, t]);
    setTagInput("");
  }

  function handleTagKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); }
    if (e.key === "Backspace" && !tagInput && tags.length > 0) setTags(tags.slice(0, -1));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title || !category) {
      setError("Fyll ut alle obligatoriske felt.");
      return;
    }
    if (stripeReady && !price) {
      setError("Fyll ut pris.");
      return;
    }

    const priceNum = stripeReady ? parseInt(price) : 0;
    if (stripeReady && (isNaN(priceNum) || priceNum < 0)) {
      setError("Ugyldig pris.");
      return;
    }

    const bpmNum = bpm ? parseInt(bpm) : null;
    if (bpmNum !== null && (bpmNum < 40 || bpmNum > 300)) {
      setError("BPM må være mellom 40 og 300.");
      return;
    }

    setSubmitting(true);
    const supabase = getSupabaseClient();

    try {
      const { data: { session } } = await supabase.auth.getSession();
      console.log("[lastopp-sample] Session user:", session?.user?.email ?? "none");

      if (!session) {
        setError("Du må være innlogget for å laste opp.");
        setSubmitting(false);
        return;
      }

      const userId = session.user.id;
      const username = session.user.user_metadata?.username as string;
      const timestamp = Date.now();

      async function uploadFile(bucket: string, file: File, suffix: string): Promise<string | null> {
        const ext = file.name.split(".").pop() ?? "bin";
        const path = `${userId}/${timestamp}_${suffix}.${ext}`;
        console.log(`[lastopp-sample] Uploading to ${bucket}/${path}`);
        const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
        if (error) { console.error(`[lastopp-sample] Upload failed ${bucket}:`, error.message); return null; }
        const { data } = supabase.storage.from(bucket).getPublicUrl(path);
        return data.publicUrl;
      }

      const coverUrl = cover?.file ? await uploadFile("beat-covers", cover.file, "cover") : null;

      // Sample file is uploaded to public bucket for playback + download
      const audioUrl = sampleFile?.file ? await uploadFile("sample-previews", sampleFile.file, "sample") : null;

      console.log("[lastopp-sample] Inserting sample row...");
      const { data: sample, error: insertError } = await supabase
        .from("samples")
        .insert({
          producer_id: userId,
          title: title.trim(),
          description: description.trim(),
          item_type: itemType,
          category,
          genre: genre.trim(),
          bpm: bpmNum,
          key: key || null,
          tags,
          price: priceNum,
          cover_url: coverUrl,
          audio_preview_url: audioUrl,
          file_url: audioUrl,
          is_published: isPublished,
        })
        .select("id")
        .single();

      if (insertError) {
        console.error("[lastopp-sample] Insert failed:", insertError.message);
        setError("Kunne ikke lagre: " + insertError.message);
        setSubmitting(false);
        return;
      }

      console.log("[lastopp-sample] Created sample:", sample.id, "— redirecting to profile");
      router.push(`/profile/${username}`);
    } catch (err) {
      console.error("[lastopp-sample] Unexpected error:", err);
      setError("Noe gikk galt. Prøv igjen.");
      setSubmitting(false);
    }
  }

  const categoriesForType = itemType === "sample" ? SAMPLE_CATEGORIES : PRESET_CATEGORIES;

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="mb-1 text-2xl font-bold tracking-tight" style={{ color: "#f5f5f7" }}>
        Last opp sample / preset
      </h1>
      <p className="mb-8 text-sm" style={{ color: "#86868b" }}>
        Del samples og presets med andre produsenter.
      </p>

      {/* Anti-scam warning */}
      <div
        className="mb-6 flex items-start gap-3 rounded-xl px-4 py-3"
        style={{ background: "rgba(255,59,48,0.06)", border: "1px solid rgba(255,59,48,0.18)" }}
      >
        <AlertCircle size={16} style={{ color: "#ff3b30", flexShrink: 0, marginTop: 2 }} />
        <p className="text-xs leading-relaxed" style={{ color: "#86868b" }}>
          Last opp riktige filer og korrekt informasjon. Svindel, falsk innhold eller manipulering av kjøpere vil føre til umiddelbar utestengelse og at utbetalinger stoppes. Vi tar alle brudd svært alvorlig.
        </p>
      </div>

      {stripeReady === false && (
        <div
          className="mb-6 flex items-start gap-3 rounded-xl px-4 py-3"
          style={{ background: "rgba(255,149,0,0.08)", border: "1px solid rgba(255,149,0,0.2)" }}
        >
          <AlertCircle size={16} style={{ color: "#ff9500", flexShrink: 0, marginTop: 2 }} />
          <div>
            <p className="text-sm font-medium" style={{ color: "#ff9500" }}>Stripe ikke konfigurert</p>
            <p className="mt-0.5 text-xs" style={{ color: "#86868b" }}>
              Innholdet blir gratis inntil du{" "}
              <Link href="/profile" className="underline" style={{ color: "#ff9500" }}>setter opp Stripe</Link>.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">

        {/* Type toggle */}
        <div>
          <Label>Type *</Label>
          <div className="flex gap-2">
            {(["sample", "preset"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => handleTypeChange(t)}
                className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all"
                style={{
                  background: itemType === t ? "rgba(99,102,241,0.15)" : "#141414",
                  border: `1px solid ${itemType === t ? "rgba(99,102,241,0.4)" : "#2a2a2a"}`,
                  color: itemType === t ? "#818cf8" : "#86868b",
                }}
              >
                {t === "sample" ? <Music size={14} /> : <Package size={14} />}
                {t === "sample" ? "Sample" : "Preset"}
              </button>
            ))}
          </div>
        </div>

        {/* Cover + tittel */}
        <div className="flex gap-5 items-start">
          <button
            type="button"
            onClick={() => coverInputRef.current?.click()}
            className="shrink-0 rounded-2xl transition-opacity hover:opacity-80 overflow-hidden"
            style={{
              width: 100, height: 100,
              backgroundColor: cover?.previewUrl ? "transparent" : "#141414",
              backgroundImage: cover?.previewUrl ? `url(${cover.previewUrl})` : "none",
              backgroundSize: "cover", backgroundPosition: "center",
              border: "1px solid #2a2a2a",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6,
            }}
          >
            {!cover?.previewUrl && (
              <>
                <ImageIcon size={20} style={{ color: "#3a3a3a" }} />
                <span className="text-xs" style={{ color: "#3a3a3a" }}>Cover</span>
              </>
            )}
          </button>
          <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) setCover({ file: f, previewUrl: URL.createObjectURL(f) });
          }} />

          <div className="flex-1">
            <Label>Tittel *</Label>
            <input
              type="text"
              placeholder={itemType === "preset" ? "Dark Pad v2" : "Midnight Kick 01"}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              style={inputStyle}
            />
          </div>
        </div>

        {/* Category */}
        <div>
          <Label>Kategori *</Label>
          <div className="flex flex-col gap-3">
            {Object.entries(categoriesForType).map(([group, cats]) => (
              <div key={group}>
                {itemType === "sample" && (
                  <p className="mb-1.5 text-xs" style={{ color: "#3a3a3a" }}>{group}</p>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {(cats as readonly string[]).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className="rounded-xl px-3 py-1.5 text-xs transition-all"
                      style={{
                        background: category === cat ? "rgba(99,102,241,0.15)" : "#141414",
                        border: `1px solid ${category === cat ? "rgba(99,102,241,0.4)" : "#2a2a2a"}`,
                        color: category === cat ? "#818cf8" : "#86868b",
                      }}
                    >
                      {CATEGORY_LABELS[cat]}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Genre + BPM + Key */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label>Sjanger</Label>
            <input
              type="text"
              placeholder="Drill"
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              style={inputStyle}
            />
          </div>
          {itemType === "sample" && (
            <>
              <div>
                <Label>BPM</Label>
                <input
                  type="number"
                  placeholder="140"
                  value={bpm}
                  onChange={(e) => setBpm(e.target.value)}
                  min={40}
                  max={300}
                  style={inputStyle}
                />
              </div>
              <div>
                <Label>Skala</Label>
                <select value={key} onChange={(e) => setKey(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                  <option value="">Ingen</option>
                  {MUSICAL_KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
            </>
          )}
        </div>

        {/* Tags */}
        <div>
          <Label>Tags (maks 6)</Label>
          <div
            className="flex flex-wrap items-center gap-2 rounded-xl px-3 py-2.5 min-h-[44px]"
            style={{ background: "#141414", border: "1px solid #2a2a2a" }}
            onClick={() => document.getElementById("sample-tag-input")?.focus()}
          >
            {tags.map((tag) => (
              <span key={tag} className="flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs" style={{ background: "rgba(255,255,255,0.08)", color: "#f5f5f7" }}>
                {tag}
                <button type="button" onClick={(e) => { e.stopPropagation(); setTags(tags.filter((t) => t !== tag)); }} style={{ color: "#86868b" }}>
                  <X size={10} />
                </button>
              </span>
            ))}
            {tags.length < 6 && (
              <input
                id="sample-tag-input"
                type="text"
                placeholder={tags.length === 0 ? "Legg til tags..." : ""}
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                onBlur={addTag}
                style={{ background: "transparent", border: "none", outline: "none", color: "#f5f5f7", fontSize: 13, minWidth: 120 }}
              />
            )}
          </div>
          <p className="mt-1 text-xs" style={{ color: "#3a3a3a" }}>Trykk Enter eller komma for å legge til</p>
        </div>

        {/* Beskrivelse */}
        <div>
          <Label>Beskrivelse</Label>
          <textarea
            placeholder={itemType === "preset" ? "Kort beskrivelse av preseten..." : "Kort beskrivelse..."}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
          />
        </div>

        {/* Pris */}
        <div style={{ maxWidth: 200 }}>
          <Label>Pris (kr) {stripeReady ? "*" : ""}</Label>
          {stripeReady === false ? (
            <div className="flex items-center gap-2 rounded-xl px-3.5 py-2.5" style={{ background: "#141414", border: "1px solid #2a2a2a", opacity: 0.5 }}>
              <span className="text-sm" style={{ color: "#86868b" }}>kr</span>
              <span className="text-sm font-semibold" style={{ color: "#86868b" }}>Gratis</span>
            </div>
          ) : (
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm" style={{ color: "#86868b" }}>kr</span>
              <input
                type="number"
                placeholder="49"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                min={0}
                style={{ ...inputStyle, paddingLeft: 32 }}
              />
            </div>
          )}
        </div>

        {/* Filer */}
        <div className="rounded-2xl p-5 flex flex-col gap-4" style={{ background: "#0f0f0f", border: "1px solid #1e1e1e" }}>
          <p className="text-sm font-medium" style={{ color: "#86868b" }}>Filer</p>

          {/* Sample/preset file */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 min-w-0">
              <Package size={15} style={{ color: "#86868b" }} />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: "#f5f5f7" }}>
                  {sampleFile?.file ? sampleFile.file.name : itemType === "preset" ? "Presetfil" : "Sampelfil"}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "#3a3a3a" }}>
                  {sampleFile?.file
                    ? `${(sampleFile.file.size / 1024 / 1024).toFixed(1)} MB`
                    : itemType === "preset"
                      ? "Alle filformater — TODO: begrens til relevante presetformater"  // TODO: restrict to preset file types (.nki, .xpf, .fxp, etc.)
                      : "WAV eller MP3"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {sampleFile?.file && (
                <button type="button" onClick={() => { if (fileInputRef.current) fileInputRef.current.value = ""; setSampleFile(null); }} className="rounded-lg p-1.5" style={{ color: "#86868b" }}>
                  <X size={13} />
                </button>
              )}
              <button type="button" onClick={() => fileInputRef.current?.click()} className="rounded-lg px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-80" style={{ background: "rgba(255,255,255,0.08)", color: "#f5f5f7" }}>
                {sampleFile?.file ? "Bytt" : "Velg fil"}
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept={itemType === "sample" ? "audio/*" : "*"} // TODO: restrict preset formats
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) setSampleFile({ file: f }); }}
            />
          </div>
        </div>

        {/* Publiser toggle */}
        <div className="flex items-center justify-between rounded-xl px-4 py-3" style={{ background: "#141414", border: "1px solid #2a2a2a" }}>
          <div>
            <p className="text-sm font-medium" style={{ color: "#f5f5f7" }}>Publiser nå</p>
            <p className="text-xs mt-0.5" style={{ color: "#86868b" }}>Slå av for å lagre som utkast</p>
          </div>
          <button
            type="button"
            onClick={() => setIsPublished(!isPublished)}
            className="relative rounded-full transition-colors"
            style={{ width: 44, height: 26, background: isPublished ? "#0071e3" : "#2a2a2a", flexShrink: 0 }}
          >
            <div className="absolute top-1 rounded-full transition-all" style={{ width: 18, height: 18, background: "#f5f5f7", left: isPublished ? 22 : 4 }} />
          </button>
        </div>

        {error && <p className="text-sm" style={{ color: "#ff453a" }}>{error}</p>}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl px-6 py-2.5 text-sm font-semibold transition-opacity disabled:opacity-50"
            style={{ background: "#0071e3", color: "#fff" }}
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-transparent" style={{ borderTopColor: "rgba(255,255,255,0.8)" }} />
                Laster opp...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Upload size={14} />
                {isPublished ? "Publiser" : "Lagre utkast"}
              </span>
            )}
          </button>
          <button type="button" onClick={() => router.back()} className="rounded-xl px-4 py-2.5 text-sm transition-opacity hover:opacity-80" style={{ color: "#86868b" }}>
            Avbryt
          </button>
        </div>
      </form>
    </div>
  );
}
