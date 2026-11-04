"use client";
import { useEffect,useMemo,useRef } from "react";
import * as THREE from "three";
import { TREES, random01 } from "@/lib/world";

type V=[number,number,number];
/** A 128px alpha foliage card with hundreds of individual thin conifer needles and snow. */
function branchTexture(){
  const can=document.createElement("canvas");can.width=256;can.height=256;
  const c=can.getContext("2d")!;
  // A branch grows from the bottom into a fan, with small sprays and individual needles.
  const green=["#244838","#285442","#17372d","#38614b","#1e4639","#477056"];
  c.strokeStyle="#594b3b";c.lineWidth=7;c.beginPath();c.moveTo(128,255);c.quadraticCurveTo(133,148,123,18);c.stroke();
  for(let i=0;i<350;i++){
    const f=random01(i*73+7),v=random01(i*43+21),y=242-f*215;
    const width=17+76*(1-f)**.7;
    const x=128+(v-.5)*width*2;
    const dir=(x>128?1:-1);
    c.lineCap="round";
    c.strokeStyle=green[Math.floor(random01(i*9+31)*green.length)];c.lineWidth=.8+random01(i*7+19)*1.4;
    c.beginPath();c.moveTo(128,y+7);c.lineTo(x,y-13*random01(i*5+1));c.stroke();
    if(i%3===0){for(let k=0;k<4;k++){
      const t=(k+1)/5,xx=128+(x-128)*t,yy=y+7+( -13*random01(i*5+1)-7)*t;
      c.beginPath();c.moveTo(xx,yy);c.lineTo(xx+dir*(8+random01(i+k*11)*10),yy+(k%2?5:-6));c.stroke();
    }}
  }
  for(let i=0;i<80;i++){
    const f=random01(i*21+14),x=128+(random01(i*15+70)-.5)*(40+135*(1-f)),y=238-f*206;
    c.fillStyle=i%4?"rgba(235,245,244,.94)":"rgba(181,205,212,.9)";
    c.beginPath();c.ellipse(x,y,2.6+random01(i*13)*6,1.9+random01(i*33)*3,random01(i)*.4,0,Math.PI*2);c.fill();
  }
  const t=new THREE.CanvasTexture(can);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;
  return t;
}
function branchesGeometry(){
  const positions:number[]=[],uvs:number[]=[],colors:number[]=[];
  const tint=new THREE.Color();
  for(let row=0;row<13;row++){
    const y=.58+row*.36,r=2.65*Math.pow(1-row/13,.94);
    for(let j=0;j<11;j++){
      const theta=(j+row*.38)*Math.PI*2/11;
      const dirx=Math.sin(theta),dirz=Math.cos(theta),tx=Math.cos(theta),tz=-Math.sin(theta);
      const width=.29+random01(row*41+j)*.2;
      const length=r*(.82+random01(row*77+j*14)*.28);
      const start:V=[dirx*.12,y+.2,dirz*.12];
      const left:V=[dirx*length*.68+tx*width,y-.31,dirz*length*.68+tz*width];
      const right:V=[dirx*length*.68-tx*width,y-.31,dirz*length*.68-tz*width];
      const tip:V=[dirx*length,y-.46,dirz*length];
      // Two angled cards form each natural branch cluster rather than cone silhouettes.
      const quads:[[V,V,V],[number,number][]][]=[
        [[start,left,tip],[[.5,1],[0,.3],[.5,0]]],
        [[start,tip,right],[[.5,1],[.5,0],[1,.3]]]
      ];
      tint.setHSL(.39+random01(row*19+j)*.04,.22+random01(j)*.12,.73+random01(j*7)*.09);
      for(const [verts,uv] of quads){for(let k=0;k<3;k++){positions.push(...verts[k]);uvs.push(...uv[k]);colors.push(tint.r,tint.g,tint.b);}}
      // Fan of fern-like needle sprigs along the far end.
      const mid:V=[dirx*length*.5,y-.12,dirz*length*.5];
      const outer:V=[dirx*length*.83,y-.20,dirz*length*.83];
      for(const sign of [-1,1]){
        const wing:V=[mid[0]+tx*width*sign*1.7,mid[1]-.13,mid[2]+tz*width*sign*1.7];
        for(const v of [start,wing,outer]){positions.push(...v);colors.push(tint.r,tint.g,tint.b);}
        uvs.push(.5,1,sign<0?0:1,.4,.5,0);
      }
    }
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute("position",new THREE.Float32BufferAttribute(positions,3));
  g.setAttribute("uv",new THREE.Float32BufferAttribute(uvs,2));
  g.setAttribute("color",new THREE.Float32BufferAttribute(colors,3));
  g.computeVertexNormals();return g;
}
function RealisticSpruces(){
  const foliage=useRef<THREE.InstancedMesh>(null),wood=useRef<THREE.InstancedMesh>(null);
  const geometry=useMemo(()=>branchesGeometry(),[]);
  const texture=useMemo(()=>branchTexture(),[]);
  useEffect(()=>{
    const o=new THREE.Object3D();
    TREES.forEach((t,i)=>{
      o.position.set(t.x,0,t.z);o.rotation.set(0,random01(i*12+4)*Math.PI*2,0);
      o.scale.set(t.size*.9,t.size*.98,t.size*.9);o.updateMatrix();foliage.current?.setMatrixAt(i,o.matrix);
      o.position.y=t.size*.95;o.scale.set(t.size*.22,t.size*2.7,t.size*.22);o.updateMatrix();wood.current?.setMatrixAt(i,o.matrix);
    });
    for(const mesh of [foliage.current,wood.current])if(mesh){mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();}
  },[]);
  useEffect(()=>()=>{geometry.dispose();texture.dispose();},[geometry,texture]);
  return <>
    <instancedMesh ref={wood} args={[undefined,undefined,TREES.length]} castShadow><cylinderGeometry args={[.4,.66,1,9]}/><meshStandardMaterial color="#5b4633" roughness={1}/></instancedMesh>
    <instancedMesh ref={foliage} args={[geometry,undefined,TREES.length]} castShadow receiveShadow>
      <meshStandardMaterial map={texture} vertexColors alphaTest={.31} side={THREE.DoubleSide} roughness={.94} metalness={0}/>
    </instancedMesh>
  </>;
}
function SnowBanks({lowPower}:{lowPower:boolean}){
  const ref=useRef<THREE.InstancedMesh>(null);
  const items=useMemo(()=>Array.from({length:lowPower?40:82},(_,i)=>({x:(random01(i*53+4)-.5)*91,z:(random01(i*53+5)-.5)*91,s:.36+random01(i*53+6)*.95})).filter(p=>Math.hypot(p.x,p.z)>10),[lowPower]);
  useEffect(()=>{const o=new THREE.Object3D();items.forEach((p,i)=>{o.position.set(p.x,-.1,p.z);o.rotation.set(0,random01(i*21)*Math.PI*2,0);o.scale.set(p.s*1.7,p.s*.2,p.s*1.3);o.updateMatrix();ref.current?.setMatrixAt(i,o.matrix)});if(ref.current){ref.current.instanceMatrix.needsUpdate=true;ref.current.computeBoundingSphere()}},[items]);
  return <instancedMesh ref={ref} args={[undefined,undefined,items.length]} receiveShadow><sphereGeometry args={[1,14,9]}/><meshStandardMaterial color="#edf1ed" roughness={.97}/></instancedMesh>;
}
function RocksAndLogs(){
  const rocks=useMemo(()=>Array.from({length:46},(_,i)=>({x:(random01(i*19+6)-.5)*84,z:(random01(i*23+7)-.5)*84,s:.2+random01(i*29+1)*.45})).filter(p=>Math.hypot(p.x,p.z)>9),[]);
  return <group>
    {rocks.map((p,i)=><mesh key={i} castShadow receiveShadow position={[p.x,.04,p.z]} rotation={[random01(i*5)*.4,random01(i*15)*6.2,.14]} scale={[p.s*1.9,p.s*.57,p.s*1.1]}><icosahedronGeometry args={[1,1]}/><meshStandardMaterial color={i%4===0?"#7c9294":"#9ba6a5"} roughness={1}/></mesh>)}
    {[[28,16],[-31,-22],[21,-29],[-30,27]].map(([x,z],i)=><group key={i} position={[x,0,z]} rotation={[0,random01(i*8)*Math.PI,0]}>
      <mesh castShadow position={[0,.24,0]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[.2,.32,4.1,10]}/><meshStandardMaterial color="#75634d" roughness={1}/></mesh>
      <mesh position={[0,.09,0]} scale={[2.9,.2,.8]}><sphereGeometry args={[1,12,8]}/><meshStandardMaterial color="#e6edeb" roughness={1}/></mesh>
    </group>)}
  </group>;
}
function Cabin({position,rotation}:{position:V;rotation:number}){
  return <group position={position} rotation={[0,rotation,0]}>
    <mesh castShadow receiveShadow position={[0,1.86,0]}><boxGeometry args={[5,3.7,4.5]}/><meshStandardMaterial color="#614837" roughness={.95}/></mesh>
    {[-1,1].map(side=><mesh key={side} castShadow position={[side*1.26,4.16,0]} rotation={[0,0,side*.53]}><boxGeometry args={[3.6,.35,5.4]}/><meshStandardMaterial color="#e7f1ed" roughness={.96}/></mesh>)}
    <mesh castShadow position={[0,1.6,2.28]}><boxGeometry args={[1.4,2.5,.12]}/><meshStandardMaterial color="#392b27" roughness={.9}/></mesh>
    {[-1.6,1.6].map(x=><group key={x} position={[x,2.5,2.31]}><mesh><boxGeometry args={[.9,1.1,.15]}/><meshStandardMaterial color="#564338"/></mesh><mesh position={[0,0,.10]}><planeGeometry args={[.69,.84]}/><meshBasicMaterial color="#ffe1a2" toneMapped={false}/></mesh></group>)}
    <pointLight position={[0,2.5,3.5]} intensity={7} distance={13} color="#ffcb84"/>
  </group>;
}
function Lanterns(){return <group>{[[35,14],[-35,-12],[7,-35],[-10,36]].map(([x,z],i)=><group key={i} position={[x,0,z]}>
    <mesh castShadow position={[0,2.2,0]}><cylinderGeometry args={[.055,.09,4.4,8]}/><meshStandardMaterial color="#3a4343" metalness={.52}/></mesh>
    <mesh castShadow position={[.39,4.39,0]}><boxGeometry args={[.85,.14,.13]}/><meshStandardMaterial color="#3a4343" metalness={.52}/></mesh>
    <mesh position={[.74,4.1,0]}><boxGeometry args={[.43,.62,.37]}/><meshStandardMaterial color="#ffd09a" emissive="#ffad5d" emissiveIntensity={1.5}/></mesh>
    <pointLight position={[.74,4.1,0]} intensity={7} distance={12} color="#ffc58b"/>
  </group>)}</group>}
export default function Scenery({lowPower}:{lowPower:boolean}){
  return <><RealisticSpruces/><SnowBanks lowPower={lowPower}/><RocksAndLogs/><Cabin position={[-51,0,-32]} rotation={.35}/><Cabin position={[51,0,38]} rotation={-1.4}/><Lanterns/></>;
}
