"use client";
import {useMemo,useRef,useSyncExternalStore} from "react";
import {useFrame} from "@react-three/fiber";
import * as T from "three";
import SoloGame from "@/lib/SoloGame";
import {SLEIGH_Z,SUPPLIES} from "@/lib/world";
import SantaRig,{type Motion} from "./SantaRig";

const gold="#d5ad68",red="#913d39",timber="#54382f";
export function SleighEscape({game}:{game:SoloGame}){
  const sleigh=useRef<T.Group>(null),santa=useRef<T.Group>(null);
  const motion=useRef<Motion>({speed:0,airborne:false,shot:-2000});
  const visualZ=useRef(0);
  const runner=useMemo(()=>new T.TubeGeometry(new T.CatmullRomCurve3([
    new T.Vector3(0,.36,1.65),new T.Vector3(0,.13,1.2),new T.Vector3(0,.13,-1.4),
    new T.Vector3(0,.36,-1.94),new T.Vector3(0,.69,-2.05),new T.Vector3(0,.77,-1.91)
  ]),22,.069,6,false),[]);
  useFrame((_,dt)=>{
    if(!santa.current||!sleigh.current)return;
    const phase=game.round.status;
    const flight=phase==="launching"?Math.max(0,5-(game.round.resetAt-game.now())/1000):phase==="rescued"?5:0;
    const boarded=phase==="launching"||phase==="rescued";
    const target=game.santaZ;
    const old=visualZ.current;
    visualZ.current=phase==="playing"?0:T.MathUtils.damp(old,target,12,dt);
    motion.current.speed=Math.min(6,Math.abs(visualZ.current-old)/Math.max(.001,dt)*2);
    sleigh.current.position.set(0,flight*flight*.8,SLEIGH_Z-flight*flight*1.65);
    sleigh.current.rotation.x=-Math.min(.2,flight*.12);
    santa.current.position.set(0,boarded?sleigh.current.position.y+.47:.12,boarded?sleigh.current.position.z:visualZ.current);
    santa.current.rotation.y=phase==="playing"?Math.PI:0;
  });
  return <>
    <group ref={santa}><SantaRig height={2.7} motion={motion}/></group>
    <group ref={sleigh} position={[0,0,SLEIGH_Z]}>
      {[-.74,.74].map(x=><group key={x} position-x={x}>
        <mesh geometry={runner} castShadow><meshStandardMaterial color={gold} metalness={.65} roughness={.32}/></mesh>
        {[-.75,.85].map(z=><mesh key={z} position={[0,.4,z]}><boxGeometry args={[.12,.54,.12]}/><meshStandardMaterial color={gold}/></mesh>)}
        <mesh position={[0,.85,0]} castShadow><boxGeometry args={[.16,.47,2.9]}/><meshStandardMaterial color={red}/></mesh>
      </group>)}
      <mesh castShadow position={[0,.6,0]}><boxGeometry args={[1.6,.2,2.9]}/><meshStandardMaterial color={timber}/></mesh>
      <mesh castShadow position={[0,1.02,1.25]}><boxGeometry args={[1.58,.86,.17]}/><meshStandardMaterial color={red}/></mesh>
    </group>
  </>;
}
const lamps=[[2,32],[-2,27],[-4,22],[-3,16],[-2,10],[1,6],[-2,-5],[-2,-10]];
export function RouteMarkers({game}:{game:SoloGame}){
  const stock=useSyncExternalStore(game.subscribe,()=>SUPPLIES.map((_,i)=>game.collected.has(i)?"0":"1").join(""),()=>"111");
  const tracks=useMemo(()=>{
    const obj=new T.Object3D(),list:T.Matrix4[]=[];
    for(let i=0;i<22;i++){
      obj.position.set(5.2+Math.sin(i*.14)*.65+(i%2?.14:-.14),-.028,32-i*.73);
      obj.rotation.set(-Math.PI/2,0,(i%2?.08:-.08));obj.scale.set(.12,.23,1);obj.updateMatrix();list.push(obj.matrix.clone());
    }
    return list;
  },[]);
  return <>
    <instancedMesh args={[undefined,undefined,tracks.length]} ref={m=>{if(m){tracks.forEach((v,i)=>m.setMatrixAt(i,v));m.instanceMatrix.needsUpdate=true;}}}>
      <circleGeometry args={[1,12]}/><meshBasicMaterial color="#839ba5" transparent opacity={.45}/>
    </instancedMesh>
    {lamps.map(([x,z])=><group key={z} position={[x,0,z]}>
      <mesh position-y={.5}><cylinderGeometry args={[.07,.09,1,7]}/><meshStandardMaterial color={timber}/></mesh>
      <mesh position-y={1.13}><cylinderGeometry args={[.16,.13,.32,6]}/><meshBasicMaterial color="#ffd493" toneMapped={false}/></mesh>
      <mesh position-y={1.35}><coneGeometry args={[.22,.14,6]}/><meshStandardMaterial color={timber}/></mesh>
    </group>)}
    {SUPPLIES.map((p,i)=>stock[i]==="1"&&<group key={i} position={[p.x,.35,p.z]}>
      <mesh castShadow><boxGeometry args={[.82,.68,.62]}/><meshStandardMaterial color="#ac4036"/></mesh>
      <mesh position-z={.32}><boxGeometry args={[.16,.45,.025]}/><meshBasicMaterial color="#fff2da"/></mesh>
      <mesh position-z={.33}><boxGeometry args={[.45,.15,.025]}/><meshBasicMaterial color="#fff2da"/></mesh>
    </group>)}
  </>;
}
