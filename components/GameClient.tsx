"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { InputController } from "@/lib/InputController";
import SoloGame from "@/lib/SoloGame";
import {enableSound,playCue,sound,suspendSound,setMuted} from "@/lib/sound";
const AirportGame=dynamic(()=>import("./AirportGame"),{ssr:false,loading:()=> <div className="air-pause">Opening Noel Field…</div>});
const LobbyVista=dynamic(()=>import("./LobbyVista"),{ssr:false});
import { INTERACTION_RANGE, CITY_LENGTH, CITY_SPEED } from "@/lib/world";

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

function AimRing({input}:{input:InputController}){
  const ring=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    let frame=0;
    const draw=()=>{if(ring.current){ring.current.style.setProperty("--charge",input.charge*360+"deg");ring.current.dataset.active=String(input.firing);}frame=requestAnimationFrame(draw);};
    draw();return ()=>cancelAnimationFrame(frame);
  },[input]);
  return <div ref={ring} className="reticle" aria-hidden="true"/>;
}
const clockText=(ms:number)=>Math.floor(ms/60000)+":"+String(Math.floor(ms/1000)%60).padStart(2,"0");
export default function GameClient() {
  const game = useMemo(() => new SoloGame(), []);
  const input = useMemo(() => new InputController(), []);
  const hud = useSyncExternalStore(game.subscribe, game.getSnapshot, game.getSnapshot);
  const [graphics,setGraphics]=useState<boolean|null>(null);
  const [best,setBest]=useState(0);
  const [mission,setMission]=useState<"northPole"|"express"|"airport">("northPole");
  const [airport,setAirport]=useState(false);
  const [started, setStarted] = useState(false);

  const [isTouch, setIsTouch] = useState(false);
  const fireFinger=useRef<{x:number;y:number}|null>(null);

  const [lookLocked, setLookLocked] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [damageFlash, setDamageFlash] = useState(false);
  const [hitText, setHitText] = useState("");

  useEffect(() => {
    try{const muted=localStorage.getItem("santa-muted")==="true";setMuted(muted);setSilent(muted);setBest(Number(localStorage.getItem("santa-solo-best-ms"))||0);}catch{}
    const probe=document.createElement("canvas").getContext("webgl2");
    setGraphics(Boolean(probe));probe?.getExtension("WEBGL_lose_context")?.loseContext();

    setIsTouch(window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0);
    return () => { game.stop(); };
  }, [game]);

  const start = useCallback((chapter:"northPole"|"city"|"express"="northPole") => {

    input.reset();
    if(!graphics)return;
    enableSound();
    lastWin.current=-1;setHitText("");setDamageFlash(false);
    if(chapter==="northPole")game.start();else game.startCityPreview(chapter==="express");
    setStarted(true);
  }, [input, game, graphics]);

  const enterAirport=()=>{
    if(!graphics)return;
    input.reset();game.stop();setStarted(false);setMenuOpen(false);enableSound();setAirport(true);
    if(document.pointerLockElement)document.exitPointerLock();
  };

  const exit = useCallback(() => {
    input.reset();
    game.hold(false);
    game.stop();
    if (document.pointerLockElement) document.exitPointerLock();
    suspendSound();if(document.fullscreenElement)void document.exitFullscreen().catch(()=>{});
    setStarted(false);setAirport(false);
  }, [input, game]);

  useEffect(() => {
    if (!started) return;
    const keydown = (e: KeyboardEvent) => {
      if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
      if(menuOpen || (e.target instanceof HTMLInputElement))return;
      if(game.round.status==="city"&&(e.code==="Space"||e.code==="KeyF")&&!e.repeat){game.dropPresent();return;}
      if(e.code==="KeyF"&&!e.repeat){input.beginThrow();sound("charge");}
      if (e.repeat && ["Space", "KeyE"].includes(e.code)) return;
      input.keys.add(e.code);
      if (e.code === "Space") input.jump();
      if (e.code === "KeyE" && !input.interacting) {
        input.interacting = true;
        game.hold(true);
      }
    };
    const keyup = (e: KeyboardEvent) => {
      input.keys.delete(e.code);if(e.code==="KeyF"&&game.round.status!=="city")input.endThrow();
      if (e.code === "KeyE") {
        input.interacting = false;
        game.hold(false);
      }
    };
    const mouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement) input.pan(e.movementX, e.movementY);
    };
    const pointerDown = (e: PointerEvent) => {
      if(menuOpen)return;
      if (!(e.target instanceof HTMLCanvasElement) || e.button !== 0 || isTouch) return;
      if(game.round.status==="city"){game.dropPresent();return;}
      if (!document.pointerLockElement) {try{void e.target.requestPointerLock?.()?.catch(()=>{});}catch{}}
      input.beginThrow();sound("charge");
    };
    const releaseFire=(e:PointerEvent)=>{if(e.pointerType==="mouse" && e.button===0)input.endThrow();};
    const lockchange = () => {setLookLocked(Boolean(document.pointerLockElement));if(!document.pointerLockElement)input.release();};
    const loseFocus = () => {
      input.release();
      game.hold(false);
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
  }, [input, game, started, isTouch,menuOpen]);

  useEffect(() => game.onEvent((event) => {
    if(event.type==="presentDrop"){playCue("drop");}
    else if(event.type==="cityStarted"){sound("clear");setHitText(game.express?"EXPRESS · THREE STOPS, ONE PASS":"MIDNIGHT METROPOLIS");}
    else if(event.type==="cityPass"){sound("bell");setHitText("ANOTHER DELIVERY PASS · "+event.pass);}
    else if(event.type==="presentLanded"){playCue(event.hit?"delivery":"miss");setHitText(event.hit?"DELIVERED! · "+event.count+"/"+game.deliveryGoal:"MISSED · LINE UP YOUR NEXT DROP");}
    else if(event.type==="gift"){sound("clear");setHitText("MAGIC GIFT RECOVERED · "+event.count+"/5");}
    else if(event.type==="supply"){sound("bell");setHitText("WARMTH KIT · HEALTH RESTORED");}
    else if(event.type==="shatter"){sound("hit");setHitText("ICE SHATTERED");}
    else if(event.type==="playerHit"){
      setHitText(event.health===0?"YOU WERE DEFEATED":"-"+event.damage+" HEALTH");
      setDamageFlash(true);setTimeout(()=>setDamageFlash(false),450);
    } else if(event.type==="enemyHit"){
      sound("hit");setHitText(event.health===0?"SNOWMAN DEFEATED":"DIRECT HIT!");
    }
  }),[game]);

  const [silent,setSilent]=useState(false);
  useEffect(()=>{
    if(!started)return;
    const phase=hud.round.status;
    if(phase==="launching"||phase==="cityLaunch")playCue("launch");
    if(phase!=="city"&&phase!=="flight")return;
    const cue=phase==="city"?"city":"flight";
    const play=()=>{if(!document.hidden)playCue(cue);};
    play();
    const timer=window.setInterval(play,5600);
    return ()=>window.clearInterval(timer);
  },[started,hud.round.status]);
  const lastWin=useRef(-1);
  useEffect(()=>{if(hud.round.status==="rescued" && lastWin.current!==hud.round.round){lastWin.current=hud.round.round;sound("clear");
    if(!game.startedFromCity && game.finishTime>0 && (!best || game.finishTime<best)){setBest(game.finishTime);try{localStorage.setItem("santa-solo-best-ms",String(game.finishTime));}catch{}}
  }},[hud.round,game,best]);
  useEffect(()=>{if(!hitText)return;const id=setTimeout(()=>setHitText(""),1150);return ()=>clearTimeout(id);},[hitText]);
  const distanceToSanta = hud.me ? Math.hypot(hud.me.x, hud.me.z) : Infinity;
  const deadUntil = hud.me?.deadUntil ?? 0;
  const isDead = deadUntil > game.now();
  const health = Math.max(0, hud.me?.health ?? 100);
  const canInteract = !isDead && distanceToSanta <= INTERACTION_RANGE && hud.round.status === "playing";
  const isStunned = Boolean(hud.me && hud.me.stunnedUntil > game.now());
  const isCity=hud.round.status==="city";
  const isCityLaunch=hud.round.status==="cityLaunch";
  const cityAim=isCity?game.getCityAim():null;
  const isFlight=hud.round.status==="flight";
  const isVillage=hud.round.status==="village";
  const missedRoute=hud.round.status==="routeEnded";
  const isComplete=hud.round.status==="rescued"||missedRoute;
  const chapterTwo=isFlight||isVillage||isCityLaunch||isCity||isComplete;

  return (
    <main className="game-root overflow-hidden bg-[#081a23] text-white" style={{touchAction:"none"}}>
      {airport?<AirportGame mobile={isTouch} silent={silent} exit={exit} toggleSound={()=>{setMuted(!silent);setSilent(!silent);try{localStorage.setItem("santa-muted",String(!silent))}catch{}}}/>:!started ? (
        <div className="lobby">
          {graphics && <LobbyVista/>}<div className="shade"/>
          <header className="mast"><i/> NORTH POLE RESCUE SERVICE <span>FIELD OPERATIONS &nbsp;/&nbsp; 01</span></header>
          <section className="brief">
            <p className="kicker">SOLO EXPEDITION &nbsp; / &nbsp; 01</p>
            <h1>Rescue<br/><em>Santa.</em></h1>
            <div className="mission-options" role="group" aria-label="Choose a mission">
              <button aria-pressed={mission==="northPole"} onClick={()=>setMission("northPole")}>Adventure</button>
              <button aria-pressed={mission==="express"} onClick={()=>setMission("express")}>Christmas Eve Express</button>
              <button aria-pressed={mission==="airport"} onClick={()=>setMission("airport")}>Airfield</button>
            </div>
            <p className="story">{mission==="airport"?"Board the red mail plane at Noel Field. Fly Christmas parcels to Starfall Post and land on its lighted runway.":mission==="express"?"One pass. Deliver to the Toy Workshop, Children’s Hospital, and Riverside School before Santa leaves the city.":"Free Santa, fly to Aurora Village together, then deliver presents across Midnight Metropolis."}</p>
            {best>0&&mission==="northPole"&&<p className="exp-best">Personal best · {clockText(best)}</p>}
            <button className="deploy" onClick={()=>mission==="airport"?enterAirport():start(mission)} disabled={graphics!==true}>{mission==="airport"?"Enter Noel Field":mission==="express"?"Fly express route":"Start expedition"} <span>↗</span></button>
            <button className="preview-link" onClick={()=>start("city")} disabled={graphics!==true}>Practice city deliveries</button>
            {graphics===false&&<p role="status" className="graphics-note">3D play needs WebGL 2. Open this link in Safari or Chrome with graphics acceleration enabled.</p>}
          </section>
          <footer className="folio"><span>90° N &nbsp; / &nbsp; ARCTIC CIRCLE</span><a href="/credits.txt" target="_blank" rel="noreferrer">ASSET CREDITS</a></footer>
        </div>
      ) : <>
        <GameScene game={game} input={input} lowPower={isTouch}/>
        {!chapterTwo&&<AimRing input={input}/>}
        {isTouch && <>
          {!isFlight&&!isCity&&!isCityLaunch&&<TouchCamera input={input}/>} {!isCityLaunch&&!isComplete&&hud.round.status!=="launching"&&<FloatingJoystick input={input}/>} 
          <div style={{display:isFlight||isCity||isCityLaunch||isComplete?"none":undefined}} className="actions-right pointer-events-auto absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-3 z-40 flex flex-col items-end gap-3">
            {canInteract && <button onPointerDown={e=>{e.preventDefault();input.interacting=true;e.currentTarget.setPointerCapture(e.pointerId);game.hold(true)}}
              onPointerUp={()=>{input.interacting=false;game.hold(false)}}
              onPointerCancel={()=>{input.interacting=false;game.hold(false)}}
              onLostPointerCapture={()=>{if(input.interacting){input.interacting=false;game.hold(false)}}}
              className="h-[52px] rounded-full border border-[#fce6ab] bg-[#bd7633]/95 px-5 text-[12px] font-black tracking-wide shadow-xl active:scale-95">✦ HOLD TO RESCUE</button>}
            <div className="flex gap-2.5">
              <button aria-label="Jump" onPointerDown={e=>{e.preventDefault();input.jump()}}
                className="grid h-[64px] w-[64px] place-content-center rounded-full border border-white/35 bg-[#0a2939]/85 shadow-lg backdrop-blur-lg active:scale-95"><span className="text-[24px] leading-6">↑</span><span className="text-[9px] font-black tracking-widest">JUMP</span></button>
              {!isVillage&&<button aria-label="Throw snowball" onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);input.beginThrow();sound("charge");fireFinger.current={x:e.clientX,y:e.clientY}}} onPointerMove={e=>{const f=fireFinger.current;if(input.firing&&f&&e.currentTarget.hasPointerCapture(e.pointerId)){input.pan(e.clientX-f.x,e.clientY-f.y);f.x=e.clientX;f.y=e.clientY;}}} onPointerUp={()=>{input.endThrow();fireFinger.current=null}} onLostPointerCapture={()=>{if(fireFinger.current){input.cancelThrow();fireFinger.current=null;}}} onPointerCancel={()=>{input.cancelThrow();fireFinger.current=null}}
                className="grid h-[75px] w-[75px] place-content-center rounded-full border border-[#fce0a5]/65 bg-[#174457]/95 shadow-[0_4px_28px_#f6dfa845] backdrop-blur-lg active:scale-95"><span className="text-[29px] leading-7">❄</span><span className="text-[10px] font-black tracking-wide">THROW</span><span className="text-[8px]">Hold to pack</span></button>}
            </div>
          </div>
          {isCity&&<button aria-label="Drop a present" onClick={()=>{game.dropPresent()}} className="actions-right pointer-events-auto absolute bottom-[max(2rem,env(safe-area-inset-bottom))] right-4 z-40 flex h-[92px] w-[92px] flex-col items-center justify-center rounded-full border-2 border-[#ffe4aa] bg-gradient-to-b from-[#c64c46] to-[#8b2933] text-white shadow-[0_5px_35px_#f0c88980] active:scale-95"><span className="text-[32px] leading-none">🎁</span><span className="mt-1 text-[12px] font-black tracking-widest">DROP</span></button>}
        </>}
        <div className="hud-top pointer-events-none absolute inset-x-0 top-0 z-30 gap-2 px-3 pt-[max(1.0rem,env(safe-area-inset-top))]">
          <section className="max-w-[68%] rounded-2xl border border-white/15 bg-[#081f2d]/80 p-3 shadow-lg backdrop-blur-lg">
            <div className="text-[12px] font-black tracking-widest">{isCity||isComplete?"✦ MIDNIGHT METROPOLIS":isCityLaunch?"✦ CITY DEPARTURE":chapterTwo?"✦ AURORA VALLEY":"✦ RESCUE SANTA"}</div>
            <div className="mt-1 flex items-center gap-1.5 text-[10px] font-bold text-white/70">{game.express?"EXPRESS · "+clockText(Math.max(0,(CITY_LENGTH-hud.round.cityDistance)/CITY_SPEED*1000)):isCity||isComplete?"CHAPTER III · DELIVERY RUN":isCityLaunch?"CHAPTER III · TAKEOFF":isFlight?"CHAPTER II · SLEIGH FLIGHT":chapterTwo?"CHAPTER II · "+hud.round.giftCount+"/5 GIFTS":"SOLO · ROUND "+hud.round.round}</div>
            <div className="mt-2 flex items-center gap-1.5"><div className="h-[6px] w-[95px] overflow-hidden rounded-full bg-[#a51f34]/40 sm:w-[150px]"><div className="h-full rounded-full bg-gradient-to-r from-red-600 via-amber-300 to-lime-300 transition-[width]" style={{width:`${isCity||isComplete?Math.min(100,hud.round.cityDelivered/game.deliveryGoal*100):health}%`}}/></div><span className="text-[10px] font-black text-white">{isCity||isComplete?`${hud.round.cityDelivered}/${game.deliveryGoal}`:`${health} HP`}</span></div>
          </section>
        <div className="objective-pill pointer-events-none">
          <div className="rounded-full border border-white/15 bg-[#071927]/70 px-3 py-2 text-center text-[10px] font-bold text-white/90 shadow-lg backdrop-blur-lg">{isCityLaunch?"NEXT STOP · MIDNIGHT METROPOLIS":isCity?(cityAim?.aligned?"DROP NOW · "+cityAim.target.name:"AIM FOR "+(cityAim?.target.name??"THE DELIVERY ZONES")):isFlight?"FLY THE SLEIGH · STEER THROUGH THE MOUNTAINS":isVillage?"FIND ALL FIVE GIFTS · "+hud.round.giftCount+"/5":isComplete?"ROUTE COMPLETE":hud.round.status==="launching"?"BOARDING SANTA'S SLEIGH":hud.round.status==="escort"?(hud.round.blocked?"CLEAR THE SNOWMEN NEAR SANTA":"STAY CLOSE · ESCORT SANTA"):isStunned&&!isDead?"SNOWMAN ATTACK! FIGHT BACK":canInteract?"HOLD TO RESCUE SANTA":isDead?"YOU HAVE BEEN DEFEATED":"REACH THE ICE CAGE"}</div>
          {(isFlight||hud.round.status==="escort"||hud.round.status==="playing"&&hud.round.progress>0)&&<div className="mt-2 h-[5px] overflow-hidden rounded-full bg-black/40"><div className="h-full rounded-full bg-amber-300 transition-[width]" style={{width:`${(hud.round.status==="escort"?hud.round.escort:hud.round.progress)*100}%`}}/></div>}
        </div>

          <div className="pointer-events-auto relative">
            <button aria-label="Game menu" onClick={()=>{input.release();game.hold(false);setMenuOpen(v=>!v)}} className="flex h-[43px] items-center gap-2 rounded-2xl border border-white/20 bg-[#081f2d]/85 px-4 text-[13px] font-black backdrop-blur-lg"><span className="text-lg">☰</span><span className="hidden sm:inline">MENU</span></button>
            {menuOpen && <div className="menu-panel absolute right-0 top-[49px] w-[215px] rounded-2xl border border-white/15 bg-[#081b2a]/95 p-4 shadow-2xl backdrop-blur-xl">
              <div className="mb-3 text-xs font-black text-[#f0d49c]">EXPEDITION STATS</div>
              <div className="text-[12px]">Village gifts: {hud.round.giftCount}/5 · City deliveries: {hud.round.cityDelivered}/{game.deliveryGoal}</div>
              <div className="mt-3 border-t border-white/15 pt-2 text-[11px] text-white/70">Defeated: {hud.me?.kills??0} snowmen</div>
              <button className="sound-toggle" onClick={()=>{setMuted(!silent);setSilent(!silent);try{localStorage.setItem("santa-muted",String(!silent))}catch{}}}>Sound {silent?"off":"on"}</button>

              <button onClick={()=>{setMenuOpen(false);exit()}} className="mt-2 w-full rounded-lg border border-rose-200/25 bg-red-800/25 px-2 py-2 text-xs font-black">EXIT GAME</button>
            </div>}
          </div>
        </div>
        {!isTouch && <div className="key-guide pointer-events-none absolute bottom-5 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#091d2b]/75 px-4 py-2 text-[11px] font-bold text-white/80">{isCity?"WASD STEER SLEIGH · SPACE / F / CLICK TO DROP PRESENT":isFlight?"WASD / ARROW KEYS TO STEER SANTA'S SLEIGH":isVillage?"WASD MOVE · MOUSE TO LOOK · COLLECT ALL FIVE GIFTS":lookLocked?"WASD MOVE · MOUSE AIM · HOLD & RELEASE TO THROW · SPACE JUMP · E HOLD":"CLICK TO AIM · WASD MOVE · F FIRE · SPACE JUMP · E RESCUE"}</div>}
        {hitText && <div className="hit-notice pointer-events-none absolute left-1/2 top-[28%] z-40 -translate-x-1/2 rounded-full border border-white/20 bg-[#092534]/85 px-6 py-3 text-[16px] font-black tracking-wide text-[#fce1b1] shadow-xl backdrop-blur-xl">{hitText}</div>}
        {damageFlash && <div className="pointer-events-none absolute inset-0 z-30 border-[9px] border-red-500/75 bg-red-700/15"/>}
        {isDead&&<div className="pointer-events-none absolute inset-0 z-40 grid place-items-center bg-[#170d19]/55 p-5 backdrop-blur-sm"><div className="rounded-3xl border border-rose-300/30 bg-[#1a1424]/95 p-8 text-center shadow-2xl"><div className="text-5xl">💀</div><h2 className="mt-3 text-3xl font-black">YOU WERE DEFEATED</h2><p className="mt-2 text-sm text-white/70">Snowmen caught you. Respawning in {Math.max(1,Math.ceil((deadUntil-game.now())/1000))}s</p><p className="mt-2 text-xs text-rose-200">Use snowballs to keep them away next time.</p></div></div>}
        {isCity&&!isTouch&&<div className="pointer-events-none absolute bottom-[max(2rem,env(safe-area-inset-bottom))] right-4 z-30 hidden sm:block rounded-2xl border border-white/20 bg-[#081b2a]/85 px-4 py-3 text-center text-xs font-bold text-[#ffe2ae]">DROP · SPACE / F<br />{cityAim?.aligned?"TARGET ALIGNED ✓":"STEER TO A LIT DROP ZONE"}<div className="mt-1 text-[10px] text-white/70">PASS {hud.round.cityPass} · {hud.round.cityDelivered}/{game.deliveryGoal} DELIVERIES</div></div>}
        {isComplete && <div className="pointer-events-auto absolute inset-0 z-40 grid place-items-center bg-[#041723]/65 p-4 backdrop-blur-md"><div className="result-card max-w-[400px] rounded-3xl border border-amber-200/35 bg-[#092431]/95 p-8 text-center shadow-2xl"><div className="text-5xl">🎁</div><p className="mt-3 text-xs font-bold tracking-[.25em] text-amber-200">{game.express?"CHRISTMAS EVE EXPRESS":game.startedFromCity?"CITY DELIVERY PRACTICE":"ALL THREE CHAPTERS COMPLETE"}</p><h2 className="mt-2 text-3xl font-black text-[#f0d59f]">{missedRoute?"ROUTE FINISHED":game.express?"EXPRESS DELIVERED!":"CHRISTMAS DELIVERED!"}</h2><p className="mt-2 text-sm text-white/80">{game.startedFromCity?hud.round.cityDelivered+" of "+game.deliveryGoal+" stops served · "+hud.round.cityAttempts+" gifts dropped.":"You rescued Santa, recovered the village gifts, and delivered them across Midnight Metropolis."}</p><p className="mt-3 text-xs text-white/65">Run time {clockText(game.finishTime)}{!game.startedFromCity&&" · Best "+clockText(best||game.finishTime)}</p><button onClick={()=>{setMenuOpen(false);start(game.express?"express":game.startedFromCity?"city":"northPole")}} className="mt-6 w-full rounded-full bg-[#edcd8b] px-6 py-3 text-sm font-black text-[#122b34] shadow-lg">PLAY AGAIN ↗</button><button className="preview-link" onClick={enterAirport}>Continue to Noel Field ↗</button><button onClick={exit} className="mt-3 w-full rounded-full border border-white/20 px-6 py-2 text-xs font-bold text-white/80">EXIT TO MENU</button></div></div>}

      </>}
    </main>
  );
}
