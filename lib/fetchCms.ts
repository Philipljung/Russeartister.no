import { getSupabaseClient } from "./supabase/client";

export type HeroSlide = {
  id: string;
  display_order: number;
  tag: string | null;
  headline: string;
  subtitle: string | null;
  picture_url: string | null;
  bg_gradient: string;
  cta_text: string | null;
  cta_url: string | null;
  is_clickable: boolean;
};

export type FooterLink = {
  id: string;
  display_order: number;
  label: string;
  url: string;
};

export type SiteSettings = {
  copyright_text: string;
  footer_tagline: string | null;
};

export async function fetchHeroSlides(): Promise<HeroSlide[]> {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from("hero_slides")
    .select("id,display_order,tag,headline,subtitle,picture_url,bg_gradient,cta_text,cta_url,is_clickable")
    .eq("is_active", true)
    .order("display_order");
  return data ?? [];
}

export type LegalPage = {
  slug: string;
  title: string;
  content: string;
  updated_at: string;
};

export async function fetchLegalPage(slug: string): Promise<LegalPage | null> {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from("legal_pages")
    .select("slug,title,content,updated_at")
    .eq("slug", slug)
    .single();
  return data ?? null;
}

export async function fetchFooterData(): Promise<{ links: FooterLink[]; settings: SiteSettings }> {
  const supabase = getSupabaseClient();
  const [linksRes, settingsRes] = await Promise.all([
    supabase.from("footer_links").select("id,display_order,label,url").eq("is_active", true).order("display_order"),
    supabase.from("site_settings").select("copyright_text,footer_tagline").eq("id", 1).single(),
  ]);
  return {
    links: linksRes.data ?? [],
    settings: settingsRes.data ?? { copyright_text: "© 2025 Russeartister.no", footer_tagline: null },
  };
}
