"use client";
import {useEffect,useMemo} from "react";
import type {RefObject} from "react";
import * as T from "three";
const red="#b93632",cream="#f1e8d4",green="#1a5146",metal="#394955";
function Part({p,s,c,r=[0,0,0]}:{p:[number,number,number];s:[number,number,number];c:string;r?:[number,number,number]}){
  return <mesh position={p} scale={s} rotation={r} castShadow><sphereGeometry args={[1,20,12]}/><meshStandardMaterial color={c} metalness={.21} roughness={.42}/></mesh>;
}
/** Loft a curved airfoil from root to tip; normals and thickness catch the runway lights. */
function Wing({side}:{side:number}){
  const geometry=useMemo(()=>{
    const verts:number[]=[],idx:number[]=[];const rings=14;
    for(const [x,chord,z,y] of [[.5,2.42,.05,0],[3.8,2.22,.1,.08],[6.45,1.5,.29,.2],[6.72,.93,.36,.22]]){
      for(let j=0;j<rings;j++){const a=j/rings*2*Math.PI;verts.push(side*x,y+Math.sin(a)*.1*chord,z-Math.cos(a)*chord*.5);}
    }
    for(let k=0;k<3;k++)for(let j=0;j<rings;j++){const a=k*rings+j,b=k*rings+(j+1)%rings;idx.push(a,b,b+rings,a,b+rings,a+rings);}
    for(let j=1;j<rings-1;j++)idx.push(3*rings,3*rings+j,3*rings+j+1);
    const g=new T.BufferGeometry();g.setAttribute("position",new T.Float32BufferAttribute(verts,3));g.setIndex(idx);g.computeVertexNormals();return g;
  },[side]);useEffect(()=>()=>geometry.dispose(),[geometry]);
  return <group position-y={2.42}><mesh geometry={geometry} castShadow><meshStandardMaterial color={cream} roughness={.42} metalness={.16} side={T.DoubleSide}/></mesh>
    <Part p={[side*6.3,.19,.27]} s={[.47,.16,.79]} c={red}/>
    <mesh position={[side*6.68,.24,.12]}><sphereGeometry args={[.115,10,6]}/><meshBasicMaterial color={side<0?"#ff353a":"#46ffae"} toneMapped={false}/></mesh>
    <mesh position={[side*2.24,-.66,.14]} rotation-z={-side*1.13}><cylinderGeometry args={[.055,.07,3.75,8]}/><meshStandardMaterial color={metal}/></mesh>
  </group>;
}
export default function MailPlane({prop,piloted}:{prop:RefObject<T.Group|null>;piloted:boolean}){
  return <group>
    <Part p={[0,1.48,.1]} s={[.96,.84,3.48]} c={red}/>
    <Part p={[0,1.38,2.52]} s={[.55,.49,2.15]} c={red}/>
    <Part p={[0,1.2,-.12]} s={[.91,.53,3.12]} c={cream}/>
    <Part p={[0,2,-.53]} s={[.78,.7,1.2]} c="#2e4956"/>
    <mesh position={[0,2.49,-.62]}><boxGeometry args={[1.32,.12,1.53]}/><meshStandardMaterial color={green}/></mesh>
    {[-1,1].map(side=><group key={side}>
      <Wing side={side}/>
      <mesh position={[side*.8,1.55,-.56]}><boxGeometry args={[.06,.08,1.79]}/><meshStandardMaterial color={cream}/></mesh>
      <mesh position={[side*.91,.78,-1.21]} rotation-z={side*.35}><cylinderGeometry args={[.075,.085,1.18,8]}/><meshStandardMaterial color={metal}/></mesh>
      <mesh position={[side*1.13,.39,-1.21]} rotation-z={Math.PI/2}><cylinderGeometry args={[.39,.39,.25,20]}/><meshStandardMaterial color="#18252c"/></mesh>
      <mesh position={[side*1.27,.39,-1.21]} rotation-z={Math.PI/2}><cylinderGeometry args={[.15,.15,.035,14]}/><meshStandardMaterial color={cream}/></mesh>
    </group>)}
    <Part p={[0,1.72,3.78]} s={[2.12,.13,.74]} c={cream}/>
    <Part p={[0,2.22,3.81]} s={[.13,1.15,.7]} c={green}/>
    <Part p={[0,2.95,3.85]} s={[.13,.34,.49]} c={red}/>
    <mesh position={[0,.27,3.28]} rotation-z={Math.PI/2}><cylinderGeometry args={[.24,.24,.2,12]}/><meshStandardMaterial color={metal}/></mesh>
    <Part p={[0,1.52,-2.89]} s={[.81,.77,.75]} c={green}/>
    <group ref={prop} position={[0,1.54,-3.62]}>
      <Part p={[0,.73,0]} s={[.13,.8,.065]} c={metal}/><Part p={[0,-.73,0]} s={[.13,.8,.065]} c={metal}/>
      {[-1,1].map(v=><Part key={v} p={[0,v*1.38,0]} s={[.12,.16,.068]} c="#e4ba75"/>)}
      <Part p={[0,0,-.08]} s={[.22,.22,.31]} c={cream}/>
    </group>
    {piloted&&<group position={[0,2.37,-.44]}><Part p={[0,.02,0]} s={[.27,.28,.24]} c="#e4b189"/><Part p={[0,.2,0]} s={[.29,.21,.26]} c={red}/></group>}
  </group>;
}
