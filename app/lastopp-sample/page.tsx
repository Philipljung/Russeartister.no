"use client";

import { useState, useRef, KeyboardEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Upload, Package, ImageIcon, AlertCircle, FolderArchive, Music } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useToast } from "@/lib/toast-context";
import { SAMPLE_CATEGORIES, PRESET_CATEGORIES, CATEGORY_LABELS } from "@/lib/sampleCategories";
import JSZip from "jszip";

const MUSICAL_KEYS = [
  "C maj","C# maj","D maj","Eb maj","E maj","F maj",
  "F# maj","G maj","Ab maj","A maj","Bb maj","B maj",
  "C min","C# min","D min","Eb min","E min","F min",
  "F# min","G min","Ab min","A min","Bb min","B min",
];

const VSTS = [
  "Serum", "Sylenth1", "Massive", "Massive X", "Nexus", "Omnisphere",
  "Spire", "Vital", "Pigments", "Phase Plant", "Diva", "FM8", "FM9",
  "Kontakt", "Analog Lab", "Roland Cloud", "Annet",
];

type ItemType = "sample" | "preset" | "sample-pack" | "preset-pack";
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

const TYPE_OPTIONS: { value: ItemType; label: string; icon: React.ReactNode }[] = [
  { value: "sample",       label: "Sample",       icon: <Music size={14} /> },
  { value: "preset",       label: "Preset",       icon: <Package size={14} /> },
  { value: "sample-pack",  label: "Sample Pack",  icon: <FolderArchive size={14} /> },
  { value: "preset-pack",  label: "Preset Pack",  icon: <FolderArchive size={14} /> },
];

async function readZipFiles(file: File): Promise<string[]> {
  const zip = await JSZip.loadAsync(file);
  const names = Object.keys(zip.files)
    .filter((name) => !zip.files[name].dir && !name.startsWith("__MACOSX"))
    .map((name) => name.split("/").pop() ?? name)
    .filter(Boolean);
  return names.sort();
}

