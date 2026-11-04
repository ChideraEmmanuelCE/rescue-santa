"use client";

import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import type { MutableRefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { CuboidCollider, Physics, RigidBody } from "@react-three/rapier";
import { Float, Stars, Text } from "@react-three/drei";
import * as THREE from "three";
import { InputController } from "@/lib/InputController";
import SoloGame from "@/lib/SoloGame";
import { random01, VILLAGE_GIFTS } from "@/lib/world";
import SantaRig from "./SantaRig";
import { LocalPlayer } from "./Player";

const red = "#9e2635", gold = "#d9b66c", timber = "#63412d";

/** The two original North Pole characters really board the same 3D sleigh. */
export function FlyingSleigh() {
  const reins = useMemo(() => [-1, 1], []);
  const reindeer = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (reindeer.current) reindeer.current.position.y = Math.sin(clock.elapsedTime * 9) * .16;
  });
  return <group>
    {reins.map(side => <group key={side} position={[side * .92, 0, 0]}>
      <mesh position={[0,.17,.2]} castShadow><boxGeometry args={[.105,.16,4.6]}/><meshStandardMaterial color={gold} metalness={.72} roughness={.25}/></mesh>
      <mesh position={[0,.22,-2.02]} rotation-x={-.48} castShadow><boxGeometry args={[.105,.66,.14]}/><meshStandardMaterial color={gold} metalness={.7}/></mesh>
      <mesh position={[0,.62,0]}><boxGeometry args={[.12,.7,.15]}/><meshStandardMaterial color={gold}/></mesh>
      <mesh position={[0,.95,-.1]} castShadow><boxGeometry args={[.13,.8,3.65]}/><meshStandardMaterial color={red} metalness={.18} roughness={.32}/></mesh>
    </group>)}
    <mesh position={[0,.94,.2]} castShadow receiveShadow><boxGeometry args={[1.94,.28,3.3]}/><meshStandardMaterial color={timber} roughness={.56}/></mesh>
    <mesh position={[0,1.37,1.72]} castShadow><boxGeometry args={[2.05,1.07,.19]}/><meshStandardMaterial color={red} metalness={.16} roughness={.36}/></mesh>
    <mesh position={[0,1.25,-1.47]} castShadow><boxGeometry args={[2.02,.61,.2]}/><meshStandardMaterial color={red}/></mesh>
    {[-1,1].map(side=><mesh key={side} position={[side*.95,1.25,.2]} castShadow><boxGeometry args={[.12,.49,3.4]}/><meshStandardMaterial color={red}/></mesh>)}
    <mesh position={[0,1.92,1.85]}><boxGeometry args={[1.33,.075,.09]}/><meshStandardMaterial color={gold} metalness={.8}/></mesh>
    <group position={[-.49,1.08,.48]} rotation-y={.11}><SantaRig height={1.55}/></group>
    <group position={[.54,1.08,-.33]} rotation-y={-.08}><SantaRig height={1.45}/></group>
    <group ref={reindeer}>
      {[-.8,.8].map((x,i)=><group key={i} position={[x,.5,-6.25]}>
        <mesh castShadow position={[0,.45,0]} scale={[.59,.55,.95]}><sphereGeometry args={[1,16,12]}/><meshStandardMaterial color="#754638" roughness={.92}/></mesh>
        <mesh position={[0,.96,-.72]} rotation-x={-.26} castShadow><cylinderGeometry args={[.25,.34,1.26,10]}/><meshStandardMaterial color="#754638"/></mesh>
        <mesh position={[0,1.49,-1]} castShadow scale={[.32,.33,.44]}><sphereGeometry args={[1,16,12]}/><meshStandardMaterial color="#865340"/></mesh>
        <mesh position={[0,1.47,-1.41]} scale={[.11,.1,.12]}><sphereGeometry args={[1,12,8]}/><meshStandardMaterial color={i===0?"#ff475d":"#39352c"} emissive={i===0?"#ff2b47":"#000000"} emissiveIntensity={i===0?2:0}/></mesh>
        {[-1,1].map(s=><group key={s}>
          <mesh position={[s*.27,.19,.47]} rotation-z={s*.2}><cylinderGeometry args={[.085,.095,.9,8]}/><meshStandardMaterial color="#583b30"/></mesh>
          <mesh position={[s*.26,.12,-.56]} rotation-z={s*.17}><cylinderGeometry args={[.085,.11,.9,8]}/><meshStandardMaterial color="#583b30"/></mesh>
          <mesh position={[s*.23,2,-1.1]} rotation-z={s*.2}><cylinderGeometry args={[.052,.075,.95,7]}/><meshStandardMaterial color="#bd9a72"/></mesh>
          <mesh position={[s*.43,2.25,-1.1]} rotation-z={s*.69}><cylinderGeometry args={[.03,.05,.65,6]}/><meshStandardMaterial color="#bd9a72"/></mesh>
          <mesh position={[s*.19,1.54,-.92]} scale={[.06,.12,.06]}><sphereGeometry args={[1,8,6]}/><meshStandardMaterial color="#241d1c"/></mesh>
        </group>)}
        <mesh position={[0,.66,.07]}><torusGeometry args={[.62,.045,6,24]}/><meshStandardMaterial color={gold} metalness={.6}/></mesh>
        <mesh position={[0,.51,2.67]} rotation-x={Math.PI/2}><cylinderGeometry args={[.035,.035,5,6]}/><meshStandardMaterial color={gold}/></mesh>
      </group>)}
    </group>
    <pointLight position={[0,2.1,1.5]} color="#ffd38d" intensity={8} distance={12}/>
    <group position={[0,2.58,2.02]}>
      <mesh><sphereGeometry args={[.16,12,10]}/><meshBasicMaterial color="#ffe8a1" toneMapped={false}/></mesh>
      <pointLight color="#ffe7a1" intensity={6} distance={9}/>
    </group>
  </group>;
}

