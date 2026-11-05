"use client";

import {useEffect,useMemo,useRef,useSyncExternalStore} from "react";
import {useFrame} from "@react-three/fiber";
import {Text} from "@react-three/drei";
import * as T from "three";
import {LANDMARKS,LOST_PRESENTS,OUTER_CABINS,OUTER_PINES} from "@/lib/OpenWorld";
import {VEHICLE_CATALOG, type VehicleState} from "@/lib/VehicleFleet";
import SoloGame from "@/lib/SoloGame";
import {random01} from "@/lib/world";

function ForestAndCabins({mobile}:{mobile:boolean}){
 const forest=useMemo(()=>mobile?OUTER_PINES.filter((_,i)=>i%2===0):OUTER_PINES,[mobile]);
 const trunks=useRef<T.InstancedMesh>(null),needles=useRef<T.InstancedMesh>(null),snowcaps=useRef<T.InstancedMesh>(null);
 const houses=useRef<T.InstancedMesh>(null),roofs=useRef<T.InstancedMesh>(null),windows=useRef<T.InstancedMesh>(null);
 const sets=useMemo(()=>{
  const dummy=new T.Object3D(),stem:T.Matrix4[]=[],leaf:T.Matrix4[]=[],cap:T.Matrix4[]=[];
  const walls:T.Matrix4[]=[],roof:T.Matrix4[]=[],glass:T.Matrix4[]=[];
  for(let i=0;i<forest.length;i++){
   const p=forest[i],h=p.size*(5.1+random01(i*9+21)*2.1),r=p.size*(1.4+random01(i*7+9)*.34);
   dummy.position.set(p.x,h*.19,p.z);dummy.rotation.set(0,0,0);dummy.scale.set(r*.28,h*.39,r*.28);dummy.updateMatrix();stem.push(dummy.matrix.clone());
   dummy.position.y=h*.50;dummy.rotation.y=random01(i*8+29)*3;dummy.scale.set(r,h*.73,r);dummy.updateMatrix();leaf.push(dummy.matrix.clone());
   dummy.position.y=h*.8;dummy.rotation.y=0;dummy.scale.set(r*.47,h*.3,r*.47);dummy.updateMatrix();cap.push(dummy.matrix.clone());
  }
  for(let i=0;i<OUTER_CABINS.length;i++){
   const p=OUTER_CABINS[i],w=5.8*p.size,d=5.2*p.size,h=3.8*p.size;
   dummy.position.set(p.x,h*.5,p.z);dummy.rotation.set(0,random01(i*21+3)*Math.PI*2,0);dummy.scale.set(w,h,d);dummy.updateMatrix();walls.push(dummy.matrix.clone());
   dummy.position.y=h+1.25*p.size;dummy.scale.set(w*1.18,2.7*p.size,d*1.22);dummy.updateMatrix();roof.push(dummy.matrix.clone());
   dummy.position.set(p.x,h*.6,p.z+d*.502);dummy.rotation.set(0,0,0);dummy.scale.set(w*.45,h*.31,.06);dummy.updateMatrix();glass.push(dummy.matrix.clone());
  }
  return {stem,leaf,cap,walls,roof,glass};
 },[forest]);
 useEffect(()=>{
  const group:[[T.InstancedMesh|null,T.Matrix4[]],[T.InstancedMesh|null,T.Matrix4[]],[T.InstancedMesh|null,T.Matrix4[]],[T.InstancedMesh|null,T.Matrix4[]],[T.InstancedMesh|null,T.Matrix4[]],[T.InstancedMesh|null,T.Matrix4[]]]=[
   [trunks.current,sets.stem],[needles.current,sets.leaf],[snowcaps.current,sets.cap],
   [houses.current,sets.walls],[roofs.current,sets.roof],[windows.current,sets.glass]
  ];
  group.forEach(([m,list])=>{if(!m)return;list.forEach((mat,i)=>m.setMatrixAt(i,mat));m.instanceMatrix.needsUpdate=true;m.computeBoundingSphere();});
 },[sets]);
 return <>
  <instancedMesh ref={trunks} args={[undefined,undefined,sets.stem.length]}><cylinderGeometry args={[.5,.7,1,7]}/><meshStandardMaterial color="#594a38" roughness={.95}/></instancedMesh>
  <instancedMesh ref={needles} args={[undefined,undefined,sets.leaf.length]}><coneGeometry args={[1,1,9,2]}/><meshStandardMaterial color="#245b4c" roughness={.96} flatShading/></instancedMesh>
  <instancedMesh ref={snowcaps} args={[undefined,undefined,sets.cap.length]}><coneGeometry args={[1,1,9]}/><meshStandardMaterial color="#d9edf0" roughness={.98}/></instancedMesh>
  <instancedMesh ref={houses} args={[undefined,undefined,sets.walls.length]}><boxGeometry args={[1,1,1]}/><meshStandardMaterial color="#76503d" roughness={.9}/></instancedMesh>
  <instancedMesh ref={roofs} args={[undefined,undefined,sets.roof.length]}><coneGeometry args={[.8,1,4]}/><meshStandardMaterial color="#e7f0ef" roughness={.96}/></instancedMesh>
  <instancedMesh ref={windows} args={[undefined,undefined,sets.glass.length]}><planeGeometry args={[1,1]}/><meshBasicMaterial color="#ffcf8d" toneMapped={false} side={T.DoubleSide}/></instancedMesh>
 </>;
}

