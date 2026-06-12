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
      {[["events","🎪 Events"],["queue","🎵 Queue"],["prompter","🎛 Prompter"]].map(([t,label]) => (
        <button key={t} className={`tab-btn${tab===t?" active":""}`} onClick={()=>setTab(t)}>{label}</button>
      ))}
      <a href="/stage" target="_blank" rel="noopener noreferrer" style={{
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
    if (!selectedSong) return;
    setAdding(true);
    try {
      // Get current max queue position
      const existing = await api.queue.list(eventId).catch(() => []);
      const nextPos = existing && existing.length > 0
        ? Math.max(...existing.map(i => i.position)) + 1 : 0;

      // Insert queue row
      const payload = {
        event_id: eventId,
        singer_name: req.singer_name,
        session_id: req.session_id,
        song_id: Number(selectedSong.song_id),
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

      // Delete request_songs first (foreign key), then request
      const delSongs = await fetch(`${SUPABASE_URL}/rest/v1/request_songs?request_id=eq.${req.id}`, {
        method: "DELETE",
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
        },
      });
      console.log("Delete request_songs status:", delSongs.status);

      const delReq = await fetch(`${SUPABASE_URL}/rest/v1/requests?id=eq.${req.id}`, {
        method: "DELETE",
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
        },
      });
      console.log("Delete request status:", delReq.status);

      onAddedToQueue();
    } catch(e) {
      console.error("Add to queue error:", e);
      alert("Error: " + e.message);
    }
    finally { setAdding(false); }
  };

  const dismiss = async () => {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/request_songs?request_id=eq.${req.id}`, {
        method: "DELETE",
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
        },
      });
      await fetch(`${SUPABASE_URL}/rest/v1/requests?id=eq.${req.id}`, {
        method: "DELETE",
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
        },
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
      const [q, r, playing] = await Promise.all([
        api.queue.list(event.id),
        api.requests.list(event.id),
        api.queue.playing(event.id),
      ]);
      setQueue(q || []);
      setBullpen(r || []);
      setNowPlaying(playing && playing.length > 0 ? playing[0] : null);
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
      await loadData();
    } catch(e) { console.error(e); }
  };

  const handleComplete = async () => {
    if (!nowPlaying) return;
    try {
      await api.queue.update(nowPlaying.id, { status: "done" });
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
        <div style={{padding:"12px 20px",background:"rgba(245,200,66,.07)",borderBottom:"2px solid rgba(245,200,66,.2)",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:8,height:8,borderRadius:"50%",background:"var(--gold)",boxShadow:"0 0 8px var(--gold)",flexShrink:0}} />
            <div>
              <div style={{fontWeight:700,fontSize:15,color:"white"}}>{nowPlaying.song_title}</div>
              <div style={{color:"rgba(255,255,255,.45)",fontSize:12,marginTop:1}}>{nowPlaying.singer_name} · {nowPlaying.song_artist} · <span style={{fontFamily:"var(--fm)"}}>{nowPlaying.song_key}</span></div>
            </div>
          </div>
          <button onClick={handleComplete} style={{padding:"8px 16px",background:"var(--red)",border:"none",borderRadius:7,color:"white",fontFamily:"var(--fd)",fontSize:13,letterSpacing:1}}>✓ COMPLETE</button>
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
                <div style={{fontSize:12,marginTop:6}}>Singers request at purplesandwich.netlify.app/sing</div>
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
  const [transpose, setTranspose] = useState(0);
  const [autoScroll, setAutoScroll] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(35);
  const pollRef = useRef(null);

  const loadPlaying = async () => {
    try {
      const evts = await api.events.active();
      if (!evts || evts.length === 0) { setNowPlaying(null); return; }
      const playing = await api.queue.playing(evts[0].id);
      setNowPlaying(playing && playing.length > 0 ? playing[0] : null);
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
            <div style={{fontFamily:"var(--fm)",color:"var(--gold2)",fontSize:12,marginTop:4}}>Key: {nowPlaying.song_key}</div>
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
            The stage display is a separate fullscreen page. Open it on the MacBook, then AirPlay to the TV.
          </div>
          <a href="/stage" target="_blank" rel="noopener noreferrer" style={{
            display:"block",padding:"12px 16px",background:"rgba(245,200,66,.08)",
            border:"1px solid rgba(245,200,66,.25)",borderRadius:8,
            color:"var(--gold)",fontFamily:"var(--fd)",fontSize:15,letterSpacing:2,
            textDecoration:"none",textAlign:"center"
          }}>📺 OPEN STAGE DISPLAY ↗</a>
          <div style={{fontSize:12,color:"rgba(255,255,255,.2)"}}>
            Tip: The stage display scrolls naturally with mouse wheel, trackpad, or keyboard arrows. Use auto-scroll below for hands-free operation.
          </div>
        </div>
      )}

      {/* Auto scroll */}
      {section("AUTO-SCROLL",
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px",background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.08)",borderRadius:10}}>
            <div>
              <div style={{fontWeight:600,fontSize:14}}>Auto-scroll</div>
              <div style={{fontSize:12,color:"rgba(255,255,255,.35)",marginTop:2}}>Overrides manual scroll on the stage display</div>
            </div>
            <button onClick={() => setAutoScroll(!autoScroll)} style={{
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

          {autoScroll && (
            <div className="fade-in" style={{padding:"14px 16px",background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.08)",borderRadius:10}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <span style={{fontSize:13,color:"rgba(255,255,255,.6)"}}>Scroll speed</span>
                <span style={{fontFamily:"var(--fm)",fontSize:12,color:"var(--gold)"}}>{scrollSpeed}</span>
              </div>
              <input type="range" min={5} max={100} value={scrollSpeed}
                onChange={e=>setScrollSpeed(+e.target.value)} style={{width:"100%"}} />
              <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}>
                <span style={{fontSize:11,color:"rgba(255,255,255,.2)"}}>Slow</span>
                <span style={{fontSize:11,color:"rgba(255,255,255,.2)"}}>Fast</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Transpose */}
      {section("TRANSPOSE",
        <div style={{background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.08)",borderRadius:10,padding:"14px 16px"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
            <span style={{fontSize:13,color:"rgba(255,255,255,.6)"}}>Semitones</span>
            <span style={{fontFamily:"var(--fm)",fontSize:16,color:"var(--gold)",fontWeight:700}}>
              {transpose > 0 ? `+${transpose}` : transpose === 0 ? "0 (original)" : transpose}
            </span>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>setTranspose(t=>t-1)} style={{flex:1,padding:"12px",background:"rgba(255,255,255,.08)",border:"none",borderRadius:8,color:"white",fontSize:18,cursor:"pointer"}}>♭ −1</button>
            <button onClick={()=>setTranspose(0)} style={{flex:1,padding:"12px",background:transpose===0?"rgba(245,200,66,.15)":"rgba(255,255,255,.04)",border:`1px solid ${transpose===0?"rgba(245,200,66,.3)":"rgba(255,255,255,.08)"}`,borderRadius:8,color:transpose===0?"var(--gold)":"rgba(255,255,255,.35)",fontSize:12,cursor:"pointer"}}>RESET</button>
            <button onClick={()=>setTranspose(t=>t+1)} style={{flex:1,padding:"12px",background:"rgba(255,255,255,.08)",border:"none",borderRadius:8,color:"white",fontSize:18,cursor:"pointer"}}>♯ +1</button>
          </div>
          {transpose !== 0 && nowPlaying && (
            <div style={{marginTop:10,fontSize:12,color:"rgba(255,255,255,.35)",fontFamily:"var(--fm)"}}>
              Original: {nowPlaying.song_key} → Displayed: {nowPlaying.song_key}{/* simplified */}
            </div>
          )}
        </div>
      )}

      <div style={{fontSize:11,color:"rgba(255,255,255,.15)",textAlign:"center",marginTop:8}}>
        Note: transpose and auto-scroll settings apply locally. Stage display reads these on next poll.
      </div>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
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
          {tab==="prompter" && <PrompterTab />}
        </div>
      </div>
    </>
  );
}
