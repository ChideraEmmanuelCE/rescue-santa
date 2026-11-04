"use client";

import {useEffect,useMemo,useRef,useState,useSyncExternalStore} from "react";
import {useFrame,useThree} from "@react-three/fiber";
import {Float,Stars,Text} from "@react-three/drei";
import * as T from "three";
import SoloGame from "@/lib/SoloGame";
import {InputController} from "@/lib/InputController";
import type {GameEvent} from "@/lib/protocol";
import {CITY_CRUISE_ALTITUDE,CITY_LENGTH,CITY_SPEED,CITY_TARGETS,random01,type CityTarget} from "@/lib/world";
import {FlyingSleigh} from "./SkyChapter";

const roadEnd=-CITY_LENGTH/2;
const cream="#f8dca5";
const coatColors=["#974d45","#284e68","#687a76","#b49d84","#2e424b","#6d5667"];
const box=(w:number,h:number,d:number)=>[w,h,d] as [number,number,number];

type Tower={x:number;z:number;w:number;d:number;h:number;style:number;seed:number};
function generateTowers(mobile:boolean){
 const towers:Tower[]=[];
 for(let i=0;i<40;i++)for(const side of [-1,1])for(let row=0;row<(mobile?2:3);row++){
   const seed=i*137+row*23+(side===1?5:71);
   const x=side*(35+row*23+(random01(seed+5)-.5)*8);
   const z=42-i*30+(random01(seed+2)-.5)*7;
   if(row===0&&CITY_TARGETS.some(t=>t.kind==="roof"&&Math.abs(t.z-z)<24&&Math.abs(t.x-x)<28))continue;
   const h=(row===0?17:29)+random01(seed+11)*(row===2?54:41);
   towers.push({x,z,w:12+random01(seed+13)*6,d:12+random01(seed+21)*8,h,style:Math.floor(random01(seed+38)*3),seed});
 }
 return towers;
}
function BuildingBlocks({lowPower}:{lowPower:boolean}){
 const facades=useRef<(T.InstancedMesh|null)[]>([]);
 const amber=useRef<T.InstancedMesh>(null),blue=useRef<T.InstancedMesh>(null);
 const source=useMemo(()=>{
   const towers=generateTowers(lowPower);
   const types=[[],[],[]] as T.Matrix4[][];
   const warm:T.Matrix4[]=[],cool:T.Matrix4[]=[];
   const dummy=new T.Object3D();
   for(const b of towers){
     dummy.position.set(b.x,b.h/2,b.z);dummy.rotation.set(0,0,0);dummy.scale.set(b.w,b.h,b.d);dummy.updateMatrix();
     types[b.style].push(dummy.matrix.clone());
     const vertical=Math.floor((b.h-3)/3.4),slots=lowPower?2:3;
     for(let floor=1;floor<vertical;floor++)for(let col=0;col<slots;col++){
       const lit=random01(b.seed*2+floor*31+col*7);
       if(lit<.35)continue;
       const y=2.3+floor*3.35;
       const offset=(col-(slots-1)/2)*b.w/(slots+.5);
       const glow=lit>.72?warm:cool;
       const sides=lowPower?1:2;
       for(let face=0;face<sides;face++){
         const x=face?b.x+offset:b.x-Math.sign(b.x)*(b.w/2+.035);
         const z=face?b.z+Math.sign(b.z||1)*(b.d/2+.04):b.z+offset;
         dummy.position.set(x,y,z);
         dummy.rotation.set(0,face?(b.z>0?0:Math.PI):b.x>0?-Math.PI/2:Math.PI/2,0);
         dummy.scale.set(Math.min(1.55,b.w/slots*.64),1.25,1);dummy.updateMatrix();
         glow.push(dummy.matrix.clone());
       }
     }
   }
   return {types,warm,cool};
 },[lowPower]);
 useEffect(()=>{
   source.types.forEach((mats,j)=>{const m=facades.current[j];if(!m)return;mats.forEach((matrix,i)=>m.setMatrixAt(i,matrix));m.instanceMatrix.needsUpdate=true;m.computeBoundingSphere();});
   for(const [m,mats] of [[amber.current,source.warm],[blue.current,source.cool]] as const){
     if(!m)continue;mats.forEach((mat,i)=>m.setMatrixAt(i,mat));m.instanceMatrix.needsUpdate=true;m.computeBoundingSphere();
   }
 },[source]);
 return <>
   {source.types.map((items,j)=><instancedMesh key={j} ref={v=>{facades.current[j]=v;}} args={[undefined,undefined,items.length]} receiveShadow>
     <boxGeometry args={[1,1,1]}/>
     <meshStandardMaterial color={["#5c6d7e","#987b6b","#526478"][j]} roughness={.77} metalness={.13}/>
   </instancedMesh>)}
   <instancedMesh ref={amber} args={[undefined,undefined,source.warm.length]}><planeGeometry args={[1,1]}/><meshBasicMaterial color="#ffcb79" toneMapped={false} side={T.DoubleSide}/></instancedMesh>
   <instancedMesh ref={blue} args={[undefined,undefined,source.cool.length]}><planeGeometry args={[1,1]}/><meshBasicMaterial color="#94c7dd" toneMapped={false} side={T.DoubleSide}/></instancedMesh>
 </>;
}

