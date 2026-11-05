export type Vec3={x:number;y:number;z:number};
export type PlayerState=Vec3 & {yaw:number;score:number;health:number;deadUntil:number;kills:number;stunnedUntil:number};
export type EnemyState={id:number;x:number;z:number;yaw:number;stunnedUntil:number;health:number;downUntil:number;attackUntil:number;windupUntil:number;lungeUntil:number};
export type RoundState={round:number;status:"playing"|"escort"|"launching"|"flight"|"village"|"cityLaunch"|"city"|"rescued"|"routeEnded";resetAt:number;progress:number;escort:number;blocked:boolean;giftCount:number;worldPresents:number;credits:number;magic:number;frostShieldUntil:number;cityScore:number;cityCombo:number;cityBestCombo:number;cityPerfect:number;cityDistance:number;cityX:number;cityAltitude:number;cityDelivered:number;cityAttempts:number;cityPass:number};
export type GameEvent=
 | {type:"snowball";x:number;y:number;z:number;yaw:number;hitEnemy:number|null;heavy:boolean;range:number}
 | {type:"shatter";x:number;z:number}
 | {type:"supply"}
 | {type:"gift";count:number}
 | {type:"cityStarted"}
 | {type:"cityPass";pass:number}
 | {type:"presentDrop";key:number;x:number;y:number;z:number;impactX:number;impactY:number;impactZ:number;flightMs:number;hit:boolean}
 | {type:"presentLanded";hit:boolean;count:number;targetId:number|null;score?:number;combo?:number;perfect?:boolean}
 | {type:"vehicle";boarded:boolean;name:string}
 | {type:"foundPresent";count:number;total:number;credits:number;kind:string}
 | {type:"shieldCast";magic:number}
 | {type:"shieldBlock"}
 | {type:"frostWave";hits:number}
 | {type:"naughty";stars:number}
 | {type:"playerHit";health:number;damage:number}
 | {type:"enemyHit";id:number;health:number};
