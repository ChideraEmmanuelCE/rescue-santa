"use client";
import {useState,useCallback,useEffect,useRef,useMemo} from "react";
import type {PointerEvent} from "react";
import {Airfield,fields} from "@/lib/Airfield";
import {InputController} from "@/lib/InputController";
import {enableSound,playCue,suspendSound} from "@/lib/sound";
import AirportScene from "./AirportScene";

function FlightStick({input,flying}:{input:InputController;flying:boolean}){
  const finger=useRef<number|null>(null),nub=useRef<HTMLSpanElement>(null);
  function move(e:PointerEvent<HTMLDivElement>){
    if(finger.current!==e.pointerId)return;
    const b=e.currentTarget.getBoundingClientRect(),radius=b.width*.42;
    const x=(e.clientX-b.left-b.width/2)/radius,y=(e.clientY-b.top-b.height/2)/radius,length=Math.max(1,Math.hypot(x,y));
    input.joystickX=x/length;input.joystickY=y/length;
    if(nub.current)nub.current.style.transform='translate('+input.joystickX*radius*.57+'px,'+input.joystickY*radius*.57+'px)';
  }
  function end(e:PointerEvent<HTMLDivElement>){if(finger.current!==e.pointerId)return;finger.current=null;input.joystickX=input.joystickY=0;if(nub.current)nub.current.style.transform="";}
  return <div className="air-stick" aria-label={flying?"Flight stick":"Walk"} onPointerDown={e=>{if(finger.current!==null)return;finger.current=e.pointerId;e.currentTarget.setPointerCapture(e.pointerId);move(e);}} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end}>
    <small>{flying?"CLIMB":"WALK"}</small><span ref={nub}/><small>{flying?"DESCEND":"BACK"}</small>
  </div>;
}
export default function AirportGame({mobile,exit,silent,toggleSound}:{mobile:boolean;exit:()=>void;silent:boolean;toggleSound:()=>void}){
  const sim=useMemo(()=>new Airfield(),[]),input=useMemo(()=>new InputController(),[]);
  const [,update]=useState(0),pulse=useCallback(()=>update(n=>n+1),[]);
  const [cockpit,setCockpit]=useState(false),[paused,setPaused]=useState(false);
  const interact=useCallback(()=>{const score=sim.parcels;sim.interact();if(score<sim.parcels)playCue("delivery");input.release();pulse();},[sim,input,pulse]);
  const power=useCallback((delta:number)=>{sim.setPower(delta);pulse();},[sim,pulse]);
  useEffect(()=>{
    const clear=()=>input.release();
    function key(e:KeyboardEvent){
      if(e.code==="Escape"&&!e.repeat){clear();setPaused(v=>!v);return;}
      if(paused)return;
      if(["Space","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.code))e.preventDefault();
      input.keys.add(e.code);if(e.repeat)return;
      if(e.code==="KeyE")interact();
      if(["Equal","NumpadAdd","KeyR"].includes(e.code))power(.25);
      if(["Minus","NumpadSubtract","KeyF"].includes(e.code))power(-.25);
      if(e.code==="KeyC")setCockpit(v=>!v);
    }
    const up=(e:KeyboardEvent)=>{input.keys.delete(e.code);};
    const visibility=()=>{clear();if(document.hidden){suspendSound();setPaused(true);}else enableSound();};
    window.addEventListener("keydown",key);window.addEventListener("keyup",up);window.addEventListener("blur",clear);window.addEventListener("resize",clear);document.addEventListener("visibilitychange",visibility);
    return ()=>{clear();window.removeEventListener("keydown",key);window.removeEventListener("keyup",up);window.removeEventListener("blur",clear);window.removeEventListener("resize",clear);document.removeEventListener("visibilitychange",visibility);};
  },[input,interact,paused,power]);
  let hint="Walk up to the mail plane";
  if(sim.onboard){
    if(sim.airborne)hint=sim.distance<240?"Line up with the lights · reduce power and descend":"Fly to "+sim.destination.name;
    else if(sim.groundField!==sim.station)hint=sim.canExit?"Exit to unload the Christmas mail":"Set power to idle and stop to unload";
    else if(sim.speed>=21)hint="Takeoff speed · hold climb";
    else hint="Add power · climb at 80 km/h";
  }else if(sim.canBoard)hint="Board the plane for "+sim.destination.name;
  const angle=sim.bearing*180/Math.PI;
  return <div className="airport">
    <AirportScene sim={sim} input={input} cockpit={cockpit} piloted={sim.onboard} pulse={pulse} paused={paused} mobile={mobile}/>
    <div className="air-head"><div className="air-instrument"><small>POLAR AIR MAIL</small><strong>{sim.onboard?sim.destination.name:fields[sim.station].name}</strong>
      {sim.onboard?<span>{Math.round(sim.speed*3.6)} km/h · {Math.round(sim.y)} m · {Math.round(sim.power*100)}% power</span>:<span>{sim.parcels?sim.parcels+" mail runs complete":"Christmas cargo ready"}</span>}
    </div><button className="air-menu" aria-label="Airfield menu" onClick={()=>{input.release();setPaused(true);}}>Menu</button></div>
    <div className="air-objective" role="status">{sim.noticeTime>0?sim.notice:hint}
      {sim.onboard&&<small><b style={{transform:"rotate("+angle+"deg)"}}>↑</b> {sim.destination.name} · {Math.round(sim.distance)} m</small>}</div>
    {!paused&&<>{mobile&&<FlightStick input={input} flying={sim.onboard}/>}
      <div className="air-actions">
        {sim.onboard&&<><button className="air-view" onClick={()=>setCockpit(v=>!v)}>{cockpit?"Chase view":"Cockpit view"}</button><div className="air-power"><button aria-label="Decrease power" onClick={()=>power(-.25)}>−</button><span>POWER</span><button aria-label="Increase power" onClick={()=>power(.25)}>+</button></div></>}
        {(!sim.onboard||sim.canExit)&&<button className="air-board" disabled={!sim.onboard&&!sim.canBoard} onClick={interact}>{sim.onboard?"Exit plane":"Board plane"}{!mobile&&" · E"}</button>}
      </div>
      {!mobile&&<div className="air-keys">{sim.onboard?"A/D turn · W/S climb / descend · R/F power · C camera":"WASD or arrows to walk · E to board"}</div>}
    </>}
    {paused&&<div className="air-pause"><section><small>POLAR AIR MAIL</small><h2>Flight paused</h2><p>{sim.parcels} Christmas mail {sim.parcels===1?"run":"runs"} complete</p>
      <button onClick={()=>{enableSound();setPaused(false);}}>Resume flight</button><button onClick={toggleSound}>Sound {silent?"off":"on"}</button>
      <button onClick={()=>{sim.recover();setCockpit(false);setPaused(false);pulse();}}>Return to departure runway</button><button onClick={exit}>Exit to main menu</button>
    </section></div>}
  </div>;
}