const laneMarks=Array.from({length:145},(_,i)=>({x:i%2?-5.6:5.6,z:62-i*9}));
const crossing=Array.from({length:11*12},(_,i)=>({x:(i%12-5.5)*2.35,z:-43-Math.floor(i/12)*102}));
const lights=Array.from({length:74},(_,i)=>({x:i%2?14.2:-14.2,z:58-Math.floor(i/2)*32}));
const blockProps=[-1,1];

function Roadway(){
 const lane=useRef<T.InstancedMesh>(null),cross=useRef<T.InstancedMesh>(null),posts=useRef<T.InstancedMesh>(null),bulbs=useRef<T.InstancedMesh>(null);
 const arrays=useMemo(()=>{
   const dummy=new T.Object3D();
   const matr=(list:{x:number;z:number}[],y:number,s:[number,number,number])=>list.map(p=>{
     dummy.position.set(p.x,y,p.z);dummy.rotation.set(0,0,0);dummy.scale.set(...s);dummy.updateMatrix();return dummy.matrix.clone();
   });
   return {
     marks:matr(laneMarks,.064,[.13,.01,3.65]),
     cross:matr(crossing,.075,[1.5,.014,5.1]),
     pole:matr(lights,2.7,[.11,5.4,.11]),
     bulb:matr(lights,5.55,[.38,.24,.38])
   };
 },[]);
 useEffect(()=>{
   const pairs:[[T.InstancedMesh|null,T.Matrix4[]],[T.InstancedMesh|null,T.Matrix4[]],[T.InstancedMesh|null,T.Matrix4[]],[T.InstancedMesh|null,T.Matrix4[]]]=[
     [lane.current,arrays.marks],[cross.current,arrays.cross],[posts.current,arrays.pole],[bulbs.current,arrays.bulb]
   ];
   pairs.forEach(([mesh,mats])=>{if(!mesh)return;mats.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();});
 },[arrays]);
 return <>
   <mesh rotation-x={-Math.PI/2} position={[0,-.17,roadEnd]} receiveShadow><planeGeometry args={[240,CITY_LENGTH+280]}/><meshStandardMaterial color="#8796a0" roughness={.88}/></mesh>
   <mesh rotation-x={-Math.PI/2} position={[0,.005,roadEnd]} receiveShadow><planeGeometry args={[28,CITY_LENGTH+170]}/><meshPhysicalMaterial color="#253545" metalness={.12} roughness={.48} clearcoat={.58} clearcoatRoughness={.32}/></mesh>
   {blockProps.map(s=><group key={s}>
     <mesh rotation-x={-Math.PI/2} position={[s*23,.03,roadEnd]} receiveShadow><planeGeometry args={[18,CITY_LENGTH+180]}/><meshStandardMaterial color="#b2bec4" roughness={.91}/></mesh>
     <mesh position={[s*14.1,.16,roadEnd]}><boxGeometry args={[.32,.3,CITY_LENGTH+180]}/><meshStandardMaterial color="#75868d" roughness={.8}/></mesh>
     <mesh position={[s*32.3,.15,roadEnd]}><boxGeometry args={[.22,.28,CITY_LENGTH+180]}/><meshStandardMaterial color="#ced6d7" roughness={.8}/></mesh>
   </group>)}
   {Array.from({length:11},(_,i)=><group key={i} position={[0,0,-43-i*102]}>
     <mesh position-y={-.005} rotation-x={-Math.PI/2}><planeGeometry args={[240,17]}/><meshPhysicalMaterial color="#334653" roughness={.62} clearcoat={.25}/></mesh>
     <mesh position-y={.015}><boxGeometry args={[25,.05,.3]}/><meshStandardMaterial color="#d0d4ce"/></mesh>
   </group>)}
   <instancedMesh ref={lane} args={[undefined,undefined,arrays.marks.length]}><boxGeometry args={[1,1,1]}/><meshBasicMaterial color="#d0d6d1" transparent opacity={.6}/></instancedMesh>
   <instancedMesh ref={cross} args={[undefined,undefined,arrays.cross.length]}><boxGeometry args={[1,1,1]}/><meshBasicMaterial color="#d4d7d1" transparent opacity={.83}/></instancedMesh>
   <instancedMesh ref={posts} args={[undefined,undefined,arrays.pole.length]}><cylinderGeometry args={[.5,.7,1,7]}/><meshStandardMaterial color="#3a4651" metalness={.65} roughness={.4}/></instancedMesh>
   <instancedMesh ref={bulbs} args={[undefined,undefined,arrays.bulb.length]}><sphereGeometry args={[1,8,6]}/><meshBasicMaterial color="#ffe5b0" toneMapped={false}/></instancedMesh>
 </>;
}

