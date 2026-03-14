export const SAMPLE_CATEGORIES = {
  Trommer: ["kick", "snare", "clap", "hihat", "808", "cymbal", "tom", "percussion", "drum-loop", "full-loop"],
  Melodisk: ["melody-loop", "bass-loop", "synth-loop", "guitar-loop", "piano-loop", "vocal-chop"],
  FX: ["one-shot", "fx-riser"],
} as const;

export const PRESET_CATEGORIES = {
  Presets: ["lead", "chord", "bass", "pad", "pluck"],
} as const;

export const ALL_SAMPLE_CATEGORIES = Object.values(SAMPLE_CATEGORIES).flat();
export const ALL_PRESET_CATEGORIES = Object.values(PRESET_CATEGORIES).flat();

export const CATEGORY_LABELS: Record<string, string> = {
  kick: "Kick", snare: "Snare", clap: "Clap", hihat: "Hi-hat", "808": "808/Sub",
  cymbal: "Cymbal", tom: "Tom", percussion: "Percussion", "drum-loop": "Drum Loop",
  "full-loop": "Full Loop", "melody-loop": "Melody Loop", "bass-loop": "Bass Loop",
  "synth-loop": "Synth Loop", "guitar-loop": "Guitar Loop", "piano-loop": "Piano Loop",
  "vocal-chop": "Vocal Chop", "one-shot": "One-Shot", "fx-riser": "FX/Riser",
  lead: "Lead", chord: "Chord", bass: "Bass", pad: "Pad", pluck: "Pluck",
};
