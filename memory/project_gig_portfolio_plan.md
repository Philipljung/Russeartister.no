---
name: Gig portfolio / previous work feature plan
description: Producers can showcase previous work on their gig page via Spotify, SoundCloud, or direct file upload
type: project
---

# Gig Portfolio — Previous Work Feature

**Why:** Buyers need to hear what the producer can do before placing a custom order. Producers should be able to link real tracks from Spotify or SoundCloud, or upload an audio file directly if they haven't released anything online.

**How to apply:** Reference this when building the gig setup UI and the public gig page (`/gig/[username]`).

---

## Three source types

| Type | How it works | What gets stored |
|---|---|---|
| **Spotify** | Producer searches by track name; uses Spotify Web API (Client Credentials, no user login needed) to find the track; embed player via `open.spotify.com/embed/track/[id]` | `spotify_track_id` |
| **SoundCloud** | Producer pastes a SoundCloud URL; use SoundCloud oEmbed endpoint to validate + fetch title/artwork; embed via `<iframe>` | `soundcloud_url` |
| **Direct upload** | Producer uploads a WAV or MP3 (≤ 30 MB); stored in Supabase `gig-portfolio` storage bucket; streamed via audio player on the gig page | `audio_url` (private or public bucket — public is fine since it's meant to be heard) |

---

## DB schema

### `gig_portfolio_items`
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| gig_id | uuid FK gigs | |
| producer_id | uuid FK profiles | denormalized for easy query |
| source_type | text | `'spotify'` / `'soundcloud'` / `'upload'` |
| title | text | display title (from Spotify/SoundCloud metadata, or entered manually for uploads) |
| spotify_track_id | text, nullable | e.g. `4uLU6hMCjMI75M1A2tKUQC` |
| soundcloud_url | text, nullable | full public SoundCloud URL |
| soundcloud_embed_html | text, nullable | oEmbed HTML snapshot cached at add time |
| audio_url | text, nullable | public URL for direct uploads |
| sort_order | int default 0 | producer can reorder |
| created_at | timestamptz | |

---

## Spotify integration

- Uses **Client Credentials** OAuth flow — only `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` in env; no user Spotify account needed
- API route `GET /api/spotify/search?q=...` proxies the Spotify search and returns track candidates (name, artist, album art, track ID)
- Producer picks a result from a dropdown/list
- The track ID is stored; the embed URL is constructed at render time: `https://open.spotify.com/embed/track/[id]`
- Spotify embeds are iframe-based and work without any auth on the viewer side

---

## SoundCloud integration

- Producer pastes a public SoundCloud URL
- API route validates it by calling `https://soundcloud.com/oembed?url=[url]&format=json` — returns title, thumbnail, embed HTML
- The embed HTML and URL are saved; embed HTML is rendered as-is in an iframe-sandboxed container on the gig page
- No SoundCloud API key required for oEmbed

---

## Direct upload

- WAV or MP3, max 30 MB
- Uploaded to `gig-portfolio` Supabase storage bucket (public read is fine — this is promotional material)
- Played inline with a custom audio player on the gig page (same style as beats/samples elsewhere on the platform)

---

## Gig page UI — "Tidligere arbeid" section

- Listed as a horizontal scrollable row of cards or a vertical playlist, each showing:
  - Cover art (from Spotify/SoundCloud metadata) or a colored placeholder for uploads
  - Track title + source badge (Spotify icon / SoundCloud icon / upload icon)
  - Embedded player or inline audio controls depending on type
- Up to 8 portfolio items per gig
- Producer can reorder, remove, or add items from the gig edit page

---

## Gig edit / setup (producer side)

- Section: "Legg til tidligere arbeid"
- Three tabs: Spotify / SoundCloud / Last opp fil
- Spotify: search input → results dropdown → click to add
- SoundCloud: URL paste field → validate + preview → click to add
- Upload: file picker → upload → title input → add
- Drag to reorder, trash icon to remove
- Limit: 8 items max

---

## API routes

| route | method | purpose |
|---|---|---|
| `GET /api/spotify/search?q=` | GET | proxy Spotify track search (server-side, uses Client Credentials token) |
| `POST /api/gig-portfolio/add` | POST | add a portfolio item (validate type, store) |
| `DELETE /api/gig-portfolio/[id]` | DELETE | remove a portfolio item |
| `PATCH /api/gig-portfolio/reorder` | PATCH | update sort_order for all items |

---

## Edge cases

- Spotify track deleted or made private after being added: the embed will show a "not available" iframe — acceptable, producer should update
- SoundCloud track set to private: oEmbed will fail at embed time — show a fallback "Track ikke tilgjengelig" card
- Direct upload: if producer deletes the file from their profile somehow, show same fallback
- Max 8 items enforced server-side on add