function Traffic({mobile}:{mobile:boolean}){
 const count=mobile?27:52;
 const body=useRef<T.InstancedMesh>(null),tops=useRef<T.InstancedMesh>(null),heads=useRef<T.InstancedMesh>(null),tails=useRef<T.InstancedMesh>(null);
 const cars=useMemo(()=>Array.from({length:count},(_,i)=>({
   x:[-10,-4,4,10][i%4],
   z:55-random01(i*9+35)*(CITY_LENGTH+105),
   dir:i%4<2?-1:1,
   speed:7+random01(i*13+7)*8,
   color:coatColors[(i*3+1)%coatColors.length]
 })),[count]);
 const dummy=useMemo(()=>new T.Object3D(),[]);
 useEffect(()=>{const m=body.current;if(!m)return;cars.forEach((c,i)=>m.setColorAt(i,new T.Color(c.color)));if(m.instanceColor)m.instanceColor.needsUpdate=true;},[cars]);
 useFrame((_,dt)=>{
   cars.forEach((c,i)=>{
     c.z+=c.dir*c.speed*Math.min(dt,.065);
     if(c.z>85)c.z=-CITY_LENGTH-75;
     if(c.z<-CITY_LENGTH-75)c.z=85;
     const yaw=c.dir===1?Math.PI:0;
     dummy.rotation.set(0,yaw,0);
     dummy.position.set(c.x,.84,c.z);dummy.scale.set(1.8,.77,4);dummy.updateMatrix();body.current?.setMatrixAt(i,dummy.matrix);
     dummy.position.y=1.44;dummy.scale.set(1.55,.55,2.17);dummy.updateMatrix();tops.current?.setMatrixAt(i,dummy.matrix);
     for(const s of [-1,1]){
       const k=i*2+(s===1?1:0);
       dummy.position.set(c.x+s*.66,.74,c.z+(c.dir===1?1:-1)*2.1);dummy.scale.set(.26,.19,.13);dummy.updateMatrix();heads.current?.setMatrixAt(k,dummy.matrix);
       dummy.position.set(c.x+s*.66,.74,c.z-(c.dir===1?1:-1)*2.1);dummy.scale.set(.3,.17,.11);dummy.updateMatrix();tails.current?.setMatrixAt(k,dummy.matrix);
     }
   });
   [body.current,tops.current,heads.current,tails.current].forEach(m=>{if(m)m.instanceMatrix.needsUpdate=true;});
 });
 return <>
   <instancedMesh ref={body} args={[undefined,undefined,count]} castShadow><boxGeometry args={[1,1,1]}/><meshStandardMaterial color="#ffffff" roughness={.36} metalness={.38}/></instancedMesh>
   <instancedMesh ref={tops} args={[undefined,undefined,count]}><boxGeometry args={[1,1,1]}/><meshPhysicalMaterial color="#1a303d" roughness={.18} metalness={.58} clearcoat={.75}/></instancedMesh>
   <instancedMesh ref={heads} args={[undefined,undefined,count*2]}><boxGeometry args={[1,1,1]}/><meshBasicMaterial color="#fff6cb" toneMapped={false}/></instancedMesh>
   <instancedMesh ref={tails} args={[undefined,undefined,count*2]}><boxGeometry args={[1,1,1]}/><meshBasicMaterial color="#ec3b44" toneMapped={false}/></instancedMesh>
 </>;
}

