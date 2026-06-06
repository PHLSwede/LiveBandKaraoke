import { useState, useEffect } from "react";

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_KEY;





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

async function submitRequest(singerName, songs, eventId) {
  const [req] = await sbFetch("/requests", {
    method: "POST",
    body: JSON.stringify({ singer_name: singerName, event_id: eventId }),
  });
  await sbFetch("/request_songs", {
    method: "POST",
    body: JSON.stringify(songs.map(s => ({
      request_id: req.id,
      song_id: s.id, song_title: s.title,
      song_artist: s.artist, song_key: s.key, song_genre: s.genre,
    }))),
  });
  const queueItems = await sbFetch(`/queue?event_id=eq.${eventId}&status=eq.queued&select=position&order=position.desc&limit=1`);
  const nextPos = queueItems && queueItems.length > 0 ? queueItems[0].position + 1 : 0;
  await sbFetch("/queue", {
    method: "POST",
    body: JSON.stringify(songs.map((s, i) => ({
      request_id: req.id, event_id: eventId,
      singer_name: singerName, song_id: s.id, song_title: s.title,
      song_artist: s.artist, song_key: s.key, song_genre: s.genre,
      position: nextPos + i, status: "queued",
    }))),
  });
  const ahead = await sbFetch(`/queue?event_id=eq.${eventId}&status=eq.queued&position=lt.${nextPos}&select=id`);
  return (ahead ? ahead.length : 0) + 1;
}

const SONG_LIBRARY = [
  { id: 1, title: "Wonderwall", artist: "Oasis", key: "Em", genre: "Rock" },
  { id: 2, title: "Sweet Home Chicago", artist: "Robert Johnson", key: "E", genre: "Blues" },
  { id: 3, title: "Brown Eyed Girl", artist: "Van Morrison", key: "G", genre: "Pop Rock" },
  { id: 4, title: "Superstition", artist: "Stevie Wonder", key: "Ebm", genre: "Funk/Soul" },
  { id: 5, title: "Valerie", artist: "Amy Winehouse", key: "C", genre: "Soul" },
  { id: 6, title: "Mr. Brightside", artist: "The Killers", key: "C#", genre: "Indie Rock" },
  { id: 7, title: "I Will Survive", artist: "Gloria Gaynor", key: "Am", genre: "Disco" },
  { id: 8, title: "Fly Me To The Moon", artist: "Frank Sinatra", key: "Am", genre: "Jazz" },
];