function MainPaths(){
 const lanes=[
  {x:0,z:105,w:11,len:170,rotate:0},
  {x:80,z:0,w:9,len:145,rotate:Math.PI/2},
  {x:-81,z:-20,w:9,len:150,rotate:Math.PI/2},
  {x:120,z:71,w:8,len:110,rotate:0},
  {x:-118,z:80,w:7,len:105,rotate:0}
 ];
 return <>{lanes.map((v,i)=><mesh key={i} rotation={[-Math.PI/2,0,v.rotate]} position={[v.x,.015,v.z]} receiveShadow>
  <planeGeometry args={[v.w,v.len]}/><meshPhysicalMaterial color={i%2?"#b3d9dc":"#bdcbcd"} roughness={.66} metalness={.03} clearcoat={.13}/>
 </mesh>)}</>;
}

function LandmarkStructure({kind}:{kind:string}){
 const snow="#e5eef0",wood="#704938";
 if(kind==="lake")return <group>
  <mesh rotation-x={-Math.PI/2} position-y={.02}><circleGeometry args={[15,40]}/><meshPhysicalMaterial color="#a3cde2" metalness={.32} roughness={.17} clearcoat={.8}/></mesh>
  {[0,1,2,3,4].map(i=><mesh key={i} position={[Math.cos(i*1.3)*12,1.3,Math.sin(i*1.3)*12]}><icosahedronGeometry args={[1.9,0]}/><meshStandardMaterial color="#b6e4e9" transparent opacity={.75} roughness={.2}/></mesh>)}
 </group>;
 if(kind==="gateway"||kind==="airfield"||kind==="cave")return <group>
  {[-1,1].map(s=><mesh key={s} position={[s*5,5,0]} rotation-z={s*.10} castShadow><boxGeometry args={[2.3,10,2.3]}/><meshPhysicalMaterial color={kind==="cave"?"#4f7882":"#a8d8d5"} roughness={.21} metalness={.19} clearcoat={.42}/></mesh>)}
  <mesh position-y={10}><boxGeometry args={[13,2,2.3]}/><meshPhysicalMaterial color={kind==="cave"?"#4f7882":"#b7e5dd"} roughness={.27} metalness={.12}/></mesh>
  <mesh position-y={9.1}><boxGeometry args={[8.4,.16,.5]}/><meshBasicMaterial color={kind==="airfield"?"#ffde93":"#7be2cd"} toneMapped={false}/></mesh>
  <mesh position-y={3.7}><sphereGeometry args={[2.1,16,12]}/><meshBasicMaterial color={kind==="cave"?"#559cae":"#77c8e2"} transparent opacity={.23} depthWrite={false}/></mesh>
 </group>;
 if(kind==="square")return <group>
  <mesh position-y={7.7}><coneGeometry args={[4.4,15,9]}/><meshStandardMaterial color="#1c6656" roughness={.9}/></mesh>
  {[0,1,2,3].map(i=><mesh key={i} position-y={3.3+i*3}><torusGeometry args={[4.4-i*.65,.08,6,28]}/><meshBasicMaterial color={i%2?"#f7da8f":"#ff9280"} toneMapped={false}/></mesh>)}
  <mesh position-y={16}><octahedronGeometry args={[1]}/><meshBasicMaterial color="#fff6a1" toneMapped={false}/></mesh>
  <pointLight position={[0,14,0]} distance={30} intensity={18} color="#fff1b6"/>
 </group>;
 return <group>
  <mesh castShadow position-y={3.2}><boxGeometry args={[12,6.4,9]}/><meshStandardMaterial color={kind==="ranch"?"#835943":kind==="workshop"?"#56676f":wood} roughness={.88}/></mesh>
  {[-1,1].map(s=><mesh key={s} castShadow position={[s*2.75,7.2,0]} rotation-z={s*.47}><boxGeometry args={[6.9,.65,11]}/><meshStandardMaterial color={snow} roughness={.92}/></mesh>)}
  <mesh position={[0,2.3,4.53]}><boxGeometry args={[3.3,4.2,.2]}/><meshStandardMaterial color="#34484d" roughness={.8}/></mesh>
  {[-4,4].map(x=><mesh key={x} position={[x,3.8,4.55]}><boxGeometry args={[1.5,1.55,.1]}/><meshBasicMaterial color="#ffdb98" toneMapped={false}/></mesh>)}
  <mesh position={[2,8.6,-2.7]}><boxGeometry args={[1.1,3.3,1.1]}/><meshStandardMaterial color="#827c77"/></mesh>
 </group>;
}
function Landmarks(){
 return <>{LANDMARKS.map((p,i)=><group key={p.id} position={[p.x,0,p.z]}>
  <LandmarkStructure kind={p.kind}/>
  <mesh position-y={p.kind==="square"?19:13}><octahedronGeometry args={[1,.0]}/><meshBasicMaterial color={p.kind==="airfield"?"#ffde97":"#a5f4de"} toneMapped={false}/></mesh>
  <Text fontSize={2.1} anchorX="center" anchorY="middle" position={[0,17+(p.kind==="square"?4:0),0]} color="#f7ead1" outlineWidth={.07} outlineColor="#163943">{p.name.toUpperCase()}</Text>
  {i%3===0&&<pointLight color="#ffcd8d" position={[2,6,5]} intensity={8} distance={17}/>}
 </group>)}</>;
}

