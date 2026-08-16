import { useState, useEffect, useRef } from "react";

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_KEY;
const SINGER_URL = "purplesandwich.band/sing";
const VENMO_URL = "venmo.com/Dante-Lammendola";

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

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,500;0,9..40,700&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  :root{
    --deep:#0e0825; --stage-dark:#1a0f40; --purple:#2d1b69;
    --gold:#f5c842; --gold2:#c9a020; --green:#27ae60;
    --fd:'Bebas Neue',sans-serif; --fb:'DM Sans',sans-serif;
  }
  html,body{height:100%;width:100%;overflow:hidden;background:var(--deep);}
  body{font-family:var(--fb);color:white;}
  @keyframes fadeIn{from{opacity:0;transform:scale(0.97)}to{opacity:1;transform:scale(1)}}
  .panel{animation:fadeIn .6s ease forwards;}
  @keyframes progressBar{from{width:0%}to{width:100%}}
  @keyframes pulse-gold{0%{box-shadow:0 0 0 0 rgba(245,200,66,.5)}70%{box-shadow:0 0 0 30px rgba(245,200,66,0)}100%{box-shadow:0 0 0 0 rgba(245,200,66,0)}}
  .pulse-gold{animation:pulse-gold 2s ease infinite;}
  @keyframes pulse-green{0%{box-shadow:0 0 0 0 rgba(39,174,96,.5)}70%{box-shadow:0 0 0 30px rgba(39,174,96,0)}100%{box-shadow:0 0 0 0 rgba(39,174,96,0)}}
  .pulse-green{animation:pulse-green 1.5s ease infinite;}
`;

// ─── QR CODE (generated via Google Charts API) ────────────────────────────────
function QRCode({ url, size = 200 }) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=https://${url}&color=f5c842&bgcolor=0e0825&qzone=2`;
  return (
    <img src={qrUrl} alt="QR Code" style={{width:size,height:size,borderRadius:16,display:"block"}} />
  );
}

// ─── PANEL: NOW PLAYING ───────────────────────────────────────────────────────
function NowPlayingPanel({ nowPlaying }) {
  return (
    <div className="panel" style={{height:"100%",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"60px 48px",background:`radial-gradient(ellipse at 50% 30%, rgba(39,174,96,.2) 0%, var(--deep) 65%)`}}>
      <div style={{fontFamily:"var(--fd)",fontSize:18,color:"var(--green)",letterSpacing:6,marginBottom:24}}>NOW SINGING</div>

      {/* Singer name */}
      <div className="pulse-green" style={{
        background:"rgba(39,174,96,.1)",border:"3px solid var(--green)",
        borderRadius:24,padding:"28px 56px",textAlign:"center",marginBottom:36,width:"100%"
      }}>
        <div style={{fontFamily:"var(--fd)",fontSize:"clamp(60px, 8vw, 90px)",color:"white",letterSpacing:3,lineHeight:1}}>
          {nowPlaying.singer_name}
        </div>
      </div>

      {/* Song info */}
      <div style={{textAlign:"center",marginBottom:16}}>
        <div style={{fontFamily:"var(--fd)",fontSize:52,color:"var(--gold)",letterSpacing:2,lineHeight:1}}>
          {nowPlaying.song_title}
        </div>
        <div style={{color:"rgba(255,255,255,.5)",fontSize:22,marginTop:8}}>
          {nowPlaying.song_artist}
        </div>
      </div>

      {/* Mic icon */}
      <div style={{fontSize:64,marginTop:24,lineHeight:1}}>🎤</div>

      <div style={{marginTop:32,fontFamily:"var(--fd)",fontSize:14,color:"rgba(255,255,255,.2)",letterSpacing:4}}>
        PURPLE SANDWICH · LIVE BAND KARAOKE
      </div>
    </div>
  );
}

