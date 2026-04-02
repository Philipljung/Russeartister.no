"use client";

import { useState, useRef, KeyboardEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Upload, ImageIcon, Music, Package, Trash2, Eye, EyeOff, FolderOpen, ChevronDown, ChevronUp } from "lucide-react";
import JSZip from "jszip";
import { getSupabaseClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useToast } from "@/lib/toast-context";
import ImageCropModal from "@/components/ImageCropModal";
import { slugifyName } from "@/lib/slugify";

const MUSICAL_KEYS = [
  "C maj","C# maj","D maj","Eb maj","E maj","F maj",
  "F# maj","G maj","Ab maj","A maj","Bb maj","B maj",
  "C min","C# min","D min","Eb min","E min","F min",
  "F# min","G min","Ab min","A min","Bb min","B min",
];

const VSTS = [
  "Serum","Sylenth1","Massive","Massive X","Nexus","Omnisphere",
  "Spire","Vital","Pigments","Phase Plant","Diva","FM8","FM9",
  "Kontakt","Analog Lab","Roland Cloud","Annet",
];

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

type PackItemDraft = {
  id: string;
  name: string;
  itemType: "sample" | "preset";
  subType: "one-shot" | "loop" | null;
  audioFile: File | null;
  mainFile: File | null;
  vst: string;
  bpm: string;
  key: string;
  tags: string[];
  tagInput: string;
  isPreview: boolean;
};

function createEmptyItem(itemType: "sample" | "preset" = "sample"): PackItemDraft {
  return {
    id: crypto.randomUUID(),
    name: "",
    itemType,
    subType: itemType === "sample" ? "one-shot" : null,
    audioFile: null,
    mainFile: null,
    vst: "",
    bpm: "",
    key: "",
    tags: [],
    tagInput: "",
    isPreview: itemType === "sample",
  };
}

function nameWithoutExt(filename: string): string {
  return filename.replace(/\.[^.]+$/, "");
}

function isAudio(filename: string) {
  return /\.(mp3|wav)$/i.test(filename);
}

async function collectFilesFromDrop(dataItems: DataTransferItemList): Promise<{ files: File[]; folderName: string }> {
  const files: File[] = [];
  let folderName = "";

  async function traverse(entry: FileSystemEntry): Promise<void> {
    if (entry.isFile) {
      await new Promise<void>((res) => {
        (entry as FileSystemFileEntry).file((f) => { files.push(f); res(); });
      });
    } else if (entry.isDirectory) {
      const dir = entry as FileSystemDirectoryEntry;
      if (!folderName) folderName = dir.name;
      const reader = dir.createReader();
      await new Promise<void>((res) => {
        reader.readEntries(async (entries) => {
          for (const e of entries) {
            if (!e.name.startsWith(".")) await traverse(e);
          }
          res();
        });
      });
    }
  }

  for (let i = 0; i < dataItems.length; i++) {
    const entry = dataItems[i].webkitGetAsEntry?.();
    if (entry) await traverse(entry);
  }

  return { files, folderName };
}

