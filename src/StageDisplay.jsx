import { useState, useEffect, useRef, useCallback } from "react";

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_KEY;
const GOOGLE_CLIENT_ID = "789357706640-ckolnet2fi5kb2bui1phsrd0kpe3o8b8.apps.googleusercontent.com";
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.readonly";

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

// Load mammoth.js from CDN
function loadMammoth() {
  return new Promise((resolve, reject) => {
    if (window.mammoth) { resolve(window.mammoth); return; }
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js";
    script.onload = () => resolve(window.mammoth);
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

// Load Google Identity script
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

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,500;0,9..40,700&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  :root{
    --stage-deeper:#0e0825; --stage-dark:#1a0f40;
    --gold:#f5c842; --gold2:#c9a020;
    --fd:'Bebas Neue',sans-serif; --fb:'DM Sans',sans-serif; --fm:'IBM Plex Mono',monospace;
  }
  html,body{height:100%;overflow:hidden;}
  body{font-family:var(--fb);background:var(--stage-deeper);color:white;}

  /* Lead sheet styles — rendered inside .lead-sheet-content */
  .lead-sheet-content {
    color: white;
    font-size: 28px;
    line-height: 2;
    font-weight: 300;
  }
  .lead-sheet-content p { margin: 0; }
  .lead-sheet-content b, .lead-sheet-content strong { color: #7dd3f5; font-weight: 700; font-family: monospace; letter-spacing: 1px; }
  .lead-sheet-content h1, .lead-sheet-content h2, .lead-sheet-content h3 {
    color: var(--gold); font-family: var(--fd); letter-spacing: 4px;
    font-size: 22px; margin-top: 32px; margin-bottom: 8px; font-weight: 400;
  }
  .lead-sheet-content table { border-collapse: collapse; width: 100%; }
  .lead-sheet-content td { padding: 2px 8px; vertical-align: top; }
  .lead-sheet-content br { line-height: 1; }
`;

export default function StageDisplay() {
  const [nowPlaying, setNowPlaying] = useState(null);
  const [nextUp, setNextUp] = useState(null);
  const [autoScroll, setAutoScroll] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(35);
  const [sheetHtml, setSheetHtml] = useState(null);
  const [sheetLoading, setSheetLoading] = useState(false);
  const [sheetError, setSheetError] = useState(null);
  const [googleToken, setGoogleToken] = useState(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);

  const contentRef = useRef(null);
  const animRef = useRef(null);
  const posRef = useRef(0);
  const pollRef = useRef(null);
  const nowPlayingRef = useRef(null);
  const googleTokenRef = useRef(null);

  // Keep refs in sync
  useEffect(() => { nowPlayingRef.current = nowPlaying; }, [nowPlaying]);
  useEffect(() => { googleTokenRef.current = googleToken; }, [googleToken]);

  // Load Google script
  useEffect(() => {
    loadGoogleScript().then(() => setScriptReady(true)).catch(console.error);
    loadMammoth().catch(console.error);
    // Load persisted stage state
    sbFetch("/stage_state?id=eq.1&select=auto_scroll,scroll_speed")
      .then(state => {
        if (state && state.length > 0) {
          setAutoScroll(state[0].auto_scroll);
          setScrollSpeed(state[0].scroll_speed);
        }
      }).catch(console.error);
  }, []);

  // Sign in with Google
  const signIn = useCallback(() => {
    if (!scriptReady || !window.google) return;
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: DRIVE_SCOPE,
      callback: (response) => {
        if (response.error) { console.error("Google auth error:", response.error); return; }
        setGoogleToken(response.access_token);
        setNeedsAuth(false);
        // Fetch sheet for current song if one is playing
        if (nowPlayingRef.current) {
          fetchSheet(nowPlayingRef.current, response.access_token);
        }
      },
    });
    client.requestAccessToken();
  }, [scriptReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch docx from Drive and convert with mammoth
  const fetchSheet = useCallback(async (item, token) => {
    if (!item?.song_id) return;
    setSheetLoading(true);
    setSheetError(null);
    setSheetHtml(null);

    try {
      // Look up drive_file_id from songs table
      const songs = await sbFetch(`/songs?id=eq.${item.song_id}&select=drive_file_id`);
      if (!songs || songs.length === 0 || !songs[0].drive_file_id) {
        setSheetError("No chord sheet linked to this song.");
        setSheetLoading(false);
        return;
      }

      const fileId = songs[0].drive_file_id;
      const t = token || googleTokenRef.current;

      if (!t) { setNeedsAuth(true); setSheetLoading(false); return; }

      // Download the docx file
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: { Authorization: `Bearer ${t}` },
      });

      if (res.status === 401) { setNeedsAuth(true); setSheetLoading(false); return; }
      if (!res.ok) throw new Error(`Drive fetch failed: ${res.status}`);

      const arrayBuffer = await res.arrayBuffer();

      // Convert docx → HTML with mammoth
      const mammoth = await loadMammoth();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      setSheetHtml(result.value);

      // Reset scroll position
      posRef.current = 0;
      if (contentRef.current) contentRef.current.scrollTop = 0;

    } catch(e) {
      console.error("Sheet fetch error:", e);
      setSheetError(e.message);
    } finally {
      setSheetLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Poll Supabase for now-playing, next-up, and stage_state
  const loadState = useCallback(async () => {
    try {
      const evts = await sbFetch("/events?status=eq.active&order=created_at.desc&limit=1");
      if (!evts || evts.length === 0) { setNowPlaying(null); return; }
      const eventId = evts[0].id;

      const [playing, queued, stageState] = await Promise.all([
        sbFetch(`/queue?event_id=eq.${eventId}&status=eq.playing&order=created_at.desc&limit=1`),
        sbFetch(`/queue?event_id=eq.${eventId}&status=eq.queued&order=position.asc&limit=1`),
        sbFetch("/stage_state?id=eq.1&select=auto_scroll,scroll_speed"),
      ]);

      // Update stage state (autoscroll + speed from Prompter tab)
      if (stageState && stageState.length > 0) {
        setAutoScroll(stageState[0].auto_scroll);
        setScrollSpeed(stageState[0].scroll_speed);
      }

      setNextUp(queued && queued.length > 0 ? queued[0] : null);

      if (playing && playing.length > 0) {
        const item = playing[0];
        setNowPlaying(prev => {
          // Only fetch new sheet when song changes
          if (!prev || prev.id !== item.id) {
            fetchSheet(item, googleTokenRef.current);
          }
          return item;
        });
      } else {
        setNowPlaying(null);
        setSheetHtml(null);
        setSheetError(null);
      }
    } catch(e) { console.error(e); }
  }, [fetchSheet]);

  useEffect(() => {
    loadState();
    pollRef.current = setInterval(loadState, 3000);
    return () => clearInterval(pollRef.current);
  }, [loadState]);

  // Auto-scroll animation
  useEffect(() => {
    const tick = () => {
      if (autoScroll && contentRef.current && nowPlaying && !sheetLoading) {
        posRef.current += scrollSpeed / 800;
        contentRef.current.scrollTop = posRef.current;
      }
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [autoScroll, scrollSpeed, nowPlaying, sheetLoading]);

  const handleScroll = () => {
    if (contentRef.current) posRef.current = contentRef.current.scrollTop;
  };

  const updateStageSpeed = async (speed) => {
    const clamped = Math.max(5, Math.min(100, speed));
    setScrollSpeed(clamped);
    try {
      await sbFetch("/stage_state?id=eq.1", {
        method: "PATCH",
        body: JSON.stringify({ scroll_speed: clamped, updated_at: new Date().toISOString() }),
      });
    } catch(e) { console.error(e); }
  };

  const toggleStageAutoScroll = async () => {
    const next = !autoScroll;
    setAutoScroll(next);
    try {
      await sbFetch("/stage_state?id=eq.1", {
        method: "PATCH",
        body: JSON.stringify({ auto_scroll: next, updated_at: new Date().toISOString() }),
      });
    } catch(e) { console.error(e); }
  };


  if (!nowPlaying) {
    return (
      <>
        <style>{css}</style>
        <div style={{height:"100vh",background:"var(--stage-deeper)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:40,backgroundImage:"radial-gradient(ellipse at 50% 40%, rgba(100,60,200,.25) 0%, transparent 70%)"}}>
          <div style={{textAlign:"center"}}>
            <div style={{fontFamily:"var(--fd)",fontSize:"min(12vw,110px)",color:"var(--gold)",letterSpacing:6,lineHeight:1}}>PURPLE SANDWICH</div>
            <div style={{fontFamily:"var(--fd)",fontSize:"min(5vw,40px)",color:"rgba(245,200,66,.4)",letterSpacing:8,marginTop:6}}>LIVE BAND KARAOKE</div>
            <div style={{color:"rgba(255,255,255,.2)",fontSize:16,letterSpacing:4,marginTop:14,fontFamily:"var(--fd)"}}>WATKINS DRINKERY · 1712 S. 10TH ST.</div>
          </div>
          {nextUp && (
            <div style={{background:"rgba(245,200,66,.08)",border:"2px solid rgba(245,200,66,.3)",borderRadius:20,padding:"24px 56px",textAlign:"center"}}>
              <div style={{fontFamily:"var(--fd)",fontSize:13,color:"var(--gold2)",letterSpacing:5,marginBottom:8}}>UP NEXT</div>
              <div style={{fontFamily:"var(--fd)",fontSize:52,color:"white",letterSpacing:3}}>{nextUp.singer_name}</div>
              <div style={{color:"rgba(255,255,255,.5)",fontSize:20,marginTop:4}}>{nextUp.song_title} — {nextUp.song_artist}</div>
            </div>
          )}
          <div style={{color:"rgba(255,255,255,.15)",fontSize:14,letterSpacing:3,fontFamily:"var(--fd)"}}>WAITING FOR BAND…</div>

          {/* Auth button — subtle, bottom right */}
          {scriptReady && (
            <button onClick={signIn} style={{
              position:"fixed",bottom:20,right:20,
              background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.1)",
              borderRadius:8,color:"rgba(255,255,255,.3)",padding:"8px 14px",fontSize:12,cursor:"pointer"
            }}>
              {googleToken ? "✓ Drive connected" : "Connect Google Drive"}
            </button>
          )}
        </div>
      </>
    );
  }

  // ── NOW PLAYING SCREEN ──
  return (
    <>
      <style>{css}</style>
      <div style={{height:"100vh",background:"var(--stage-deeper)",display:"flex",flexDirection:"column",overflow:"hidden"}}>

        {/* Top bar */}
        <div style={{background:"linear-gradient(135deg,var(--stage-dark) 0%,var(--stage-deeper) 100%)",borderBottom:"3px solid var(--gold)",padding:"16px 56px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
          <div>
            <div style={{fontFamily:"var(--fd)",fontSize:52,color:"white",letterSpacing:2,lineHeight:1}}>{nowPlaying.song_title}</div>
            <div style={{color:"var(--gold)",fontSize:18,marginTop:3,letterSpacing:1}}>{nowPlaying.song_artist}</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontFamily:"var(--fd)",fontSize:40,color:"var(--gold)",letterSpacing:2}}>{nowPlaying.singer_name}</div>
            {autoScroll && <div style={{marginTop:4,fontSize:12,color:"rgba(255,255,255,.3)",fontFamily:"var(--fm)"}}>AUTO-SCROLL ON</div>}
          </div>
        </div>

        {/* Content area */}
        <div ref={contentRef} onScroll={handleScroll} style={{flex:1,overflowY:"scroll",padding:"48px 80px 300px"}}>

          {/* Needs auth */}
          {needsAuth && (
            <div style={{textAlign:"center",padding:"60px 24px"}}>
              <div style={{fontSize:40,marginBottom:16}}>🔑</div>
              <div style={{fontFamily:"var(--fd)",fontSize:24,color:"var(--gold)",letterSpacing:2,marginBottom:12}}>SIGN IN TO LOAD CHORD SHEET</div>
              <button onClick={signIn} style={{padding:"14px 32px",background:"var(--gold)",border:"none",borderRadius:10,color:"var(--stage-deeper)",fontFamily:"var(--fd)",fontSize:18,letterSpacing:2,cursor:"pointer"}}>
                CONNECT GOOGLE DRIVE
              </button>
            </div>
          )}

          {/* Loading */}
          {sheetLoading && !needsAuth && (
            <div style={{textAlign:"center",padding:"60px 24px",color:"rgba(255,255,255,.3)"}}>
              <div style={{fontFamily:"var(--fd)",fontSize:20,letterSpacing:3}}>LOADING CHORD SHEET…</div>
            </div>
          )}

          {/* Error */}
          {sheetError && !sheetLoading && (
            <div style={{textAlign:"center",padding:"60px 24px"}}>
              <div style={{color:"rgba(255,100,100,.7)",fontSize:16,marginBottom:12}}>{sheetError}</div>
              <button onClick={() => fetchSheet(nowPlaying, googleToken)} style={{padding:"10px 24px",background:"rgba(245,200,66,.1)",border:"1px solid rgba(245,200,66,.3)",borderRadius:8,color:"var(--gold)",fontSize:14,cursor:"pointer"}}>
                Retry
              </button>
            </div>
          )}

          {/* Lead sheet HTML */}
          {sheetHtml && !sheetLoading && (
            <div className="lead-sheet-content" dangerouslySetInnerHTML={{__html: sheetHtml}} />
          )}
        </div>

        {/* Floating scroll controls — bottom left, subtle */}
        <div style={{
          position:"fixed",bottom:nextUp?60:16,left:16,
          display:"flex",alignItems:"center",gap:8,
          background:"rgba(0,0,0,.6)",backdropFilter:"blur(8px)",
          border:"1px solid rgba(255,255,255,.1)",borderRadius:10,
          padding:"8px 12px",zIndex:100
        }}>
          <button onClick={toggleStageAutoScroll} style={{
            background:autoScroll?"var(--gold)":"rgba(255,255,255,.1)",
            border:"none",borderRadius:6,color:autoScroll?"var(--stage-deeper)":"white",
            padding:"4px 10px",fontSize:12,cursor:"pointer",fontFamily:"var(--fd)",letterSpacing:1
          }}>{autoScroll?"⏸ PAUSE":"▶ AUTO"}</button>
          <div style={{width:1,height:20,background:"rgba(255,255,255,.15)"}} />
          <button onClick={()=>updateStageSpeed(scrollSpeed-5)} style={{width:26,height:26,borderRadius:5,border:"none",background:"rgba(255,255,255,.1)",color:"white",fontSize:14,cursor:"pointer"}}>−</button>
          <span style={{fontFamily:"var(--fm)",fontSize:12,color:"rgba(255,255,255,.5)",minWidth:20,textAlign:"center"}}>{scrollSpeed}</span>
          <button onClick={()=>updateStageSpeed(scrollSpeed+5)} style={{width:26,height:26,borderRadius:5,border:"none",background:"rgba(255,255,255,.1)",color:"white",fontSize:14,cursor:"pointer"}}>+</button>
        </div>

        {/* Up next footer */}
        {nextUp && (
          <div style={{background:"rgba(14,8,37,.97)",borderTop:"1px solid rgba(245,200,66,.2)",padding:"14px 56px",display:"flex",alignItems:"center",gap:16,flexShrink:0}}>
            <span style={{fontFamily:"var(--fd)",fontSize:12,color:"var(--gold2)",letterSpacing:4}}>UP NEXT</span>
            <span style={{color:"rgba(255,255,255,.7)",fontSize:15,fontWeight:600}}>{nextUp.singer_name}</span>
            <span style={{color:"rgba(255,255,255,.2)"}}>—</span>
            <span style={{color:"rgba(255,255,255,.5)",fontSize:15}}>{nextUp.song_title}</span>
            <span style={{color:"rgba(255,255,255,.2)"}}>·</span>
            <span style={{color:"rgba(255,255,255,.3)",fontSize:14}}>{nextUp.song_artist}</span>
          </div>
        )}
      </div>
    </>
  );
}
