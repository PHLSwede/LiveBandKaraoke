import { SONG_CONTENT } from "./songs";
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



// ─── TRANSPOSE ────────────────────────────────────────────────────────────────
const NOTES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const ENH = {Db:"C#",Eb:"D#",Gb:"F#",Ab:"G#",Bb:"A#"};
function transposeNote(note, n) { const r=ENH[note]||note; const i=NOTES.indexOf(r); return i===-1?note:NOTES[(i+n+12)%12]; }
function transposeChord(chord, n) { return chord.replace(/^([A-G][b#]?)(.*)$/, (_,root,suf) => transposeNote(root,n)+suf); }
function transposeLine(line, n) {
  if (n===0) return line;
  return line.replace(/\b([A-G][b#]?(?:maj|min|m|dim|aug|sus[24]?|add\d|[0-9])*(?:\/[A-G][b#]?)?)/g, c => transposeChord(c,n));
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=IBM+Plex+Mono:wght@400;700&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,500;0,9..40,700&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  :root{
    --stage-deeper:#0e0825; --stage-dark:#1a0f40;
    --gold:#f5c842; --gold2:#c9a020;
    --fd:'Bebas Neue',sans-serif; --fb:'DM Sans',sans-serif; --fm:'IBM Plex Mono',monospace;
  }
  html,body{height:100%;overflow:hidden;}
  body{font-family:var(--fb);background:var(--stage-deeper);color:white;}
`;

export default function StageDisplay() {
  const [nowPlaying, setNowPlaying] = useState(null);
  const [nextUp, setNextUp] = useState(null);
  const [transpose] = useState(0); // eslint-disable-line no-unused-vars
  const [autoScroll, setAutoScroll] = useState(false); // eslint-disable-line no-unused-vars
  const [scrollSpeed, setScrollSpeed] = useState(35); // eslint-disable-line no-unused-vars
  const contentRef = useRef(null);
  const animRef = useRef(null);
  const posRef = useRef(0);
  const pollRef = useRef(null);

  // Poll for now-playing state from Supabase
  const loadState = async () => {
    try {
      // Get active event
      const evts = await sbFetch("/events?status=eq.active&order=created_at.desc&limit=1");
      if (!evts || evts.length === 0) { setNowPlaying(null); return; }
      const eventId = evts[0].id;
      // Get playing item
      const playing = await sbFetch(`/queue?event_id=eq.${eventId}&status=eq.playing&order=created_at.desc&limit=1`);
      if (playing && playing.length > 0) {
        setNowPlaying(p => {
          if (!p || p.id !== playing[0].id) {
            posRef.current = 0;
            if (contentRef.current) contentRef.current.scrollTop = 0;
          }
          return playing[0];
        });
      } else {
        setNowPlaying(null);
      }
      // Get next queued
      const queued = await sbFetch(`/queue?event_id=eq.${eventId}&status=eq.queued&order=position.asc&limit=1`);
      setNextUp(queued && queued.length > 0 ? queued[0] : null);
      // Get transpose from stage_state table if exists, else use local
    } catch(e) { console.error(e); }
  };

  useEffect(() => {
    loadState();
    pollRef.current = setInterval(loadState, 3000);
    return () => clearInterval(pollRef.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll loop
  useEffect(() => {
    const tick = () => {
      if (autoScroll && contentRef.current && nowPlaying) {
        posRef.current += scrollSpeed / 800;
        contentRef.current.scrollTop = posRef.current;
      }
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [autoScroll, scrollSpeed, nowPlaying]);

  // Sync scroll position ref when user manually scrolls
  const handleScroll = () => {
    if (contentRef.current) posRef.current = contentRef.current.scrollTop;
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
        </div>
      </>
    );
  }

  const content = SONG_CONTENT[nowPlaying.song_id] || "Chord sheet not available.";
  const displayKey = transposeNote(nowPlaying.song_key.replace(/m(aj)?$/,''), transpose) + (nowPlaying.song_key.match(/m(?!aj)/) ? 'm' : '');

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
            <div style={{color:"rgba(255,255,255,.3)",fontSize:14,marginTop:2,fontFamily:"var(--fm)"}}>KEY: {displayKey}</div>
          </div>
        </div>

        {/* Scrollable content — natural scroll, keyboard + mouse */}
        <div
          ref={contentRef}
          onScroll={handleScroll}
          style={{flex:1,overflowY:"scroll",padding:"52px 80px 300px"}}
        >
          {content.split('\n').map((rawLine, i) => {
            const line = transposeLine(rawLine, transpose);
            const isSection = /^\[.+\]$/.test(line.trim());
            const isChord = !isSection && line.trim().length > 0 && line.trim().length < 60 && /^[A-G][b#]?/.test(line.trim()) && !/[a-z]{4,}/.test(line);
            const isEmpty = line.trim() === '';
            return (
              <div key={i} style={{
                fontFamily:isSection?"var(--fd)":isChord?"var(--fm)":"var(--fb)",
                fontSize:isSection?24:isChord?30:38,
                color:isSection?"var(--gold)":isChord?"#7dd3f5":"white",
                letterSpacing:isSection?4:isChord?2:0.5,
                fontWeight:isChord?700:isSection?400:300,
                lineHeight:isSection?1:1.9,
                marginTop:isSection?32:isEmpty?16:0,
                marginBottom:isSection?10:0,
                minHeight:isEmpty?24:undefined,
              }}>{line||'\u00A0'}</div>
            );
          })}
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
