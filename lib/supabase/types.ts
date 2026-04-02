export type Profile = {
  id: string;
  username: string;
  display_name: string;
  bio: string;
  avatar_url: string | null;
  stripe_account_id: string | null;
  stripe_onboarding_complete: boolean;
  instagram_url: string | null;
  spotify_url: string | null;
  soundcloud_url: string | null;
  created_at: string;
};

export type Beat = {
  id: string;
  producer_id: string;
  title: string;
  description: string;
  genre: string;
  bpm: number;
  key: string;
  tags: string[];
  price: number;
  exclusive_price: number | null;
  exclusively_sold: boolean;
  daw: string | null;
  vsts: string[] | null;
  vocal_type: "med_vokal" | "uten_vokal" | null;
  cover_url: string | null;
  audio_preview_url: string | null;
  project_file_url: string | null;
  is_published: boolean;
  created_at: string;
  producer?: Profile;
};

export type Sample = {
  id: string;
  producer_id: string;
  title: string;
  description: string;
  item_type: "sample" | "preset" | "sample-pack" | "preset-pack";
  category: string;
  vst: string | null;
  pack_files: string[] | null;
  genre: string;
  bpm: number | null;
  key: string;
  tags: string[];
  price: number;
  cover_url: string | null;
  audio_preview_url: string | null;
  file_url: string | null;
  is_published: boolean;
  deleted_at: string | null;
  created_at: string;
  producer?: Profile;
};

export type Remake = {
  id: string;
  producer_id: string;
  title: string;
  description: string;
  original_song: string | null;
  genre: string | null;
  bpm: number | null;
  key: string | null;
  daw: string | null;
  vsts: string[] | null;
  tags: string[];
  price: number;
  cover_url: string | null;
  audio_preview_url: string | null;
  file_url: string | null;
  is_published: boolean;
  deleted_at: string | null;
  created_at: string;
  producer?: Profile;
};

export type Pack = {
  id: string;
  producer_id: string;
  title: string;
  description: string;
  tags: string[];
  price: number;
  cover_url: string | null;
  preview_url: string | null;
  file_url: string | null;
  is_published: boolean;
  deleted_at: string | null;
  created_at: string;
  producer?: Profile;
  pack_items?: PackItem[];
};

export type PackItem = {
  id: string;
  pack_id: string;
  name: string;
  item_type: "sample" | "preset";
  sub_type: "one-shot" | "loop" | null;
  audio_url: string | null;
  file_url: string | null;
  vst: string | null;
  bpm: number | null;
  key: string | null;
  tags: string[];
  position: number;
  is_preview: boolean;
  sell_individually: boolean;
  individual_price: number | null;
  created_at: string;
};

export type Purchase = {
  id: string;
  buyer_id: string | null;
  producer_id: string | null;
  beat_id: string | null;
  remake_id: string | null;
  sample_id: string | null;
  pack_id: string | null;
  item_type: "beat" | "remake" | "sample" | "pack";
  order_number: string | null;
  customer_email: string | null;
  amount_paid: number;
  stripe_payment_intent_id: string | null;
  payout_released_at: string | null;
  complaint_filed_at: string | null;
  created_at: string;
  beat?: { id: string; title: string; cover_url: string | null; genre: string; bpm: number; project_file_url: string | null; producer: { display_name: string } | null };
  remake?: { id: string; title: string; cover_url: string | null; genre: string; bpm: number; file_url: string | null; producer: { display_name: string } | null };
  sample?: { id: string; title: string; cover_url: string | null; item_type: string; file_url: string | null; producer: { display_name: string } | null };
  pack?: { id: string; title: string; cover_url: string | null; file_url: string | null; producer: { display_name: string } | null };
};