export default function LastOppSamplePage() {
  const router = useRouter();
  const { toast } = useToast();
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

  const [itemType, setItemType] = useState<ItemType>("sample");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [genre, setGenre] = useState("");
  const [bpm, setBpm] = useState("");
  const [key, setKey] = useState("");
  const [vst, setVst] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [price, setPrice] = useState("");

  const [cover, setCover] = useState<UploadFile>(null);
  const [sampleFile, setSampleFile] = useState<UploadFile>(null);
  const [audioPreview, setAudioPreview] = useState<UploadFile>(null);
  const [packFiles, setPackFiles] = useState<string[]>([]);
  const [parsingZip, setParsing] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const coverInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioPreviewInputRef = useRef<HTMLInputElement>(null);

  const isPack = itemType === "sample-pack" || itemType === "preset-pack";
  const isPreset = itemType === "preset" || itemType === "preset-pack";
  const isSample = itemType === "sample";

  function handleTypeChange(t: ItemType) {
    setItemType(t);
    setCategory("");
    setVst("");
    setSampleFile(null);
    setAudioPreview(null);
    setPackFiles([]);
  }

  async function handleZipSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setSampleFile({ file: f });
    setParsing(true);
    try {
      const names = await readZipFiles(f);
      setPackFiles(names);
    } catch {
      setPackFiles([]);
    } finally {
      setParsing(false);
    }
  }

  function handleAudioPreviewChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const name = f.name.toLowerCase();
    if (!name.endsWith('.wav') && !name.endsWith('.mp3')) {
      setError('Lydforhåndsvisning må være WAV eller MP3.');
      if (audioPreviewInputRef.current) audioPreviewInputRef.current.value = '';
      return;
    }
    setError(null);
    setAudioPreview({ file: f });
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

    if (!title) { setError("Tittel er påkrevd."); return; }
    if (!isPack && !category) { setError("Velg kategori."); return; }
    if (isPreset && !vst) { setError("Velg VST."); return; }
    if (!sampleFile?.file) { setError(`Du må laste opp ${isPack ? "zip-filen" : isPreset ? "presetfilen" : "samplefilen"}.`); return; }
    if (isSample && sampleFile?.file) {
      const name = sampleFile.file.name.toLowerCase();
      if (!name.endsWith('.wav') && !name.endsWith('.mp3')) {
        setError('Samplefilen må være WAV eller MP3.');
        return;
      }
    }
    if (stripeReady && !price) { setError("Fyll ut pris."); return; }

    const priceNum = stripeReady ? parseInt(price) : 0;
    if (stripeReady && (isNaN(priceNum) || priceNum < 0)) { setError("Ugyldig pris."); return; }

    const bpmNum = bpm ? parseInt(bpm) : null;
    if (bpmNum !== null && (bpmNum < 40 || bpmNum > 300)) { setError("BPM må være mellom 40 og 300."); return; }

    setSubmitting(true);
    const supabase = getSupabaseClient();

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError("Du må være innlogget for å laste opp."); setSubmitting(false); return; }

      const userId = session.user.id;
      let username = session.user.user_metadata?.username as string | undefined;
      if (!username) {
        const { data: profile } = await supabase.from("profiles").select("username").eq("id", userId).single();
        username = profile?.username;
      }
      const timestamp = Date.now();

      async function uploadFile(bucket: string, file: File, suffix: string): Promise<string | null> {
        const ext = file.name.split(".").pop() ?? "bin";
        const path = `${userId}/${timestamp}_${suffix}.${ext}`;
        const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
        if (error) { console.error(`[lastopp-sample] Upload failed ${bucket}:`, error.message); return null; }
        return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
      }

      // Upload the main file to the private beat-files bucket (raw path, no public URL)
      async function uploadPrivateFile(file: File, suffix: string): Promise<string | null> {
        const ext = file.name.split(".").pop() ?? "bin";
        const path = `${userId}/${timestamp}_${suffix}.${ext}`;
        const contentType = file.type || "application/octet-stream";
        const { error: uploadErr } = await supabase.storage
          .from("beat-files")
          .upload(path, file, { contentType, upsert: false });
        if (uploadErr) { console.error("[lastopp-sample] Private upload failed:", uploadErr.message); return null; }
        return path;
      }

      const coverUrl = cover?.file ? await uploadFile("beat-covers", cover.file, "cover") : null;
      const fileUrl = await uploadPrivateFile(sampleFile.file, "file");

      let audioPreviewUrl: string | null = null;
      if (isSample && sampleFile.file) {
        audioPreviewUrl = await uploadFile("sample-previews", sampleFile.file, "preview");
      } else if (!isSample && audioPreview?.file) {
        audioPreviewUrl = await uploadFile("sample-previews", audioPreview.file, "preview");
      }

      const { data: sample, error: insertError } = await supabase
        .from("samples")
        .insert({
          producer_id: userId,
          title: title.trim(),
          description: description.trim(),
          item_type: itemType,
          category: category || itemType,
          genre: genre.trim() || null,
          bpm: bpmNum,
          key: key || null,
          vst: isPreset ? vst : null,
          tags,
          price: priceNum,
          cover_url: coverUrl,
          audio_preview_url: audioPreviewUrl,
          file_url: fileUrl,
          pack_files: isPack && packFiles.length > 0 ? packFiles : null,
          is_published: true,
        })
        .select("id")
        .single();

      if (insertError) { setError("Kunne ikke lagre: " + insertError.message); setSubmitting(false); return; }

      toast("Lastet opp!", "success");
      router.push(username ? `/profile/${username}` : "/samples");
    } catch (err) {
      console.error("[lastopp-sample] Unexpected error:", err);
      setError("Noe gikk galt. Prøv igjen.");
      setSubmitting(false);
    }
  }

  const categoriesForType = isPreset ? PRESET_CATEGORIES : SAMPLE_CATEGORIES;

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="mb-1 text-2xl font-bold tracking-tight" style={{ color: "#f5f5f7" }}>
        Last opp sample / preset
      </h1>
      <p className="mb-8 text-sm" style={{ color: "#86868b" }}>
        Del samples, presets og packs med andre produsenter.
      </p>

      {stripeReady === false && (
        <div className="mb-6 flex items-start gap-3 rounded-xl px-4 py-3" style={{ background: "rgba(255,149,0,0.08)", border: "1px solid rgba(255,149,0,0.2)" }}>
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
          <div className="flex flex-wrap gap-2">
            {TYPE_OPTIONS.map(({ value, label, icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => handleTypeChange(value)}
                className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all"
                style={{
                  background: itemType === value ? "rgba(99,102,241,0.15)" : "#141414",
                  border: `1px solid ${itemType === value ? "rgba(99,102,241,0.4)" : "#2a2a2a"}`,
                  color: itemType === value ? "#818cf8" : "#86868b",
                }}
              >
                {icon}{label}
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
            {!cover?.previewUrl && <><ImageIcon size={20} style={{ color: "#3a3a3a" }} /><span className="text-xs" style={{ color: "#3a3a3a" }}>Cover</span></>}
          </button>
          <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) setCover({ file: f, previewUrl: URL.createObjectURL(f) });
          }} />
          <div className="flex-1">
            <Label>Tittel *</Label>
            <input
              type="text"
              placeholder={isPreset ? "Dark Pad v2" : isPack ? "808 Mafia Sample Pack Vol. 1" : "Midnight Kick 01"}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              style={inputStyle}
            />
          </div>
        </div>

        {/* VST (presets only, not preset-pack) */}
        {(itemType === "preset" || itemType === "preset-pack") && (
          <div>
            <Label>VST *</Label>
            <select value={vst} onChange={(e) => setVst(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
              <option value="">Velg VST...</option>
              {VSTS.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
        )}

        {/* Category (not for packs) */}
        {!isPack && (
          <div>
            <Label>Kategori *</Label>
            <div className="flex flex-col gap-3">
              {Object.entries(categoriesForType).map(([group, cats]) => (
                <div key={group}>
                  {!isPreset && <p className="mb-1.5 text-xs" style={{ color: "#3a3a3a" }}>{group}</p>}
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
        )}

        {/* Genre + BPM + Key (samples only) */}
        {!isPack && (
          <div className="grid gap-3" style={{ gridTemplateColumns: isSample ? "1fr 1fr 1fr" : "1fr" }}>
            <div>
              <Label>Sjanger</Label>
              <input type="text" placeholder="Drill" value={genre} onChange={(e) => setGenre(e.target.value)} style={inputStyle} />
            </div>
            {isSample && (
              <>
                <div>
                  <Label>BPM</Label>
                  <input type="number" placeholder="140" value={bpm} onChange={(e) => setBpm(e.target.value)} min={40} max={300} style={inputStyle} />
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
        )}

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
                <button type="button" onClick={(e) => { e.stopPropagation(); setTags(tags.filter((t) => t !== tag)); }} style={{ color: "#86868b" }}><X size={10} /></button>
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
            placeholder={isPack ? "Hva er inkludert i pakken?" : isPreset ? "Kort beskrivelse av preseten..." : "Kort beskrivelse..."}
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
              <input type="number" placeholder="49" value={price} onChange={(e) => setPrice(e.target.value)} min={0} style={{ ...inputStyle, paddingLeft: 32 }} />
            </div>
          )}
        </div>

        {/* Filer */}
        <div className="rounded-2xl p-5 flex flex-col gap-4" style={{ background: "#0f0f0f", border: "1px solid #1e1e1e" }}>
          <p className="text-sm font-medium" style={{ color: "#86868b" }}>Filer</p>

          {/* Main file: zip for packs, preset file or sample file */}
          <div>
            {/* Optional audio preview for presets and packs */}
            {!isSample && (
              <FileRow
                label="Lydforhåndsvisning"
                hint="WAV eller MP3 — valgfritt"
                accept=".wav,.mp3,audio/wav,audio/mpeg"
                icon={<Music size={15} style={{ color: "#86868b" }} />}
                file={audioPreview?.file ?? null}
                inputRef={audioPreviewInputRef}
                onChange={handleAudioPreviewChange}
                onClear={() => { if (audioPreviewInputRef.current) audioPreviewInputRef.current.value = ''; setAudioPreview(null); }}
              />
            )}
            <FileRow
              label={isPack ? "Pack *" : isPreset ? "Presetfil *" : "Samplefil *"}
              hint={isPack ? "Alle filtyper — maks 500 MB" : isPreset ? "Alle filtyper" : "WAV eller MP3"}
              accept={isSample ? ".wav,.mp3,audio/wav,audio/mpeg" : "*"}
              icon={<Package size={15} style={{ color: "#86868b" }} />}
              file={sampleFile?.file ?? null}
              inputRef={fileInputRef}
              onChange={isPack ? handleZipSelect : (e) => { const f = e.target.files?.[0]; if (f) setSampleFile({ file: f }); }}
              onClear={() => { if (fileInputRef.current) fileInputRef.current.value = ""; setSampleFile(null); setPackFiles([]); }}
            />

            {/* File list — shown only if a zip was uploaded and parsed successfully */}
            {isPack && packFiles.length > 0 && (
              <div className="mt-3 rounded-xl px-4 py-3" style={{ background: "#141414", border: "1px solid #1e1e1e" }}>
                {parsingZip ? (
                  <p className="text-xs" style={{ color: "#86868b" }}>Leser filen...</p>
                ) : (
                  <>
                    <p className="text-xs font-medium mb-2" style={{ color: "#86868b" }}>{packFiles.length} filer funnet</p>
                    <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                      {packFiles.map((name, i) => (
                        <p key={i} className="text-xs font-mono truncate" style={{ color: "#4a4a4a" }}>{name}</p>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Anti-scam warning */}
          <div className="flex items-start gap-3 rounded-xl px-4 py-3 mt-1" style={{ background: "rgba(255,59,48,0.06)", border: "1px solid rgba(255,59,48,0.18)" }}>
            <AlertCircle size={15} style={{ color: "#ff3b30", flexShrink: 0, marginTop: 1 }} />
            <p className="text-xs leading-relaxed" style={{ color: "#86868b" }}>
              Last opp riktige filer og korrekt informasjon. Svindel, falsk innhold eller manipulering av kjøpere vil føre til umiddelbar utestengelse og at utbetalinger stoppes.
            </p>
          </div>
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
              <span className="flex items-center gap-2"><Upload size={14} />Publiser</span>
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

function FileRow({
  label, hint, accept, icon, file, inputRef, onChange, onClear,
}: {
  label: string; hint: string; accept: string; icon: React.ReactNode;
  file: File | null; inputRef: React.RefObject<HTMLInputElement | null>;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-2.5 min-w-0">
        {icon}
        <div className="min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: "#f5f5f7" }}>{file ? file.name : label}</p>
          <p className="text-xs mt-0.5" style={{ color: "#3a3a3a" }}>{file ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : hint}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {file && (
          <button type="button" onClick={onClear} className="rounded-lg p-1.5" style={{ color: "#86868b" }}><X size={13} /></button>
        )}
        <button type="button" onClick={() => inputRef.current?.click()} className="rounded-lg px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-80" style={{ background: "rgba(255,255,255,0.08)", color: "#f5f5f7" }}>
          {file ? "Bytt" : "Velg fil"}
        </button>
      </div>
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={onChange} />
    </div>
  );
}
