export class InputController {
  keys = new Set<string>();
  joystickX = 0;
  joystickY = 0;
  private chargingAt:number|null=null;
  get firing(){return this.chargingAt!==null;}
  get charge(){return this.chargingAt===null?0:Math.min(1,(performance.now()-this.chargingAt)/800);}
  beginThrow(){if(this.chargingAt===null)this.chargingAt=performance.now();}
  endThrow(){if(this.chargingAt===null)return;this.shot=this.charge>=1;this.chargingAt=null;}
  cancelThrow(){this.chargingAt=null;this.shot=null;}
  yaw = 0;
  pitch = 0.18;
  interacting = false;
  private jumpQueued = false;
  private shot:boolean|null=null;

  getMovement() {
    const x = (this.keys.has("KeyD") || this.keys.has("ArrowRight") ? 1 : 0)
      - (this.keys.has("KeyA") || this.keys.has("ArrowLeft") ? 1 : 0) + this.joystickX;
    const z = (this.keys.has("KeyW") || this.keys.has("ArrowUp") ? 1 : 0)
      - (this.keys.has("KeyS") || this.keys.has("ArrowDown") ? 1 : 0) - this.joystickY;
    const length = Math.hypot(x, z);
    return length > 1 ? { x: x / length, z: z / length } : { x, z };
  }
  pan(dx: number, dy: number) {
    this.yaw += dx * 0.0027;
    this.pitch = Math.max(-0.24, Math.min(0.57, this.pitch + dy * 0.0024));
  }
  jump() { this.jumpQueued = true; }

  consumeJump() { const v = this.jumpQueued; this.jumpQueued = false; return v; }
  consumeThrow() { const v=this.shot;this.shot=null; return v; }
  release() {
    this.cancelThrow();this.jumpQueued=false;this.interacting=false;this.keys.clear();this.joystickX=0;this.joystickY=0;
  }
  reset() {
    this.release();
    this.keys.clear(); this.joystickX = 0; this.joystickY = 0;
    this.interacting = false; this.yaw = 0; this.pitch = .18;
  }
}
