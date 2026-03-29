import { getSupabaseClient } from "./supabase/client";

export type PurchasedBeat = {
  purchase_id: string;
  beat_id: string;
  amount_paid: number;
  purchased_at: string;
  title: string;
  genre: string;
  bpm: number;
  key: string;
  cover_url: string | null;
  project_file_url: string | null;
  producer_name: string;
};

export async function fetchMyPurchases(): Promise<PurchasedBeat[]> {
  const supabase = getSupabaseClient();

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return [];
  }

  const { data, error } = await supabase
    .from("purchases")
    .select("id, beat_id, amount_paid, created_at, beat:beats(title, genre, bpm, key, cover_url, project_file_url, producer:profiles(display_name))")
    .eq("buyer_id", session.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[fetchPurchases] Error:", error.message);
    return [];
  }

  return (data ?? []).map((row: Record<string, unknown>) => {
    const beat = row.beat as Record<string, unknown> | null;
    const producer = beat?.producer as Record<string, unknown> | null;
    return {
      purchase_id: row.id as string,
      beat_id: row.beat_id as string,
      amount_paid: row.amount_paid as number,
      purchased_at: row.created_at as string,
      title: (beat?.title as string) ?? "Ukjent",
      genre: (beat?.genre as string) ?? "",
      bpm: (beat?.bpm as number) ?? 0,
      key: (beat?.key as string) ?? "",
      cover_url: (beat?.cover_url as string | null) ?? null,
      project_file_url: (beat?.project_file_url as string | null) ?? null,
      producer_name: (producer?.display_name as string) ?? "Ukjent",
    };
  });
}
