"use client";
import {Suspense} from "react";
import {Canvas} from "@react-three/fiber";
import WinterLight,{Powder} from "./WinterLight";
import SantaRig from "./SantaRig";
export default function LobbyVista(){
  return <div className="vista" aria-hidden="true"><Canvas frameloop="always" dpr={[1,1.25]} camera={{position:[0,1.65,5.6],fov:37}} onCreated={({camera})=>camera.lookAt(0,1.48,0)}>
    <color attach="background" args={["#8da5ae"]}/><fog attach="fog" args={["#adbbc1",14,75]}/>
    <WinterLight lowPower/><group position={[1.45,0,0]} rotation={[0,Math.PI-.4,0]}><Suspense fallback={null}><SantaRig height={3.1}/></Suspense></group>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.015,0]}><circleGeometry args={[43,80]}/><meshStandardMaterial color="#d8e3e7" roughness={.88}/></mesh>
    <Powder count={600}/>
  </Canvas></div>
}
