import { useState, useEffect, useRef } from "react";

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

// ─── API HELPERS ──────────────────────────────────────────────────────────────
const api = {
  events: {
    list: () => sbFetch("/events?order=created_at.desc"),
    active: () => sbFetch("/events?status=eq.active&order=created_at.desc&limit=1"),
    create: (data) => sbFetch("/events", { method: "POST", body: JSON.stringify(data) }),
    update: (id, data) => sbFetch(`/events?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  },
  queue: {
    list: (eventId) => sbFetch(`/queue?event_id=eq.${eventId}&status=eq.queued&order=position.asc`),
    played: (eventId) => sbFetch(`/queue?event_id=eq.${eventId}&status=eq.done&order=position.asc`),
    update: (id, data) => sbFetch(`/queue?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id) => sbFetch(`/queue?id=eq.${id}`, { method: "DELETE", headers: { "Prefer": "" } }),
    reorder: (items) => Promise.all(items.map((item, i) =>
      sbFetch(`/queue?id=eq.${item.id}`, { method: "PATCH", body: JSON.stringify({ position: i }) })
    )),
  },
  requests: {
    list: (eventId) => sbFetch(`/requests?event_id=eq.${eventId}&order=created_at.desc`),
  },
  requestSongs: {
    list: (requestId) => sbFetch(`/request_songs?request_id=eq.${requestId}`),
  },
};

// ─── SONG CONTENT ─────────────────────────────────────────────────────────────
const SONG_CONTENT = {
  1: `[Verse 1]\nEm7        G          Dsus4       A7sus4\nToday is gonna be the day that they're gonna throw it back to you\nEm7        G          Dsus4       A7sus4\nBy now you should've somehow realized what you gotta do\n\n[Chorus]\nC          Em7         C          Em7\nAnd all the roads we have to walk are winding\nC          Em7         C          Em7\nAnd all the lights that lead us there are blinding\n\nC    Em7       G      Em7\nBecause maybe, you're gonna be the one that saves me\nC    Em7       G\nAnd after all, you're my wonderwall`,
  2: `[Verse 1]\nE7\nOh, baby don't you want to go\nA7                    E7\nBack to the land of California, to my sweet home Chicago\n\n[Bridge]\nB7              A7\nNow, one and one is two, two and two is four\nE7                     B7\nI'm heavy loaded baby, I'm booked, I gotta go`,
  3: `[Verse 1]\nG              C           G              D\nHey where did we go, days when the rains came?\nG              C         G             D\nDown in the hollow, playing a new game\n\n[Chorus]\nC           D              G      Em\nAnd you, my brown eyed girl\nC            D                 G\nYou my brown eyed girl`,
  4: `[Verse 1]\nEbm\nVery superstitious, writings on the wall\nEbm\nVery superstitious, ladders bout to fall\n\n[Chorus]\nAb7                   Ebm\nWhen you believe in things that you don't understand\nAb7              Ebm\nThen you suffer, superstition ain't the way`,
  5: `[Verse 1]\nC                              Dm\nWell sometimes I go out by myself and I look across the water\n\n[Chorus]\nC        Dm\nWon't you come on over, stop making a fool out of me\nC        Dm\nWhy don't you come on over, Valerie`,
  6: `[Verse 1]\nC#               Bb              F               Bb\nComing out of my cage and I've been doing just fine\nC#               Bb              F               Bb\nIt started out with a kiss how did it end up like this\n\n[Chorus]\nC#              Bb              F\nNow I'm falling asleep and she's calling a cab\nBb                 F\nAnd it's all in my head`,
  7: `[Verse 1]\nAm              Dm\nAt first I was afraid, I was petrified\nG                     C\nKept thinking I could never live without you by my side\n\n[Chorus]\nAm        Dm\nAnd so you're back from outer space\nG                       C\nI just walked in to find you here with that sad look upon your face`,
  8: `[Verse 1]\nAm        Dm        G7          C\nFly me to the moon, let me play among the stars\nFmaj7         Bm7b5    E7            Am\nLet me see what spring is like on Jupiter and Mars\n\n[Bridge]\nDm7       G7         Cmaj7      Am\nIn other words, hold my hand\nDm7       G7               C\nIn other words, darling kiss me`,
};

