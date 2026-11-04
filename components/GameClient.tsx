"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { InputController } from "@/lib/InputController";
import MultiplayerSync from "@/lib/MultiplayerSync";
import {enableSound,sound,suspendSound,setMuted} from "@/lib/sound";
const LobbyVista=dynamic(()=>import("./LobbyVista"),{ssr:false});
import { INTERACTION_RANGE } from "@/lib/world";

const GameScene = dynamic(() => import("./GameScene"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 grid place-items-center text-lg font-bold text-cyan-100">Building the North Pole…</div>
});

/** No fixed joystick: touch anywhere in the lower-left zone to spawn one under your finger. */
function FloatingJoystick({ input }: { input: InputController }) {
  const [stick, setStick] = useState<{x:number;y:number;dx:number;dy:number}|null>(null);
  const active = useRef<{id:number;x:number;y:number}|null>(null);
  const setFrom = (x:number,y:number) => {
    if(!active.current)return;
    const dx=x-active.current.x, dy=y-active.current.y;
    const distance=Math.max(1,Math.hypot(dx,dy));
    const radius=45;
    const nx=dx/Math.max(radius,distance);
    const ny=dy/Math.max(radius,distance);
    const length=Math.max(1,Math.hypot(nx,ny));
    input.joystickX=nx/length;
    input.joystickY=ny/length;
    const clamp=Math.min(1,radius/distance);
    setStick({x:active.current.x,y:active.current.y,dx:dx*clamp,dy:dy*clamp});
  };
  const end=(e:ReactPointerEvent<HTMLDivElement>)=>{
    if(e.pointerId!==active.current?.id)return;
    active.current=null;input.joystickX=0;input.joystickY=0;setStick(null);
  };
  return <div aria-label="Touch lower-left area to move" className="pointer-events-auto absolute bottom-0 left-0 z-20 h-[55%] w-[55%]" style={{touchAction:"none"}}
    onPointerDown={e=>{if(active.current)return;active.current={id:e.pointerId,x:e.clientX,y:e.clientY};e.currentTarget.setPointerCapture(e.pointerId);setFrom(e.clientX,e.clientY);}}
    onPointerMove={e=>{if(e.pointerId===active.current?.id)setFrom(e.clientX,e.clientY)}} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end}>
    {!stick?<div className="pointer-events-none absolute bottom-[max(1.75rem,env(safe-area-inset-bottom))] left-5 flex items-center gap-2 rounded-full border border-white/10 bg-[#051927]/50 px-3 py-2 text-[10px] font-bold tracking-wide text-white/60 backdrop-blur-lg"><span className="text-lg">◎</span> TOUCH TO MOVE</div>:
    <div className="pointer-events-none fixed z-30 flex h-[112px] w-[112px] items-center justify-center rounded-full border border-[#f4dfb6]/55 bg-[#0a2834]/35 shadow-[0_0_30px_#a9d8e933] backdrop-blur-[2px]" style={{left:stick.x,top:stick.y,transform:"translate(-50%,-50%)"}}>
      <div className="absolute inset-3 rounded-full border border-dashed border-white/25"/>
      <div className="h-12 w-12 rounded-full border border-white/80 bg-[#e7f2e9]/65 shadow-[0_0_23px_#efffff88]" style={{transform:`translate(${stick.dx}px,${stick.dy}px)`}}/>
    </div>}
  </div>;
}

function TouchCamera({ input }: { input: InputController }) {
  const active=useRef<{id:number;x:number;y:number}|null>(null);
  const end=(e:ReactPointerEvent<HTMLDivElement>)=>{if(active.current?.id===e.pointerId)active.current=null};
  return <div aria-label="Drag right side to aim camera" className="pointer-events-auto absolute bottom-0 right-0 top-[18%] z-10 w-[55%]" style={{touchAction:"none"}}
    onPointerDown={e=>{if(active.current)return;active.current={id:e.pointerId,x:e.clientX,y:e.clientY};e.currentTarget.setPointerCapture(e.pointerId)}}
    onPointerMove={e=>{if(e.pointerId!==active.current?.id)return;input.pan(e.clientX-active.current.x,e.clientY-active.current.y);active.current.x=e.clientX;active.current.y=e.clientY;}}
    onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end}/>;
}

