"use client";

import {LANDMARKS,LOST_PRESENTS,PORTALS} from "@/lib/OpenWorld";
import {WORLD_HALF} from "@/lib/world";
import SoloGame from "@/lib/SoloGame";

/** Native SVG tactical map: zero map tile requests, responsive to phone/landscape. */
const sx=(x:number)=>210+x/WORLD_HALF*187;
const sy=(z:number)=>210+z/WORLD_HALF*187;
const kindEmoji:Record<string,string>={
 depot:"🚙",workshop:"🧰",ranch:"🦌",gateway:"✨",lake:"⛸️",cave:"🧊",
 airfield:"✈️",forest:"🌲",market:"🎪",square:"🎄"
};
export default function WorldMap({game,close,travel}:{game:SoloGame;close:()=>void;travel:(destination:"airport"|"express")=>void}){
 const p=game.myPlayer;
 return <div className="pointer-events-auto absolute inset-0 z-50 flex items-center justify-center overflow-auto bg-[#06141e]/95 px-3 py-6 text-white backdrop-blur-xl" role="dialog" aria-label="North Pole world map" aria-modal="true">
  <div className="relative w-full max-w-[960px] rounded-3xl border border-[#d5ebd4]/25 bg-[#0e2937] p-4 shadow-2xl md:p-6">
   <div className="mb-4 flex items-start justify-between gap-4">
    <div><p className="text-[10px] font-black tracking-[.3em] text-[#e9c792]">NORTH POLE · EXPLORER'S ATLAS</p>
      <h2 className="mt-1 text-2xl font-black">The Great Christmas Tundra</h2>
      <p className="text-xs text-white/65">Ten landmarks · 90 hidden presents · five vehicles · two travel gateways</p>
    </div>
    <button onClick={close} className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold">CLOSE ✕</button>
   </div>
   <div className="grid grid-cols-1 gap-5 md:grid-cols-[minmax(0,1.1fr)_minmax(260px,1fr)]">
    <svg viewBox="0 0 420 420" className="aspect-square w-full rounded-xl border border-white/15 bg-[#183e4b]" role="img" aria-label="North Pole region map with player location and landmarks">
     <defs><radialGradient id="polar-map-fill"><stop stopColor="#376170"/><stop offset="1" stopColor="#173442"/></radialGradient>
       <pattern id="polar-map-grid" width="35" height="35" patternUnits="userSpaceOnUse"><path d="M35 0 L0 0 0 35" stroke="#a8c8c6" strokeOpacity=".1" strokeWidth="1" fill="none"/></pattern>
     </defs>
     <rect width="420" height="420" fill="url(#polar-map-fill)"/><rect width="420" height="420" fill="url(#polar-map-grid)"/>
     <circle cx="210" cy="210" r="40" fill="#92c1c1" opacity=".2" stroke="#f5df9c" strokeWidth=".9"/>
     {Array.from({length:7},(_,i)=><circle key={i} cx="210" cy="210" r={32+i*28} fill="none" stroke="#d1e1d9" strokeOpacity=".09" strokeWidth=".8"/>)}
     <path d="M210 21 V399 M21 210 H399" stroke="#bed7d8" strokeWidth="1.2" strokeDasharray="3 9" opacity=".35"/>
     {LANDMARKS.map(spot=><g key={spot.id} transform={"translate("+sx(spot.x)+","+sy(spot.z)+")"}>
       <circle r="9" fill="#102c39" stroke="#f4d6a3" strokeWidth="1.2"/>
       <circle r="3.2" fill="#e7c685"/>
       <text y="-13" textAnchor="middle" fill="#f5e8c3" fontSize="8" fontWeight="700">{spot.name}</text>
     </g>)}
     <circle cx="210" cy="210" r="6" fill="#f2b2a0" stroke="#fbe6ad" strokeWidth="2"/>
     {p&&<g transform={"translate("+sx(p.x)+","+sy(p.z)+")"}>
       <circle r="12" fill="#87f8bd" opacity=".14"/>
       <circle r="5" fill="#bbffd9" stroke="#06382c" strokeWidth="1"/>
       <path d="M0 -12 L-4 -6 L4 -6 Z" fill="#dcffe6"/>
     </g>}
     <text x="16" y="22" fill="#e8dbbf" fontSize="12" fontWeight="700">N ↑</text>
     <text x="15" y="402" fill="#aecdd2" fontSize="10">440 m × 440 m · offline map</text>
    </svg>
    <div className="max-h-[390px] space-y-2 overflow-y-auto pr-1">
     <div className="rounded-xl border border-amber-200/20 bg-white/5 px-3 py-3 text-xs font-semibold">🎁 Presents found: {game.foundPresents.size}/{LOST_PRESENTS.length} · 🪙 Credits: {game.credits.toLocaleString()}</div>
     {LANDMARKS.map((spot,i)=><div key={spot.id} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
       <div className="flex items-center justify-between gap-2"><span className="text-xs font-bold">{kindEmoji[spot.kind]} {spot.name}</span><span className="text-[10px] text-amber-100/70">{p?Math.round(Math.hypot(spot.x-p.x,spot.z-p.z))+" m":""}</span></div>
       <p className="mt-1 text-[10px] leading-relaxed text-white/60">{spot.description}</p>
       {PORTALS.find(portal=>portal.id===spot.id)&&<button className="mt-2 rounded-lg border border-cyan-200/30 px-3 py-1.5 text-[11px] font-bold" onClick={()=>travel(spot.id==="airfield"?"airport":"express")}>Fast travel ↗</button>}
     </div>)}
    </div>
   </div>
   <p className="mt-3 text-center text-[11px] text-white/55">M opens/closes on desktop · Landscape is recommended for driving</p>
  </div>
 </div>;
}
