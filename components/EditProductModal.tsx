"use client";

import { useState, KeyboardEvent } from "react";
import { X } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { Beat, Sample, Remake } from "@/lib/supabase/types";

const MUSICAL_KEYS = [
  "C maj","C# maj","D maj","Eb maj","E maj","F maj",
  "F# maj","G maj","Ab maj","A maj","Bb maj","B maj",
  "C min","C# min","D min","Eb min","E min","F min",
  "F# min","G min","Ab min","A min","Bb min","B min",
];

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  borderRadius: 12,
  border: "1px solid #2a2a2a",
  background: "#0a0a0a",
  color: "#f5f5f7",
  fontSize: 14,
  outline: "none",
};

type EditBeat = { type: "beat"; item: Beat };
type EditSample = { type: "sample"; item: Sample };
type EditRemake = { type: "remake"; item: Remake };

type Props = (EditBeat | EditSample | EditRemake) & {
  onClose: () => void;
  onSaved: (updated: Beat | Sample | Remake) => void;
};

export default function EditProductModal(props: Props) {
  const { type, item, onClose, onSaved } = props;

  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description || "");
  const [price, setPrice] = useState(String(item.price));
  const [tags, setTags] = useState<string[]>(item.tags || []);
  const [tagInput, setTagInput] = useState("");
  const [isPublished, setIsPublished] = useState(item.is_published);

  // Beat-specific
  const [genre, setGenre] = useState(type === "beat" ? (item as Beat).genre : type === "remake" ? ((item as Remake).genre || "") : (item as Sample).genre || "");
  const [bpm, setBpm] = useState(
    type === "beat" ? String((item as Beat).bpm) :
    type === "remake" ? String((item as Remake).bpm || "") :
    String((item as Sample).bpm || "")
  );
  const [key, setKey] = useState(
    type === "beat" ? (item as Beat).key :
    type === "remake" ? ((item as Remake).key || "") :
    (item as Sample).key || ""
  );
  const [exclusivePrice, setExclusivePrice] = useState(
    type === "beat" ? String((item as Beat).exclusive_price || "") : ""
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addTag() {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g, "-");
    if (t && !tags.includes(t) && tags.length < 6) setTags([...tags, t]);
    setTagInput("");
  }

  function handleTagKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); }
    if (e.key === "Backspace" && !tagInput && tags.length > 0) setTags(tags.slice(0, -1));
  }

  async function handleSave() {
    if (!title.trim()) { setError("Tittel er påkrevd."); return; }
    const priceNum = parseInt(price);
    if (isNaN(priceNum) || priceNum < 0) { setError("Ugyldig pris."); return; }

    setSaving(true);
    setError(null);
    const supabase = getSupabaseClient();

    let updateData: Record<string, unknown>;
    let table: string;

    if (type === "beat") {
      const bpmNum = parseInt(bpm);
      if (isNaN(bpmNum) || bpmNum < 60 || bpmNum > 220) { setError("BPM må være mellom 60 og 220."); setSaving(false); return; }
      const exPrice = exclusivePrice ? parseInt(exclusivePrice) : null;
      if (exPrice !== null && exPrice <= priceNum) { setError("Eksklusiv pris må være høyere enn vanlig pris."); setSaving(false); return; }
      table = "beats";
      updateData = { title: title.trim(), description: description.trim(), price: priceNum, tags, genre, bpm: bpmNum, key, exclusive_price: exPrice, is_published: isPublished };
    } else if (type === "remake") {
      table = "remakes";
      updateData = { title: title.trim(), description: description.trim(), price: priceNum, tags, genre: genre || null, bpm: bpm ? parseInt(bpm) : null, key: key || null, is_published: isPublished };
    } else {
      table = "samples";
      updateData = { title: title.trim(), description: description.trim(), price: priceNum, tags, genre: genre || null, bpm: bpm ? parseInt(bpm) : null, key: key || null, is_published: isPublished };
    }

    const { error: dbError } = await supabase.from(table).update(updateData).eq("id", item.id);
    if (dbError) {
      setError("Kunne ikke lagre. Prøv igjen.");
      setSaving(false);
      return;
    }

    onSaved({ ...item, ...updateData } as Beat | Sample | Remake);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4" onClick={onClose}>
      <div
        className="relative w-full max-w-md rounded-2xl p-6 flex flex-col gap-4 max-h-[85vh] overflow-y-auto"
        style={{ background: "#141414", border: "1px solid #2a2a2a" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold" style={{ color: "#f5f5f7" }}>Rediger {type === "beat" ? "låt" : type === "remake" ? "remake" : "sample"}</h2>
          <button onClick={onClose} className="rounded-lg p-1 transition-opacity hover:opacity-70" style={{ color: "#86868b" }}>
            <X size={18} />
          </button>
        </div>

        {error && <p className="text-xs font-medium" style={{ color: "#ff3b30" }}>{error}</p>}

        {/* Title */}
        <div>
          <Label>Tittel *</Label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} />
        </div>

        {/* Description */}
        <div>
          <Label>Beskrivelse</Label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
        </div>

        {/* Genre */}
        {(type === "beat" || type === "remake" || type === "sample") && (
          <div>
            <Label>Sjanger</Label>
            <input type="text" value={genre} onChange={(e) => setGenre(e.target.value)} style={inputStyle} />
          </div>
        )}

        {/* BPM & Key row */}
        <div className="flex gap-3">
          <div className="flex-1">
            <Label>BPM</Label>
            <input type="number" value={bpm} onChange={(e) => setBpm(e.target.value)} style={inputStyle} />
          </div>
          <div className="flex-1">
            <Label>Key</Label>
            <select value={key} onChange={(e) => setKey(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
              <option value="">Velg...</option>
              {MUSICAL_KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
        </div>

        {/* Price */}
        <div className="flex gap-3">
          <div className="flex-1">
            <Label>Pris (kr)</Label>
            <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} min={0} style={inputStyle} />
          </div>
          {type === "beat" && (
            <div className="flex-1">
              <Label>Eksklusiv pris (kr)</Label>
              <input type="number" value={exclusivePrice} onChange={(e) => setExclusivePrice(e.target.value)} min={0} placeholder="Valgfritt" style={inputStyle} />
            </div>
          )}
        </div>

        {/* Tags */}
        <div>
          <Label>Tags</Label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {tags.map((tag) => (
              <span key={tag} className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs" style={{ background: "rgba(255,255,255,0.06)", color: "#f5f5f7" }}>
                {tag}
                <button type="button" onClick={() => setTags(tags.filter((t) => t !== tag))} className="hover:opacity-70" style={{ color: "#86868b" }}>×</button>
              </span>
            ))}
          </div>
          {tags.length < 6 && (
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              onBlur={addTag}
              placeholder="Legg til tag..."
              style={inputStyle}
            />
          )}
        </div>

        {/* Published toggle */}
        <div className="flex items-center justify-between">
          <Label>Publisert</Label>
          <button
            type="button"
            onClick={() => setIsPublished(!isPublished)}
            className="relative rounded-full transition-colors shrink-0"
            style={{ width: 44, height: 26, background: isPublished ? "#34c759" : "#2a2a2a" }}
          >
            <div className="absolute top-1 rounded-full transition-all" style={{ width: 18, height: 18, background: "#f5f5f7", left: isPublished ? 22 : 4 }} />
          </button>
        </div>

        {/* Save / Cancel */}
        <div className="flex gap-3 mt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 rounded-xl py-2.5 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: "#0071e3", color: "#fff" }}
          >
            {saving ? "Lagrer..." : "Lagre"}
          </button>
          <button
            onClick={onClose}
            className="rounded-xl px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-80"
            style={{ background: "#1e1e1e", color: "#f5f5f7" }}
          >
            Avbryt
          </button>
        </div>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="mb-1 text-xs font-medium" style={{ color: "#86868b" }}>{children}</p>;
}