function Pedestrians({mobile}:{mobile:boolean}){
 const count=mobile?62:116;
 const bodies=useRef<T.InstancedMesh>(null),heads=useRef<T.InstancedMesh>(null);
 const people=useMemo(()=>Array.from({length:count},(_,i)=>({
   x:(i%2?1:-1)*(17+random01(i*29+3)*9),
   z:42-random01(i*13+9)*(CITY_LENGTH+70),
   dir:i%3===0?-1:1,
   speed:.4+random01(i*3+13)*.85
 })),[count]);
 const dummy=useMemo(()=>new T.Object3D(),[]);
 useEffect(()=>{
   const mesh=bodies.current;if(!mesh)return;
   for(let i=0;i<count;i++)mesh.setColorAt(i,new T.Color(coatColors[(i+3)%coatColors.length]));
   if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
 },[count]);
 useFrame(({clock},dt)=>{
   people.forEach((p,i)=>{
     p.z+=p.dir*p.speed*Math.min(dt,.06);
     if(p.z>70)p.z=-CITY_LENGTH-60;
     if(p.z<-CITY_LENGTH-60)p.z=70;
     const bounce=Math.abs(Math.sin(clock.elapsedTime*4+p.x))*0.045;
     dummy.position.set(p.x,1.22+bounce,p.z);dummy.rotation.set(0,0,0);dummy.scale.set(.5,1.4,.45);dummy.updateMatrix();bodies.current?.setMatrixAt(i,dummy.matrix);
     dummy.position.set(p.x,2.1+bounce,p.z);dummy.scale.set(.31,.31,.31);dummy.updateMatrix();heads.current?.setMatrixAt(i,dummy.matrix);
   });
   if(bodies.current)bodies.current.instanceMatrix.needsUpdate=true;
   if(heads.current)heads.current.instanceMatrix.needsUpdate=true;
 });
 return <>
   <instancedMesh ref={bodies} args={[undefined,undefined,count]}><capsuleGeometry args={[.5,1,3,6]}/><meshStandardMaterial vertexColors={false} color="#ffffff" roughness={.9}/></instancedMesh>
   <instancedMesh ref={heads} args={[undefined,undefined,count]}><sphereGeometry args={[1,8,6]}/><meshStandardMaterial color="#c8a996" roughness={.95}/></instancedMesh>
 </>;
}