const ALL_GENRES = ["All", ...Array.from(new Set(SONG_LIBRARY.map(s => s.genre)))];

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,500;0,9..40,700&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  :root{--deep:#0e0825;--purple:#2d1b69;--gold:#f5c842;--gold-dim:#c9a020;--fd:'Bebas Neue',sans-serif;--fb:'DM Sans',sans-serif;}
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
  .submit-btn{width:100%;padding:18px;border:none;border-radius:12px;font-family:var(--fd);font-size:22px;letter-spacing:3px;transition:all .2s;-webkit-tap-highlight-color:transparent;}
  .submit-btn.ready{background:var(--gold);color:var(--deep);}
  .submit-btn.ready:active{transform:scale(0.98);filter:brightness(0.95);}
  .submit-btn.not-ready{background:rgba(255,255,255,.07);color:rgba(255,255,255,.2);cursor:not-allowed;}
  @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
  .fade-up{animation:fadeUp .4s ease forwards;}
  @keyframes pulse-ring{0%{box-shadow:0 0 0 0 rgba(245,200,66,.4)}70%{box-shadow:0 0 0 20px rgba(245,200,66,0)}100%{box-shadow:0 0 0 0 rgba(245,200,66,0)}}
  .pulse{animation:pulse-ring 2s ease infinite;}
`;

function Confirmation({ name, picks, queuePos, eventName, onReset }) {
  return (
    <div className="fade-up" style={{minHeight:"100dvh",background:"radial-gradient(ellipse at 50% 30%, rgba(100,60,200,.4) 0%, var(--deep) 65%)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"32px 24px",textAlign:"center"}}>
      <div style={{fontSize:72,marginBottom:16,lineHeight:1}}>🎤</div>
      <h1 style={{fontFamily:"var(--fd)",fontSize:64,color:"var(--gold)",letterSpacing:4,lineHeight:1}}>YOU'RE IN!</h1>
      <p style={{color:"rgba(255,255,255,.55)",fontSize:17,marginTop:8}}>
        Get ready, <strong style={{color:"white"}}>{name}</strong>
      </p>
      {eventName && <div style={{marginTop:8,color:"rgba(255,255,255,.3)",fontSize:13,fontFamily:"var(--fd)",letterSpacing:2}}>{eventName}</div>}
      <div className="pulse" style={{margin:"28px 0",background:"rgba(245,200,66,.08)",border:"2px solid var(--gold)",borderRadius:20,padding:"22px 48px",width:"100%",maxWidth:300}}>
        <div style={{fontFamily:"var(--fd)",fontSize:13,color:"var(--gold-dim)",letterSpacing:5,marginBottom:4}}>QUEUE POSITION</div>
        <div style={{fontFamily:"var(--fd)",fontSize:88,color:"white",lineHeight:1}}>#{queuePos}</div>
        <div style={{color:"rgba(255,255,255,.35)",fontSize:13,marginTop:6}}>~{Math.max(0,(queuePos-1)*5)} min wait</div>
      </div>
      <div style={{width:"100%",maxWidth:380,marginBottom:28,textAlign:"left"}}>
        <div style={{fontFamily:"var(--fd)",fontSize:13,color:"var(--gold-dim)",letterSpacing:4,marginBottom:10}}>YOUR SONGS</div>
        {picks.map((p,i) => (
          <div key={p.id} style={{display:"flex",gap:14,alignItems:"center",padding:"10px 0",borderBottom:"1px solid rgba(255,255,255,.07)"}}>
            <span style={{fontFamily:"var(--fd)",fontSize:22,color:"var(--gold-dim)",width:24,flexShrink:0}}>{i+1}</span>
            <div>
              <div style={{fontWeight:600,fontSize:14}}>{p.title}</div>
              <div style={{color:"rgba(255,255,255,.4)",fontSize:12}}>{p.artist} · {p.genre}</div>
            </div>
          </div>
        ))}
      </div>
      <button onClick={onReset} style={{background:"transparent",border:"2px solid rgba(245,200,66,.4)",color:"var(--gold)",padding:"12px 36px",borderRadius:10,fontFamily:"var(--fd)",fontSize:17,letterSpacing:2}}>
        REQUEST AGAIN
      </button>
      <div style={{marginTop:36,color:"rgba(255,255,255,.12)",fontSize:12,letterSpacing:2,fontFamily:"var(--fd)"}}>PURPLE SANDWICH · WATKINS DRINKERY</div>
    </div>
  );
}

export default function SingerApp() {
  const [activeEvent, setActiveEvent] = useState(null);
  const [eventLoading, setEventLoading] = useState(true);
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const [genre, setGenre] = useState("All");
  const [picks, setPicks] = useState([]);
  const [submitted, setSubmitted] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    getActiveEvent().then(e => { setActiveEvent(e); setEventLoading(false); }).catch(() => setEventLoading(false));
    const t = setInterval(() => getActiveEvent().then(setActiveEvent).catch(console.error), 30000);
    return () => clearInterval(t);
  }, []);

  const filtered = SONG_LIBRARY.filter(s => {
    const matchesGenre = genre === "All" || s.genre === genre;
    const matchesSearch = [s.title, s.artist].some(f => f.toLowerCase().includes(search.toLowerCase()));
    return matchesGenre && matchesSearch;
  });

  const toggle = (song) => {
    if (picks.find(p => p.id === song.id)) { setPicks(picks.filter(p => p.id !== song.id)); return; }
    if (picks.length < 3) setPicks([...picks, song]);
  };

  const submit = async () => {
    if (!name.trim() || picks.length === 0 || loading || !activeEvent) return;
    setLoading(true); setError(null);
    try {
      const pos = await submitRequest(name.trim(), picks, activeEvent.id);
      setSubmitted({ name: name.trim(), picks: [...picks], queuePos: pos, eventName: activeEvent.name });
    } catch(e) { setError("Couldn't submit — please try again."); console.error(e); }
    finally { setLoading(false); }
  };

  if (submitted) {
    return (
      <>
        <style>{css}</style>
        <Confirmation {...submitted} onReset={() => { setSubmitted(null); setName(""); setPicks([]); setSearch(""); setGenre("All"); }} />
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
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:activeEvent?6:0}}>
            <span style={{fontSize:20}}>🥪</span>
            <div>
              <div style={{fontFamily:"var(--fd)",fontSize:22,color:"var(--gold)",letterSpacing:3,lineHeight:1}}>PURPLE SANDWICH</div>
              <div style={{fontFamily:"var(--fd)",fontSize:10,color:"rgba(245,200,66,.4)",letterSpacing:4}}>LIVE BAND KARAOKE</div>
            </div>
          </div>
          {/* Active event badge */}
          {!eventLoading && activeEvent && (
            <div style={{marginTop:6,display:"inline-flex",alignItems:"center",gap:6,background:"rgba(39,174,96,.1)",border:"1px solid rgba(39,174,96,.3)",borderRadius:6,padding:"4px 10px"}}>
              <div style={{width:6,height:6,borderRadius:"50%",background:"#27ae60",boxShadow:"0 0 4px #27ae60"}} />
              <span style={{fontSize:12,color:"rgba(255,255,255,.6)"}}>{activeEvent.name} · {activeEvent.venue}</span>
            </div>
          )}
          {!eventLoading && !activeEvent && (
            <div style={{marginTop:6,display:"inline-flex",alignItems:"center",gap:6,background:"rgba(192,57,43,.1)",border:"1px solid rgba(192,57,43,.3)",borderRadius:6,padding:"4px 10px"}}>
              <span style={{fontSize:12,color:"rgba(192,57,43,.8)"}}>No active event — check back soon!</span>
            </div>
          )}
        </div>

        <div style={{padding:"20px",maxWidth:560,margin:"0 auto"}}>
          {/* Name */}
          <div style={{marginBottom:24}}>
            <label style={{display:"block",fontFamily:"var(--fd)",fontSize:12,color:"var(--gold-dim)",letterSpacing:3,marginBottom:7}}>YOUR NAME</label>
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="What should we call you?" maxLength={30}
              style={{width:"100%",padding:"14px 16px",background:"rgba(255,255,255,.05)",border:`2px solid ${name.trim()?"rgba(245,200,66,.4)":"rgba(255,255,255,.1)"}`,borderRadius:12,color:"white",fontSize:17,outline:"none",transition:"border-color .2s"}} />
          </div>

          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
            <label style={{fontFamily:"var(--fd)",fontSize:12,color:"var(--gold-dim)",letterSpacing:3}}>PICK YOUR SONGS</label>
            <span style={{fontSize:12,fontWeight:600,color:picks.length===3?"var(--gold)":"rgba(255,255,255,.3)"}}>{picks.length} / 3</span>
          </div>

          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search songs or artists…"
            style={{width:"100%",padding:"11px 14px",background:"rgba(255,255,255,.05)",border:"1.5px solid rgba(255,255,255,.1)",borderRadius:10,color:"white",fontSize:13,outline:"none",marginBottom:10}} />

          <div style={{display:"flex",gap:7,overflowX:"auto",paddingBottom:10,marginBottom:10}}>
            {ALL_GENRES.map(g => <button key={g} className={`genre-pill${genre===g?" active":""}`} onClick={()=>setGenre(g)}>{g}</button>)}
          </div>

          <div style={{display:"flex",flexDirection:"column",gap:7,marginBottom:20}}>
            {filtered.length===0 && <div style={{textAlign:"center",padding:"28px",color:"rgba(255,255,255,.25)",fontSize:13}}>No songs found</div>}
            {filtered.map(song => {
              const selected = !!picks.find(p => p.id===song.id);
              const disabled = !selected && picks.length>=3;
              return (
                <div key={song.id} className={`song-card${selected?" selected":""}${disabled?" disabled":""}`} onClick={()=>!disabled&&toggle(song)}>
                  <div style={{width:24,height:24,borderRadius:"50%",flexShrink:0,border:`2px solid ${selected?"var(--gold)":"rgba(255,255,255,.2)"}`,background:selected?"var(--gold)":"transparent",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .15s"}}>
                    {selected && <span style={{color:"var(--deep)",fontSize:12,fontWeight:700}}>✓</span>}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:600,fontSize:14,color:"white"}}>{song.title}</div>
                    <div style={{color:"rgba(255,255,255,.4)",fontSize:12,marginTop:2}}>{song.artist}</div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <div style={{fontSize:11,color:"rgba(255,255,255,.25)",marginBottom:2}}>{song.genre}</div>
                    <div style={{fontFamily:"monospace",fontSize:11,color:selected?"var(--gold)":"rgba(255,255,255,.3)"}}>{song.key}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {picks.length > 0 && (
            <div style={{marginBottom:14,padding:"12px 14px",background:"rgba(245,200,66,.06)",border:"1px solid rgba(245,200,66,.2)",borderRadius:10}}>
              <div style={{fontFamily:"var(--fd)",fontSize:11,color:"var(--gold-dim)",letterSpacing:3,marginBottom:7}}>YOUR PICKS</div>
              {picks.map((p,i) => (
                <div key={p.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"3px 0",fontSize:13}}>
                  <span style={{color:"rgba(255,255,255,.7)"}}>{i+1}. {p.title}</span>
                  <button onClick={()=>setPicks(picks.filter(x=>x.id!==p.id))} style={{background:"none",border:"none",color:"rgba(255,255,255,.3)",fontSize:15,padding:"0 4px"}}>✕</button>
                </div>
              ))}
            </div>
          )}

          {error && <div style={{marginBottom:10,padding:"11px 14px",background:"rgba(192,57,43,.15)",border:"1px solid rgba(192,57,43,.4)",borderRadius:8,color:"#e74c3c",fontSize:13}}>{error}</div>}

          <button className={`submit-btn ${canSubmit?"ready":"not-ready"}`} onClick={submit} disabled={!canSubmit}>
            {loading ? "SUBMITTING…"
              : !activeEvent ? "NO ACTIVE EVENT"
              : picks.length===0 ? "SELECT A SONG TO CONTINUE"
              : !name.trim() ? "ENTER YOUR NAME ABOVE"
              : `REQUEST ${picks.length} SONG${picks.length>1?"S":""}`}
          </button>

          <div style={{textAlign:"center",marginTop:20,color:"rgba(255,255,255,.1)",fontSize:11,letterSpacing:2,fontFamily:"var(--fd)"}}>
            WATKINS DRINKERY · 1712 S. 10TH ST.
          </div>
        </div>
      </div>
    </>
  );
}
