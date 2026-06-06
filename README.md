# 🥪 Purple Sandwich — Live Band Karaoke App

A full-stack karaoke management system for live band karaoke nights.
Built with React + Supabase.

## The Four Screens

| Screen | URL | Device | Who uses it |
|--------|-----|--------|-------------|
| Singer Portal | `/sing` | Audience phones | Singers request songs |
| Band Dashboard | `/band` | Band laptop | Queue, scroll, transpose control |
| Stage Display | `/band` → Stage tab | TV via AirPlay | Lyrics + chords teleprompter |
| *(Queue Board coming soon)* | | iPad | Passive audience display |

---

## Quick Start

### 1. Clone the repo
```bash
git clone https://github.com/YOUR_USERNAME/purple-sandwich-karaoke.git
cd purple-sandwich-karaoke
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up Supabase
- Create a free project at [supabase.com](https://supabase.com)
- Go to **SQL Editor** and run the contents of `database.sql`
- Go to **Settings → API** and copy your Project URL and anon key

### 4. Configure environment
```bash
cp .env.example .env
```
Edit `.env` and fill in your Supabase credentials:
```
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_KEY=your-anon-key
```
⚠️ Never commit `.env` — it's already in `.gitignore`

### 5. Run locally
```bash
npm start
```
Opens at `http://localhost:3000`

- Singer portal: `http://localhost:3000/sing`
- Band dashboard: `http://localhost:3000/band`

---

## Deployment (Netlify — free)

1. Push repo to GitHub
2. Go to [netlify.com](https://netlify.com) → New site from Git
3. Connect your GitHub repo
4. Build settings:
   - Build command: `npm run build`
   - Publish directory: `build`
5. Add environment variables in Netlify dashboard (Site Settings → Environment Variables):
   - `REACT_APP_SUPABASE_URL`
   - `REACT_APP_SUPABASE_KEY`
6. Deploy — your app will be live at a Netlify URL

For custom domain (e.g. `purplesandwich.live/sing`) configure DNS in Netlify.

---

## How It Works — Night of a Gig

1. **Band opens the app** → Band tab → creates a new Event
2. **Singer portal goes live** — share `yourapp.com/sing` via QR code at the venue
3. Singers browse the song list, pick up to 3 songs, submit with their name
4. Requests appear live in the **Band Dashboard** queue
5. Band drags to reorder, hits ▶ Play when ready
6. **Stage display** shows lyrics + chords with auto-scroll teleprompter
7. Band controls scroll speed, pause, and transpose from the sidebar
8. ✓ Mark Complete → next song loads
9. End of night → band closes the Event
10. **History tab** shows full setlist — exportable as text

---

## Project Structure

```
src/
  index.js          # Router — /sing and /band routes
  supabase.js       # All Supabase API calls
  songs.js          # Song library + chord sheets
  SingerApp.jsx     # Singer request portal
  BandApp.jsx       # Band dashboard + stage display
public/
  index.html
database.sql        # Run this in Supabase to set up tables
.env.example        # Copy to .env and add your credentials
```

---

## Adding Songs

Edit `src/songs.js`:
- Add to `SONG_LIBRARY` array with a unique `id`
- Add chord sheet to `SONG_CONTENT` object with the same `id`

Format for chord sheets:
```
[Section Name]
Chord line here
Lyric line here
```

---

## Tech Stack

- **React** — UI
- **React Router** — `/sing` and `/band` routes
- **Supabase** — Postgres database + REST API
- **No backend needed** — Supabase handles everything

---

## Venue

Watkins Drinkery · 1712 S. 10th St. · Philadelphia

*Purple Sandwich presents Live Band Karaoke*