// ─── PANEL: QUEUE ─────────────────────────────────────────────────────────────
function QueuePanel({ queue, nowPlaying }) {
  const upNext = queue.slice(0, 6);
  return (
    <div className="panel" style={{height:"100%",display:"flex",flexDirection:"column",padding:"48px",background:`radial-gradient(ellipse at 50% 20%, rgba(45,27,105,.4) 0%, var(--deep) 60%)`}}>
      <div style={{fontFamily:"var(--fd)",fontSize:18,color:"var(--gold)",letterSpacing:6,marginBottom:32,textAlign:"center"}}>UP NEXT</div>

      {upNext.length === 0 ? (
        <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16}}>
          <div style={{fontSize:56}}>🎵</div>
          <div style={{fontFamily:"var(--fd)",fontSize:24,color:"rgba(255,255,255,.3)",letterSpacing:3}}>QUEUE IS EMPTY</div>
          <div style={{fontFamily:"var(--fd)",fontSize:14,color:"rgba(255,255,255,.2)",letterSpacing:2}}>SCAN QR CODE TO REQUEST A SONG</div>
        </div>
      ) : (
        <div style={{flex:1,display:"flex",flexDirection:"column",gap:12}}>
          {upNext.map((item, i) => (
            <div key={item.id} style={{
              display:"flex",alignItems:"center",gap:20,
              padding:"16px 20px",
              background: i === 0 ? "rgba(245,200,66,.1)" : "rgba(255,255,255,.04)",
              border: `2px solid ${i === 0 ? "rgba(245,200,66,.4)" : "rgba(255,255,255,.07)"}`,
              borderRadius:14,
            }}>
              <span style={{
                fontFamily:"var(--fd)",fontSize:36,
                color: i === 0 ? "var(--gold)" : "rgba(255,255,255,.2)",
                width:36,textAlign:"center",flexShrink:0
              }}>{i + 1}</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,fontSize:20,color:"white",lineHeight:1.2}}>{item.singer_name}</div>
                <div style={{color:"rgba(255,255,255,.45)",fontSize:15,marginTop:3}}>{item.song_title} · {item.song_artist}</div>
              </div>
              {i === 0 && <div style={{fontFamily:"var(--fd)",fontSize:13,color:"var(--gold)",letterSpacing:2,flexShrink:0}}>UP NEXT</div>}
            </div>
          ))}
        </div>
      )}

      <div style={{marginTop:24,textAlign:"center",fontFamily:"var(--fd)",fontSize:13,color:"rgba(255,255,255,.2)",letterSpacing:3}}>
        PURPLE SANDWICH · LIVE BAND KARAOKE
      </div>
    </div>
  );
}

// ─── PANEL: QR CODE ───────────────────────────────────────────────────────────
function QRPanel({ eventName }) {
  return (
    <div className="panel" style={{height:"100%",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"40px",background:`radial-gradient(ellipse at 50% 40%, rgba(45,27,105,.5) 0%, var(--deep) 65%)`}}>

      <div style={{display:"flex",gap:48,alignItems:"flex-start",marginBottom:28}}>

        {/* Request QR */}
        <div style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
          <div style={{fontFamily:"var(--fd)",fontSize:15,color:"var(--gold)",letterSpacing:4,marginBottom:16}}>WANT TO SING?</div>
          <div className="pulse-gold" style={{
            background:"rgba(245,200,66,.06)",border:"3px solid var(--gold)",
            borderRadius:20,padding:20
          }}>
            <QRCode url={SINGER_URL} size={180} />
          </div>
          <div style={{fontFamily:"var(--fd)",fontSize:18,color:"white",letterSpacing:2,textAlign:"center",marginTop:14}}>REQUEST A SONG</div>
        </div>

        {/* Tip QR */}
        <div style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
          <div style={{fontFamily:"var(--fd)",fontSize:15,color:"#5fb3ea",letterSpacing:4,marginBottom:16}}>ENJOYING THE SHOW?</div>
          <div style={{
            background:"rgba(61,157,224,.06)",border:"3px solid #5fb3ea",
            borderRadius:20,padding:20
          }}>
            <QRCode url={VENMO_URL} size={180} />
          </div>
          <div style={{fontFamily:"var(--fd)",fontSize:18,color:"white",letterSpacing:2,textAlign:"center",marginTop:14}}>TIP THE BAND</div>
        </div>

      </div>

      {/* Branding */}
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <span style={{fontSize:28}}>🥪</span>
        <div>
          <div style={{fontFamily:"var(--fd)",fontSize:22,color:"var(--gold)",letterSpacing:3,lineHeight:1}}>PURPLE SANDWICH</div>
          <div style={{fontFamily:"var(--fd)",fontSize:11,color:"rgba(245,200,66,.4)",letterSpacing:4}}>LIVE BAND KARAOKE</div>
        </div>
      </div>
    </div>
  );
}

