// ─── SUPABASE CLIENT ──────────────────────────────────────────────────────────
// Store your credentials in a .env file (never commit that file to GitHub)
// Create a file called .env in the project root with:
//   REACT_APP_SUPABASE_URL=https://your-project.supabase.co
//   REACT_APP_SUPABASE_KEY=your-anon-key

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase credentials. Create a .env file — see README.md');
}

export async function sbFetch(path, opts = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...opts,
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": "return=representation",
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) {
    const e = await res.text();
    throw new Error(`Supabase error: ${e}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// ─── EVENTS ───────────────────────────────────────────────────────────────────
export const events = {
  list: () => sbFetch("/events?order=created_at.desc"),
  active: () => sbFetch("/events?status=eq.active&order=created_at.desc&limit=1"),
  create: (data) => sbFetch("/events", { method: "POST", body: JSON.stringify(data) }),
  update: (id, data) => sbFetch(`/events?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(data) }),
};

// ─── QUEUE ────────────────────────────────────────────────────────────────────
export const queue = {
  list: (eventId) => sbFetch(`/queue?event_id=eq.${eventId}&status=eq.queued&order=position.asc`),
  played: (eventId) => sbFetch(`/queue?event_id=eq.${eventId}&status=eq.done&order=position.asc`),
  update: (id, data) => sbFetch(`/queue?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (id) => sbFetch(`/queue?id=eq.${id}`, { method: "DELETE", headers: { "Prefer": "" } }),
  reorder: (items) => Promise.all(
    items.map((item, i) =>
      sbFetch(`/queue?id=eq.${item.id}`, { method: "PATCH", body: JSON.stringify({ position: i }) })
    )
  ),
};

// ─── REQUESTS ─────────────────────────────────────────────────────────────────
export const requests = {
  list: (eventId) => sbFetch(`/requests?event_id=eq.${eventId}&order=created_at.desc`),
  create: (data) => sbFetch("/requests", { method: "POST", body: JSON.stringify(data) }),
};

// ─── REQUEST SONGS ────────────────────────────────────────────────────────────
export const requestSongs = {
  list: (requestId) => sbFetch(`/request_songs?request_id=eq.${requestId}`),
  create: (data) => sbFetch("/request_songs", { method: "POST", body: JSON.stringify(data) }),
};

// ─── SUBMIT A FULL SINGER REQUEST ─────────────────────────────────────────────
export async function submitSingerRequest(singerName, songs, eventId) {
  // 1. Create request row
  const [req] = await requests.create({ singer_name: singerName, event_id: eventId });

  // 2. Create request_songs rows
  await requestSongs.create(songs.map(s => ({
    request_id: req.id,
    song_id: s.id, song_title: s.title,
    song_artist: s.artist, song_key: s.key, song_genre: s.genre,
  })));

  // 3. Get current max queue position for this event
  const existing = await sbFetch(
    `/queue?event_id=eq.${eventId}&status=eq.queued&select=position&order=position.desc&limit=1`
  );
  const nextPos = existing && existing.length > 0 ? existing[0].position + 1 : 0;

  // 4. Add each song to the queue
  await sbFetch("/queue", {
    method: "POST",
    body: JSON.stringify(songs.map((s, i) => ({
      request_id: req.id, event_id: eventId,
      singer_name: singerName, song_id: s.id,
      song_title: s.title, song_artist: s.artist,
      song_key: s.key, song_genre: s.genre,
      position: nextPos + i, status: "queued",
    }))),
  });

  // 5. Return queue position number
  const ahead = await sbFetch(
    `/queue?event_id=eq.${eventId}&status=eq.queued&position=lt.${nextPos}&select=id`
  );
  return (ahead ? ahead.length : 0) + 1;
}