// ─── TRANSPOSE ────────────────────────────────────────────────────────────────
const NOTES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const ENH = {Db:"C#",Eb:"D#",Gb:"F#",Ab:"G#",Bb:"A#"};
function transposeNote(note, n) { const r=ENH[note]||note; const i=NOTES.indexOf(r); return i===-1?note:NOTES[(i+n+12)%12]; }
function transposeChord(chord, n) { return chord.replace(/^([A-G][b#]?)(.*)$/, (_,root,suf) => transposeNote(root,n)+suf); }
function transposeLine(line, n) {
  if (n===0) return line;
  return line.replace(/\b([A-G][b#]?(?:maj|min|m|dim|aug|sus[24]?|add\d|[0-9])*(?:\/[A-G][b#]?)?)/g, c => transposeChord(c,n));
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=IBM+Plex+Mono:wght@400;700&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,500;0,9..40,700&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  :root{
    --stage:#2d1b69; --stage-dark:#1a0f40; --stage-deeper:#0e0825;
    --gold:#f5c842; --gold2:#c9a020; --red:#c0392b; --green:#27ae60;
    --fd:'Bebas Neue',sans-serif; --fb:'DM Sans',sans-serif; --fm:'IBM Plex Mono',monospace;
  }
  body{font-family:var(--fb);background:var(--stage-deeper);color:white;}
  button{cursor:pointer;font-family:var(--fb);}
  input,select,textarea{font-family:var(--fb);}
  input[type=range]{accent-color:var(--gold);}
  ::-webkit-scrollbar{width:5px;}
  ::-webkit-scrollbar-thumb{background:rgba(245,200,66,.3);border-radius:3px;}
  .queue-row{transition:background .15s;}
  .queue-row:hover{background:rgba(255,255,255,.07)!important;}
  .btn-play:hover{filter:brightness(1.15);}
  .tab-btn{padding:14px 22px;background:transparent;border:none;border-bottom:3px solid transparent;color:rgba(255,255,255,.3);font-family:var(--fd);font-size:14px;letter-spacing:1.5px;cursor:pointer;}
  .tab-btn.active{border-bottom-color:var(--gold);color:var(--gold);}
  .input-base{width:100%;padding:12px 14px;background:rgba(255,255,255,.06);border:1.5px solid rgba(255,255,255,.12);border-radius:8px;color:white;font-size:14px;outline:none;}
  .input-base:focus{border-color:rgba(245,200,66,.5);}
  @keyframes spin{to{transform:rotate(360deg)}}
  .spin{animation:spin 1s linear infinite;display:inline-block;}
  @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
  .fade-in{animation:fadeIn .25s ease forwards;}
`;

// ─── NAV ─────────────────────────────────────────────────────────────────────
function Nav({ view, setView }) {
  return (
    <nav style={{background:"var(--stage-deeper)",display:"flex",alignItems:"stretch",borderBottom:"3px solid var(--gold)",flexShrink:0}}>
      <div style={{padding:"0 20px",display:"flex",alignItems:"center",marginRight:"auto",gap:10}}>
        <span style={{fontSize:18}}>🥪</span>
        <div>
          <div style={{fontFamily:"var(--fd)",fontSize:19,color:"var(--gold)",letterSpacing:3,lineHeight:1}}>PURPLE SANDWICH</div>
          <div style={{fontFamily:"var(--fd)",fontSize:10,color:"rgba(245,200,66,.4)",letterSpacing:4,lineHeight:1}}>BAND CONTROL</div>
        </div>
      </div>
      {[["dashboard","🎸 Band"],["display","📺 Stage"]].map(([v,label]) => (
        <button key={v} onClick={() => setView(v)} style={{
          background:view===v?"var(--gold)":"transparent",
          color:view===v?"var(--stage-deeper)":"var(--gold)",
          border:"none",padding:"0 20px",fontFamily:"var(--fd)",fontSize:14,letterSpacing:1.5,
          borderLeft:"1px solid rgba(245,200,66,.15)",transition:"all .15s"
        }}>{label}</button>
      ))}
    </nav>
  );
}

// ─── EVENT SELECTOR / CREATOR ─────────────────────────────────────────────────
function EventPanel({ activeEvent, onEventChange }) {
  const [events, setEvents] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", venue: "Watkins Drinkery", date: new Date().toISOString().split("T")[0] });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const list = await api.events.list().catch(() => []);
    setEvents(list || []);
  };

  useEffect(() => { load(); }, []);

  const createEvent = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      // Close any currently active events
      const active = events.filter(e => e.status === "active");
      await Promise.all(active.map(e => api.events.update(e.id, { status: "closed" })));
      const [created] = await api.events.create({ ...form, status: "active" });
      onEventChange(created);
      await load();
      setShowCreate(false);
      setForm({ name: "", venue: "Watkins Drinkery", date: new Date().toISOString().split("T")[0] });
    } catch(e) { console.error(e); }
    finally { setSaving(false); }
  };

  const switchEvent = async (event) => {
    // Close all active, set selected as active
    const active = events.filter(e => e.status === "active" && e.id !== event.id);
    await Promise.all(active.map(e => api.events.update(e.id, { status: "closed" })));
    if (event.status !== "active") await api.events.update(event.id, { status: "active" });
    onEventChange(event);
    await load();
  };

  const closeEvent = async () => {
    if (!activeEvent) return;
    await api.events.update(activeEvent.id, { status: "closed" });
    onEventChange(null);
    await load();
  };

  return (
    <div style={{padding:"16px 18px",background:"rgba(0,0,0,.3)",borderBottom:"1px solid rgba(245,200,66,.15)"}}>
      {/* Active event banner */}
      {activeEvent ? (
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:8,height:8,borderRadius:"50%",background:"var(--green)",boxShadow:"0 0 6px var(--green)",flexShrink:0}} />
            <div>
              <div style={{fontFamily:"var(--fd)",fontSize:16,color:"var(--gold)",letterSpacing:2,lineHeight:1}}>{activeEvent.name}</div>
              <div style={{color:"rgba(255,255,255,.4)",fontSize:12,marginTop:2}}>{activeEvent.venue} · {new Date(activeEvent.date).toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})}</div>
            </div>
          </div>
          <div style={{display:"flex",gap:8,flexShrink:0}}>
            <button onClick={() => setShowCreate(true)} style={{padding:"6px 12px",background:"rgba(245,200,66,.12)",border:"1px solid rgba(245,200,66,.3)",borderRadius:6,color:"var(--gold)",fontFamily:"var(--fd)",fontSize:12,letterSpacing:1}}>+ NEW</button>
            <button onClick={closeEvent} style={{padding:"6px 12px",background:"rgba(192,57,43,.15)",border:"1px solid rgba(192,57,43,.3)",borderRadius:6,color:"var(--red)",fontFamily:"var(--fd)",fontSize:12,letterSpacing:1}}>CLOSE</button>
          </div>
        </div>
      ) : (
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{color:"rgba(255,255,255,.4)",fontSize:14}}>No active event</div>
          <button onClick={() => setShowCreate(true)} style={{padding:"8px 16px",background:"var(--gold)",border:"none",borderRadius:6,color:"var(--stage-deeper)",fontFamily:"var(--fd)",fontSize:13,letterSpacing:1}}>+ CREATE EVENT</button>
        </div>
      )}

      {/* Past events switcher */}
      {events.filter(e => e.id !== activeEvent?.id).length > 0 && !showCreate && (
        <div style={{marginTop:10,display:"flex",gap:6,flexWrap:"wrap"}}>
          {events.filter(e => e.id !== activeEvent?.id).map(e => (
            <button key={e.id} onClick={() => switchEvent(e)} style={{
              padding:"4px 10px",background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.12)",
              borderRadius:6,color:"rgba(255,255,255,.5)",fontSize:12,cursor:"pointer"
            }}>{e.name} · {new Date(e.date).toLocaleDateString("en-US",{month:"short",day:"numeric"})}</button>
          ))}
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="fade-in" style={{marginTop:12,display:"flex",flexDirection:"column",gap:8,padding:"14px",background:"rgba(255,255,255,.04)",borderRadius:10,border:"1px solid rgba(245,200,66,.2)"}}>
          <div style={{fontFamily:"var(--fd)",fontSize:13,color:"var(--gold2)",letterSpacing:3,marginBottom:4}}>NEW EVENT</div>
          <input className="input-base" placeholder="Event name (e.g. Thursday Night Karaoke)" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} />
          <input className="input-base" placeholder="Venue" value={form.venue} onChange={e=>setForm({...form,venue:e.target.value})} />
          <input className="input-base" type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} />
          <div style={{display:"flex",gap:8,marginTop:4}}>
            <button onClick={createEvent} disabled={saving||!form.name.trim()} style={{flex:1,padding:"10px",background:form.name.trim()?"var(--gold)":"rgba(255,255,255,.1)",border:"none",borderRadius:7,color:form.name.trim()?"var(--stage-deeper)":"rgba(255,255,255,.3)",fontFamily:"var(--fd)",fontSize:14,letterSpacing:1}}>
              {saving ? "CREATING…" : "CREATE & GO LIVE"}
            </button>
            <button onClick={() => setShowCreate(false)} style={{padding:"10px 16px",background:"transparent",border:"1px solid rgba(255,255,255,.15)",borderRadius:7,color:"rgba(255,255,255,.4)",fontSize:13}}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── HISTORY TAB ──────────────────────────────────────────────────────────────
function HistoryPanel() {
  const [events, setEvents] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [songsByEvent, setSongsByEvent] = useState({});
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(null);

  useEffect(() => {
    const load = async () => {
      const list = await api.events.list().catch(() => []);
      setEvents(list || []);
      setLoading(false);
      // Load played songs for all events
      const allSongs = {};
      await Promise.all((list || []).map(async e => {
        const played = await api.queue.played(e.id).catch(() => []);
        allSongs[e.id] = played || [];
      }));
      setSongsByEvent(allSongs);
    };
    load();
  }, []);

  const exportEvent = (event) => {
    const songs = songsByEvent[event.id] || [];
    const lines = [
      `${event.name}`,
      `${event.venue} — ${new Date(event.date).toLocaleDateString("en-US",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}`,
      ``,
      ...songs.map((s, i) => `${i+1}. ${s.song_title} (${s.song_artist}) — ${s.singer_name}`),
      ``,
      `Total songs played: ${songs.length}`,
    ].join("\n");
    navigator.clipboard.writeText(lines);
    setCopied(event.id);
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) return <div style={{padding:"40px",textAlign:"center",color:"rgba(255,255,255,.3)"}}>Loading history…</div>;
  if (events.length === 0) return <div style={{padding:"60px",textAlign:"center",color:"rgba(255,255,255,.2)"}}>
    <div style={{fontSize:40,marginBottom:12}}>📋</div>
    <div style={{fontFamily:"var(--fd)",fontSize:18,letterSpacing:2}}>NO EVENTS YET</div>
    <div style={{fontSize:13,marginTop:8}}>Create your first event to start tracking history</div>
  </div>;

  return (
    <div style={{display:"flex",flexDirection:"column",gap:10,padding:20}}>
      {events.map(event => {
        const songs = songsByEvent[event.id] || [];
        const isOpen = expanded[event.id];
        const uniqueSingers = new Set(songs.map(s => s.singer_name)).size;
        return (
          <div key={event.id} style={{background:"rgba(255,255,255,.04)",border:`1px solid ${event.status==="active"?"rgba(245,200,66,.4)":"rgba(255,255,255,.08)"}`,borderRadius:12,overflow:"hidden"}}>
            {/* Event header */}
            <div onClick={() => setExpanded({...expanded,[event.id]:!isOpen})}
              style={{padding:"16px 18px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                {event.status==="active" && <div style={{width:7,height:7,borderRadius:"50%",background:"var(--green)",boxShadow:"0 0 5px var(--green)",flexShrink:0}} />}
                <div>
                  <div style={{fontFamily:"var(--fd)",fontSize:18,color:event.status==="active"?"var(--gold)":"white",letterSpacing:2,lineHeight:1}}>{event.name}</div>
                  <div style={{color:"rgba(255,255,255,.4)",fontSize:12,marginTop:3}}>
                    {event.venue} · {new Date(event.date).toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric",year:"numeric"})}
                  </div>
                </div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
                <div style={{textAlign:"right"}}>
                  <div style={{fontFamily:"var(--fd)",fontSize:22,color:"var(--gold)",lineHeight:1}}>{songs.length}</div>
                  <div style={{color:"rgba(255,255,255,.3)",fontSize:11}}>songs · {uniqueSingers} singers</div>
                </div>
                <span style={{color:"rgba(255,255,255,.3)",fontSize:18}}>{isOpen?"▲":"▼"}</span>
              </div>
            </div>

            {/* Song list */}
            {isOpen && (
              <div className="fade-in">
                <div style={{borderTop:"1px solid rgba(255,255,255,.06)"}}>
                  {songs.length === 0 ? (
                    <div style={{padding:"20px",textAlign:"center",color:"rgba(255,255,255,.25)",fontSize:13}}>No songs played yet</div>
                  ) : (
                    songs.map((s, i) => (
                      <div key={s.id} style={{
                        display:"flex",alignItems:"center",gap:14,padding:"11px 18px",
                        borderBottom:"1px solid rgba(255,255,255,.04)",
                        background:i%2===0?"transparent":"rgba(255,255,255,.02)"
                      }}>
                        <span style={{fontFamily:"var(--fd)",fontSize:18,color:"rgba(245,200,66,.4)",width:28,flexShrink:0}}>{i+1}</span>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontWeight:600,fontSize:14,color:"white"}}>{s.song_title}</div>
                          <div style={{color:"rgba(255,255,255,.4)",fontSize:12}}>{s.song_artist}</div>
                        </div>
                        <div style={{textAlign:"right",flexShrink:0}}>
                          <div style={{color:"rgba(255,255,255,.7)",fontSize:13,fontWeight:600}}>{s.singer_name}</div>
                          <div style={{fontFamily:"var(--fm)",fontSize:11,color:"rgba(255,255,255,.25)"}}>{s.song_key}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {songs.length > 0 && (
                  <div style={{padding:"12px 18px",borderTop:"1px solid rgba(255,255,255,.06)",display:"flex",justifyContent:"flex-end"}}>
                    <button onClick={() => exportEvent(event)} style={{
                      padding:"8px 16px",background:copied===event.id?"rgba(39,174,96,.2)":"rgba(255,255,255,.06)",
                      border:`1px solid ${copied===event.id?"rgba(39,174,96,.4)":"rgba(255,255,255,.15)"}`,
                      borderRadius:6,color:copied===event.id?"var(--green)":"rgba(255,255,255,.5)",fontSize:13,cursor:"pointer"
                    }}>
                      {copied===event.id ? "✓ Copied!" : "📋 Copy setlist"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── REQUEST SONGS INLINE ─────────────────────────────────────────────────────
function RequestSongs({ requestId }) {
  const [songs, setSongs] = useState([]);
  useEffect(() => { api.requestSongs.list(requestId).then(setSongs).catch(console.error); }, [requestId]);
  return (
    <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
      {songs.map(s => (
        <span key={s.id} style={{background:"rgba(245,200,66,.1)",border:"1px solid rgba(245,200,66,.2)",borderRadius:6,padding:"3px 10px",fontSize:12,color:"var(--gold2)"}}>
          {s.song_title}
        </span>
      ))}
    </div>
  );
}

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────
function Dashboard({ nowPlaying, setNowPlaying, scrollSpeed, setScrollSpeed, scrollPaused, setScrollPaused, transpose, setTranspose }) {
  const [activeEvent, setActiveEvent] = useState(null);
  const [queue, setQueue] = useState([]);
  const [requests, setRequests] = useState([]);
  const [tab, setTab] = useState("queue");
  const [dragIdx, setDragIdx] = useState(null);
  const [loading, setLoading] = useState(false);
  const pollRef = useRef(null);

  // Load active event on mount
  useEffect(() => {
    api.events.active().then(list => {
      if (list && list.length > 0) setActiveEvent(list[0]);
    }).catch(console.error);
  }, []);

  const loadQueueData = async (eventId) => {
    if (!eventId) return;
    setLoading(true);
    try {
      const [q, r] = await Promise.all([api.queue.list(eventId), api.requests.list(eventId)]);
      setQueue(q || []);
      setRequests(r || []);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (!activeEvent) return;
    loadQueueData(activeEvent.id);
    pollRef.current = setInterval(() => loadQueueData(activeEvent.id), 3000);
    return () => clearInterval(pollRef.current);
  }, [activeEvent]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePlay = async (item) => {
    try {
      await api.queue.update(item.id, { status: "playing" });
      setNowPlaying(item);
      if (activeEvent) await loadQueueData(activeEvent.id);
    } catch(e) { console.error(e); }
  };

  const handleComplete = async () => {
    if (!nowPlaying) return;
    try {
      await api.queue.update(nowPlaying.id, { status: "done" });
      setNowPlaying(null);
      if (activeEvent) await loadQueueData(activeEvent.id);
    } catch(e) { console.error(e); }
  };

  const handleRemove = async (id) => {
    try {
      await api.queue.delete(id);
      if (activeEvent) await loadQueueData(activeEvent.id);
    } catch(e) { console.error(e); }
  };

  const handleDrop = async (toIdx) => {
    if (dragIdx === null || dragIdx === toIdx) { setDragIdx(null); return; }
    const reordered = [...queue];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(toIdx, 0, moved);
    setQueue(reordered);
    setDragIdx(null);
    try { await api.queue.reorder(reordered); } catch(e) { console.error(e); }
  };

  const tabs = [
    ["queue", `QUEUE (${queue.length})`],
    ["requests", `REQUESTS (${requests.length})`],
    ["history", "HISTORY"],
  ];

  return (
    <div style={{height:"calc(100vh - 52px)",display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <EventPanel activeEvent={activeEvent} onEventChange={setActiveEvent} />

      <div style={{flex:1,display:"flex",overflow:"hidden"}}>
        {/* Sidebar */}
        <div style={{width:248,background:"rgba(0,0,0,.4)",borderRight:"1px solid rgba(245,200,66,.12)",padding:"16px",display:"flex",flexDirection:"column",gap:18,overflowY:"auto",flexShrink:0}}>
          {/* Now playing */}
          <div>
            <div style={{fontFamily:"var(--fd)",fontSize:11,color:"var(--gold2)",letterSpacing:3,marginBottom:8}}>NOW PLAYING</div>
            {nowPlaying ? (
              <div style={{background:"rgba(245,200,66,.08)",border:"2px solid var(--gold)",borderRadius:10,padding:12}}>
                <div style={{fontWeight:700,fontSize:14,lineHeight:1.3}}>{nowPlaying.song_title}</div>
                <div style={{color:"rgba(255,255,255,.5)",fontSize:12,marginTop:4}}>{nowPlaying.singer_name}</div>
                <div style={{fontFamily:"var(--fm)",color:"var(--gold2)",fontSize:11,marginTop:3}}>Key: {nowPlaying.song_key}</div>
                <button onClick={handleComplete} style={{marginTop:10,width:"100%",background:"var(--red)",border:"none",borderRadius:6,color:"white",padding:"8px",fontFamily:"var(--fd)",fontSize:13,letterSpacing:1}}>✓ MARK COMPLETE</button>
              </div>
            ) : <div style={{color:"rgba(255,255,255,.25)",fontSize:13}}>Nothing playing</div>}
          </div>

          {/* Teleprompter */}
          <div>
            <div style={{fontFamily:"var(--fd)",fontSize:11,color:"var(--gold2)",letterSpacing:3,marginBottom:8}}>TELEPROMPTER</div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <div>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                  <span style={{fontSize:11,color:"rgba(255,255,255,.4)"}}>Speed</span>
                  <span style={{fontFamily:"var(--fm)",fontSize:11,color:"var(--gold)"}}>{scrollSpeed}</span>
                </div>
                <input type="range" min={5} max={100} value={scrollSpeed} onChange={e=>setScrollSpeed(+e.target.value)} style={{width:"100%"}} />
              </div>
              <button onClick={() => setScrollPaused(!scrollPaused)} style={{
                padding:"9px",background:scrollPaused?"var(--gold)":"rgba(255,255,255,.08)",
                border:"none",borderRadius:7,color:scrollPaused?"var(--stage-deeper)":"white",
                fontFamily:"var(--fd)",fontSize:14,letterSpacing:1
              }}>{scrollPaused?"▶  RESUME":"⏸  PAUSE"}</button>
              <div>
                <div style={{fontSize:11,color:"rgba(255,255,255,.4)",marginBottom:5}}>
                  Transpose: <span style={{fontFamily:"var(--fm)",color:"var(--gold)"}}>{transpose>0?"+"+transpose:transpose}</span>
                </div>
                <div style={{display:"flex",gap:5}}>
                  <button onClick={()=>setTranspose(transpose-1)} style={{flex:1,padding:"7px",background:"rgba(255,255,255,.08)",border:"none",borderRadius:6,color:"white",fontSize:15}}>♭−</button>
                  <button onClick={()=>setTranspose(0)} style={{flex:1,padding:"7px",background:"rgba(255,255,255,.04)",border:"none",borderRadius:6,color:"rgba(255,255,255,.35)",fontSize:11}}>reset</button>
                  <button onClick={()=>setTranspose(transpose+1)} style={{flex:1,padding:"7px",background:"rgba(255,255,255,.08)",border:"none",borderRadius:6,color:"white",fontSize:15}}>♯+</button>
                </div>
              </div>
            </div>
          </div>

          <div style={{fontSize:11,color:"rgba(255,255,255,.2)",marginTop:"auto"}}>
            <span className={loading?"spin":""}>⟳</span> Refreshes every 3s
          </div>
        </div>

        {/* Main content */}
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
          <div style={{display:"flex",borderBottom:"1px solid rgba(245,200,66,.12)",flexShrink:0}}>
            {tabs.map(([t,l]) => (
              <button key={t} className={`tab-btn${tab===t?" active":""}`} onClick={()=>setTab(t)}>{l}</button>
            ))}
          </div>

          <div style={{flex:1,overflowY:"auto"}}>
            {/* QUEUE TAB */}
            {tab==="queue" && (
              <div style={{padding:16,display:"flex",flexDirection:"column",gap:6}}>
                {!activeEvent && (
                  <div style={{textAlign:"center",padding:"40px",color:"rgba(255,255,255,.3)"}}>
                    <div style={{fontSize:32,marginBottom:8}}>🎪</div>
                    <div style={{fontFamily:"var(--fd)",fontSize:16,letterSpacing:2}}>CREATE AN EVENT TO START</div>
                  </div>
                )}
                {activeEvent && !loading && queue.length===0 && (
                  <div style={{textAlign:"center",padding:"50px 0",color:"rgba(255,255,255,.2)"}}>
                    <div style={{fontSize:36,marginBottom:10}}>🎵</div>
                    <div style={{fontFamily:"var(--fd)",fontSize:16,letterSpacing:2}}>QUEUE IS EMPTY</div>
                    <div style={{fontSize:12,marginTop:6}}>Singers request via the Singer app</div>
                  </div>
                )}
                {queue.map((item,i) => (
                  <div key={item.id} className="queue-row" draggable
                    onDragStart={()=>setDragIdx(i)} onDragOver={e=>e.preventDefault()} onDrop={()=>handleDrop(i)}
                    style={{display:"flex",alignItems:"center",gap:12,padding:"13px 14px",
                      background:"rgba(255,255,255,.04)",border:`1px solid ${i===0?"rgba(245,200,66,.4)":"rgba(255,255,255,.07)"}`,borderRadius:10}}>
                    <span style={{fontFamily:"var(--fd)",fontSize:22,color:i===0?"var(--gold)":"rgba(255,255,255,.15)",width:24,textAlign:"center",flexShrink:0}}>{i+1}</span>
                    <span style={{color:"rgba(255,255,255,.2)",fontSize:18,cursor:"grab",flexShrink:0}}>⠿</span>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:600,fontSize:14,color:"white"}}>{item.song_title}</div>
                      <div style={{color:"rgba(255,255,255,.4)",fontSize:12,marginTop:1}}>
                        {item.singer_name} · {item.song_artist} · <span style={{fontFamily:"var(--fm)"}}>{item.song_key}</span>
                      </div>
                    </div>
                    <button className="btn-play" onClick={()=>handlePlay(item)} style={{
                      padding:"8px 14px",background:i===0?"var(--gold)":"rgba(245,200,66,.15)",border:"none",borderRadius:6,
                      color:i===0?"var(--stage-deeper)":"var(--gold)",fontFamily:"var(--fd)",fontSize:13,letterSpacing:1,flexShrink:0
                    }}>▶ PLAY</button>
                    <button onClick={()=>handleRemove(item.id)} style={{padding:"8px 10px",background:"rgba(192,57,43,.15)",border:"none",borderRadius:6,color:"var(--red)",fontSize:13,flexShrink:0}}>✕</button>
                  </div>
                ))}
              </div>
            )}

            {/* REQUESTS TAB */}
            {tab==="requests" && (
              <div style={{padding:16,display:"flex",flexDirection:"column",gap:8}}>
                {!activeEvent && <div style={{textAlign:"center",padding:"40px",color:"rgba(255,255,255,.3)",fontFamily:"var(--fd)",fontSize:14,letterSpacing:2}}>NO ACTIVE EVENT</div>}
                {activeEvent && requests.length===0 && <div style={{textAlign:"center",padding:"50px",color:"rgba(255,255,255,.2)",fontFamily:"var(--fd)",fontSize:16,letterSpacing:2}}>NO REQUESTS YET</div>}
                {requests.map(req => (
                  <div key={req.id} style={{padding:"14px 16px",background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.08)",borderRadius:10}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                      <span style={{fontWeight:600,fontSize:14}}>{req.singer_name}</span>
                      <span style={{color:"rgba(255,255,255,.3)",fontSize:11}}>{new Date(req.created_at).toLocaleTimeString()}</span>
                    </div>
                    <RequestSongs requestId={req.id} />
                  </div>
                ))}
              </div>
            )}

            {/* HISTORY TAB */}
            {tab==="history" && <HistoryPanel />}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── STAGE DISPLAY ────────────────────────────────────────────────────────────
function StageDisplay({ nowPlaying, scrollSpeed, scrollPaused, transpose, activeEvent }) {
  const scrollRef = useRef(null);
  const animRef = useRef(null);
  const posRef = useRef(0);
  const [nextUp, setNextUp] = useState(null);

  useEffect(() => {
    posRef.current = 0;
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [nowPlaying?.id]);

  useEffect(() => {
    const tick = () => {
      if (!scrollPaused && scrollRef.current && nowPlaying) {
        posRef.current += scrollSpeed / 800;
        scrollRef.current.scrollTop = posRef.current;
      }
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [scrollSpeed, scrollPaused, nowPlaying]);

  useEffect(() => {
    if (!activeEvent) return;
    const load = async () => {
      const q = await api.queue.list(activeEvent.id).catch(() => []);
      const next = nowPlaying ? q.find(i => i.id !== nowPlaying.id) : q[0];
      setNextUp(next || null);
    };
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [nowPlaying, activeEvent]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!nowPlaying) {
    return (
      <div style={{minHeight:"calc(100vh - 52px)",background:"var(--stage-deeper)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:40,backgroundImage:"radial-gradient(ellipse at 50% 40%, rgba(100,60,200,.25) 0%, transparent 70%)"}}>
        <div style={{textAlign:"center"}}>
          <div style={{fontFamily:"var(--fd)",fontSize:"min(10vw,90px)",color:"var(--gold)",letterSpacing:6,lineHeight:1}}>PURPLE SANDWICH</div>
          <div style={{fontFamily:"var(--fd)",fontSize:"min(5vw,42px)",color:"rgba(245,200,66,.5)",letterSpacing:8,marginTop:4}}>LIVE BAND KARAOKE</div>
          {activeEvent && <div style={{color:"rgba(255,255,255,.25)",fontSize:15,letterSpacing:3,marginTop:10,fontFamily:"var(--fd)"}}>{activeEvent.venue} · {new Date(activeEvent.date).toLocaleDateString("en-US",{month:"long",day:"numeric"})}</div>}
        </div>
        {nextUp && (
          <div style={{background:"rgba(245,200,66,.08)",border:"2px solid rgba(245,200,66,.35)",borderRadius:20,padding:"24px 48px",textAlign:"center"}}>
            <div style={{fontFamily:"var(--fd)",fontSize:13,color:"var(--gold2)",letterSpacing:5,marginBottom:8}}>UP NEXT</div>
            <div style={{fontFamily:"var(--fd)",fontSize:44,color:"white",letterSpacing:3}}>{nextUp.singer_name}</div>
            <div style={{color:"rgba(255,255,255,.5)",fontSize:18,marginTop:4}}>{nextUp.song_title} — {nextUp.song_artist}</div>
          </div>
        )}
        <div style={{color:"rgba(255,255,255,.15)",fontSize:14,letterSpacing:2,fontFamily:"var(--fd)"}}>WAITING FOR BAND…</div>
      </div>
    );
  }

  const content = SONG_CONTENT[nowPlaying.song_id] || "Chord sheet not found for this song.";

  return (
    <div style={{height:"calc(100vh - 52px)",background:"var(--stage-deeper)",display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <div style={{background:"linear-gradient(135deg,var(--stage-dark) 0%,var(--stage-deeper) 100%)",borderBottom:"3px solid var(--gold)",padding:"16px 48px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <div>
          <div style={{fontFamily:"var(--fd)",fontSize:46,color:"white",letterSpacing:2,lineHeight:1}}>{nowPlaying.song_title}</div>
          <div style={{color:"var(--gold)",fontSize:17,marginTop:2}}>{nowPlaying.song_artist}</div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontFamily:"var(--fd)",fontSize:34,color:"var(--gold)",letterSpacing:2}}>{nowPlaying.singer_name}</div>
          <div style={{color:"rgba(255,255,255,.35)",fontSize:13,marginTop:2,fontFamily:"var(--fm)"}}>
            KEY: {transposeNote(nowPlaying.song_key, transpose)}
            {scrollPaused && <span style={{marginLeft:10,color:"var(--gold)",background:"rgba(245,200,66,.15)",padding:"2px 8px",borderRadius:4,fontSize:11,letterSpacing:2}}>⏸ PAUSED</span>}
          </div>
        </div>
      </div>

      <div ref={scrollRef} style={{flex:1,overflowY:"hidden",padding:"48px 80px 280px"}}>
        {content.split('\n').map((rawLine, i) => {
          const line = transposeLine(rawLine, transpose);
          const isSection = /^\[.+\]$/.test(line.trim());
          const isChord = !isSection && line.trim().length > 0 && line.trim().length < 60 && /^[A-G][b#]?/.test(line.trim()) && !/[a-z]{4,}/.test(line);
          const isEmpty = line.trim() === '';
          return (
            <div key={i} style={{
              fontFamily:isSection?"var(--fd)":isChord?"var(--fm)":"var(--fb)",
              fontSize:isSection?22:isChord?28:34,
              color:isSection?"var(--gold)":isChord?"#7dd3f5":"white",
              letterSpacing:isSection?4:isChord?2:0.5,
              fontWeight:isChord?700:isSection?400:300,
              lineHeight:isSection?1:1.9,
              marginTop:isSection?28:isEmpty?12:0,
              marginBottom:isSection?8:0,
              minHeight:isEmpty?20:undefined,
            }}>{line||'\u00A0'}</div>
          );
        })}
      </div>

      {nextUp && (
        <div style={{background:"rgba(14,8,37,.95)",borderTop:"1px solid rgba(245,200,66,.2)",padding:"12px 48px",display:"flex",alignItems:"center",gap:14,flexShrink:0}}>
          <span style={{fontFamily:"var(--fd)",fontSize:11,color:"var(--gold2)",letterSpacing:4}}>UP NEXT</span>
          <span style={{color:"rgba(255,255,255,.7)",fontSize:14,fontWeight:600}}>{nextUp.singer_name}</span>
          <span style={{color:"rgba(255,255,255,.2)"}}>—</span>
          <span style={{color:"rgba(255,255,255,.5)",fontSize:14}}>{nextUp.song_title}</span>
        </div>
      )}
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState("dashboard");
  const [nowPlaying, setNowPlaying] = useState(null);
  const [scrollSpeed, setScrollSpeed] = useState(35);
  const [scrollPaused, setScrollPaused] = useState(false);
  const [transpose, setTranspose] = useState(0);
  const [activeEvent, setActiveEvent] = useState(null);

  return (
    <>
      <style>{css}</style>
      <Nav view={view} setView={setView} />
      {view==="dashboard" && (
        <Dashboard
          nowPlaying={nowPlaying} setNowPlaying={setNowPlaying}
          scrollSpeed={scrollSpeed} setScrollSpeed={setScrollSpeed}
          scrollPaused={scrollPaused} setScrollPaused={setScrollPaused}
          transpose={transpose} setTranspose={setTranspose} setActiveEvent={setActiveEvent}
        />
      )}
      {view==="display" && (
        <StageDisplay
          nowPlaying={nowPlaying} scrollSpeed={scrollSpeed}
          scrollPaused={scrollPaused} transpose={transpose}
          activeEvent={activeEvent}
        />
      )}
    </>
  );
}
