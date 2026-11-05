"use client";
import {Canvas,useFrame,useThree} from "@react-three/fiber";
import {Suspense,useRef,useMemo,useEffect} from "react";
import * as T from "three";
import {Airfield} from "@/lib/Airfield";
import {InputController} from "@/lib/InputController";
import {airplaneEngine,playCue} from "@/lib/sound";
import AirfieldScenery from "./AirfieldScenery";
import MailPlane from "./MailPlane";
import SantaRig from "./SantaRig";
import WinterLight,{Powder} from "./WinterLight";

type Props={sim:Airfield;input:InputController;cockpit:boolean;piloted:boolean;pulse:()=>void;paused:boolean;mobile:boolean};
function FlightWorld({sim,input,cockpit,piloted,pulse,paused,mobile}:Props){
  const {camera,setDpr}=useThree();
  const plane=useRef<T.Group>(null),avatar=useRef<T.Group>(null),prop=useRef<T.Group>(null);
  const shadow=useRef<T.Mesh>(null);
  const aim=useMemo(()=>new T.Vector3(),[]),eye=useMemo(()=>new T.Vector3(),[]),focus=useMemo(()=>new T.Vector3(),[]);
  const motion=useRef({speed:0,airborne:false,shot:-2000}),last=useRef({ui:1,engine:0,dpr:0,frames:0,ratio:Math.min(window.devicePixelRatio,mobile?1.35:1.7),air:false,reset:true});
  const engine=useRef<ReturnType<typeof airplaneEngine>>(undefined);
  useEffect(()=>{engine.current=airplaneEngine();return ()=>engine.current?.stop();},[]);
  useFrame((_,dt)=>{
    const v=last.current,m=input.getMovement();
    if(!paused&&!document.hidden)sim.step(dt,{turn:m.x,pitch:m.z});
    const onboard=sim.onboard;
    if(plane.current){plane.current.position.set(sim.x,.12+sim.y,sim.z);plane.current.rotation.order="YXZ";plane.current.rotation.set(sim.nose,-sim.heading,sim.bank);}
    if(shadow.current){shadow.current.position.set(sim.x+sim.y*.32,.15,sim.z+sim.y*.2);shadow.current.scale.set(4.9+sim.y*.012,2.6+sim.y*.018,1);(shadow.current.material as T.MeshBasicMaterial).opacity=.22/(1+sim.y*.13);}
    if(prop.current&&onboard&&!paused)prop.current.rotation.z+=dt*(16+sim.power*82);
    if(avatar.current){avatar.current.visible=!onboard;avatar.current.position.set(sim.walker.x,.15,sim.walker.z);avatar.current.rotation.y=-sim.walker.yaw;}
    motion.current.speed=paused||onboard?0:Math.hypot(m.x,m.z)*6;
    const sx=Math.sin(sim.heading),cz=Math.cos(sim.heading);
    if(onboard&&cockpit){
      eye.set(sim.x+sx*1.85,sim.y+2.85,sim.z-cz*1.85);aim.set(eye.x+sx*50,eye.y+sim.nose*48-3,eye.z-cz*50);
    }else if(onboard){
      eye.set(sim.x-sx*15,sim.y+7.4,sim.z+cz*15);aim.set(sim.x+sx*9,sim.y+1.3,sim.z-cz*9);
    }else{
      eye.set(sim.walker.x-4.8,5.1,sim.walker.z+8);aim.set(sim.walker.x+1,1.55,sim.walker.z-2.7);
    }
    if(v.reset||camera.position.distanceToSquared(eye)>120*120){camera.position.copy(eye);focus.copy(aim);v.reset=false;}
    const blend=1-Math.exp(-dt*(onboard&&cockpit?18:6));
    camera.position.lerp(eye,blend);focus.lerp(aim,blend);camera.lookAt(focus);
    if(cockpit&&onboard)camera.rotateZ(sim.bank*.65);
    if(v.air!==sim.airborne){if(sim.airborne)playCue("launch");v.air=sim.airborne;}
    v.engine+=dt;v.ui+=dt;
    if(v.engine>=.12){engine.current?.update(sim.power,onboard&&!paused);v.engine=0;}
    if(v.ui>=.1){pulse();v.ui=0;}
    if(dt<.3&&!document.hidden){v.dpr+=dt;v.frames++;if(v.dpr>=3){const avg=v.dpr/v.frames;
      const target=T.MathUtils.clamp(v.ratio+(avg>.030?-.15:avg<.017?.07:0),.75,Math.min(window.devicePixelRatio,mobile?1.35:1.7));
      if(Math.abs(target-v.ratio)>.01){v.ratio=target;setDpr(target);}v.frames=0;v.dpr=0;}}
  });
  return <><WinterLight lowPower={mobile}/>
    <AirfieldScenery/><mesh ref={shadow} rotation-x={-Math.PI/2}><circleGeometry args={[1,32]}/><meshBasicMaterial color="#213a49" transparent depthWrite={false}/></mesh><group ref={plane}><MailPlane prop={prop} piloted={piloted}/></group>
    <group ref={avatar}><Suspense fallback={<mesh position-y={1}><capsuleGeometry args={[.35,1,4,8]}/><meshStandardMaterial color="#b83938"/></mesh>}><SantaRig height={1.93} motion={motion}/></Suspense></group>
    <Powder count={mobile?320:650}/></>;
}
export default function AirportScene(props:Props){
  return <Canvas dpr={[1,props.mobile?1.35:1.7]} camera={{position:[-8,6,111],near:.16,far:1750,fov:64}} gl={{antialias:!props.mobile,powerPreference:"high-performance"}}>
    <color attach="background" args={["#adc6d4"]}/><fogExp2 attach="fog" args={["#b6cdd7",.00165]}/><FlightWorld {...props}/>
  </Canvas>;
}