export default function GameClient() {
  const sync = useMemo(() => new MultiplayerSync(), []);
  const input = useMemo(() => new InputController(), []);
  const hud = useSyncExternalStore(sync.subscribe, sync.getSnapshot, sync.getSnapshot);
  const [graphics,setGraphics]=useState<boolean|null>(null);
  const [started, setStarted] = useState(false);
  const [name, setName] = useState("Scout");
  const [roomCode, setRoomCode] = useState("north-pole");
  const [isTouch, setIsTouch] = useState(false);
  const fireFinger=useRef<{x:number;y:number}|null>(null);
  const [copied, setCopied] = useState(false);
  const [lookLocked, setLookLocked] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [damageFlash, setDamageFlash] = useState(false);
  const [hitText, setHitText] = useState("");

  useEffect(() => {
    const probe=document.createElement("canvas").getContext("webgl2");
    setGraphics(Boolean(probe));probe?.getExtension("WEBGL_lose_context")?.loseContext();
    const params = new URLSearchParams(window.location.search);
    setRoomCode((params.get("room") || "north-pole").replace(/[^a-z0-9-]/gi, "").slice(0, 24) || "north-pole");
    setName(localStorage.getItem("rescue-santa-name") || "Scout");
    setIsTouch(window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0);
    return () => { sync.disconnect(); };
  }, [sync]);

  const start = useCallback(() => {
    const cleanRoom = roomCode.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 24) || "north-pole";
    const cleanName = name.trim().slice(0, 18) || "Scout";
    localStorage.setItem("rescue-santa-name", cleanName);
    window.history.replaceState(null, "", `?room=${encodeURIComponent(cleanRoom)}`);
    input.reset();
    if(!graphics)return;
    enableSound();
    if(window.matchMedia("(pointer:coarse)").matches){
      const root=document.documentElement;
      const lock=()=>{const o=screen.orientation as ScreenOrientation & {lock?:(v:string)=>Promise<void>};void o?.lock?.("landscape").catch(()=>{});};
      if(root.requestFullscreen)void root.requestFullscreen().then(lock).catch(()=>{});else lock();
    }
    sync.connect(cleanRoom, cleanName);
    setStarted(true);
  }, [input, sync, roomCode, name,graphics]);

  const exit = useCallback(() => {
    input.reset();
    sync.send({ type: "interact", held: false });
    sync.disconnect();
    if (document.pointerLockElement) document.exitPointerLock();
    suspendSound();if(document.fullscreenElement)void document.exitFullscreen().catch(()=>{});
    setStarted(false);
  }, [input, sync]);

  useEffect(() => {
    if (!started) return;
    const keydown = (e: KeyboardEvent) => {
      if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
      if(menuOpen || (e.target instanceof HTMLInputElement))return;
      if(e.code==="KeyF")input.firing=true;
      if (e.repeat && ["Space", "KeyE"].includes(e.code)) return;
      input.keys.add(e.code);
      if (e.code === "Space") input.jump();
      if (e.code === "KeyE" && !input.interacting) {
        input.interacting = true;
        sync.send({ type: "interact", held: true });
      }
    };
    const keyup = (e: KeyboardEvent) => {
      input.keys.delete(e.code);if(e.code==="KeyF")input.firing=false;
      if (e.code === "KeyE") {
        input.interacting = false;
        sync.send({ type: "interact", held: false });
      }
    };
    const mouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement) input.pan(e.movementX, e.movementY);
    };
    const pointerDown = (e: PointerEvent) => {
      if(menuOpen)return;
      if (!(e.target instanceof HTMLCanvasElement) || e.button !== 0 || isTouch) return;
      if (!document.pointerLockElement) {try{void e.target.requestPointerLock?.()?.catch(()=>{});}catch{}}
      input.firing=true;input.throw();
    };
    const releaseFire=()=>{input.firing=false;};
    const lockchange = () => {setLookLocked(Boolean(document.pointerLockElement));if(!document.pointerLockElement)input.release();};
    const loseFocus = () => {
      input.release();
      sync.send({ type: "interact", held: false });
    };
    document.addEventListener("pointerlockchange", lockchange);
    window.addEventListener("keydown", keydown);
    window.addEventListener("keyup", keyup);
    window.addEventListener("mousemove", mouseMove);
    window.addEventListener("pointerdown", pointerDown);
    window.addEventListener("blur", loseFocus);window.addEventListener("pointerup",releaseFire);
    const visibility=()=>{if(document.hidden){loseFocus();suspendSound();}else enableSound();};document.addEventListener("visibilitychange",visibility);
    return () => {
      document.removeEventListener("pointerlockchange", lockchange);
      window.removeEventListener("keydown", keydown);
      window.removeEventListener("keyup", keyup);
      window.removeEventListener("mousemove", mouseMove);
      window.removeEventListener("pointerdown", pointerDown);
      window.removeEventListener("blur", loseFocus);window.removeEventListener("pointerup",releaseFire);document.removeEventListener("visibilitychange",visibility);
    };
  }, [input, sync, started, isTouch,menuOpen]);

  useEffect(() => sync.onEvent((event) => {
    if(event.type==="playerHit" && event.id===sync.myId){
      setHitText(event.health===0?"YOU WERE DEFEATED":"-"+event.damage+" HEALTH");
      setDamageFlash(true);setTimeout(()=>setDamageFlash(false),450);
    } else if(event.type==="enemyHit" && event.playerId===sync.myId){
      sound("hit");setHitText(event.health===0?"SNOWMAN DEFEATED":"DIRECT HIT!");
    }
  }),[sync]);

  const [silent,setSilent]=useState(false);
  const lastWin=useRef(-1);
  useEffect(()=>{if(hud.round.status==="rescued" && lastWin.current!==hud.round.round){lastWin.current=hud.round.round;sound("clear");}},[hud.round]);
  useEffect(()=>{if(!hitText)return;const id=setTimeout(()=>setHitText(""),1150);return ()=>clearTimeout(id);},[hitText]);
  const invite = async () => {
    const url = `${window.location.origin}/?room=${encodeURIComponent(hud.room)}`;
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { window.prompt("Share this room link:", url); }
  };
  const distanceToSanta = hud.me ? Math.hypot(hud.me.x, hud.me.z) : Infinity;
  const deadUntil = hud.me?.deadUntil ?? 0;
  const isDead = deadUntil > sync.serverNow();
  const health = Math.max(0, hud.me?.health ?? 100);
  const canInteract = !isDead && distanceToSanta <= INTERACTION_RANGE && hud.round.status === "playing";
  const isStunned = Boolean(hud.me && hud.me.stunnedUntil > sync.serverNow());
  const winner = hud.roster.find((p) => p.id === hud.round.winner);

  return (
    <main className="game-root overflow-hidden bg-[#081a23] text-white" style={{touchAction:"none"}}>
      {!started ? (
        <div className="lobby">
          {graphics && <LobbyVista/>}<div className="shade"/>
          <header className="mast"><i/> NORTH POLE RESCUE SERVICE <span>FIELD OPERATIONS &nbsp;/&nbsp; 01</span></header>
          <section className="brief">
            <p className="kicker">MULTIPLAYER EXPEDITION &nbsp; / &nbsp; 01</p>
            <h1>Rescue<br/><em>Santa.</em></h1>
            <p className="story">The workshop has gone quiet. Fight through the snowmen and free Santa from the ice.</p>
            <form onSubmit={e=>{e.preventDefault();start()}}>
              <div className="fields"><label>CALLSIGN<input value={name} maxLength={18} onChange={e=>setName(e.target.value)} autoComplete="nickname"/></label>
              <label>ROOM CODE<input value={roomCode} maxLength={24} onChange={e=>setRoomCode(e.target.value)} autoCapitalize="none" spellCheck={false}/></label></div>
              <button className="deploy" disabled={graphics!==true}>Join expedition <span>↗</span></button>
            </form>
            {graphics===false&&<p role="status" className="graphics-note">3D play needs WebGL 2. Open this link in Safari or Chrome with graphics acceleration enabled.</p>}
          </section>
          <footer className="folio"><span>90° N &nbsp; / &nbsp; ARCTIC CIRCLE</span><a href="/credits.txt" target="_blank" rel="noreferrer">ASSET CREDITS</a></footer>
        </div>
      ) : <>
        <GameScene sync={sync} input={input} lowPower={isTouch}/>
        <div className="reticle" aria-hidden="true"/>
        {isTouch && <>
          <TouchCamera input={input}/><FloatingJoystick input={input}/>
          <div className="pointer-events-auto absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-3 z-40 flex flex-col items-end gap-3">
            {canInteract && <button onPointerDown={e=>{e.preventDefault();input.interacting=true;e.currentTarget.setPointerCapture(e.pointerId);sync.send({type:"interact",held:true})}}
              onPointerUp={()=>{input.interacting=false;sync.send({type:"interact",held:false})}}
              onPointerCancel={()=>{input.interacting=false;sync.send({type:"interact",held:false})}}
              onLostPointerCapture={()=>{if(input.interacting){input.interacting=false;sync.send({type:"interact",held:false})}}}
              className="h-[52px] rounded-full border border-[#fce6ab] bg-[#bd7633]/95 px-5 text-[12px] font-black tracking-wide shadow-xl active:scale-95">✦ HOLD TO RESCUE</button>}
            <div className="flex gap-2.5">
              <button aria-label="Jump" onPointerDown={e=>{e.preventDefault();input.jump()}}
                className="grid h-[64px] w-[64px] place-content-center rounded-full border border-white/35 bg-[#0a2939]/85 shadow-lg backdrop-blur-lg active:scale-95"><span className="text-[24px] leading-6">↑</span><span className="text-[9px] font-black tracking-widest">JUMP</span></button>
              <button aria-label="Throw snowball" onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);input.firing=true;input.throw();fireFinger.current={x:e.clientX,y:e.clientY}}} onPointerMove={e=>{const f=fireFinger.current;if(input.firing&&f&&e.currentTarget.hasPointerCapture(e.pointerId)){input.pan(e.clientX-f.x,e.clientY-f.y);f.x=e.clientX;f.y=e.clientY;}}} onPointerUp={()=>input.firing=false} onLostPointerCapture={()=>input.firing=false} onPointerCancel={()=>input.firing=false}
                className="grid h-[75px] w-[75px] place-content-center rounded-full border border-[#fce0a5]/65 bg-[#174457]/95 shadow-[0_4px_28px_#f6dfa845] backdrop-blur-lg active:scale-95"><span className="text-[29px] leading-7">❄</span><span className="text-[10px] font-black tracking-wide">THROW</span></button>
            </div>
          </div>
        </>}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex justify-between gap-2 px-3 pt-[max(1.0rem,env(safe-area-inset-top))]">
          <section className="max-w-[68%] rounded-2xl border border-white/15 bg-[#081f2d]/80 p-3 shadow-lg backdrop-blur-lg">
            <div className="text-[12px] font-black tracking-widest">✦ RESCUE SANTA</div>
            <div className="mt-1 flex items-center gap-1.5 text-[10px] font-bold text-white/70"><span className={hud.status==="online"?"text-emerald-300":"text-amber-300"}>●</span>{hud.status.toUpperCase()} · R{hud.round.round} · {hud.roster.length}/12</div>
            <div className="mt-2 flex items-center gap-1.5"><div className="h-[6px] w-[95px] overflow-hidden rounded-full bg-[#a51f34]/40 sm:w-[150px]"><div className="h-full rounded-full bg-gradient-to-r from-red-600 via-red-400 to-lime-300 transition-[width]" style={{width:`${health}%`}}/></div><span className="text-[10px] font-black text-white">{health} HP</span></div>
          </section>
          <div className="pointer-events-auto relative">
            <button aria-label="Game menu" onClick={()=>{input.release();sync.send({type:"interact",held:false});setMenuOpen(v=>!v)}} className="flex h-[43px] items-center gap-2 rounded-2xl border border-white/20 bg-[#081f2d]/85 px-4 text-[13px] font-black backdrop-blur-lg"><span className="text-lg">☰</span><span className="hidden sm:inline">MENU</span></button>
            {menuOpen && <div className="absolute right-0 top-[49px] w-[215px] rounded-2xl border border-white/15 bg-[#081b2a]/95 p-4 shadow-2xl backdrop-blur-xl">
              <div className="mb-3 text-xs font-black text-[#f0d49c]">❄ RESCUE LEADERBOARD</div>
              <div className="space-y-1 text-[12px]">{hud.roster.map((p,i)=><div key={p.id} className="flex items-center justify-between gap-2"><span className="min-w-0 truncate" style={{color:p.color}}>{i+1}. {p.name}</span><span>{p.score} ⭐</span></div>)}</div>
              <div className="mt-3 border-t border-white/15 pt-2 text-[11px] text-white/70">Defeated: {hud.me?.kills??0} snowmen</div>
              <button className="sound-toggle" onClick={()=>{setMuted(!silent);setSilent(!silent)}}>Sound {silent?"off":"on"}</button>
              <button onClick={invite} className="mt-3 w-full rounded-lg border border-white/20 bg-white/10 px-2 py-2 text-xs font-black">{copied?"INVITE COPIED ✓":"COPY INVITE LINK"}</button>
              <button onClick={()=>{setMenuOpen(false);exit()}} className="mt-2 w-full rounded-lg border border-rose-200/25 bg-red-800/25 px-2 py-2 text-xs font-black">EXIT GAME</button>
            </div>}
          </div>
        </div>
        <div className="pointer-events-none absolute left-1/2 top-[max(.8rem,env(safe-area-inset-top))] z-20 w-[min(240px,32vw)] -translate-x-1/2">
          <div className="rounded-full border border-white/15 bg-[#071927]/70 px-3 py-2 text-center text-[10px] font-bold text-white/90 shadow-lg backdrop-blur-lg">{isStunned&&!isDead?"SNOWMAN ATTACK! FIGHT BACK":canInteract?"HOLD TO RESCUE SANTA":isDead?"YOU HAVE BEEN DEFEATED":"REACH THE ICE CAGE"}</div>
          {hud.round.progress>0&&<div className="mt-2 h-[5px] overflow-hidden rounded-full bg-black/40"><div className="h-full rounded-full bg-amber-300 transition-[width]" style={{width:`${hud.round.progress*100}%`}}/></div>}
        </div>
        <div className="rotate-hint">Rotate your phone for landscape play</div>
        {!isTouch && <div className="pointer-events-none absolute bottom-5 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#091d2b]/75 px-4 py-2 text-[11px] font-bold text-white/80">{lookLocked?"WASD MOVE · MOUSE AIM · CLICK THROW · SPACE JUMP · E HOLD":"CLICK TO AIM · WASD MOVE · F FIRE · SPACE JUMP · E RESCUE"}</div>}
        {hitText && <div className="pointer-events-none absolute left-1/2 top-[28%] z-40 -translate-x-1/2 rounded-full border border-white/20 bg-[#092534]/85 px-6 py-3 text-[16px] font-black tracking-wide text-[#fce1b1] shadow-xl backdrop-blur-xl">{hitText}</div>}
        {damageFlash && <div className="pointer-events-none absolute inset-0 z-30 border-[9px] border-red-500/75 bg-red-700/15"/>}
        {isDead&&<div className="pointer-events-none absolute inset-0 z-40 grid place-items-center bg-[#170d19]/55 p-5 backdrop-blur-sm"><div className="rounded-3xl border border-rose-300/30 bg-[#1a1424]/95 p-8 text-center shadow-2xl"><div className="text-5xl">💀</div><h2 className="mt-3 text-3xl font-black">YOU WERE DEFEATED</h2><p className="mt-2 text-sm text-white/70">Snowmen caught you. Respawning in {Math.max(1,Math.ceil((deadUntil-sync.serverNow())/1000))}s</p><p className="mt-2 text-xs text-rose-200">Use snowballs to keep them away next time.</p></div></div>}
        {hud.round.status==="rescued" && <div className="pointer-events-none absolute inset-0 z-40 grid place-items-center bg-[#041723]/55 p-4 backdrop-blur-sm"><div className="rounded-3xl border border-amber-200/30 bg-[#092431]/95 p-8 text-center shadow-2xl"><div className="text-5xl">🎁</div><h2 className="mt-2 text-3xl font-black text-[#f0d59f]">SANTA IS FREE!</h2><p className="mt-2 text-sm">{winner?.name||hud.round.winnerName||"An explorer"} saved Christmas!</p><p className="mt-2 text-xs text-white/65">Next round in {Math.max(1,Math.ceil((hud.round.resetAt-sync.serverNow())/1000))}s</p></div></div>}
        {(hud.status!=="online" || hud.notice)&&<div className="pointer-events-auto absolute left-1/2 top-[34%] z-50 w-[min(350px,84vw)] -translate-x-1/2 rounded-2xl border border-white/20 bg-[#081f2d]/95 p-5 text-center shadow-2xl"><p className="text-sm font-bold">{hud.notice||"Connecting to multiplayer room…"}</p><button onClick={()=>sync.connect(roomCode,name)} className="mt-4 rounded-lg bg-[#ebd4a7] px-5 py-2 text-xs font-black text-[#142a38]">RETRY CONNECTION</button></div>}
      </>}
    </main>
  );
}
