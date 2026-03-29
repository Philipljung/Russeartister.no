"use client";

import { useState, useRef, KeyboardEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Upload, Music, FileArchive, ImageIcon, AlertCircle } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { fetchExistingGenres } from "@/lib/fetchRemakes";
import GenreAutocomplete from "@/components/GenreAutocomplete";
import Link from "next/link";
import { useToast } from "@/lib/toast-context";
import ImageCropModal from "@/components/ImageCropModal";

const DAWS = ["Ableton Live", "FL Studio", "Logic Pro", "Pro Tools", "Cubase", "Reason", "GarageBand", "Studio One", "Bitwig", "Reaper", "Annen"];

const MUSICAL_KEYS = [
  "C maj","C# maj","D maj","Eb maj","E maj","F maj",
  "F# maj","G maj","Ab maj","A maj","Bb maj","B maj",
  "C min","C# min","D min","Eb min","E min","F min",
  "F# min","G min","Ab min","A min","Bb min","B min",
];

type UploadFile = { file: File; previewUrl?: string } | null;

export default function LastOppPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [stripeReady, setStripeReady] = useState<boolean | null>(null); // null = loading

  useEffect(() => {
    const supabase = getSupabaseClient();
    fetchExistingGenres().then(setExistingGenres);
    supabase.from("beats").select("vsts").not("vsts", "is", null).then(({ data }: { data: { vsts: string[] | null }[] | null }) => {
      if (!data) return;
      const all: string[] = data.flatMap((r) => r.vsts ?? []);
      setKnownVsts(Array.from(new Set(all)).sort());
    });
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
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [genre, setGenre] = useState("");
  const [bpm, setBpm] = useState("");
  const [key, setKey] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [price, setPrice] = useState("");
  const [vocalType, setVocalType] = useState<"med_vokal" | "uten_vokal" | "">("");
  const [daw, setDaw] = useState("");
  const [selectedVsts, setSelectedVsts] = useState<string[]>([]);
  const [vstInput, setVstInput] = useState("");
  const [knownVsts, setKnownVsts] = useState<string[]>([]);
  const [exclusiveEnabled, setExclusiveEnabled] = useState(false);
  const [exclusivePrice, setExclusivePrice] = useState("");
  const [isPublished, setIsPublished] = useState(true);

  // Files
  const [cover, setCover] = useState<UploadFile>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [audioPreview, setAudioPreview] = useState<UploadFile>(null);
  const [projectFile, setProjectFile] = useState<UploadFile>(null);

  const [existingGenres, setExistingGenres] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const coverInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const projectInputRef = useRef<HTMLInputElement>(null);

  function addTag() {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g, "-");
    if (t && !tags.includes(t) && tags.length < 6) {
      setTags([...tags, t]);
    }
    setTagInput("");
  }

  function handleTagKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag();
    }
    if (e.key === "Backspace" && !tagInput && tags.length > 0) {
      setTags(tags.slice(0, -1));
    }
  }

  function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCropSrc(URL.createObjectURL(file));
  }

  const MAX_PROJECT_FILE_BYTES = 500 * 1024 * 1024; // 500 MB

  function handleProjectChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_PROJECT_FILE_BYTES) {
      setError(`Prosjektfilen er for stor (${(file.size / 1024 / 1024).toFixed(0)} MB). Maks 500 MB.`);
      if (projectInputRef.current) projectInputRef.current.value = "";
      return;
    }
    setError(null);
    setProjectFile({ file });
  }

  function handleAudioChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const name = file.name.toLowerCase();
    if (!name.endsWith(".wav") && !name.endsWith(".mp3")) {
      setError("Lydforhåndsvisning må være WAV eller MP3.");
      if (audioInputRef.current) audioInputRef.current.value = "";
      return;
    }
    setError(null);
    setAudioPreview({ file });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title || !genre || !bpm) {
      setError("Fyll ut alle obligatoriske felt.");
      return;
    }
    if (!audioPreview?.file) {
      setError("Du må laste opp en lydforhåndsvisning.");
      return;
    }
    if (stripeReady && !price) {
      setError("Fyll ut alle obligatoriske felt.");
      return;
    }

    const bpmNum = parseInt(bpm);
    const priceNum = stripeReady ? parseInt(price) : 0;

    if (bpmNum < 60 || bpmNum > 220) {
      setError("BPM må være mellom 60 og 220.");
      return;
    }
    if (stripeReady && priceNum < 100) {
      setError("Pris må være minst kr 100.");
      return;
    }

    let exclusivePriceNum: number | null = null;
    if (stripeReady && exclusiveEnabled) {
      exclusivePriceNum = parseInt(exclusivePrice);
      if (isNaN(exclusivePriceNum) || exclusivePriceNum < 100) {
        setError("Eksklusiv pris må være minst kr 100.");
        return;
      }
      if (exclusivePriceNum <= priceNum) {
        setError("Eksklusiv pris må være høyere enn vanlig pris.");
        return;
      }
    }

    setSubmitting(true);

    const supabase = getSupabaseClient();

    // 1. Get current user from session (no network call)
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setError("Du må være innlogget for å laste opp beats.");
      setSubmitting(false);
      return;
    }

    const userId = session.user.id;
    let username = session.user.user_metadata?.username as string | undefined;
    if (!username) {
      const { data: profile } = await supabase.from("profiles").select("username").eq("id", userId).single();
      username = profile?.username;
    }
    const timestamp = Date.now();

    // Helper: upload a file and return its public URL (or null on failure)
    async function uploadFile(
      bucket: string,
      file: File,
      suffix: string
    ): Promise<string | null> {
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `${userId}/${timestamp}_${suffix}.${ext}`;
      const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
      if (error) {
        console.error(`[lastopp] Upload failed for ${bucket}:`, error.message);
        return null;
      }
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      return data.publicUrl;
    }

    // 2. Upload files (cover + audio preview are public; project file is private)
    const coverUrl = cover?.file ? await uploadFile("beat-covers", cover.file, "cover") : null;
    const audioUrl = audioPreview?.file ? await uploadFile("beat-previews", audioPreview.file, "preview") : null;

    // Project file: private bucket, store path only (not a public URL)
    let projectFileUrl: string | null = null;
    if (projectFile?.file) {
      const ext = projectFile.file.name.split(".").pop() ?? "bin";
      const path = `${userId}/${timestamp}_project.${ext}`;
      const { error } = await supabase.storage.from("beat-files").upload(path, projectFile.file, { upsert: false });
      if (error) {
        console.error("[lastopp] Project file upload failed:", error.message);
      } else {
        projectFileUrl = path; // store path, not public URL
      }
    }

    // 3. Insert beat row
    const { data: beat, error: insertError } = await supabase
      .from("beats")
      .insert({
        producer_id: userId,
        title: title.trim(),
        description: description.trim(),
        genre: genre.trim().split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" "),
        bpm: bpmNum,
        key: key || null,
        tags,
        price: priceNum,
        exclusive_price: exclusivePriceNum,
        vocal_type: vocalType || null,
        daw: daw || null,
        vsts: selectedVsts.length > 0 ? selectedVsts : null,
        cover_url: coverUrl,
        audio_preview_url: audioUrl,
        project_file_url: projectFileUrl,
        is_published: true,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("[lastopp] Insert failed:", insertError.message);
      setError("Kunne ikke lagre beat: " + insertError.message);
      setSubmitting(false);
      return;
    }

    toast("Lastet opp!", "success");
    router.push(username ? `/profile/${username}` : "/later");
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1
        className="mb-1 text-2xl font-bold tracking-tight"
        style={{ color: "#f5f5f7" }}
      >
        Last opp beat
      </h1>
      <p className="mb-8 text-sm" style={{ color: "#86868b" }}>
        Fyll ut informasjon om låten din.
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
            <p className="text-sm font-medium" style={{ color: "#ff9500" }}>
              Stripe ikke konfigurert
            </p>
            <p className="mt-0.5 text-xs" style={{ color: "#86868b" }}>
              Låten blir gratis inntil du{" "}
              <Link href="/profile" className="underline" style={{ color: "#ff9500" }}>
                setter opp Stripe
              </Link>{" "}
              for å begynne å tjene penger.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">

        {/* Cover + tittel row */}
        <div className="flex gap-5 items-start">
          {/* Cover upload */}
          <button
            type="button"
            onClick={() => coverInputRef.current?.click()}
            className="shrink-0 rounded-2xl transition-opacity hover:opacity-80 overflow-hidden"
            style={{
              width: 100,
              height: 100,
              background: cover?.previewUrl
                ? undefined
                : "#141414",
              backgroundImage: cover?.previewUrl
                ? `url(${cover.previewUrl})`
                : undefined,
              backgroundSize: "cover",
              backgroundPosition: "center",
              border: "1px solid #2a2a2a",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            {!cover?.previewUrl && (
              <>
                <ImageIcon size={20} style={{ color: "#3a3a3a" }} />
                <span className="text-xs" style={{ color: "#3a3a3a" }}>
                  Cover
                </span>
              </>
            )}
          </button>
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleCoverChange}
          />

          {/* Tittel */}
          <div className="flex-1">
            <Label>Tittel *</Label>
            <input
              type="text"
              placeholder="Tittel"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              style={inputStyle}
            />
          </div>
        </div>

        {/* Genre + BPM + Key */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label>Sjanger *</Label>
            <GenreAutocomplete
              value={genre}
              onChange={setGenre}
              existingGenres={existingGenres}
              inputStyle={inputStyle}
            />
          </div>
          <div>
            <Label>BPM *</Label>
            <input
              type="number"
              placeholder="140"
              value={bpm}
              onChange={(e) => setBpm(e.target.value)}
              min={60}
              max={220}
              required
              style={inputStyle}
            />
          </div>
          <div>
            <Label>Skala</Label>
            <select
              value={key}
              onChange={(e) => setKey(e.target.value)}
              style={{ ...inputStyle, cursor: "pointer" }}
            >
              <option value="">Velg...</option>
              {MUSICAL_KEYS.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Vokal */}
        <div>
          <Label>Vokal</Label>
          <div className="flex gap-2">
            {(["med_vokal", "uten_vokal"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setVocalType(vocalType === v ? "" : v)}
                className="rounded-xl px-4 py-2 text-sm font-medium transition-all"
                style={{
                  background: vocalType === v ? "rgba(99,102,241,0.12)" : "#141414",
                  border: `1px solid ${vocalType === v ? "rgba(99,102,241,0.4)" : "#2a2a2a"}`,
                  color: vocalType === v ? "#818cf8" : "#86868b",
                  cursor: "pointer",
                }}
              >
                {v === "med_vokal" ? "Med vokal" : "Uten vokal"}
              </button>
            ))}
          </div>
        </div>

        {/* DAW */}
        <div>
          <Label>DAW</Label>
          <select value={daw} onChange={(e) => setDaw(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
            <option value="">Velg DAW...</option>
            {DAWS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        {/* VST / Plugins */}
        <div>
          <Label>VST / Plugins brukt</Label>
          <div
            className="flex flex-wrap items-center gap-2 rounded-xl px-3 py-2.5 min-h-[44px]"
            style={{ background: "#141414", border: "1px solid #2a2a2a" }}
            onClick={() => document.getElementById("vst-input-beat")?.focus()}
          >
            {selectedVsts.map((v) => (
              <span key={v} className="flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs" style={{ background: "rgba(99,102,241,0.15)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.3)" }}>
                {v}
                <button type="button" onClick={(e) => { e.stopPropagation(); setSelectedVsts(selectedVsts.filter((x) => x !== v)); }} style={{ color: "#818cf8" }}>
                  <X size={10} />
                </button>
              </span>
            ))}
            <input
              id="vst-input-beat"
              type="text"
              placeholder={selectedVsts.length === 0 ? "Serum, Sylenth1, Massive..." : ""}
              value={vstInput}
              onChange={(e) => setVstInput(e.target.value)}
              onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  const v = vstInput.trim();
                  if (v && !selectedVsts.includes(v)) setSelectedVsts([...selectedVsts, v]);
                  setVstInput("");
                }
                if (e.key === "Backspace" && !vstInput && selectedVsts.length > 0) {
                  setSelectedVsts(selectedVsts.slice(0, -1));
                }
              }}
              onBlur={() => {
                const v = vstInput.trim();
                if (v && !selectedVsts.includes(v)) setSelectedVsts([...selectedVsts, v]);
                setVstInput("");
              }}
              style={{ background: "transparent", border: "none", outline: "none", color: "#f5f5f7", fontSize: 13, minWidth: 120 }}
            />
          </div>
          <p className="mt-1 text-xs" style={{ color: "#3a3a3a" }}>Trykk Enter eller komma for å legge til</p>
          {knownVsts.filter((v) => !selectedVsts.includes(v) && (vstInput === "" || v.toLowerCase().includes(vstInput.toLowerCase()))).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {knownVsts
                .filter((v) => !selectedVsts.includes(v) && (vstInput === "" || v.toLowerCase().includes(vstInput.toLowerCase())))
                .slice(0, 12)
                .map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => { setSelectedVsts([...selectedVsts, v]); setVstInput(""); }}
                    className="rounded-full px-2.5 py-0.5 text-xs transition-all"
                    style={{ background: "transparent", border: "1px solid #2a2a2a", color: "#3a3a3a" }}
                  >
                    + {v}
                  </button>
                ))}
            </div>
          )}
        </div>

        {/* Tags */}
        <div>
          <Label>Tags (maks 6)</Label>
          <div
            className="flex flex-wrap items-center gap-2 rounded-xl px-3 py-2.5 min-h-[44px]"
            style={{ background: "#141414", border: "1px solid #2a2a2a" }}
            onClick={() => document.getElementById("tag-input")?.focus()}
          >
            {tags.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs"
                style={{ background: "rgba(255,255,255,0.08)", color: "#f5f5f7" }}
              >
                {tag}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setTags(tags.filter((t) => t !== tag)); }}
                  style={{ color: "#86868b" }}
                >
                  <X size={10} />
                </button>
              </span>
            ))}
            {tags.length < 6 && (
              <input
                id="tag-input"
                type="text"
                placeholder={tags.length === 0 ? "Legg til tags..." : ""}
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                onBlur={addTag}
                style={{
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "#f5f5f7",
                  fontSize: 13,
                  minWidth: 120,
                }}
              />
            )}
          </div>
          <p className="mt-1 text-xs" style={{ color: "#3a3a3a" }}>
            Trykk Enter eller komma for å legge til
          </p>
        </div>

        {/* Beskrivelse */}
        <div>
          <Label>Beskrivelse</Label>
          <textarea
            placeholder="Kort beskrivelse av låten..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            style={{
              ...inputStyle,
              resize: "vertical",
              lineHeight: 1.6,
            }}
          />
        </div>

        {/* Pris */}
        <div style={{ maxWidth: 200 }}>
          <Label>Pris (kr) {stripeReady ? "*" : ""}</Label>
          {stripeReady === false ? (
            <div
              className="flex items-center gap-2 rounded-xl px-3.5 py-2.5"
              style={{ background: "#141414", border: "1px solid #2a2a2a", opacity: 0.5 }}
            >
              <span className="text-sm" style={{ color: "#86868b" }}>kr</span>
              <span className="text-sm font-semibold" style={{ color: "#86868b" }}>Gratis</span>
            </div>
          ) : (
            <div className="relative">
              <span
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm"
                style={{ color: "#86868b" }}
              >
                kr
              </span>
              <input
                type="number"
                placeholder="299"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                min={100}
                required
                style={{ ...inputStyle, paddingLeft: 32 }}
              />
            </div>
          )}
        </div>

        {/* Eksklusiv lisens */}
        {stripeReady && (
          <div className="rounded-2xl p-5 flex flex-col gap-4" style={{ background: "#0f0f0f", border: "1px solid #1e1e1e" }}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="text-sm font-semibold" style={{ color: "#f5f5f7" }}>Tilby eksklusivt kjøp</p>
                <p className="mt-1 text-xs leading-relaxed" style={{ color: "#86868b" }}>
                  Med eksklusiv lisens kan én kjøper betale en høyere pris for å eie låten alene, det fjernes fra salg umiddelbart etter kjøpet. Eksklusivt kjøp tilbys kun til den første kjøperen: har noen allerede kjøpt vanlig lisens, er dette alternativet ikke lenger tilgjengelig.
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setExclusiveEnabled(!exclusiveEnabled); if (exclusiveEnabled) setExclusivePrice(""); }}
                className="relative rounded-full transition-colors shrink-0"
                style={{ width: 44, height: 26, background: exclusiveEnabled ? "#0071e3" : "#2a2a2a", marginTop: 2 }}
              >
                <div className="absolute top-1 rounded-full transition-all" style={{ width: 18, height: 18, background: "#f5f5f7", left: exclusiveEnabled ? 22 : 4 }} />
              </button>
            </div>

            {exclusiveEnabled && (
              <div style={{ maxWidth: 200 }}>
                <Label>Eksklusiv pris (kr) *</Label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm" style={{ color: "#86868b" }}>kr</span>
                  <input
                    type="number"
                    placeholder="2999"
                    value={exclusivePrice}
                    onChange={(e) => setExclusivePrice(e.target.value)}
                    min={100}
                    style={{ ...inputStyle, paddingLeft: 32 }}
                  />
                </div>
                <p className="mt-1.5 text-xs" style={{ color: "#3a3a3a" }}>Må være høyere enn vanlig pris</p>
              </div>
            )}
          </div>
        )}

        {/* Filer */}
        <div
          className="rounded-2xl p-5 flex flex-col gap-4"
          style={{ background: "#0f0f0f", border: "1px solid #1e1e1e" }}
        >
          <p className="text-sm font-medium" style={{ color: "#86868b" }}>
            Filer
          </p>

          <FileRow
            label="Lydforhåndsvisning *"
            hint="MP3 eller WAV, maks 30 MB"
            accept=".wav,.mp3,audio/wav,audio/mpeg"
            icon={<Music size={15} style={{ color: "#86868b" }} />}
            file={audioPreview?.file ?? null}
            inputRef={audioInputRef}
            onChange={handleAudioChange}
          />

          <FileRow
            label="Prosjektfil"
            hint="Alle filtyper — maks 500 MB"
            accept="*"
            icon={<FileArchive size={15} style={{ color: "#86868b" }} />}
            file={projectFile?.file ?? null}
            inputRef={projectInputRef}
            onChange={handleProjectChange}
          />
        </div>

        {error && (
          <p className="text-sm" style={{ color: "#ff453a" }}>
            {error}
          </p>
        )}

        {/* Submit */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl px-6 py-2.5 text-sm font-semibold transition-opacity disabled:opacity-50"
            style={{ background: "#0071e3", color: "#fff" }}
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <span
                  className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-transparent"
                  style={{ borderTopColor: "rgba(255,255,255,0.8)" }}
                />
                Laster opp...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Upload size={14} />
                Publiser beat
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-xl px-4 py-2.5 text-sm transition-opacity hover:opacity-80"
            style={{ color: "#86868b" }}
          >
            Avbryt
          </button>
        </div>
      </form>

      {cropSrc && (
        <ImageCropModal
          imageSrc={cropSrc}
          aspect={1}
          onCancel={() => { setCropSrc(null); if (coverInputRef.current) coverInputRef.current.value = ""; }}
          onCrop={(blob) => {
            const file = new File([blob], "cover.webp", { type: "image/webp" });
            const previewUrl = URL.createObjectURL(blob);
            setCover({ file, previewUrl });
            setCropSrc(null);
            if (coverInputRef.current) coverInputRef.current.value = "";
          }}
        />
      )}
    </div>
  );
}

// ── Hjelpkomponenter ───────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1.5 text-xs font-medium" style={{ color: "#86868b" }}>
      {children}
    </p>
  );
}

function FileRow({
  label,
  hint,
  accept,
  icon,
  file,
  inputRef,
  onChange,
}: {
  label: string;
  hint: string;
  accept: string;
  icon: React.ReactNode;
  file: File | null;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-2.5 min-w-0">
        {icon}
        <div className="min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: "#f5f5f7" }}>
            {file ? file.name : label}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "#3a3a3a" }}>
            {file
              ? `${(file.size / 1024 / 1024).toFixed(1)} MB`
              : hint}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {file && (
          <button
            type="button"
            onClick={() => {
              if (inputRef.current) inputRef.current.value = "";
              onChange({ target: { files: null } } as never);
            }}
            className="rounded-lg p-1.5"
            style={{ color: "#86868b" }}
          >
            <X size={13} />
          </button>
        )}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="rounded-lg px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-80"
          style={{ background: "rgba(255,255,255,0.08)", color: "#f5f5f7" }}
        >
          {file ? "Bytt" : "Velg fil"}
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={onChange}
      />
    </div>
  );
}

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