export default function LastOppPackPage() {
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

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [price, setPrice] = useState("");

  const [cover, setCover] = useState<{ file: File; previewUrl?: string } | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [packPreviewFile, setPackPreviewFile] = useState<File | null>(null);
  const packPreviewInputRef = useRef<HTMLInputElement>(null);

  const [items, setItems] = useState<PackItemDraft[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Upload mode
  const [uploadMode, setUploadMode] = useState<"manual" | "folder">("manual");
  const [dragging, setDragging] = useState(false);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // New item form state
  const [newItem, setNewItem] = useState<PackItemDraft>(createEmptyItem());
  const newAudioRef = useRef<HTMLInputElement>(null);
  const newFileRef = useRef<HTMLInputElement>(null);

  function addTag() {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g, "-");
    if (t && !tags.includes(t) && tags.length < 6) setTags([...tags, t]);
    setTagInput("");
  }

  function handleTagKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); }
    if (e.key === "Backspace" && !tagInput && tags.length > 0) setTags(tags.slice(0, -1));
  }


  function handleAddItem() {
    if (!newItem.name.trim()) { setError("Gi itemet et navn."); return; }
    if (newItem.itemType === "sample" && !newItem.audioFile) { setError("Lydfil er påkrevd for samples."); return; }
    if (newItem.itemType === "preset" && !newItem.mainFile) {
      setError("Presets krever en presetfil."); return;
    }
    if (newItem.itemType === "preset" && !newItem.vst) {
      setError("Presets krever en VST."); return;
    }
    setError(null);
    setItems([...items, { ...newItem, id: crypto.randomUUID() }]);
    setNewItem(createEmptyItem());
    if (newAudioRef.current) newAudioRef.current.value = "";
    if (newFileRef.current) newFileRef.current.value = "";
  }

  function updateItem(id: string, updates: Partial<PackItemDraft>) {
    setItems((prev) => prev.map((item) => item.id === id ? { ...item, ...updates } : item));
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
    if (editingId === id) setEditingId(null);
  }

  function addFilesAsItems(files: File[], folderName: string) {
    if (folderName && !title) setTitle(folderName);
    const newItems: PackItemDraft[] = files
      .filter((f) => !f.name.startsWith("."))
      .map((f) => {
        const audio = isAudio(f.name);
        return {
          id: crypto.randomUUID(),
          name: nameWithoutExt(f.name),
          itemType: audio ? "sample" : "preset",
          subType: null,
          audioFile: audio ? f : null,
          mainFile: audio ? null : f,
          vst: "",
          bpm: "",
          key: "",
          tags: [],
          tagInput: "",
          isPreview: audio,
        } as PackItemDraft;
      });
    setItems((prev) => [...prev, ...newItems]);
    toast(`${newItems.length} filer lagt til.`, "success");
  }

  async function handleFolderDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const { files, folderName } = await collectFilesFromDrop(e.dataTransfer.items);
    if (files.length === 0) return;
    addFilesAsItems(files, folderName);
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    addFilesAsItems(files, "");
    if (folderInputRef.current) folderInputRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) { setError("Tittel er påkrevd."); return; }
    if (items.length === 0) { setError("Legg til minst ett item i pakken."); return; }
    for (const item of items) {
      if (!item.name.trim()) { setError("Alle items må ha et navn."); return; }
      if (item.itemType === "sample" && !item.audioFile) { setError(`"${item.name || "Uten navn"}" mangler lydfil.`); return; }
      if (item.itemType === "preset" && !item.mainFile) { setError(`"${item.name}" mangler presetfil.`); return; }
      if (item.itemType === "preset" && !item.vst) { setError(`"${item.name}" mangler VST.`); return; }
      if (item.itemType === "sample" && item.subType === "loop" && item.bpm) {
        const bpmNum = parseInt(item.bpm);
        if (isNaN(bpmNum) || bpmNum < 40 || bpmNum > 300) { setError(`"${item.name}" har ugyldig BPM (40-300).`); return; }
      }
    }

    const hasAnyPreview = items.some((i) => i.itemType === "sample" && i.isPreview) || !!packPreviewFile;
    if (!hasAnyPreview) {
      toast("Tips: Legg til minst én forhåndsvisning slik at kjøpere kan høre pakken.", "info");
    }

    const priceNum = stripeReady ? parseInt(price) : 0;
    if (stripeReady && !price) { setError("Fyll ut pris."); return; }
    if (stripeReady && (isNaN(priceNum) || priceNum < 0)) { setError("Ugyldig pris."); return; }
    if (stripeReady && priceNum > 0 && priceNum < 15) { setError("Minimumspris er 15 kr (eller gratis)."); return; }

    setSubmitting(true);
    const supabase = getSupabaseClient();

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError("Du må være innlogget."); setSubmitting(false); return; }

      const userId = session.user.id;
      const displayName = session.user.user_metadata?.display_name as string | undefined;
      const username = session.user.user_metadata?.username as string | undefined;
      const timestamp = Date.now();

      async function uploadPublic(bucket: string, file: File, suffix: string): Promise<string | null> {
        const ext = file.name.split(".").pop() ?? "bin";
        const path = `${userId}/${timestamp}_${suffix}.${ext}`;
        const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
        if (error) { console.error(`[lastopp-pack] Upload failed ${bucket}:`, error.message); return null; }
        return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
      }

      async function uploadPrivate(file: File, suffix: string): Promise<string | null> {
        const ext = file.name.split(".").pop() ?? "bin";
        const path = `${userId}/${timestamp}_${suffix}.${ext}`;
        const contentType = file.type || "application/octet-stream";
        const { error: uploadErr } = await supabase.storage
          .from("beat-files")
          .upload(path, file, { contentType, upsert: false });
        if (uploadErr) { console.error("[lastopp-pack] Private upload failed:", uploadErr.message); return null; }
        return path;
      }

      // Build and upload zip (pack download file)
      const zip = new JSZip();
      for (const item of items) {
        const safeName = item.name.trim() || item.id;
        if (item.itemType === "sample" && item.audioFile) {
          const ext = item.audioFile.name.split(".").pop() ?? "wav";
          zip.file(`samples/${safeName}.${ext}`, item.audioFile);
        } else if (item.itemType === "preset") {
          if (item.mainFile) {
            const ext = item.mainFile.name.split(".").pop() ?? "bin";
            zip.file(`presets/${safeName}.${ext}`, item.mainFile);
          }
          if (item.audioFile) {
            const ext = item.audioFile.name.split(".").pop() ?? "wav";
            zip.file(`presets/previews/${safeName}.${ext}`, item.audioFile);
          }
        }
      }
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const zipFile = new File([zipBlob], `${title.trim()}.zip`, { type: "application/zip" });
      const fileUrl = await uploadPrivate(zipFile, "pack");
      if (!fileUrl) { setError("Kunne ikke laste opp pakkefilene."); setSubmitting(false); return; }

      const coverUrl = cover?.file ? await uploadPublic("beat-covers", cover.file, "pack-cover") : null;
      const previewUrl = packPreviewFile ? await uploadPublic("sample-previews", packPreviewFile, "pack-preview") : null;

      const { data: pack, error: packError } = await supabase
        .from("packs")
        .insert({
          producer_id: userId,
          title: title.trim(),
          description: description.trim(),
          tags,
          price: priceNum,
          cover_url: coverUrl,
          preview_url: previewUrl,
          file_url: fileUrl,
          is_published: true,
        })
        .select("id")
        .single();

      if (packError || !pack) { setError("Kunne ikke opprette pakken: " + (packError?.message ?? "Ukjent feil")); setSubmitting(false); return; }

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const audioUrl = item.audioFile ? await uploadPublic("sample-previews", item.audioFile, `pack-item-${i}`) : null;
        const itemFileUrl = item.mainFile ? await uploadPrivate(item.mainFile, `pack-item-file-${i}`) : null;
        const bpmNum = item.bpm ? parseInt(item.bpm) : null;

        await supabase.from("pack_items").insert({
          pack_id: pack.id,
          name: item.name.trim(),
          item_type: item.itemType,
          sub_type: item.itemType === "sample" ? item.subType : null,
          audio_url: audioUrl,
          file_url: itemFileUrl,
          vst: item.itemType === "preset" ? item.vst : null,
          bpm: item.itemType === "sample" && item.subType === "loop" ? bpmNum : null,
          key: item.itemType === "sample" && item.subType === "loop" ? (item.key || null) : null,
          tags: item.tags,
          position: i,
          is_preview: item.itemType === "sample" ? item.isPreview : false,
        });
      }

      toast("Pakke publisert!", "success");
      const profileSlug = slugifyName(displayName ?? username ?? "");
      router.push(profileSlug ? `/profile/${profileSlug}` : "/packs");
    } catch (err) {
      console.error("[lastopp-pack] Unexpected error:", err);
      setError("Noe gikk galt. Prøv igjen.");
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="mb-1 text-2xl font-bold tracking-tight" style={{ color: "#f5f5f7" }}>
        Lag en pakke
      </h1>
      <p className="mb-8 text-sm" style={{ color: "#86868b" }}>
        Sett sammen samples og presets i en pakke.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">

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
            if (f) setCropSrc(URL.createObjectURL(f));
          }} />
          <div className="flex-1">
            <Label>Tittel *</Label>
            <input
              type="text"
              placeholder="Sample Pack Vol. 1"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              style={inputStyle}
            />
          </div>
        </div>

        {/* Pack preview audio */}
        <div>
          <Label>Forhåndsvisning av pakke (valgfritt)</Label>
          <div className="flex items-center justify-between gap-3 rounded-xl px-4 py-3" style={{ background: "#141414", border: "1px solid #2a2a2a" }}>
            <div className="flex items-center gap-2 min-w-0">
              <Music size={14} style={{ color: "#86868b", flexShrink: 0 }} />
              <div className="min-w-0">
                <p className="text-xs font-medium truncate" style={{ color: "#f5f5f7" }}>
                  {packPreviewFile ? packPreviewFile.name : "Ingen fil valgt"}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "#3a3a3a" }}>
                  {packPreviewFile ? `${(packPreviewFile.size / 1024 / 1024).toFixed(1)} MB` : "WAV eller MP3"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {packPreviewFile && (
                <button type="button" onClick={() => { setPackPreviewFile(null); if (packPreviewInputRef.current) packPreviewInputRef.current.value = ""; }} className="rounded-lg p-1.5" style={{ color: "#86868b" }}><X size={13} /></button>
              )}
              <button type="button" onClick={() => packPreviewInputRef.current?.click()} className="rounded-lg px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-80" style={{ background: "rgba(255,255,255,0.08)", color: "#f5f5f7" }}>
                {packPreviewFile ? "Bytt" : "Velg fil"}
              </button>
            </div>
            <input ref={packPreviewInputRef} type="file" accept=".wav,.mp3,audio/wav,audio/mpeg" className="hidden" onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) setPackPreviewFile(f);
            }} />
          </div>
        </div>

        {/* Tags */}
        <div>
          <Label>Tags (maks 6)</Label>
          <div
            className="flex flex-wrap items-center gap-2 rounded-xl px-3 py-2.5 min-h-[44px]"
            style={{ background: "#141414", border: "1px solid #2a2a2a" }}
            onClick={() => document.getElementById("pack-tag-input")?.focus()}
          >
            {tags.map((tag) => (
              <span key={tag} className="flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs" style={{ background: "rgba(255,255,255,0.08)", color: "#f5f5f7" }}>
                {tag}
                <button type="button" onClick={(e) => { e.stopPropagation(); setTags(tags.filter((t) => t !== tag)); }} style={{ color: "#86868b" }}><X size={10} /></button>
              </span>
            ))}
            {tags.length < 6 && (
              <input
                id="pack-tag-input"
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
            placeholder="Hva inneholder pakken?"
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
            <div>
              <div className="flex items-center gap-2 rounded-xl px-3.5 py-2.5" style={{ background: "#141414", border: "1px solid #2a2a2a", opacity: 0.5 }}>
                <span className="text-sm" style={{ color: "#86868b" }}>kr</span>
                <span className="text-sm font-semibold" style={{ color: "#86868b" }}>Gratis</span>
              </div>
              <p className="mt-1.5 text-xs" style={{ color: "#86868b" }}>
                <Link href="/profile" className="underline" style={{ color: "#f5f5f7" }}>Sett opp Stripe</Link> for å selge for penger.
              </p>
            </div>
          ) : (
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm" style={{ color: "#86868b" }}>kr</span>
              <input type="number" placeholder="99" value={price} onChange={(e) => setPrice(e.target.value)} min={0} style={{ ...inputStyle, paddingLeft: 32 }} />
            </div>
          )}
        </div>

        {/* Items section */}
        <div className="rounded-2xl p-5 flex flex-col gap-4" style={{ background: "#0f0f0f", border: "1px solid #1e1e1e" }}>

          {/* Mode toggle + item count */}
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium" style={{ color: "#f5f5f7" }}>Innhold {items.length > 0 && <span style={{ color: "#86868b" }}>({items.length})</span>}</p>
            <div className="flex items-center gap-1 rounded-lg p-1" style={{ background: "#141414", border: "1px solid #2a2a2a" }}>
              {(["manual", "folder"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setUploadMode(mode)}
                  className="rounded px-3 py-1 text-xs font-medium transition-all"
                  style={{
                    background: uploadMode === mode ? "#f5f5f7" : "transparent",
                    color: uploadMode === mode ? "#080808" : "#86868b",
                  }}
                >
                  {mode === "manual" ? "Manuelt" : "Fra mappe"}
                </button>
              ))}
            </div>
          </div>

          {/* Folder drop zone */}
          {uploadMode === "folder" && (
            <>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleFolderDrop}
                onClick={() => folderInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 rounded-xl py-8 transition-all"
                style={{
                  border: `2px dashed ${dragging ? "#f5f5f7" : "#2a2a2a"}`,
                  background: dragging ? "rgba(255,255,255,0.04)" : "transparent",
                  cursor: "pointer",
                }}
              >
                <FolderOpen size={22} style={{ color: dragging ? "#f5f5f7" : "#3a3a3a" }} />
                <p className="text-sm" style={{ color: dragging ? "#f5f5f7" : "#86868b" }}>Dra inn en mappe, eller klikk for å velge filer</p>
                <p className="text-xs" style={{ color: "#3a3a3a" }}>WAV/MP3 blir samples, alt annet blir presets</p>
              </div>
              <input
                ref={folderInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileInputChange}
              />
            </>
          )}

          {/* Items list */}
          {items.length > 0 && (
            <div className="flex flex-col gap-1">
              {/* Master preview toggle */}
              <div className="flex items-center justify-between px-1 pb-1">
                <span className="text-xs" style={{ color: "#3a3a3a" }}>{items.filter(i => i.itemType === "sample").length} samples</span>
                <button
                  type="button"
                  onClick={() => {
                    const allOn = items.filter(i => i.itemType === "sample").every(i => i.isPreview);
                    setItems(prev => prev.map(i => i.itemType === "sample" ? { ...i, isPreview: !allOn } : i));
                  }}
                  className="text-xs transition-opacity hover:opacity-80"
                  style={{ color: "#86868b" }}
                >
                  {items.filter(i => i.itemType === "sample").every(i => i.isPreview) ? "Skjul alle previews" : "Vis alle previews"}
                </button>
              </div>
              {items.map((item, idx) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  index={idx}
                  isEditing={editingId === item.id}
                  onToggleEdit={() => setEditingId(editingId === item.id ? null : item.id)}
                  onUpdate={(updates) => updateItem(item.id, updates)}
                  onRemove={() => removeItem(item.id)}
                />
              ))}
            </div>
          )}

          {items.length === 0 && (
            <div className="flex flex-col items-center justify-center py-4 gap-1">
              <p className="text-xs" style={{ color: "#3a3a3a" }}>Ingen items enda.</p>
            </div>
          )}

          {/* Divider */}
          <div className="h-px" style={{ background: "#1e1e1e" }} />

          {/* New item form — always visible */}
          <NewItemForm
            item={newItem}
            setItem={setNewItem}
            onAdd={handleAddItem}
            audioRef={newAudioRef}
            fileRef={newFileRef}
          />
        </div>

        {error && <p className="text-sm" style={{ color: "#ff453a" }}>{error}</p>}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl px-6 py-2.5 text-sm font-semibold transition-opacity disabled:opacity-50"
            style={{ background: "#f5f5f7", color: "#080808" }}
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-transparent" style={{ borderTopColor: "rgba(0,0,0,0.6)" }} />
                Publiserer...
              </span>
            ) : (
              <span className="flex items-center gap-2"><Upload size={14} />Publiser pakke</span>
            )}
          </button>
          <button type="button" onClick={() => router.back()} className="rounded-xl px-4 py-2.5 text-sm transition-opacity hover:opacity-80" style={{ color: "#86868b" }}>
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