function FestivePine({x,z,h=5}:{x:number;z:number;h?:number}){
 return <group position={[x,0,z]}>
   <mesh position-y={h*.15}><cylinderGeometry args={[.14,.2,h*.3,6]}/><meshStandardMaterial color="#594732"/></mesh>
   {[0,1,2].map(i=><mesh key={i} position-y={h*(.35+i*.18)} castShadow><coneGeometry args={[h*(.22-i*.045),h*.48,8]}/><meshStandardMaterial color={i%2?"#194c4b":"#23615a"} roughness={.9}/></mesh>)}
   <mesh position-y={h*.98}><coneGeometry args={[.42,.5,6]}/><meshStandardMaterial color="#edf6f3" roughness={.9}/></mesh>
 </group>;
}
function HolidayDecor({lowPower}:{lowPower:boolean}){
 const trees=useMemo(()=>Array.from({length:76},(_,i)=>({
   x:i%2?29:-29,z:60-Math.floor(i/2)*31,h:3.6+random01(i*7+8)*1.6
 })),[]);
 return <>
   {trees.filter((_,i)=>!lowPower||i%2===0).map((p,i)=><FestivePine key={i} {...p}/>)}
   <group position={[0,0,-551]}>
     <mesh position-y={8.5} castShadow><coneGeometry args={[6.8,16,12]}/><meshStandardMaterial color="#16584b" roughness={.88}/></mesh>
     {[0,1,2,3,4].map(i=><mesh key={i} position-y={3.6+i*2.3}><torusGeometry args={[5.5-i*.76,.13,8,32]}/><meshBasicMaterial color={i%2?"#df7d4a":"#ffcf76"} toneMapped={false}/></mesh>)}
     <mesh position-y={17.2}><octahedronGeometry args={[1.35]}/><meshBasicMaterial color="#ffedb3" toneMapped={false}/></mesh>
     <pointLight position-y={17.4} intensity={25} distance={45} color="#ffe9a8"/>
   </group>
   {[-1,1].map(s=><group key={s} position={[s*12.8,0,-554]}>
     <mesh position-y={4}><cylinderGeometry args={[.2,.26,8,7]}/><meshStandardMaterial color="#48555a"/></mesh>
     <mesh position-y={8.1}><boxGeometry args={[3,.32,.3]}/><meshBasicMaterial color="#e9c781"/></mesh>
   </group>)}
 </>;
}

function DeliveryZone({target,delivered}:{target:CityTarget;delivered:boolean}){
 const pulse=useRef<T.Group>(null);
 useFrame(({clock})=>{
   if(!pulse.current)return;
   const s=1+Math.sin(clock.elapsedTime*3.7+target.id)*.09;
   pulse.current.scale.set(s,1,s);
 });
 const roof=target.kind==="roof";
 return <group position={[target.x,0,target.z]}>
   {roof&&<group>
     <mesh castShadow position-y={target.y/2}><boxGeometry args={[17.5,target.y,18]}/><meshStandardMaterial color="#697785" metalness={.16} roughness={.7}/></mesh>
     <mesh receiveShadow position-y={target.y+.13}><boxGeometry args={[18.5,.26,19]}/><meshPhysicalMaterial color="#9daeb6" roughness={.48} clearcoat={.33}/></mesh>
     <mesh position={[0,target.y+1,8.4]}><boxGeometry args={[7,2.1,.3]}/><meshStandardMaterial color="#3c4f5d"/></mesh>
   </group>}
   {!delivered&&<group ref={pulse} position-y={target.y+.34}>
     <mesh rotation-x={-Math.PI/2}><ringGeometry args={[target.radius*.63,target.radius*.7,48]}/><meshBasicMaterial color="#ffde8c" transparent opacity={.7} side={T.DoubleSide} toneMapped={false}/></mesh>
     <mesh rotation-x={-Math.PI/2} position-y={.04}><ringGeometry args={[2.3,2.6,32]}/><meshBasicMaterial color="#9df0df" toneMapped={false} side={T.DoubleSide}/></mesh>
     <mesh position-y={4.2}><coneGeometry args={[1.0,2.5,6]}/><meshBasicMaterial color="#fff0b0" transparent opacity={.72} toneMapped={false}/></mesh>
   </group>}
   {!delivered&&<Text position={[0,target.y+7.2,0]} rotation-y={0} fontSize={1.75} color={cream} anchorX="center" anchorY="middle" outlineWidth={.055} outlineColor="#183744">{target.name.toUpperCase()}</Text>}
   {delivered&&<mesh rotation-x={-Math.PI/2} position-y={target.y+.34}><ringGeometry args={[2.1,2.55,24]}/><meshBasicMaterial color="#8bdbba" side={T.DoubleSide}/></mesh>}
 </group>;
}