// ─── PANEL: BRANDING / EVENT ──────────────────────────────────────────────────
function BrandingPanel({ event }) {
  return (
    <div className="panel" style={{height:"100%",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"48px",background:`radial-gradient(ellipse at 50% 40%, rgba(45,27,105,.6) 0%, var(--deep) 60%)`}}>
      {/* Big logo */}
      <div style={{textAlign:"center",marginBottom:40}}>
        <div style={{fontSize:72,marginBottom:16,lineHeight:1}}>🥪</div>
        <div style={{fontFamily:"var(--fd)",fontSize:"clamp(56px, 7vw, 80px)",color:"var(--gold)",letterSpacing:6,lineHeight:0.95}}>PURPLE</div>
        <div style={{fontFamily:"var(--fd)",fontSize:"clamp(56px, 7vw, 80px)",color:"var(--gold)",letterSpacing:6,lineHeight:0.95}}>SANDWICH</div>
        <div style={{fontFamily:"var(--fd)",fontSize:16,color:"rgba(245,200,66,.4)",letterSpacing:8,marginTop:8}}>LIVE BAND KARAOKE</div>
      </div>

      {/* Event info */}
      {event && (
        <div style={{
          background:"rgba(245,200,66,.07)",border:"2px solid rgba(245,200,66,.25)",
          borderRadius:20,padding:"24px 40px",textAlign:"center",width:"100%"
        }}>
          <div style={{fontFamily:"var(--fd)",fontSize:28,color:"white",letterSpacing:2,lineHeight:1.2}}>{event.name}</div>
          <div style={{color:"rgba(255,255,255,.45)",fontSize:16,marginTop:8}}>{event.venue}</div>
          <div style={{color:"rgba(255,255,255,.3)",fontSize:14,marginTop:4,fontFamily:"var(--fd)",letterSpacing:2}}>
            {new Date(event.date + 'T12:00:00').toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PROGRESS BAR ─────────────────────────────────────────────────────────────
function ProgressBar({ duration, panelKey }) {
  return (
    <div style={{position:"absolute",bottom:0,left:0,right:0,height:4,background:"rgba(255,255,255,.06)"}}>
      <div key={panelKey} style={{
        height:"100%",background:"var(--gold)",borderRadius:2,
        animation:`progressBar ${duration}ms linear forwards`
      }} />
    </div>
  );
}

// ─── DOTS INDICATOR ───────────────────────────────────────────────────────────
function DotsIndicator({ total, current }) {
  return (
    <div style={{position:"absolute",bottom:16,left:"50%",transform:"translateX(-50%)",display:"flex",gap:8,zIndex:10}}>
      {Array.from({length:total}).map((_,i) => (
        <div key={i} style={{
          width: i === current ? 24 : 8,
          height:8,borderRadius:4,
          background: i === current ? "var(--gold)" : "rgba(255,255,255,.2)",
          transition:"all .4s ease"
        }} />
      ))}
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function QueueBoard() {
  const [nowPlaying, setNowPlaying] = useState(null);
  const [queue, setQueue] = useState([]);
  const [event, setEvent] = useState(null);
  const [panelIdx, setPanelIdx] = useState(0);
  const timerRef = useRef(null);
  const DURATION = 10000; // 10 seconds per panel

  // Load data from Supabase
  const loadData = async () => {
    try {
      const evts = await sbFetch("/events?status=eq.active&order=created_at.desc&limit=1");
      const evt = evts && evts.length > 0 ? evts[0] : null;
      setEvent(evt);
      if (!evt) { setNowPlaying(null); setQueue([]); return; }
      const [playing, queued] = await Promise.all([
        sbFetch(`/queue?event_id=eq.${evt.id}&status=eq.playing&limit=1`),
        sbFetch(`/queue?event_id=eq.${evt.id}&status=eq.queued&order=position.asc&limit=6`),
      ]);
      setNowPlaying(playing && playing.length > 0 ? playing[0] : null);
      setQueue(queued || []);
    } catch(e) { console.error(e); }
  };

  useEffect(() => {
    loadData();
    const poll = setInterval(loadData, 5000);
    return () => clearInterval(poll);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Build panel sequence based on mode
  const panels = nowPlaying
    ? ["nowplaying", "queue", "qr"]        // Mode 1: song playing
    : ["queue", "qr", "branding"];          // Mode 2: nothing playing

  // Auto-rotate panels
  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setPanelIdx(i => (i + 1) % panels.length);
    }, DURATION);
    return () => clearTimeout(timerRef.current);
  }, [panelIdx, panels.length]);

  // Reset to first panel when mode changes
  const prevMode = useRef(!!nowPlaying);
  useEffect(() => {
    const isPlaying = !!nowPlaying;
    if (isPlaying !== prevMode.current) {
      prevMode.current = isPlaying;
      setPanelIdx(0);
    }
  }, [nowPlaying]);

  const currentPanel = panels[panelIdx % panels.length];

  return (
    <>
      <style>{css}</style>
      <div style={{width:"100vw",height:"100vh",background:"var(--deep)",position:"relative",overflow:"hidden"}}>

        {/* Panel content */}
        {currentPanel === "nowplaying" && <NowPlayingPanel nowPlaying={nowPlaying} />}
        {currentPanel === "queue" && <QueuePanel queue={queue} nowPlaying={nowPlaying} />}
        {currentPanel === "qr" && <QRPanel eventName={event?.name} />}
        {currentPanel === "branding" && <BrandingPanel event={event} />}

        {/* Progress bar */}
        <ProgressBar duration={DURATION} panelKey={`${currentPanel}-${panelIdx}`} />

        {/* Dots */}
        <DotsIndicator total={panels.length} current={panelIdx % panels.length} />
      </div>
    </>
  );
}

