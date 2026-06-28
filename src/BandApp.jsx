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

// ─── API ──────────────────────────────────────────────────────────────────────
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
    playing: (eventId) => sbFetch(`/queue?event_id=eq.${eventId}&status=eq.playing&limit=1`),
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

// ─── STYLES ───────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=IBM+Plex+Mono:wght@400;700&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,500;0,9..40,700&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  :root{
    --deep:#0e0825; --stage-dark:#1a0f40; --purple:#2d1b69;
    --gold:#f5c842; --gold2:#c9a020; --red:#c0392b; --green:#27ae60;
    --fd:'Bebas Neue',sans-serif; --fb:'DM Sans',sans-serif; --fm:'IBM Plex Mono',monospace;
  }
  body{font-family:var(--fb);background:var(--deep);color:white;min-height:100vh;}
  button{cursor:pointer;font-family:var(--fb);}
  input,select,textarea{font-family:var(--fb);}
  input[type=range]{accent-color:var(--gold);}
  ::-webkit-scrollbar{width:4px;}
  ::-webkit-scrollbar-thumb{background:rgba(245,200,66,.2);border-radius:2px;}
  .tab-btn{padding:14px 24px;background:transparent;border:none;border-bottom:3px solid transparent;
    color:rgba(255,255,255,.3);font-family:var(--fd);font-size:15px;letter-spacing:2px;cursor:pointer;transition:all .15s;}
  .tab-btn.active{border-bottom-color:var(--gold);color:var(--gold);}
  .tab-btn:hover:not(.active){color:rgba(255,255,255,.6);}
  .queue-row{transition:background .15s;cursor:grab;}
  .queue-row:hover{background:rgba(255,255,255,.07)!important;}
  .input-field{width:100%;padding:11px 14px;background:rgba(255,255,255,.06);
    border:1.5px solid rgba(255,255,255,.12);border-radius:8px;color:white;font-size:14px;outline:none;transition:border-color .2s;}
  .input-field:focus{border-color:rgba(245,200,66,.5);}
  .btn-gold{background:var(--gold);border:none;border-radius:8px;color:var(--deep);
    font-family:var(--fd);letter-spacing:1.5px;cursor:pointer;transition:filter .15s;}
  .btn-gold:hover{filter:brightness(1.1);}
  .btn-ghost{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:8px;
    color:rgba(255,255,255,.5);cursor:pointer;transition:all .15s;}
  .btn-ghost:hover{background:rgba(255,255,255,.1);color:white;}
  @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
  .fade-in{animation:fadeIn .2s ease forwards;}
  @keyframes spin{to{transform:rotate(360deg)}}
  .spin{animation:spin 1s linear infinite;display:inline-block;}