function Mountain({ x, z, radius, height, seed }: {x:number;z:number;radius:number;height:number;seed:number}) {
  const geometry=useMemo(()=>{
    const geometry=new THREE.ConeGeometry(radius,height,11,5);
    const p=geometry.getAttribute("position") as THREE.BufferAttribute;
    const color=[];
    const rock=new THREE.Color("#7898a5"),snow=new THREE.Color("#e6f4f2");
    for(let i=0;i<p.count;i++){
      const y=p.getY(i),h=y/height+.5;
      const white=THREE.MathUtils.smoothstep(h+.12*(random01(i*1.2+seed)-.5),.43,.7);
      const c=rock.clone().lerp(snow,white);
      color.push(c.r,c.g,c.b);
    }
    geometry.setAttribute("color",new THREE.Float32BufferAttribute(color,3));
    geometry.computeVertexNormals();
    return geometry;
  },[radius,height,seed]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  return <mesh geometry={geometry} position={[x,height*.48-.6,z]} castShadow receiveShadow>
    <meshStandardMaterial vertexColors flatShading roughness={.95}/>
  </mesh>;
}

function Aurora({ z=-130 }: {z?:number}) {
  const material=useMemo(()=>new THREE.MeshBasicMaterial({color:"#70f5c9",transparent:true,opacity:.17,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending}),[]);
  useEffect(()=>()=>material.dispose(),[material]);
  const strips=useMemo(()=>[0,1,2].map(i=>{
    const geo=new THREE.PlaneGeometry(140,32,36,8);
    const p=geo.attributes.position as THREE.BufferAttribute;
    for(let j=0;j<p.count;j++){
      const x=p.getX(j),y=p.getY(j);
      p.setZ(j,Math.sin(x*.08+i*1.9)*6+Math.sin(x*.17+i)*2+y*.13);
    }
    geo.computeVertexNormals();return geo;
  }),[]);
  useEffect(()=>()=>strips.forEach(g=>g.dispose()),[strips]);
  return <group position={[0,53,z]} rotation-y={-.12}>
    {strips.map((geometry,i)=><mesh key={i} geometry={geometry} material={material} position={[0,i*7,-i*9]} rotation-z={i*.045}/>)}
  </group>;
}

function Snowfall({count=450}:{count?:number}) {
  const points=useRef<THREE.Points>(null);
  const values=useMemo(()=>{
    const p=new Float32Array(count*3);
    for(let i=0;i<count;i++){p[i*3]=(random01(i*7+2)-.5)*100;p[i*3+1]=random01(i*11+3)*45;p[i*3+2]=(random01(i*13+4)-.5)*120;}
    return p;
  },[count]);
  useFrame((_,dt)=>{
    const attr=points.current?.geometry.getAttribute("position") as THREE.BufferAttribute|undefined;
    if(!attr)return;
    for(let i=0;i<count;i++){
      let y=attr.getY(i)-dt*(1.6+(i%7)*.33),z=attr.getZ(i)+dt*(.4+(i%3)*.4);
      if(y<0)y=45;if(z>60)z=-60;
      attr.setXYZ(i,attr.getX(i),y,z);
    }
    attr.needsUpdate=true;
  });
  return <points ref={points} frustumCulled={false}>
    <bufferGeometry><bufferAttribute attach="attributes-position" args={[values,3]}/></bufferGeometry>
    <pointsMaterial color="#eaf9ff" size={.22} transparent opacity={.77} sizeAttenuation depthWrite={false}/>
  </points>;
}

const flightMountains=Array.from({length:40},(_,i)=>({
  x:(random01(i*4+12)-.5)*230,
  z:-345+i*12.5,
  radius:8+random01(i*3+34)*15,
  height:19+random01(i*5+29)*34,
  seed:i
}));

function FlightWorld({game,input,lowPower}:{game:SoloGame;input:InputController;lowPower:boolean}) {
  const {camera}=useThree();
  const sleigh=useRef<THREE.Group>(null),landscape=useRef<THREE.Group>(null);
  const lateral=useRef(0),elevation=useRef(0);
  const focus=useRef(new THREE.Vector3(0,20,-20));
  useFrame((_,dt)=>{
    game.advance(dt);
    const move=input.getMovement();
    lateral.current=THREE.MathUtils.clamp(lateral.current+move.x*dt*10,-20,20);
    elevation.current=THREE.MathUtils.clamp(elevation.current+move.z*dt*5,-5,8);
    const progress=game.round.progress;
    const landing=THREE.MathUtils.smoothstep(progress,.81,1);
    const height=18+elevation.current*(1-landing)-landing*12+Math.sin(game.now()*.004)*.28;
    const x=lateral.current*(1-landing);
    if(sleigh.current){
      sleigh.current.position.lerp(new THREE.Vector3(x,height,0),1-Math.exp(-dt*5));
      sleigh.current.rotation.z=THREE.MathUtils.damp(sleigh.current.rotation.z,-move.x*.14,5,dt);
      sleigh.current.rotation.x=THREE.MathUtils.damp(sleigh.current.rotation.x,-move.z*.075-landing*.18,5,dt);
    }
    if(landscape.current)landscape.current.position.z=progress*210;
    const desired=new THREE.Vector3(x+7.3,height+4.6,18+landing*5);
    camera.position.lerp(desired,1-Math.exp(-dt*2.1));
    focus.current.lerp(new THREE.Vector3(x,height+1.7,-22),1-Math.exp(-dt*3.8));
    camera.lookAt(focus.current);
  });
  return <>
    <color attach="background" args={["#0b2638"]}/>
    <fogExp2 attach="fog" args={["#789caa",.0046]}/>
    <hemisphereLight args={["#a9d0fd","#122d42",2.1]}/>
    <directionalLight position={[45,95,30]} intensity={2.6} color="#d9edff" castShadow shadow-mapSize={lowPower?[512,512]:[1024,1024]}/>
    <Stars radius={280} depth={65} count={lowPower?400:1100} factor={3} saturation={.15} fade speed={.25}/>
    <Aurora/>
    <group ref={landscape}>
      <mesh rotation-x={-Math.PI/2} position={[0,-6,-125]}><planeGeometry args={[1100,900]}/><meshStandardMaterial color="#b3d2dd" roughness={.98}/></mesh>
      {flightMountains.map(m=><Mountain key={m.seed} {...m}/>)}
      {Array.from({length:32},(_,i)=>{
        const x=(random01(i*9+4)-.5)*160,z=-275+i*12;
        return <group key={i} position={[x,-4,z]}>
          <mesh position-y={3.8}><coneGeometry args={[2.3,8,7]}/><meshStandardMaterial color="#284d51" roughness={.95}/></mesh>
          <mesh position-y={7.4}><coneGeometry args={[1.3,4,7]}/><meshStandardMaterial color="#e1edeb" roughness={.95}/></mesh>
        </group>;
      })}
      <group position={[0,-4,-305]}>
        {[-15,-8,0,8,16].map((x,i)=><mesh key={i} position={[x,3,0]}><boxGeometry args={[5,6,5]}/><meshStandardMaterial color={i%2?"#a97962":"#875b52"}/></mesh>)}
      </group>
    </group>
    <group ref={sleigh} position={[0,18,0]}><FlyingSleigh/></group>
    <Snowfall count={lowPower?320:660}/>
  </>;
}

function Pine({x,z,s=1}:{x:number;z:number;s?:number}) {
  return <group position={[x,0,z]} scale={s}>
    <mesh position-y={1.1} castShadow><cylinderGeometry args={[.19,.27,2.2,6]}/><meshStandardMaterial color="#59473a"/></mesh>
    {[0,1,2].map(i=><mesh key={i} position-y={2.2+i*.94} castShadow><coneGeometry args={[1.8-i*.38,3.1-i*.37,8]}/><meshStandardMaterial color={i===2?"#346665":"#234f51"} roughness={.91}/></mesh>)}
    <mesh position-y={4.64}><coneGeometry args={[.48,.68,8]}/><meshStandardMaterial color="#e2f4ee" roughness={.9}/></mesh>
  </group>;
}
const villageTrees=Array.from({length:82},(_,i)=>{
  const x=(random01(i*13+6)-.5)*98,z=(random01(i*13+7)-.5)*98;
  return {x,z,s:.65+random01(i*13+8)*.72};
}).filter(p=>Math.abs(p.x)>32||Math.abs(p.z)>37);

function Cabin({x,z,color="#955e55",turn=0}:{x:number;z:number;color?:string;turn?:number}) {
  return <group position={[x,0,z]} rotation-y={turn}>
    <mesh position-y={2.5} castShadow receiveShadow><boxGeometry args={[7,5,6]}/><meshStandardMaterial color={color} roughness={.86}/></mesh>
    <mesh position-y={5.6} rotation-z={Math.PI/4} castShadow><boxGeometry args={[5.2,5.2,7.5]}/><meshStandardMaterial color="#3b5058" roughness={.9}/></mesh>
    <mesh position-y={7.55} rotation-z={Math.PI/4}><boxGeometry args={[2.1,.2,8]}/><meshStandardMaterial color="#edf7f6" roughness={.85}/></mesh>
    <mesh position={[0,1.55,3.08]}><boxGeometry args={[1.55,3.1,.12]}/><meshStandardMaterial color="#533827"/></mesh>
    {[-2.25,2.25].map(a=><group key={a}>
      <mesh position={[a,3.1,3.09]}><boxGeometry args={[1.15,1.35,.16]}/><meshBasicMaterial color="#ffd78b"/></mesh>
      <mesh position={[a,3.1,3.2]}><boxGeometry args={[.12,1.5,.08]}/><meshStandardMaterial color="#d8e0ce"/></mesh>
    </group>)}
    <pointLight position={[0,3.3,4]} intensity={8} distance={12} color="#ffc978"/>
  </group>;
}
const cabins=[
  {x:-22,z:11,color:"#a05c55",turn:.22},
  {x:21,z:10,color:"#8d6453",turn:-.32},
  {x:-19,z:-18,color:"#a57964",turn:.18},
  {x:22,z:-20,color:"#98635b",turn:-.22},
  {x:-1,z:-35,color:"#77614c",turn:0}
];

function Gift({index}:{index:number}) {
  const item=VILLAGE_GIFTS[index];
  return <Float speed={2.6} rotationIntensity={.16} floatIntensity={.52}>
    <group position={[item.x,1.2,item.z]}>
      <mesh castShadow><boxGeometry args={[1.16,1.05,1.16]}/><meshPhysicalMaterial color={index%2?"#9a2d42":"#327c72"} roughness={.35} metalness={.12} clearcoat={.55}/></mesh>
      <mesh position-y={.05}><boxGeometry args={[.18,1.1,1.19]}/><meshStandardMaterial color={gold} metalness={.6}/></mesh>
      <mesh position-y={.05}><boxGeometry args={[1.19,1.1,.17]}/><meshStandardMaterial color={gold} metalness={.6}/></mesh>
      <mesh position-y={.64}><boxGeometry args={[1.32,.16,1.3]}/><meshStandardMaterial color={gold} metalness={.55}/></mesh>
      <mesh position-y={1.32}><octahedronGeometry args={[.27,0]}/><meshBasicMaterial color="#ffdb83" toneMapped={false}/></mesh>
      <pointLight color="#ffe49c" intensity={4} distance={7}/>
    </group>
  </Float>;
}

function VillageCamera({position,input}:{position:MutableRefObject<THREE.Vector3>;input:InputController}) {
  const {camera}=useThree();
  const focus=useRef(new THREE.Vector3(0,2,28));
  useFrame((_,dt)=>{
    const p=position.current,yaw=input.yaw;
    const desired=new THREE.Vector3(p.x-Math.sin(yaw)*7+Math.cos(yaw)*1.1,Math.max(2,p.y)+3.5,p.z+Math.cos(yaw)*7+Math.sin(yaw));
    camera.position.lerp(desired,1-Math.exp(-dt*6));
    focus.current.lerp(new THREE.Vector3(p.x+Math.sin(yaw)*2,p.y+1.2,p.z-Math.cos(yaw)*3),1-Math.exp(-dt*8));
    camera.lookAt(focus.current);
  });
  return null;
}

function VillageWorld({game,input,lowPower}:{game:SoloGame;input:InputController;lowPower:boolean}) {
  useSyncExternalStore(game.subscribe,()=>game.round.giftCount,()=>0);
  const position=useRef(new THREE.Vector3(0,1.15,32));
  useFrame((_,dt)=>game.advance(dt));
  return <>
    <color attach="background" args={["#132e43"]}/>
    <fogExp2 attach="fog" args={["#8caab5",.009]}/>
    <hemisphereLight args={["#b3dbec","#163b41",1.65]}/>
    <ambientLight intensity={.35}/>
    <directionalLight castShadow position={[22,50,-18]} intensity={2.45} color="#d9f5ff" shadow-mapSize={lowPower?[512,512]:[1024,1024]} shadow-camera-left={-48} shadow-camera-right={48} shadow-camera-top={48} shadow-camera-bottom={-48}/>
    <Stars radius={180} depth={65} count={lowPower?380:1000} factor={2} fade speed={.18}/>
    <Aurora z={-96}/>
    <mesh position={[-50,52,-95]}><sphereGeometry args={[7,24,18]}/><meshBasicMaterial color="#f3f7df"/></mesh>
    <Physics gravity={[0,-24,0]} timeStep={1/60} interpolate>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[50,.3,50]} position={[0,-.35,0]} friction={1}/>
        <CuboidCollider args={[.5,3,50]} position={[50,2,0]}/>
        <CuboidCollider args={[.5,3,50]} position={[-50,2,0]}/>
        <CuboidCollider args={[50,3,.5]} position={[0,2,50]}/>
        <CuboidCollider args={[50,3,.5]} position={[0,2,-50]}/>
        {cabins.map((c,i)=><CuboidCollider key={i} args={[3.6,3,3.1]} position={[c.x,3,c.z]}/>)}
        {villageTrees.map((t,i)=><CuboidCollider key={i} args={[.3*t.s,1.2*t.s,.3*t.s]} position={[t.x,1.2*t.s,t.z]}/>)}
      </RigidBody>
      <mesh rotation-x={-Math.PI/2} receiveShadow position-y={-.045}>
        <planeGeometry args={[101,101]}/><meshStandardMaterial color="#dae9e9" roughness={.94}/>
      </mesh>
      <LocalPlayer game={game} input={input} position={position}/>
    </Physics>
    <mesh rotation-x={-Math.PI/2} position-y={-.22}><planeGeometry args={[500,500]}/><meshStandardMaterial color="#9bbbc9"/></mesh>
    <mesh rotation-x={-Math.PI/2} position={[0,.03,4]}><planeGeometry args={[9,79]}/><meshStandardMaterial color="#c7ddde" roughness={1}/></mesh>
    <mesh rotation-x={-Math.PI/2} position={[-3,.05,-1]}><circleGeometry args={[7,32]}/><meshPhysicalMaterial color="#8fd3e0" roughness={.1} metalness={.18} clearcoat={.8}/></mesh>
    {villageTrees.map((t,i)=><Pine key={i} {...t}/>)}
    {cabins.map((c,i)=><Cabin key={i} {...c}/>)}
    {Array.from({length:9},(_,i)=><group key={i} position={[i%2?-5.6:5.6,0,31-i*8]}>
      <mesh position-y={1.55}><cylinderGeometry args={[.08,.12,3.1,8]}/><meshStandardMaterial color="#334f4f"/></mesh>
      <mesh position-y={3.25}><boxGeometry args={[.5,.67,.5]}/><meshBasicMaterial color="#ffe0a5"/></mesh>
      <mesh position-y={3.64}><coneGeometry args={[.43,.36,6]}/><meshStandardMaterial color="#344c4d"/></mesh>
    </group>)}
    {VILLAGE_GIFTS.map((_,i)=>!game.villageCollected.has(i)&&<Gift key={i} index={i}/>)}
    <group position={[0,0,-40]}>
      <mesh position-y={.63} castShadow><boxGeometry args={[2.5,.4,3.1]}/><meshStandardMaterial color={red}/></mesh>
      <mesh position-y={.2}><boxGeometry args={[2.4,.2,4]}/><meshStandardMaterial color={gold} metalness={.65}/></mesh>
      <group position={[2.1,0,1]}><SantaRig height={2.4}/></group>
      <Text position={[0,4.5,0]} fontSize={1.0} color="#ffe6b7" anchorX="center" anchorY="middle" outlineWidth={.055} outlineColor="#143444">AURORA VILLAGE</Text>
    </group>
    {Array.from({length:13},(_,i)=><Mountain key={i} x={(i-6)*31} z={i%2?-90:-103} radius={18+random01(i*5+2)*12} height={30+random01(i*7+4)*27} seed={i+100}/>)}
    <Snowfall count={lowPower?320:620}/>
    <VillageCamera position={position} input={input}/>
  </>;
}

export default function SkyChapter({game,input,lowPower}:{game:SoloGame;input:InputController;lowPower:boolean}) {
  const phase=game.round.status;
  return phase==="flight" ? <FlightWorld game={game} input={input} lowPower={lowPower}/> :
    <VillageWorld game={game} input={input} lowPower={lowPower}/>;
}
