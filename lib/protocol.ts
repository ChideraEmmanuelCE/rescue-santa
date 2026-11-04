export type Vec3={x:number;y:number;z:number};
export type PlayerState=Vec3 & {yaw:number;score:number;health:number;deadUntil:number;kills:number;stunnedUntil:number};
export type EnemyState={id:number;x:number;z:number;yaw:number;stunnedUntil:number;health:number;downUntil:number;attackUntil:number;windupUntil:number;lungeUntil:number};
export type RoundState={round:number;status:"playing"|"escort"|"launching"|"flight"|"village"|"rescued";resetAt:number;progress:number;escort:number;blocked:boolean;giftCount:number};
export type GameEvent=
 | {type:"snowball";x:number;y:number;z:number;yaw:number;hitEnemy:number|null;heavy:boolean;range:number}
 | {type:"shatter";x:number;z:number}
 | {type:"supply"}
 | {type:"gift";count:number}
 | {type:"playerHit";health:number;damage:number}
 | {type:"enemyHit";id:number;health:number};