// ── Compact item row ────────────────────────────────────────────────────
function ItemRow({
  item,
  index,
  isEditing,
  onToggleEdit,
  onUpdate,
  onRemove,
}: {
  item: PackItemDraft;
  index: number;
  isEditing: boolean;
  onToggleEdit: () => void;
  onUpdate: (updates: Partial<PackItemDraft>) => void;
  onRemove: () => void;
}) {
  const audioInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isSample = item.itemType === "sample";
  const typeLabel = isSample
    ? (item.subType === "loop" ? "Loop" : item.subType === "one-shot" ? "One-shot" : "Sample")
    : `Preset${item.vst ? ` · ${item.vst}` : ""}`;

  function addTag() {
    const t = item.tagInput.trim().toLowerCase().replace(/\s+/g, "-");
    if (t && !item.tags.includes(t) && item.tags.length < 6) {
      onUpdate({ tags: [...item.tags, t], tagInput: "" });
    } else {
      onUpdate({ tagInput: "" });
    }
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "#141414", border: "1px solid #1e1e1e" }}>
      {/* Compact row */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <span className="text-xs font-mono shrink-0 w-5 text-right" style={{ color: "#3a3a3a" }}>{index + 1}</span>
        {isSample ? <Music size={12} style={{ color: "#86868b", flexShrink: 0 }} /> : <Package size={12} style={{ color: "#86868b", flexShrink: 0 }} />}
        <div className="flex-1 min-w-0 cursor-pointer" onClick={onToggleEdit}>
          <p className="text-sm font-medium truncate" style={{ color: "#f5f5f7" }}>{item.name || "Uten navn"}</p>
        </div>
        <span className="text-xs shrink-0 hidden sm:block" style={{ color: "#3a3a3a" }}>{typeLabel}</span>
        {/* Missing file warnings */}
        {((item.itemType === "sample" && !item.audioFile) ||
          (item.itemType === "preset" && (!item.mainFile || !item.vst))) && (
          <span
            title={item.itemType === "preset" && !item.vst ? "Mangler VST" : item.itemType === "preset" && !item.mainFile ? "Mangler presetfil" : "Mangler lydfil"}
            className="inline-block rounded-full shrink-0 cursor-help"
            style={{ width: 8, height: 8, background: "#ff453a", flexShrink: 0 }}
          />
        )}
        {isSample && (
          <button
            type="button"
            title={item.isPreview ? "Fjern forhåndsvisning" : "Sett som forhåndsvisning"}
            onClick={() => onUpdate({ isPreview: !item.isPreview })}
            className="shrink-0 rounded p-1 transition-opacity hover:opacity-80"
            style={{ color: item.isPreview ? "#f5f5f7" : "#3a3a3a" }}
          >
            {item.isPreview ? <Eye size={13} /> : <EyeOff size={13} />}
          </button>
        )}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="shrink-0 rounded p-1 transition-opacity hover:opacity-80"
          style={{ color: "#3a3a3a" }}
        >
          <Trash2 size={12} />
        </button>
        <button
          type="button"
          onClick={onToggleEdit}
          className="shrink-0 p-1 rounded transition-opacity hover:opacity-80"
          style={{ color: "#86868b" }}
        >
          {isEditing ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Expanded edit form */}
      {isEditing && (
        <div className="px-4 pb-4 flex flex-col gap-3" style={{ borderTop: "1px solid #1e1e1e" }}>
          <div className="pt-3">
            <p className="mb-1 text-xs" style={{ color: "#3a3a3a" }}>Navn</p>
            <input
              type="text"
              value={item.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              placeholder="Navn på item..."
              style={{ ...inputStyle, fontSize: 12, padding: "8px 12px" }}
            />
          </div>

          {/* Type toggle */}
          <div className="flex gap-2">
            {(["sample", "preset"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => onUpdate({ itemType: type, subType: type === "sample" ? "one-shot" : null, vst: "", bpm: "", key: "", isPreview: false })}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
                style={{
                  background: item.itemType === type ? "#f5f5f7" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${item.itemType === type ? "#f5f5f7" : "#2a2a2a"}`,
                  color: item.itemType === type ? "#080808" : "#86868b",
                }}
              >
                {type === "sample" ? <Music size={12} /> : <Package size={12} />}
                {type === "sample" ? "Sample" : "Preset"}
              </button>
            ))}
          </div>

          {/* Sample sub-type */}
          {isSample && (
            <div className="flex gap-2">
              {(["one-shot", "loop"] as const).map((sub) => (
                <button
                  key={sub}
                  type="button"
                  onClick={() => onUpdate({ subType: sub })}
                  className="rounded-lg px-3 py-1.5 text-xs transition-all"
                  style={{
                    background: item.subType === sub ? "#f5f5f7" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${item.subType === sub ? "#f5f5f7" : "#2a2a2a"}`,
                    color: item.subType === sub ? "#080808" : "#86868b",
                  }}
                >
                  {sub === "one-shot" ? "One-shot" : "Loop"}
                </button>
              ))}
            </div>
          )}

          {/* Loop fields */}
          {isSample && item.subType === "loop" && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="mb-1 text-xs" style={{ color: "#3a3a3a" }}>BPM</p>
                <input type="number" placeholder="140" value={item.bpm} onChange={(e) => onUpdate({ bpm: e.target.value })} min={40} max={300} style={{ ...inputStyle, fontSize: 12, padding: "8px 12px" }} />
              </div>
              <div>
                <p className="mb-1 text-xs" style={{ color: "#3a3a3a" }}>Skala</p>
                <select value={item.key} onChange={(e) => onUpdate({ key: e.target.value })} style={{ ...inputStyle, fontSize: 12, padding: "8px 12px", cursor: "pointer" }}>
                  <option value="">Ingen</option>
                  {MUSICAL_KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Preset: VST */}
          {!isSample && (
            <div>
              <p className="mb-1 text-xs" style={{ color: "#3a3a3a" }}>VST *</p>
              <select value={item.vst} onChange={(e) => onUpdate({ vst: e.target.value })} style={{ ...inputStyle, fontSize: 12, padding: "8px 12px", cursor: "pointer" }}>
                <option value="">Velg VST...</option>
                {VSTS.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          )}

          {/* Tags */}
          <div>
            <p className="mb-1 text-xs" style={{ color: "#3a3a3a" }}>Tags (valgfritt)</p>
            <div className="flex flex-wrap items-center gap-1.5 rounded-lg px-2.5 py-2 min-h-[36px]" style={{ background: "#0f0f0f", border: "1px solid #1e1e1e" }}>
              {item.tags.map((tag) => (
                <span key={tag} className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs" style={{ background: "rgba(255,255,255,0.08)", color: "#f5f5f7" }}>
                  {tag}
                  <button type="button" onClick={() => onUpdate({ tags: item.tags.filter((t) => t !== tag) })} style={{ color: "#86868b" }}><X size={9} /></button>
                </span>
              ))}
              {item.tags.length < 6 && (
                <input
                  type="text"
                  placeholder={item.tags.length === 0 ? "Tags..." : ""}
                  value={item.tagInput}
                  onChange={(e) => onUpdate({ tagInput: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); }
                    if (e.key === "Backspace" && !item.tagInput && item.tags.length > 0) onUpdate({ tags: item.tags.slice(0, -1) });
                  }}
                  onBlur={addTag}
                  style={{ background: "transparent", border: "none", outline: "none", color: "#f5f5f7", fontSize: 12, minWidth: 80, flex: 1 }}
                />
              )}
            </div>
          </div>

          {/* Audio file */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Music size={14} style={{ color: "#86868b", flexShrink: 0 }} />
              <div className="min-w-0">
                <p className="text-xs font-medium truncate" style={{ color: "#f5f5f7" }}>{item.audioFile ? item.audioFile.name : isSample ? "Lydfil *" : "Lydfil (valgfritt)"}</p>
                <p className="text-xs mt-0.5" style={{ color: "#3a3a3a" }}>{item.audioFile ? `${(item.audioFile.size / 1024 / 1024).toFixed(1)} MB` : "WAV eller MP3"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {item.audioFile && (
                <button type="button" onClick={() => { onUpdate({ audioFile: null }); if (audioInputRef.current) audioInputRef.current.value = ""; }} className="rounded-lg p-1.5" style={{ color: "#86868b" }}><X size={13} /></button>
              )}
              <button type="button" onClick={() => audioInputRef.current?.click()} className="rounded-lg px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-80" style={{ background: "rgba(255,255,255,0.08)", color: "#f5f5f7" }}>
                {item.audioFile ? "Bytt" : "Velg fil"}
              </button>
            </div>
            <input ref={audioInputRef} type="file" accept=".wav,.mp3,audio/wav,audio/mpeg" className="hidden" onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUpdate({ audioFile: f });
            }} />
          </div>

          {/* Preset: main file (mandatory) */}
          {!isSample && (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <Package size={14} style={{ color: "#86868b", flexShrink: 0 }} />
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate" style={{ color: "#f5f5f7" }}>{item.mainFile ? item.mainFile.name : "Presetfil *"}</p>
                  <p className="text-xs mt-0.5" style={{ color: "#3a3a3a" }}>{item.mainFile ? `${(item.mainFile.size / 1024 / 1024).toFixed(1)} MB` : "Selve presetfilen"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {item.mainFile && (
                  <button type="button" onClick={() => { onUpdate({ mainFile: null }); if (fileInputRef.current) fileInputRef.current.value = ""; }} className="rounded-lg p-1.5" style={{ color: "#86868b" }}><X size={13} /></button>
                )}
                <button type="button" onClick={() => fileInputRef.current?.click()} className="rounded-lg px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-80" style={{ background: "rgba(255,255,255,0.08)", color: "#f5f5f7" }}>
                  {item.mainFile ? "Bytt" : "Velg fil"}
                </button>
              </div>
              <input ref={fileInputRef} type="file" accept="*" className="hidden" onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onUpdate({ mainFile: f });
              }} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── New item form ────────────────────────────────────────────────────────
function NewItemForm({
  item,
  setItem,
  onAdd,
  audioRef,
  fileRef,
}: {
  item: PackItemDraft;
  setItem: (item: PackItemDraft) => void;
  onAdd: () => void;
  audioRef: React.RefObject<HTMLInputElement | null>;
  fileRef: React.RefObject<HTMLInputElement | null>;
}) {
  const isSample = item.itemType === "sample";

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-medium" style={{ color: "#86868b" }}>Legg til item</p>

      {/* Name */}
      <input
        type="text"
        placeholder="Navn..."
        value={item.name}
        onChange={(e) => setItem({ ...item, name: e.target.value })}
        style={{ ...inputStyle, fontSize: 12, padding: "8px 12px" }}
      />

      {/* Type toggle */}
      <div className="flex gap-2">
        {(["sample", "preset"] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setItem({ ...item, itemType: type, subType: type === "sample" ? "one-shot" : null, vst: "", bpm: "", key: "", isPreview: false })}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
            style={{
              background: item.itemType === type ? "#f5f5f7" : "rgba(255,255,255,0.04)",
              border: `1px solid ${item.itemType === type ? "#f5f5f7" : "#2a2a2a"}`,
              color: item.itemType === type ? "#080808" : "#86868b",
            }}
          >
            {type === "sample" ? <Music size={12} /> : <Package size={12} />}
            {type === "sample" ? "Sample" : "Preset"}
          </button>
        ))}
      </div>

      {/* Sample sub-type */}
      {isSample && (
        <div className="flex gap-2">
          {(["one-shot", "loop"] as const).map((sub) => (
            <button
              key={sub}
              type="button"
              onClick={() => setItem({ ...item, subType: sub })}
              className="rounded-lg px-3 py-1.5 text-xs transition-all"
              style={{
                background: item.subType === sub ? "#f5f5f7" : "rgba(255,255,255,0.04)",
                border: `1px solid ${item.subType === sub ? "#f5f5f7" : "#2a2a2a"}`,
                color: item.subType === sub ? "#080808" : "#86868b",
              }}
            >
              {sub === "one-shot" ? "One-shot" : "Loop"}
            </button>
          ))}
        </div>
      )}

      {/* Loop fields */}
      {isSample && item.subType === "loop" && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="mb-1 text-xs" style={{ color: "#3a3a3a" }}>BPM</p>
            <input type="number" placeholder="140" value={item.bpm} onChange={(e) => setItem({ ...item, bpm: e.target.value })} min={40} max={300} style={{ ...inputStyle, fontSize: 12, padding: "8px 12px" }} />
          </div>
          <div>
            <p className="mb-1 text-xs" style={{ color: "#3a3a3a" }}>Skala</p>
            <select value={item.key} onChange={(e) => setItem({ ...item, key: e.target.value })} style={{ ...inputStyle, fontSize: 12, padding: "8px 12px", cursor: "pointer" }}>
              <option value="">Ingen</option>
              {MUSICAL_KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* Preset: VST */}
      {!isSample && (
        <div>
          <p className="mb-1 text-xs" style={{ color: "#3a3a3a" }}>VST *</p>
          <select value={item.vst} onChange={(e) => setItem({ ...item, vst: e.target.value })} style={{ ...inputStyle, fontSize: 12, padding: "8px 12px", cursor: "pointer" }}>
            <option value="">Velg VST...</option>
            {VSTS.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
      )}

      {/* Audio file */}
      <div className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5" style={{ background: "#141414", border: "1px solid #2a2a2a" }}>
        <div className="flex items-center gap-2 min-w-0">
          <Music size={13} style={{ color: "#86868b", flexShrink: 0 }} />
          <p className="text-xs truncate" style={{ color: item.audioFile ? "#f5f5f7" : "#86868b" }}>
            {item.audioFile ? item.audioFile.name : isSample ? "Lydfil *" : "Lydfil (valgfritt)"}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {item.audioFile && (
            <button type="button" onClick={() => { setItem({ ...item, audioFile: null }); if (audioRef.current) audioRef.current.value = ""; }} style={{ color: "#86868b" }}><X size={12} /></button>
          )}
          <button type="button" onClick={() => audioRef.current?.click()} className="rounded px-2.5 py-1 text-xs transition-opacity hover:opacity-80" style={{ background: "rgba(255,255,255,0.08)", color: "#f5f5f7" }}>
            {item.audioFile ? "Bytt" : "Velg"}
          </button>
        </div>
        <input ref={audioRef} type="file" accept=".wav,.mp3,audio/wav,audio/mpeg" className="hidden" onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) setItem({ ...item, audioFile: f });
        }} />
      </div>

      {/* Preset main file */}
      {!isSample && (
        <div className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5" style={{ background: "#141414", border: "1px solid #2a2a2a" }}>
          <div className="flex items-center gap-2 min-w-0">
            <Package size={13} style={{ color: "#86868b", flexShrink: 0 }} />
            <p className="text-xs truncate" style={{ color: item.mainFile ? "#f5f5f7" : "#86868b" }}>
              {item.mainFile ? item.mainFile.name : "Presetfil *"}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {item.mainFile && (
              <button type="button" onClick={() => { setItem({ ...item, mainFile: null }); if (fileRef.current) fileRef.current.value = ""; }} style={{ color: "#86868b" }}><X size={12} /></button>
            )}
            <button type="button" onClick={() => fileRef.current?.click()} className="rounded px-2.5 py-1 text-xs transition-opacity hover:opacity-80" style={{ background: "rgba(255,255,255,0.08)", color: "#f5f5f7" }}>
              {item.mainFile ? "Bytt" : "Velg"}
            </button>
          </div>
          <input ref={fileRef} type="file" accept="*" className="hidden" onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) setItem({ ...item, mainFile: f });
          }} />
        </div>
      )}

      {/* Add button */}
      <button
        type="button"
        onClick={onAdd}
        className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-opacity hover:opacity-80"
        style={{ background: "#f5f5f7", color: "#080808" }}
      >
        Legg til
      </button>
    </div>
  );
}