`;

// ─── NAV ─────────────────────────────────────────────────────────────────────
function Nav({ tab, setTab }) {
  return (
    <nav style={{background:"rgba(0,0,0,.5)",borderBottom:"2px solid var(--gold)",display:"flex",alignItems:"stretch",flexShrink:0,backdropFilter:"blur(12px)"}}>
      <div style={{padding:"0 20px",display:"flex",alignItems:"center",gap:10,marginRight:"auto"}}>
        <span style={{fontSize:18}}>🥪</span>
        <div>
          <div style={{fontFamily:"var(--fd)",fontSize:18,color:"var(--gold)",letterSpacing:3,lineHeight:1}}>PURPLE SANDWICH</div>
          <div style={{fontFamily:"var(--fd)",fontSize:10,color:"rgba(245,200,66,.35)",letterSpacing:4}}>BAND CONTROL</div>
        </div>
      </div>
      {[["events","🎪 Events"],["queue","🎵 Queue"],["songs","🎶 Songs"],["prompter","🎛 Prompter"]].map(([t,label]) => (
        <button key={t} className={`tab-btn${tab===t?" active":""}`} onClick={()=>setTab(t)}>{label}</button>
      ))}
      <a href="/LiveBandKaraoke/stage" target="_blank" rel="noopener noreferrer" style={{
        display:"flex",alignItems:"center",padding:"0 16px",
        background:"rgba(245,200,66,.08)",borderLeft:"1px solid rgba(245,200,66,.2)",
        color:"var(--gold)",fontFamily:"var(--fd)",fontSize:13,letterSpacing:1,textDecoration:"none",
        gap:6,transition:"background .15s"
      }}>📺 Open Stage ↗</a>
    </nav>
  );
}

// ─── EVENTS TAB ───────────────────────────────────────────────────────────────
function EventsTab() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [songsByEvent, setSongsByEvent] = useState({});
  const [copied, setCopied] = useState(null);
  const [form, setForm] = useState({
    name: "",
    venue: "Watkins Drinkery",
    date: new Date().toISOString().split("T")[0],
  });

  const loadEvents = async () => {
    try {
      const list = await api.events.list();
      setEvents(list || []);
      // Load played songs for all events
      const allSongs = {};
      await Promise.all((list || []).map(async e => {
        const played = await api.queue.played(e.id).catch(() => []);
        allSongs[e.id] = played || [];
      }));
      setSongsByEvent(allSongs);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadEvents(); }, []);

  const createEvent = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      const active = events.filter(e => e.status === "active");
      await Promise.all(active.map(e => api.events.update(e.id, { status: "closed" })));
      const result = await api.events.create({ ...form, status: "active" });
      if (!result || result.length === 0) throw new Error("No data returned — check Supabase RLS policies");
      setShowForm(false);
      setForm({ name: "", venue: "Watkins Drinkery", date: new Date().toISOString().split("T")[0] });
      await loadEvents();
    } catch(e) {
      console.error("Create event error:", e);
      setSaveError(e.message || "Failed to create event");
    }
    finally { setSaving(false); }
  };

  const closeEvent = async (id) => {
    await api.events.update(id, { status: "closed" }).catch(console.error);
    await loadEvents();
  };

  const reopenEvent = async (id) => {
    // Close current active first
    const active = events.filter(e => e.status === "active");
    await Promise.all(active.map(e => api.events.update(e.id, { status: "closed" })));
    await api.events.update(id, { status: "active" });
    await loadEvents();
  };

  const exportSetlist = (event) => {
    const songs = songsByEvent[event.id] || [];
    const text = [
      event.name,
      `${event.venue} — ${new Date(event.date).toLocaleDateString("en-US",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}`,
      "",
      ...songs.map((s,i) => `${i+1}. ${s.song_title} (${s.song_artist}) — ${s.singer_name}`),
      "",
      `Total: ${songs.length} songs`,
    ].join("\n");
    navigator.clipboard.writeText(text);
    setCopied(event.id);
    setTimeout(() => setCopied(null), 2000);
  };

  const activeEvent = events.find(e => e.status === "active");

  return (
    <div style={{maxWidth:720,margin:"0 auto",padding:"28px 24px"}}>

      {/* Active event banner */}
      {activeEvent ? (
        <div style={{background:"rgba(39,174,96,.08)",border:"2px solid rgba(39,174,96,.3)",borderRadius:14,padding:"18px 20px",marginBottom:28,display:"flex",alignItems:"center",justifyContent:"space-between",gap:16}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:10,height:10,borderRadius:"50%",background:"var(--green)",boxShadow:"0 0 8px var(--green)",flexShrink:0}} />
            <div>
              <div style={{fontFamily:"var(--fd)",fontSize:20,color:"var(--green)",letterSpacing:2,lineHeight:1}}>LIVE NOW</div>
              <div style={{fontWeight:600,fontSize:16,color:"white",marginTop:3}}>{activeEvent.name}</div>
              <div style={{color:"rgba(255,255,255,.4)",fontSize:13,marginTop:1}}>{activeEvent.venue} · {new Date(activeEvent.date).toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})}</div>
            </div>
          </div>
          <div style={{display:"flex",gap:8,flexShrink:0}}>
            <button onClick={() => setShowForm(true)} className="btn-ghost" style={{padding:"8px 14px",fontSize:13}}>+ New Event</button>
            <button onClick={() => closeEvent(activeEvent.id)} style={{padding:"8px 14px",background:"rgba(192,57,43,.15)",border:"1px solid rgba(192,57,43,.3)",borderRadius:8,color:"var(--red)",fontSize:13,cursor:"pointer"}}>Close Night</button>
          </div>
        </div>
      ) : (
        <div style={{background:"rgba(245,200,66,.06)",border:"2px dashed rgba(245,200,66,.25)",borderRadius:14,padding:"24px",marginBottom:28,textAlign:"center"}}>
          <div style={{fontFamily:"var(--fd)",fontSize:18,color:"rgba(255,255,255,.4)",letterSpacing:2,marginBottom:12}}>NO ACTIVE EVENT</div>
          <button onClick={() => setShowForm(true)} className="btn-gold" style={{padding:"12px 28px",fontSize:16}}>+ CREATE EVENT</button>
        </div>
      )}

      {/* Create event form */}
      {showForm && (
        <div className="fade-in" style={{background:"rgba(255,255,255,.04)",border:"1px solid rgba(245,200,66,.25)",borderRadius:14,padding:"20px",marginBottom:28}}>
          <div style={{fontFamily:"var(--fd)",fontSize:14,color:"var(--gold2)",letterSpacing:3,marginBottom:16}}>NEW EVENT</div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <input className="input-field" placeholder="Event name (e.g. Thursday Night Karaoke)" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} />
            <input className="input-field" placeholder="Venue" value={form.venue} onChange={e=>setForm({...form,venue:e.target.value})} />
            <input className="input-field" type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} />
            <div style={{display:"flex",gap:8,marginTop:4}}>
              <button onClick={createEvent} disabled={saving||!form.name.trim()} className="btn-gold" style={{flex:1,padding:"12px",fontSize:15}}>
                {saving ? "CREATING…" : "CREATE & GO LIVE"}
              </button>
              <button onClick={() => { setShowForm(false); setSaveError(null); }} className="btn-ghost" style={{padding:"12px 16px",fontSize:13}}>Cancel</button>
            </div>
            {saveError && (
              <div style={{marginTop:8,padding:"10px 12px",background:"rgba(192,57,43,.15)",border:"1px solid rgba(192,57,43,.4)",borderRadius:8,color:"#e74c3c",fontSize:12}}>
                ⚠️ {saveError}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Events history list */}
      <div style={{fontFamily:"var(--fd)",fontSize:12,color:"rgba(255,255,255,.25)",letterSpacing:3,marginBottom:14}}>ALL EVENTS</div>
      {loading && <div style={{color:"rgba(255,255,255,.3)",padding:"20px 0"}}>Loading…</div>}
      {!loading && events.length === 0 && <div style={{color:"rgba(255,255,255,.25)",padding:"20px 0",textAlign:"center"}}>No events yet — create your first one above</div>}
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {events.map(event => {
          const songs = songsByEvent[event.id] || [];
          const isOpen = expanded[event.id];
          const isActive = event.status === "active";
          return (
            <div key={event.id} style={{background:"rgba(255,255,255,.03)",border:`1px solid ${isActive?"rgba(39,174,96,.3)":"rgba(255,255,255,.08)"}`,borderRadius:12,overflow:"hidden"}}>
              <div onClick={() => setExpanded({...expanded,[event.id]:!isOpen})}
                style={{padding:"14px 16px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  {isActive && <div style={{width:7,height:7,borderRadius:"50%",background:"var(--green)",boxShadow:"0 0 5px var(--green)",flexShrink:0}} />}
                  <div>
                    <div style={{fontFamily:"var(--fd)",fontSize:17,color:isActive?"var(--green)":"white",letterSpacing:1.5,lineHeight:1}}>{event.name}</div>
                    <div style={{color:"rgba(255,255,255,.35)",fontSize:12,marginTop:3}}>{event.venue} · {new Date(event.date).toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric",year:"numeric"})}</div>
                  </div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:14,flexShrink:0}}>
                  {!isActive && (
                    <button onClick={e=>{e.stopPropagation();reopenEvent(event.id);}} style={{padding:"5px 10px",background:"rgba(245,200,66,.1)",border:"1px solid rgba(245,200,66,.25)",borderRadius:6,color:"var(--gold2)",fontSize:12,cursor:"pointer"}}>Reopen</button>
                  )}
                  <div style={{textAlign:"right"}}>
                    <div style={{fontFamily:"var(--fd)",fontSize:22,color:"var(--gold)",lineHeight:1}}>{songs.length}</div>
                    <div style={{color:"rgba(255,255,255,.25)",fontSize:10}}>songs</div>
                  </div>
                  <span style={{color:"rgba(255,255,255,.25)",fontSize:14}}>{isOpen?"▲":"▼"}</span>
                </div>
              </div>

              {isOpen && (
                <div className="fade-in" style={{borderTop:"1px solid rgba(255,255,255,.06)"}}>
                  {songs.length === 0 ? (
                    <div style={{padding:"16px",textAlign:"center",color:"rgba(255,255,255,.2)",fontSize:13}}>No songs played yet</div>
                  ) : (
                    songs.map((s,i) => (
                      <div key={s.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 16px",borderBottom:"1px solid rgba(255,255,255,.04)",background:i%2===0?"transparent":"rgba(255,255,255,.015)"}}>
                        <span style={{fontFamily:"var(--fd)",fontSize:16,color:"rgba(245,200,66,.4)",width:24,flexShrink:0}}>{i+1}</span>
                        <div style={{flex:1}}>
                          <div style={{fontWeight:600,fontSize:14}}>{s.song_title}</div>
                          <div style={{color:"rgba(255,255,255,.35)",fontSize:12}}>{s.song_artist}</div>
                        </div>
                        <div style={{color:"rgba(255,255,255,.6)",fontSize:13,fontWeight:600}}>{s.singer_name}</div>
                      </div>
                    ))
                  )}
                  {songs.length > 0 && (
                    <div style={{padding:"12px 16px",display:"flex",justifyContent:"flex-end"}}>
                      <button onClick={() => exportSetlist(event)} style={{
                        padding:"7px 14px",fontSize:12,borderRadius:6,cursor:"pointer",
                        background:copied===event.id?"rgba(39,174,96,.15)":"rgba(255,255,255,.05)",
                        border:`1px solid ${copied===event.id?"rgba(39,174,96,.4)":"rgba(255,255,255,.12)"}`,
                        color:copied===event.id?"var(--green)":"rgba(255,255,255,.4)"
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
    </div>
  );
}

// ─── BULLPEN CARD ─────────────────────────────────────────────────────────────
function BullpenCard({ req, position, eventId, onAddedToQueue }) {
  const [songs, setSongs] = useState([]);
  const [selectedSong, setSelectedSong] = useState(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    api.requestSongs.list(req.id).then(s => {
      setSongs(s || []);
      if (s && s.length > 0) setSelectedSong(s[0]);
    }).catch(console.error);
  }, [req.id]);

  const addToQueue = async () => {
    if (!selectedSong || adding) return;
    setAdding(true);
    try {
      // Step 1: Get current max queue position
      const existing = await api.queue.list(eventId).catch(() => []);
      const nextPos = existing && existing.length > 0
        ? Math.max(...existing.map(i => i.position)) + 1 : 0;

      // Step 2: Insert queue row FIRST (before any deletes)
      const payload = {
        event_id: eventId,
        singer_name: req.singer_name,
        session_id: req.session_id,
        song_id: selectedSong.song_id,
        song_title: selectedSong.song_title,
        song_artist: selectedSong.song_artist,
        song_key: selectedSong.song_key,
        song_genre: selectedSong.song_genre || "",
        position: nextPos,
        status: "queued",
      };

      console.log("Inserting queue payload:", payload);
      const inserted = await sbFetch("/queue", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      console.log("Queue insert result:", inserted);

      // Step 3: Only delete from bullpen AFTER successful insert
      if (inserted) {
        await fetch(`${SUPABASE_URL}/rest/v1/request_songs?request_id=eq.${req.id}`, {
          method: "DELETE",
          headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` },
        });
        console.log("Deleted request_songs");

        await fetch(`${SUPABASE_URL}/rest/v1/requests?id=eq.${req.id}`, {
          method: "DELETE",
          headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` },
        });
        console.log("Deleted request");
      }

      onAddedToQueue();
    } catch(e) {
      console.error("Add to queue error:", e);
      alert("Error: " + e.message);
      setAdding(false);
    }
  };

  const dismiss = async () => {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/request_songs?request_id=eq.${req.id}`, {
        method: "DELETE",
        headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` },
      });
      await fetch(`${SUPABASE_URL}/rest/v1/requests?id=eq.${req.id}`, {
        method: "DELETE",
        headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` },
      });
      onAddedToQueue();
    } catch(e) { console.error(e); }
  };

  return (
    <div style={{background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.1)",borderRadius:12,overflow:"hidden",marginBottom:8}}>
      <div style={{padding:"12px 14px",background:"rgba(45,27,105,.3)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontFamily:"var(--fd)",fontSize:22,color:"rgba(245,200,66,.4)",width:24}}>{position}</span>
          <div>
            <div style={{fontWeight:700,fontSize:15,color:"white"}}>{req.singer_name}</div>
            <div style={{color:"rgba(255,255,255,.3)",fontSize:11,marginTop:1}}>{new Date(req.created_at).toLocaleTimeString()}</div>
          </div>
        </div>
        <button onClick={dismiss} title="Dismiss from bullpen" style={{background:"none",border:"none",color:"rgba(255,255,255,.2)",fontSize:16,cursor:"pointer",padding:"4px 8px"}}>✕</button>
      </div>
      <div style={{padding:"10px 14px"}}>
        <div style={{fontFamily:"var(--fd)",fontSize:10,color:"var(--gold2)",letterSpacing:3,marginBottom:8}}>SELECT SONG</div>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {songs.map(s => (
            <div key={s.id} onClick={() => setSelectedSong(s)}
              style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",
                background:selectedSong?.id===s.id?"rgba(245,200,66,.1)":"rgba(255,255,255,.03)",
                border:`1.5px solid ${selectedSong?.id===s.id?"var(--gold)":"rgba(255,255,255,.08)"}`,
                borderRadius:8,cursor:"pointer",transition:"all .15s"}}>
              <div style={{width:16,height:16,borderRadius:"50%",
                border:`2px solid ${selectedSong?.id===s.id?"var(--gold)":"rgba(255,255,255,.2)"}`,
                background:selectedSong?.id===s.id?"var(--gold)":"transparent",
                flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                {selectedSong?.id===s.id && <div style={{width:6,height:6,borderRadius:"50%",background:"var(--deep)"}} />}
              </div>
              <div style={{flex:1}}>
                <div style={{fontWeight:600,fontSize:13,color:"white"}}>{s.song_title}</div>
                <div style={{color:"rgba(255,255,255,.35)",fontSize:11}}>{s.song_artist}</div>
              </div>
              <div style={{fontFamily:"var(--fm)",fontSize:11,color:"rgba(255,255,255,.3)"}}>{s.song_key}</div>
            </div>
          ))}
        </div>
        <button onClick={addToQueue} disabled={!selectedSong||adding}
          style={{width:"100%",marginTop:10,padding:"10px",
            background:selectedSong?"var(--gold)":"rgba(255,255,255,.06)",
            border:"none",borderRadius:8,
            color:selectedSong?"var(--deep)":"rgba(255,255,255,.2)",
            fontFamily:"var(--fd)",fontSize:14,letterSpacing:1.5,
            cursor:selectedSong?"pointer":"not-allowed"}}>
          {adding ? "ADDING…" : "➕ ADD TO QUEUE"}
        </button>
      </div>
    </div>
  );
}

// ─── QUEUE TAB ────────────────────────────────────────────────────────────────
function QueueTab() {
  const [activeEvent, setActiveEvent] = useState(null);
  const [queue, setQueue] = useState([]);
  const [bullpen, setBullpen] = useState([]);
  const [nowPlaying, setNowPlaying] = useState(null);
  const [autoScroll, setAutoScroll] = useState(false);
  const [subTab, setSubTab] = useState("bullpen");
  const [dragIdx, setDragIdx] = useState(null);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef(null);

  const loadData = async () => {
    try {
      const evts = await api.events.active();
      const event = evts && evts.length > 0 ? evts[0] : null;
      setActiveEvent(event);
      if (!event) { setQueue([]); setBullpen([]); setNowPlaying(null); setLoading(false); return; }
      const [q, r, playing, stageState] = await Promise.all([
        api.queue.list(event.id),
        api.requests.list(event.id),
        api.queue.playing(event.id),
        sbFetch("/stage_state?id=eq.1&select=auto_scroll"),
      ]);
      setQueue(q || []);
      setBullpen(r || []);
      setNowPlaying(playing && playing.length > 0 ? playing[0] : null);
      if (stageState && stageState.length > 0) setAutoScroll(stageState[0].auto_scroll);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    loadData();
    pollRef.current = setInterval(loadData, 3000);
    return () => clearInterval(pollRef.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePlay = async (item) => {
    try {
      if (nowPlaying) await api.queue.update(nowPlaying.id, { status: "done" });
      await api.queue.update(item.id, { status: "playing" });
      // Load song on stage but don't start scrolling yet
      await sbFetch("/stage_state?id=eq.1", {
        method: "PATCH",
        body: JSON.stringify({ auto_scroll: false, updated_at: new Date().toISOString() }),
      });
      await loadData();
    } catch(e) { console.error(e); }
  };

  const handleStartSong = async () => {
    try {
      await sbFetch("/stage_state?id=eq.1", {
        method: "PATCH",
        body: JSON.stringify({ auto_scroll: true, updated_at: new Date().toISOString() }),
      });
      await loadData();
    } catch(e) { console.error(e); }
  };

  const handlePause = async () => {
    try {
      await sbFetch("/stage_state?id=eq.1", {
        method: "PATCH",
        body: JSON.stringify({ auto_scroll: false, updated_at: new Date().toISOString() }),
      });
      await loadData();
    } catch(e) { console.error(e); }
  };

  const handleComplete = async () => {
    if (!nowPlaying) return;
    try {
      await api.queue.update(nowPlaying.id, { status: "done" });
      await sbFetch("/stage_state?id=eq.1", {
        method: "PATCH",
        body: JSON.stringify({ auto_scroll: false, updated_at: new Date().toISOString() }),
      });
      await loadData();
    } catch(e) { console.error(e); }
  };

  const handleRemove = async (id) => {
    await api.queue.delete(id).catch(console.error);
    await loadData();
  };

  const handleDrop = async (toIdx) => {
    if (dragIdx === null || dragIdx === toIdx) { setDragIdx(null); return; }
    const reordered = [...queue];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(toIdx, 0, moved);
    setQueue(reordered);
    setDragIdx(null);
    await api.queue.reorder(reordered).catch(console.error);
  };

  if (!activeEvent) {
    return (
      <div style={{textAlign:"center",padding:"80px 24px",color:"rgba(255,255,255,.25)"}}>
        <div style={{fontSize:48,marginBottom:16}}>🎪</div>
        <div style={{fontFamily:"var(--fd)",fontSize:20,letterSpacing:2,marginBottom:8}}>NO ACTIVE EVENT</div>
        <div style={{fontSize:14}}>Create an event in the Events tab first</div>
      </div>
    );
  }

  return (
    <div style={{height:"100%",display:"flex",flexDirection:"column"}}>
      {/* Event bar */}
      <div style={{padding:"10px 20px",background:"rgba(0,0,0,.3)",borderBottom:"1px solid rgba(245,200,66,.1)",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:7,height:7,borderRadius:"50%",background:"var(--green)",boxShadow:"0 0 5px var(--green)"}} />
          <span style={{fontFamily:"var(--fd)",fontSize:14,color:"var(--green)",letterSpacing:2}}>{activeEvent.name}</span>
          <span style={{color:"rgba(255,255,255,.25)",fontSize:12}}>· {activeEvent.venue}</span>
        </div>
        <div style={{fontSize:11,color:"rgba(255,255,255,.2)"}}>
          <span className={loading?"spin":""}>⟳</span> Live · 3s
        </div>
      </div>

      {/* Now playing bar */}
      {nowPlaying && (
        <div style={{padding:"12px 20px",background:"rgba(245,200,66,.07)",borderBottom:"2px solid rgba(245,200,66,.2)",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0,gap:12}}>
          <div style={{display:"flex",alignItems:"center",gap:12,minWidth:0}}>
            <div style={{width:8,height:8,borderRadius:"50%",background:"var(--gold)",boxShadow:"0 0 8px var(--gold)",flexShrink:0}} />
            <div style={{minWidth:0}}>
              <div style={{fontWeight:700,fontSize:15,color:"white",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{nowPlaying.song_title}</div>
              <div style={{color:"rgba(255,255,255,.45)",fontSize:12,marginTop:1}}>{nowPlaying.singer_name} · {nowPlaying.song_artist}</div>
            </div>
          </div>
          <div style={{display:"flex",gap:6,flexShrink:0}}>
            {!autoScroll ? (
              <button onClick={handleStartSong} style={{padding:"8px 14px",background:"var(--green)",border:"none",borderRadius:7,color:"white",fontFamily:"var(--fd)",fontSize:13,letterSpacing:1,cursor:"pointer"}}>▶ START SONG</button>
            ) : (
              <button onClick={handlePause} style={{padding:"8px 14px",background:"rgba(255,255,255,.1)",border:"none",borderRadius:7,color:"white",fontFamily:"var(--fd)",fontSize:13,letterSpacing:1,cursor:"pointer"}}>⏸ PAUSE</button>
            )}
            <button onClick={handleComplete} style={{padding:"8px 14px",background:"var(--red)",border:"none",borderRadius:7,color:"white",fontFamily:"var(--fd)",fontSize:13,letterSpacing:1,cursor:"pointer"}}>✓ DONE</button>
          </div>
        </div>
      )}

      {/* Sub tabs */}
      <div style={{display:"flex",borderBottom:"1px solid rgba(245,200,66,.1)",flexShrink:0}}>
        {[["bullpen",`🏟 BULLPEN (${bullpen.length})`],["queue",`🎵 QUEUE (${queue.length})`]].map(([t,l]) => (
          <button key={t} className={`tab-btn${subTab===t?" active":""}`} style={{fontSize:13,padding:"10px 20px"}} onClick={()=>setSubTab(t)}>{l}</button>
        ))}
      </div>

      {/* Content */}
      <div style={{flex:1,overflowY:"auto",padding:16}}>

        {/* BULLPEN */}
        {subTab==="bullpen" && (
          <div>
            {bullpen.length===0 && (
              <div style={{textAlign:"center",padding:"50px 0",color:"rgba(255,255,255,.2)"}}>
                <div style={{fontSize:32,marginBottom:10}}>🏟</div>
                <div style={{fontFamily:"var(--fd)",fontSize:16,letterSpacing:2}}>BULLPEN IS EMPTY</div>
                <div style={{fontSize:12,marginTop:6}}>Singers request at phlswede.github.io/LiveBandKaraoke/sing</div>
              </div>
            )}
            {bullpen.map((req, i) => (
              <BullpenCard
                key={req.id}
                req={req}
                position={i + 1}
                eventId={activeEvent.id}
                onAddedToQueue={loadData}
              />
            ))}
          </div>
        )}

        {/* QUEUE */}
        {subTab==="queue" && (
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {queue.length===0 && (
              <div style={{textAlign:"center",padding:"50px 0",color:"rgba(255,255,255,.2)"}}>
                <div style={{fontSize:32,marginBottom:10}}>🎵</div>
                <div style={{fontFamily:"var(--fd)",fontSize:16,letterSpacing:2}}>QUEUE IS EMPTY</div>
                <div style={{fontSize:12,marginTop:6}}>Add singers from the Bullpen tab</div>
              </div>
            )}
            {queue.map((item,i) => (
              <div key={item.id} className="queue-row" draggable
                onDragStart={()=>setDragIdx(i)} onDragOver={e=>e.preventDefault()} onDrop={()=>handleDrop(i)}
                style={{display:"flex",alignItems:"center",gap:12,padding:"13px 14px",
                  background:"rgba(255,255,255,.04)",border:`1px solid ${i===0?"rgba(245,200,66,.35)":"rgba(255,255,255,.07)"}`,borderRadius:10}}>
                <span style={{fontFamily:"var(--fd)",fontSize:22,color:i===0?"var(--gold)":"rgba(255,255,255,.15)",width:24,textAlign:"center",flexShrink:0}}>{i+1}</span>
                <span style={{color:"rgba(255,255,255,.2)",fontSize:18,flexShrink:0}}>⠿</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:600,fontSize:14}}>{item.song_title}</div>
                  <div style={{color:"rgba(255,255,255,.4)",fontSize:12,marginTop:1}}>
                    {item.singer_name} · {item.song_artist} · <span style={{fontFamily:"var(--fm)",fontSize:11}}>{item.song_key}</span>
                  </div>
                </div>
                <button onClick={()=>handlePlay(item)} style={{
                  padding:"8px 14px",background:i===0?"var(--gold)":"rgba(245,200,66,.12)",border:"none",borderRadius:6,
                  color:i===0?"var(--deep)":"var(--gold)",fontFamily:"var(--fd)",fontSize:13,letterSpacing:1,flexShrink:0
                }}>▶ PLAY</button>
                <button onClick={()=>handleRemove(item.id)} style={{padding:"8px 10px",background:"rgba(192,57,43,.12)",border:"none",borderRadius:6,color:"var(--red)",fontSize:13,flexShrink:0}}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── PROMPTER TAB ─────────────────────────────────────────────────────────────
function PrompterTab() {
  const [nowPlaying, setNowPlaying] = useState(null);
  const [autoScroll, setAutoScroll] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(35);
  const pollRef = useRef(null);
  const speedDebounceRef = useRef(null);
  const localSpeedRef = useRef(35); // track local value to avoid poll overwrite

  const updateStageState = async (updates) => {
    try {
      await sbFetch("/stage_state?id=eq.1", {
        method: "PATCH",
        body: JSON.stringify({ ...updates, updated_at: new Date().toISOString() }),
      });
    } catch(e) { console.error("Stage state update failed:", e); }
  };

  const toggleAutoScroll = () => {
    const next = !autoScroll;
    setAutoScroll(next);
    updateStageState({ auto_scroll: next });
  };

  const updateSpeed = (speed) => {
    localSpeedRef.current = speed;
    setScrollSpeed(speed);
    // Debounce DB write — only write after slider stops moving
    clearTimeout(speedDebounceRef.current);
    speedDebounceRef.current = setTimeout(() => {
      updateStageState({ scroll_speed: speed });
    }, 400);
  };

  const loadPlaying = async () => {
    try {
      const evts = await api.events.active();
      if (!evts || evts.length === 0) { setNowPlaying(null); return; }
      const playing = await api.queue.playing(evts[0].id);
      setNowPlaying(playing && playing.length > 0 ? playing[0] : null);
      // Load stage state but don't overwrite local speed if user is sliding
      const state = await sbFetch("/stage_state?id=eq.1&select=auto_scroll,scroll_speed");
      if (state && state.length > 0) {
        setAutoScroll(state[0].auto_scroll);
        // Only update speed from DB if user isn't actively changing it
        if (!speedDebounceRef.current) {
          localSpeedRef.current = state[0].scroll_speed;
          setScrollSpeed(state[0].scroll_speed);
        }
      }
    } catch(e) { console.error(e); }
  };

  useEffect(() => {
    loadPlaying();
    pollRef.current = setInterval(loadPlaying, 3000);
    return () => clearInterval(pollRef.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const section = (label, children) => (
    <div style={{marginBottom:24}}>
      <div style={{fontFamily:"var(--fd)",fontSize:11,color:"var(--gold2)",letterSpacing:3,marginBottom:10}}>{label}</div>
      {children}
    </div>
  );

  return (
    <div style={{maxWidth:560,margin:"0 auto",padding:"28px 24px"}}>

      {/* Now playing */}
      {section("NOW PLAYING ON STAGE",
        nowPlaying ? (
          <div style={{background:"rgba(245,200,66,.07)",border:"2px solid var(--gold)",borderRadius:12,padding:"16px 18px"}}>
            <div style={{fontWeight:700,fontSize:18,color:"white"}}>{nowPlaying.song_title}</div>
            <div style={{color:"rgba(255,255,255,.45)",fontSize:13,marginTop:3}}>{nowPlaying.singer_name} · {nowPlaying.song_artist}</div>
          </div>
        ) : (
          <div style={{padding:"16px",background:"rgba(255,255,255,.03)",borderRadius:10,color:"rgba(255,255,255,.25)",fontSize:14}}>
            No song currently playing — use the Queue tab to start one
          </div>
        )
      )}

      {/* Stage display link */}
      {section("STAGE DISPLAY",
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          <div style={{fontSize:13,color:"rgba(255,255,255,.4)",lineHeight:1.6}}>
            Open on the MacBook, then AirPlay to the TV. Sign in with Google Drive to load chord sheets.
          </div>
          <a href="/LiveBandKaraoke/stage" target="_blank" rel="noopener noreferrer" style={{
            display:"block",padding:"12px 16px",background:"rgba(245,200,66,.08)",
            border:"1px solid rgba(245,200,66,.25)",borderRadius:8,
            color:"var(--gold)",fontFamily:"var(--fd)",fontSize:15,letterSpacing:2,
            textDecoration:"none",textAlign:"center"
          }}>📺 OPEN STAGE DISPLAY ↗</a>
        </div>
      )}

      {/* Auto scroll */}
      {section("AUTO-SCROLL",
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px",background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.08)",borderRadius:10}}>
            <div>
              <div style={{fontWeight:600,fontSize:14}}>Auto-scroll</div>
              <div style={{fontSize:12,color:"rgba(255,255,255,.35)",marginTop:2}}>Controls the stage display teleprompter</div>
            </div>
            <button onClick={toggleAutoScroll} style={{
              width:48,height:26,borderRadius:13,border:"none",cursor:"pointer",
              background:autoScroll?"var(--gold)":"rgba(255,255,255,.15)",
              position:"relative",transition:"background .2s",flexShrink:0
            }}>
              <div style={{
                width:20,height:20,borderRadius:"50%",background:"white",
                position:"absolute",top:3,transition:"left .2s",
                left:autoScroll?24:4,boxShadow:"0 1px 3px rgba(0,0,0,.3)"
              }} />
            </button>
          </div>

          {/* Speed always visible, not just when auto-scroll on */}
          <div style={{padding:"14px 16px",background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.08)",borderRadius:10}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <span style={{fontSize:13,color:"rgba(255,255,255,.6)"}}>Scroll speed</span>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <button onClick={()=>updateSpeed(Math.max(0,scrollSpeed-5))} style={{width:28,height:28,borderRadius:6,border:"none",background:"rgba(255,255,255,.1)",color:"white",fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>−</button>
                <span style={{fontFamily:"var(--fm)",fontSize:14,color:"var(--gold)",minWidth:28,textAlign:"center"}}>{scrollSpeed}</span>
                <button onClick={()=>updateSpeed(Math.min(100,scrollSpeed+5))} style={{width:28,height:28,borderRadius:6,border:"none",background:"rgba(255,255,255,.1)",color:"white",fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
              </div>
            </div>
            <input type="range" min={0} max={100} value={scrollSpeed}
              onChange={e=>updateSpeed(+e.target.value)} style={{width:"100%"}} />
            <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}>
              <span style={{fontSize:11,color:"rgba(255,255,255,.2)"}}>Slow</span>
              <span style={{fontSize:11,color:"rgba(255,255,255,.2)"}}>Fast</span>
            </div>
          </div>
        </div>
      )}

      <div style={{fontSize:11,color:"rgba(255,255,255,.15)",textAlign:"center",marginTop:8}}>
        Speed and auto-scroll saved automatically · Stage display updates within 3s
      </div>
    </div>
  );
}

// ─── GOOGLE DRIVE SYNC ────────────────────────────────────────────────────────
const GOOGLE_CLIENT_ID = "789357706640-ckolnet2fi5kb2bui1phsrd0kpe3o8b8.apps.googleusercontent.com";
const DRIVE_FOLDER_ID = "1rse9x9mShwMXKJ1iRj34Cv21Wa21s06O";
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.readonly";

// Parse "Lead Sheet - Artist - Song Title" style filenames
function parseFilename(filename) {
  // Remove file extension
  let name = filename.replace(/\.(docx?|pdf|gdoc)$/i, "");
  // Remove "Lead Sheet" prefix (various forms)
  name = name.replace(/^lead\s*sheet\s*[-–—:]\s*/i, "");
  // Split on " - " or " – " or " — "
  const parts = name.split(/\s*[-–—]\s*/).map(p => p.trim()).filter(Boolean);

  if (parts.length >= 2) {
    return { artist: parts[0], title: parts.slice(1).join(" - "), parsed: true };
  } else if (parts.length === 1) {
    return { artist: "", title: parts[0], parsed: false };
  }
  return { artist: "", title: filename, parsed: false };
}

function loadGoogleScript() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) { resolve(); return; }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = resolve;
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

// Recursively list all files under a folder, tracking genre (top-level subfolder name)
async function listDriveFilesRecursive(accessToken, folderId, genre = null, depth = 0) {
  const q = `'${folderId}' in parents and trashed = false`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=${encodeURIComponent("files(id,name,mimeType,shortcutDetails)")}&pageSize=1000`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) {
    const errText = await res.text();
    console.error(`Drive API error at depth ${depth} for folder ${folderId}:`, res.status, errText);
    throw new Error(`Drive API error: ${res.status}`);
  }
  const data = await res.json();
  const items = data.files || [];
  console.log(`Depth ${depth}, folder ${folderId} (genre=${genre}): found ${items.length} items`, items.map(i => `${i.name} [${i.mimeType}]`));

  let results = [];
  for (const item of items) {
    let mimeType = item.mimeType;
    let targetId = item.id;

    // Resolve shortcuts to their target
    if (mimeType === "application/vnd.google-apps.shortcut" && item.shortcutDetails) {
      mimeType = item.shortcutDetails.targetMimeType;
      targetId = item.shortcutDetails.targetId;
    }

    if (mimeType === "application/vnd.google-apps.folder") {
      // depth 0 = genre folders; genre name carries down to deeper levels
      const nextGenre = depth === 0 ? item.name : genre;
      const nested = await listDriveFilesRecursive(accessToken, targetId, nextGenre, depth + 1);
      results = results.concat(nested);
    } else {
      // Only include files starting with "Lead Sheet"
      if (/^lead\s*sheet/i.test(item.name)) {
        results.push({ ...item, id: targetId, genre });
      } else {
        console.log(`Skipping (doesn't start with "Lead Sheet"): ${item.name} [${mimeType}]`);
      }
    }
  }
  return results;
}

// ─── MUSICBRAINZ + SPOTIFY ENRICHMENT ────────────────────────────────────────

const SPOTIFY_CLIENT_ID = "982cf49589274cdeae0dae6b23cacf94";
const SPOTIFY_CLIENT_SECRET = "0e107c8f94244979a0b91b1a8d0576b0";

// Get Spotify access token via client credentials
async function getSpotifyToken() {
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": "Basic " + btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`),
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error("Failed to get Spotify token");
  const data = await res.json();
  return data.access_token;
}

// Look up a song on Spotify, return artist genres
async function lookupSpotify(title, artist, token) {
  try {
    const q = encodeURIComponent(`track:${title} artist:${artist}`);
    const res = await fetch(`https://api.spotify.com/v1/search?q=${q}&type=track&limit=1`, {
      headers: { "Authorization": `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const tracks = data.tracks?.items;
    if (!tracks || tracks.length === 0) return null;

    const track = tracks[0];
    const artistId = track.artists?.[0]?.id;
    if (!artistId) return null;

    // Fetch artist to get genres
    const artistRes = await fetch(`https://api.spotify.com/v1/artists/${artistId}`, {
      headers: { "Authorization": `Bearer ${token}` },
    });
    if (!artistRes.ok) return null;
    const artistData = await artistRes.json();
    const genres = (artistData.genres || []).slice(0, 5);

    return genres.length > 0 ? genres : null;
  } catch(e) {
    console.error(`Spotify lookup failed for ${title} - ${artist}:`, e);
    return null;
  }
}

// Derive decade from year
function yearToDecade(year) {
  if (!year) return null;
  const y = parseInt(year);
  if (isNaN(y)) return null;
  return `${Math.floor(y / 10) * 10}s`;
}

// Query MusicBrainz for a recording by title + artist
async function lookupMusicBrainz(title, artist) {
  try {
    const query = encodeURIComponent(`recording:"${title}" AND artist:"${artist}"`);
    const url = `https://musicbrainz.org/ws/2/recording?query=${query}&limit=1&fmt=json`;
    const res = await fetch(url, {
      headers: { "User-Agent": "PurpleSandwichKaraoke/1.0 (oskar.f.johansson@gmail.com)" }
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.recordings || data.recordings.length === 0) return null;

    const rec = data.recordings[0];
    // Get earliest release date
    let year = null;
    if (rec.releases && rec.releases.length > 0) {
      const dates = rec.releases
        .map(r => r.date ? parseInt(r.date.split("-")[0]) : null)
        .filter(Boolean);
      if (dates.length > 0) year = Math.min(...dates);
    }
    if (!year && rec["first-release-date"]) {
      year = parseInt(rec["first-release-date"].split("-")[0]);
    }

    // Get tags
    const tags = (rec.tags || [])
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(t => t.name);

    return {
      mb_id: rec.id,
      decade: yearToDecade(year),
      tags: tags.length > 0 ? tags : null,
    };
  } catch(e) {
    console.error(`MusicBrainz lookup failed for ${title} - ${artist}:`, e);
    return null;
  }
}

// Sleep helper for rate limiting (MusicBrainz allows 1 req/sec)
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function SongsTab() {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [error, setError] = useState(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [previewSong, setPreviewSong] = useState(null);
  const [previewHtml, setPreviewHtml] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [enrichProgress, setEnrichProgress] = useState(null);
  const enrichCancelRef = useRef(false);

  const runEnrichment = async () => {
    setEnriching(true);
    enrichCancelRef.current = false;
    setEnrichProgress({ done: 0, total: 0, found: 0, notFound: 0, phase: "MusicBrainz" });

    try {
      // ── Phase 1: MusicBrainz for decade (songs missing mb_id) ──
      const unenriched = await sbFetch("/songs?mb_id=is.null&select=id,title,artist&order=artist.asc");
      const mbSongs = unenriched || [];
      const total1 = mbSongs.length;
      let done = 0, found = 0, notFound = 0;
      setEnrichProgress({ done, total: total1, found, notFound, phase: "MusicBrainz (decade)" });

      for (const song of mbSongs) {
        if (enrichCancelRef.current) break;
        if (!song.title || !song.artist) { done++; notFound++; continue; }
        const result = await lookupMusicBrainz(song.title, song.artist);
        if (result) {
          await sbFetch(`/songs?id=eq.${song.id}`, { method: "PATCH", body: JSON.stringify(result) });
          found++;
        } else { notFound++; }
        done++;
        setEnrichProgress({ done, total: total1, found, notFound, phase: "MusicBrainz (decade)" });
        await sleep(1100);
      }

      if (enrichCancelRef.current) { setEnrichProgress(p => ({ ...p, complete: true })); setEnriching(false); return; }

      // ── Phase 2: Spotify for genre tags (songs missing tags) ──
      const noTags = await sbFetch("/songs?tags=is.null&select=id,title,artist&order=artist.asc");
      const spotifySongs = noTags || [];
      const total2 = spotifySongs.length;
      done = 0; found = 0; notFound = 0;
      setEnrichProgress({ done, total: total2, found, notFound, phase: "Spotify (genres)" });

      if (total2 > 0) {
        let token = null;
        try { token = await getSpotifyToken(); } catch(e) { setError("Spotify auth failed: " + e.message); }

        if (token) {
          for (const song of spotifySongs) {
            if (enrichCancelRef.current) break;
            if (!song.title || !song.artist) { done++; notFound++; continue; }
            const genres = await lookupSpotify(song.title, song.artist, token);
            if (genres) {
              await sbFetch(`/songs?id=eq.${song.id}`, { method: "PATCH", body: JSON.stringify({ tags: genres }) });
              found++;
            } else { notFound++; }
            done++;
            setEnrichProgress({ done, total: total2, found, notFound, phase: "Spotify (genres)" });
            await sleep(100); // Spotify is generous with rate limits
          }
        }
      }

      setEnrichProgress(p => ({ ...p, complete: true }));
      await loadSongs();
    } catch(e) {
      console.error("Enrichment error:", e);
      setError("Enrichment failed: " + e.message);
    } finally {
      setEnriching(false);
    }
  };

  const previewLeadSheet = (song) => {
    if (!scriptReady || !window.google) { setError("Google sign-in not ready yet — try again in a moment"); return; }
    setError(null);
    setPreviewSong(song);
    setPreviewHtml(null);
    setPreviewLoading(true);

    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: DRIVE_SCOPE,
      callback: async (response) => {
        if (response.error) { setError("Google sign-in failed: " + response.error); setPreviewLoading(false); return; }
        try {
          const url = `https://www.googleapis.com/drive/v3/files/${song.drive_file_id}/export?mimeType=text/html`;
          const res = await fetch(url, { headers: { Authorization: `Bearer ${response.access_token}` } });
          if (!res.ok) throw new Error(`Export failed: ${res.status}`);
          const html = await res.text();
          // Extract just the body content
          const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
          setPreviewHtml(bodyMatch ? bodyMatch[1] : html);
        } catch(e) {
          console.error(e);
          setError("Preview failed: " + e.message);
        } finally {
          setPreviewLoading(false);
        }
      },
    });
    client.requestAccessToken();
  };

  const loadSongs = async () => {
    try {
      const list = await sbFetch("/songs?order=artist.asc,title.asc");
      setSongs(list || []);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    loadSongs();
    loadGoogleScript().then(() => setScriptReady(true)).catch(e => setError("Failed to load Google sign-in"));
  }, []);

  const connectAndSync = () => {
    if (!scriptReady || !window.google) { setError("Google sign-in not ready yet — try again in a moment"); return; }
    setError(null);
    setSyncResult(null);

    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: DRIVE_SCOPE,
      callback: async (response) => {
        if (response.error) { setError("Google sign-in failed: " + response.error); return; }
        await runSync(response.access_token);
      },
    });
    client.requestAccessToken();
  };

  const runSync = async (accessToken) => {
    setSyncing(true);
    try {
      // Recursively scan: root → genre folders → artist folders → lead sheet files
      const files = await listDriveFilesRecursive(accessToken, DRIVE_FOLDER_ID);

      if (files.length === 0) {
        setSyncResult({ total: 0, added: 0, updated: 0, unparsed: 0 });
        setSyncing(false);
        return;
      }

      // Get existing songs to know what's new vs updated
      const existing = await sbFetch("/songs?select=drive_file_id");
      const existingIds = new Set((existing || []).map(s => s.drive_file_id));

      let added = 0, updated = 0, unparsed = 0;

      for (const file of files) {
        const parsed = parseFilename(file.name);
        if (!parsed.parsed) unparsed++;

        const payload = {
          title: parsed.title,
          artist: parsed.artist,
          genre: file.genre || null,
          raw_filename: file.name,
          drive_file_id: file.id,
          last_synced: new Date().toISOString(),
        };

        if (existingIds.has(file.id)) {
          await sbFetch(`/songs?drive_file_id=eq.${file.id}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
          });
          updated++;
        } else {
          await sbFetch("/songs", {
            method: "POST",
            body: JSON.stringify(payload),
          });
          added++;
        }
      }

      setSyncResult({ total: files.length, added, updated, unparsed });
      await loadSongs();
    } catch(e) {
      console.error(e);
      setError("Sync failed: " + e.message);
    } finally {
      setSyncing(false);
    }
  };

  const updateSong = async (id, field, value) => {
    try {
      await sbFetch(`/songs?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ [field]: value }) });
      setSongs(songs.map(s => s.id === id ? { ...s, [field]: value } : s));
    } catch(e) { console.error(e); }
  };

  const deleteSong = async (id) => {
    try {
      await sbFetch(`/songs?id=eq.${id}`, { method: "DELETE", headers: { "Prefer": "" } });
      setSongs(songs.filter(s => s.id !== id));
    } catch(e) { console.error(e); }
  };

  const clearAllSongs = async () => {
    if (!window.confirm(`Delete all ${songs.length} songs from the library? This cannot be undone — you can re-sync from Drive after.`)) return;
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/songs?id=neq.00000000-0000-0000-0000-000000000000`, {
        method: "DELETE",
        headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` },
      });
      setSongs([]);
      setSyncResult(null);
    } catch(e) { console.error(e); }
  };

  const unparsedSongs = songs.filter(s => !s.artist);

  return (
    <div style={{maxWidth:760,margin:"0 auto",padding:"28px 24px"}}>

      {/* Sync section */}
      <div style={{background:"rgba(255,255,255,.03)",border:"1px solid var(--border)",borderRadius:14,padding:"24px",marginBottom:28}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:16}}>
          <div>
            <div style={{fontFamily:"var(--fd)",fontSize:20,color:"var(--gold)",letterSpacing:2,marginBottom:4}}>📁 GOOGLE DRIVE SYNC</div>
            <div style={{fontSize:13,color:"rgba(255,255,255,.4)",lineHeight:1.6}}>
              Scans your chord sheet folder and updates the song library.<br/>
              Run this whenever you add new lead sheets.
            </div>
          </div>
          <div style={{display:"flex",gap:8,flexShrink:0}}>
            <button onClick={clearAllSongs} disabled={syncing} className="btn-ghost" style={{padding:"12px 18px",fontSize:13}}>
              🗑 Clear All
            </button>
            <button onClick={connectAndSync} disabled={syncing} className="btn-gold" style={{padding:"12px 24px",fontSize:15}}>
              {syncing ? "SYNCING…" : "🔄 SYNC SONGS"}
            </button>
          </div>
        </div>

        {error && (
          <div style={{marginTop:14,padding:"10px 14px",background:"rgba(192,57,43,.15)",border:"1px solid rgba(192,57,43,.4)",borderRadius:8,color:"#e74c3c",fontSize:13}}>
            ⚠️ {error}
          </div>
        )}

        {syncResult && (
          <div className="fade-in" style={{marginTop:14,padding:"14px 16px",background:"rgba(39,174,96,.08)",border:"1px solid rgba(39,174,96,.3)",borderRadius:10}}>
            <div style={{fontFamily:"var(--fd)",fontSize:14,color:"var(--green)",letterSpacing:1,marginBottom:6}}>✓ SYNC COMPLETE</div>
            <div style={{fontSize:13,color:"rgba(255,255,255,.6)",lineHeight:1.6}}>
              Found {syncResult.total} files · {syncResult.added} new · {syncResult.updated} updated
              {syncResult.unparsed > 0 && <> · <span style={{color:"var(--gold)"}}>{syncResult.unparsed} need review</span></>}
            </div>
          </div>
        )}
      </div>

      {/* Enrichment section */}
      <div style={{background:"rgba(255,255,255,.03)",border:"1px solid var(--border)",borderRadius:14,padding:"24px",marginBottom:28}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:16}}>
          <div>
            <div style={{fontFamily:"var(--fd)",fontSize:20,color:"var(--gold)",letterSpacing:2,marginBottom:4}}>🎵 METADATA ENRICHMENT</div>
            <div style={{fontSize:13,color:"rgba(255,255,255,.4)",lineHeight:1.6}}>
              Phase 1: MusicBrainz → decade (1 req/sec, ~13 mins for 788 songs)<br/>
              Phase 2: Spotify → genre tags (fast, runs after MusicBrainz)
            </div>
          </div>
          <div style={{display:"flex",gap:8,flexShrink:0}}>
            {enriching && (
              <button onClick={() => { enrichCancelRef.current = true; }} style={{padding:"12px 18px",background:"rgba(192,57,43,.15)",border:"1px solid rgba(192,57,43,.3)",borderRadius:8,color:"var(--red)",fontSize:13,cursor:"pointer"}}>
                Stop
              </button>
            )}
            <button onClick={runEnrichment} disabled={enriching} className="btn-gold" style={{padding:"12px 24px",fontSize:15}}>
              {enriching ? "ENRICHING…" : "🔍 ENRICH METADATA"}
            </button>
          </div>
        </div>

        {/* Progress */}
        {enrichProgress && (
          <div className="fade-in" style={{marginTop:14}}>
            {/* Progress bar */}
            <div style={{height:4,background:"rgba(255,255,255,.08)",borderRadius:2,marginBottom:10,overflow:"hidden"}}>
              <div style={{
                height:"100%",background:"var(--gold)",borderRadius:2,
                width: enrichProgress.total > 0 ? `${(enrichProgress.done/enrichProgress.total)*100}%` : "0%",
                transition:"width .3s ease"
              }} />
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"rgba(255,255,255,.5)"}}>
              <span>{enrichProgress.phase && <span style={{color:"var(--gold2)",marginRight:8}}>{enrichProgress.phase}</span>}{enrichProgress.done} / {enrichProgress.total}</span>
              <span style={{color:"var(--green)"}}>✓ {enrichProgress.found} found</span>
              <span style={{color:"rgba(255,255,255,.3)"}}>✗ {enrichProgress.notFound} not found</span>
            </div>
            {enrichProgress.complete && (
              <div style={{marginTop:8,padding:"10px 14px",background:"rgba(39,174,96,.08)",border:"1px solid rgba(39,174,96,.3)",borderRadius:8,fontSize:13,color:"var(--green)"}}>
                ✓ Enrichment complete — {enrichProgress.found} songs updated with decade and tags
              </div>
            )}
          </div>
        )}
      </div>

      {/* Needs review */}
      {unparsedSongs.length > 0 && (
        <div style={{marginBottom:28}}>
          <div style={{fontFamily:"var(--fd)",fontSize:13,color:"var(--gold2)",letterSpacing:3,marginBottom:12}}>⚠️ NEEDS REVIEW ({unparsedSongs.length})</div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {unparsedSongs.map(song => (
              <div key={song.id} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",background:"rgba(245,200,66,.05)",border:"1px solid rgba(245,200,66,.2)",borderRadius:10}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,color:"rgba(255,255,255,.3)",marginBottom:4,fontFamily:"var(--fm)"}}>{song.raw_filename}</div>
                  <div style={{display:"flex",gap:8}}>
                    <input className="input-field" placeholder="Artist" defaultValue={song.artist || ""}
                      onBlur={e => updateSong(song.id, "artist", e.target.value)} style={{flex:1,fontSize:13,padding:"7px 10px"}} />
                    <input className="input-field" placeholder="Title" defaultValue={song.title || ""}
                      onBlur={e => updateSong(song.id, "title", e.target.value)} style={{flex:1,fontSize:13,padding:"7px 10px"}} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Song library */}
      <div style={{fontFamily:"var(--fd)",fontSize:13,color:"rgba(255,255,255,.25)",letterSpacing:3,marginBottom:14}}>SONG LIBRARY ({songs.length})</div>
      {loading && <div style={{color:"rgba(255,255,255,.3)",padding:"20px 0"}}>Loading…</div>}
      {!loading && songs.length === 0 && (
        <div style={{textAlign:"center",padding:"50px 24px",color:"rgba(255,255,255,.2)"}}>
          <div style={{fontSize:40,marginBottom:12}}>🎶</div>
          <div style={{fontFamily:"var(--fd)",fontSize:18,letterSpacing:2,marginBottom:8}}>NO SONGS YET</div>
          <div style={{fontSize:13}}>Click "Sync Songs" above to import from Google Drive</div>
        </div>
      )}
      <div style={{display:"flex",flexDirection:"column",gap:6}}>
        {songs.map(song => (
          <div key={song.id} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 14px",background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.07)",borderRadius:10}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:600,fontSize:14}}>{song.title}</div>
              <div style={{color:"rgba(255,255,255,.4)",fontSize:12}}>{song.artist || "—"}</div>
              {(song.decade || (song.tags && song.tags.length > 0)) && (
                <div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:4}}>
                  {song.decade && <span style={{background:"rgba(245,200,66,.1)",border:"1px solid rgba(245,200,66,.2)",borderRadius:4,padding:"1px 6px",fontSize:10,color:"var(--gold2)"}}>{song.decade}</span>}
                  {song.tags && song.tags.slice(0,3).map(t => <span key={t} style={{background:"rgba(255,255,255,.06)",borderRadius:4,padding:"1px 6px",fontSize:10,color:"rgba(255,255,255,.4)"}}>{t}</span>)}
                </div>
              )}
            </div>
            {song.song_key && <span style={{fontFamily:"var(--fm)",fontSize:12,color:"var(--gold2)"}}>{song.song_key}</span>}
            <button onClick={() => previewLeadSheet(song)} style={{padding:"6px 12px",background:"rgba(245,200,66,.1)",border:"1px solid rgba(245,200,66,.25)",borderRadius:6,color:"var(--gold)",fontSize:12,flexShrink:0,cursor:"pointer"}}>👁 Preview</button>
            <button onClick={() => deleteSong(song.id)} style={{padding:"6px 10px",background:"rgba(192,57,43,.12)",border:"none",borderRadius:6,color:"var(--red)",fontSize:13,flexShrink:0}}>✕</button>
          </div>
        ))}
      </div>

      {/* Preview modal */}
      {previewSong && (
        <div onClick={() => { setPreviewSong(null); setPreviewHtml(null); }} style={{
          position:"fixed",inset:0,background:"rgba(0,0,0,.7)",zIndex:1000,
          display:"flex",alignItems:"center",justifyContent:"center",padding:24
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background:"#fff",color:"#000",borderRadius:14,maxWidth:700,width:"100%",
            maxHeight:"85vh",overflow:"hidden",display:"flex",flexDirection:"column"
          }}>
            <div style={{padding:"16px 20px",borderBottom:"1px solid #eee",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
              <div>
                <div style={{fontFamily:"var(--fd)",fontSize:18,color:"#333",letterSpacing:1}}>{previewSong.title}</div>
                <div style={{fontSize:12,color:"#888"}}>{previewSong.artist}</div>
              </div>
              <button onClick={() => { setPreviewSong(null); setPreviewHtml(null); }} style={{background:"none",border:"none",fontSize:24,cursor:"pointer",color:"#999"}}>×</button>
            </div>
            <div style={{flex:1,overflowY:"auto",padding:"20px 24px"}}>
              {previewLoading && <div style={{textAlign:"center",padding:40,color:"#999"}}>Loading lead sheet…</div>}
              {previewHtml && <div dangerouslySetInnerHTML={{__html: previewHtml}} />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


export default function BandApp() {
  const [tab, setTab] = useState("events");

  return (
    <>
      <style>{css}</style>
      <div style={{height:"100vh",display:"flex",flexDirection:"column",background:"var(--deep)"}}>
        <Nav tab={tab} setTab={setTab} />
        <div style={{flex:1,overflowY:"auto"}}>
          {tab==="events" && <EventsTab />}
          {tab==="queue" && <QueueTab />}
          {tab==="songs" && <SongsTab />}
          {tab==="prompter" && <PrompterTab />}
        </div>
      </div>
    </>
  );
}