function CityTargets({game}:{game:SoloGame}){
 useSyncExternalStore(game.subscribe,()=>game.round.cityDelivered,()=>0);
 return <>{CITY_TARGETS.map(target=><DeliveryZone key={target.id} target={target} delivered={game.cityDeliveredTargets.has(target.id)}/>)}</>;
}

type PresentEvent=Extract<GameEvent,{type:"presentDrop"}>&{created:number};
function FallingGift({gift,game,done}:{gift:PresentEvent;game:SoloGame;done:(id:number)=>void}){
 const ref=useRef<T.Group>(null),finished=useRef(false);
 useFrame(()=>{
   const t=T.MathUtils.clamp((game.now()-gift.created)/gift.flightMs,0,1);
   if(ref.current){
     const seconds=(gift.flightMs/1000)*t;
     ref.current.position.set(T.MathUtils.lerp(gift.x,gift.impactX,t),Math.max(gift.impactY,gift.y-4.905*seconds*seconds),T.MathUtils.lerp(gift.z,gift.impactZ,t));
     ref.current.rotation.y=t*9;
     ref.current.rotation.z=t*6;
   }
   if(t>=1&&!finished.current){finished.current=true;done(gift.key);}
 });
 return <group ref={ref} position={[gift.x,gift.y,gift.z]}>
   <mesh castShadow><boxGeometry args={[1.45,1.45,1.45]}/><meshPhysicalMaterial color="#bd3543" metalness={.18} roughness={.35} clearcoat={.42}/></mesh>
   <mesh><boxGeometry args={[.22,1.5,1.52]}/><meshStandardMaterial color="#e8bd6c" metalness={.6}/></mesh>
   <mesh><boxGeometry args={[1.52,1.5,.22]}/><meshStandardMaterial color="#e8bd6c" metalness={.6}/></mesh>
   <mesh position-y={.83}><boxGeometry args={[1.62,.18,1.62]}/><meshStandardMaterial color="#e8bd6c" metalness={.55}/></mesh>
   <pointLight intensity={4} distance={6} color="#ffe7aa"/>
 </group>;
}
function FallingGifts({game}:{game:SoloGame}){
 const [items,setItems]=useState<PresentEvent[]>([]);
 useEffect(()=>game.onEvent(e=>{
   if(e.type==="presentDrop")setItems(previous=>[...previous.slice(-20),{...e,created:game.now()}]);
 }),[game]);
 return <>{items.map(g=><FallingGift key={g.key} gift={g} game={game} done={key=>setItems(old=>old.filter(v=>v.key!==key))}/>)}</>;
}

function SnowInMotion({lowPower,game}:{lowPower:boolean;game:SoloGame}){
 const group=useRef<T.Group>(null),mesh=useRef<T.Points>(null);
 const count=lowPower?390:980;
 const values=useMemo(()=>{
   const p=new Float32Array(count*3);
   for(let i=0;i<count;i++){p[i*3]=(random01(i*5+7)-.5)*90;p[i*3+1]=(random01(i*17+6)-.5)*65;p[i*3+2]=(random01(i*11+9)-.5)*120;}
   return p;
 },[count]);
 useFrame((_,dt)=>{
   if(group.current)group.current.position.set(game.round.cityX,CITY_CRUISE_ALTITUDE+game.round.cityAltitude,-game.round.cityDistance);
   const a=mesh.current?.geometry.getAttribute("position") as T.BufferAttribute|undefined;
   if(!a)return;
   for(let i=0;i<count;i++){
     let x=a.getX(i)+dt*.8,y=a.getY(i)-dt*(3+i%5),z=a.getZ(i)+dt*.65;
     if(x>45)x=-45;if(y< -34)y=34;if(z>60)z=-60;
     a.setXYZ(i,x,y,z);
   }
   a.needsUpdate=true;
 });
 return <group ref={group}><points ref={mesh} frustumCulled={false}>
   <bufferGeometry><bufferAttribute attach="attributes-position" args={[values,3]}/></bufferGeometry>
   <pointsMaterial size={.19} color="#e4f5fc" transparent opacity={.8} depthWrite={false} sizeAttenuation/>
 </points></group>;
}

