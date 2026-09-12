export const BPM_MIN = 60;
export const BPM_MAX = 220;
export const PRICE_MIN = 0;
export const PRICE_MAX = 30000;

export type Filters = {
  query: string;
  genre: string;
  vocal: "" | "med_vokal" | "uten_vokal";
  minBpm: number;
  maxBpm: number;
  minPrice: number;
  maxPrice: number;
  sortBy: string;
};

export const DEFAULT_FILTERS: Filters = {
  query: "",
  genre: "",
  vocal: "",
  minBpm: BPM_MIN,
  maxBpm: BPM_MAX,
  minPrice: PRICE_MIN,
  maxPrice: PRICE_MAX,
  sortBy: "newest",
};
