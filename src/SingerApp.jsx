import { useState, useEffect } from "react";

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_KEY;
const VENMO_HANDLE = "purple-sandwich"; // TODO: confirm exact Venmo handle
const BOARD_URL = "/LiveBandKaraoke/board";

async function sbFetch(path, opts = {}) {
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
  if (!res.ok) { const e = await res.text(); throw new Error(e); }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function getActiveEvent() {
  const list = await sbFetch("/events?status=eq.active&order=created_at.desc&limit=1");
  return list && list.length > 0 ? list[0] : null;
}

async function submitRequest(singerName, songs, eventId, instagramConsent, instagramHandle) {
  // Generate a session ID the singer keeps in browser memory
  const sessionId = crypto.randomUUID();
  const [req] = await sbFetch("/requests", {
    method: "POST",
    body: JSON.stringify({
      singer_name: singerName,
      event_id: eventId,
      session_id: sessionId,
      instagram_consent: instagramConsent,
      instagram_handle: instagramHandle || null,
    }),
  });
  await sbFetch("/request_songs", {
    method: "POST",
    body: JSON.stringify(songs.map(s => ({
      request_id: req.id,
      song_id: s.id, song_title: s.title,
      song_artist: s.artist, song_key: s.song_key || "", song_genre: s.genre || "",
    }))),
  });
  const bullpen = await sbFetch(`/requests?event_id=eq.${eventId}&select=id&order=created_at.asc`);
  const pos = (bullpen || []).findIndex(r => r.id === req.id) + 1;
  return { requestId: req.id, sessionId, bullpenPos: pos > 0 ? pos : (bullpen || []).length };
}

// Check singer status — first by request (bullpen), then by session_id in queue
async function checkStatus(requestId, sessionId) {
  // Check bullpen first
  const req = await sbFetch(`/requests?id=eq.${requestId}&select=id,singer_name,event_id`);
  if (req && req.length > 0) {
    const bullpen = await sbFetch(`/requests?event_id=eq.${req[0].event_id}&select=id&order=created_at.asc`);
    const pos = (bullpen || []).findIndex(r => r.id === requestId) + 1;
    return { status: "bullpen", bullpenPos: pos > 0 ? pos : 1, singerName: req[0].singer_name };
  }
  // Check queue by session_id
  if (sessionId) {
    const queued = await sbFetch(`/queue?session_id=eq.${sessionId}&select=id,singer_name,song_title,song_artist,status&order=created_at.desc&limit=1`);
    if (queued && queued.length > 0) {
      const item = queued[0];
      if (item.status === "done") return { status: "done", singerName: item.singer_name };
      if (item.status === "playing") return { status: "playing", singerName: item.singer_name, song: item.song_title, artist: item.song_artist };
      return { status: "queued", singerName: item.singer_name, song: item.song_title, artist: item.song_artist };
    }
  }
  return { status: "unknown" };
}

// Featured songs for HHH x Purple Sandwich event
const FEATURED_SONGS_80S = [
  { title: "Manic Monday", artist: "The Bangles" },
  { title: "Hit Me With Your Best Shot", artist: "Pat Benatar" },
  { title: "Heart of Glass", artist: "Blondie" },
  { title: "One Way or Another", artist: "Blondie" },
  { title: "Somebody's Baby", artist: "Jackson Browne" },
  { title: "Livin' on a Prayer", artist: "Bon Jovi" },
  { title: "Rock the Casbah", artist: "The Clash" },
  { title: "Should I Stay or Should I Go", artist: "The Clash" },
  { title: "Pour Some Sugar on Me", artist: "Def Leppard" },
  { title: "Whip It", artist: "Devo" },
  { title: "Hungry Like the Wolf", artist: "Duran Duran" },
  { title: "Touch of Grey", artist: "Grateful Dead" },
  { title: "I Wanna Dance With Somebody", artist: "Whitney Houston" },
  { title: "Rebel Yell", artist: "Billy Idol" },
  { title: "Super Freak", artist: "Rick James" },
  { title: "It's Still Rock and Roll to Me", artist: "Billy Joel" },
  { title: "Don't Stop Believin'", artist: "Journey" },
  { title: "Walking on Sunshine", artist: "Katrina and the Waves" },
  { title: "Funkytown", artist: "Lipps, Inc." },
  { title: "Working for the Weekend", artist: "Loverboy" },
  { title: "Like a Prayer", artist: "Madonna" },
  { title: "Material Girl", artist: "Madonna" },
  { title: "Down Under", artist: "Men at Work" },
  { title: "Who Could it Be Now", artist: "Men at Work" },
  { title: "99 Red Balloons", artist: "Nena" },
  { title: "Crazy Train", artist: "Ozzy Osbourne" },
  { title: "9 to 5", artist: "Dolly Parton" },
  { title: "Islands in the Stream", artist: "Parton & Rogers" },
  { title: "Free Fallin'", artist: "Tom Petty" },
  { title: "Refugee", artist: "Tom Petty" },
  { title: "Every Rose Has Its Thorn", artist: "Poison" },
  { title: "1999", artist: "Prince" },
  { title: "Raspberry Beret", artist: "Prince" },
  { title: "Crazy Little Thing Called Love", artist: "Queen" },
  { title: "End of the World as we Know it", artist: "R.E.M." },
  { title: "Stand", artist: "R.E.M." },
  { title: "The One I Love", artist: "R.E.M." },
  { title: "Bang the Drum All Day", artist: "Todd Rundgren" },
  { title: "You Can Call Me Al", artist: "Paul Simon" },
  { title: "Jessie's Girl", artist: "Rick Springfield" },
  { title: "Born in the USA", artist: "Bruce Springsteen" },
  { title: "Dancing in the Dark", artist: "Bruce Springsteen" },
  { title: "Glory Days", artist: "Bruce Springsteen" },
  { title: "She Works Hard for the Money", artist: "Donna Summer" },
  { title: "Africa", artist: "Toto" },
  { title: "Jenny (867-5309)", artist: "Tommy Tutone" },
  { title: "We're Not Gonna Take It", artist: "Twisted Sister" },
  { title: "Total Eclipse of the Heart", artist: "Bonnie Tyler" },
];

// Normalize strings for fuzzy matching — strips punctuation, extra spaces, apostrophe variants
function normalizeForMatch(str) {
  return (str || "")
    .toLowerCase()
    .replace(/['']/g, "'")           // normalize curly apostrophes
    .replace(/[.,!?]/g, "")          // strip periods, commas, etc
    .replace(/\s+/g, " ")            // collapse whitespace
    .trim();
}

async function fetchFeaturedSongs() {
  const songs = await sbFetch("/songs?select=id,title,artist,genre,song_key&order=title.asc") || [];
  return FEATURED_SONGS_80S.map(f => {
    const fTitle = normalizeForMatch(f.title);
    const fArtist = normalizeForMatch(f.artist);
    return songs.find(s =>
      normalizeForMatch(s.title) === fTitle &&
      normalizeForMatch(s.artist) === fArtist
    );
  }).filter(Boolean);
}

// Fetch Bandeoke categories (Drive folder names = genre column)
async function fetchCategories() {
  const songs = await sbFetch("/songs?select=genre&genre=not.is.null");
  const cats = new Set((songs || []).map(s => s.genre).filter(Boolean));
  return Array.from(cats).sort();
}

// Fetch top 20 MusicBrainz tags by frequency
async function fetchTopTags() {
  const songs = await sbFetch("/songs?select=tags&tags=not.is.null");
  const freq = {};
  (songs || []).forEach(s => {
    if (s.tags) s.tags.forEach(t => { freq[t] = (freq[t] || 0) + 1; });
  });
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([tag]) => tag);
}