function CollectibleProps({game}:{game:SoloGame}){
 const count=useSyncExternalStore(game.subscribe,()=>game.foundPresents.size,()=>0);
 const boxes=useRef<T.InstancedMesh>(null),ribbons=useRef<T.InstancedMesh>(null);
 useEffect(()=>{
  const o=new T.Object3D();
  LOST_PRESENTS.forEach((v,i)=>{
   const hidden=game.foundPresents.has(v.id);
   const scale=hidden?0.0001:v.type==="golden"?1.05:.58;
   o.position.set(v.x,.68,v.z);o.rotation.y=random01(i*34+11)*6.28;o.scale.set(scale,scale,scale);o.updateMatrix();boxes.current?.setMatrixAt(i,o.matrix);
   o.position.y=.68;o.scale.set(scale*.19,scale*1.09,scale*1.04);o.updateMatrix();ribbons.current?.setMatrixAt(i,o.matrix);
  });
  [boxes.current,ribbons.current].forEach(m=>{if(m){m.instanceMatrix.needsUpdate=true;m.computeBoundingSphere();}});
 },[count,game]);
 return <>
  <instancedMesh ref={boxes} args={[undefined,undefined,LOST_PRESENTS.length]}><boxGeometry args={[1,1,1]}/><meshPhysicalMaterial color="#b73543" metalness={.13} roughness={.36} clearcoat={.45}/></instancedMesh>
  <instancedMesh ref={ribbons} args={[undefined,undefined,LOST_PRESENTS.length]}><boxGeometry args={[1,1,1]}/><meshStandardMaterial color="#e9c877" metalness={.5}/></instancedMesh>
 </>;
}

