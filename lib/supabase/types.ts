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
  cover_url: string | null;
  audio_preview_url: string | null;
  project_file_url: string | null;
  is_published: boolean;
  created_at: string;
  producer?: Profile;
};

export type Purchase = {
  id: string;
  buyer_id: string | null;
  beat_id: string;
  amount_paid: number;
  stripe_payment_intent_id: string;
  created_at: string;
};