// Fetch songs with filters — no limit when browsing, 50 when searching
async function fetchSongs(query, category, mbTag) {
  const limit = query.trim() ? 50 : 300;
  let path = `/songs?select=id,title,artist,genre,song_key,tags&order=artist.asc,title.asc&limit=${limit}`;

  if (category) path += `&genre=eq.${encodeURIComponent(category)}`;

  if (query.trim()) {
    const q = encodeURIComponent(`%${query.trim()}%`);
    path += `&or=(title.ilike.${q},artist.ilike.${q})`;
  }

  const songs = await sbFetch(path) || [];

  // Filter by MB tag client-side (OR with other filters)
  if (mbTag) {
    if (category || query.trim()) {
      // OR mode — also fetch songs that have this tag regardless of other filters
      const tagPath = `/songs?select=id,title,artist,genre,song_key,tags&order=artist.asc,title.asc&limit=${limit}&tags=cs.{${encodeURIComponent(mbTag)}}`;
      const tagSongs = await sbFetch(tagPath) || [];
      // Merge and deduplicate
      const ids = new Set(songs.map(s => s.id));
      tagSongs.forEach(s => { if (!ids.has(s.id)) songs.push(s); });
      songs.sort((a, b) => a.artist?.localeCompare(b.artist) || a.title?.localeCompare(b.title));
    } else {
      // Only MB tag selected — filter directly
      return songs.filter(s => s.tags && s.tags.includes(mbTag));
    }
  }

  return songs;
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,500;0,9..40,700&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  :root{--deep:#0e0825;--purple:#2d1b69;--gold:#f5c842;--gold-dim:#c9a020;--green:#27ae60;--fd:'Bebas Neue',sans-serif;--fb:'DM Sans',sans-serif;}
  html,body{height:100%;font-family:var(--fb);background:var(--deep);color:white;}
  button{cursor:pointer;font-family:var(--fb);}
  input{font-family:var(--fb);}
  ::-webkit-scrollbar{width:4px;}
  ::-webkit-scrollbar-thumb{background:rgba(245,200,66,.2);border-radius:2px;}
  .song-card{display:flex;align-items:center;gap:14px;padding:13px 15px;background:rgba(255,255,255,.04);border:2px solid rgba(255,255,255,.07);border-radius:12px;cursor:pointer;transition:all .15s;-webkit-tap-highlight-color:transparent;}
  .song-card:active{transform:scale(0.98);}
  .song-card.selected{background:rgba(245,200,66,.12);border-color:var(--gold);}
  .song-card.disabled{opacity:0.3;cursor:not-allowed;}
  .genre-pill{padding:6px 13px;border-radius:20px;font-size:13px;font-weight:500;border:1.5px solid rgba(255,255,255,.12);background:transparent;color:rgba(255,255,255,.5);cursor:pointer;transition:all .15s;white-space:nowrap;-webkit-tap-highlight-color:transparent;}
  .genre-pill.active{background:var(--gold);border-color:var(--gold);color:var(--deep);font-weight:700;}
  .submit-btn{width:100%;padding:18px;border:none;border-radius:12px;font-family:var(--fd);font-size:22px;letter-spacing:3px;transition:all .2s;}
  .submit-btn.ready{background:var(--gold);color:var(--deep);}
  .submit-btn.not-ready{background:rgba(255,255,255,.07);color:rgba(255,255,255,.2);cursor:not-allowed;}
  @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
  .fade-up{animation:fadeUp .4s ease forwards;}
  @keyframes pulse-ring{0%{box-shadow:0 0 0 0 rgba(245,200,66,.4)}70%{box-shadow:0 0 0 20px rgba(245,200,66,0)}100%{box-shadow:0 0 0 0 rgba(245,200,66,0)}}
  .pulse{animation:pulse-ring 2s ease infinite;}
  @keyframes pulse-green{0%{box-shadow:0 0 0 0 rgba(39,174,96,.5)}70%{box-shadow:0 0 0 20px rgba(39,174,96,0)}100%{box-shadow:0 0 0 0 rgba(39,174,96,0)}}
  .pulse-green{animation:pulse-green 1.5s ease infinite;}
`;

// ─── STATUS SCREEN ────────────────────────────────────────────────────────────
function StatusScreen({ requestId, sessionId, initialName, initialPicks, onReset }) {
  const [statusData, setStatusData] = useState({ status: "bullpen", bullpenPos: 1, singerName: initialName });

  useEffect(() => {
    const poll = async () => {
      try {
        const s = await checkStatus(requestId, sessionId);
        setStatusData(s);
      } catch(e) { console.error(e); }
    };
    poll();
    const t = setInterval(poll, 4000);
    return () => clearInterval(t);
  }, [requestId, sessionId]);

  const { status, bullpenPos, singerName, song, artist } = statusData;

  // ── BULLPEN ──
  if (status === "bullpen") {
    return (
      <div className="fade-up" style={{minHeight:"100dvh",background:"radial-gradient(ellipse at 50% 30%, rgba(45,27,105,.6) 0%, var(--deep) 65%)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"32px 24px",textAlign:"center"}}>
        <div style={{fontSize:64,marginBottom:12,lineHeight:1}}>🏟</div>
        <h1 style={{fontFamily:"var(--fd)",fontSize:52,color:"var(--gold)",letterSpacing:4,lineHeight:1}}>REQUEST RECEIVED</h1>
        <p style={{color:"rgba(255,255,255,.5)",fontSize:17,marginTop:10,lineHeight:1.7,maxWidth:320}}>
          You're in the bullpen, <strong style={{color:"white"}}>{singerName}</strong>.<br/>
          Hang tight — the band will call you up.
        </p>

        <div className="pulse" style={{margin:"28px 0",background:"rgba(245,200,66,.07)",border:"2px solid var(--gold)",borderRadius:20,padding:"22px 48px",width:"100%",maxWidth:280}}>
          <div style={{fontFamily:"var(--fd)",fontSize:12,color:"var(--gold-dim)",letterSpacing:5,marginBottom:4}}>BULLPEN POSITION</div>
          <div style={{fontFamily:"var(--fd)",fontSize:80,color:"white",lineHeight:1}}>#{bullpenPos}</div>
          <div style={{color:"rgba(255,255,255,.3)",fontSize:13,marginTop:4}}>Wait to be called</div>
        </div>

        <div style={{padding:"14px 18px",background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.08)",borderRadius:12,maxWidth:340,width:"100%",marginBottom:28}}>
          <div style={{fontFamily:"var(--fd)",fontSize:11,color:"var(--gold-dim)",letterSpacing:3,marginBottom:8}}>YOUR PICKS</div>
          {initialPicks.map((p,i) => (
            <div key={p.id} style={{display:"flex",gap:10,padding:"6px 0",borderBottom:"1px solid rgba(255,255,255,.05)",alignItems:"center"}}>
              <span style={{fontFamily:"var(--fd)",fontSize:18,color:"rgba(245,200,66,.4)",width:20,flexShrink:0}}>{i+1}</span>
              <div>
                <div style={{fontWeight:600,fontSize:13}}>{p.title}</div>
                <div style={{color:"rgba(255,255,255,.35)",fontSize:11}}>{p.artist}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{fontSize:12,color:"rgba(255,255,255,.2)",marginBottom:20,fontFamily:"var(--fd)",letterSpacing:2}}>
          THIS PAGE UPDATES AUTOMATICALLY
        </div>

        {/* View queue + tip jar */}
        <div style={{display:"flex",gap:10,marginBottom:20,width:"100%",maxWidth:340}}>
          <a href={BOARD_URL} style={{
            flex:1,padding:"12px",background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.15)",
            borderRadius:10,color:"rgba(255,255,255,.7)",fontFamily:"var(--fd)",fontSize:13,letterSpacing:1,
            textDecoration:"none",textAlign:"center",display:"flex",alignItems:"center",justifyContent:"center",gap:6
          }}>📺 VIEW QUEUE</a>
          <a href={`https://venmo.com/${VENMO_HANDLE}`} target="_blank" rel="noopener noreferrer" style={{
            flex:1,padding:"12px",background:"rgba(61,157,224,.12)",border:"1px solid rgba(61,157,224,.35)",
            borderRadius:10,color:"#5fb3ea",fontFamily:"var(--fd)",fontSize:13,letterSpacing:1,
            textDecoration:"none",textAlign:"center",display:"flex",alignItems:"center",justifyContent:"center",gap:6
          }}>💸 TIP THE BAND</a>
        </div>

        <button onClick={onReset} style={{background:"transparent",border:"2px solid rgba(245,200,66,.3)",color:"rgba(245,200,66,.6)",padding:"10px 28px",borderRadius:10,fontFamily:"var(--fd)",fontSize:15,letterSpacing:2}}>
          SUBMIT ANOTHER REQUEST
        </button>
      </div>
    );
  }

  // ── QUEUED ──
  if (status === "queued") {
    return (
      <div className="fade-up" style={{minHeight:"100dvh",background:"radial-gradient(ellipse at 50% 30%, rgba(45,27,105,.7) 0%, var(--deep) 65%)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"32px 24px",textAlign:"center"}}>
        <div style={{fontSize:64,marginBottom:12,lineHeight:1}}>🎵</div>
        <h1 style={{fontFamily:"var(--fd)",fontSize:52,color:"var(--gold)",letterSpacing:4,lineHeight:1}}>YOU'RE IN THE QUEUE!</h1>
        <p style={{color:"rgba(255,255,255,.5)",fontSize:17,marginTop:10,lineHeight:1.7}}>
          Get ready, <strong style={{color:"white"}}>{singerName}</strong>
        </p>

        <div className="pulse" style={{margin:"28px 0",background:"rgba(245,200,66,.08)",border:"2px solid var(--gold)",borderRadius:20,padding:"24px 48px",width:"100%",maxWidth:320}}>
          <div style={{fontFamily:"var(--fd)",fontSize:12,color:"var(--gold-dim)",letterSpacing:4,marginBottom:8}}>YOUR SONG</div>
          <div style={{fontFamily:"var(--fd)",fontSize:32,color:"white",letterSpacing:2,lineHeight:1.2}}>{song}</div>
          <div style={{color:"rgba(255,255,255,.5)",fontSize:16,marginTop:6}}>{artist}</div>
        </div>

        <div style={{padding:"14px 18px",background:"rgba(39,174,96,.08)",border:"1px solid rgba(39,174,96,.3)",borderRadius:12,maxWidth:320,width:"100%",marginBottom:28}}>
          <div style={{fontSize:14,color:"rgba(255,255,255,.6)",lineHeight:1.6}}>
            🎸 The band has added you to the queue. Stay close to the stage!
          </div>
        </div>

        <div style={{fontSize:12,color:"rgba(255,255,255,.2)",fontFamily:"var(--fd)",letterSpacing:2}}>THIS PAGE UPDATES AUTOMATICALLY</div>
      </div>
    );
  }

  // ── PLAYING ──
  if (status === "playing") {
    return (
      <div className="fade-up" style={{minHeight:"100dvh",background:"radial-gradient(ellipse at 50% 40%, rgba(39,174,96,.3) 0%, var(--deep) 65%)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"32px 24px",textAlign:"center"}}>
        <div style={{fontSize:80,marginBottom:12,lineHeight:1}}>🎤</div>
        <h1 style={{fontFamily:"var(--fd)",fontSize:64,color:"var(--green)",letterSpacing:4,lineHeight:1}}>GET UP THERE!</h1>
        <p style={{color:"rgba(255,255,255,.7)",fontSize:20,marginTop:10}}>
          It's your time, <strong style={{color:"white"}}>{singerName}</strong>!
        </p>
        <div className="pulse-green" style={{margin:"28px 0",background:"rgba(39,174,96,.1)",border:"2px solid var(--green)",borderRadius:20,padding:"24px 48px",width:"100%",maxWidth:320}}>
          <div style={{fontFamily:"var(--fd)",fontSize:36,color:"white",lineHeight:1.2}}>{song}</div>
          <div style={{color:"rgba(255,255,255,.5)",fontSize:18,marginTop:6}}>{artist}</div>
        </div>
      </div>
    );
  }

  // ── DONE ──
  if (status === "done") {
    return (
      <div className="fade-up" style={{minHeight:"100dvh",background:"radial-gradient(ellipse at 50% 30%, rgba(45,27,105,.5) 0%, var(--deep) 65%)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"32px 24px",textAlign:"center"}}>
        <div style={{fontSize:72,marginBottom:12,lineHeight:1}}>⭐</div>
        <h1 style={{fontFamily:"var(--fd)",fontSize:56,color:"var(--gold)",letterSpacing:4,lineHeight:1}}>GREAT JOB!</h1>
        <p style={{color:"rgba(255,255,255,.5)",fontSize:17,marginTop:10}}>Thanks for singing, <strong style={{color:"white"}}>{singerName}</strong>!</p>
        <div style={{marginTop:32,marginBottom:28,padding:"16px 24px",background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.1)",borderRadius:12,maxWidth:320,width:"100%"}}>
          <div style={{fontSize:14,color:"rgba(255,255,255,.5)",lineHeight:1.6}}>Want to sing again? Submit another request below.</div>
        </div>
        <button onClick={onReset} className="submit-btn ready" style={{maxWidth:320,fontSize:18}}>
          REQUEST AGAIN
        </button>
      </div>
    );
  }

  // fallback
  return null;
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function SingerApp() {
  const [activeEvent, setActiveEvent] = useState(null);
  const [eventLoading, setEventLoading] = useState(true);
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(null);
  const [mbTag, setMbTag] = useState(null);
  const [categories, setCategories] = useState([]);
  const [topTags, setTopTags] = useState([]);
  const [results, setResults] = useState([]);
  const [allSongs, setAllSongs] = useState([]);
  const [featuredSongs, setFeaturedSongs] = useState([]);
  const [allLoading, setAllLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [picks, setPicks] = useState([]);
  const [instagramConsent, setInstagramConsent] = useState(false);
  const [instagramHandle, setInstagramHandle] = useState("");
  const [submitted, setSubmitted] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    getActiveEvent().then(e => { setActiveEvent(e); setEventLoading(false); }).catch(() => setEventLoading(false));
    const t = setInterval(() => getActiveEvent().then(setActiveEvent).catch(console.error), 30000);
    return () => clearInterval(t);
  }, []);

  // Load filter options and full song list on mount
  useEffect(() => {
    fetchCategories().then(setCategories).catch(console.error);
    fetchTopTags().then(setTopTags).catch(console.error);
    fetchFeaturedSongs().then(setFeaturedSongs).catch(console.error);
    fetchSongs("", null, null)
      .then(songs => { setAllSongs(songs); setAllLoading(false); })
      .catch(() => setAllLoading(false));
  }, []);

  // Debounced search/filter
  useEffect(() => {
    const hasFilter = search.trim() || category || mbTag;
    if (!hasFilter) { setResults([]); return; }
    setSearching(true);
    const t = setTimeout(() => {
      fetchSongs(search, category, mbTag)
        .then(setResults)
        .catch(console.error)
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [search, category, mbTag]);

  // What to show in the list
  const hasFilter = search.trim() || category || mbTag;
  const displayedSongs = hasFilter ? results : allSongs;
  const isLoading = hasFilter ? searching : allLoading;


  const [browseMode, setBrowseMode] = useState("featured"); // "featured" | "all"

  const toggle = (song) => {
    if (picks.find(p => p.id === song.id)) { setPicks(picks.filter(p => p.id !== song.id)); return; }
    if (picks.length < 3) setPicks([...picks, song]);
  };

  const submit = async () => {
    if (!name.trim() || picks.length === 0 || loading || !activeEvent) return;
    setLoading(true); setError(null);
    try {
      const { requestId, sessionId } = await submitRequest(name.trim(), picks, activeEvent.id, instagramConsent, instagramHandle.trim());
      setSubmitted({ requestId, sessionId, name: name.trim(), picks: [...picks] });
    } catch(e) { setError("Couldn't submit — please try again."); console.error(e); }
    finally { setLoading(false); }
  };

  const handleReset = () => {
    setSubmitted(null); setName(""); setPicks([]); setSearch("");
    setCategory(null); setMbTag(null); setInstagramConsent(false); setInstagramHandle("");
  };

  // Show status screen after submission
  if (submitted) {
    return (
      <>
        <style>{css}</style>
        <StatusScreen
          requestId={submitted.requestId}
          initialName={submitted.name}
          initialPicks={submitted.picks}
          onReset={handleReset}
        />
      </>
    );
  }

  const canSubmit = name.trim().length > 0 && picks.length > 0 && !loading && !!activeEvent;

  return (
    <>
      <style>{css}</style>
      <div style={{minHeight:"100dvh",background:"var(--deep)"}}>
        {/* Header */}
        <div style={{background:"linear-gradient(180deg,rgba(45,27,105,.9) 0%,var(--deep) 100%)",padding:"24px 20px 16px",borderBottom:"2px solid rgba(245,200,66,.2)",position:"sticky",top:0,zIndex:10,backdropFilter:"blur(12px)"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
            <span style={{fontSize:20}}>🥪</span>
            <div>
              <div style={{fontFamily:"var(--fd)",fontSize:22,color:"var(--gold)",letterSpacing:3,lineHeight:1}}>PURPLE SANDWICH</div>
              <div style={{fontFamily:"var(--fd)",fontSize:10,color:"rgba(245,200,66,.4)",letterSpacing:4}}>LIVE BAND KARAOKE</div>
            </div>
          </div>
          {!eventLoading && activeEvent && (
            <div style={{display:"inline-flex",alignItems:"center",gap:6,background:"rgba(39,174,96,.1)",border:"1px solid rgba(39,174,96,.3)",borderRadius:6,padding:"4px 10px"}}>
              <div style={{width:6,height:6,borderRadius:"50%",background:"#27ae60",boxShadow:"0 0 4px #27ae60"}} />
              <span style={{fontSize:12,color:"rgba(255,255,255,.6)"}}>{activeEvent.name} · {activeEvent.venue}</span>
            </div>
          )}
          {!eventLoading && !activeEvent && (
            <div style={{display:"inline-flex",alignItems:"center",gap:6,background:"rgba(192,57,43,.1)",border:"1px solid rgba(192,57,43,.3)",borderRadius:6,padding:"4px 10px"}}>
              <span style={{fontSize:12,color:"rgba(192,57,43,.8)"}}>No active event — check back soon!</span>
            </div>
          )}
        </div>

        <div style={{padding:"20px",maxWidth:560,margin:"0 auto"}}>

          {/* Name */}
          <div style={{marginBottom:16}}>
            <label style={{display:"block",fontFamily:"var(--fd)",fontSize:12,color:"var(--gold-dim)",letterSpacing:3,marginBottom:7}}>YOUR NAME</label>
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="What should we call you?" maxLength={30}
              style={{width:"100%",padding:"14px 16px",background:"rgba(255,255,255,.05)",border:`2px solid ${name.trim()?"rgba(245,200,66,.4)":"rgba(255,255,255,.1)"}`,borderRadius:12,color:"white",fontSize:17,outline:"none",transition:"border-color .2s"}} />
          </div>

          {/* Instagram consent */}
          <div style={{marginBottom:16,padding:"14px 16px",background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.08)",borderRadius:12}}>
            <div style={{display:"flex",alignItems:"flex-start",gap:12,cursor:"pointer"}} onClick={()=>setInstagramConsent(c=>!c)}>
              <div style={{
                width:22,height:22,borderRadius:5,border:`2px solid ${instagramConsent?"var(--gold)":"rgba(255,255,255,.25)"}`,
                background:instagramConsent?"var(--gold)":"transparent",flexShrink:0,marginTop:1,
                display:"flex",alignItems:"center",justifyContent:"center",transition:"all .15s",
                pointerEvents:"none"
              }}>
                {instagramConsent && <span style={{color:"var(--deep)",fontSize:13,fontWeight:700}}>✓</span>}
              </div>
              <span style={{fontSize:13,color:"rgba(255,255,255,.6)",lineHeight:1.5,pointerEvents:"none"}}>
                May we post a clip of your performance on our Instagram?
                <span style={{color:"rgba(255,255,255,.3)",fontSize:11,display:"block",marginTop:2}}>@purplesandwichpresents</span>
              </span>
            </div>
            {instagramConsent && (
              <div style={{marginTop:12}} onClick={e=>e.stopPropagation()}>
                <input value={instagramHandle} onChange={e=>setInstagramHandle(e.target.value)}
                  placeholder="Your Instagram handle (optional)"
                  style={{width:"100%",padding:"10px 14px",background:"rgba(255,255,255,.05)",border:"1.5px solid rgba(245,200,66,.3)",borderRadius:8,color:"white",fontSize:13,outline:"none"}} />
              </div>
            )}
          </div>

          {/* Picks summary */}
          {picks.length > 0 && (
            <div style={{marginBottom:14,padding:"12px 14px",background:"rgba(245,200,66,.06)",border:"1px solid rgba(245,200,66,.2)",borderRadius:10}}>
              <div style={{fontFamily:"var(--fd)",fontSize:11,color:"var(--gold-dim)",letterSpacing:3,marginBottom:7}}>YOUR PICKS ({picks.length}/3)</div>
              {picks.map((p,i) => (
                <div key={p.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"3px 0",fontSize:13}}>
                  <span style={{color:"rgba(255,255,255,.7)"}}>{i+1}. {p.title} — {p.artist}</span>
                  <button onClick={()=>setPicks(picks.filter(x=>x.id!==p.id))} style={{background:"none",border:"none",color:"rgba(255,255,255,.3)",fontSize:15,padding:"0 4px"}}>✕</button>
                </div>
              ))}
            </div>
          )}

          {error && <div style={{marginBottom:10,padding:"11px 14px",background:"rgba(192,57,43,.15)",border:"1px solid rgba(192,57,43,.4)",borderRadius:8,color:"#e74c3c",fontSize:13}}>{error}</div>}

          <button className={`submit-btn ${canSubmit?"ready":"not-ready"}`} onClick={submit} disabled={!canSubmit} style={{marginBottom:24}}>
            {loading ? "SUBMITTING…"
              : !activeEvent ? "NO ACTIVE EVENT"
              : picks.length===0 ? "SELECT UP TO 3 SONGS BELOW"
              : !name.trim() ? "ENTER YOUR NAME ABOVE"
              : `SUBMIT ${picks.length} PICK${picks.length>1?"S":""}`}
          </button>

          {/* Browse mode tabs */}
          <div style={{display:"flex",gap:8,marginBottom:20}}>
            <button onClick={()=>setBrowseMode("featured")} style={{
              flex:1,padding:"12px 16px",borderRadius:24,border:"none",cursor:"pointer",
              background:browseMode==="featured"?"var(--gold)":"rgba(255,255,255,.07)",
              color:browseMode==="featured"?"var(--deep)":"rgba(255,255,255,.5)",
              fontFamily:"var(--fd)",fontSize:15,letterSpacing:2,transition:"all .2s"
            }}>⭐ FEATURED</button>
            <button onClick={()=>setBrowseMode("all")} style={{
              flex:1,padding:"12px 16px",borderRadius:24,border:"none",cursor:"pointer",
              background:browseMode==="all"?"var(--gold)":"rgba(255,255,255,.07)",
              color:browseMode==="all"?"var(--deep)":"rgba(255,255,255,.5)",
              fontFamily:"var(--fd)",fontSize:15,letterSpacing:2,transition:"all .2s"
            }}>🎵 ALL SONGS</button>
          </div>

          {/* FEATURED MODE */}
          {browseMode==="featured" && (
            <div>
              <div style={{fontFamily:"var(--fd)",fontSize:11,color:"rgba(255,255,255,.3)",letterSpacing:3,marginBottom:12}}>🕺 BACK TO THE '80S · WATKINS DRINKERY</div>
              <div style={{display:"flex",flexDirection:"column",gap:7,marginBottom:16}}>
                {featuredSongs.length === 0 && (
                  <div style={{textAlign:"center",padding:"28px",color:"rgba(255,255,255,.25)",fontSize:13}}>Loading…</div>
                )}
                {featuredSongs.map(song => {
                  const selected = !!picks.find(p => p.id===song.id);
                  const disabled = !selected && picks.length>=3;
                  return (
                    <div key={song.id} className={`song-card${selected?" selected":""}${disabled?" disabled":""}`}
                      onClick={()=>!disabled&&toggle(song)}
                      style={{background:selected?"rgba(245,200,66,.12)":"rgba(245,200,66,.04)",borderColor:selected?"var(--gold)":"rgba(245,200,66,.2)"}}>
                      <div style={{width:24,height:24,borderRadius:"50%",flexShrink:0,
                        border:`2px solid ${selected?"var(--gold)":"rgba(245,200,66,.3)"}`,
                        background:selected?"var(--gold)":"transparent",
                        display:"flex",alignItems:"center",justifyContent:"center",transition:"all .15s"}}>
                        {selected && <span style={{color:"var(--deep)",fontSize:12,fontWeight:700}}>✓</span>}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontWeight:600,fontSize:14,color:"white"}}>{song.title}</div>
                        <div style={{color:"rgba(255,255,255,.4)",fontSize:12,marginTop:2}}>{song.artist}</div>
                      </div>
                      {song.song_key && <div style={{fontFamily:"monospace",fontSize:11,color:selected?"var(--gold)":"rgba(255,255,255,.3)",flexShrink:0}}>{song.song_key}</div>}
                    </div>
                  );
                })}
              </div>
              <button onClick={()=>setBrowseMode("all")} style={{width:"100%",padding:"10px",background:"none",border:"1px solid rgba(255,255,255,.1)",borderRadius:10,color:"rgba(255,255,255,.3)",fontSize:13,cursor:"pointer"}}>
                Browse all {allSongs.length} songs →
              </button>
            </div>
          )}

          {/* ALL SONGS MODE */}
          {browseMode==="all" && (
            <div>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search songs or artists…"
                style={{width:"100%",padding:"11px 14px",background:"rgba(255,255,255,.05)",border:"1.5px solid rgba(255,255,255,.1)",borderRadius:10,color:"white",fontSize:13,outline:"none",marginBottom:14}} />

              {categories.length > 0 && (
                <div style={{marginBottom:12}}>
                  <div style={{fontFamily:"var(--fd)",fontSize:10,color:"var(--gold-dim)",letterSpacing:3,marginBottom:7}}>BANDEOKE CATEGORIES</div>
                  <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:4}}>
                    {categories.map(c => (
                      <button key={c} className={`genre-pill${category===c?" active":""}`} onClick={()=>setCategory(category===c?null:c)}>{c}</button>
                    ))}
                  </div>
                </div>
              )}

              {topTags.length > 0 && (
                <div style={{marginBottom:14}}>
                  <div style={{fontFamily:"var(--fd)",fontSize:10,color:"rgba(255,255,255,.3)",letterSpacing:3,marginBottom:7}}>GENRES</div>
                  <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:4,flexWrap:"wrap"}}>
                    {topTags.map(t => (
                      <button key={t} onClick={()=>setMbTag(mbTag===t?null:t)}
                        style={{padding:"5px 11px",borderRadius:20,fontSize:12,fontWeight:500,whiteSpace:"nowrap",cursor:"pointer",
                          border:`1.5px solid ${mbTag===t?"rgba(255,255,255,.5)":"rgba(255,255,255,.1)"}`,
                          background:mbTag===t?"rgba(255,255,255,.15)":"transparent",
                          color:mbTag===t?"white":"rgba(255,255,255,.4)",transition:"all .15s"}}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {(category || mbTag) && (
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,fontSize:12,color:"rgba(255,255,255,.4)"}}>
                  <span>Filtering by:</span>
                  {category && <span style={{background:"rgba(245,200,66,.15)",color:"var(--gold)",padding:"2px 8px",borderRadius:4}}>{category}</span>}
                  {mbTag && category && <span>or</span>}
                  {mbTag && <span style={{background:"rgba(255,255,255,.1)",color:"white",padding:"2px 8px",borderRadius:4}}>{mbTag}</span>}
                  <button onClick={()=>{setCategory(null);setMbTag(null);}} style={{background:"none",border:"none",color:"rgba(255,255,255,.3)",cursor:"pointer",fontSize:13}}>✕ clear</button>
                </div>
              )}

              {!isLoading && displayedSongs.length > 0 && (
                <div style={{fontSize:11,color:"rgba(255,255,255,.2)",marginBottom:8,textAlign:"right"}}>
                  {displayedSongs.length} songs{displayedSongs.length>=300&&!hasFilter?" — search to narrow down":""}
                </div>
              )}

              <div style={{display:"flex",flexDirection:"column",gap:7,marginBottom:20}}>
                {isLoading && <div style={{textAlign:"center",padding:"20px",color:"rgba(255,255,255,.2)",fontSize:13}}>Loading…</div>}
                {!isLoading && displayedSongs.length===0 && hasFilter && (
                  <div style={{textAlign:"center",padding:"28px",color:"rgba(255,255,255,.25)",fontSize:13}}>No songs found</div>
                )}
                {!isLoading && displayedSongs.map(song => {
                  const selected = !!picks.find(p => p.id===song.id);
                  const disabled = !selected && picks.length>=3;
                  return (
                    <div key={song.id} className={`song-card${selected?" selected":""}${disabled?" disabled":""}`} onClick={()=>!disabled&&toggle(song)}>
                      <div style={{width:24,height:24,borderRadius:"50%",flexShrink:0,
                        border:`2px solid ${selected?"var(--gold)":"rgba(255,255,255,.2)"}`,
                        background:selected?"var(--gold)":"transparent",
                        display:"flex",alignItems:"center",justifyContent:"center",transition:"all .15s"}}>
                        {selected && <span style={{color:"var(--deep)",fontSize:12,fontWeight:700}}>✓</span>}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontWeight:600,fontSize:14,color:"white"}}>{song.title}</div>
                        <div style={{color:"rgba(255,255,255,.4)",fontSize:12,marginTop:2}}>{song.artist}</div>
                      </div>
                      <div style={{textAlign:"right",flexShrink:0}}>
                        {song.genre && <div style={{fontSize:11,color:"rgba(255,255,255,.25)",marginBottom:2}}>{song.genre}</div>}
                        {song.song_key && <div style={{fontFamily:"monospace",fontSize:11,color:selected?"var(--gold)":"rgba(255,255,255,.3)"}}>{song.song_key}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{textAlign:"center",marginTop:4,marginBottom:20,color:"rgba(255,255,255,.1)",fontSize:11,letterSpacing:2,fontFamily:"var(--fd)"}}>
            WATKINS DRINKERY · 1712 S. 10TH ST.
          </div>
        </div>
      </div>
    </>
  );
}