function VehicleRender({vehicle}:{vehicle:VehicleState}){
 const rig=useRef<T.Group>(null);
 const spec=VEHICLE_CATALOG.find(s=>s.id===vehicle.id)!;
 useFrame((_,dt)=>{if(!rig.current)return;
  rig.current.position.lerp(new T.Vector3(vehicle.x,.2,vehicle.z),1-Math.exp(-dt*16));
  rig.current.rotation.y=T.MathUtils.damp(rig.current.rotation.y,vehicle.heading,12,dt);
  rig.current.rotation.z=T.MathUtils.damp(rig.current.rotation.z,-Math.min(1,vehicle.speed/20)*.035,5,dt);
 });
 const van=spec.kind==="gift-van"||spec.kind==="polar-truck";
 return <group ref={rig} position={[vehicle.x,.2,vehicle.z]}>
  <mesh castShadow position={[0,.77,.05]}><boxGeometry args={van?[2.8,1.3,5.0]:[1.65,.67,3.4]}/><meshPhysicalMaterial color={spec.color} roughness={.37} metalness={.23} clearcoat={.49}/></mesh>
  {van?<mesh position={[0,2,.55]} castShadow><boxGeometry args={[2.65,1.45,3.5]}/><meshPhysicalMaterial color={spec.color} roughness={.57}/></mesh>:
   <mesh position={[0,1.34,.75]} castShadow rotation-x={-.2}><boxGeometry args={[1.35,.23,1.3]}/><meshStandardMaterial color="#1a2934" roughness={.55}/></mesh>}
  <mesh position={[0,1.4,-1]}><boxGeometry args={[van?2.2:1.15,van?.8:.22,.18]}/><meshPhysicalMaterial color="#8cb6bd" metalness={.3} roughness={.18} clearcoat={.66}/></mesh>
  {[-1,1].map(s=><group key={s}>
    {[-1.15,1.22].map(z=><mesh key={z} position={[s*(van?1.28:.85),.4,z]} rotation-z={Math.PI/2}>
      <cylinderGeometry args={[.38,.38,.22,12]}/><meshStandardMaterial color="#1e2227" roughness={.91}/>
    </mesh>)}
    <mesh position={[s*.52,.8,-1.7]}><boxGeometry args={[.32,.18,.08]}/><meshBasicMaterial color="#ffe9ae" toneMapped={false}/></mesh>
    <mesh position={[s*.52,.79,van?2.61:1.75]}><boxGeometry args={[.30,.16,.07]}/><meshBasicMaterial color="#f65b58" toneMapped={false}/></mesh>
    {!van&&<mesh position={[s*.92,.14,.05]}><boxGeometry args={[.1,.12,4.15]}/><meshStandardMaterial color="#d4b46e" metalness={.62}/></mesh>}
  </group>)}
  <mesh position={[0,van?3.0:1.6,.1]}><boxGeometry args={[.52,.16,.46]}/><meshBasicMaterial color="#f4dba7" toneMapped={false}/></mesh>
 </group>;
}

export default function NorthPoleDistrict({game,lowPower}:{game:SoloGame;lowPower:boolean}){
 return <>
  <MainPaths/>
  <ForestAndCabins mobile={lowPower}/>
  <Landmarks/>
  <CollectibleProps game={game}/>
  {game.vehicles.list.map(v=><VehicleRender key={v.id} vehicle={v}/>)}
 </>;
}