function CityFollow({game,input,lowPower}:{game:SoloGame;input:InputController;lowPower:boolean}){
 const {camera}=useThree();
 const sleigh=useRef<T.Group>(null),focus=useRef(new T.Vector3());
 const desired=useMemo(()=>new T.Vector3(),[]);
 const center=useMemo(()=>new T.Vector3(),[]);
 const entry=useRef(game.now());
 useFrame((_,dt)=>{
   game.setCitySteering(input.getMovement().x,input.getMovement().z);
   game.advance(dt);
   const r=game.round;
   const altitude=CITY_CRUISE_ALTITUDE+r.cityAltitude;
   const bob=Math.sin(game.now()*.0046)*.22;
   center.set(r.cityX,altitude+bob,-r.cityDistance);
   if(sleigh.current){
     sleigh.current.position.lerp(center,1-Math.exp(-dt*6));
     sleigh.current.rotation.z=T.MathUtils.damp(sleigh.current.rotation.z,-input.getMovement().x*.15,5,dt);
     sleigh.current.rotation.x=T.MathUtils.damp(sleigh.current.rotation.x,-input.getMovement().z*.05,5,dt);
   }
   const cinematic=T.MathUtils.smoothstep((game.now()-entry.current)/1000,0,5);
   desired.set(center.x+T.MathUtils.lerp(27,9.5,cinematic),center.y+T.MathUtils.lerp(15,6.3,cinematic),center.z+T.MathUtils.lerp(35,22,cinematic));
   camera.position.lerp(desired,1-Math.exp(-dt*2.8));
   focus.current.lerp(new T.Vector3(center.x,center.y-8,center.z-35),1-Math.exp(-dt*3.6));
   camera.lookAt(focus.current);
   if(camera instanceof T.PerspectiveCamera){
     const fov=lowPower?65:62;
     camera.fov=T.MathUtils.damp(camera.fov,fov,3,dt);camera.updateProjectionMatrix();
   }
 });
 return <group ref={sleigh} position={[0,CITY_CRUISE_ALTITUDE,0]}><FlyingSleigh/></group>;
}

export default function CityChapter({game,input,lowPower}:{game:SoloGame;input:InputController;lowPower:boolean}){
 return <>
   <color attach="background" args={["#102538"]}/>
   <fogExp2 attach="fog" args={["#567c90",.0036]}/>
   <hemisphereLight args={["#a6c4dc","#1a303d",2.15]}/>
   <ambientLight intensity={.3}/>
   <directionalLight position={[-22,105,-60]} intensity={1.65} color="#b9d1ff"/>
   <Stars radius={500} depth={120} count={lowPower?380:950} factor={2} saturation={.2} fade/>
   <mesh position={[-90,110,-510]}><sphereGeometry args={[15,24,16]}/><meshBasicMaterial color="#dce9e2"/></mesh>
   <Roadway/>
   <BuildingBlocks lowPower={lowPower}/>
   <Traffic mobile={lowPower}/>
   <Pedestrians mobile={lowPower}/>
   <HolidayDecor lowPower={lowPower}/>
   <CityTargets game={game}/>
   <CityFollow game={game} input={input} lowPower={lowPower}/>
   <FallingGifts game={game}/>
   <SnowInMotion lowPower={lowPower} game={game}/>
   <pointLight position={[0,32,-520]} color="#9ac3ff" intensity={70} distance={135}/>
 </>;
}
